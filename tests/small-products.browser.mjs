// The two small products — the loose 20×30 print (250 kr.) and the file alone (99 kr.) — end to end.
//
//   BASE=http://localhost:3000 node tests/small-products.browser.mjs <order-id>
//
// Reuses a preview an earlier run produced, so it costs no restoration. It creates two real Checkout
// sessions (free; a session is not a payment), reads each back from Stripe to prove what is charged
// and whether an address is asked for, expires them, and puts the order back on the framed parcel.
//
// The refusal path — a browser asking for a product whose offer is off — is covered without a server
// in tests/product.test.mts, because it must hold whatever the environment says.
import { readFileSync } from 'node:fs';
import { webkit, devices } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY);
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const base = process.env.BASE || 'http://localhost:3000';
const PRINT_DKK = Number(env.NEXT_PUBLIC_PRINT_PRICE_DKK || 0);
const DIGITAL_DKK = Number(env.NEXT_PUBLIC_DIGITAL_PRICE_DKK || 0);
const orderId = process.argv[2];
if (!orderId) { console.error('usage: node tests/small-products.browser.mjs <order-id>'); process.exit(2); }
if (!PRINT_DKK || !DIGITAL_DKK) { console.error('both small offers must be on in .env.local for this run'); process.exit(2); }

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { if (cond) { pass++; console.log('  OK   ', name, detail); } else { fail++; console.log('  FAIL ', name, detail); } };

const { data: order } = await sb.from('orders').select('id, status, format, preview_meta').eq('id', orderId).single();
if (!order) { console.error('no such order'); process.exit(2); }
// the resting state this fixture is put back into. Normalised to the framed parcel on purpose: an order
// is only ever a small product because a customer chose it, and a crashed run must not leave one behind.
const before = { format: order.format, meta: { ...order.preview_meta, product: 'framed' } };
const token = order.preview_meta?.share_token;
if (!token) { console.error('order has no share token'); process.exit(2); }
await sb.from('orders').update({ preview_meta: before.meta }).eq('id', orderId);

const b = await webkit.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 780 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));

const url = `${base}/p/${orderId}?t=${encodeURIComponent(token)}&utm_source=pwtest`;
const open = async () => { await p.goto(url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500); };
const choose = async (label) => { await p.locator('label.product', { hasText: label }).click(); await p.waitForTimeout(1500); };
const buy = async () => {
  // on a phone the button lives in the bar that slides in once the picture has been scrolled past
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(1200);
  const btn = p.locator('.pv-cta-bar.on .btn').first();
  await btn.waitFor({ state: 'visible', timeout: 15000 });
  const label = await btn.innerText();
  await btn.click();
  await p.waitForURL(/checkout\.stripe\.com/, { timeout: 40000 }).catch(() => {});
  const { data: row } = await sb.from('orders').select('payment_session_id, amount, preview_meta').eq('id', orderId).single();
  const session = await stripe.checkout.sessions.retrieve(row.payment_session_id);
  try { await stripe.checkout.sessions.expire(row.payment_session_id); } catch { /* already gone */ }
  return { label, row, session };
};

console.log('\n== 1. Three products, the framed parcel first ==');
await open();
const options = p.locator('input[name="produkt"]');
ok('three products offered', (await options.count()) === 3, `${await options.count()}`);
ok('the framed parcel is the one already selected', await options.first().isChecked());
ok('the size picker is on the page while framed', (await p.locator('.sizes-row').count()) === 1);
const prices = await p.locator('.products-row .product-price').allInnerTexts();
ok('each option carries its own price on its own line', prices.length === 3 && prices.join(' ').includes('599') && prices.join(' ').includes(String(PRINT_DKK)) && prices.join(' ').includes(String(DIGITAL_DKK)), prices.join(' · '));
ok('no tabular full stop floating away from the kr.', !prices.join(' ').includes('kr .'), prices.join(' · '));
ok('every option shows the object it is', (await p.locator('.products-row .product-thumb img').count()) === 3);
const rows = await p.locator('.products-row .product').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
ok('each option is a comfortable tap target', rows.every((h) => h >= 60), rows.join(', ') + ' px');
ok('the selected option is marked, not only outlined', (await p.locator('.products-row .product.is-on .pick-dot').count()) === 1);
ok('the framed parcel is marked as the recommendation', (await p.locator('.products-row .product .tag').first().innerText()).length > 0);

console.log('\n== 2. The file alone ==');
await choose('Kun billedet på skærmen');
ok('size picker gone', (await p.locator('.sizes-row').count()) === 0);
ok('frame picker gone', (await p.locator('.frames-row input[name="ramme"]').count()) === 0);
ok('extra-copy step gone', (await p.locator('.extra-add, .stepper').count()) === 0);
ok('no wall mockup is pushed', (await p.locator('.pv-mock').count()) === 0);
let bill = await p.locator('.bill').innerText();
ok('the bill is one line, the file', /digital fil/i.test(bill));
ok('no shipping line on a file', !/Fragt og indpakning/.test(bill));
ok('delivery says download after approval', /Download efter din godkendelse/.test(bill));
ok('the total is the digital price', bill.includes(`${DIGITAL_DKK} kr.`));
let after = await p.locator('.pv-after').innerText();
ok('the path promises no parcel', /Intet bliver sendt med posten/.test(after));
ok('it does not promise an instant download', /Efter dit ja/.test(after));

