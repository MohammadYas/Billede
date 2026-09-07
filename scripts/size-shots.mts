/**
 * The three size cards on the landing page: the same photograph in a black frame on the same wall,
 * above the same sideboard, at 30×40, 40×50 and 50×70 cm — scaled by centimetres, so what grows is
 * the frame and nothing else. The backdrop is a generated interior (Higgsfield, see DECISIONS.md);
 * the frame and the picture are composed here with sharp, like lib/restoration/mockup.ts.
 *
 *   npx tsx scripts/size-shots.mts assets/sizes/wall-sideboard.jpg public/examples/bryllup-1954-after-1400.jpg
 *
 * SIDEBOARD_CM and SIDEBOARD_PX say how wide the sideboard is in the world and in the backdrop; that
 * one ratio is the scale for everything. WALL_TOP_PX is the pixel row of the sideboard's top edge.
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const [backdropPath, photoPath] = process.argv.slice(2);
if (!backdropPath || !photoPath) { console.error('usage: size-shots <backdrop.jpg> <photo.jpg>'); process.exit(1); }

const SIZES: [string, number, number][] = [['30x40', 30, 40], ['40x50', 40, 50], ['50x70', 50, 70]];
const OUT_W = 960; // shown at ~300 px CSS in a card; 2× plus a little
const SIDEBOARD_CM = Number(process.env.SIDEBOARD_CM ?? 120);
const SIDEBOARD_FRAC = Number(process.env.SIDEBOARD_FRAC ?? 0.62); // sideboard width as a fraction of the backdrop width
const TOP_FRAC = Number(process.env.TOP_FRAC ?? 0.74); // sideboard top edge as a fraction of the backdrop height
const GAP_CM = 22; // between the sideboard and the bottom of the frame

const backdrop = sharp(await fs.readFile(backdropPath));
const bm = await backdrop.metadata();
const W = OUT_W;
const H = Math.round((W * (bm.height ?? 3)) / (bm.width ?? 4));
const wall = await backdrop.resize(W, H, { fit: 'cover' }).toBuffer();
const pxPerCm = (W * SIDEBOARD_FRAC) / SIDEBOARD_CM;
const sideboardTop = Math.round(H * TOP_FRAC);

const photo = await fs.readFile(photoPath);
await fs.mkdir('public/sizes', { recursive: true });

for (const [key, wCm, hCm] of SIZES) {
  const mouldingCm = 1.6, mountCm = 4; // the real frame: thin black moulding, 4 cm mount
  const outerW = Math.round((wCm + 2 * (mouldingCm + mountCm)) * pxPerCm);
  const outerH = Math.round((hCm + 2 * (mouldingCm + mountCm)) * pxPerCm);
  const moulding = Math.round(mouldingCm * pxPerCm);
  const mount = Math.round(mountCm * pxPerCm);
  const innerW = outerW - 2 * (moulding + mount), innerH = outerH - 2 * (moulding + mount);
  const pic = await sharp(photo).resize(innerW, innerH, { fit: 'cover', position: 'attention' }).toBuffer();
  const x0 = Math.round((W - outerW) / 2);
  const y0 = Math.round(sideboardTop - GAP_CM * pxPerCm - outerH);
  const shadow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${Math.max(4, outerH * 0.02)}"/></filter></defs><rect x="${x0 + outerW * 0.012}" y="${y0 + outerH * 0.02}" width="${outerW}" height="${outerH}" fill="rgba(23,22,20,0.32)" filter="url(#b)"/></svg>`);
  const frame = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${outerW}" height="${outerH}"><rect width="${outerW}" height="${outerH}" fill="#181614"/><rect x="${moulding}" y="${moulding}" width="${outerW - 2 * moulding}" height="${outerH - 2 * moulding}" fill="#f6f2ea"/><rect x="${moulding + mount - 1}" y="${moulding + mount - 1}" width="${innerW + 2}" height="${innerH + 2}" fill="rgba(0,0,0,0.18)"/></svg>`);
  const out = await sharp(wall)
    .composite([
      { input: shadow, top: 0, left: 0 },
      { input: frame, top: y0, left: x0 },
      { input: pic, top: y0 + moulding + mount, left: x0 + moulding + mount },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  await fs.writeFile(path.join('public/sizes', `${key}.jpg`), out);
  await sharp(out).webp({ quality: 78 }).toFile(path.join('public/sizes', `${key}.webp`));
  console.log(key, `${outerW}×${outerH}px at (${x0},${y0})`, y0 < 0 ? 'WARNING: above the top edge' : '');
}
console.log('wrote public/sizes/*.jpg|webp', `${W}×${H}`);
