// The hero ad: the photograph itself, full width, half damaged and half restored down a seam with the
// site's own slider knob, the face large; underneath, the headline, the promise, a button and the price.
//   node scripts/ads-hero.mjs [<key> …]   (no argument = all)
// Output: work/ads/final/hero-<key>-… (photo + paper panel) and overlay-<key>-… (text on the photo), 1080x1350 and 1080x1080
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** pos = object-position of the photograph (where the face is); seam = where the wipe stands, % of width. */
const ADS = {
  'portraet-1962': { pos: '50% 28%', seam: 50, tag: 'Se resultatet, før du køber', h1: 'Så tydeligt har du ikke set hende i 60 år.', line: 'Tag et foto af det gamle billede med telefonen. Et par minutter efter ser du det restaureret på skærmen. Det koster ikke noget at se.' },
  'bryllup-1954': { pos: '50% 16%', seam: 50, tag: 'Gaven, de ikke selv kan købe', h1: 'Mors og fars bryllupsbillede. Skarpt igen.', line: 'Tag et foto af billedet med telefonen, og se det restaureret, før du beslutter noget. Det koster ikke noget at se.' },
  'have-1976': { pos: '50% 35%', seam: 48, tag: 'Farvebilleder fra 70’erne og 80’erne', h1: 'Farverne fra 1976. Som de var.', line: 'Falmet, gulnet, plettet. Det meste kan rettes. Se dit eget billede restaureret på skærmen, før du køber.' },
  'familie-ved-vandet-1948': { pos: '50% 10%', seam: 50, tag: 'Samme billede, 70 år senere', h1: 'Som det lå i skuffen. Som det kommer hjem.', line: 'Tag et foto af billedet. Se resultatet på skærmen. Sig ja, så printer vi og sender det i ramme.' },
  'foedselsdag-1985': { pos: '50% 40%', seam: 50, tag: 'Lanceringstilbud til og med 30. september', h1: 'Fem år, lagkage og flag. Reddet.', line: 'Ved køb: ét ekstra eksemplar med i pakken uden beregning, til den der også husker det. Værdi 349 kr.' },
};

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`;
const font = (f) => b64(resolve('public/fonts', f), 'font/woff2');
const FONTS = `
@font-face { font-family: 'Schibsted Grotesk'; src: url('${font('SchibstedGrotesk-normal.woff2')}') format('woff2'); font-weight: 400 900; }
@font-face { font-family: 'Public Sans'; src: url('${font('PublicSans-normal.woff2')}') format('woff2'); font-weight: 400 700; }
@font-face { font-family: 'Newsreader'; src: url('${font('Newsreader-normal.woff2')}') format('woff2'); font-weight: 300 700; }`;
const MARK = b64(resolve('public/logo-mark.png'), 'image/png');

function html({ W, H, pic, before, after, ad, h1Size }) {
  const panel = H - pic;
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><style>
${FONTS}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #fbfaf7; color: #171614; }
.pic { position: absolute; left: 0; top: 0; width: ${W}px; height: ${pic}px; overflow: hidden; background: #171614; }
.pic > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: ${ad.pos}; }
.pic > img.before { clip-path: inset(0 ${100 - ad.seam}% 0 0); }
.seam { position: absolute; top: 0; bottom: 0; left: ${ad.seam}%; width: 4px; margin-left: -2px; background: #fbfaf7; box-shadow: 0 0 0 1px rgba(23,22,20,.25); }
.knob { position: absolute; left: ${ad.seam}%; top: 50%; width: 76px; height: 76px; margin: -38px 0 0 -38px; border-radius: 50%; background: #fbfaf7; box-shadow: 0 6px 18px rgba(23,22,20,.35); display: flex; align-items: center; justify-content: center; gap: 9px; }
.knob i { display: block; width: 3px; height: 22px; background: #171614; border-radius: 2px; }
.chip { position: absolute; top: 28px; padding: 12px 18px; font: 700 24px/1 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; background: rgba(251,250,247,.94); color: #171614; border-radius: 6px; }
.chip.l { left: 28px; } .chip.r { right: 28px; color: #1f5a3c; }
.brand { position: absolute; left: 28px; bottom: 24px; display: flex; align-items: center; gap: 10px; padding: 10px 16px 10px 12px; background: rgba(251,250,247,.94); border-radius: 6px; font: 500 28px/1 'Newsreader', Georgia, serif; letter-spacing: -0.015em; }
.brand img { width: 30px; height: 30px; display: block; }
.panel { position: absolute; left: 0; top: ${pic}px; width: ${W}px; height: ${panel}px; padding: 36px 56px 0; border-top: 1px solid #e2ddd4; }
.tag { font: 700 22px/1 'Public Sans', Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #1f5a3c; margin-bottom: 18px; }
h1 { font: 700 ${h1Size}px/1.04 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.02em; text-wrap: balance; max-width: ${W - 112}px; }
.line { margin-top: 18px; font: 400 27px/1.32 'Public Sans', Arial, sans-serif; color: #5d5953; max-width: ${W - 112}px; }
.row { position: absolute; left: 56px; right: 56px; bottom: 40px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.btn { display: inline-flex; align-items: center; gap: 14px; padding: 0 34px; height: 76px; background: #171614; color: #fbfaf7; border-radius: 8px; font: 700 28px/1 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.01em; white-space: nowrap; }
.btn svg { width: 26px; height: 26px; }
.price { text-align: right; font: 400 24px/1.3 'Public Sans', Arial, sans-serif; color: #5d5953; }
.price b { display: block; font: 700 30px/1.2 'Schibsted Grotesk', Arial, sans-serif; color: #171614; letter-spacing: -0.01em; }
</style></head><body>
<div class="pic">
  <img class="after" src="${after}" alt="">
  <img class="before" src="${before}" alt="">
  <div class="seam"></div>
  <div class="knob"><i></i><i></i></div>
  <div class="chip l">Før</div><div class="chip r">Efter</div>
  <div class="brand"><img src="${MARK}" alt="">Billedearv</div>
</div>
<div class="panel">
  <div class="tag">${ad.tag}</div>
  <h1>${ad.h1}</h1>
  <div class="line">${ad.line}</div>
  <div class="row">
    <div class="btn">Prøv med dit eget billede <svg viewBox="0 0 24 24" fill="none" stroke="#fbfaf7" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>
    <div class="price"><b>Fra 599 kr. i ramme</b>Fri fragt · du betaler først, når du har set det</div>
  </div>
</div>
</body></html>`;
}

