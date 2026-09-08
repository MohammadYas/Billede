/**
 * The whole customer path, once, against a running server, with one real restoration:
 * landing (offer dialog, size cards, fade) → upload sheet (progress bar, steps) → preview page
 * (watermark note, size → mockup, frame, extra copy) → Bestil (the upsell question) → Stripe
 * Checkout URL (not paid) → back to the landing page (the resume banner knows the picture) → admin
 * (the order with its UTM source). Cleans up: the order is deleted through the customer's own button.
 *
 *   BASE=http://localhost:3000 ADMIN_PASSWORD=… OUT=<dir> node tests/e2e-flow.browser.mjs
 */
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = process.env.OUT ?? 'work/e2e';
const FILE = process.env.FILE ?? 'assets/originals/cykel-1944.webp';
mkdirSync(OUT, { recursive: true });
const shots = [];
const shot = async (p, name) => { await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }); shots.push(name); };
const results = [];
const check = (name, ok, note = '') => { results.push({ name, ok, note }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${note ? ' · ' + note : ''}`); };

const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM, args: ['--no-sandbox'] });
const ctx = await b.newContext({ ...devices['iPhone 14'], viewport: { width: 390, height: 844 }, locale: 'da-DK' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));

const SKIP = process.env.PREVIEW_URL; // rerun from an existing preview: no second restoration
// 1. landing with a UTM source
if (!SKIP) {
await page.goto(`${BASE}/?utm_source=pwtest&utm_medium=cpc&utm_campaign=lancering&utm_content=ad1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2600);
const dialog = page.locator('dialog.offer-dialog[open]');
check('offer dialog appears on first visit', await dialog.count() === 1);
await shot(page, '01-offer-dialog');
if (await dialog.count()) { await page.locator('.offer-no').click(); await page.waitForTimeout(400); }
check('offer dialog closes on Nej tak', await page.locator('dialog.offer-dialog[open]').count() === 0);
const fadeEl = page.locator('.hero-proof .cmp');
const s0 = await fadeEl.evaluate((el) => el.classList.contains('show-before'));
await page.waitForTimeout(3600);
const s1 = await fadeEl.evaluate((el) => el.classList.contains('show-before'));
check('hero fade alternates by itself', s0 !== s1);
check('size cards carry the scaled shots', await page.locator('.o-pick .size .size-shot img').count() === 3);

// 2. upload
await page.locator('.hero-cta button').click();
await page.waitForSelector('.sheet');
await page.locator('.sheet input[type=file]').last().setInputFiles(FILE);
await page.waitForTimeout(600);
const startBtn = page.locator('.sheet button.btn').first();
if (await startBtn.count()) await startBtn.click();
await page.waitForSelector('.progress-big', { timeout: 20000 });
await page.waitForTimeout(2500);
const pct = await page.locator('.proc-bar-head .tabular').textContent();
check('progress bar shows a percentage', /\d+ %/.test(pct ?? ''), pct ?? '');
check('the three steps are listed', await page.locator('.proc-steps li').count() === 3);
await shot(page, '02-processing');
// the way back: the banner on the front page while it is working
const saved = await page.evaluate(() => localStorage.getItem('gf_resume'));
check('resume key written while processing', Boolean(saved));
} else {
  await page.goto(SKIP, { waitUntil: 'networkidle' });
  const u = new URL(SKIP); const id = (u.pathname.match(/\/p\/([0-9a-f-]{36})/) ?? [])[1];
  await page.evaluate(([id, t]) => localStorage.setItem('gf_resume', JSON.stringify({ id, t, at: Date.now() })), [id, u.searchParams.get('t')]);
}

