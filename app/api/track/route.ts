import { NextRequest, NextResponse } from 'next/server';
import { logEvent, type EventName } from '@/lib/analytics/events';
import { readSessionId, readUtm } from '@/lib/session';
import { getOrder } from '@/lib/db/orders';
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
  const body = (await req.json().catch(() => null)) as { name?: EventName; orderId?: string; meta?: Record<string, unknown> } | null;
  if (!body?.name || !CLIENT_ALLOWED.includes(body.name)) return NextResponse.json({ ok: true });
  const [sessionId, utm] = await Promise.all([readSessionId(), readUtm()]);
  /**
   * The order these steps belong to, so a session's own events can be joined to what it bought
   * without a guess. It is attached only when this session is the one that made the preview: an
   * order id is a UUID somebody could post at random, and an event filed against a stranger's order
   * is worse than an event filed against nothing.
   *
   * No token is accepted here and none is stored. The consequence is a known and deliberate gap: a
   * saved link opened on another device has a different session, so its events carry the session but
   * not the order. Sending the share token into the logging path to close that would put an access
   * token one mistake away from the events table, which is a worse trade.
   */
  let orderId: string | null = null;
  if (sessionId && typeof body.orderId === 'string' && /^[0-9a-f-]{36}$/.test(body.orderId)) {
    const order = await getOrder(body.orderId).catch(() => null);
    if ((order?.preview_meta as { session_id?: string } | null)?.session_id === sessionId) orderId = order!.id;
  }
  await logEvent(body.name, { sessionId, orderId, utm, meta: clientMetadata(body.meta) });
  return NextResponse.json({ ok: true });
}
