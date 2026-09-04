import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { abandon, ownsOrder } from '@/lib/preview-service';
import { jobBusy } from '@/lib/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** "Afbryd (billedet slettes)": delete now, or flag the running job to delete when it finishes. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const [order, sid] = await Promise.all([getOrder(id), readSessionId()]);
  if (!order || !ownsOrder(order, sid, req.nextUrl.searchParams.get('t'))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.status !== 'NEW' && order.status !== 'PREVIEW_READY' && order.status !== 'MANUAL_REVIEW') return NextResponse.json({ ok: false }, { status: 409 });
  if (jobBusy(order, 'restore')) {
    await updateOrder(order.id, { preview_meta: { ...(order.preview_meta ?? {}), cancelled: true } });
  } else {
    await abandon(order.id);
  }
  return NextResponse.json({ ok: true });
}
