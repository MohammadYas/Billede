// The whole customer path against a running site, the way the audience meets it.
//   node tests/live-journey.browser.mjs https://billedearv.dk <output-dir>
// Makes one real order and one real restoration; pays for nothing. Run it before switching ads on.
import { readFileSync } from 'node:fs';
import { webkit, devices } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY);
const [base, out] = process.argv.slice(2);

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { if (cond) { pass++; console.log('  OK   ', name, detail); } else { fail++; console.log('  FAIL ', name, detail); } };

const b = await webkit.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 700 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
p.on('console', (m) => { if (m.type() === 'error' && !/favicon|fbevents|facebook/i.test(m.text())) errors.push(m.text().slice(0, 120)); });
const bad = [];
p.on('response', (r) => { if (r.status() >= 400 && new URL(r.url()).host.includes('billedearv')) bad.push(`${r.status()} ${r.url().slice(-60)}`); });

console.log('\n== 1. Landing, arriving from an ad ==');
await p.goto(`${base}/?utm_source=pwtest&utm_medium=cpc&utm_campaign=fullcheck&utm_content=FINAL_COLD_04`, { waitUntil: 'networkidle' });
await p.waitForTimeout(2600);
ok('page title', (await p.title()).includes('Billedearv'));
ok('hero headline visible', await p.locator('.hero-copy h1').isVisible());
ok('primary CTA visible', await p.locator('.hero-cta .btn').first().isVisible());
ok('no-photo link on hero', (await p.locator('.hero-nophoto').count()) === 1);
ok('no horizontal overflow', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `scrollW ${await p.evaluate(() => document.documentElement.scrollWidth)}`);
const utmCookie = (await ctx.cookies()).find((c) => c.name === 'gf_utm');
ok('utm stored for attribution', Boolean(utmCookie) && decodeURIComponent(utmCookie.value).includes('FINAL_COLD_04'));

console.log('\n== 2. Launch offer in a phone viewport ==');
const dlg = p.locator('.offer-dialog');
if (await dlg.count()) {
  const btn = p.locator('.offer-text .btn');
  const box = await btn.boundingBox();
  ok('offer button inside the screen', Boolean(box) && box.y + box.height <= 700 + 1, box ? `bottom ${Math.round(box.y + box.height)} of 700` : 'no box');
  await p.locator('.offer-close').click();
  await p.waitForTimeout(600);
} else ok('offer dialog shown', false, '(campaign off?)');

console.log('\n== 3. Consent asked in time ==');
await p.evaluate(() => window.scrollTo(0, 300));
await p.waitForTimeout(2000);
ok('consent banner appears', (await p.locator('.consent').count()) === 1);
await p.locator('.consent button', { hasText: 'Ok' }).click();
await p.waitForTimeout(2500);
ok('pixel loads after consent', await p.evaluate(() => typeof window.fbq === 'function' && !!window.fbq.loaded));

console.log('\n== 4. Upload and restoration ==');
await p.evaluate(() => window.scrollTo(0, 0));
await p.locator('.hero-cta .btn').first().click();
await p.waitForSelector('.sheet', { timeout: 20000 });
await p.waitForTimeout(700);
await p.locator('.sheet input[type=file]').last().setInputFiles('public/examples/portraet-1962-after-1400.jpg');
await p.waitForTimeout(1500);
await p.locator('.sheet .btn').first().click();
const t0 = Date.now();
await p.waitForURL(/\/p\//, { timeout: 260000 });
const id = p.url().match(/\/p\/([0-9a-f-]{36})/)[1];
ok('preview produced', true, `${Math.round((Date.now() - t0) / 1000)} s, order ${id.slice(0, 8)}`);
await p.waitForTimeout(2000);

console.log('\n== 5. The preview page ==');
ok('opens on the restoration', await p.locator('.ba').evaluate((el) => el.style.getPropertyValue('--x') === '0%'));
ok('original is shown once the restoration has loaded', await p.locator('.ba img.before').evaluate((el) => getComputedStyle(el).visibility === 'visible'));
const sw = p.locator('.ba-switch button');
ok('Foer/Efter switch present', (await sw.count()) === 2);
await sw.first().click(); await p.waitForTimeout(1600);
ok('tapping Foer shows the original', await p.locator('.ba').evaluate((el) => el.style.getPropertyValue('--x') === '100%'));
await sw.last().click(); await p.waitForTimeout(1600);
ok('way on is visible', await p.locator('.pv-next').isVisible());

console.log('\n== 6. Colour ==');
const cbtn = p.locator('.pv-toggle button.btn').first();
if (await cbtn.count()) {
  const tap = Date.now();
  await cbtn.scrollIntoViewIfNeeded(); await cbtn.click();
  await p.waitForFunction(() => document.querySelector('.pv-toggle button.btn')?.textContent?.includes('sort-hvid'), null, { timeout: 150000 });
  ok('colour version appears', true, `${((Date.now() - tap) / 1000).toFixed(1)} s`);
  ok('receipt says i farver', (await p.locator('.bill-head p').innerText()).includes('i farver'));
  ok('framed picture follows the choice', (await p.locator('.pv-mock img.on').getAttribute('src')).includes('c=farve'));
  await cbtn.click(); await p.waitForTimeout(900);
} else ok('colour button (monochrome picture)', false, 'not offered');

console.log('\n== 7. Size, frame and price ==');
const cards = p.locator('.sizes-row .size');
await cards.nth(2).scrollIntoViewIfNeeded(); await cards.nth(2).click(); await p.waitForTimeout(1600);
const wall50 = await p.locator('.pv-mock img.on').getAttribute('src');
ok('size changes the wall shot', wall50.includes('50x70'), wall50.match(/f=[^&]+/)?.[0]);
await p.locator('.frames-row .frame').nth(1).click(); await p.waitForTimeout(1600);
ok('frame changes the wall shot', (await p.locator('.pv-mock img.on').getAttribute('src')).includes('fr=eg'));
ok('price follows the size', (await p.locator('.pv-cta-bar .btn').first().innerText()).includes('999'));
await cards.nth(0).click(); await p.waitForTimeout(700);

console.log('\n== 8. Checkout opens (nothing is paid) ==');
const co = await p.evaluate(async (oid) => { const r = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: oid, colour: false, format: '30x40', frame: 'sort', extraPrints: 0 }) }); const j = await r.json().catch(() => ({})); return { status: r.status, url: j.url || '' }; }, id);
ok('checkout session created', co.status === 200 && co.url.startsWith('https://checkout.stripe.com'));
console.log('\n== 9. Errors seen along the way ==');
ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
ok('no failed requests', bad.length === 0, bad.slice(0, 3).join(' | '));

console.log('\n== 10. What the owner sees ==');
const { data: o } = await sb.from('orders').select('status, utm, is_monochrome, colourised_path, preview_meta').eq('id', id).single();
ok('order recorded with the ad name', o.utm?.utm_content === 'FINAL_COLD_04');
ok('consent stored on the order', o.preview_meta?.consent === 'yes');
ok('colour version kept', Boolean(o.colourised_path));

await p.screenshot({ path: `${out}/fullcheck-final.png` });
await b.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
