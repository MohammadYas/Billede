// Før/efter-annoncebilleder til Meta fra public/examples → work/ads/creatives (git-ignoreret). Kør: node scripts/ads-creatives.mjs
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
const PAPER = '#fbfaf7', INK = '#171614', INK2 = '#5d5953', ACCENT = '#1f5a3c';
const examples = JSON.parse(readFileSync('public/examples/examples.json', 'utf8')).map((e) => e.id);
const FORMATS = { feed: [1080, 1080], story: [1080, 1350] };
mkdirSync('work/ads/creatives', { recursive: true });
const label = (w, h, text, sub) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <text x="${w / 2}" y="${h * 0.62}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(h * 0.5)}" font-weight="700" letter-spacing="3" fill="${sub ? ACCENT : INK}">${text}</text></svg>`);
const foot = (w, h, text) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <text x="${w / 2}" y="${h * 0.6}" text-anchor="middle" font-family="Georgia, serif" font-size="${Math.round(h * 0.42)}" fill="${INK2}">${text}</text></svg>`);
async function pair(id, [W, H], out, stacked) {
  const before = sharp(`public/examples/${id}-before.jpg`), after = sharp(`public/examples/${id}-after.jpg`);
  const gap = 28, pad = 60, lab = 64, ft = 70;
  let bw, bh; // per-picture box
  if (stacked) { bw = W - pad * 2; bh = Math.floor((H - pad * 2 - ft - gap - lab * 2) / 2); }
  else { bw = Math.floor((W - pad * 2 - gap) / 2); bh = H - pad * 2 - ft - lab; }
  const fit = (s) => s.resize(bw, bh, { fit: 'inside' }).jpeg({ quality: 92 }).toBuffer({ resolveWithObject: true });
  const [b, a] = await Promise.all([fit(before), fit(after)]);
  const comps = [];
  const place = (img, x0, y0, text) => {
    const x = x0 + Math.floor((bw - img.info.width) / 2), y = y0 + lab + Math.floor((bh - img.info.height) / 2);
    comps.push({ input: label(bw, lab, text, text === 'EFTER'), left: x0, top: y0 });
    comps.push({ input: img.data, left: x, top: y });
  };
  if (stacked) { place(b, pad, pad, 'FØR'); place(a, pad, pad + lab + bh + gap, 'EFTER'); }
  else { place(b, pad, pad, 'FØR'); place(a, pad + bw + gap, pad, 'EFTER'); }
  comps.push({ input: foot(W, ft, 'billedearv.dk · Eksempelbillede – restaureringen er ægte'), left: 0, top: H - pad - ft + 10 });
  await sharp({ create: { width: W, height: H, channels: 3, background: PAPER } }).composite(comps).jpeg({ quality: 90 }).toFile(out);
}
for (const id of [...examples, 'bryllup-1916']) {
  const landscape = id === 'bryllup-1916';
  for (const [name, dims] of Object.entries(FORMATS)) {
    const out = `work/ads/creatives/${id}-${name}-${dims[0]}x${dims[1]}.jpg`;
    await pair(id, dims, out, landscape);
    console.log('wrote', out);
  }
}
