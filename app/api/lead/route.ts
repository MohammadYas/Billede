import { NextRequest, NextResponse } from 'next/server';
import { getOrder, setStatus, createOrder } from '@/lib/db/orders';
import { ensureSessionId, readUtm, sessionCookie } from '@/lib/session';
import { ownsOrder } from '@/lib/preview-service';
import { customerFormat } from '@/lib/pricing';
import { isEmailConfigured, sendMail } from '@/lib/email/send';
import { esc, siteUrl } from '@/lib/email/templates';
import { getFounder } from '@/lib/founder';
import { notifyOwner } from '@/lib/email/owner';
import { supabaseAdmin } from '@/lib/db/supabase';
import { clientKey, tooManyOrders, LEADS_PER_HOUR } from '@/lib/api/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Manual-review lead: stores the email on the MANUAL_REVIEW order (or creates one when processing died before an order existed).
 * kind: 'nophoto' — the visitor does not have the photograph at hand; we mail a link to the site and nothing else.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { orderId?: string | null; email?: string; kind?: 'nophoto' };
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return NextResponse.json({ error: 'email' }, { status: 400 });
  const [{ sid, fresh }, utm] = await Promise.all([ensureSessionId(), readUtm()]);
  const client = clientKey(req.headers);
  if (await overused(email, sid) || await tooManyOrders(client, { max: LEADS_PER_HOUR, windowMs: 3600e3 })) return NextResponse.json({ error: 'send_limit' }, { status: 429 });
  if (body.kind === 'nophoto' && !isEmailConfigured()) return NextResponse.json({ error: 'mail_unavailable' }, { status: 503 });
  let order = body.orderId && /^[0-9a-f-]{36}$/.test(body.orderId) ? await getOrder(body.orderId) : null;
  if (order && !ownsOrder(order, sid)) order = null;
  const nophoto = body.kind === 'nophoto';
  if (!order) order = await createOrder({ status: 'MANUAL_REVIEW', format: customerFormat(), utm, preview_meta: { session_id: sid, ...(client ? { client } : {}), note: nophoto ? 'link requested, no photo yet' : 'lead without upload' } });
  await setStatus(order.id, 'MANUAL_REVIEW', { customer_email: email });
  notifyOwner(nophoto ? `Lead uden billede · ${email}` : `Manuel vurdering – kunden venter · ordre ${order.id.slice(0, 8)}`, [nophoto ? 'Fik et link til siden. Ingen handling nu.' : `${email} har sendt sit billede til manuel vurdering. Svar inden 24 timer.`], order.id).catch(() => {});
  if (nophoto) {
    const f = getFounder();
    const link = siteUrl('/');
    const html = `<!doctype html><html lang="da"><body style="margin:0;background:#FBFAF7;color:#171614;font-family:'Public Sans','Helvetica Neue',Arial,sans-serif;font-size:17px;line-height:1.55;"><div style="max-width:560px;margin:0 auto;padding:40px 24px 56px;">
<div style="font-family:Georgia,serif;font-size:22px;margin-bottom:32px;">Billedarv</div>
<h1 style="font-family:Georgia,serif;font-weight:500;font-size:28px;line-height:1.1;margin:0 0 20px;">Til når du står med billedet.</h1>
<p style="margin:0 0 16px;">Læg det fladt i dagslys, uden blitz, og tag et foto af det med telefonen. Resten tager omkring halvandet minut, og det koster ikke noget at se resultatet.</p>
<p style="margin:0 0 24px;"><a href="${link}" style="display:inline-block;padding:14px 22px;border-radius:2px;background:#171614;color:#FBFAF7;text-decoration:none;font-weight:600;">Se dit billede nu</a></p>
<p style="margin:0;font-size:14px;color:#5D5953;">${esc(f.company || 'Billedarv')}${f.email ? ` · ${esc(f.email)}` : ''}</p></div></body></html>`;
    try {
      const receipt = await sendMail({ to: email, subject: 'Dit link til Billedarv', html, text: `Til når du står med billedet: ${link}\n\nLæg det fladt i dagslys, uden blitz, og tag et foto af det med telefonen. Resten tager omkring halvandet minut.` });
      if (!receipt) return NextResponse.json({ error: 'mail_unavailable' }, { status: 503 });
    } catch {
      console.error('nophoto mail failed');
      return NextResponse.json({ error: 'mail_unavailable' }, { status: 503 });
    }
  }
  const res = NextResponse.json({ ok: true });
  if (fresh) res.headers.append('set-cookie', sessionCookie(sid, req.nextUrl.protocol === 'https:'));
  return res;
}

async function overused(email: string, sid: string): Promise<boolean> {
  const day = new Date(Date.now() - 864e5).toISOString();
  try {
    const db = supabaseAdmin();
    const [byEmail, bySession] = await Promise.all([
      db.from('orders').select('id', { count: 'exact', head: true }).eq('customer_email', email).gte('created_at', day),
      db.from('orders').select('id', { count: 'exact', head: true }).eq('preview_meta->>session_id', sid).eq('status', 'MANUAL_REVIEW').gte('created_at', day),
    ]);
    return (byEmail.count ?? 0) >= 3 || (bySession.count ?? 0) >= 5;
  } catch { return false; }
}
