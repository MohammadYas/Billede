import { NextRequest, NextResponse } from 'next/server';
import { getOrder, setStatus, createOrder } from '@/lib/db/orders';
import { readSessionId, readUtm } from '@/lib/session';
import { ownsOrder } from '@/lib/preview-service';
import { customerFormat } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Manual-review lead: stores the email on the MANUAL_REVIEW order (or creates one when processing died before an order existed). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { orderId?: string | null; email?: string };
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return NextResponse.json({ error: 'email' }, { status: 400 });
  const [sid, utm] = await Promise.all([readSessionId(), readUtm()]);
  let order = body.orderId && /^[0-9a-f-]{36}$/.test(body.orderId) ? await getOrder(body.orderId) : null;
  if (order && !ownsOrder(order, sid)) order = null;
  if (!order) order = await createOrder({ status: 'MANUAL_REVIEW', format: customerFormat(), utm, preview_meta: { session_id: sid, note: 'lead without upload' } });
  await setStatus(order.id, 'MANUAL_REVIEW', { customer_email: email });
  return NextResponse.json({ ok: true });
}
