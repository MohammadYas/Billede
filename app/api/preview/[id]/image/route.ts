import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { ownsOrder } from '@/lib/preview-service';
import { getObject } from '@/lib/db/storage';
import { isFormat } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KINDS = { original: 'original_path', preview: 'preview_path', colour: 'colourised_path', mockup: 'mockup_path' } as const;

/**
 * Same-origin, session-gated preview images. The browser never sees the storage host;
 * the private bucket is read server-side with the service role. Cached privately for the
 * lifetime of a signed URL (15 min).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const kind = req.nextUrl.searchParams.get('kind') as keyof typeof KINDS | null;
  if (!kind || !(kind in KINDS) || !/^[0-9a-f-]{36}$/.test(id)) return new NextResponse('Not found', { status: 404 });
  const [order, sid] = await Promise.all([getOrder(id), readSessionId()]);
  if (!order || !ownsOrder(order, sid, req.nextUrl.searchParams.get('t'))) return new NextResponse('Not found', { status: 404 });
  const f = req.nextUrl.searchParams.get('f');
  const rendered = (order.preview_meta as { mockups?: Record<string, string> } | null)?.mockups ?? {};
  // ?f=40x50 picks that size's wall mockup; anything else falls back to the order's own
  const path = kind === 'mockup' && isFormat(f) && rendered[f] ? rendered[f] : order[KINDS[kind]];
  if (!path) return new NextResponse('Not found', { status: 404 });
  const buf = await getObject(path);
  return new NextResponse(new Uint8Array(buf), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=900', 'x-robots-tag': 'noindex' } });
}
