import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { putObject } from '@/lib/db/storage';
import { ownsOrder } from '@/lib/preview-service';
import { sniffImageType } from '@/lib/restoration/image-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Function request bodies are capped at 6 MB on Netlify; the browser downsizes before falling back to this. */
const FALLBACK_MAX = 4_500_000;

/**
 * Fallback for browsers that cannot reach the bucket directly (a proxy, an in-app browser that blocks
 * the PUT): the photo comes through the app instead, once, for the same order and the same path.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const [order, sid] = await Promise.all([getOrder(id), readSessionId()]);
  if (!order || !ownsOrder(order, sid, req.nextUrl.searchParams.get('t'))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.status !== 'NEW') return NextResponse.json({ error: 'state' }, { status: 409 });
  const path = (order.preview_meta as { upload_path?: string } | null)?.upload_path;
  if (!path) return NextResponse.json({ error: 'no path' }, { status: 409 });
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file' }, { status: 400 });
  if (file.size > FALLBACK_MAX) return NextResponse.json({ error: 'too_large' }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniffImageType(buf)) return NextResponse.json({ error: 'type' }, { status: 415 });
  await putObject(path, buf, file.type || 'image/jpeg');
  return NextResponse.json({ ok: true });
}
