import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin/auth';
import { getOrder } from '@/lib/db/orders';
import { enqueue, getJob, jobBusy } from '@/lib/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Print final (gpt-image-2 at quality "high", ≥ 2400 px) runs as a job; admin polls GET for the state. */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
  const order = orderId ? await getOrder(orderId) : null;
  if (!order?.original_path) return NextResponse.json({ error: 'no original' }, { status: 404 });
  if (!jobBusy(order, 'final')) await enqueue('final', order.id);
  return NextResponse.json({ ok: true, queued: true });
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const orderId = req.nextUrl.searchParams.get('orderId') ?? '';
  const order = /^[0-9a-f-]{36}$/.test(orderId) ? await getOrder(orderId) : null;
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ job: getJob(order), final: Boolean(order.final_path) }, { headers: { 'cache-control': 'no-store' } });
}
