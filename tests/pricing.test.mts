/**
 * The order a customer has not touched, and every price that follows from touching it.
 *
 *   npm test
 *
 * This file exists because of one regression class: an add-on that is on before the customer said
 * yes. It is not only a conversion problem — a pre-ticked extra is illegal to charge for under the
 * Danish forbrugeraftalelov, and it is invisible in a screenshot of any *other* state. So the default
 * is asserted from three directions here: the pricing module, the shape a freshly created order has,
 * and the arithmetic Stripe is handed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  quote, customerFormat, customerFormats, readAddOns, DEFAULT_ADDONS, DEFAULT_FORMAT,
  FRAMES, PRICING, EXTRA_PRINT_DKK, MAX_EXTRA_PRINTS, type Format, type Frame,
} from '../lib/pricing';

const dkk = (input: Parameters<typeof quote>[0]) => quote(input).totalOere / 100;

test('the untouched order is 30×40, sort ramme, 0 ekstra, 599 kr.', () => {
  assert.equal(DEFAULT_FORMAT, '30x40');
  assert.equal(customerFormat(), '30x40');
  assert.deepEqual(DEFAULT_ADDONS, { frame: 'sort', extraPrints: 0 });
  const q = quote({});
  assert.equal(q.format, '30x40');
  assert.equal(q.addons.frame, 'sort');
  assert.equal(q.addons.extraPrints, 0);
  assert.equal(q.totalOere, 59900);
});

test('a freshly created order carries no add-ons', () => {
  // createOrder() writes preview_meta without an `addons` key; this is what payloadFor reads back.
  for (const meta of [undefined, null, {}, { session_id: 'x' }] as unknown[]) {
    const addons = readAddOns((meta as { addons?: unknown } | null | undefined)?.addons);
    assert.equal(addons.extraPrints, 0, `extraPrints must be 0 for meta ${JSON.stringify(meta)}`);
    assert.equal(addons.frame, 'sort');
  }
});

test('nothing a client can send turns an extra copy on by itself', () => {
  for (const junk of [undefined, null, {}, { extraPrints: null }, { extraPrints: '' }, { extraPrints: 'abc' },
    { extraPrints: NaN }, { extraPrints: -1 }, { extraPrints: -99 }, { extraPrints: 0.4 }, { frame: 'guld' }] as unknown[]) {
    assert.equal(readAddOns(junk).extraPrints, 0, `extraPrints must be 0 for ${JSON.stringify(junk)}`);
  }
  // and the count can never exceed the cap, however it arrives
  assert.equal(readAddOns({ extraPrints: 99 }).extraPrints, MAX_EXTRA_PRINTS);
  assert.equal(quote({ extraPrints: 99 }).addons.extraPrints, MAX_EXTRA_PRINTS);
});

test('the frame never costs anything, at any size', () => {
  const expected: Record<Format, number> = { '20x30': 449, '30x40': 599, '40x50': 799, '50x70': 999 };
  for (const format of customerFormats()) {
    for (const frame of FRAMES) {
      assert.equal(dkk({ format, frame, extraPrints: 0 }), expected[format], `${format} ${frame}`);
    }
  }
});

test('each extra copy adds 349 kr., whatever the size', () => {
  for (const format of customerFormats()) {
    const base = PRICING[format].priceDkk;
    for (let n = 0; n <= MAX_EXTRA_PRINTS; n++) {
      assert.equal(dkk({ format, extraPrints: n }), base + EXTRA_PRINT_DKK[format] * n, `${format} +${n}`);
    }
  }
  assert.equal(dkk({ format: '30x40', extraPrints: 1 }), 948);
  assert.equal(dkk({ format: '40x50', extraPrints: 1 }), 1148);
  assert.equal(dkk({ format: '50x70', extraPrints: 1 }), 1348);
});

test('a size the customer cannot buy falls back to the default, never to a higher price', () => {
  for (const bad of ['20x30', '99x99', '', null, undefined, 0, {}] as unknown[]) {
    const q = quote({ format: bad });
    assert.equal(q.format, customerFormat());
    assert.equal(q.totalOere, 59900);
  }
});

/** The same arithmetic lib/payments/stripe.ts does before it hands the items over. */
function stripeSum(q: ReturnType<typeof quote>): number {
  const positive = q.lines.filter((l) => l.amountOere > 0);
  const discount = q.lines.filter((l) => l.amountOere < 0).reduce((s, l) => s + l.amountOere, 0);
  return positive.reduce((total, line, i) => {
    const amount = i === 0 ? Math.max(0, line.amountOere + discount) : line.amountOere;
    const unit = Math.max(0, Math.round(amount / Math.max(1, line.quantity)));
    return total + unit * line.quantity;
  }, 0);
}

test('what Stripe is charged equals what the bill showed, in every combination', () => {
  let checked = 0;
  for (const format of customerFormats()) {
    for (const frame of FRAMES as Frame[]) {
      for (let extraPrints = 0; extraPrints <= MAX_EXTRA_PRINTS; extraPrints++) {
        const q = quote({ format, frame, extraPrints });
        assert.equal(stripeSum(q), q.totalOere, `${format} ${frame} +${extraPrints}`);
        assert.equal(q.lines.reduce((s, l) => s + l.amountOere, 0), q.totalOere, 'lines must add up to the total');
        assert.ok(q.totalOere > 0);
        checked++;
      }
    }
  }
  assert.equal(checked, 24);
});

test('no quote ever contains a negative line', () => {
  // Every price on this site is a price. A conditional discount is where a surprise at checkout starts,
  // and Stripe has no negative line item to represent one honestly.
  for (const format of customerFormats()) {
    for (const frame of FRAMES as Frame[]) {
      for (let extraPrints = 0; extraPrints <= MAX_EXTRA_PRINTS; extraPrints++) {
        for (const line of quote({ format, frame, extraPrints }).lines) {
          assert.ok(line.amountOere > 0, `${format} ${frame} +${extraPrints}: ${line.key} is ${line.amountOere}`);
        }
      }
    }
  }
  // and a caller that still passes the old flag cannot conjure one
  assert.equal(quote({ format: '30x40', repeat: true } as never).totalOere, 59900);
});
