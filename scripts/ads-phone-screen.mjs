// Screenshots the real preview page on a phone with an example pair in place of the order's picture.
//   node scripts/ads-phone-screen.mjs <par> [--base http://localhost:3000] [--order <id or prefix>] [--ratio 0.40]
// Output: work/ads/screens/<par>-phone.png at 3× (390 px wide; height = 390 / ratio, so it fills the phone
// placeholder in the scene without cropping). Needs a PREVIEW_READY order (newest by default) and the dev server.
// The order's own picture is never shown: the slider's before/after images are swapped for public/examples/<par>-*.jpg.
process.loadEnvFile?.('.env.local');
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync } from 'node:fs';

const [pair, ...rest] = process.argv.slice(2);
if (!pair) { console.error('usage: node scripts/ads-phone-screen.mjs <par> [--base url] [--order id] [--ratio w/h]'); process.exit(1); }
const opt = (n, d) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : d; };
const base = opt('--base', 'http://localhost:3000');
const ratio = Number(opt('--ratio', '0.462'));
const width = 390, height = Math.round(width / ratio);

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await db.from('orders').select('id,preview_meta,amount').eq('status', 'PREVIEW_READY').order('created_at', { ascending: false });
if (error) throw error;
const wanted = opt('--order');
const order = (data ?? []).find((o) => !wanted || o.id.startsWith(wanted));
if (!order) { console.error('no PREVIEW_READY order to photograph'); process.exit(2); }
const token = order.preview_meta?.share_token;
console.log('order', order.id.slice(0, 8), 'amount', order.amount, 'viewport', `${width}x${height}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'da-DK' });
const page = await ctx.newPage();
await page.goto(`${base}/p/${order.id}${token ? `?t=${encodeURIComponent(token)}` : ''}`, { waitUntil: 'networkidle' });
await page.evaluate(({ before, after, compact }) => {
  const swap = (img, src) => { if (!img) return; img.srcset = ''; img.sizes = ''; img.parentElement?.querySelectorAll('source').forEach((s) => s.remove()); img.src = src; };
  swap(document.querySelector('.ba img.before'), before);
  swap(document.querySelector('.ba img.after'), after);
  document.querySelectorAll('nextjs-portal, dialog, [class*="consent"], [class*="Consent"], .resume-banner').forEach((el) => { if (el instanceof HTMLDialogElement) el.close(); el.style.display = 'none'; });
  if (compact) {
    // a phone the size of a thumb in the ad: keep the offer bar, the header, the slider and the button; drop the reading
    const left = document.querySelector('.pv-left');
    left?.querySelectorAll(':scope > *').forEach((el) => { if (!el.querySelector('.ba') && !el.classList.contains('ba')) el.style.display = 'none'; });
    document.querySelectorAll('.pv-right, .pv-toggle, .pv-save, .pv-desktop-cta, footer').forEach((el) => { el.style.display = 'none'; });
    const ba = document.querySelector('.ba');
    const bar = document.querySelector('.pv-cta-bar');
    if (ba) {
      ba.style.marginTop = '12px';
      const top = ba.getBoundingClientRect().top + window.scrollY;
      const barH = bar ? bar.getBoundingClientRect().height : 0;
      const avail = window.innerHeight - top - (barH > 40 ? barH : 130) - 14;
      ba.style.aspectRatio = 'auto'; ba.style.height = `${Math.max(avail, ba.clientWidth)}px`; // the slider fills what the phone shows
      ba.querySelectorAll('img').forEach((img) => { img.style.height = '100%'; img.style.objectFit = 'cover'; });
    }
  }
  window.scrollTo(0, 0);
}, { before: `/examples/${pair}-before-1000.jpg`, after: `/examples/${pair}-after-1000.jpg`, compact: rest.includes('--compact') });
await page.waitForTimeout(1000);
mkdirSync('work/ads/screens', { recursive: true });
const out = `work/ads/screens/${pair}-phone.png`;
await page.screenshot({ path: out, fullPage: false });
console.log('wrote', out);
await browser.close();
