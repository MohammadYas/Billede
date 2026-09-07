import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_bundle.mts';

// /privatliv: the server-side Meta event goes out only with the Meta consent. The order carries that answer.
const capi = await load('lib/analytics/capi.ts', { '@/lib/config': `export const CONFIG={siteUrl:'http://localhost:3000'};` });
const calls: { url: string; body: string }[] = [];
const order = (meta: Record<string, unknown>) => ({
  id: '00000000-0000-4000-8000-000000000001', created_at: '2026-09-07T00:00:00Z', format: '30x40', amount: 59900,
  customer_email: 'audit@example.invalid', customer_phone: '12345678', customer_name: 'Test Person', shipping_address: { postal_code: '8000', city: 'Aarhus' },
  utm: { fbclid: 'synthetic-click' }, preview_meta: { session_id: 'synthetic-session', share_token: 'synthetic-share-token-secret', ...meta },
});
const send = async (meta: Record<string, unknown>) => {
  const previous = { pixel: process.env.NEXT_PUBLIC_META_PIXEL_ID, token: process.env.META_CAPI_TOKEN, fetch: globalThis.fetch };
  process.env.NEXT_PUBLIC_META_PIXEL_ID = 'synthetic-pixel'; process.env.META_CAPI_TOKEN = 'synthetic-capi-token';
  globalThis.fetch = (async (url: string, init: { body: string }) => { calls.push({ url, body: init.body }); return { ok: true, text: async () => '' }; }) as any;
  try { await capi.sendServerEvent('Purchase', { eventId: 'evt', order: order(meta), sourceUrl: capi.eventSourceUrl('/tak') }); }
  finally {
    globalThis.fetch = previous.fetch;
    if (previous.pixel === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID; else process.env.NEXT_PUBLIC_META_PIXEL_ID = previous.pixel;
    if (previous.token === undefined) delete process.env.META_CAPI_TOKEN; else process.env.META_CAPI_TOKEN = previous.token;
  }
};

test('no Meta consent on the order: nothing is sent to Meta', async () => {
  calls.length = 0;
  await send({});
  await send({ consent: 'no' });
  assert.equal(calls.length, 0);
});
test('with consent the event is sent once, hashed, without the share token or a raw address', async () => {
  calls.length = 0;
  await send({ consent: 'yes' });
  assert.equal(calls.length, 1);
  const { url, body } = calls[0];
  assert.match(url, /^https:\/\/graph\.facebook\.com\//);
  assert.doesNotMatch(body, /synthetic-share-token-secret|audit@example\.invalid|12345678|Aarhus/);
  const data = JSON.parse(body).data[0];
  assert.equal(data.event_id, 'evt');
  assert.equal(data.event_source_url, 'http://localhost:3000/tak');
  assert.equal(data.custom_data.value, 599);
});
