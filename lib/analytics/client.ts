'use client';

export type ClientEvent = 'PageView' | 'ViewContent' | 'UploadStarted' | 'UploadCompleted' | 'PreviewShown' | 'PreviewFallback' | 'InitiateCheckout' | 'Purchase';

declare global {
  interface Window { fbq?: (...args: unknown[]) => void; _fbq?: unknown; __gfConsent?: 'yes' | 'no' | null; }
}

const STANDARD = new Set(['PageView', 'ViewContent', 'InitiateCheckout', 'Purchase']);

export function consent(): 'yes' | 'no' | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|; )gf_consent=(yes|no)/);
  return (m?.[1] as 'yes' | 'no') ?? null;
}

export function setConsent(v: 'yes' | 'no') {
  document.cookie = `gf_consent=${v}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
  if (v === 'yes') loadPixel();
}

export function loadPixel() {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!id || typeof window === 'undefined' || window.fbq) return;
  const w = window as unknown as Record<string, unknown>;
  const fbq = function (...args: unknown[]) { const f = fbq as unknown as { callMethod?: (...a: unknown[]) => void; queue: unknown[] }; if (f.callMethod) f.callMethod(...args); else f.queue.push(args); } as unknown as { (...a: unknown[]): void; queue: unknown[]; loaded: boolean; version: string; push: unknown };
  fbq.queue = []; fbq.loaded = true; fbq.version = '2.0'; fbq.push = fbq;
  w.fbq = fbq; w._fbq = fbq;
  const s = document.createElement('script'); s.async = true; s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  window.fbq!('init', id);
  window.fbq!('track', 'PageView');
}

/** Fires the Meta event (if consented) and logs the funnel event server-side (always, anonymous session). */
export function track(name: ClientEvent, params: Record<string, unknown> = {}, opts: { serverLog?: boolean; eventId?: string } = {}) {
  try {
    if (consent() === 'yes' && window.fbq) {
      const extra = opts.eventId ? { eventID: opts.eventId } : undefined;
      if (STANDARD.has(name)) window.fbq('track', name, params, extra); else window.fbq('trackCustom', name, params, extra);
    }
  } catch { /* never break the flow */ }
  if (opts.serverLog !== false) {
    try {
      const body = JSON.stringify({ name, meta: params });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      else fetch('/api/track', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true });
    } catch { /* ignore */ }
  }
}