// 3. wait for the preview page (real restoration, ~60-90 s)
if (!SKIP) await page.waitForURL(/\/p\//, { timeout: 180000 });
await page.waitForLoadState('networkidle');
const previewUrl = page.url();
check('arrives on the preview page', /\/p\/[0-9a-f-]{36}/.test(previewUrl));
await page.waitForTimeout(1200);
await shot(page, '03-preview-top');
check('watermark is named under the picture', (await page.getByText('vandmærke', { exact: false }).count()) > 0);
await page.locator('label.size', { hasText: '30×40' }).click();
await page.locator('label.frame', { hasText: 'Sort' }).click();
await page.waitForTimeout(900);
const mockBefore = await page.locator('.pv-mock img').last().getAttribute('src');
await page.locator('label.size', { hasText: '50×70' }).click();
await page.waitForTimeout(900);
const mockAfter = await page.locator('.pv-mock img').last().getAttribute('src');
check('mockup follows the chosen size', mockBefore !== mockAfter && /f=50x70/.test(mockAfter ?? ''), (mockAfter ?? '').replace(/[?&]t=[^&]+/, '').slice(0, 90));
await page.locator('label.frame', { hasText: 'Eg' }).click();
await page.waitForTimeout(900);
const mockOak = await page.locator('.pv-mock img').last().getAttribute('src');
check('mockup follows the chosen frame', /f=50x70&fr=eg/.test(mockOak ?? ''), (mockOak ?? '').replace(/[?&]t=[^&]+/, '').slice(0, 90));
await shot(page, '04-preview-50x70-eg');

// 4. Bestil → the upsell question → Stripe URL
const [checkoutResp] = await Promise.all([
  page.waitForResponse((r) => r.url().includes('/api/checkout') && r.request().method() === 'POST', { timeout: 30000 }).catch(() => null),
  (async () => {
    // the question is only asked when no copy is on the order yet: take one off if an earlier run left it there
    const minus = page.locator('.stepper button').first();
    if (await minus.count()) { await minus.click(); await page.waitForTimeout(500); }
    await page.locator('button:visible', { hasText: 'Bestil mit billede' }).first().click();
    await page.waitForSelector('dialog.upsell[open]', { timeout: 5000 });
    check('extra-copy question appears before payment', true);
    await shot(page, '05-upsell');
    await page.locator('dialog.upsell .btn').first().click(); // Ja tak
  })(),
]);
const cj = checkoutResp ? await checkoutResp.json().catch(() => ({})) : {};
// the response can slip past the listener when the navigation is quick; the browser standing on Stripe (next check) is the proof
check('checkout answers with a Stripe URL', Boolean(cj.url && /checkout\.stripe\.com/.test(cj.url)) || /stripe\.com/.test(page.url()), (cj.url ?? page.url()).slice(0, 40));
await page.waitForTimeout(1500);
const onStripe = /stripe\.com/.test(page.url());
check('browser is sent to Stripe', onStripe, page.url().slice(0, 50));
if (onStripe) await shot(page, '06-stripe');

// 5. back on the front page: the resume banner points at the picture
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const banner = page.locator('.resume');
check('resume banner shows the way back', await banner.count() === 1, (await banner.textContent().catch(() => '')) ?? '');
await shot(page, '07-resume-banner');
const orderId = (previewUrl.match(/\/p\/([0-9a-f-]{36})/) ?? [])[1];

// 6. admin: the order and its source
if (process.env.ADMIN_PASSWORD && orderId) {
  const d = await ctx.newPage();
  await d.setViewportSize({ width: 1280, height: 900 });
  await d.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await d.fill('#pw', process.env.ADMIN_PASSWORD);
  await d.click('button[type=submit]');
  await d.waitForSelector('.adm-bar', { timeout: 15000 });
  await d.goto(`${BASE}/admin?alle=1`, { waitUntil: 'networkidle' });
  const row = d.locator('table tbody tr', { hasText: orderId.slice(0, 8) });
  check('admin lists the order', await row.count() === 1);
  const rowText = (await row.textContent().catch(() => '')) ?? '';
  check('admin shows the UTM source', /pwtest|ad1/.test(rowText), rowText.replace(/\s+/g, ' ').slice(0, 120));
  check('admin has a sources summary', (await d.locator('.adm-sources').count()) === 1);
  await shot(d, '08-admin');
  await d.goto(`${BASE}/admin/orders/${orderId}`, { waitUntil: 'networkidle' });
  check('admin order page shows utm_campaign', (await d.textContent('body'))?.includes('lancering') ?? false);
  await d.close();
}

// 7. cleanup: the customer's own delete button
if (orderId) {
  const t = new URL(previewUrl).searchParams.get('t');
  const r = await page.request.post(`${BASE}/api/preview/${orderId}/cancel${t ? `?t=${encodeURIComponent(t)}` : ''}`);
  const cjson = await r.json().catch(() => ({}));
  check('test order deleted again (or held for the open checkout)', r.ok() || cjson.reason === 'checkout_open', `${r.status()} ${cjson.reason ?? ''}`);
}
check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 200));
await b.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed · screenshots in ${OUT}: ${shots.join(', ')}`);
process.exit(failed.length ? 1 : 0);
