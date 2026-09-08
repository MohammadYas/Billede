// Meta creatives: six buying motives, three layouts, one voice. Every ad carries emotion, the free look
// and the paid object with its price ("I ramme fra 599 kr. inkl. fragt"), so the click is pre-qualified.
//   node scripts/ads-concepts.mjs [<key> …]   (no argument = all)
// Layouts: split  = the same face, half damaged / half restored down a seam (portraits only — never a group
//                   photo, where the two halves would show two different people);
//          cards  = the whole before and the whole after side by side, labelled (group photos, close-ups);
//          scene  = a composed product scene from work/ads/creatives (the frame on the wall, the two parcels).
// Static images carry no slider knob: nothing may look draggable that cannot be dragged.
// Output: work/ads/final/<key>-1080x1350.jpg (4:5 feed) and <key>-1080x1080.jpg (1:1).
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PRICE = 'I ramme fra 599 kr. inkl. fragt';
const CTA = 'Se mit billede';
const ex = (id, side) => `public/examples/${id}-${side}-1400.jpg`;
const detail = (id, side) => `public/examples/${id}-detail-${side}.jpg`;

/** The launch offer is read from lib/config.ts (env first), never assumed: concept F only renders while it is on. */
function campaign() {
  const src = readFileSync('lib/config.ts', 'utf8');
  const m = src.match(/campaignEndDate: process\.env\.CAMPAIGN_END_DATE \?\? '(\d{4}-\d{2}-\d{2})'/);
  const end = process.env.CAMPAIGN_END_DATE ?? m?.[1] ?? '';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Copenhagen' }).format(new Date());
  const active = /^\d{4}-\d{2}-\d{2}$/.test(end) && today <= end;
  const [y, mo, d] = end.split('-').map(Number);
  const until = active ? new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, mo - 1, d))) : '';
  return { active, until };
}
const offer = campaign();

const ADS = {
  'a-emotion': { layout: 'split', style: 'overlay', before: ex('portraet-1962', 'before'), after: ex('portraet-1962', 'after'), pos: '50% 28%', seam: 50,
    tag: 'Se resultatet, før du køber', h1: 'Så tydeligt har du ikke set hende i 60 år.', body: 'Tag et foto af det gamle billede med mobilen, og se det restaureret gratis. Originalen bliver hjemme.' },
  'b-produkt': { layout: 'scene', style: 'overlay', scene: 'work/ads/creatives/have-1976-paa-vaeggen-1080x1350.jpg', pos: '50% 0%',
    tag: 'Print, ramme, passepartout og glas', h1: 'Fra skuffen til væggen.', body: 'Se restaureringen gratis. Kan du lide resultatet, gennemgår vi det og sender det hjem som print i ramme.' },
  'c-gave': { layout: 'cards', style: 'panel', before: ex('bryllup-1954', 'before'), after: ex('bryllup-1954', 'after'),
    tag: 'Gaven, de ikke selv kan købe sig til', h1: 'Mors og fars bryllupsbillede. Tilbage på væggen.', body: 'Tag et foto af det i smug, og se det restaureret gratis. Bestiller du, kommer det hjem i ramme – til dig eller direkte til dem.' },
  'd-ligne': { layout: 'cards', style: 'panel', before: detail('familie-1932', 'before'), after: detail('familie-1932', 'after'),
    tag: 'Du godkender ansigterne før print', h1: 'Det skal stadig ligne hende.', body: 'Restaureringen må ikke gøre bedstemor til en anden person. Bestiller du, gennemgår vi ansigterne, og du godkender, før vi printer.' },
  'e-original': { layout: 'scene', style: 'overlay', scene: 'work/ads/creatives/familie-ved-vandet-1948-i-haenderne-1080x1350.jpg', pos: '50% 0%',
    tag: 'Tag blot et foto med mobilen', h1: 'Du sender aldrig originalen.', body: 'Dit gamle familiebillede bliver hjemme hos dig. Se restaureringen gratis på skærmen, før du beslutter noget.' },
  ...(offer.active ? { 'f-tilbud': { layout: 'scene', style: 'overlay', scene: 'work/ads/creatives/foedselsdag-1985-gaven-pakkes-op-1080x1350.jpg', pos: '50% 30%',
    tag: `Lanceringstilbud til og med ${offer.until}`, h1: '2 indrammede eksemplarer fra 599 kr.', body: 'Ét til dig. Ét til den, der også husker det. Det første ekstra eksemplar af samme billede, størrelse og ramme er gratis.', price: 'Se restaureringen gratis først · fri fragt' } } : {}),
};

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`;
const font = (f) => b64(resolve('public/fonts', f), 'font/woff2');
const FONTS = `
@font-face { font-family: 'Schibsted Grotesk'; src: url('${font('SchibstedGrotesk-normal.woff2')}') format('woff2'); font-weight: 400 900; }
@font-face { font-family: 'Public Sans'; src: url('${font('PublicSans-normal.woff2')}') format('woff2'); font-weight: 400 700; }
@font-face { font-family: 'Newsreader'; src: url('${font('Newsreader-normal.woff2')}') format('woff2'); font-weight: 300 700; }`;
const MARK = b64(resolve('public/logo-mark.png'), 'image/png');
const ARROW = (stroke) => `<svg viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

