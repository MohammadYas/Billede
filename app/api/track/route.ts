import { NextRequest, NextResponse } from 'next/server';
import { logEvent, type EventName } from '@/lib/analytics/events';
import { readSessionId, readUtm } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Client-side funnel events. Purchase / UploadCompleted / PreviewShown / PreviewFallback / InitiateCheckout
// are written by the server routes that own them; the client copies are ignored to avoid double counting.
const CLIENT_ALLOWED: EventName[] = ['PageView', 'ViewContent', 'UploadStarted'];

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { name?: EventName; meta?: Record<string, unknown> } | null;
  if (!body?.name || !CLIENT_ALLOWED.includes(body.name)) return NextResponse.json({ ok: true });
  const [sessionId, utm] = await Promise.all([readSessionId(), readUtm()]);
  await logEvent(body.name, { sessionId, utm, meta: body.meta && Object.keys(body.meta).length ? body.meta : undefined });
  return NextResponse.json({ ok: true });
}
