/**
 * /api/checkout — the one route where a mistake costs money.
 *
 *   npm test
 *
 * Four properties, each of which has a way of quietly going wrong:
 *   1. The amount is built on the server from PRICING and the configured offers. The browser sends a
 *      configuration, never a price, and a browser asking for a product whose offer is off is charged
 *      for the framed parcel instead of an amount nobody approved.
 *   2. Only a finished, unpaid preview can be paid for. A paid order cannot be paid again.
 *   3. Only the owner of the preview — session cookie or share token — can open its payment.
 *   4. A Checkout tab left open is expired before a new one is created, so an old amount cannot be
 *      paid after the customer changed their mind about the size.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_bundle.mts';

/** Everything the route touches, replaced by something that records what it was asked to do. */
const calls: { created: unknown[]; expired: string[]; updates: Record<string, unknown>[] } = { created: [], expired: [], updates: [] };

const order = (over: Record<string, unknown> = {}) => ({
  id: '11111111-2222-3333-4444-555555555555',
  status: 'PREVIEW_READY', format: '30x40', chosen_colour: false, colourised_path: 'c/1.jpg',
  preview_path: 'p/1.jpg', payment_session_id: null, amount: null,
  preview_meta: { session_id: 'sid-1', share_token: 'tok-1'.padEnd(20, 'x') },
  utm: null, ...over,
});

let current = order();

const route = await load('app/api/checkout/route.ts', {
  '@/lib/db/orders': `
    export const getOrder = async () => globalThis.__order;
    export const updateOrder = async (id, patch) => { globalThis.__calls.updates.push(patch); globalThis.__order = { ...globalThis.__order, ...patch }; return globalThis.__order; };`,
  '@/lib/session': `
    export const readSessionId = async () => globalThis.__sid;
    export const readUtm = async () => null;
    export const readConsent = async () => 'yes';`,
  '@/lib/preview-service': `export { ownsOrder } from '@/lib/preview-service-real';`,
  '@/lib/preview-service-real': `
    export function ownsOrder(order, sid, token) {
      const meta = order.preview_meta ?? {};
      return (sid && meta.session_id === sid) || (token && meta.share_token === token);
    }`,
  '@/lib/payments/stripe': `
    export const paymentProvider = () => ({
      name: 'stripe',
      expireSession: async (id) => { globalThis.__calls.expired.push(id); },
      createCheckout: async (order, opts) => { globalThis.__calls.created.push(opts.quote); return { url: 'https://checkout.stripe.com/x', sessionId: 'cs_test_1' }; },
    });`,
  '@/lib/db/storage': 'export const signedUrl = async () => "https://signed.example/x.jpg";',
  '@/lib/analytics/events': 'export const logEvent = async () => {};',
  '@/lib/analytics/capi': 'export const sendServerEvent = async () => {}; export const eventSourceUrl = (p) => p;',
});

(globalThis as Record<string, unknown>).__calls = calls;

const post = async (body: Record<string, unknown>, opts: { sid?: string | null; order?: Record<string, unknown> } = {}) => {
  (globalThis as Record<string, unknown>).__order = opts.order ?? current;
  (globalThis as Record<string, unknown>).__sid = opts.sid === undefined ? 'sid-1' : opts.sid;
  calls.created.length = 0; calls.expired.length = 0; calls.updates.length = 0;
  const req = {
    json: async () => body,
    headers: new Headers(),
    nextUrl: { searchParams: new URLSearchParams() },
  };
  const res = await route.POST(req as never);
  return { status: res.status, body: await res.json() };
};

process.env.STRIPE_SECRET_KEY = 'sk_test_forthetest';
// both small offers off, so "digital" is a request the server must refuse to price
delete process.env.NEXT_PUBLIC_DIGITAL_ENABLED;
delete process.env.NEXT_PUBLIC_DIGITAL_PRICE_DKK;
delete process.env.NEXT_PUBLIC_PRINT_ENABLED;
delete process.env.NEXT_PUBLIC_PRINT_PRICE_DKK;

