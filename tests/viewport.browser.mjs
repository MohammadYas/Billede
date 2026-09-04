/**
 * The two things a phone breaks that a desktop never shows: a page that scrolls sideways, and a
 * control too small to hit. Measured on the two pages a customer actually uses, at the widths they
 * actually arrive on.
 *
 *   BASE=http://localhost:3000 PURL=".../p/<id>?t=<token>" node tests/viewport.browser.mjs
 */
import { chromium, devices } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:3111';
const PURL = process.env.PURL;
const WIDTHS = [375, 390, 430, 768, 1024, 1280];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
let bad = 0;
for (const w of WIDTHS) {
  const mobile = w < 768;
  const ctx = await b.newContext({ ...(mobile ? devices['iPhone 14'] : {}), viewport: { width: w, height: mobile ? 844 : 900 }, locale: 'da-DK' });
  for (const [name, url] of [['forside', BASE + '/'], ...(PURL ? [['bestilling', PURL]] : [])]) {
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1600);
    await p.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const small = [];
      for (const el of document.querySelectorAll('a,button,input:not([type=hidden]),summary,label,select,textarea')) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        // an inline link inside a paragraph is text, not a control
        if (el.tagName === 'A' && cs.display.startsWith('inline') && el.closest('p,li')) continue;
        // .visually-hidden is the 1×1 clipped element a screen reader reads; the thing you tap is its label
        if (el.classList.contains('visually-hidden') || (cs.position === 'absolute' && b.width <= 1 && b.height <= 1)) continue;
        // a radio or checkbox hidden inside its own label: the label is the target, and it is measured too
        if (/^(INPUT)$/.test(el.tagName) && el.closest('label')) {
          const lb = el.closest('label').getBoundingClientRect();
          if (lb.height >= 44 || lb.width >= 44) continue;
        }
        if (b.height < 44 && b.width < 44) small.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 24)}" ${Math.round(b.width)}×${Math.round(b.height)}`);
      }
      // does the fixed bar sit on top of something you need to read or press?
      const bar = [...document.querySelectorAll('*')].find((e) => { const cs = getComputedStyle(e); return cs.position === 'fixed' && e.getBoundingClientRect().bottom >= innerHeight - 2 && e.getBoundingClientRect().height > 40; });
      let covered = [];
      if (bar) {
        const bb = bar.getBoundingClientRect();
        covered = [...document.querySelectorAll('button,a[href],input,label')].filter((el) => {
          if (bar.contains(el)) return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.bottom > bb.top && r.top < bb.bottom && r.top < innerHeight;
        }).map((el) => `${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 24)}"`);
      }
      return { overflow, small, covered, hasBar: Boolean(bar) };
    });
    const ok = r.overflow === 0 && r.small.length === 0 && r.covered.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'OK  ' : 'FEJL'} ${String(w).padStart(4)}px ${name.padEnd(12)} overløb=${r.overflow}px  små tryk=${r.small.length ? r.small.join(' | ') : '0'}  ${r.hasBar ? `bjælke dækker=${r.covered.length ? r.covered.join(' | ') : '0'}` : 'ingen fast bjælke'}`);
    await p.close();
  }
  await ctx.close();
}
await b.close();
console.log(bad ? `\n${bad} FEJL` : '\ningen vandret overløb, ingen tryk under 44 px, intet dækket af den faste bjælke');
process.exit(bad ? 1 : 0);
