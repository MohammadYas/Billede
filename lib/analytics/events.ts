import { isSupabaseConfigured, supabaseAdmin } from '@/lib/db/supabase';

export type EventName =
  | 'PageView' | 'ViewContent' | 'FlowOpened' | 'UploadStarted' | 'UploadCompleted' | 'ProcessingStarted' | 'PreviewShown' | 'PreviewFallback' | 'ColourViewed' | 'AddToCart' | 'InitiateCheckout' | 'Purchase';

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
