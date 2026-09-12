/**
 * What the owner is told to do, and what the customer is told has happened, once an order is paid.
 *
 *   npm test
 *
 * This file exists because the two small products were added to the shop before they were added to
 * the packing bench. The checklist is what the owner works from: for a 99 kr. file it used to tell
 * him to order a framed print at CEWE and post it to "(adresse mangler)" — more than the order was
 * worth, for a product that is a download. The shipping mail had the same problem in the other
 * direction: it told a customer who bought a file that their parcel was printed, framed and posted.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Order } from '../lib/db/orders';
import { fulfillmentProvider } from '../lib/fulfillment/manual';
import { shippedNotice } from '../lib/email/templates';
import { orderProduct, isPostedOrder } from '../lib/order-summary';

const order = (product: string, extra: Partial<Order> = {}): Order => ({
  id: '11111111-2222-3333-4444-555555555555',
  status: 'APPROVED', format: '30x40', chosen_colour: false, is_monochrome: true,
  customer_name: 'Kirsten Madsen', customer_email: 'k@example.dk', customer_phone: '+4512345678',
  shipping_address: { name: 'Kirsten Madsen', line1: 'Havnegade 4', postal_code: '4241', city: 'Vemmelev' },
  preview_meta: { product, addons: { frame: 'sort', extraPrints: 0 }, output: { width: 900, height: 1200 } },
  ...extra,
} as unknown as Order);

const list = (o: Order) => fulfillmentProvider().checklist(o, 'https://example.test/fil').join('\n');

test('the framed parcel still says exactly what it said', () => {
  const text = list(order('framed'));
  assert.match(text, /Billede i ramme/);
  assert.match(text, /30×40 cm/);
  assert.match(text, /ramme: SORT/);
  assert.match(text, /Havnegade 4/);
});

test('the loose print is a print, and the checklist never says frame', () => {
  const text = list(order('print'));
  assert.match(text, /uden ramme/i, 'the one thing that distinguishes this parcel must be in the instruction');
  assert.match(text, /20×30 cm/, 'the loose print has its own size, not the framed ladder');
  // "uden passepartout" is worth saying out loud, so the assertion is about the instruction, not the
  // word: the checklist must never order the framed product or name a frame colour
  assert.doesNotMatch(text, /Billede i ramme/);
  assert.doesNotMatch(text, /ramme: (SORT|EG)/);
  assert.match(text, /LØST PRINT/);
  assert.match(text, /Havnegade 4/, 'it is still posted, so the address is still needed');
});

test('the file alone is not ordered, not framed and not posted', () => {
  const text = list(order('digital'));
  assert.doesNotMatch(text, /CEWE/, 'nothing is printed, so nothing is ordered from a print partner');
  assert.doesNotMatch(text, /ramme/i);
  assert.doesNotMatch(text, /adresse/i, 'a download has no delivery address, and none was collected');
  assert.doesNotMatch(text, /tracking/i);
  assert.match(text, /kan hentes/i, 'what the owner actually has to check is that the file is there');
  assert.match(text, /FULDFØRT/, 'and where the order ends, since it never passes AFSENDT');
});

test('an order remembers its product even with nothing in preview_meta', () => {
  assert.equal(orderProduct({ preview_meta: null } as unknown as Order), 'framed');
  assert.equal(orderProduct({ preview_meta: { product: 'junk' } } as unknown as Order), 'framed');
  assert.equal(orderProduct(order('print')), 'print');
  assert.equal(isPostedOrder(order('print')), true);
  assert.equal(isPostedOrder(order('digital')), false);
  assert.equal(isPostedOrder(order('framed')), true);
});

test('the shipping mail describes the parcel that was actually sent', () => {
  const framed = shippedNotice({ product: 'framed', trackingNumber: 'ABC', trackingUrl: null, fileUrl: null });
  assert.match(framed.text, /indrammet/);

  const print = shippedNotice({ product: 'print', trackingNumber: 'ABC', trackingUrl: null, fileUrl: null });
  assert.doesNotMatch(print.text, /indrammet/, 'a loose print was never framed');
  assert.doesNotMatch(print.html, /rammen eller glasset/, 'and it has no glass to arrive broken');
  assert.match(print.text, /fladt/, 'how it was packed is what the customer opens');
});

test('a digital order has no shipping mail to send', () => {
  assert.equal(shippedNotice({ product: 'digital', trackingNumber: null, trackingUrl: null, fileUrl: 'x' }), null);
});
