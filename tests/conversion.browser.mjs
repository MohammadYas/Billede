// The conversion round of 2026-09-12, driven the way the audience meets it: WebKit, iPhone 13, 390×780.
//
//   BASE=http://localhost:3000 node tests/conversion.browser.mjs [output-dir]
//
// Makes one real order and one real restoration and pays for nothing. It also reads the events table
// afterwards, because half of what changed is measurement and a page that looks right while logging
// nothing is exactly the failure this round is about.
//
// Every visit is tagged ?utm_source=pwtest so admin filters it out of the real funnel.
import { readFileSync, mkdirSync } from 'node:fs';
import { webkit, devices } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY);
const base = process.env.BASE || 'http://localhost:3000';
const out = process.argv[2] || 'work/conversion';
mkdirSync(out, { recursive: true });

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { if (cond) { pass++; console.log('  OK   ', name, detail); } else { fail++; console.log('  FAIL ', name, detail); } };
const utm = 'utm_source=pwtest&utm_medium=cpc&utm_campaign=konvertering-sep12&utm_content=CONVERSION_ROUND';

const b = await webkit.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 780 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
p.on('console', (m) => { if (m.type() === 'error' && !/favicon|fbevents|facebook|Failed to load resource/i.test(m.text())) errors.push(m.text().slice(0, 140)); });
const bad = [];
p.on('response', (r) => { const u = new URL(r.url()); if (r.status() >= 400 && (u.hostname === 'localhost' || u.host.includes('billedearv'))) bad.push(`${r.status()} ${r.url().slice(-70)}`); });

