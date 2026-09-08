// 9:16 reels, 6–12 s, from the concept's shot list: hook → before → (wipe) after → the physical result → CTA.
//   node scripts/ads/video.mjs [<key> …]      (no key = every concept that has a `video` list)
// Shots are rendered with the same templates as the statics, then joined by ffmpeg (30 fps, H.264, silent —
// Meta feeds are muted by default; the hook is on screen, not in a voice). The before → after cut is a wipe,
// so the transformation is the transition itself.
// Output: work/ads/video/<key>-9x16.mp4 (shots kept in work/ads/video/shots/ for a manual edit).
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pick } from './concepts.mjs';
import { shotFrame } from './html.mjs';

const FPS = 30, W = 1080, H = 1920, XFADE = 0.5, WIPE = 0.9;
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const which = pick(process.argv.slice(2)).filter((c) => c.video);

mkdirSync('work/ads/video/shots', { recursive: true });
const browser = await chromium.launch();
for (const c of which) {
  const missing = c.video.filter((s) => s.src && !existsSync(s.src)).map((s) => s.src);
  if (missing.length) { console.error(c.key, 'missing', missing.join(', ')); continue; }
  const files = [];
  for (const [i, shot] of c.video.entries()) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const tmp = resolve(`work/ads/video/shots/.${c.key}-${i}.html`);
    writeFileSync(tmp, shotFrame(c, shot, c.hooks[0], W, H));
    await page.goto(`file:///${tmp.replace(/\\/g, '/')}`);
    await page.evaluate(() => document.fonts.ready);
    const png = resolve(`work/ads/video/shots/${c.key}-${i + 1}-${shot.type}.png`);
    await page.screenshot({ path: png, type: 'png' });
    await page.close();
    files.push(png);
  }
  // Each still becomes a clip with a slow push-in. Scale at 2× + centred crop + downscale, so a step is a quarter pixel (never zoompan: it rounds
  // x/y to whole pixels every frame and the picture shakes). Clips are chained with xfade (wipe for the reveal).
  const inputs = files.flatMap((f, i) => ['-loop', '1', '-framerate', String(FPS), '-t', String(c.video[i].d), '-i', f]);
  const clips = c.video.map((s, i) => {
    return `[${i}:v]scale=w='${W * 2}*(1+0.04*t/${s.d})':h='${H * 2}*(1+0.04*t/${s.d})':eval=frame:flags=lanczos,crop=${W * 2}:${H * 2},scale=${W}:${H}:flags=lanczos,setsar=1,fps=${FPS},format=yuv420p[v${i}]`;
  });
  let chain = '', prev = 'v0', offset = 0;
  for (let i = 1; i < c.video.length; i++) {
    const t = c.video[i].transition === 'wipeleft' ? WIPE : XFADE;
    offset += c.video[i - 1].d - t;
    const out = i === c.video.length - 1 ? 'out' : `x${i}`;
    chain += `[${prev}][v${i}]xfade=transition=${c.video[i].transition ?? 'fade'}:duration=${t}:offset=${offset.toFixed(2)}[${out}];`;
    prev = out;
  }
  const filter = clips.join(';') + ';' + chain.replace(/;$/, '');
  const out = `work/ads/video/${c.key}-9x16.mp4`;
  const r = spawnSync(ffmpeg, ['-y', ...inputs, '-filter_complex', filter, '-map', '[out]', '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', String(FPS), out], { stdio: ['ignore', 'ignore', 'pipe'] });
  if (r.status !== 0) { console.error(c.key, 'ffmpeg failed\n', r.stderr.toString().split('\n').slice(-12).join('\n')); continue; }
  const total = c.video.reduce((a, s) => a + s.d, 0) - c.video.slice(1).reduce((a, s) => a + (s.transition === 'wipeleft' ? WIPE : XFADE), 0);
  console.log('wrote', out, `${total.toFixed(1)} s`);
}
await browser.close();
