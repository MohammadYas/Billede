import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { ownsOrder } from '@/lib/preview-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [order, sid] = await Promise.all([getOrder(id), readSessionId()]);
  if (!order || !ownsOrder(order, sid)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { colour?: boolean };
  await updateOrder(order.id, { chosen_colour: Boolean(body.colour) && Boolean(order.colourised_path) });
  return NextResponse.json({ ok: true });
}
