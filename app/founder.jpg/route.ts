import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getFounder } from '@/lib/founder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cached: { name: string; buf: Buffer } | null = null;

/**
 * The founder's portrait for "Hvem står bag". The landing page only renders that section once
 * founder.md names a portrait that exists in assets/founder, so this route is the other half of the
 * same switch: without it, filling the file in would put a broken image on the front page. The
 * photograph is normalised (HEIC from a phone included) and fitted to 600 px — it is shown at 220.
 */
export async function GET() {
  const f = getFounder();
  if (!f.portrait) return new NextResponse('Not found', { status: 404 });
  if (!cached || cached.name !== f.portrait) {
    const raw = await fs.readFile(path.join(process.cwd(), 'assets', 'founder', f.portrait));
    const { normaliseToJpeg, fitLongEdge } = await import('@/lib/restoration/image-utils');
    const { jpeg } = await normaliseToJpeg(raw);
    cached = { name: f.portrait, buf: await fitLongEdge(jpeg, 600, 84) };
  }
  return new NextResponse(new Uint8Array(cached.buf), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' } });
}
