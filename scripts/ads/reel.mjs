// 9:16 reels with real motion, ~9.5 s: the hook comes in word by word over the scene, the old print lifts
// out of the scene and fills the screen, a wipe restores it in front of the viewer, the restored picture
// glides into a frame on the wall, then the CTA and the price. One animated page; every frame is rendered
// deterministically (seek(t) → screenshot), then ffmpeg joins them. Full-bleed, no letterbox, no zoompan.
//   node scripts/ads/reel.mjs [<key> …]      (no key = every concept with a `reel`)
// Output: work/ads/video/<key>-9x16.mp4 (frames in work/ads/video/frames/<key>/, deleted after the encode).
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pick, pairSrc } from './concepts.mjs';
import { jpg, FONTS, MARK, WALL, ARROW } from './html.mjs';

const FPS = 30, W = 1080, H = 1920;
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** The reel page. `r` = the concept's reel spec, `c` = the concept. */
function page(c, r) {
  const ugc = c.style === 'ugc';
  const hook = c.hooks[0];
  const price = c.price ?? '';
  const cta = c.cta;
  const open = r.open; // { kind: 'scene', src, box } | { kind: 'print' } | { kind: 'before' }
  const cfg = {
    ugc, open: open.kind, box: open.box ?? null, zoom: open.zoom ?? null, line: r.line ?? '', endLine: r.endLine ?? '',
    // timeline (seconds)
    t: open.kind === 'before'
      ? { hookIn: 0.2, lift: null, wipe: 2.8, hold: 4.6, frame: 5.4, line: 6.3, end: 7.6, total: 9.4 }
      : { hookIn: 0.2, lift: 2.7, wipe: 4.0, hold: 5.8, frame: 6.4, line: 7.3, end: 8.4, total: 10.0 },
  };
  const wordSpans = ugc ? `<span class="cap w">${esc(hook)}</span>` : hook.split(' ').map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
  const capOpen = ugc ? '<span class="cap">' : '', capClose = ugc ? '</span>' : '';
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><style>
${FONTS}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #171614; color: #fbfaf7; font-family: 'Public Sans', Arial, sans-serif; }
.layer { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
#scenewrap { transform-origin: 50% 50%; }
#scene { position: absolute; left: -228px; top: 0; width: 1536px; height: ${H}px; object-fit: cover; }
#table { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 45%, #efe9dd 0%, #d9d0c1 70%, #c4b9a6 100%); }
#card { position: absolute; background: #f4efe4; box-shadow: 0 30px 60px -20px rgba(0,0,0,.6), 0 2px 6px rgba(0,0,0,.25); overflow: hidden; }
#card img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.full { position: absolute; object-fit: cover; }
#seam { position: absolute; top: 0; height: ${H}px; width: 4px; margin-left: -2px; background: #fbfaf7; box-shadow: 0 0 18px rgba(251,250,247,.9); opacity: 0; }
#wall { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: cover; }
#frame { position: absolute; padding: 20px; background: #111; box-shadow: 0 34px 70px -22px rgba(0,0,0,.6), 0 4px 10px rgba(0,0,0,.25); }
#mat { position: absolute; inset: 20px; background: #f6f2ea; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
#dim { position: absolute; inset: 0; background: #171614; opacity: 0; }
#shade { position: absolute; inset: 0; background: linear-gradient(to ${r.hookAt === 'bottom' ? 'top' : 'bottom'}, rgba(23,22,20,.7) 0%, rgba(23,22,20,.35) 30%, rgba(23,22,20,0) 55%); opacity: 0; }
#hook { position: absolute; left: 64px; right: 64px; top: ${r.hookAt === 'bottom' ? 1330 : 330}px; font: 700 84px/1.06 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.02em; text-shadow: 0 2px 16px rgba(23,22,20,.5); text-wrap: balance; }
#hook .w { display: inline-block; opacity: 0; transform: translateY(24px); }
#line { position: absolute; left: 64px; right: 64px; top: 1380px; font: 600 40px/1.25 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.01em; text-shadow: 0 2px 12px rgba(23,22,20,.6); opacity: 0; }
#end { position: absolute; left: 0; right: 0; top: 1310px; display: flex; flex-direction: column; align-items: center; gap: 22px; padding: 0 64px; text-align: center; opacity: 0; }
#endline { font: 700 50px/1.15 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.02em; text-wrap: balance; margin-bottom: 8px; }
.btn { display: inline-flex; align-items: center; gap: 14px; padding: 0 44px; height: 98px; border-radius: 999px; background: #fbfaf7; color: #171614; font: 700 37px/1 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.01em; white-space: nowrap; }
.btn svg { width: 32px; height: 32px; }
#price { font: 700 36px/1.2 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.01em; }
#brand { margin-top: 26px; display: inline-flex; align-items: center; gap: 10px; font: 500 30px/1 'Newsreader', Georgia, serif; opacity: .85; }
#brand img { width: 32px; height: 32px; background: #fbfaf7; border-radius: 4px; }
/* UGC: caption boxes, no brand mark */
.cap { display: inline; padding: 8px 22px; background: #fff; color: #111; -webkit-box-decoration-break: clone; box-decoration-break: clone; font: 700 60px/1.6 'Public Sans', Arial, sans-serif; letter-spacing: -0.01em; text-shadow: none; border-radius: 8px; }
.cap.ink { background: #111; color: #fff; }
.ugc #hook { font: 700 60px/1.6 'Public Sans', Arial, sans-serif; text-shadow: none; transform: rotate(-1.5deg); }
.ugc #line { font: 700 44px/1.6 'Public Sans', Arial, sans-serif; text-shadow: none; }
.ugc #end { top: 1290px; gap: 18px; }
.ugc #end .btn { display: none; }
.ugc #end .capline { font-size: 52px; }
.ugc #brand { display: none; }
.ugc #ugcsite { font: 700 30px/1 'Public Sans', Arial, sans-serif; letter-spacing: .06em; color: #fff; opacity: .9; margin-top: 26px; text-shadow: 0 1px 8px rgba(0,0,0,.6); }
</style></head><body class="${ugc ? 'ugc' : ''}">
<div id="scenewrap" class="layer">
  ${open.kind === 'scene' ? `<img id="scene" src="${jpg(open.src)}" alt="">` : open.kind === 'print' ? `<div id="table"></div>` : ''}
  <div id="card"><img src="${jpg(pairSrc(c.pair, 'before'))}" alt=""></div>
</div>
<img id="after" class="full" src="${jpg(pairSrc(c.pair, 'after'))}" alt="">
<img id="before" class="full" src="${jpg(pairSrc(c.pair, 'before'))}" alt="">
<div id="seam"></div>
<div id="wallgrp" class="layer" style="opacity:0"><img id="wall" src="${WALL}" alt=""><div id="frame"><div id="mat"></div></div></div>
<img id="framed" class="full" src="${jpg(pairSrc(c.pair, 'after'))}" alt="" style="opacity:0">
<div id="dim"></div>
<div id="shade"></div>
<div id="hook">${wordSpans}</div>
<div id="line">${capOpen}${esc(cfg.line)}${capClose}</div>
<div id="end">
  ${cfg.endLine ? `<div id="endline">${capOpen}${esc(cfg.endLine)}${capClose}</div>` : ''}
  ${ugc ? `<div class="capline"><span class="cap">${esc(cta)}</span></div>` : `<div class="btn">${esc(cta)} ${ARROW}</div>`}
  ${price ? (ugc ? `<div class="capline"><span class="cap ink">${esc(price)}</span></div>` : `<div id="price">${esc(price)}</div>`) : ''}
  ${ugc ? `<div id="ugcsite">billedearv.dk</div>` : `<div id="brand"><img src="${MARK}" alt="">Billedearv</div>`}
</div>
<script>
const CFG = ${JSON.stringify(cfg)};
const W = ${W}, H = ${H}, S = H / 1350, OX = -228;
const clamp = (v) => Math.max(0, Math.min(1, v));
const eio = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eo = (x) => 1 - Math.pow(1 - x, 3);
const lerp = (a, b, k) => a + (b - a) * k;
const rect = (el, r) => { el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px'; };
const FULL = { x: (W - H * 0.666) / 2, y: 0, w: H * 0.666, h: H }; // the pair covers the screen (9:16 is narrower than 2:3)
// the frame on the wall: photo rect + frame/mat
const FR = { frame: 20, mat: 56 };
const fh = Math.round(H * 0.645) - 470 - 30, ph = fh - 2 * (FR.frame + FR.mat), pw = Math.round(ph * 0.666), fw = pw + 2 * (FR.frame + FR.mat);
const frameRect = { x: Math.round((W - fw) / 2), y: 470, w: fw, h: fh };
const photoRect = { x: frameRect.x + FR.frame + FR.mat, y: frameRect.y + FR.frame + FR.mat, w: pw, h: ph };
rect(document.getElementById('frame'), frameRect);
// where the old print sits at the start: the scene's print box (4:5 px → screen px), a card on the table, or full
const startBox = CFG.open === 'scene' && CFG.box
  ? { x: CFG.box.x * S + OX, y: CFG.box.y * S, w: CFG.box.w * S, h: CFG.box.h * S }
  : CFG.open === 'print' ? { x: (W - 720) / 2, y: (H - 720 / 0.666) / 2 - 60, w: 720, h: 720 / 0.666 }
  : FULL;
const $ = (id) => document.getElementById(id);
const Z0 = CFG.zoom ?? 1, ORG = CFG.zoom && startBox ? { x: startBox.x + startBox.w / 2, y: startBox.y + startBox.h * 0.35 } : { x: W / 2, y: H / 2 };
document.getElementById('scenewrap').style.transformOrigin = ORG.x + 'px ' + ORG.y + 'px';
const words = [...document.querySelectorAll('#hook .w')];
const T = CFG.t;

window.seek = (t) => {
  // scene: slow push-in until the lift, handheld drift for UGC
  const zoomEnd = T.lift ?? T.wipe;
  const z = Z0 * (1 + 0.05 * eo(clamp(t / zoomEnd)));
  const dx = CFG.ugc ? Math.sin(t * 1.3) * 6 : 0, dy = CFG.ugc ? Math.cos(t * 0.9) * 5 : 0, rot = CFG.ugc ? Math.sin(t * 0.7) * 0.4 : 0;
  $('scenewrap').style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg) scale(' + z + ')';
  $('shade').style.opacity = CFG.ugc ? 0 : clamp((t - 0) / 0.4) * (T.lift ? (1 - clamp((t - T.lift) / 0.5)) : 1 - clamp((t - T.wipe + 0.6) / 0.5));
  // hook: word by word, out before the lift / wipe
  const hookOut = T.lift ?? T.wipe;
  words.forEach((w, i) => {
    const k = eo(clamp((t - T.hookIn - i * 0.09) / 0.35));
    const out = clamp((t - (hookOut - 0.35)) / 0.3);
    w.style.opacity = k * (1 - out); w.style.transform = 'translateY(' + (24 - 24 * k - 30 * out) + 'px)';
  });
  // the card: sits in the scene, then lifts to fill the screen
  const card = $('card');
  if (CFG.open === 'before') { card.style.display = 'none'; }
  else {
    const k = T.lift ? eio(clamp((t - T.lift) / 0.7)) : 0;
    // target in scenewrap coordinates (the wrapper is scaled by z about the centre)
    const tgt = { x: ORG.x + (FULL.x - ORG.x) / z, y: ORG.y + (FULL.y - ORG.y) / z, w: FULL.w / z, h: FULL.h / z };
    rect(card, { x: lerp(startBox.x, tgt.x, k), y: lerp(startBox.y, tgt.y, k), w: lerp(startBox.w, tgt.w, k), h: lerp(startBox.h, tgt.h, k) });
    const pad = (CFG.open === 'print' ? 18 : Math.max(4, startBox.w * 0.045)) * (1 - k);
    card.style.padding = pad + 'px'; card.querySelector('img').style.inset = pad + 'px';
    card.style.transform = CFG.open === 'print' ? 'rotate(' + (-3 * (1 - k)) + 'deg)' : '';
    card.style.display = t < (T.lift ?? 0) + 0.7 ? 'block' : 'none';
  }
  // full-bleed before/after from the moment the card has filled the screen (or from the start)
  const fullFrom = T.lift ? T.lift + 0.7 : 0;
  const showFull = t >= fullFrom && t < T.frame;
  rect($('before'), FULL); rect($('after'), FULL);
  $('before').style.display = showFull ? 'block' : 'none';
  $('after').style.display = showFull ? 'block' : 'none';
  // wipe: the seam crosses left → right
  const wk = eio(clamp((t - T.wipe) / 1.6));
  $('before').style.clipPath = 'inset(0 ' + (wk * 100) + '% 0 0)';
  $('seam').style.left = (wk * W) + 'px';
  $('seam').style.opacity = t >= T.wipe && t <= T.wipe + 1.6 ? 1 - clamp((t - T.wipe - 1.45) / 0.15) : 0;
  // the restored picture glides into the frame on the wall
  const fk = eio(clamp((t - T.frame) / 0.9));
  $('wallgrp').style.opacity = clamp((t - T.frame) / 0.35);
  const fr = $('framed');
  fr.style.opacity = t >= T.frame ? 1 : 0;
  rect(fr, { x: lerp(FULL.x, photoRect.x, fk), y: lerp(FULL.y, photoRect.y, fk), w: lerp(FULL.w, photoRect.w, fk), h: lerp(FULL.h, photoRect.h, fk) });
  // the line under the frame, then the end: wall dims, CTA rises
  const lk = eo(clamp((t - T.line) / 0.4)) * (1 - clamp((t - T.end + 0.2) / 0.3));
  $('line').style.opacity = lk; $('line').style.transform = 'translateY(' + (20 - 20 * lk) + 'px)';
  const ek = eo(clamp((t - T.end) / 0.5));
  $('dim').style.opacity = 0.55 * ek;
  $('end').style.opacity = ek; $('end').style.transform = 'translateY(' + (30 - 30 * ek) + 'px)';
};
</script></body></html>`;
}

const which = pick(process.argv.slice(2)).filter((c) => c.reel);
const browser = await chromium.launch();
for (const c of which) {
  const r = c.reel;
  if (r.open.src && !existsSync(r.open.src)) { console.error(c.key, 'missing', r.open.src); continue; }
  const dir = resolve(`work/ads/video/frames/${c.key}`);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const tmp = resolve(`work/ads/video/.${c.key}-reel.html`);
  writeFileSync(tmp, page(c, r));
  const pg = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await pg.goto(`file:///${tmp.replace(/\\/g, '/')}`);
  await pg.evaluate(() => document.fonts.ready);
  const total = await pg.evaluate(() => CFG.t.total);
  const n = Math.round(total * FPS);
  for (let i = 0; i < n; i++) {
    await pg.evaluate((t) => window.seek(t), i / FPS);
    await pg.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 95 });
  }
  await pg.close();
  const out = `work/ads/video/${c.key}-9x16.mp4`;
  const res = spawnSync(ffmpeg, ['-y', '-framerate', String(FPS), '-i', `${dir}/%04d.jpg`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['ignore', 'ignore', 'pipe'] });
  if (res.status !== 0) { console.error(c.key, 'ffmpeg failed\n', res.stderr.toString().split('\n').slice(-8).join('\n')); continue; }
  rmSync(dir, { recursive: true, force: true });
  console.log('wrote', out, `${total.toFixed(1)} s, ${n} frames`);
}
await browser.close();
