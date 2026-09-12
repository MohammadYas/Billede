import { isSupabaseConfigured, supabaseAdmin } from '@/lib/db/supabase';

/**
 * Every step we can actually observe. Nothing here is renamed once it is live: `PreviewShown` is the
 * ad set's conversion event and `ColourViewed` means "colour was asked for", however they read. The
 * steps added 2026-09-12 sit beside them rather than replacing them — see lib/analytics/funnel.ts.
 */
export type EventName =
  | 'PageView' | 'ViewContent' | 'FlowOpened' | 'UploadStarted' | 'UploadCompleted' | 'ProcessingStarted'
  /** the job finished (server-side). Says nothing about whether anybody looked at the result. */
  | 'PreviewShown'
  /** the restored picture was loaded and visible in the customer's viewport */
  | 'PreviewViewed'
  /** that same picture opened again later, from a saved link or a second visit */
  | 'PreviewReopened'
  /** the preview link was mailed to the customer */
  | 'PreviewSaved'
  | 'PreviewFallback'
  /** the restoration job failed outright (timeout, provider, error) */
  | 'GenerationFailed'
  /** colour: asked for, delivered, failed */
  | 'ColourViewed' | 'ColourReady' | 'ColourFailed'
  /** digital or framed, and the size and frame under it */
  | 'ProductSelected'
  /** the buy button was pressed, before anything network-shaped happened */
  | 'CheckoutClicked'
  | 'AddToCart' | 'InitiateCheckout'
  /** the browser left for the payment page (a created session is not a page anyone saw) */
  | 'CheckoutRedirected'
  | 'Purchase';

export type Utm = Partial<Record<'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term' | 'fbclid', string>>;

/** Server-side funnel log for v_funnel_daily. Fails silently: analytics must never break the flow. */
export async function logEvent(name: EventName, opts: { sessionId?: string | null; orderId?: string | null; utm?: Utm | null; meta?: Record<string, unknown> } = {}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabaseAdmin().from('events').insert({
      name,
      session_id: opts.sessionId ?? null,
      order_id: opts.orderId ?? null,
      utm_content: opts.utm?.utm_content ?? null,
      utm: opts.utm ?? null,
      meta: opts.meta ?? null,
    });
  } catch (e) {
    console.error('logEvent failed', e);
  }
}
