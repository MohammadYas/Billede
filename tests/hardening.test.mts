import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_bundle.mts';

// The per-network cap and the HEIC size gate: small functions, but they are what stands between a script and the image-model bill.
const client = await load('lib/api/client.ts', { '@/lib/db/supabase': 'export const supabaseAdmin = () => { throw new Error("no db in test"); };' });
const utils = await load('lib/restoration/image-utils.ts', {
  sharp: 'export default function sharp() { throw new Error("no sharp in test"); }',
  'heic-convert': 'export default async function convert() { throw new Error("must not decode"); }',
});
const jobs = await load('lib/jobs.ts', {
  '@/lib/db/orders': 'export const getOrder = async () => null; export const updateOrder = async () => {};',
  '@/lib/config': "export const CONFIG = { siteUrl: 'http://localhost:3000' };",
  '@/lib/retention': 'export const runRetention = async () => ({});',
  '@/lib/reconcile': 'export const reconcilePayments = async () => ({});',
  '@/lib/preview-service': 'export const processRestore = async () => {}; export const processColour = async () => {}; export const processFinal = async () => {};',
});

test('client IP: Netlify header wins, else the last x-forwarded-for entry (the one our proxy appended)', () => {
  assert.equal(client.clientIp(new Headers({ 'x-nf-client-connection-ip': '203.0.113.9', 'x-forwarded-for': '1.1.1.1, 203.0.113.9' })), '203.0.113.9');
  assert.equal(client.clientIp(new Headers({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' })), '203.0.113.9');
  assert.equal(client.clientIp(new Headers()), null);
  const key = client.clientKey(new Headers({ 'x-forwarded-for': '203.0.113.9' }));
  assert.match(key, /^[A-Za-z0-9_-]{24}$/);
  assert.notEqual(key, '203.0.113.9');
});

test('client cap fails open without a database', async () => {
  assert.equal(await client.tooManyOrders('abc', { max: 1, windowMs: 1000 }), false);
  assert.equal(await client.tooManyOrders(null, { max: 1, windowMs: 1000 }), false);
});

const heif = (w: number, h: number) => {
  // ftyp box, then a minimal ispe box: size, 'ispe', version/flags, width, height
  const ftyp = Buffer.concat([Buffer.from([0, 0, 0, 16]), Buffer.from('ftypheic', 'ascii'), Buffer.from([0, 0, 0, 0])]);
  const ispe = Buffer.alloc(20);
  ispe.writeUInt32BE(20, 0); ispe.write('ispe', 4, 'ascii'); ispe.writeUInt32BE(0, 8); ispe.writeUInt32BE(w, 12); ispe.writeUInt32BE(h, 16);
  return Buffer.concat([ftyp, ispe]);
};

test('HEIC: the declared size is read from the header, and an oversized frame is refused before decoding', async () => {
  assert.deepEqual(utils.heicDimensions(heif(4032, 3024)), { width: 4032, height: 3024 });
  assert.equal(utils.heicDimensions(Buffer.from('not a heif file at all')), null);
  await assert.rejects(utils.heicToJpeg(heif(20000, 20000)), /unsupported_image/);
});

test('shared secrets: constant-time match, unequal length or empty never matches', () => {
  assert.equal(jobs.secretMatches('Bearer abc', 'Bearer abc'), true);
  assert.equal(jobs.secretMatches('Bearer abd', 'Bearer abc'), false);
  assert.equal(jobs.secretMatches('Bearer ab', 'Bearer abc'), false);
  assert.equal(jobs.secretMatches(null, 'x'), false);
  assert.equal(jobs.secretMatches('x', ''), false);
});
