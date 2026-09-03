import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin/auth';
import { getOrder, updateOrder } from '@/lib/db/orders';
import { getObject, objectPath, putObject } from '@/lib/db/storage';
import { restore, colourise } from '@/lib/restoration/restore';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/** Print final: gpt-image-2 at quality "high", explicit large size, then ≥ 2400 px long edge. */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
  const order = orderId ? await getOrder(orderId) : null;
  if (!order?.original_path) return NextResponse.json({ error: 'no original' }, { status: 404 });
  const original = await getObject(order.original_path);
  const result = await restore(original, { quality: 'high', candidates: 2, likenessCheck: true, minLongEdge: 2400, timeoutMs: 280_000, size: process.env.FINAL_IMAGE_SIZE ?? 'auto' });
  let final = result.restored;
  if (order.chosen_colour && result.isMonochrome) {
    const c = await colourise(result.restored, 'high');
    final = c.image;
  }
  const path = objectPath(order.id, 'final');
  await putObject(path, final);
  await updateOrder(order.id, { final_path: path, final_generated_at: new Date().toISOString(), preview_meta: { ...(order.preview_meta ?? {}), final: result.meta } } as never);
  return NextResponse.json({ ok: true, meta: result.meta });
}
