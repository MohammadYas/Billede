import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { imageUrl, ownsOrder } from '@/lib/preview-service';
import { enqueue, jobBusy } from '@/lib/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Starts the colour job (idempotent); the panel polls GET /api/preview/[id] until `payload.colour` is set. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const [order, sid] = await Promise.all([getOrder(id), readSessionId()]);
  if (!order || !ownsOrder(order, sid, req.nextUrl.searchParams.get('t'))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.colourised_path) return NextResponse.json({ colour: imageUrl(order, 'colour') }, { headers: { 'cache-control': 'no-store' } });
  if (!order.is_monochrome || !order.restored_path) return NextResponse.json({ colour: null }, { status: 409 });
  if (!jobBusy(order, 'colour')) {
    try { await enqueue('colour', order.id); } catch (e) { console.error('colour enqueue failed', e); return NextResponse.json({ colour: null }, { status: 502 }); }
  }
  return NextResponse.json({ colour: null, queued: true }, { headers: { 'cache-control': 'no-store' } });
}
