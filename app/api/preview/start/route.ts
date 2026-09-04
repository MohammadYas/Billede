import { NextRequest, NextResponse } from 'next/server';
import { readSessionId, readUtm } from '@/lib/session';
import { beginUpload } from '@/lib/preview-service';
import { CONFIG } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = /^(image\/(jpeg|png|webp|heic|heif)|)$/i;

/** Step 1: create the order and hand the browser a one-time signed upload URL for the private bucket. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { size?: number; type?: string };
  const size = Number(body.size ?? 0);
  const type = String(body.type ?? '');
  if (!size || size > CONFIG.maxUploadBytes) return NextResponse.json({ error: 'too_large' }, { status: 413 });
  if (!TYPES.test(type)) return NextResponse.json({ error: 'type' }, { status: 415 });
  const [sessionId, utm] = await Promise.all([readSessionId(), readUtm()]);
  try {
    const started = await beginUpload({ sessionId, utm, size, type });
    return NextResponse.json(started, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    console.error('begin upload failed', e);
    return NextResponse.json({ error: 'start' }, { status: 502 });
  }
}
