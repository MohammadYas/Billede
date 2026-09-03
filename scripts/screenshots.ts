/**
 * Renders the checkpoints the spec asks for, against a running dev server (BASE_URL, default http://localhost:3000).
 *   npx tsx scripts/screenshots.ts
 * Writes checkpoints/01-hero-390.png, 01-hero-1440.png, breakpoints/*.png, 03-tak.png, 05-admin-order.png (if ADMIN cookie), and a horizontal-overflow report.
 */
import fs from 'node:fs/promises';
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = 'checkpoints';
const widths = [375, 390, 430, 768, 1024, 1440];

async function main() {
  await fs.mkdir(`${OUT}/breakpoints`, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined });
  const report: string[] = [];
  for (const w of widths) {
    const mobile = w < 768;
    const ctx = await browser.newContext({ ...(mobile ? devices['iPhone 14'] : {}), viewport: { width: w, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 2 : 1, locale: 'da-DK', reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1900); // the one motion
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const small = await page.evaluate(() => {
      const bad: string[] = [];
      document.querySelectorAll<HTMLElement>('a,button,input[type=range],summary,label').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.height < 44 && r.width < 44) bad.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
      });
      return bad;
    });
    report.push(`${w}px: horizontal overflow ${overflow}px; tap targets <44px: ${small.length ? small.join(' | ') : 'none'}`);
    await page.screenshot({ path: `${OUT}/breakpoints/landing-${w}.png`, fullPage: true });
    if (w === 390) await page.screenshot({ path: `${OUT}/01-hero-390.png`, fullPage: false });
    if (w === 1440) await page.screenshot({ path: `${OUT}/01-hero-1440.png`, fullPage: false });
    if (w === 390) {
      // sticky CTA after scroll
      await page.evaluate(() => window.scrollTo(0, 600)); await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/02-sticky-cta-390.png`, fullPage: false });
      // upload sheet
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('gf:open'))); await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/02-upload-sheet-390.png`, fullPage: false });
      await page.keyboard.press('Escape');
      const tak = await ctx.newPage(); await tak.goto(`${BASE}/tak?session_id=cs_test_preview`, { waitUntil: 'networkidle' });
      await tak.screenshot({ path: `${OUT}/03-tak-390.png`, fullPage: true });
      const priv = await ctx.newPage(); await priv.goto(`${BASE}/privatliv`, { waitUntil: 'networkidle' });
      await priv.screenshot({ path: `${OUT}/04-privatliv-390.png`, fullPage: false });
    }
    if (w === 1440 && process.env.ADMIN_PASSWORD) {
      const admin = await ctx.newPage(); await admin.goto(`${BASE}/admin`);
      await admin.fill('input[name=password]', process.env.ADMIN_PASSWORD); await admin.click('button[type=submit]'); await admin.waitForLoadState('networkidle');
      await admin.screenshot({ path: `${OUT}/05-admin-orders-1440.png`, fullPage: true });
      const link = await admin.$('table a'); if (link) { await link.click(); await admin.waitForLoadState('networkidle'); await admin.screenshot({ path: `${OUT}/05-admin-order-1440.png`, fullPage: true }); }
    }
    await ctx.close();
  }
  await browser.close();
  await fs.writeFile(`${OUT}/breakpoints/report.txt`, report.join('\n'));
  console.log(report.join('\n'));
}
main().catch((e) => { console.error(e); process.exit(1); });
