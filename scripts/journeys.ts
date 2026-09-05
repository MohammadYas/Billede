/**
 * QA journeys against the running dev server (real OpenAI + Supabase):
 *  A  iPhone 390: landing → upload → real preview (screenshot 02-preview-390.png) → order button → checkout response
 *  B  bad file / group photo → fallback + lead e-mail
 *  C  payment cancel URL → preview resumes with calm message
 * Writes checkpoints/*.png and work/journeys.json.
 */
import fs from 'node:fs/promises';
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const out: Record<string, unknown> = {};

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined });
  const ctx = await browser.newContext({ ...devices['iPhone 14'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'da-DK' });
  const page = await ctx.newPage();
  const consoleErrors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  // A — real preview
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Se hvad dit billede kan blive til' }).first().click();
  await page.waitForSelector('.sheet');
  const t0 = Date.now();
  const input = page.locator('.sheet input[type=file]').nth(1);
  await input.setInputFiles('work/pd-originals/strunk.jpg');
  await page.waitForSelector('text=Fjern');
  await page.screenshot({ path: 'checkpoints/02-upload-picked-390.png' });
  await page.getByRole('button', { name: 'Vis mig resultatet' }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'checkpoints/02-processing-390.png' });
  const stages: string[] = [];
  const poll = setInterval(async () => { try { const t = await page.locator('.sheet p.lead').first().textContent(); if (t && !stages.includes(t)) stages.push(t); } catch { /* */ } }, 500);
  await page.waitForSelector('text=Sådan kan dit billede se ud.', { timeout: 120_000 });
  clearInterval(poll);
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30_000 }).catch(() => {});
  out.A_preview_ms = Date.now() - t0;
  out.A_stages = stages;
  await page.waitForTimeout(1900);
  await page.screenshot({ path: 'checkpoints/02-preview-390.png' });
  await page.screenshot({ path: 'checkpoints/02-preview-390-full.png', fullPage: false });
  // colour toggle arrives later
  try { await page.waitForSelector('button:has-text("Vis i farver"):not([disabled])', { timeout: 90_000 }); await page.click('button:has-text("Vis i farver")'); await page.waitForTimeout(800); await page.screenshot({ path: 'checkpoints/02-preview-colour-390.png' }); out.A_colour = true; } catch { out.A_colour = false; }
  const orderId = await page.evaluate(() => (document.querySelector('.ba img.after') as HTMLImageElement | null)?.src ?? '');
  out.A_preview_src_signed = /token=|sign/.test(orderId) || orderId.includes('supabase');
  const [resp] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/checkout')), page.getByRole('button', { name: /Bestil mit billede/ }).click()]);
  out.A_checkout_status = resp.status();
  out.A_checkout_body = await resp.text().catch(() => '');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'checkpoints/02-preview-order-390.png' });
  const previewUrl = page.url();
  out.A_url = previewUrl;
  // desktop rendering of the same preview page (same session cookies)
  const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'da-DK', storageState: await ctx.storageState() });
  const dpage = await dctx.newPage();
  await dpage.goto(previewUrl, { waitUntil: 'networkidle' }); await dpage.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30_000 }).catch(() => {}); await dpage.waitForTimeout(1900);
  await dpage.screenshot({ path: 'checkpoints/02-preview-1440.png', fullPage: true });
  await dctx.close();

  // C — cancel return: find order id via the API the page used
  const orderIdMatch = previewUrl.match(/\/p\/([0-9a-f-]{36})/);
  if (orderIdMatch) {
    await page.goto(`${BASE}/p/${orderIdMatch[1]}?cancelled=1`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Sådan kan dit billede se ud.', { timeout: 30_000 });
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30_000 }).catch(() => {});
    out.C_resumed = await page.locator('text=Betalingen blev ikke gennemført').count();
    await page.screenshot({ path: 'checkpoints/02-preview-cancelled-390.png' });
    await page.keyboard.press('Escape');
  }

  if (process.env.ONLY_A) { out.console_errors = consoleErrors; await fs.writeFile('work/journeys-a.json', JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 2)); await browser.close(); return; }
  // B — group photo → fallback
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Se hvad dit billede kan blive til' }).first().click();
  await page.waitForSelector('.sheet');
  await page.locator('.sheet input[type=file]').nth(1).setInputFiles('work/pd-originals/battalion.jpg');
  await page.getByRole('button', { name: 'Vis mig resultatet' }).click();
  const tB = Date.now();
  await page.waitForSelector('text=kræver manuelt arbejde', { timeout: 120_000 });
  out.B_fallback_ms = Date.now() - tB;
  await page.screenshot({ path: 'checkpoints/02-fallback-390.png' });
  await page.fill('#lead-email', 'qa@example.com');
  await page.getByRole('button', { name: 'Send til os' }).click();
  await page.waitForSelector('text=kigger på det', { timeout: 15_000 });
  out.B_lead_sent = true;
  await page.screenshot({ path: 'checkpoints/02-fallback-sent-390.png' });

  // B2 — wrong file type
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Se hvad dit billede kan blive til' }).first().click();
  await page.waitForSelector('.sheet');
  await page.locator('.sheet input[type=file]').nth(1).setInputFiles({ name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  out.B2_wrong_type_msg = await page.locator('.sheet [role=alert]').textContent();

  out.console_errors = consoleErrors;
  await fs.writeFile('work/journeys.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
