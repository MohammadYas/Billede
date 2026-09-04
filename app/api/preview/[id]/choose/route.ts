import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { ownsOrder } from '@/lib/preview-service';
import { isFormat, PRICING, quote, readAddOns } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [order, sid] = await Promise.all([getOrder(id), readSessionId()]);
  if (!order || !ownsOrder(order, sid, req.nextUrl.searchParams.get('t'))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { colour?: boolean; format?: string; frame?: string; extraPrints?: number };
  // colour, size, frame and extra copies are "what the customer is looking at". The amount is written
  // here so admin shows the live configuration, but checkout builds the quote again from PRICING,
  // so nothing the browser sends can decide what is charged.
  const meta = (order.preview_meta ?? {}) as Record<string, unknown>;
  const current = readAddOns(meta.addons);
  const patch: Record<string, unknown> = {};
  if (typeof body.colour === 'boolean') patch.chosen_colour = body.colour && Boolean(order.colourised_path);
  const format = isFormat(body.format) && PRICING[body.format].enabled ? body.format : order.format;
  const addons = readAddOns({ frame: body.frame ?? current.frame, extraPrints: body.extraPrints ?? current.extraPrints });
  const q = quote({ format, ...addons, repeat: Boolean(meta.repeat_of) });
  patch.format = q.format;
  patch.amount = q.totalOere;
  patch.preview_meta = { ...meta, addons: q.addons };
  await updateOrder(order.id, patch);
  return NextResponse.json({ ok: true, total: q.totalOere });
}
