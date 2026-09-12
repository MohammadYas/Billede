import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { ownsOrder } from '@/lib/preview-service';
import { getObject } from '@/lib/db/storage';
import { isFormat, isFrame } from '@/lib/pricing';

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
  const fr = req.nextUrl.searchParams.get('fr');
  const rendered = (order.preview_meta as { mockups?: Record<string, string> } | null)?.mockups ?? {};
  // ?f=40x50&fr=eg picks that size in that frame, &c=farve the colourised wall; anything missing falls back
  // one step at a time — colour wall → black-and-white wall → the order's own mockup
  const wantColour = req.nextUrl.searchParams.get('c') === 'farve';
  // Only the starting size gets its colour wall inside the preview job; the rest land a few seconds later.
  // A customer who has chosen colour must not watch the picture drop to black-and-white when they change
  // size, so keep the size and borrow the colour wall from another frame before giving up on colour.
  const colourInSize = wantColour && isFormat(f)
    ? rendered[`${f}:${fr}:farve`] ?? Object.entries(rendered).find(([k]) => k.startsWith(`${f}:`) && k.endsWith(':farve'))?.[1]
    : undefined;
  const mockup = kind === 'mockup' && isFormat(f)
    ? colourInSize ?? (isFrame(fr) ? rendered[`${f}:${fr}`] : undefined) ?? rendered[f]
    : undefined;
  const path = mockup ?? order[KINDS[kind]];
  if (!path) return new NextResponse('Not found', { status: 404 });
  // a colour wall that had to fall back is still being rendered: don't let the browser hold it for a quarter
  // of an hour, or the right wall never replaces it
  const settled = !wantColour || Boolean(rendered[`${f}:${fr}:farve`]);
  const buf = await getObject(path);
  return new NextResponse(new Uint8Array(buf), { headers: { 'content-type': 'image/jpeg', 'cache-control': settled ? 'private, max-age=900' : 'private, no-store', 'x-robots-tag': 'noindex' } });
}
