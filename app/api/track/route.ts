import { NextRequest, NextResponse } from 'next/server';
import { logEvent, type EventName } from '@/lib/analytics/events';
import { readSessionId, readUtm } from '@/lib/session';
import { clientMetadata } from '@/lib/analytics/client-metadata';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Client-side funnel events. Purchase / UploadCompleted / PreviewShown / PreviewFallback /
// GenerationFailed / ColourReady / ColourFailed / InitiateCheckout / PreviewSaved are written by the
// server routes that own them; the client copies are ignored to avoid double counting.
//
// The rest exist only in the browser: nothing on the server sees a sheet open, a picture arrive in
// somebody's viewport, a product picked or a button pressed — and those are the steps where the
// funnel was blind. A page cannot invent a step it is not allowed to send, which is why this is an
// allow-list and not a check on shape.
const CLIENT_ALLOWED: EventName[] = [
  'PageView', 'ViewContent', 'FlowOpened', 'UploadStarted', 'ProcessingStarted',
  'PreviewViewed', 'PreviewReopened', 'ColourViewed', 'ProductSelected', 'AddToCart',
  'CheckoutClicked', 'CheckoutRedirected',
];

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { name?: EventName; meta?: Record<string, unknown> } | null;
  if (!body?.name || !CLIENT_ALLOWED.includes(body.name)) return NextResponse.json({ ok: true });
  const [sessionId, utm] = await Promise.all([readSessionId(), readUtm()]);
  await logEvent(body.name, { sessionId, utm, meta: clientMetadata(body.meta) });
  return NextResponse.json({ ok: true });
}
