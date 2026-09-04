import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { ownsOrder } from '@/lib/preview-service';
import { isFormat, PRICING, priceOere } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [order, sid] = await Promise.all([getOrder(id), readSessionId()]);
  if (!order || !ownsOrder(order, sid, req.nextUrl.searchParams.get('t'))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { colour?: boolean; format?: string };
  // colour and size are both just "what the customer is looking at"; the price is re-read from
  // PRICING at checkout, so nothing here can move the amount on its own
  const patch: Record<string, unknown> = {};
  if (typeof body.colour === 'boolean') patch.chosen_colour = body.colour && Boolean(order.colourised_path);
  if (isFormat(body.format) && PRICING[body.format].enabled) { patch.format = body.format; patch.amount = priceOere(body.format); }
  if (Object.keys(patch).length > 0) await updateOrder(order.id, patch);
  return NextResponse.json({ ok: true });
}
