// Lægger det ægte før/efter-par ind i en genereret scene med to sorte placeholder-felter.
//   node scripts/ads-composite.mjs <scene.png> <par> [--after x,y,w,h] [--before x,y,w,h] [--both-after]
// Uden koordinater findes de to største sorte rektangler selv; det øverste bliver EFTER, det nederste FØR.
// Output: work/ads/creatives/<par>-<koncept>-1080x1350.jpg og -1080x1080.jpg (koncept = scenens filnavn efter "<par>-").
import sharp from 'sharp';
import { basename, extname } from 'node:path';
import { mkdirSync } from 'node:fs';

const [scenePath, pair, ...rest] = process.argv.slice(2);
if (!scenePath || !pair) { console.error('usage: node scripts/ads-composite.mjs <scene.png> <par> [--after x,y,w,h] [--before x,y,w,h] [--both-after]'); process.exit(1); }
const opt = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1].split(',').map(Number) : null; };
const bothAfter = rest.includes('--both-after');
const concept = basename(scenePath, extname(scenePath)).replace(`${pair}-`, '');

const scene = sharp(scenePath);
const { width: W, height: H } = await scene.metadata();

/** Largest near-black rectangles, found on a downscaled copy and mapped back. */
async function findPlaceholders() {
  const scale = 400 / W, w = 400, h = Math.round(H * scale);
  const raw = await scene.clone().resize(w, h).greyscale().raw().toBuffer();
  const dark = new Uint8Array(w * h);
  for (let i = 0; i < raw.length; i++) dark[i] = raw[i] < 28 ? 1 : 0;
  const seen = new Uint8Array(w * h); const boxes = [];
  for (let s = 0; s < w * h; s++) {
    if (!dark[s] || seen[s]) continue;
    const stack = [s]; seen[s] = 1; let n = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
    while (stack.length) {
      const p = stack.pop(); n++; const x = p % w, y = (p - x) / w;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const q of [p - 1, p + 1, p - w, p + w]) { if (q < 0 || q >= w * h || seen[q] || !dark[q]) continue; if ((q === p - 1 && x === 0) || (q === p + 1 && x === w - 1)) continue; seen[q] = 1; stack.push(q); }
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, area = bw * bh;
    if (area < w * h * 0.015) continue;
    if (n / area < 0.9) continue; // not a rectangle
    boxes.push({ x: x0 / scale, y: y0 / scale, w: bw / scale, h: bh / scale, fill: n / area });
  }
  boxes.sort((a, b) => b.w * b.h - a.w * a.h);
  const full = await scene.clone().greyscale().raw().toBuffer();
  return boxes.slice(0, 2).map((b) => refine(full, { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) }));
}

/** Grow or shrink each edge at full resolution until the edge line is no longer mostly black. */
function refine(full, b) {
  const darkRow = (y, x0, x1) => { let n = 0; for (let x = x0; x <= x1; x++) if (full[y * W + x] < 28) n++; return n / (x1 - x0 + 1) > 0.9; };
  const darkCol = (x, y0, y1) => { let n = 0; for (let y = y0; y <= y1; y++) if (full[y * W + x] < 28) n++; return n / (y1 - y0 + 1) > 0.9; };
  let x0 = b.x, x1 = b.x + b.w - 1, y0 = b.y, y1 = b.y + b.h - 1;
  const cx0 = x0 + 8, cx1 = x1 - 8, cy0 = y0 + 8, cy1 = y1 - 8; // inner span used to judge an edge line
  while (y0 > 0 && darkRow(y0 - 1, cx0, cx1)) y0--; while (!darkRow(y0, cx0, cx1) && y0 < y1) y0++;
  while (y1 < H - 1 && darkRow(y1 + 1, cx0, cx1)) y1++; while (!darkRow(y1, cx0, cx1) && y1 > y0) y1--;
  while (x0 > 0 && darkCol(x0 - 1, cy0, cy1)) x0--; while (!darkCol(x0, cy0, cy1) && x0 < x1) x0++;
  while (x1 < W - 1 && darkCol(x1 + 1, cy0, cy1)) x1++; while (!darkCol(x1, cy0, cy1) && x1 > x0) x1--;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

let after = opt('--after'), before = opt('--before');
if (!after || !before) {
  const found = await findPlaceholders();
  if (found.length !== 2) { console.error(`found ${found.length} black rectangle(s), expected 2: ${JSON.stringify(found)} — give --after and --before`); process.exit(2); }
  found.sort((a, b) => a.y - b.y);
  after = after ?? [found[0].x, found[0].y, found[0].w, found[0].h];
  before = before ?? [found[1].x, found[1].y, found[1].w, found[1].h];
}
const box = ([x, y, w, h]) => ({ x, y, w, h });
const A = box(after), B = box(before);
console.log('after ', A); console.log('before', B);

const photo = (name, { w, h }) => sharp(`public/examples/${pair}-${name}.jpg`).resize(w, h, { fit: 'cover', position: 'attention' }).toBuffer();
const layers = [
  { input: await photo('after', A), left: A.x, top: A.y },
  { input: await photo(bothAfter ? 'after' : 'before', B), left: B.x, top: B.y },
];
const composed = await scene.clone().composite(layers).toBuffer();

mkdirSync('work/ads/creatives', { recursive: true });
for (const [w, h] of [[1080, 1350], [1080, 1080]]) {
  const out = `work/ads/creatives/${pair}-${concept}-${w}x${h}.jpg`;
  await sharp(composed).resize(w, h, { fit: 'cover', position: 'centre' }).jpeg({ quality: 90 }).toFile(out);
  console.log('wrote', out);
}
