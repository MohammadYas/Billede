/**
 * One paste-able HTML file with every screen the site can show: the real DOM (client components and
 * their states included), the real stylesheet, the five mails, and grey placeholders of the right
 * shape where the photographs are. A design reviewer sees layout, type, spacing and copy without a
 * byte of image data — and without a signed storage URL or a share token leaving the machine.
 *
 *   npm run review:html                                   # against a server on :3111
 *   node scripts/build-page-review.mjs <base-url> <out.html>
 *
 * PID/PTOKEN point at a preview to use as the product page. APPROVAL_TOKEN, when a paid order has
 * been staged, adds the approval pages; without it those sections say what is missing and why.
 */
import fs from 'node:fs';
import { chromium, devices } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3111';
const OUT = process.argv[3] ?? 'docs/review/alle-sider.html';
const { PID, PTOKEN, ADMIN_PASSWORD: ADMIN, APPROVAL_TOKEN: APPR } = process.env;
const P = PID ? `/p/${PID}?t=${PTOKEN}` : null;

const openSheet = async (p) => { await p.evaluate(() => window.dispatchEvent(new CustomEvent('gf:open'))); await p.waitForTimeout(700); };
const setPhoto = async (p, file) => { const i = await p.$('input[type=file]'); await i.setInputFiles(file); await p.waitForTimeout(1200); };
const clickText = async (p, text) => { const el = p.locator(`text=${text}`).first(); if (await el.count()) { await el.click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(900); } };
/** The colour choice is stored on the order, so click the toggle only when it is not already there. */
const toColour = async (p) => { if (await p.locator('button:has-text("Vis i farver")').first().count()) await clickText(p, 'Vis i farver'); };
const toMono = async (p) => { if (await p.locator('button:has-text("Vis i sort-hvid")').first().count()) await clickText(p, 'Vis i sort-hvid'); };
/**
 * The extra copies are a −/+ stepper, and the count is stored on the order, so a build that only ever
 * pressed + would leave one more copy behind every time it ran. Every press is undone again.
 */
const step = async (p, sign, times = 1) => {
  const btn = p.locator('button', { hasText: sign === '+' ? /^\+$/ : /^−$/ }).first();
  for (let i = 0; i < times; i++) { if (!(await btn.count()) || await btn.isDisabled().catch(() => true)) break; await btn.click().catch(() => {}); await p.waitForTimeout(700); }
};
/** At zero the control is a single "Tilføj et eksemplar" button; from one upwards it is the stepper. */
const addCopy = async (p) => {
  const add = p.locator('button:has-text("Tilføj et eksemplar")').first();
  if (await add.count()) { await add.click().catch(() => {}); await p.waitForTimeout(900); return; }
  await step(p, '+');
};
const clearCopies = async (p) => step(p, '−', 4);

const SHEET = '.sheet[role=dialog]';

