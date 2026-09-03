import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { ownsOrder, payloadFor } from '@/lib/preview-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const [order, sid] = await Promise.all([getOrder(id), readSessionId()]);
  if (!order || !ownsOrder(order, sid)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const payload = await payloadFor(order);
  if (!payload) return NextResponse.json({ error: 'no preview' }, { status: 404 });
  return NextResponse.json(payload, { headers: { 'cache-control': 'no-store' } });
}
