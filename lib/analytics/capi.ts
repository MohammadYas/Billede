import { createHash } from 'node:crypto';
import type { Order } from '@/lib/db/orders';
import { CONFIG } from '@/lib/config';
import { orderProduct } from '@/lib/order-summary';

/**
 * Meta Conversions API: the server-side copy of Purchase, InitiateCheckout and PreviewShown, deduplicated with the
 * browser pixel through the same event_id (order id / checkout session id). The browser event is lost
 * whenever the buyer finished in another browser (MobilePay app-switch out of the Facebook in-app
 * browser, a saved link on the desktop); this one is not. Needs META_CAPI_TOKEN.
 * /privatliv promises the server-side copy only with the Meta consent, so it is sent only when the order
 * carries `preview_meta.consent = 'yes'` (stamped from the gf_consent cookie at upload start and at checkout).
 */
const sha = (v?: string | null) => (v && v.trim() ? createHash('sha256').update(v.trim().toLowerCase()).digest('hex') : undefined);
const phoneDigits = (v?: string | null) => { if (!v) return undefined; let d = v.replace(/\D/g, ''); if (d.length === 8) d = `45${d}`; return d || undefined; };

export type ServerEventName = 'Purchase' | 'InitiateCheckout' | 'PreviewShown';

export async function sendServerEvent(name: ServerEventName, opts: { eventId: string; order: Order; sourceUrl: string; ip?: string | null; ua?: string | null }): Promise<void> {
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixel || !token) return;
  const o = opts.order;
  if ((o.preview_meta as { consent?: unknown } | null)?.consent !== 'yes') return;
  const addr = (o.shipping_address ?? {}) as Record<string, string | null | undefined>;
  const [fn, ...rest] = (o.customer_name ?? addr.name ?? '').trim().split(/\s+/);
  const meta = (o.preview_meta ?? {}) as { session_id?: string | null };
  const fbclid = o.utm?.fbclid;
  const user_data: Record<string, unknown> = {
    em: sha(o.customer_email) ? [sha(o.customer_email)] : undefined,
    ph: sha(phoneDigits(o.customer_phone)) ? [sha(phoneDigits(o.customer_phone))] : undefined,
    fn: sha(fn) ? [sha(fn)] : undefined,
    ln: sha(rest.join(' ')) ? [sha(rest.join(' '))] : undefined,
    zp: sha(addr.postal_code) ? [sha(addr.postal_code)] : undefined,
    ct: sha(addr.city) ? [sha(addr.city)] : undefined,
    country: [sha('dk')],
    external_id: meta.session_id ? [sha(meta.session_id)] : undefined,
    fbc: fbclid ? `fb.1.${Date.parse(o.created_at) || Date.now()}.${fbclid}` : undefined,
    client_ip_address: opts.ip ?? undefined,
    client_user_agent: opts.ua ?? undefined,
  };
  for (const k of Object.keys(user_data)) if (user_data[k] === undefined) delete user_data[k];
  const value = (o.amount ?? 0) / 100; // an order without an amount reports 0 rather than a made-up 599
  const product = orderProduct(o);
  const body = {
    data: [{
      event_name: name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: opts.eventId,
      action_source: 'website',
      event_source_url: opts.sourceUrl,
      user_data,
      custom_data: { value, currency: 'DKK', content_ids: [product === 'framed' ? o.format : product], content_type: 'product', content_name: product === 'framed' ? 'Restaureret og indrammet familiebillede' : product, num_items: 1 },
    }],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
    if (!r.ok) console.error('capi', name, r.status, await r.text().catch(() => ''));
  } catch (e) { console.error('capi failed', name, e); }
}

export const eventSourceUrl = (path: string) => `${CONFIG.siteUrl.replace(/\/$/, '')}${path}`;
