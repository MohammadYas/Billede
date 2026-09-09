// HTML for one ad frame. The same picture + overlay engine draws every static (4:5, 1:1, 9:16) and every video
// shot, so a reel and its still look like one campaign. Order of dominance: hook → picture → CTA/price → brand
// (small). 9:16 keeps everything inside a centred 1080×1350 stage (Reels-safe) over a blurred backdrop.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pairSrc } from './concepts.mjs';

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`;
export const jpg = (p) => b64(p, 'image/jpeg');
const font = (f) => b64(resolve('public/fonts', f), 'font/woff2');
export const FONTS = `
@font-face { font-family: 'Schibsted Grotesk'; src: url('${font('SchibstedGrotesk-normal.woff2')}') format('woff2'); font-weight: 400 900; }
@font-face { font-family: 'Public Sans'; src: url('${font('PublicSans-normal.woff2')}') format('woff2'); font-weight: 400 700; }
@font-face { font-family: 'Newsreader'; src: url('${font('Newsreader-normal.woff2')}') format('woff2'); font-weight: 300 700; }`;
export const MARK = b64(resolve('public/logo-mark.png'), 'image/png');
export const WALL = jpg('public/mockup/wall.jpg');
export const ARROW = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const INK = '#171614', CREAM = '#fbfaf7';

/** The picture layer for a stage of W × SH. `pic` = { kind, src?, pos?, pair?, side?, seam? }. */
function picture(pic, W, SH) {
  const k = SH / 1350;
  if (pic.kind === 'scene') { const sh = Math.round((pic.shift ?? 0) * k); return `${sh ? `<img class="ph fill" src="${jpg(pic.src)}" alt="">` : ''}<img class="ph" src="${jpg(pic.src)}" style="object-position:${pic.pos ?? '50% 50%'}; top:${sh}px; height:calc(100% - ${sh}px)" alt="">`; }
  if (pic.kind === 'pair') return `<img class="ph" src="${jpg(pairSrc(pic.pair, pic.side))}" style="object-position:${pic.pos ?? '50% 30%'}" alt="">`;
  if (pic.kind === 'split') return `
    <img class="ph" src="${jpg(pairSrc(pic.pair, 'after'))}" style="object-position:${pic.pos}" alt="">
    <img class="ph" src="${jpg(pairSrc(pic.pair, 'before'))}" style="object-position:${pic.pos}; clip-path: inset(0 ${100 - pic.seam}% 0 0)" alt="">
    <div class="seam" style="left:${pic.seam}%"></div>
    <div class="lbl" style="left:${28 * k}px">Før</div><div class="lbl" style="right:${28 * k}px">Efter</div>`;
  if (pic.kind === 'framed') {
    const sideboard = Math.round(SH * 0.645), top = Math.round((pic.card ? 270 : 130) * k);
    const frame = Math.round(18 * k), mat = Math.round(50 * k), fh = sideboard - top - Math.round(24 * k);
    const ph = fh - 2 * (frame + mat), pw = Math.round(ph * 0.666), fw = pw + 2 * (frame + mat);
    const left = pic.card ? Math.round((W - fw) / 2 + 110 * k) : Math.round((W - fw) / 2);
    return `
    <img class="ph" src="${WALL}" style="object-position:50% 50%" alt="">
    <div class="frame" style="left:${left}px; top:${top}px; width:${fw}px; height:${fh}px; padding:${frame}px">
      <div class="mat" style="padding:${mat}px"><img src="${jpg(pairSrc(pic.pair, 'after'))}" alt=""></div>
    </div>
    ${pic.card ? `<div class="card" style="left:${Math.round(56 * k)}px; bottom:${Math.round(200 * k)}px; width:${Math.round(300 * k)}px; padding:${Math.round(14 * k)}px; transform:rotate(-7deg)"><img src="${jpg(pairSrc(pic.pair, 'before'))}" alt=""></div>` : ''}`;
  }
  if (pic.kind === 'print') return `
    <div class="table"></div>
    <div class="card big" style="left:50%; top:50%; width:${Math.round(720 * k)}px; padding:${Math.round(20 * k)}px; transform:translate(-50%,-50%) rotate(-3deg)"><img src="${jpg(pairSrc(pic.pair, pic.side ?? 'after'))}" alt=""></div>`;
  return '';
}

/** Text layers. `t` = { hook, sub, big, small, cta, price, line, brand } — any may be missing. */
function overlay(c, t, W, SH, where) {
  const k = SH / 1350;
  const ugc = c.style === 'ugc';
  const hookSize = Math.round((W === SH ? 66 : 76) * (t.hook && t.hook.length > 42 ? 0.86 : 1));
  const hookBlock = t.hook || t.sub || t.big ? `
    <div class="hook-block ${where}">
      ${t.hook ? `<h1 style="font-size:${hookSize}px">${ugc ? `<span class="cap">${esc(t.hook)}</span>` : esc(t.hook)}</h1>` : ''}
      ${t.big ? `<div class="big">${esc(t.big)}</div>` : ''}
      ${t.sub ? `<p class="sub">${ugc ? `<span class="cap">${esc(t.sub)}</span>` : esc(t.sub)}</p>` : ''}
    </div>` : '';
  const line = t.line ? `<div class="line"><span class="${ugc ? 'cap' : 'linebox'}">${esc(t.line)}</span></div>` : '';
  const row = t.cta ? (ugc ? `
    <div class="row ugc">
      <div><span class="cap">${esc(t.cta)}</span></div>
      ${t.price ? `<div style="margin-top:${Math.round(14 * k)}px"><span class="cap ink">${esc(t.price)}</span></div>` : ''}
    </div>` : `
    ${t.small ? `<div class="small">${esc(t.small)}</div>` : ''}
    <div class="row${c.stack1x1 && W === SH ? ' stack' : ''}">
      <div class="btn">${esc(t.cta)} ${ARROW}</div>
      <div class="right">${t.price ? `<div class="price">${esc(t.price)}</div>` : ''}${t.brand === false ? '' : `<div class="brand"><img src="${MARK}" alt="">Billedearv</div>`}</div>
    </div>`) : (t.brand === false || ugc ? '' : `<div class="brand corner"><img src="${MARK}" alt="">Billedearv</div>`);
  const shadeTop = !ugc && (t.hook || t.big) && where === 'top' ? '<div class="shade top"></div>' : '';
  const shadeBottom = !ugc && (t.cta || t.line || where === 'bottom') ? '<div class="shade bottom"></div>' : '';
  return `${shadeTop}${shadeBottom}${hookBlock}${line}${row}`;
}

/** Full-canvas end card (video). */
function endCard(c, t, W, H) {
  const ugc = c.style === 'ugc';
  return `<div class="end ${ugc ? 'ugc' : ''}">
    ${t.line ? `<div class="end-line">${ugc ? `<span class="cap">${esc(t.line)}</span>` : esc(t.line)}</div>` : ''}
    <div class="${ugc ? '' : 'btn'}">${ugc ? `<span class="cap">${esc(t.cta)}</span>` : `${esc(t.cta)} ${ARROW}`}</div>
    ${t.price ? `<div class="end-price">${ugc ? `<span class="cap ink">${esc(t.price)}</span>` : esc(t.price)}</div>` : ''}
    <div class="end-brand">${ugc ? 'billedearv.dk' : `<img src="${MARK}" alt="">Billedearv`}</div>
  </div>`;
}

/**
 * render(c, { W, H, pic, text, where })
 *   pic   picture spec (see picture()); null for a full-canvas end card
 *   text  { hook, sub, big, small, cta, price, line, brand }
 *   where 'top' | 'bottom' — where the hook block sits on the stage
 */
export function render(c, { W, H, pic, text, where = 'top' }) {
  const SH = H > W * 1.3 ? 1350 : H; // 9:16 → centred 1080×1350 stage
  const top = Math.round((H - SH) / 2);
  const k = SH / 1350;
  const ugc = c.style === 'ugc';
  const backdrop = pic && H !== SH ? `<img class="backdrop" src="${pic.kind === 'scene' ? jpg(pic.src) : pic.kind === 'split' || pic.kind === 'pair' || pic.kind === 'print' ? jpg(pairSrc(pic.pair, pic.side ?? 'after')) : WALL}" alt="">` : '';
  const css = `