function overlay({ W, H, before, after, ad, h1Size }) {
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><style>
${FONTS}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #171614; color: #fbfaf7; }
.pic { position: absolute; inset: 0; overflow: hidden; }
.pic > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: ${ad.pos}; }
.pic > img.before { clip-path: inset(0 ${100 - ad.seam}% 0 0); }
.seam { position: absolute; top: 0; bottom: 0; left: ${ad.seam}%; width: 4px; margin-left: -2px; background: #fbfaf7; box-shadow: 0 0 0 1px rgba(23,22,20,.25); }
.knob { position: absolute; left: ${ad.seam}%; top: 38%; width: 76px; height: 76px; margin: -38px 0 0 -38px; border-radius: 50%; background: #fbfaf7; box-shadow: 0 6px 18px rgba(23,22,20,.35); display: flex; align-items: center; justify-content: center; gap: 9px; }
.knob i { display: block; width: 3px; height: 22px; background: #171614; border-radius: 2px; }
.chip { position: absolute; top: 28px; padding: 12px 18px; font: 700 24px/1 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; background: rgba(251,250,247,.94); color: #171614; border-radius: 6px; }
.chip.l { left: 28px; } .chip.r { right: 28px; color: #1f5a3c; }
.brand { position: absolute; left: 50%; top: 28px; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; padding: 10px 16px 10px 12px; background: rgba(251,250,247,.94); color: #171614; border-radius: 6px; font: 500 28px/1 'Newsreader', Georgia, serif; letter-spacing: -0.015em; }
.brand img { width: 30px; height: 30px; display: block; }
.shade { position: absolute; left: 0; right: 0; bottom: 0; height: 62%; background: linear-gradient(to bottom, rgba(23,22,20,0) 0%, rgba(23,22,20,.55) 38%, rgba(23,22,20,.9) 100%); }
.text { position: absolute; left: 56px; right: 56px; bottom: 44px; }
.tag { font: 700 22px/1 'Public Sans', Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #e9f0eb; margin-bottom: 18px; }
h1 { font: 700 ${h1Size}px/1.02 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.02em; text-wrap: balance; color: #fbfaf7; text-shadow: 0 2px 12px rgba(23,22,20,.35); }
.line { margin-top: 18px; font: 400 27px/1.32 'Public Sans', Arial, sans-serif; color: rgba(251,250,247,.86); max-width: ${W - 140}px; }
.row { margin-top: 30px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.btn { display: inline-flex; align-items: center; gap: 14px; padding: 0 34px; height: 76px; background: #fbfaf7; color: #171614; border-radius: 8px; font: 700 28px/1 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.01em; white-space: nowrap; }
.btn svg { width: 26px; height: 26px; }
.price { text-align: right; font: 400 24px/1.3 'Public Sans', Arial, sans-serif; color: rgba(251,250,247,.86); }
.price b { display: block; font: 700 30px/1.2 'Schibsted Grotesk', Arial, sans-serif; color: #fbfaf7; letter-spacing: -0.01em; }
</style></head><body>
<div class="pic">
  <img class="after" src="${after}" alt="">
  <img class="before" src="${before}" alt="">
  <div class="seam"></div>
  <div class="knob"><i></i><i></i></div>
  <div class="chip l">Før</div><div class="chip r">Efter</div>
  <div class="brand"><img src="${MARK}" alt="">Billedearv</div>
  <div class="shade"></div>
  <div class="text">
    <div class="tag">${ad.tag}</div>
    <h1>${ad.h1}</h1>
    <div class="line">${ad.line}</div>
    <div class="row">
      <div class="btn">Prøv med dit eget billede <svg viewBox="0 0 24 24" fill="none" stroke="#171614" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>
      <div class="price"><b>Fra 599 kr. i ramme</b>Fri fragt · du betaler først, når du har set det</div>
    </div>
  </div>
</div>
</body></html>`;
}

const which = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ADS);
mkdirSync('work/ads/final', { recursive: true });
const browser = await chromium.launch();
for (const key of which) {
  const ad = ADS[key];
  if (!ad) { console.error('unknown', key); continue; }
  const before = b64(resolve(`public/examples/${key}-before-1400.jpg`), 'image/jpeg');
  const after = b64(resolve(`public/examples/${key}-after-1400.jpg`), 'image/jpeg');
  for (const [style, W, H, pic, h1Size] of [['hero', 1080, 1350, 880, 62], ['hero', 1080, 1080, 690, 50], ['overlay', 1080, 1350, 0, 66], ['overlay', 1080, 1080, 0, 54]]) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const tmp = resolve(`work/ads/final/.${style}-${key}-${W}x${H}.html`);
    writeFileSync(tmp, style === 'overlay' ? overlay({ W, H, before, after, ad, h1Size }) : html({ W, H, pic, before, after, ad, h1Size }));
    await page.goto(`file:///${tmp.replace(/\\/g, '/')}`);
    await page.evaluate(() => document.fonts.ready);
    const out = `work/ads/final/${style}-${key}-${W}x${H}.jpg`;
    await page.screenshot({ path: out, type: 'jpeg', quality: 92 });
    await page.close();
    console.log('wrote', out);
  }
}
await browser.close();
