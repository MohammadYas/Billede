import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_bundle.mts';

const events: any[][] = [];
(globalThis as any).__purchaseEvents = events;
const component = await load('components/PurchaseEvent.tsx', {
  react: `export const useEffect=(fn)=>fn();`,
  '@/lib/analytics/client': `export const consent=()=> 'no'; export const loadPixel=()=>{}; export const PRODUCT={content_type:'product',content_name:'Restaureret og indrammet familiebillede',num_items:1,currency:'DKK'}; export const track=(...args)=>globalThis.__purchaseEvents.push(args);`,
});

test('browser Purchase preserves amount and deduplication ID while identifying each purchased product', () => {
  for (const [product, value, id] of [['digital', 99, 'digital'], ['print', 250, 'print'], ['framed', 599, '30x40']] as const) {
    events.length = 0;
    component.default({product, value, format:'30x40', eventId:'purchase-fixture'});
    assert.equal(events.length, 1);
    assert.equal(events[0][0], 'Purchase');
    assert.deepEqual(events[0][1].content_ids, [id]);
    assert.equal(events[0][1].value, value);
    assert.deepEqual(events[0][2], {serverLog:false, eventId:'purchase-fixture'});
  }
});