${FONTS}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: ${INK}; color: ${CREAM}; font-family: 'Public Sans', Arial, sans-serif; }
.backdrop { position: absolute; inset: -40px; width: calc(100% + 80px); height: calc(100% + 80px); object-fit: cover; filter: blur(28px) brightness(.55); }
.stage { position: absolute; left: 0; top: ${top}px; width: ${W}px; height: ${SH}px; overflow: hidden; background: ${INK}; }
.ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.ph.fill { filter: blur(30px) brightness(.6); transform: scale(1.1); }
.seam { position: absolute; top: 0; bottom: 0; width: 3px; margin-left: -1.5px; background: ${CREAM}; opacity: .9; }
.lbl { position: absolute; top: ${Math.round(32 * k)}px; padding: ${Math.round(8 * k)}px ${Math.round(14 * k)}px; font: 700 ${Math.round(20 * k)}px/1 'Public Sans', Arial, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: ${CREAM}; background: rgba(23,22,20,.45); border-radius: 4px; }
.frame { position: absolute; background: #111; box-shadow: 0 ${Math.round(30 * k)}px ${Math.round(60 * k)}px -${Math.round(20 * k)}px rgba(0,0,0,.55), 0 ${Math.round(4 * k)}px ${Math.round(10 * k)}px rgba(0,0,0,.25); }
.mat { width: 100%; height: 100%; background: #f6f2ea; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
.mat img { display: block; width: 100%; height: 100%; object-fit: cover; box-shadow: inset 0 0 0 1px rgba(0,0,0,.2); }
.card { position: absolute; background: #f4efe4; box-shadow: 0 ${Math.round(24 * k)}px ${Math.round(48 * k)}px -${Math.round(16 * k)}px rgba(0,0,0,.6), 0 2px 6px rgba(0,0,0,.25); }
.card img { display: block; width: 100%; height: auto; }
.table { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 40%, #efe9dd 0%, #d9d0c1 70%, #c4b9a6 100%); }
.shade { position: absolute; left: 0; right: 0; pointer-events: none; }
.shade.top { top: 0; height: 40%; background: linear-gradient(to bottom, rgba(23,22,20,.82) 0%, rgba(23,22,20,.45) 45%, rgba(23,22,20,0) 100%); }
.shade.bottom { bottom: 0; height: 46%; background: linear-gradient(to top, rgba(23,22,20,.88) 0%, rgba(23,22,20,.5) 50%, rgba(23,22,20,0) 100%); }
.hook-block { position: absolute; left: ${Math.round(56 * k)}px; right: ${Math.round(56 * k)}px; }
.hook-block.top { top: ${Math.round(56 * k)}px; }
.hook-block.bottom { bottom: ${Math.round(190 * k)}px; }
h1 { font-family: 'Schibsted Grotesk', Arial, sans-serif; font-weight: 700; line-height: 1.05; letter-spacing: -0.02em; text-wrap: balance; text-shadow: 0 2px 14px rgba(23,22,20,.45); max-width: ${Math.round(W - 112 * k)}px; }
.big { margin-top: ${Math.round(18 * k)}px; font: 700 ${Math.round(46 * k)}px/1.1 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.015em; text-shadow: 0 2px 12px rgba(23,22,20,.45); }
.sub { margin-top: ${Math.round(16 * k)}px; font: 400 ${Math.round(32 * k)}px/1.3 'Public Sans', Arial, sans-serif; color: rgba(251,250,247,.92); text-shadow: 0 1px 10px rgba(23,22,20,.5); max-width: ${Math.round(W - 160 * k)}px; }
.line { position: absolute; left: ${Math.round(56 * k)}px; right: ${Math.round(56 * k)}px; bottom: ${Math.round(72 * k)}px; }
.linebox { display: inline-block; font: 600 ${Math.round(34 * k)}px/1.25 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.01em; text-shadow: 0 2px 12px rgba(23,22,20,.5); }
.small { position: absolute; left: ${Math.round(56 * k)}px; right: ${Math.round(56 * k)}px; bottom: ${Math.round(150 * k)}px; font: 400 ${Math.round(21 * k)}px/1.3 'Public Sans', Arial, sans-serif; color: rgba(251,250,247,.8); }
.row { position: absolute; left: ${Math.round(56 * k)}px; right: ${Math.round(56 * k)}px; bottom: ${Math.round(52 * k)}px; display: flex; align-items: flex-end; justify-content: space-between; gap: ${Math.round(24 * k)}px; }
.btn { display: inline-flex; align-items: center; gap: ${Math.round(14 * k)}px; padding: 0 ${Math.round(30 * k)}px; height: ${Math.round(78 * k)}px; border-radius: 999px; background: ${CREAM}; color: ${INK}; font: 700 ${Math.round(29 * k)}px/1 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.01em; white-space: nowrap; }
.btn svg { width: ${Math.round(26 * k)}px; height: ${Math.round(26 * k)}px; }
.right { text-align: right; }
.row.stack { flex-direction: column; align-items: flex-start; gap: ${Math.round(12 * k)}px; }
.row.stack .right { text-align: left; }
.price { max-width: ${Math.round(470 * k)}px; font: 700 ${Math.round(28 * k)}px/1.2 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.01em; text-shadow: 0 2px 10px rgba(23,22,20,.5); }
.brand { display: inline-flex; align-items: center; gap: ${Math.round(8 * k)}px; margin-top: ${Math.round(10 * k)}px; font: 500 ${Math.round(22 * k)}px/1 'Newsreader', Georgia, serif; opacity: .8; }
.brand img { width: ${Math.round(24 * k)}px; height: ${Math.round(24 * k)}px; display: block; background: ${CREAM}; border-radius: 4px; }
.brand.corner { position: absolute; right: ${Math.round(56 * k)}px; bottom: ${Math.round(52 * k)}px; }
/* UGC: Instagram-style caption boxes, no gradients, no brand */
.cap { display: inline; padding: ${Math.round(6 * k)}px ${Math.round(18 * k)}px; background: #fff; color: #111; -webkit-box-decoration-break: clone; box-decoration-break: clone; font: 700 ${Math.round(52 * k)}px/1.62 'Public Sans', Arial, sans-serif; letter-spacing: -0.01em; text-shadow: none; border-radius: ${Math.round(6 * k)}px; }
.cap.ink { background: #111; color: #fff; }
.ugc h1 { text-shadow: none; }
.ugc .hook-block { transform: rotate(-1.5deg); transform-origin: left top; }
.ugc .sub .cap { font-size: ${Math.round(40 * k)}px; }
.row.ugc { display: block; transform: rotate(-1.5deg); transform-origin: left bottom; }
.row.ugc .cap { font-size: ${Math.round(44 * k)}px; }
.ugc .line .cap { font-size: ${Math.round(44 * k)}px; }
.ugc .stage::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 ${Math.round(220 * k)}px rgba(0,0,0,.35); pointer-events: none; }
/* end card */
.end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; padding: 0 72px; text-align: center; background: ${INK}; }
.end.ugc { background: ${CREAM}; color: ${INK}; }
.end .btn { height: 96px; font-size: 36px; padding: 0 44px; }
.end-line { font: 700 52px/1.15 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.02em; text-wrap: balance; margin-bottom: 18px; }
.end-price { font: 700 36px/1.2 'Schibsted Grotesk', Arial, sans-serif; letter-spacing: -0.01em; }
.end-brand { margin-top: 80px; display: inline-flex; align-items: center; gap: 10px; font: 500 30px/1 'Newsreader', Georgia, serif; opacity: .85; }
.end-brand img { width: 32px; height: 32px; background: ${CREAM}; border-radius: 4px; }
.end.ugc .end-line, .end.ugc .end-price { line-height: 1.7; }
.end.ugc .cap { font-size: 56px; }
.end.ugc .end-brand { font: 600 30px/1 'Public Sans', Arial, sans-serif; letter-spacing: .04em; opacity: .6; }`;
  const body = pic
    ? `${backdrop}<div class="stage ${ugc ? 'ugc' : ''}">${picture(pic, W, SH)}${overlay(c, text, W, SH, where)}</div>`
    : endCard(c, text, W, H);
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><style>${css}</style></head><body class="${ugc ? 'ugc' : ''}">${body}</body></html>`;
}

/** The static for a concept: its visual, its hook, its CTA row. */
export function staticFrame(c, hook, W, H) {
  const v = c.visual;
  const pic = v.kind === 'framed' ? { kind: 'framed', pair: c.pair, card: true } : v;
  return render(c, { W, H, pic, where: c.text ?? 'top', text: { hook, sub: c.sub, big: c.big, small: c.small, cta: c.cta, price: c.price } });
}

/** One video shot (9:16). */
export function shotFrame(c, shot, hook, W = 1080, H = 1920) {
  const pair = c.pair;
  const pic = shot.type === 'scene' ? { kind: 'scene', src: shot.src, pos: shot.pos }
    : shot.type === 'before' || shot.type === 'after' ? { kind: 'pair', pair, side: shot.type, pos: c.pairPos }
    : shot.type === 'framed' ? { kind: 'framed', pair }
    : shot.type === 'print' ? { kind: 'print', pair, side: shot.side ?? 'after' }
    : null;
  const text = shot.type === 'end'
    ? { cta: c.cta, price: c.price ?? (c.sub?.includes('599') ? c.sub : null), line: shot.line }
    : { hook: shot.hook ? hook : undefined, sub: shot.hook ? c.sub : undefined, line: shot.line, brand: false };
  return render(c, { W, H, pic, text, where: 'top' });
}
