/**
 * The three things a customer can buy, and the arithmetic behind each.
 *
 *   npm test
 *
 * `framed` is the parcel the site was built around: print, frame, glass, mount, the file, free
 * shipping, from 599 kr. `print` is the same photograph as a loose 20×30 print with the file, 250 kr.
 * `digital` is the file alone, 99 kr. The two small ones are configuration, not code: until an
 * approved price is set they cannot be bought, and the property most of these tests are about is that
 * nothing a browser sends can get around that.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  quote, PRODUCTS, isProduct, sellableProduct, productOffers, PRINT_FORMAT,
  customerFormats, PRICING, EXTRA_PRINT_DKK, type Format, type Offers,
} from '../lib/pricing';

const offers = (printDkk: number, digitalDkk: number): Offers => ({
  print: { enabled: printDkk > 0, priceDkk: printDkk },
  digital: { enabled: digitalDkk > 0, priceDkk: digitalDkk },
});
const OFF = offers(0, 0);
const ON = offers(250, 99);
const dkk = (input: Parameters<typeof quote>[0]) => quote(input).totalOere / 100;

test('the three products, cheapest thing last', () => {
  assert.deepEqual(PRODUCTS, ['framed', 'print', 'digital']);
  for (const p of PRODUCTS) assert.equal(isProduct(p), true, p);
  assert.equal(isProduct('gratis'), false);
  assert.equal(isProduct(''), false);
});

test('an order with no product named is the framed parcel', () => {
  assert.equal(quote({}).product, 'framed');
  assert.equal(dkk({}), 599);
});

test('neither small product can be bought while its offer is off, however it is asked for', () => {
  for (const product of ['print', 'digital'] as const) {
    const q = quote({ product, offers: OFF });
    assert.equal(q.product, 'framed', `${product} with no price must fall back to the framed parcel`);
    assert.equal(q.totalOere, 59900);
    assert.equal(sellableProduct(product, OFF), 'framed');
  }
  // a flag with no price is the same as no offer at all
  const halfOn: Offers = { print: { enabled: true, priceDkk: 0 }, digital: { enabled: false, priceDkk: 99 } };
  assert.equal(sellableProduct('print', halfOn), 'framed');
  assert.equal(sellableProduct('digital', halfOn), 'framed');
  assert.equal(sellableProduct('junk', ON), 'framed');
  assert.equal(sellableProduct('print', ON), 'print');
  assert.equal(sellableProduct('digital', ON), 'digital');
});

test('the digital file is one line at its own price: no frame, no shipping, no size premium', () => {
  const q = quote({ product: 'digital', offers: ON });
  assert.equal(q.product, 'digital');
  assert.equal(q.totalOere, 9900);
  assert.equal(q.lines.length, 1);
  assert.equal(q.lines[0].key, 'digital');
  assert.equal(q.needsAddress, false);
  for (const format of customerFormats()) {
    assert.equal(dkk({ product: 'digital', format, offers: ON }), 99, format);
  }
});

test('the loose print is one line at its own price, and it is posted', () => {
  const q = quote({ product: 'print', offers: ON });
  assert.equal(q.product, 'print');
  assert.equal(q.totalOere, 25000);
  assert.equal(q.lines.length, 1);
  assert.equal(q.lines[0].key, 'print_only');
  assert.equal(q.needsAddress, true, 'a print goes in the post, so Stripe must ask where');
  assert.equal(q.format, PRINT_FORMAT, 'the loose print has one size, and it is not the framed ladder');
  assert.equal(q.label, '20×30 cm');
});

test('a landscape photograph turns the loose print, not its price', () => {
  const q = quote({ product: 'print', offers: ON, landscape: true });
  assert.equal(q.label, '30×20 cm');
  assert.equal(q.totalOere, 25000);
});

test('nothing a browser can send adds a frame add-on to a small product', () => {
  for (const product of ['print', 'digital'] as const) {
    const q = quote({ product, offers: ON, frame: 'eg', extraPrints: 3, format: '50x70', campaign: true });
    assert.equal(q.lines.length, 1, product);
    assert.equal(q.addons.extraPrints, 0, product);
    assert.equal(q.totalOere, product === 'print' ? 25000 : 9900, product);
  }
});

test('the framed parcel is untouched by the small products existing', () => {
  const expected: Record<Format, number> = { '20x30': 449, '30x40': 599, '40x50': 799, '50x70': 999 };
  for (const format of customerFormats()) {
    assert.equal(dkk({ format, offers: ON }), expected[format], format);
    assert.equal(dkk({ format, extraPrints: 1, offers: ON }), expected[format] + EXTRA_PRINT_DKK[format], format);
  }
  assert.equal(PRICING['30x40'].priceDkk, 599);
  assert.equal(quote({ offers: ON }).needsAddress, true);
});

test('productOffers() needs both a flag and a price, per product', () => {
  assert.equal(productOffers({}).digital.enabled, false);
  assert.equal(productOffers({}).print.enabled, false);
  assert.equal(productOffers({ NEXT_PUBLIC_DIGITAL_ENABLED: 'true' }).digital.enabled, false, 'a flag without a price stays off');
  assert.equal(productOffers({ NEXT_PUBLIC_DIGITAL_PRICE_DKK: '99' }).digital.enabled, false, 'a price without the flag stays off');
  assert.equal(productOffers({ NEXT_PUBLIC_PRINT_ENABLED: 'true' }).print.enabled, false);
  assert.equal(productOffers({ NEXT_PUBLIC_PRINT_PRICE_DKK: '250' }).print.enabled, false);
  const on = productOffers({
    NEXT_PUBLIC_DIGITAL_ENABLED: 'true', NEXT_PUBLIC_DIGITAL_PRICE_DKK: '99',
    NEXT_PUBLIC_PRINT_ENABLED: 'true', NEXT_PUBLIC_PRINT_PRICE_DKK: '250',
  });
  assert.deepEqual(on, { print: { enabled: true, priceDkk: 250 }, digital: { enabled: true, priceDkk: 99 } });
  // one product's offer never switches the other on
  const onlyDigital = productOffers({ NEXT_PUBLIC_DIGITAL_ENABLED: 'true', NEXT_PUBLIC_DIGITAL_PRICE_DKK: '99' });
  assert.equal(onlyDigital.digital.enabled, true);
  assert.equal(onlyDigital.print.enabled, false);
  // junk prices are not prices
  for (const junk of ['', 'gratis', '-50', '0', 'NaN']) {
    assert.equal(productOffers({ NEXT_PUBLIC_DIGITAL_ENABLED: 'true', NEXT_PUBLIC_DIGITAL_PRICE_DKK: junk }).digital.enabled, false, junk);
  }
});

test('the small products are cheaper than the parcel, in the order the page shows them', () => {
  // not a style rule: a "cheap" option that costs more than the full one is a bug the page cannot show
  const framed = quote({ offers: ON }).totalOere;
  const print = quote({ product: 'print', offers: ON }).totalOere;
  const digital = quote({ product: 'digital', offers: ON }).totalOere;
  assert.ok(digital < print && print < framed, `${digital} < ${print} < ${framed}`);
});