console.log('\n== 1. The landing page does not interrupt ==');
await p.goto(`${base}/?${utm}`, { waitUntil: 'domcontentloaded' });
// the old dialog opened 1,8 s after paint; wait well past that before saying it does not
await p.waitForTimeout(4000);
ok('no dialog opens by itself', (await p.locator('dialog[open]').count()) === 0);
ok('the offer is still on the page as content', (await p.locator('.announce').count()) === 1 || (await p.locator('.promo').count()) > 0);
ok('primary CTA visible', await p.locator('.hero-cta .btn').first().isVisible());
ok('no horizontal overflow', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
const exNote = await p.locator('.ex-note').innerText().catch(() => '');
ok('examples are described as real photographs', /ægte gamle fotografier/.test(exNote), exNote.slice(0, 60));
ok('no claim that the originals were made up', !/fremstillet til at vise/.test(exNote));

console.log('\n== 2. Legal pages carry no blanket draft stamp ==');
for (const path of ['/handelsbetingelser', '/privatliv']) {
  await p.goto(`${base}${path}?${utm}`, { waitUntil: 'domcontentloaded' });
  const head = await p.locator('.ed-head .caption').innerText();
  ok(`${path}: no "Udkast – gennemgås af advokat"`, !/advokat/i.test(head), head.slice(0, 110));
  ok(`${path}: says when it was updated`, /Opdateret/.test(head));
}
const terms = await p.goto(`${base}/handelsbetingelser`).then(() => p.locator('.legal').innerText());
ok('terms explain that the final file is made anew in print quality', /trykkvalitet/.test(terms));
ok('terms cover the case where we cannot restore the photo', /ikke kan lave et resultat/i.test(terms));

console.log('\n== 3. Upload and restoration ==');
await p.goto(`${base}/?${utm}`, { waitUntil: 'domcontentloaded' });
await p.locator('.hero-cta .btn').first().click();
await p.waitForSelector('.sheet', { timeout: 20000 });
await p.waitForTimeout(600);
await p.locator('.sheet input[type=file]').last().setInputFiles('public/examples/portraet-1962-after-1400.jpg');
await p.waitForTimeout(1200);
await p.locator('.sheet .btn').first().click();
const t0 = Date.now();
await p.waitForURL(/\/p\//, { timeout: 280000 });
const id = p.url().match(/\/p\/([0-9a-f-]{36})/)[1];
ok('preview produced', true, `${Math.round((Date.now() - t0) / 1000)} s, order ${id.slice(0, 8)}`);
await p.waitForTimeout(3000);

console.log('\n== 4. The result page, on a phone ==');
ok('opens on the restoration', await p.locator('.ba').evaluate((el) => el.style.getPropertyValue('--x') === '0%'));
ok('Før|Efter switch present', (await p.locator('.ba-switch button').count()) === 2);
const nextLine = await p.locator('.pv-left .caption').allInnerTexts();
ok('no longer calls the picture the AI\'s first proposal', !nextLine.join(' ').includes("AI'ens første forslag"));
ok('says what ordering actually produces', nextLine.join(' ').includes('trykkvalitet'));
// the sticky bar must not sit on the picture or on the controls under it
await p.evaluate(() => window.scrollTo(0, 900));
await p.waitForTimeout(900);
const overlap = await p.evaluate(() => {
  const bar = document.querySelector('.pv-cta-bar.on');
  if (!bar) return { bar: false };
  const b = bar.getBoundingClientRect();
  const hit = [...document.querySelectorAll('.ba, .ba-switch, .pv-toggle, .sizes-row, .frames-row, .products-row, input, .stepper')]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0 && r.bottom > b.top + 2 && r.top < b.bottom - 2);
  return { bar: true, hits: hit.length };
});
ok('order bar is up once the picture has been seen', overlap.bar === true);
ok('order bar covers neither the picture nor a control', overlap.bar && overlap.hits === 0, `overlaps ${overlap.hits ?? '?'}`);
const cta = await p.locator('.pv-cta-bar .btn').first().innerText();
ok('buy button carries the action and the price', /Bestil/.test(cta) && /\d{3}/.test(cta), cta.replace(/\s+/g, ' '));

console.log('\n== 5. The whole path is stated once, above the button ==');
const after = await p.locator('.pv-after').innerText();
ok('says when the money is taken', /Du betaler nu/.test(after));
ok('says what the human review is', /gennemgår|ansigterne/.test(after));
ok('says when the customer approves', /Godkend|godkend/.test(after));
ok('says when the file and the parcel arrive', /Efter dit ja/.test(after));
ok('says how to get help or the money back', /beløbet tilbage|skriv/i.test(after));

console.log('\n== 6. Choices stick, and nothing sells over the picture ==');
const cards = p.locator('.sizes-row .size');
await cards.nth(2).scrollIntoViewIfNeeded(); await cards.nth(2).click(); await p.waitForTimeout(1400);
ok('size changes the wall shot', ((await p.locator('.pv-mock img.on').getAttribute('src')) || '').includes('50x70'));
await p.locator('.frames-row .frame').nth(1).click(); await p.waitForTimeout(1200);
ok('frame changes the wall shot', ((await p.locator('.pv-mock img.on').getAttribute('src')) || '').includes('fr=eg'));
ok('price follows the size', (await p.locator('.pv-cta-bar .btn').first().innerText()).includes('999'));
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
ok('the choice survives a reload', ((await p.locator('.pv-mock img.on').getAttribute('src')) || '').includes('50x70') && (await p.locator('.pv-cta-bar .btn, .pv-desktop-cta .btn').first().innerText()).includes('999'));

console.log('\n== 7. The buy button goes to payment, not to a modal ==');
await p.locator('.pv-cta-bar .btn').first().scrollIntoViewIfNeeded();
await p.locator('.pv-cta-bar .btn').first().click();
await p.waitForTimeout(1500);
ok('no modal between the button and the till', (await p.locator('dialog[open]').count()) === 0);
await p.waitForURL(/checkout\.stripe\.com/, { timeout: 40000 }).catch(() => {});
ok('the browser reaches the payment page', /checkout\.stripe\.com/.test(p.url()), p.url().slice(0, 48));
await p.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
await p.waitForTimeout(2500);
ok('back from payment, the button works again', await p.locator('.pv-cta-bar .btn, .pv-desktop-cta .btn').first().isEnabled());

console.log('\n== 8. What the measurement recorded ==');
await p.waitForTimeout(2500);
const { data: evs } = await sb.from('events').select('name, session_id, order_id, utm, created_at').eq('order_id', id).order('created_at');
const { data: order } = await sb.from('orders').select('id, status, format, amount, preview_meta, utm').eq('id', id).single();
const sid = order?.preview_meta?.session_id ?? null;
const { data: sessionEvs } = sid
  ? await sb.from('events').select('name, created_at').eq('session_id', sid).order('created_at')
  : { data: [] };
const names = new Set([...(evs ?? []), ...(sessionEvs ?? [])].map((e) => e.name));
console.log('       events:', [...names].join(', '));
for (const step of ['FlowOpened', 'UploadStarted', 'ProcessingStarted', 'PreviewShown', 'PreviewViewed', 'ProductSelected', 'CheckoutClicked', 'InitiateCheckout', 'CheckoutRedirected']) {
  ok(`logged ${step}`, names.has(step));
}
const viewed = (sessionEvs ?? []).filter((e) => e.name === 'PreviewViewed');
ok('a reload did not count as a second look', viewed.length === 1, `${viewed.length} PreviewViewed`);
const shownAt = (evs ?? []).find((e) => e.name === 'PreviewShown')?.created_at;
const viewedAt = viewed[0]?.created_at;
ok('the result was seen after it was made, not with it', Boolean(shownAt && viewedAt) && Date.parse(viewedAt) > Date.parse(shownAt),
  shownAt && viewedAt ? `${Math.round((Date.parse(viewedAt) - Date.parse(shownAt)) / 1000)} s apart` : 'missing');
ok('the order kept the ad it came from', order?.utm?.utm_content === 'CONVERSION_ROUND');
ok('the order records the product', order?.preview_meta?.product === 'framed', String(order?.preview_meta?.product));
ok('the order kept the size the customer chose', order?.format === '50x70' && order?.amount === 99900, `${order?.format} ${order?.amount}`);

console.log('\n== 9. Errors seen along the way ==');
ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
ok('no failed requests', bad.length === 0, bad.slice(0, 3).join(' | '));

await p.screenshot({ path: `${out}/result-page.png`, fullPage: false });
await b.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====  order ${id}`);
process.exit(fail ? 1 : 0);
