import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/lib/db/orders';
import { readSessionId, readUtm } from '@/lib/session';
import { ownsOrder } from '@/lib/preview-service';
import { paymentProvider } from '@/lib/payments/stripe';
import { signedUrl } from '@/lib/db/storage';
import { logEvent } from '@/lib/analytics/events';
import { CONFIG } from '@/lib/config';
import { quote } from '@/lib/pricing';
import { sendServerEvent, eventSourceUrl } from '@/lib/analytics/capi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { orderId?: string; colour?: boolean; format?: string; frame?: string; extraPrints?: number; t?: string };
  if (!body.orderId || !/^[0-9a-f-]{36}$/.test(body.orderId)) return NextResponse.json({ error: 'order' }, { status: 400 });
  const [order, sid, utm] = await Promise.all([getOrder(body.orderId), readSessionId(), readUtm()]);
  if (!order || !ownsOrder(order, sid, body.t ?? null)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.status !== 'PREVIEW_READY') return NextResponse.json({ error: 'state' }, { status: 409 });
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Betaling er ikke sat op endnu.' }, { status: 503 });

  // a stale Checkout tab must not be able to pay a second time
  if (order.payment_session_id) await paymentProvider().expireSession(order.payment_session_id);
  const shareToken = (order.preview_meta as { share_token?: string } | null)?.share_token;
  const chosen = Boolean(body.colour) && Boolean(order.colourised_path);
  // The page sends a configuration, never a price. The quote is built here from PRICING, and the
  // repeat discount is only real if this order remembers a paid order that sent it (checked at upload).
  const meta = (order.preview_meta ?? {}) as Record<string, unknown>;
  const q = quote({ format: body.format ?? order.format, frame: body.frame, extraPrints: body.extraPrints, repeat: Boolean(meta.repeat_of) });
  // the lines are stored as they were agreed: /tak, the mails and admin render this snapshot, so a later
  // price change cannot make an old receipt contradict its own total
  const updated = await updateOrder(order.id, { format: q.format, chosen_colour: chosen, amount: q.totalOere, currency: 'dkk', payment_provider: paymentProvider().name, preview_meta: { ...meta, addons: q.addons, quote: { lines: q.lines, totalOere: q.totalOere, at: new Date().toISOString() } } });
  const base = CONFIG.siteUrl.replace(/\/$/, '');
  // Stripe fetches product images itself; a 15-min signed URL is enough for that fetch.
  const previewImageUrl = order.preview_path ? await signedUrl(order.preview_path) : undefined;
  try {
    const { url, sessionId } = await paymentProvider().createCheckout(updated, {
      quote: q,
      successUrl: `${base}/tak?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/p/${order.id}?cancelled=1${shareToken ? `&t=${encodeURIComponent(shareToken)}` : ''}`,
      previewImageUrl: process.env.STRIPE_PRODUCT_IMAGE === 'false' ? undefined : previewImageUrl,
    });
      const sessions = [...new Set([...(((meta.sessions as string[] | undefined) ?? [])), sessionId])].slice(-10);
    // every session id is kept: a customer who pays an older tab must still be found by the hourly
    // reconciliation, which otherwise only ever asks Stripe about the newest one
    const withSession = await updateOrder(order.id, { payment_session_id: sessionId, preview_meta: { ...meta, addons: q.addons, sessions } });
    await logEvent('InitiateCheckout', { sessionId: sid, orderId: order.id, utm });
    await sendServerEvent('InitiateCheckout', { eventId: sessionId, order: withSession, sourceUrl: eventSourceUrl(`/p/${order.id}`), ip: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null, ua: req.headers.get('user-agent') });
    return NextResponse.json({ url, sessionId });
  } catch (e) {
    // Stripe's message is what the owner needs in the function log (e.g. the Dashboard's missing Terms URL)
    console.error('checkout failed', order.id, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'checkout' }, { status: 502 });
  }
}