test('the amount comes from the server, whatever the browser sends with it', async () => {
  const r = await post({ orderId: order().id, format: '50x70', amount: 1, totalOere: 1, price: 1, quote: { totalOere: 1 } });
  assert.equal(r.status, 200);
  const quoted = calls.created[0] as { totalOere: number; format: string };
  assert.equal(quoted.totalOere, 99900, '50×70 is 999 kr. from PRICING, not the 1 øre the body asked for');
  assert.equal(quoted.format, '50x70');
  // and the same number is written on the order before Stripe is called
  assert.ok(calls.updates.some((u) => u.amount === 99900), JSON.stringify(calls.updates.map((u) => u.amount)));
});

test('a size that is not on sale falls back to the default, never to a cheaper one', async () => {
  const r = await post({ orderId: order().id, format: '20x30' });
  assert.equal(r.status, 200);
  assert.equal((calls.created[0] as { totalOere: number }).totalOere, 59900, '20×30 is disabled in the framed ladder');
});

test('a product whose offer is off cannot be bought, however it is asked for', async () => {
  for (const product of ['digital', 'print', 'gratis', 1, null]) {
    const r = await post({ orderId: order().id, product });
    assert.equal(r.status, 200);
    const q = calls.created[0] as { product: string; totalOere: number };
    assert.equal(q.product, 'framed', `product ${JSON.stringify(product)} must fall back`);
    assert.equal(q.totalOere, 59900);
  }
});

test('an enabled offer is the only thing that lets a small product through', async () => {
  process.env.NEXT_PUBLIC_DIGITAL_ENABLED = 'true';
  process.env.NEXT_PUBLIC_DIGITAL_PRICE_DKK = '99';
  try {
    const r = await post({ orderId: order().id, product: 'digital' });
    assert.equal(r.status, 200);
    const q = calls.created[0] as { product: string; totalOere: number; needsAddress: boolean };
    assert.equal(q.product, 'digital');
    assert.equal(q.totalOere, 9900);
    assert.equal(q.needsAddress, false, 'a file is not posted, so Stripe must not ask where to send it');
    // the print offer is still off, and one offer never opens the other
    const r2 = await post({ orderId: order().id, product: 'print' });
    assert.equal((calls.created[0] as { product: string }).product, 'framed');
    assert.equal(r2.status, 200);
  } finally {
    delete process.env.NEXT_PUBLIC_DIGITAL_ENABLED;
    delete process.env.NEXT_PUBLIC_DIGITAL_PRICE_DKK;
  }
});

test('only a finished, unpaid preview can be paid for', async () => {
  for (const status of ['NEW', 'PAID', 'AWAITING_APPROVAL', 'APPROVED', 'SHIPPED', 'COMPLETED', 'REFUNDED', 'MANUAL_REVIEW', 'ABANDONED']) {
    const r = await post({ orderId: order().id }, { order: order({ status }) });
    assert.equal(r.status, 409, `${status} must not open a payment`);
    assert.equal(calls.created.length, 0);
  }
});

test('a preview belonging to somebody else is not found, not refused', async () => {
  // "not found" rather than "forbidden": an id that exists must not be distinguishable from one that does not
  const r = await post({ orderId: order().id }, { sid: 'somebody-else' });
  assert.equal(r.status, 404);
  assert.equal(calls.created.length, 0);
  // a bad id never reaches the database at all
  assert.equal((await post({ orderId: 'not-a-uuid' })).status, 400);
  assert.equal((await post({})).status, 400);
});

test('a Checkout tab left open is expired before a new one is made', async () => {
  const r = await post({ orderId: order().id }, { order: order({ payment_session_id: 'cs_old' }) });
  assert.equal(r.status, 200);
  assert.deepEqual(calls.expired, ['cs_old'], 'paying an old tab would charge an amount the bill never showed');
});

test('the lines Stripe is given are stored on the order as they were agreed', async () => {
  await post({ orderId: order().id, format: '40x50', extraPrints: 1 });
  const snapshot = calls.updates.map((u) => (u.preview_meta as { quote?: { totalOere?: number } } | undefined)?.quote).find(Boolean);
  assert.ok(snapshot, 'the receipt renders this snapshot, so a later price change cannot rewrite an old order');
  assert.equal(snapshot!.totalOere, (calls.created[0] as { totalOere: number }).totalOere);
});