const PAGES = [
  { g: 'Forsiden', n: '01', t: 'Forside — telefon', p: '/', w: 390, note: 'Det første en kold besøgende fra Meta ser. 90 % af trafikken.' },
  { g: 'Forsiden', n: '02', t: 'Forside — desktop', p: '/', w: 1280, note: 'Samme side, samme rækkefølge, to spalter hvor der er plads.' },

  { g: 'Upload-arket', n: '03', t: 'Arket, tomt', p: '/', w: 390, only: SHEET, act: openSheet, note: 'Det der glider op ved tryk på "Se hvad mit billede kan blive til". Forsiden under det er nr. 01.' },
  { g: 'Upload-arket', n: '04', t: 'Billede valgt', p: '/', w: 390, only: SHEET, note: 'Efter kameraet eller kamerarullen. Intet er sendt endnu.',
    act: async (p) => { await openSheet(p); await setPhoto(p, 'work/audit/phone-photo.jpg'); } },
  { g: 'Upload-arket', n: '05', t: 'Forkert filtype', p: '/', w: 390, only: SHEET, note: 'Fejlen står ved feltet, ikke i toppen, og siger hvad man gør i stedet.',
    act: async (p) => { await openSheet(p); await setPhoto(p, 'package.json'); } },
  { g: 'Upload-arket', n: '06', t: 'Har ikke billedet lige nu', p: '/', w: 390, only: SHEET, note: 'Udvejen for den, der står i bussen: send linket til sig selv.',
    act: async (p) => { await openSheet(p); await clickText(p, 'Jeg har ikke billedet lige nu'); } },

  ...(P ? [
    { g: 'Bestillingssiden', n: '07', t: 'Bestilling — telefon', p: P, w: 390, shown: '/p/<ordre-id>', fresh: true, act: async (p) => { await clearCopies(p); await toColour(p); }, note: 'STANDARD — det en ny kunde ser: 30×40, sort ramme, 0 ekstra, 599 kr. Vist her i den farvelagte udgave.' },
    { g: 'Bestillingssiden', n: '08', t: 'Bestilling — desktop', p: P, w: 1280, shown: '/p/<ordre-id>', note: '' },
    { g: 'Bestillingssiden', n: '09', t: 'Set tæt på', p: P, w: 390, shown: '/p/<ordre-id>', note: 'Begge sider skaleres 2,2× fra samme punkt, så sammenligningen bliver ved med at være ærlig.',
      fresh: true, act: async (p) => clickText(p, 'Se tæt på') },
    { g: 'Bestillingssiden', n: '10', t: 'Vist i sort-hvid', p: P, w: 390, shown: '/p/<ordre-id>', note: 'Den anden halvdel af knappen. Farvelægningen er lavet på forhånd, så skiftet ikke koster ventetid — og valget gemmes på ordren.',
      fresh: true, act: toMono },
    { g: 'Bestillingssiden', n: '11', t: 'Et eksemplar mere', p: P, w: 390, shown: '/p/<ordre-id>', note: 'EFTER ET TRYK på "Tilføj et eksemplar" — ikke en standardtilstand. Sådan ser regningen ud, når kunden selv har valgt et eksemplar mere: 599 + 349 = 948 kr. Standarden er nr. 07.',
      fresh: true, act: addCopy, after: clearCopies },
  ] : []),

  { g: 'Efter betaling', n: '12', t: 'Kvittering — ubekræftet', p: '/tak?session_id=cs_test_preview', w: 390, note: 'Reservetilstanden: Stripe kendte ikke ordren. Den rigtige kvittering kræver en gennemført betaling.' },
  ...(APPR ? [
    { g: 'Efter betaling', n: '13', t: 'Godkendelsesside', p: `/godkend/${APPR}`, w: 390, shown: '/godkend/<nøgle>', note: 'Kunden ser det færdige billede og siger ja, før noget bliver printet.' },
    { g: 'Efter betaling', n: '14', t: 'Bed om en ændring', p: `/godkend/${APPR}/aendring`, w: 390, shown: '/godkend/<nøgle>/aendring', note: '' },
  ] : []),

  { g: 'Det juridiske', n: '15', t: 'Privatlivspolitik', p: '/privatliv', w: 390, note: '' },
  { g: 'Det juridiske', n: '16', t: 'Handelsbetingelser', p: '/handelsbetingelser', w: 390, note: 'CVR og adresse mangler i founder.md: feltet udelades i produktion, og buildet nægter at deploye uden det. Stripe kræver et link hertil, før Checkout åbner.' },

  { g: 'Admin', n: '17', t: 'Log ind', p: '/admin', w: 390, note: '' },
  ...(ADMIN ? [{ g: 'Admin', n: '18', t: 'Ordrer', p: '/admin', w: 1280, note: 'Tom, fordi ubetalte previews er skjult som standard. Nul betalte ordrer nogensinde.', login: true }] : []),

  { g: 'Resten', n: '19', t: 'Ikke fundet', p: '/findes-ikke', w: 390, note: 'Samme side som et udløbet preview-link eller et brugt godkendelseslink rammer.' },
];

const MAILS = [
  ['20', 'Ordrebekræftelse', 'confirmation', 'Sendes i sekundet betalingen går igennem.'],
  ['21', 'Billedet er klar', 'approval', 'Den mail hele forretningen hænger på: kunden godkender, før vi printer.'],
  ['22', 'Ændring modtaget', 'change', 'Kvittering for at nogen har læst ønsket.'],
  ['23', 'Pengene er sendt tilbage', 'refund', 'Sendes automatisk, hvis den samme ordre bliver betalt to gange.'],
  ['24', 'Pakken er afsendt', 'shipped', ''],
];

const placeholder = (w, h, label) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#ddd6c8"/><text x="50%" y="50%" font-family="sans-serif" font-size="${Math.max(11, Math.round(Number(w) / 20))}" fill="#6b655c" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`)}`;

