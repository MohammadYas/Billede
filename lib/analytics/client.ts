'use client';

export type ClientEvent = 'PageView' | 'ViewContent' | 'UploadStarted' | 'UploadCompleted' | 'PreviewShown' | 'PreviewFallback' | 'InitiateCheckout' | 'Purchase';

declare global {
  interface Window { fbq?: (...args: unknown[]) => void; _fbq?: unknown; __gfConsent?: 'yes' | 'no' | null; }
}

const STANDARD = new Set(['PageView', 'ViewContent', 'InitiateCheckout', 'Purchase']);
const QUEUE_KEY = 'gf_pre_consent';
/** The one product, on every event, so Events Manager lines them up. */
export const PRODUCT = { content_ids: ['30x40'], content_type: 'product', content_name: 'Restaureret og indrammet familiebillede', num_items: 1, currency: 'DKK', value: 599 };

export function consent(): 'yes' | 'no' | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|; )gf_consent=(yes|no)/);
  return (m?.[1] as 'yes' | 'no') ?? null;
}

export function setConsent(v: 'yes' | 'no') {
  document.cookie = `gf_consent=${v}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
  if (v === 'yes') { loadPixel(); replayQueue(); }
  else try { sessionStorage.removeItem(QUEUE_KEY); } catch { /* ignore */ }
}

/** Loads the pixel once (any page). Advanced matching (hashed by the pixel itself) when the page knows the customer, e.g. /tak. */
export function loadPixel(match?: { em?: string | null; ph?: string | null }) {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!id || typeof window === 'undefined') return;
  if (window.fbq) { if (match?.em || match?.ph) window.fbq('init', id, clean(match)); return; }
  const w = window as unknown as Record<string, unknown>;
  const fbq = function (...args: unknown[]) { const f = fbq as unknown as { callMethod?: (...a: unknown[]) => void; queue: unknown[] }; if (f.callMethod) f.callMethod(...args); else f.queue.push(args); } as unknown as { (...a: unknown[]): void; queue: unknown[]; loaded: boolean; version: string; push: unknown };
  fbq.queue = []; fbq.loaded = true; fbq.version = '2.0'; fbq.push = fbq;
  w.fbq = fbq; w._fbq = fbq;
  const s = document.createElement('script'); s.async = true; s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  window.fbq!('init', id, clean(match));
  window.fbq!('track', 'PageView');
}

const clean = (m?: { em?: string | null; ph?: string | null }) => {
  const out: Record<string, string> = {};
  if (m?.em) out.em = m.em.trim().toLowerCase();
  if (m?.ph) { let d = m.ph.replace(/\D/g, ''); if (d.length === 8) d = `45${d}`; if (d) out.ph = d; }
  return Object.keys(out).length ? out : undefined;
};

/** Events that happened before the visitor answered the banner are kept for this tab and replayed on "Ok". */
function queue(name: ClientEvent, params: Record<string, unknown>, eventId?: string) {
  try {
    const q = JSON.parse(sessionStorage.getItem(QUEUE_KEY) ?? '[]') as unknown[];
    q.push({ name, params, eventId, t: Date.now() });
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-20)));
  } catch { /* private mode */ }
}
function replayQueue() {
  try {
    const q = JSON.parse(sessionStorage.getItem(QUEUE_KEY) ?? '[]') as { name: ClientEvent; params: Record<string, unknown>; eventId?: string }[];
    sessionStorage.removeItem(QUEUE_KEY);
    for (const e of q) fire(e.name, e.params, e.eventId);
  } catch { /* ignore */ }
}
function fire(name: ClientEvent, params: Record<string, unknown>, eventId?: string) {
  if (!window.fbq) return;
  const extra = eventId ? { eventID: eventId } : undefined;
  if (STANDARD.has(name)) window.fbq('track', name, params, extra); else window.fbq('trackCustom', name, params, extra);
}

/** Fires the Meta event (now if consented, later if undecided, never if declined) and logs the funnel event server-side (always, anonymous session). */
export function track(name: ClientEvent, params: Record<string, unknown> = {}, opts: { serverLog?: boolean; eventId?: string } = {}) {
  try {
    const c = consent();
    if (c === 'yes') { if (!window.fbq) loadPixel(); fire(name, params, opts.eventId); }
    else if (c === null) queue(name, params, opts.eventId);
  } catch { /* never break the flow */ }
  if (opts.serverLog !== false) {
    try {
      const body = JSON.stringify({ name, meta: params });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      else fetch('/api/track', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true });
    } catch { /* ignore */ }
  }
}
