import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/lib/db/orders';
import { readSessionId, readUtm } from '@/lib/session';
import { ownsOrder } from '@/lib/preview-service';
import { paymentProvider } from '@/lib/payments/stripe';
import { signedUrl } from '@/lib/db/storage';
import { logEvent } from '@/lib/analytics/events';
import { CONFIG } from '@/lib/config';
import { priceOere } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { orderId?: string; colour?: boolean };
  if (!body.orderId || !/^[0-9a-f-]{36}$/.test(body.orderId)) return NextResponse.json({ error: 'order' }, { status: 400 });
  const [order, sid, utm] = await Promise.all([getOrder(body.orderId), readSessionId(), readUtm()]);
  if (!order || !ownsOrder(order, sid)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.status !== 'PREVIEW_READY') return NextResponse.json({ error: 'state' }, { status: 409 });
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Betaling er ikke sat op endnu.' }, { status: 503 });

  const chosen = Boolean(body.colour) && Boolean(order.colourised_path);
  const updated = await updateOrder(order.id, { chosen_colour: chosen, amount: priceOere(order.format), currency: 'dkk', payment_provider: paymentProvider().name });
  const base = CONFIG.siteUrl.replace(/\/$/, '');
  // Stripe fetches product images itself; a 15-min signed URL is enough for that fetch.
  const previewImageUrl = order.preview_path ? await signedUrl(order.preview_path) : undefined;
  try {
    const { url, sessionId } = await paymentProvider().createCheckout(updated, {
      successUrl: `${base}/tak?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/p/${order.id}?cancelled=1`,
      previewImageUrl: process.env.STRIPE_PRODUCT_IMAGE === 'false' ? undefined : previewImageUrl,
    });
    await updateOrder(order.id, { payment_session_id: sessionId });
    await logEvent('InitiateCheckout', { sessionId: sid, orderId: order.id, utm });
    return NextResponse.json({ url });
  } catch (e) {
    console.error('checkout failed', e);
    return NextResponse.json({ error: 'checkout' }, { status: 502 });
  }
}