const BASE = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.chip { position: absolute; top: 28px; padding: 12px 18px; font: 700 24px/1 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; background: rgba(251,250,247,.94); color: #171614; border-radius: 6px; }
.chip.l { left: 28px; } .chip.r { right: 28px; color: #1f5a3c; }
.brand { position: absolute; display: flex; align-items: center; gap: 10px; padding: 10px 16px 10px 12px; background: rgba(251,250,247,.94); color: #171614; border-radius: 6px; font: 500 28px/1 'Newsreader', Georgia, serif; letter-spacing: -0.015em; }
.brand img { width: 30px; height: 30px; display: block; }
.seam { position: absolute; top: 0; bottom: 0; width: 4px; margin-left: -2px; background: #fbfaf7; box-shadow: 0 0 0 1px rgba(23,22,20,.25); }
.tag { font: 700 22px/1 'Public Sans', Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 18px; }
h1 { font-family: 'Schibsted Grotesk', Arial, sans-serif; font-weight: 700; line-height: 1.04; letter-spacing: -0.02em; text-wrap: balance; }
.body { margin-top: 18px; font: 400 27px/1.32 'Public Sans', Arial, sans-serif; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.btn { display: inline-flex; align-items: center; gap: 14px; padding: 0 34px; height: 76px; border-radius: 8px; font: 700 28px/1 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.01em; white-space: nowrap; }
.btn svg { width: 26px; height: 26px; }
.price { text-align: right; font: 700 26px/1.25 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.01em; max-width: 560px; }
.price small { display: block; font: 400 22px/1.3 'Public Sans', Arial, sans-serif; margin-top: 4px; }`;

/** The photograph(s) for the top of the ad. */
function picture(ad) {
  if (ad.layout === 'split') return `
    <img class="ph after" src="${b64(ad.after, 'image/jpeg')}" alt="">
    <img class="ph before" src="${b64(ad.before, 'image/jpeg')}" alt="" style="clip-path: inset(0 ${100 - ad.seam}% 0 0)">
    <div class="seam" style="left: ${ad.seam}%"></div>
    <div class="chip l">Før</div><div class="chip r">Efter</div>`;
  if (ad.layout === 'scene') return `<img class="ph after" src="${b64(ad.scene, 'image/jpeg')}" alt="">`;
  // cards: two whole pictures, labelled, on the quiet block
  return `
    <div class="cards">
      <figure><div class="chip l">Før</div><img src="${b64(ad.before, 'image/jpeg')}" alt=""></figure>
      <figure><div class="chip r">Efter</div><img src="${b64(ad.after, 'image/jpeg')}" alt=""></figure>
    </div>`;
}

function html(ad, W, H) {
  const overlay = ad.style === 'overlay';
  const pic = overlay ? H : (W === H ? 640 : 860);
  const h1 = overlay ? (W === H ? 54 : 64) : (W === H ? 46 : 58);
  const price = ad.price ?? PRICE;
  const pos = ad.pos ?? '50% 40%';
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><style>
${FONTS}
${BASE}
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: ${overlay ? '#171614' : '#fbfaf7'}; color: ${overlay ? '#fbfaf7' : '#171614'}; }
.pic { position: absolute; left: 0; top: 0; width: ${W}px; height: ${pic}px; overflow: hidden; background: ${ad.layout === 'cards' ? '#f1eee7' : '#171614'}; }
.pic > .ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: ${pos}; }
.brand { ${overlay ? 'left: 50%; top: 28px; transform: translateX(-50%);' : 'left: 28px; bottom: 24px;'} }
.cards { position: absolute; inset: 0; display: flex; gap: 24px; padding: 100px 56px 88px; align-items: center; justify-content: center; }
.cards figure { position: relative; flex: 1; height: 100%; display: flex; align-items: center; justify-content: center; margin: 0; }
.cards figure img { max-width: 100%; max-height: 100%; width: auto; height: auto; display: block; box-shadow: 0 24px 48px -28px rgba(23,22,20,.45), 0 2px 6px rgba(23,22,20,.10); border: 12px solid #fbfaf7; }
.cards .chip { top: -64px; left: 0; right: auto; }
.shade { position: absolute; left: 0; right: 0; bottom: 0; height: 64%; background: linear-gradient(to bottom, rgba(23,22,20,0) 0%, rgba(23,22,20,.6) 40%, rgba(23,22,20,.92) 100%); }
.text { position: absolute; left: 56px; right: 56px; ${overlay ? 'bottom: 44px;' : `top: ${pic + 36}px; bottom: 40px;`} }
.tag { color: ${overlay ? '#e9f0eb' : '#1f5a3c'}; }
h1 { font-size: ${h1}px; color: ${overlay ? '#fbfaf7' : '#171614'}; ${overlay ? 'text-shadow: 0 2px 12px rgba(23,22,20,.35);' : ''} }
.body { color: ${overlay ? 'rgba(251,250,247,.88)' : '#5d5953'}; max-width: ${W - 140}px; }
.row { margin-top: 30px; ${overlay ? '' : 'position: absolute; left: 0; right: 0; bottom: 0;'} }
.btn { background: ${overlay ? '#fbfaf7' : '#171614'}; color: ${overlay ? '#171614' : '#fbfaf7'}; }
.price { color: ${overlay ? '#fbfaf7' : '#171614'}; }
.price small { color: ${overlay ? 'rgba(251,250,247,.86)' : '#5d5953'}; }
${overlay ? '' : `.panel { position: absolute; left: 0; top: ${pic}px; width: ${W}px; height: ${H - pic}px; border-top: 1px solid #e2ddd4; }`}
</style></head><body>
<div class="pic">
  ${picture(ad)}
  <div class="brand"><img src="${MARK}" alt="">Billedearv</div>
  ${overlay ? '<div class="shade"></div>' : ''}
</div>
${overlay ? '' : '<div class="panel"></div>'}
<div class="text">
  <div class="tag">${ad.tag}</div>
  <h1>${ad.h1}</h1>
  <div class="body">${ad.body}</div>
  <div class="row">
    <div class="btn">${CTA} ${ARROW(overlay ? '#171614' : '#fbfaf7')}</div>
    <div class="price">${price}${ad.layout === 'split' || ad.layout === 'cards' ? '<small>Se restaureringen gratis først</small>' : ''}</div>
  </div>
</div>
</body></html>`;
}

const which = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ADS);
mkdirSync('work/ads/final', { recursive: true });
const browser = await chromium.launch();
for (const key of which) {
  const ad = ADS[key];
  if (!ad) { console.error('unknown or inactive concept', key); continue; }
  const missing = [ad.before, ad.after, ad.scene].filter((p) => p && !existsSync(p));
  if (missing.length) { console.error(key, 'missing', missing.join(', ')); continue; }
  for (const [W, H] of [[1080, 1350], [1080, 1080]]) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const tmp = resolve(`work/ads/final/.${key}-${W}x${H}.html`);
    writeFileSync(tmp, html(ad, W, H));
    await page.goto(`file:///${tmp.replace(/\\/g, '/')}`);
    await page.evaluate(() => document.fonts.ready);
    const out = `work/ads/final/${key}-${W}x${H}.jpg`;
    await page.screenshot({ path: out, type: 'jpeg', quality: 92 });
    await page.close();
    console.log('wrote', out);
  }
}
await browser.close();
if (!offer.active) console.log('concept f-tilbud skipped: the launch offer is not on (lib/config.ts campaignEndDate / CAMPAIGN_END_DATE)');
