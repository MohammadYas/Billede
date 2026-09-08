// Static Meta creatives, one buying motive per image.
//   node scripts/ads/static.mjs [<key> …] [--hooks]     (no key = every concept; --hooks = every hook variant)
// Output: work/ads/final/<key>[-h<n>]-{4x5,1x1,9x16}.jpg
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pick, offer } from './concepts.mjs';
import { staticFrame } from './html.mjs';

const args = process.argv.slice(2);
const allHooks = args.includes('--hooks');
const which = pick(args.filter((a) => !a.startsWith('--')));
const SIZES = { '4x5': [1080, 1350], '1x1': [1080, 1080], '9x16': [1080, 1920] };

mkdirSync('work/ads/final', { recursive: true });
const browser = await chromium.launch();
for (const c of which) {
  if (c.visual.src && !existsSync(c.visual.src)) { console.error(c.key, 'missing', c.visual.src, '(scripts/ads-composite.mjs makes it)'); continue; }
  const hooks = allHooks ? c.hooks : c.hooks.slice(0, 1);
  for (const [i, hook] of hooks.entries()) {
    for (const [name, [W, H]] of Object.entries(SIZES)) {
      if (c.style === 'ugc' && name === '9x16') continue; // UGC 9:16 is the reel, not a still
      const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
      const tmp = resolve(`work/ads/final/.${c.key}-${name}.html`);
      writeFileSync(tmp, staticFrame(c, hook, W, H));
      await page.goto(`file:///${tmp.replace(/\\/g, '/')}`);
      await page.evaluate(() => document.fonts.ready);
      const out = `work/ads/final/${c.key}${i ? `-h${i + 1}` : ''}-${name}.jpg`;
      await page.screenshot({ path: out, type: 'jpeg', quality: 92 });
      await page.close();
      console.log('wrote', out);
    }
  }
}
await browser.close();
if (!offer.active) console.log('offer concept skipped: the launch offer is not on (lib/config.ts campaignEndDate / CAMPAIGN_END_DATE)');
