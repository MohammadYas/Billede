/**
 * The funnel: which steps we report on, how a step is counted, and what stops a reload from
 * looking like a new customer.
 *
 *   npm test
 *
 * Two rules are asserted here because both were broken in the live data before this file existed:
 * a step is counted in distinct sessions (a customer who reloads four times is one customer), and
 * "the picture was generated" and "the customer saw the picture" are two different steps.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FUNNEL_STEPS, funnel, claimOnce, viewKind, REOPEN_AFTER_MS } from '../lib/analytics/funnel';

const ev = (name: string, session: string | null) => ({ name, session_id: session });

test('generation finished and result seen are separate steps, in that order', () => {
  const i = (s: string) => FUNNEL_STEPS.indexOf(s as never);
  assert.ok(i('PreviewShown') >= 0 && i('PreviewViewed') >= 0);
  assert.ok(i('PreviewShown') < i('PreviewViewed'), 'the picture is made before it can be looked at');
  assert.ok(i('PreviewViewed') < i('ProductSelected'));
  assert.ok(i('ProductSelected') < i('CheckoutClicked'));
  assert.ok(i('CheckoutClicked') < i('InitiateCheckout'), 'a click comes before the session it creates');
  assert.ok(i('InitiateCheckout') < i('Purchase'));
});

test('a step counts sessions, not events: four reloads are one customer', () => {
  const rows = funnel([
    ev('PageView', 's1'), ev('PageView', 's1'), ev('PageView', 's1'), ev('PageView', 's1'),
    ev('PageView', 's2'),
    ev('PreviewShown', 's1'), ev('PreviewShown', 's1'),
    ev('PreviewViewed', 's1'),
  ]);
  const by = Object.fromEntries(rows.map((r) => [r.step, r.sessions]));
  assert.equal(by.PageView, 2);
  assert.equal(by.PreviewShown, 1);
  assert.equal(by.PreviewViewed, 1);
});

test('an event with no session is not a customer', () => {
  const rows = funnel([ev('PageView', null), ev('PageView', ''), ev('PageView', 's1')]);
  assert.equal(rows.find((r) => r.step === 'PageView')!.sessions, 1);
});

test('the report says where they fall off', () => {
  const all = ['a', 'b', 'c', 'd'];
  const rows = funnel([
    ...all.map((s) => ev('PageView', s)),
    ...all.map((s) => ev('FlowOpened', s)),
    ...all.map((s) => ev('UploadStarted', s)),
    ...all.map((s) => ev('ProcessingStarted', s)),
    ...['a', 'b'].map((s) => ev('PreviewShown', s)),
    ev('PreviewViewed', 'a'),
  ]);
  const shown = rows.find((r) => r.step === 'PreviewShown')!;
  const viewed = rows.find((r) => r.step === 'PreviewViewed')!;
  assert.equal(shown.lost, 2, 'two of four never got a picture');
  assert.equal(viewed.lost, 1, 'one of the two who got one never looked at it');
  // steps nobody reached are still rows, so a hole in the funnel is visible rather than absent
  assert.equal(rows.length, FUNNEL_STEPS.length);
  assert.equal(rows.find((r) => r.step === 'Purchase')!.sessions, 0);
});

test('events we do not report on cannot bend the funnel', () => {
  const rows = funnel([ev('Noget', 's1'), ev('PageView', 's1')]);
  assert.equal(rows.find((r) => r.step === 'PageView')!.sessions, 1);
  assert.equal(rows.reduce((n, r) => n + r.sessions, 0), 1);
});

test('claimOnce is true once per key and never throws on a blocked store', () => {
  const mem = new Map<string, string>();
  const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
  assert.equal(claimOnce(store, 'gf_seen:order-1'), true);
  assert.equal(claimOnce(store, 'gf_seen:order-1'), false);
  assert.equal(claimOnce(store, 'gf_seen:order-2'), true);
  // private mode: reading or writing throws. An unmeasurable visit must still be a working visit.
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(claimOnce(broken, 'k'), true, 'a blocked store still lets the event fire, once');
  assert.equal(claimOnce(null, 'k'), true);
});

test('a reload is the same look at the picture; a return half an hour later is a new one', () => {
  const mem = new Map<string, string>();
  const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
  const key = 'gf_viewed:order-1';
  const t0 = 1_700_000_000_000;
  assert.equal(viewKind(store, key, t0), 'first');
  assert.equal(viewKind(store, key, t0 + 2_000), 'same', 'a reload two seconds later is not a second customer');
  assert.equal(viewKind(store, key, t0 + REOPEN_AFTER_MS - 1), 'same');
  assert.equal(viewKind(store, key, t0 + REOPEN_AFTER_MS), 'again', 'they came back to it');
  // and the clock restarts from the return, so the next reload is quiet again
  assert.equal(viewKind(store, key, t0 + REOPEN_AFTER_MS + 1_000), 'same');
  // a browser that refuses storage still reports the view, once per page load
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(viewKind(broken, key), 'first');
  assert.equal(viewKind(null, key), 'first');
});

/* ---------------------------------------------------------------------------
 * What is allowed to be stored from a browser event.
 *
 * /api/track is a public endpoint: anything a page can send, anyone can send. The allow-list is the
 * whole defence, so it is asserted from both directions — the things the funnel needs must survive
 * it, and everything else must not, whatever shape it arrives in.
 * ------------------------------------------------------------------------- */
test('the product survives into the event log, so the funnel can tell the three apart', async () => {
  const { clientMetadata } = await import('../lib/analytics/client-metadata');
  for (const product of ['framed', 'print', 'digital']) {
    assert.equal(clientMetadata({ content_name: product })?.content_name, product, product);
  }
  assert.deepEqual(clientMetadata({ content_ids: ['digital'] })?.content_ids, ['digital']);
  assert.deepEqual(clientMetadata({ content_ids: ['50x70'] })?.content_ids, ['50x70']);
  // the older names still pass, because events already in the table were written with them
  assert.equal(clientMetadata({ content_name: 'preview' })?.content_name, 'preview');
  assert.equal(clientMetadata({ content_name: 'ekstra_eksemplar' })?.content_name, 'ekstra_eksemplar');
});

test('nothing else a browser can send is ever stored', async () => {
  const { clientMetadata } = await import('../lib/analytics/client-metadata');
  const junk = {
    // the two things that must never reach the events table
    t: 'sYqW3n2k9Lp4Rt7xVb1c',                       // a share token
    token: 'sYqW3n2k9Lp4Rt7xVb1c',
    image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', // image content
    src: 'https://example.test/api/preview/x/image?t=secret',
    // and the ordinary ways a field grows legs
    email: 'kirsten@example.dk',
    content_name: 'framed"; drop table events; --',
    content_ids: ['50x70', 'noget-andet', 42, null],
    value: -1, bytes: 99 * 1024 * 1024, num_items: 999,
    cta: 'Z', currency: 'USD', type: 'application/pdf',
  };
  const out = clientMetadata(junk) ?? {};
  assert.deepEqual(Object.keys(out).sort(), ['content_ids'], JSON.stringify(out));
  assert.deepEqual(out.content_ids, ['50x70'], 'only the ids we recognise, and the rest dropped');
  for (const bad of [null, undefined, 'a string', 42, [], [{ t: 'x' }]]) {
    assert.equal(clientMetadata(bad), undefined, JSON.stringify(bad));
  }
});
