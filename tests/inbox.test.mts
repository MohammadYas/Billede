import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { load } from './_bundle.mts';

// The Resend webhook signature (Svix): a forged or stale call must not reach the inbox.
const svix = await load('lib/webhooks/svix.ts', {});
const secretRaw = Buffer.from('synthetic-webhook-secret-32-bytes-long!!').toString('base64');
const secret = `whsec_${secretRaw}`;
const sign = (id: string, ts: string, body: string) => createHmac('sha256', Buffer.from(secretRaw, 'base64')).update(`${id}.${ts}.${body}`).digest('base64');

test('a correctly signed, fresh webhook verifies', () => {
  const now = Date.now();
  const ts = String(Math.floor(now / 1000));
  const body = '{"type":"email.received","data":{"email_id":"abc"}}';
  assert.equal(svix.verifySvix(secret, { id: 'msg_1', timestamp: ts, signature: `v1,${sign('msg_1', ts, body)}` }, body, now), true);
  // several signatures in the header (key rotation): any valid one is enough
  assert.equal(svix.verifySvix(secret, { id: 'msg_1', timestamp: ts, signature: `v1,AAAA v1,${sign('msg_1', ts, body)}` }, body, now), true);
});

test('tampered body, wrong secret, old timestamp and missing headers are refused', () => {
  const now = Date.now();
  const ts = String(Math.floor(now / 1000));
  const body = '{"type":"email.received","data":{"email_id":"abc"}}';
  const sig = `v1,${sign('msg_1', ts, body)}`;
  assert.equal(svix.verifySvix(secret, { id: 'msg_1', timestamp: ts, signature: sig }, body + ' ', now), false);
  assert.equal(svix.verifySvix('whsec_' + Buffer.from('other').toString('base64'), { id: 'msg_1', timestamp: ts, signature: sig }, body, now), false);
  assert.equal(svix.verifySvix(secret, { id: 'msg_1', timestamp: String(Math.floor(now / 1000) - 600), signature: sig }, body, now), false);
  assert.equal(svix.verifySvix(secret, { id: null, timestamp: ts, signature: sig }, body, now), false);
  assert.equal(svix.verifySvix('', { id: 'msg_1', timestamp: ts, signature: sig }, body, now), false);
});
