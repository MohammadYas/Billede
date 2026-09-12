import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { ownsOrder } from '@/lib/preview-service';
import { isFormat, PRICING, quote, readAddOns, sellableProduct } from '@/lib/pricing';
import { isLandscape } from '@/lib/order-summary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const [order, sid] = await Promise.all([getOrder(id), readSessionId()]);
  if (!order || !ownsOrder(order, sid, req.nextUrl.searchParams.get('t'))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  // only while the customer is still looking: after payment the configuration is what was paid for
  if (order.status !== 'PREVIEW_READY') return NextResponse.json({ error: 'state' }, { status: 409 });
  const body = (await req.json().catch(() => ({}))) as { colour?: boolean; product?: string; format?: string; frame?: string; extraPrints?: number };
  // product, colour, size, frame and extra copies are "what the customer is looking at". The amount is
  // written here so admin shows the live configuration, but checkout builds the quote again from
  // PRICING, so nothing the browser sends can decide what is charged — and a browser that asks for the
  // digital file while that offer is off is written down as the framed parcel, here and there alike.
  const meta = (order.preview_meta ?? {}) as Record<string, unknown>;
  const current = readAddOns(meta.addons);
  const currentProduct = sellableProduct(meta.product);
  const patch: Record<string, unknown> = {};
  if (typeof body.colour === 'boolean') patch.chosen_colour = body.colour && Boolean(order.colourised_path);
  const product = sellableProduct(body.product ?? currentProduct);
  const format = isFormat(body.format) && PRICING[body.format].enabled ? body.format : order.format;
  const addons = readAddOns({ frame: body.frame ?? current.frame, extraPrints: body.extraPrints ?? current.extraPrints });
  const q = quote({ product, format, ...addons, landscape: isLandscape(order) });
  patch.format = q.format;
  patch.amount = q.totalOere;
  patch.preview_meta = { ...meta, product: q.product, addons: q.addons };
  await updateOrder(order.id, patch);
  // A Checkout session holds the line items it was created with. If the customer changes product, size,
  // frame or quantity while an old tab is still open, paying that tab would charge an amount the bill
  // never showed. Kill it here; the next "Bestil" makes a fresh one.
  if (order.payment_session_id && (q.product !== currentProduct || q.format !== order.format || JSON.stringify(q.addons) !== JSON.stringify(current))) {
    try {
      const { paymentProvider } = await import('@/lib/payments/stripe');
      await paymentProvider().expireSession(order.payment_session_id);
      await updateOrder(order.id, { payment_session_id: null });
    } catch (e) { console.error('expire on config change failed', order.id, e); }
  }
  return NextResponse.json({ ok: true, total: q.totalOere });
}
