import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { objectExists } from '@/lib/db/storage';
import { ownsOrder } from '@/lib/preview-service';
import { enqueue, jobBusy } from '@/lib/jobs';
import { logEvent } from '@/lib/analytics/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Step 3: the file is in the bucket — start (or retry) the restoration job. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const [order, sid] = await Promise.all([getOrder(id), readSessionId()]);
  if (!order || !ownsOrder(order, sid, req.nextUrl.searchParams.get('t'))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.status !== 'NEW') return NextResponse.json({ ok: true, status: order.status });
  if (jobBusy(order, 'restore')) return NextResponse.json({ ok: true, queued: true });
  const uploadPath = (order.preview_meta as { upload_path?: string } | null)?.upload_path;
  if (!uploadPath || !(await objectExists(uploadPath))) return NextResponse.json({ error: 'no_file' }, { status: 409 });
  try {
    await enqueue('restore', order.id);
    await logEvent('UploadStarted', { sessionId: sid, orderId: order.id });
    return NextResponse.json({ ok: true, queued: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    console.error('enqueue failed', e);
    return NextResponse.json({ error: 'queue' }, { status: 502 });
  }
}