console.log('\n== 3. The choice survives a reload ==');
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
ok('still on the file', await p.locator('input[name="produkt"][value="digital"]').isChecked());
ok(`still ${DIGITAL_DKK} kr.`, (await p.locator('.bill-total').innerText()).includes(String(DIGITAL_DKK)));
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(1200);
ok('the order bar is reachable on the short page', await p.locator('.pv-cta-bar.on .btn').first().isVisible());

console.log('\n== 4. Paying for the file asks for no address ==');
const dig = await buy();
ok('the button said what it buys and what it costs', /digitale fil/i.test(dig.label) && dig.label.includes(String(DIGITAL_DKK)), dig.label.replace(/\s+/g, ' '));
ok('reaches the payment page', /checkout\.stripe\.com/.test(p.url()));
ok('the order is stored as digital', dig.row?.preview_meta?.product === 'digital');
ok('the amount is the digital price', dig.row?.amount === DIGITAL_DKK * 100, String(dig.row?.amount));
ok('Stripe was not asked for a delivery address', !dig.session.shipping_address_collection, JSON.stringify(dig.session.shipping_address_collection ?? null));
ok('Stripe charges the digital price', dig.session.amount_total === DIGITAL_DKK * 100, String(dig.session.amount_total));
ok('the product rides on the session', dig.session.metadata?.product === 'digital');
ok('the terms text drops the print sentence', !/printet fremstilles specielt/.test(dig.session.custom_text?.terms_of_service_acceptance?.message ?? ''));

console.log('\n== 5. The loose print ==');
await open();
await choose('Print uden ramme');
bill = await p.locator('.bill').innerText();
ok('the bill is one line, the print', /print 20×30 cm/i.test(bill), bill.split('\n').find((l) => /print/i.test(l)) ?? '');
ok('a print is posted, so shipping is on the bill', /Fragt og indpakning/.test(bill));
ok('the total is the print price', bill.includes(`${PRINT_DKK} kr.`));
ok('no frame picker for a loose print', (await p.locator('.frames-row input[name="ramme"]').count()) === 0);
ok('no size picker for a loose print', (await p.locator('.sizes-row').count()) === 0);
ok('no wall mockup for a loose print', (await p.locator('.pv-mock').count()) === 0);
ok('the print is shown as a print', (await p.locator('.pv-print .print img').count()) === 1);
const spec = await p.locator('.spec-rows.is-open').innerText();
ok('the spec says there is no frame', /Ingen – printet er løst/.test(spec));
after = await p.locator('.pv-after').innerText();
ok('the path says it is posted flat, not framed', /fladt mellem pap/.test(after) && !/indrammer/.test(after));

console.log('\n== 6. Paying for the print does ask for an address ==');
const pr = await buy();
ok('the button said what it buys and what it costs', /Bestil mit print/.test(pr.label) && pr.label.includes(String(PRINT_DKK)), pr.label.replace(/\s+/g, ' '));
ok('the order is stored as a print', pr.row?.preview_meta?.product === 'print');
ok('the amount is the print price', pr.row?.amount === PRINT_DKK * 100, String(pr.row?.amount));
ok('Stripe IS asked for a delivery address', Boolean(pr.session.shipping_address_collection), JSON.stringify(pr.session.shipping_address_collection ?? null));
ok('Stripe charges the print price', pr.session.amount_total === PRINT_DKK * 100, String(pr.session.amount_total));
ok('the product rides on the session', pr.session.metadata?.product === 'print');
ok('the terms text keeps the print sentence', /printet fremstilles specielt/.test(pr.session.custom_text?.terms_of_service_acceptance?.message ?? ''));

console.log('\n== 7. Switching back to the framed parcel ==');
// reopening shows the print, because a customer's choice is meant to survive: switch back explicitly
await open();
ok('the print choice survived leaving for payment and coming back', await p.locator('input[name="produkt"][value="print"]').isChecked());
await choose('I ramme, hjem til dig');
ok('size picker is back', (await p.locator('.sizes-row .size').count()) === 3);
ok('frame picker is back', (await p.locator('.frames-row input[name="ramme"]').count()) === 2);
ok('the wall mockup is back', (await p.locator('.pv-mock').count()) === 1);
const framedTotal = await p.locator('.bill-total').innerText();
ok('and the framed price is back', /599|799|999/.test(framedTotal), framedTotal.replace(/\s+/g, ' '));
ok('no page errors anywhere', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log('\n== 8. Putting the order back as it was found ==');
await sb.from('orders').update({ format: before.format, amount: null, payment_session_id: null, preview_meta: before.meta }).eq('id', orderId);
const { data: restored } = await sb.from('orders').select('format, preview_meta').eq('id', orderId).single();
ok('order restored to the framed product', (restored?.preview_meta?.product ?? 'framed') === 'framed', String(restored?.preview_meta?.product));
ok('order restored to its size', restored?.format === before.format);

await b.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
