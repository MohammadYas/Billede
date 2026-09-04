import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getOrder, updateOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { ownsOrder } from '@/lib/preview-service';
import { sendMail } from '@/lib/email/send';
import { esc, siteUrl } from '@/lib/email/templates';
import { getFounder, fornavn } from '@/lib/founder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * "Gem dit preview": stores the e-mail on the order and mails a link that opens the preview
 * from any device (30-day token). Also the only lead we have for a preview that did not convert.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return NextResponse.json({ error: 'email' }, { status: 400 });
  const [order, sid] = await Promise.all([getOrder(id), readSessionId()]);
  if (!order || !ownsOrder(order, sid, req.nextUrl.searchParams.get('t'))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const meta = (order.preview_meta ?? {}) as Record<string, unknown>;
  const token = (meta.share_token as string | undefined) ?? randomBytes(18).toString('base64url');
  await updateOrder(order.id, { customer_email: order.customer_email ?? email, preview_meta: { ...meta, share_token: token, share_email: email, share_sent_at: new Date().toISOString() } });
  const link = siteUrl(`/p/${order.id}?t=${token}`);
  const navn = fornavn();
  const f = getFounder();
  const html = `<!doctype html><html lang="da"><body style="margin:0;background:#F6F1E8;color:#1C1A17;font-family:'Public Sans','Helvetica Neue',Arial,sans-serif;font-size:17px;line-height:1.55;"><div style="max-width:560px;margin:0 auto;padding:40px 24px 56px;">
<div style="font-family:Georgia,serif;font-size:22px;margin-bottom:32px;">Genfundet</div>
<h1 style="font-family:Georgia,serif;font-weight:500;font-size:28px;line-height:1.1;margin:0 0 20px;">Dit preview.</h1>
<p style="margin:0 0 16px;">Her er linket til dit restaurerede billede. Det virker, indtil billedet slettes – 30 dage efter upload – og vi printer ikke noget, før du selv bestiller og siger ja.</p>
<p style="margin:0 0 24px;"><a href="${link}" style="display:inline-block;padding:14px 22px;border-radius:2px;background:#1C1A17;color:#F6F1E8;text-decoration:none;font-weight:600;">Se dit billede</a></p>
<p style="margin:0;font-size:14px;color:#5B554C;">${esc(f.name || 'Genfundet')}${f.phone ? ` · Tlf. ${esc(f.phone)}` : ''}</p></div></body></html>`;
  try {
    await sendMail({ to: email, subject: 'Dit preview hos Genfundet', html, text: `Dit preview: ${link}\n\nLinket virker, indtil billedet slettes – 30 dage efter upload. Vi printer ikke noget, før du bestiller og siger ja.\n\n${navn}` });
  } catch (e) { console.error('save-link mail failed', e); }
  return NextResponse.json({ ok: true });
}
