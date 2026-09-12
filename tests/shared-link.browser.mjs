// Who can open a preview, and from where.
//
//   BASE=http://localhost:3000 node tests/shared-link.browser.mjs <order-id>
//
// A preview is private to the browser that made it — until the customer asks us to mail the link,
// which is the whole point of "Gem dit preview" and of showing it to a sister on another phone. That
// makes the share token the only thing standing between a private family photograph and anyone who
// can guess a UUID, so both halves are asserted here: the token opens it anywhere, and nothing else
// opens it at all.
//
// Sends no mail and changes nothing: every request is a read, from browser contexts with no cookies.
import { readFileSync } from 'node:fs';
import { webkit, devices } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY);
const base = process.env.BASE || 'http://localhost:3000';
const orderId = process.argv[2];
if (!orderId) { console.error('usage: node tests/shared-link.browser.mjs <order-id>'); process.exit(2); }

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { if (cond) { pass++; console.log('  OK   ', name, detail); } else { fail++; console.log('  FAIL ', name, detail); } };

const { data: order } = await sb.from('orders').select('preview_meta').eq('id', orderId).single();
if (!order?.preview_meta?.share_token) { console.error('order has no share token'); process.exit(2); }
const token = order.preview_meta.share_token;
const sid = order.preview_meta.session_id;

const b = await webkit.launch();
/** A different phone: a brand-new context, so nothing from the upload's browser comes with it. */
const elsewhere = async () => (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 780 } })).newPage();

console.log('\n== 1. The saved link opens on another device ==');
let p = await elsewhere();
const res = await p.goto(`${base}/p/${orderId}?t=${encodeURIComponent(token)}&utm_source=pwtest`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
ok('the page is served', res.status() === 200, `HTTP ${res.status()}`);
ok('and it is the picture, not a not-found page', (await p.locator('.ba img.after').count()) === 1);
ok('the buy button is there too, so the link is usable and not just readable', (await p.locator('.pv-cta-bar .btn, .pv-desktop-cta .btn').count()) > 0);
// the images behind it are gated the same way, or the page would be a frame around 404s
const img = await p.locator('.ba img.after').getAttribute('src');
ok('the image URL carries the token', String(img).includes('t='), String(img).slice(0, 60));
const imgRes = await p.request.get(new URL(String(img), base).toString());
ok('and the image itself is served', imgRes.status() === 200 && /image\//.test(imgRes.headers()['content-type'] ?? ''), `HTTP ${imgRes.status()}`);

console.log('\n== 2. Without the token it is nobody else\'s picture ==');
p = await elsewhere();
const noToken = await p.goto(`${base}/p/${orderId}?utm_source=pwtest`, { waitUntil: 'domcontentloaded' });
ok('a stranger who knows the id gets nothing', noToken.status() === 404, `HTTP ${noToken.status()}`);
for (const bad of ['wrong', token.slice(0, -1), `${token}x`, '', 'null', '../admin']) {
  const r = await p.request.get(`${base}/p/${orderId}?t=${encodeURIComponent(bad)}`);
  ok(`a wrong token is refused (${JSON.stringify(bad).slice(0, 14)})`, r.status() === 404, `HTTP ${r.status()}`);
}
const imgNoToken = await p.request.get(`${base}/api/preview/${orderId}/image?kind=preview`);
ok('and the image route is closed too', imgNoToken.status() === 404 || imgNoToken.status() === 403, `HTTP ${imgNoToken.status()}`);

console.log('\n== 3. The session that made it still gets in without a token ==');
const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 780 } });
await ctx.addCookies([{ name: 'gf_sid', value: sid, url: base }]);
p = await ctx.newPage();
const own = await p.goto(`${base}/p/${orderId}?utm_source=pwtest`, { waitUntil: 'domcontentloaded' });
ok('the browser that uploaded it needs no link', own.status() === 200, `HTTP ${own.status()}`);

console.log('\n== 4. Saving the link refuses what it should, without sending anything ==');
p = await elsewhere();
for (const [label, email, expected] of [
  ['an address that is not one', 'ikke-en-mail', 400],
  ['an empty address', '', 400],
  ['a 300-character address', `${'a'.repeat(290)}@b.dk`, 400],
]) {
  const r = await p.request.post(`${base}/api/preview/${orderId}/save?t=${encodeURIComponent(token)}`, { data: { email } });
  ok(`${label} is refused`, r.status() === expected, `HTTP ${r.status()}`);
}
// …and a stranger cannot post the customer's preview to their own inbox
const stranger = await p.request.post(`${base}/api/preview/${orderId}/save`, { data: { email: 'tyv@example.test' } });
ok('a stranger cannot mail somebody else\'s preview to themselves', stranger.status() === 404, `HTTP ${stranger.status()}`);

await b.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