function clean(inner) {
  inner = inner.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<template[\s\S]*?<\/template>/gi, '');
  inner = inner.replace(/<link[^>]*>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  inner = inner.replace(/<!--[\s\S]*?-->/g, '');
  inner = inner.replace(/<next-route-announcer[\s\S]*?<\/next-route-announcer>/gi, '').replace(/<nextjs-portal[\s\S]*?<\/nextjs-portal>/gi, '');
  inner = inner.replace(/<source[^>]*>/gi, '');
  inner = inner.replace(/<img\b([^>]*)>/gi, (tag, attrs) => {
    const alt = (attrs.match(/\salt="([^"]*)"/) || [])[1] ?? '';
    const w = (attrs.match(/\swidth="(\d+)"/) || [])[1] ?? '1200';
    const h = (attrs.match(/\sheight="(\d+)"/) || [])[1] ?? '900';
    const cls = (attrs.match(/\sclass="([^"]*)"/) || [])[1];
    const st = (attrs.match(/\sstyle="([^"]*)"/) || [])[1];
    return `<img${cls ? ` class="${cls}"` : ''}${st ? ` style="${st}"` : ''} src="${placeholder(w, h, 'foto')}" alt="${alt}" width="${w}" height="${h}">`;
  });
  // belt and braces: no signed storage URL, no key, no live token ever leaves in this file
  inner = inner.replace(/https?:\/\/[^"' )]*supabase[^"' )]*/gi, 'about:blank');
  inner = inner.replace(/\bdata:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+/g, placeholder(600, 800, 'valgt foto'));
  for (const [v, r] of [[PTOKEN, 'DELINGSNOEGLE'], [PID, '00000000-0000-0000-0000-000000000000'], [APPR, 'GODKENDELSESNOEGLE'], [ADMIN, 'ADGANGSKODE']]) if (v) inner = inner.split(v).join(r);
  return inner.replace(/\ssrcset="[^"]*"/gi, '').replace(/\sdata-src="[^"]*"/gi, '');
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctxs = {
  390: await b.newContext({ ...devices['iPhone 14'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'da-DK' }),
  1280: await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'da-DK' }),
};
const parts = [];
let group = '';
for (const pg of PAGES) {
  const ctx = pg.fresh ? await b.newContext({ ...devices['iPhone 14'], viewport: { width: pg.w, height: 844 }, deviceScaleFactor: 2, locale: 'da-DK' }) : ctxs[pg.w];
  const p = await ctx.newPage();
  await p.goto(BASE + pg.p, { waitUntil: 'networkidle' }).catch(() => null);
  if (pg.login) { const f = await p.$('input[type=password]'); if (f) { await f.fill(ADMIN); await p.click('button[type=submit]'); await p.waitForLoadState('networkidle'); } }
  await p.waitForTimeout(1200);
  if (pg.act) await pg.act(p);
  const inner = pg.only
    ? await p.evaluate((sel) => document.querySelector(sel)?.outerHTML ?? '<p>arket blev ikke fundet</p>', pg.only)
    : await p.evaluate(() => document.body.innerHTML);
  if (pg.g !== group) { group = pg.g; parts.push(`<h2 class="rv-group">${group}</h2>`); }
  parts.push(`<section class="rv-page rv-w${pg.w}" id="p${pg.n}">
  <header class="rv-head"><p class="rv-n">${pg.n} · ${pg.w} px</p><h3 class="rv-t">${pg.t}</h3>
  <p class="rv-u">${pg.shown ?? pg.p}</p>${pg.note ? `<p class="rv-note">${pg.note}</p>` : ''}</header>
  <div class="rv-frame">${clean(inner)}</div>
</section>`);
  if (pg.after) await pg.after(p);
  console.log(pg.n, pg.t.padEnd(26), (inner.length / 1024).toFixed(0) + ' kB');
  await p.close();
  if (pg.fresh) await ctx.close();
}
await b.close();

// the mails, each sealed in its own document so its table styling cannot touch the site's
parts.push('<h2 class="rv-group">Mails</h2>');
for (const [n, title, file, note] of MAILS) {
  const path = `work/emails/${file}.html`;
  if (!fs.existsSync(path)) { console.log(n, title, '— missing, run npm run email:preview'); continue; }
  let html = fs.readFileSync(path, 'utf8');
  html = html.replace(/<img\b([^>]*)>/gi, (t, a) => `<img src="${placeholder(560, 380, 'foto')}" alt="${(a.match(/\salt="([^"]*)"/) || [])[1] ?? ''}" width="560" height="380">`);
  html = html.replace(/https?:\/\/[^"' )]*supabase[^"' )]*/gi, 'about:blank');
  parts.push(`<section class="rv-page rv-w600" id="p${n}">
  <header class="rv-head"><p class="rv-n">${n} · mail</p><h3 class="rv-t">${title}</h3>${note ? `<p class="rv-note">${note}</p>` : ''}</header>
  <iframe class="rv-mail" title="${title}" srcdoc="${html.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe>
</section>`);
  console.log(n, title.padEnd(26), (html.length / 1024).toFixed(0) + ' kB');
}

let css = fs.readFileSync('app/globals.css', 'utf8');
css = css.replace(/@font-face \{[\s\S]*?\}\n/g, '');
css = css.replace(/--display: [^;]+;/, "--display: 'Newsreader', Georgia, 'Times New Roman', serif; /* self-hosted woff2 on the real site */");
css = css.replace(/--sans: [^;]+;/, "--sans: 'Public Sans', -apple-system, 'Helvetica Neue', Arial, sans-serif; /* self-hosted woff2 on the real site */");

const review = `
/* --- review chrome: not part of the site --- */
body { margin: 0; background: #2a2724; }
.rv-group { max-width: 1320px; margin: 0 auto; padding: 56px 20px 0; font-family: 'Newsreader', Georgia, serif;
  font-size: 26px; font-weight: 400; color: #fff; border-top: 1px solid #46413b; }
.rv-page { max-width: 430px; margin: 0 auto 56px; }
.rv-page.rv-w1280 { max-width: 1320px; }
.rv-page.rv-w600 { max-width: 640px; }
.rv-head { padding: 30px 20px 14px; font-family: 'Public Sans', -apple-system, sans-serif; }
.rv-n { margin: 0; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #a09789; }
.rv-t { margin: 4px 0 2px; font-size: 20px; font-weight: 600; color: #fff; font-family: 'Public Sans', sans-serif; }
.rv-u { margin: 0; font-size: 12px; color: #8fa88f; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.rv-note { margin: 8px 0 0; font-size: 13px; line-height: 1.5; color: #b8b0a3; max-width: 52ch; }
/* each screen renders inside its own frame, so one page's fixed bar cannot sit on top of the next */
.rv-frame { position: relative; overflow: hidden; background: var(--paper, #F6F1E8); border-radius: 14px;
  box-shadow: 0 18px 50px rgba(0,0,0,.45); contain: layout paint; }
.rv-frame [style*="position:fixed"], .rv-frame [style*="position: fixed"] { position: absolute !important; }
.rv-frame > .sheet { position: static !important; inset: auto !important; max-height: none !important; transform: none !important; }
.rv-mail { width: 100%; height: 760px; border: 0; border-radius: 14px; background: #fff; box-shadow: 0 18px 50px rgba(0,0,0,.45); }
.rv-index { max-width: 640px; margin: 0 auto; padding: 48px 20px 8px; font-family: 'Public Sans', sans-serif; color: #efeae1; }
.rv-index h1 { font-family: 'Newsreader', Georgia, serif; font-size: 32px; font-weight: 400; margin: 0 0 8px; color: #fff; }
.rv-index p { font-size: 13.5px; line-height: 1.65; color: #b8b0a3; max-width: 56ch; }
.rv-index ol { padding-left: 1.3em; font-size: 14px; line-height: 1.85; columns: 2; column-gap: 32px; }
@media (max-width: 560px) { .rv-index ol { columns: 1; } }
.rv-index a { color: #cfc7b8; }
`;

const missing = [!APPR && 'godkendelsessiden og ændringsformularen (kræver en betalt ordre)', !ADMIN && 'admins ordreliste'].filter(Boolean);
fs.writeFileSync(OUT, `<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Genfundet — alle sider</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Public+Sans:wght@400;600&display=swap">
<style>
${css}
${review}
</style>
</head>
<body>
<div class="rv-index">
  <h1>Genfundet — alle skærme</h1>
  <p>Ægte markup og det rigtige stylesheet, som browseren har det: klientkomponenterne står i den
  tilstand, navnet siger. Telefonskærmene er 390 px, desktop 1280 px, mails 600 px. Fotografierne er
  grå felter i den rigtige form, så filen ikke indeholder billeddata — og hverken signerede
  lagerlinks, nøgler eller adgangskoder.</p>
  ${missing.length ? `<p><strong style="color:#e2b48c">Mangler:</strong> ${missing.join(' og ')}.</p>` : ''}
  <ol>
${parts.filter((s) => s.startsWith('<section')).map((s) => {
    const id = s.match(/id="(p\d+)"/)[1];
    const t = s.match(/<h3 class="rv-t">([^<]*)<\/h3>/)[1];
    return `    <li><a href="#${id}">${t}</a></li>`;
  }).join('\n')}
  </ol>
</div>
${parts.join('\n')}
</body>
</html>
`);
console.log('wrote', OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + ' kB');
