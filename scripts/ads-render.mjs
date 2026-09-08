// Lays the ad text on a composed scene in the site's own type and palette (Playwright renders the HTML).
//   node scripts/ads-render.mjs <koncept> [<koncept> …]   (no argument = all five)
// Input:  work/ads/creatives/<par>-<koncept>-1080x1350.jpg (from scripts/ads-composite.mjs)
// Output: work/ads/final/<koncept>-1080x1350.jpg (4:5) and <koncept>-1080x1080.jpg (1:1)
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** The five ads: tag (accent, uppercase), headline (Schibsted Grotesk), line (Public Sans). `anchor` is which
 *  part of the scene survives when the panel takes the bottom: top | centre | bottom. */
const ADS = {
  koekkenbord: { pair: 'bryllup-1954', anchor: 'centre', tag: 'Gaven, de ikke selv kan købe', h1: 'Det gamle billede af mor og far. Skarpt igen, i ramme.', line: 'Se det restaureret, før du køber · fra 599 kr., fri fragt' },
  'paa-vaeggen': { pair: 'have-1976', anchor: 'centre', anchorSquare: '50% 22%', tag: 'Fra skuffen til væggen', h1: 'Dit gamle billede kan blive sådan her.', line: 'Det koster ikke noget at se · fra 599 kr. i ramme, fri fragt' },
  skuffen: { pair: 'portraet-1962', anchor: 'top', tag: 'Sådan foregår det', h1: 'Ingen bestilling, før du har set det.', line: 'Tag et foto · se resultatet på skærmen · sig ja' },
  'gaven-pakkes-op': { pair: 'foedselsdag-1985', anchor: 'centre', tag: 'Lanceringstilbud til og med 30. september', h1: 'Ét ekstra eksemplar med i pakken – uden beregning.', line: 'Ved køb · værdi 349 kr. · fra 599 kr. i ramme, fri fragt' },
  'i-haenderne': { pair: 'familie-ved-vandet-1948', anchor: 'centre', tag: 'Samme billede, 70 år senere', h1: 'Som det lå i skuffen. Som det kommer hjem.', line: 'Se det på skærmen, før du beslutter dig · fra 599 kr.' },
};

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`;
const font = (file) => b64(resolve('public/fonts', file), 'font/woff2');
const FONTS = `
@font-face { font-family: 'Schibsted Grotesk'; src: url('${font('SchibstedGrotesk-normal.woff2')}') format('woff2'); font-weight: 400 900; }
@font-face { font-family: 'Public Sans'; src: url('${font('PublicSans-normal.woff2')}') format('woff2'); font-weight: 400 700; }
@font-face { font-family: 'Newsreader'; src: url('${font('Newsreader-normal.woff2')}') format('woff2'); font-weight: 300 700; }`;
const MARK = b64(resolve('public/logo-mark.png'), 'image/png');

function html({ W, H, panel, scene, ad, h1Size }) {
  const anchor = (W === H && ad.anchorSquare) || ad.anchor; // the 1:1 crop is tighter and may need its own anchor
  const pos = { top: '50% 0%', centre: '50% 40%', bottom: '50% 100%' }[anchor] ?? anchor;
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><style>
${FONTS}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #fbfaf7; }
.scene { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H - panel}px; background: url('${scene}') ${pos} / cover no-repeat; }
.panel { position: absolute; left: 0; top: ${H - panel}px; width: ${W}px; height: ${panel}px; background: #fbfaf7; border-top: 1px solid #e2ddd4; padding: 40px 56px 0; color: #171614; }
.tag { font: 600 22px/1 'Public Sans', Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #1f5a3c; margin-bottom: 22px; }
h1 { font: 700 ${h1Size}px/1.05 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.015em; text-wrap: balance; max-width: ${W - 112}px; }
.line { margin-top: 20px; font: 400 27px/1.3 'Public Sans', Arial, sans-serif; color: #5d5953; max-width: ${W - 112 - 40}px; }
.mark { position: absolute; right: 56px; bottom: 44px; display: flex; align-items: center; gap: 10px; font: 500 30px/1 'Newsreader', Georgia, serif; letter-spacing: -0.015em; color: #171614; }
.mark img { width: 32px; height: 32px; display: block; }
</style></head><body>
<div class="scene"></div>
<div class="panel">
  <div class="tag">${ad.tag}</div>
  <h1>${ad.h1}</h1>
  <div class="line">${ad.line}</div>
  <div class="mark"><img src="${MARK}" alt="">Billedearv</div>
</div>
</body></html>`;
}

const which = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ADS);
mkdirSync('work/ads/final', { recursive: true });
const browser = await chromium.launch();
for (const koncept of which) {
  const ad = ADS[koncept];
  if (!ad) { console.error('unknown koncept', koncept); continue; }
  const scene = b64(resolve(`work/ads/creatives/${ad.pair}-${koncept}-1080x1350.jpg`), 'image/jpeg');
  for (const [W, H, panel, h1Size] of [[1080, 1350, 340, 60], [1080, 1080, 320, 54]]) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const tmp = resolve(`work/ads/final/.${koncept}-${W}x${H}.html`);
    writeFileSync(tmp, html({ W, H, panel, scene, ad, h1Size }));
    await page.goto(`file:///${tmp.replace(/\\/g, '/')}`);
    await page.evaluate(() => document.fonts.ready);
    const out = `work/ads/final/${koncept}-${W}x${H}.jpg`;
    await page.screenshot({ path: out, type: 'jpeg', quality: 92 });
    await page.close();
    console.log('wrote', out);
  }
}
await browser.close();
