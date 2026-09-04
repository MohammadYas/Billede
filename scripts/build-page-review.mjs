/**
 * One paste-able HTML file with every page of the site: the real DOM (client components included),
 * the real stylesheet, and grey placeholders where the photographs are. A design reviewer sees the
 * layout, the type, the spacing and the copy without a single byte of image data — and without any
 * signed storage URL leaving the machine.
 *
 *   node work/tour/build-all.mjs <base-url> <out.html>
 */
import fs from 'node:fs';
import { chromium, devices } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3111';
const OUT = process.argv[3] ?? 'work/tour/alle-sider.html';
const PID = process.env.PID, PTOKEN = process.env.PTOKEN, ADMIN = process.env.ADMIN_PASSWORD;

const PAGES = [
  { n: '01', t: 'Forside', p: '/', note: 'Det første en kold besøgende fra Meta ser.' },
  { n: '02', t: 'Upload-ark', p: '/', note: 'Arket der glider op, når man trykker "Se dit billede nu". Forsiden under det er nr. 01.', open: true, only: '.sheet[role=dialog]' },
  ...(PID ? [{ n: '03', t: 'Bestillingsside', p: `/p/${PID}?t=${PTOKEN}`, shown: '/p/<ordre-id>', note: 'Produktsiden: resultatet, størrelse, ramme, regning, bestil.' }] : []),
  { n: '04', t: 'Kvittering', p: '/tak?session_id=cs_test_preview', note: 'Vist her i sin reservetilstand — betalingen kunne ikke bekræftes, fordi ordren er opdigtet.' },
  { n: '05', t: 'Privatlivspolitik', p: '/privatliv', note: '' },
  { n: '06', t: 'Handelsbetingelser', p: '/handelsbetingelser', note: 'CVR og adresse står stadig som [Udfyld: …].' },
  { n: '07', t: 'Admin — log ind', p: '/admin', note: '' },
  ...(ADMIN ? [{ n: '08', t: 'Admin — ordrer', p: '/admin', note: 'Tom, fordi ubetalte previews er skjult som standard. Nul betalte ordrer.', login: true }] : []),
  { n: '09', t: 'Ikke fundet', p: '/findes-ikke', note: 'Samme side som et udløbet godkendelseslink rammer.' },
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
  // belt and braces: no signed storage URL, no api key, ever leaves in this file
  inner = inner.replace(/https?:\/\/[^"' )]*supabase[^"' )]*/gi, 'about:blank');
  // the share token is a live key to that preview, and the order id identifies a real row
  if (PTOKEN) inner = inner.split(PTOKEN).join('DELINGSNOEGLE');
  if (PID) inner = inner.split(PID).join('00000000-0000-0000-0000-000000000000');
  inner = inner.replace(/\ssrcset="[^"]*"/gi, '').replace(/\sdata-src="[^"]*"/gi, '');
  return inner;
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await b.newContext({ ...devices['iPhone 14'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'da-DK' });
const parts = [];
for (const pg of PAGES) {
  const p = await ctx.newPage();
  await p.goto(BASE + pg.p, { waitUntil: 'networkidle' }).catch(() => null);
  if (pg.login) {
    const f = await p.$('input[type=password]');
    if (f) { await f.fill(ADMIN); await p.click('button[type=submit]'); await p.waitForLoadState('networkidle'); }
  }
  await p.waitForTimeout(1400);
  if (pg.open) { await p.evaluate(() => window.dispatchEvent(new CustomEvent('gf:open'))); await p.waitForTimeout(900); }
  // the upload sheet is the whole point of page 02; the landing page under it is already page 01
  const inner = pg.only
    ? await p.evaluate((sel) => document.querySelector(sel)?.outerHTML ?? '', pg.only)
    : await p.evaluate(() => document.body.innerHTML);
  parts.push(`<section class="rv-page" id="p${pg.n}">
  <header class="rv-head">
    <p class="rv-n">${pg.n}</p>
    <h2 class="rv-t">${pg.t}</h2>
    <p class="rv-u">${pg.shown ?? pg.p}</p>
    ${pg.note ? `<p class="rv-note">${pg.note}</p>` : ''}
  </header>
  <div class="rv-frame">${clean(inner)}</div>
</section>`);
  console.log(pg.n, pg.t, '→', (inner.length / 1024).toFixed(0) + ' kB DOM');
  await p.close();
}
await b.close();

let css = fs.readFileSync('app/globals.css', 'utf8');
css = css.replace(/@font-face \{[\s\S]*?\}\n/g, '');
css = css.replace(/--display: [^;]+;/, "--display: 'Newsreader', Georgia, 'Times New Roman', serif; /* self-hosted woff2 on the real site */");
css = css.replace(/--sans: [^;]+;/, "--sans: 'Public Sans', -apple-system, 'Helvetica Neue', Arial, sans-serif; /* self-hosted woff2 on the real site */");

const review = `
/* --- review chrome: not part of the site --- */
body.rv { margin: 0; background: #2a2724; }
.rv-page { max-width: 430px; margin: 0 auto 64px; }
.rv-head { padding: 40px 20px 14px; color: #efeae1; font-family: 'Public Sans', -apple-system, sans-serif; }
.rv-n { margin: 0; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #a09789; }
.rv-t { margin: 4px 0 2px; font-size: 21px; font-weight: 600; color: #fff; font-family: 'Public Sans', sans-serif; }
.rv-u { margin: 0; font-size: 12px; color: #8fa88f; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.rv-note { margin: 8px 0 0; font-size: 13px; line-height: 1.5; color: #b8b0a3; max-width: 46ch; }
/* each page renders inside its own frame, so the fixed bars of one page cannot sit on top of another */
.rv-frame { position: relative; overflow: hidden; background: var(--paper, #F6F1E8); border-radius: 14px; box-shadow: 0 18px 50px rgba(0,0,0,.45); contain: layout paint; }
.rv-frame [style*="position:fixed"], .rv-frame [style*="position: fixed"] { position: absolute !important; }
.rv-frame > .sheet { position: static !important; inset: auto !important; max-height: none !important; transform: none !important; }
.rv-index { max-width: 430px; margin: 0 auto; padding: 48px 20px 8px; font-family: 'Public Sans', sans-serif; color: #efeae1; }
.rv-index h1 { font-family: 'Newsreader', Georgia, serif; font-size: 30px; font-weight: 400; margin: 0 0 6px; color: #fff; }
.rv-index p { font-size: 13px; line-height: 1.6; color: #b8b0a3; max-width: 46ch; }
.rv-index ol { padding-left: 1.2em; font-size: 14px; line-height: 1.9; }
.rv-index a { color: #cfc7b8; }
`;

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
<body class="rv">
<div class="rv-index">
  <h1>Genfundet — alle sider</h1>
  <p>Ægte markup og det rigtige stylesheet fra siden, gengivet i telefonbredde (390 px). Fotografierne er
  erstattet af grå felter i den rigtige form, så der ikke ligger billeddata i filen. Kopiér hele filen ind
  hvor som helst — den henter kun to skrifter udefra.</p>
  <ol>
${PAGES.map((p) => `    <li><a href="#p${p.n}">${p.t}</a> <span style="opacity:.55">${p.shown ?? p.p}</span></li>`).join('\n')}
  </ol>
</div>
${parts.join('\n')}
</body>
</html>
`);
console.log('wrote', OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + ' kB');
