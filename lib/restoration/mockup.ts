import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { PRICING, type Format, DEFAULT_FORMAT } from '@/lib/pricing';

/**
 * Photographic frame mockup, composed by code (sharp), never generated.
 *
 * Wall: `public/mockup/wall.jpg` — an empty plaster wall above a 120 cm oak sideboard (a generated
 * interior, see DECISIONS.md). The sideboard is the ruler: the frame is drawn to scale from the
 * order's centimetres, so 30×40, 40×50 and 50×70 differ on the wall the way they differ in a room.
 * Until a wall exists, a neutral warm-grey wall with a soft light falloff is rendered instead.
 * Frame: thin black (or oak) moulding, 4 cm off-white mount, soft natural shadow down-right.
 */
export type MockupOptions = { format?: Format; width?: number; frame?: 'black' | 'oak' };

const WALL_PATH = path.join(process.cwd(), 'public', 'mockup', 'wall.jpg');
/** how the backdrop is laid out: the sideboard's width in the world and in the picture, and where its top edge sits */
const SIDEBOARD_CM = 120;
const SIDEBOARD_FRAC = 0.53;
const SIDEBOARD_TOP_FRAC = 0.64;
const GAP_CM = 20; // between the sideboard and the bottom of the frame
const ASPECT = 1792 / 2400; // the backdrop's height / width
const MOULDING_CM = 1.6;
const MOUNT_CM = 4;

async function wallLayer(width: number, height: number): Promise<Buffer> {
  try {
    const wall = await fs.readFile(WALL_PATH);
    return await sharp(wall).resize(width, height, { fit: 'cover' }).toBuffer();
  } catch {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <radialGradient id="l" cx="34%" cy="22%" r="95%">
          <stop offset="0" stop-color="#F1EBE0"/><stop offset="1" stop-color="#D6CEC0"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#l)"/>
      <rect y="${Math.round(height * 0.86)}" width="100%" height="${Math.round(height * 0.14)}" fill="#C9C0B1"/>
      <rect y="${Math.round(height * 0.86)}" width="100%" height="2" fill="#B8AE9E"/>
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
}

export async function makeMockup(image: Buffer, opts: MockupOptions = {}): Promise<Buffer> {
  const format = opts.format ?? DEFAULT_FORMAT;
  const spec = PRICING[format];
  const W = opts.width ?? 1040; // shown at 440-520 px CSS; 2× is plenty and halves the bytes
  const H = Math.round(W * ASPECT);
  const frameColour = opts.frame === 'oak' ? '#8A6A46' : '#181614';

  // Physical proportions: centimetres → pixels through the sideboard.
  const pxPerCm = (W * SIDEBOARD_FRAC) / SIDEBOARD_CM;
  const meta = await sharp(image).metadata();
  const portrait = (meta.height ?? 1) >= (meta.width ?? 1);
  const wCm = portrait ? spec.widthCm : spec.heightCm;
  const hCm = portrait ? spec.heightCm : spec.widthCm;
  const outerW = Math.round((wCm + 2 * (MOULDING_CM + MOUNT_CM)) * pxPerCm);
  const outerH = Math.round((hCm + 2 * (MOULDING_CM + MOUNT_CM)) * pxPerCm);
  const moulding = Math.round(MOULDING_CM * pxPerCm);
  const mount = Math.round(MOUNT_CM * pxPerCm);
  const innerW = outerW - 2 * (moulding + mount);
  const innerH = outerH - 2 * (moulding + mount);

  // Photograph fitted inside the mount opening (letterboxed on mount if aspect differs).
  const photo = await sharp(image).resize(innerW, innerH, { fit: 'inside', kernel: sharp.kernel.lanczos3 }).toBuffer();
  const pm = await sharp(photo).metadata();
  const px = Math.round((innerW - (pm.width ?? innerW)) / 2);
  const py = Math.round((innerH - (pm.height ?? innerH)) / 2);

  const x0 = Math.round((W - outerW) / 2);
  // hung above the sideboard; a very tall frame keeps a small margin to the top edge instead of leaving the picture
  const y0 = Math.max(Math.round(H * 0.04), Math.round(H * SIDEBOARD_TOP_FRAC - GAP_CM * pxPerCm - outerH));

  const shadowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${Math.max(3, Math.round(outerH * 0.02))}"/></filter></defs>
    <rect x="${x0 + Math.round(outerH * 0.01)}" y="${y0 + Math.round(outerH * 0.018)}" width="${outerW}" height="${outerH}" fill="#000" fill-opacity="0.28" filter="url(#b)"/>
  </svg>`;
  const frameSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outerW}" height="${outerH}">
    <rect width="${outerW}" height="${outerH}" fill="${frameColour}"/>
    <rect x="${moulding}" y="${moulding}" width="${outerW - 2 * moulding}" height="${outerH - 2 * moulding}" fill="#F4F0E8"/>
    <rect x="${moulding + mount - 1}" y="${moulding + mount - 1}" width="${innerW + 2}" height="${innerH + 2}" fill="#000" fill-opacity="0.18"/>
  </svg>`;
  const glareSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outerW}" height="${outerH}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.06"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <rect width="${outerW}" height="${outerH}" fill="url(#g)"/>
  </svg>`;

  const wall = await wallLayer(W, H);
  const frame = await sharp(Buffer.from(frameSvg)).png().toBuffer();
  const framed = await sharp(frame)
    .composite([
      { input: photo, left: moulding + mount + px, top: moulding + mount + py },
      { input: Buffer.from(glareSvg), blend: 'over' },
    ])
    .png()
    .toBuffer();

  return sharp(wall)
    .composite([
      { input: Buffer.from(shadowSvg), blend: 'multiply' },
      { input: framed, left: x0, top: y0 },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}
