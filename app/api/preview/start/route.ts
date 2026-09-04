import { NextRequest, NextResponse } from 'next/server';
import { ensureSessionId, readUtm, sessionCookie } from '@/lib/session';
import { beginUpload, repeatSource } from '@/lib/preview-service';
import { CONFIG } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = /^(image\/(jpeg|png|webp|heic|heif)|)$/i;

/** Step 1: create the order and hand the browser a one-time signed upload URL for the private bucket. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { size?: number; type?: string; igen?: string };
  const size = Number(body.size ?? 0);
  const type = String(body.type ?? '');
  if (!size || size > CONFIG.maxUploadBytes) return NextResponse.json({ error: 'too_large' }, { status: 413 });
  if (!TYPES.test(type)) return NextResponse.json({ error: 'type' }, { status: 415 });
  const [{ sid, fresh }, utm, repeatOf] = await Promise.all([ensureSessionId(), readUtm(), repeatSource(body.igen)]);
  try {
    const started = await beginUpload({ sessionId: sid, utm, size, type, repeatOf });
    const res = NextResponse.json(started, { headers: { 'cache-control': 'no-store' } });
    if (fresh) res.headers.append('set-cookie', sessionCookie(sid, req.nextUrl.protocol === 'https:'));
    return res;
  } catch (e) {
    console.error('begin upload failed', e);
    return NextResponse.json({ error: 'start' }, { status: 502 });
  }
}
