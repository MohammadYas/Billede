// The delivery half of the two small products: what a customer meets after they have paid.
//
//   BASE=http://localhost:3000 node tests/delivery.browser.mjs <order-id>
//
// Somebody can now pay 99 kr. for a file. If approval → download is broken for a product with no
// print, we take the money and deliver nothing — so this drives the approval page and the download
// for `digital` and `print` and puts the order back exactly as it was found.
//
// It pays for nothing and sends no customer mail: the order is moved through the state machine
// directly, `final_path` points at the restoration already in storage (so no second model call), and
// these fixtures carry no customer_email, so the only mail any of this can produce is the owner's own
// "Godkendt" notification to hej@billedearv.dk.
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { webkit, devices } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY);
const base = process.env.BASE || 'http://localhost:3000';
const orderId = process.argv[2];
if (!orderId) { console.error('usage: node tests/delivery.browser.mjs <order-id>'); process.exit(2); }

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { if (cond) { pass++; console.log('  OK   ', name, detail); } else { fail++; console.log('  FAIL ', name, detail); } };

const COLUMNS = 'id, status, approval_status, approval_token, final_path, restored_path, amount, customer_email, preview_meta';
const { data: original } = await sb.from('orders').select(COLUMNS).eq('id', orderId).single();
if (!original) { console.error('no such order'); process.exit(2); }
if (!original.restored_path) { console.error('order has no restoration to stand in for the final file'); process.exit(2); }
if (original.customer_email) { console.error('refusing: this order has a customer e-mail on it, so it is not a fixture'); process.exit(2); }

const restore = async () => sb.from('orders').update({
  status: original.status, approval_status: original.approval_status, approval_token: original.approval_token,
  final_path: original.final_path, amount: original.amount,
  preview_meta: { ...original.preview_meta, product: 'framed' },
}).eq('id', orderId);

const b = await webkit.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 780 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));

/** Put the order where the approval mail would have left it, without sending an approval mail. */
const arm = async (product, amountOere) => {
  const token = randomBytes(24).toString('base64url');
  await sb.from('orders').update({
    status: 'AWAITING_APPROVAL', approval_status: 'SENT', approval_token: token,
    final_path: original.restored_path, amount: amountOere,
    preview_meta: { ...original.preview_meta, product },
  }).eq('id', orderId);
  return token;
};

for (const [product, amountOere, label] of [['digital', 9900, 'den digitale fil'], ['print', 25000, 'det løse print']]) {
  console.log(`\n== ${label} ==`);
  const token = await arm(product, amountOere);

  await p.goto(`${base}/godkend/${token}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  const before = await p.locator('main').innerText();
  ok('the approval page opens on "Ligner det?"', /Ligner det/.test(before), before.split('\n')[0]);
  if (product === 'digital') {
    ok('it says a file, not a print', /den fil, du får/i.test(before), before.replace(/\s+/g, ' ').slice(0, 110));
    ok('it never promises to frame or post anything', !/indrammer|sender det/.test(before));
    ok('it says the download is immediate after the yes', /download med det samme/i.test(before));
  } else {
    ok('it says the print is posted flat', /fladt mellem pap/.test(before), before.replace(/\s+/g, ' ').slice(0, 110));
    ok('it never says the word framed', !/indrammer/.test(before));
  }
  ok('both doors are on the page', (await p.locator('form button, a.btn').count()) >= 2);

  await p.locator('form button').first().click();
  await p.waitForTimeout(2500);
  const after = await p.locator('main').innerText();
  if (product === 'digital') {
    ok('the yes lands on "filen er din"', /Filen er din/i.test(after), after.split('\n')[0]);
    ok('and says nothing is being posted', /ikke printet eller sendt|bliver ikke printet|der bliver ikke/i.test(after) || /Hent den herunder/.test(after), after.replace(/\s+/g, ' ').slice(0, 140));
  } else {
    ok('the yes lands on "vi printer og sender"', /printer og sender|billede er sendt/i.test(after), after.split('\n')[0]);
  }

  const { data: row } = await sb.from('orders').select('status, approval_status').eq('id', orderId).single();
  ok('the order is APPROVED', row?.status === 'APPROVED' && row?.approval_status === 'APPROVED', `${row?.status} / ${row?.approval_status}`);

  const link = p.locator('a.btn', { hasText: 'Hent din fil' });
  ok('the download button is on the page', (await link.count()) === 1);
  // follow it the way a customer would: the route 302s to a short-lived signed URL
  const res = await ctx.request.get(`${base}/godkend/${token}/fil`, { maxRedirects: 5 });
  ok('the file actually downloads', res.status() === 200, `HTTP ${res.status()}`);
  const type = res.headers()['content-type'] ?? '';
  ok('and it is an image, not an error page', /image\//.test(type), type);
  const bytes = (await res.body()).length;
  ok('and it is not empty', bytes > 50_000, `${Math.round(bytes / 1024)} kB`);
}

console.log('\n== Clean-up ==');
ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await restore();
const { data: back } = await sb.from('orders').select(COLUMNS).eq('id', orderId).single();
ok('order put back to its old status', back?.status === original.status, `${back?.status}`);
ok('order put back to the framed product', (back?.preview_meta?.product ?? 'framed') === 'framed');
ok('no stray final file left on it', back?.final_path === original.final_path);

await b.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
