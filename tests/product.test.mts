/**
 * The two things a customer can buy, and the arithmetic behind each.
 *
 *   npm test
 *
 * The framed parcel is the product that exists today. The digital file is finished code behind a
 * configuration flag: until the owner sets a price, nothing the browser sends can make the server
 * quote one — that is the property most of these tests are about.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  quote, PRODUCTS, isProduct, sellableProduct, digitalOffer, customerFormats, PRICING,
  EXTRA_PRINT_DKK, type Format,
} from '../lib/pricing';

const offer = (priceDkk: number) => ({ enabled: priceDkk > 0, priceDkk });
const dkk = (input: Parameters<typeof quote>[0]) => quote(input).totalOere / 100;

test('the two products are the framed parcel and the digital file', () => {
  assert.deepEqual(PRODUCTS, ['framed', 'digital']);
  assert.equal(isProduct('framed'), true);
  assert.equal(isProduct('digital'), true);
  assert.equal(isProduct('gratis'), false);
});

test('an order with no product named is the framed parcel', () => {
  assert.equal(quote({}).product, 'framed');
  assert.equal(dkk({}), 599);
});

test('the digital file cannot be bought while the offer is off, however it is asked for', () => {
  for (const off of [offer(0), { enabled: false, priceDkk: 249 }]) {
    const q = quote({ product: 'digital', digital: off });
    assert.equal(q.product, 'framed', 'a disabled digital offer falls back to the framed parcel');
    assert.equal(q.totalOere, 59900);
  }
  // and the same rule where the server decides which product an order is
  assert.equal(sellableProduct('digital', offer(0)), 'framed');
  assert.equal(sellableProduct('digital', offer(249)), 'digital');
  assert.equal(sellableProduct('junk', offer(249)), 'framed');
});

test('an enabled digital offer is one line at its own price: no frame, no shipping, no size premium', () => {
  const q = quote({ product: 'digital', digital: offer(249) });
  assert.equal(q.product, 'digital');
  assert.equal(q.totalOere, 24900);
  assert.equal(q.lines.length, 1);
  assert.equal(q.lines[0].key, 'digital');
  assert.equal(q.addons.extraPrints, 0);
  // the size the preview happens to sit on must not move a digital price
  for (const format of customerFormats()) {
    assert.equal(dkk({ product: 'digital', format, digital: offer(249) }), 249, format);
  }
});

test('nothing a browser can send adds a print add-on to a digital order', () => {
  const q = quote({ product: 'digital', frame: 'eg', extraPrints: 3, campaign: true, digital: offer(249) });
  assert.equal(q.totalOere, 24900);
  assert.equal(q.lines.length, 1);
  assert.equal(q.addons.extraPrints, 0);
});

test('a digital order needs no delivery address; a framed one does', () => {
  assert.equal(quote({ product: 'digital', digital: offer(249) }).needsAddress, false);
  assert.equal(quote({}).needsAddress, true);
});

test('the framed parcel is untouched by the digital offer existing', () => {
  const expected: Record<Format, number> = { '20x30': 449, '30x40': 599, '40x50': 799, '50x70': 999 };
  for (const format of customerFormats()) {
    assert.equal(dkk({ format, digital: offer(249) }), expected[format], format);
    assert.equal(dkk({ format, extraPrints: 1, digital: offer(249) }), expected[format] + EXTRA_PRINT_DKK[format], format);
  }
  assert.equal(PRICING['30x40'].priceDkk, 599);
});

test('digitalOffer() is off unless both the flag and a price are set', () => {
  assert.equal(digitalOffer({}).enabled, false);
  assert.equal(digitalOffer({ NEXT_PUBLIC_DIGITAL_ENABLED: 'true' }).enabled, false, 'a flag without a price stays off');
  assert.equal(digitalOffer({ NEXT_PUBLIC_DIGITAL_PRICE_DKK: '249' }).enabled, false, 'a price without the flag stays off');
  const on = digitalOffer({ NEXT_PUBLIC_DIGITAL_ENABLED: 'true', NEXT_PUBLIC_DIGITAL_PRICE_DKK: '249' });
  assert.equal(on.enabled, true);
  assert.equal(on.priceDkk, 249);
});
