import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin/auth';
import { getOrder, updateOrder } from '@/lib/db/orders';
import { createSignedUpload, getObject, objectExists, objectPath, putObject } from '@/lib/db/storage';
import { CONFIG } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST: signed URL for a hand-retouched final. PUT: the file is in the bucket — normalise to JPEG if needed and set final_path. */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { orderId, size } = (await req.json().catch(() => ({}))) as { orderId?: string; size?: number };
  const order = orderId && /^[0-9a-f-]{36}$/.test(orderId) ? await getOrder(orderId) : null;
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!size || size > CONFIG.maxUploadBytes) return NextResponse.json({ error: 'too_large' }, { status: 413 });
  const path = objectPath(order.id, 'final');
  const { signedUrl } = await createSignedUpload(path);
  return NextResponse.json({ uploadUrl: signedUrl, path });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { orderId, path } = (await req.json().catch(() => ({}))) as { orderId?: string; path?: string };
  const order = orderId && /^[0-9a-f-]{36}$/.test(orderId) ? await getOrder(orderId) : null;
  if (!order || !path || !path.startsWith(`orders/${order.id}/final-`)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!(await objectExists(path))) return NextResponse.json({ error: 'no_file' }, { status: 409 });
  // PNG/TIFF exports become the JPEG the print partner takes (sharp is loaded here only)
  const { normaliseToJpeg } = await import('@/lib/restoration/image-utils');
  const buf = await getObject(path);
  const { jpeg } = await normaliseToJpeg(buf);
  const finalPath = objectPath(order.id, 'final');
  await putObject(finalPath, jpeg);
  await updateOrder(order.id, { final_path: finalPath, final_generated_at: new Date().toISOString() } as never);
  return NextResponse.json({ ok: true });
}
