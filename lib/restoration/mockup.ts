import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { PRICING, type Format, DEFAULT_FORMAT } from '@/lib/pricing';
import { tiledWatermark } from './watermark';

/**
 * Photographic frame mockup, composed by code (sharp), never generated.
 *
 * Wall: `public/mockup/wall.jpg` — an empty plaster wall above a 120 cm oak sideboard (a generated
 * interior, see DECISIONS.md). The picture is a product shot, not a floor plan: the camera moves in
 * so the frame fills the shot, and the top of the sideboard stays in the bottom of the frame as the
 * thing that says how big it is. A bigger size is a bigger frame in the shot (30×40 → 40×50 → 50×70
 * grow visibly), and the wall and furniture are the same in all six, so switching size or frame on
 * the order page changes exactly one thing.
 * Frame: thin black (or oak) moulding with a bevel, 4 cm off-white mount with an inner shadow, glass
 * glare, a contact shadow and a soft cast shadow down-right.
 */
export type MockupOptions = { format?: Format; width?: number; frame?: 'black' | 'oak'; /** the brand mark on the picture inside the frame (customer previews; never the site's own examples) */ watermark?: boolean };

const WALL_PATH = path.join(process.cwd(), 'public', 'mockup', 'wall.jpg');
/** how the backdrop is laid out: the sideboard's width in the world and in the picture, and where its top edge sits */
const SIDEBOARD_CM = 120;
const SIDEBOARD_FRAC = 0.53;
const SIDEBOARD_TOP_FRAC = 0.64;
const WALL_ASPECT = 1792 / 2400;
const GAP_CM = 18; // between the sideboard and the bottom of the frame
const MOULDING_CM = 1.6;
const MOUNT_CM = 4;
/** how much of the shot the frame may take: wider frames for bigger sizes, capped by height for the tall one */
const WIDTH_FRAC: Record<string, number> = { '20x30': 0.36, '30x40': 0.42, '40x50': 0.5, '50x70': 0.58 };
const HEIGHT_CAP = 0.78;

async function wallWindow(W: number, H: number, pxPerCm: number, frameBottomY: number): Promise<Buffer> {
  // resize the wall so its sideboard measures 120 cm at this scale, then crop a W×H window whose bottom shows the sideboard's top
  try {
    const wall = await fs.readFile(WALL_PATH);
    const scaledW = Math.round((pxPerCm * SIDEBOARD_CM) / SIDEBOARD_FRAC);
    const scaledH = Math.round(scaledW * WALL_ASPECT);
    const sideboardTop = Math.round(scaledH * SIDEBOARD_TOP_FRAC);
    // the window's sideboard top should sit GAP below the frame's bottom edge
    const top = Math.max(0, Math.min(scaledH - H, Math.round(sideboardTop - (frameBottomY + GAP_CM * pxPerCm))));
    const left = Math.max(0, Math.round((scaledW - W) / 2));
    if (scaledW >= W && scaledH >= H) return await sharp(wall).resize(scaledW, scaledH).extract({ left, top, width: W, height: H }).toBuffer();
    return await sharp(wall).resize(W, H, { fit: 'cover' }).toBuffer();
  } catch {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs><radialGradient id="l" cx="34%" cy="22%" r="95%"><stop offset="0" stop-color="#F1EBE0"/><stop offset="1" stop-color="#D6CEC0"/></radialGradient></defs>
      <rect width="100%" height="100%" fill="url(#l)"/>
      <rect y="${Math.round(H * 0.86)}" width="100%" height="${Math.round(H * 0.14)}" fill="#C9C0B1"/>
      <rect y="${Math.round(H * 0.86)}" width="100%" height="2" fill="#B8AE9E"/>
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
}

export async function makeMockup(image: Buffer, opts: MockupOptions = {}): Promise<Buffer> {
  const format = opts.format ?? DEFAULT_FORMAT;
  const spec = PRICING[format];
  const W = opts.width ?? 1040; // shown at 440-520 px CSS; 2× is plenty and halves the bytes
  const H = Math.round(W * 0.8);
  const oak = opts.frame === 'oak';

  // Physical proportions of the frame, then the scale that lets it fill its share of the shot.
  const meta = await sharp(image).metadata();
  const portrait = (meta.height ?? 1) >= (meta.width ?? 1);
  const wCm = (portrait ? spec.widthCm : spec.heightCm) + 2 * (MOULDING_CM + MOUNT_CM);
  const hCm = (portrait ? spec.heightCm : spec.widthCm) + 2 * (MOULDING_CM + MOUNT_CM);
  const pxPerCm = Math.min(((WIDTH_FRAC[format] ?? 0.5) * W) / wCm, (HEIGHT_CAP * H) / hCm);
  const outerW = Math.round(wCm * pxPerCm);
  const outerH = Math.round(hCm * pxPerCm);
  const moulding = Math.max(3, Math.round(MOULDING_CM * pxPerCm));
  const mount = Math.round(MOUNT_CM * pxPerCm);
  const innerW = outerW - 2 * (moulding + mount);
  const innerH = outerH - 2 * (moulding + mount);

  // Photograph fitted inside the mount opening (letterboxed on mount if aspect differs).
  let photo = await sharp(image).resize(innerW, innerH, { fit: 'inside', kernel: sharp.kernel.lanczos3 }).toBuffer();
  const pm = await sharp(photo).metadata();
  if (opts.watermark && pm.width && pm.height) photo = await sharp(photo).composite([{ input: tiledWatermark(pm.width, pm.height, { opacity: 0.26 }), blend: 'over' }]).toBuffer();
  const px = Math.round((innerW - (pm.width ?? innerW)) / 2);
  const py = Math.round((innerH - (pm.height ?? innerH)) / 2);

  const x0 = Math.round((W - outerW) / 2);
  const y0 = Math.round((H - outerH) * 0.42); // a little above centre: the sideboard's top edge takes the bottom
  const frameBottom = y0 + outerH;

  const wall = await wallWindow(W, H, pxPerCm, frameBottom);

  const shadowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${Math.max(6, Math.round(outerH * 0.035))}"/></filter>
      <filter id="tight" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${Math.max(1.5, Math.round(outerH * 0.006))}"/></filter>
    </defs>
    <rect x="${x0 + Math.round(outerH * 0.02)}" y="${y0 + Math.round(outerH * 0.035)}" width="${outerW}" height="${outerH}" fill="#000" fill-opacity="0.22" filter="url(#soft)"/>
    <rect x="${x0 + 1}" y="${y0 + 2}" width="${outerW}" height="${outerH}" fill="#000" fill-opacity="0.28" filter="url(#tight)"/>
  </svg>`;
  const mouldingA = oak ? '#9a7a52' : '#2a2724';
  const mouldingB = oak ? '#6f5233' : '#0f0e0d';
  const frameSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outerW}" height="${outerH}">
    <defs>
      <linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mouldingA}"/><stop offset="1" stop-color="${mouldingB}"/></linearGradient>
      <linearGradient id="bevel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="${outerW}" height="${outerH}" fill="url(#m)"/>
    <rect x="0" y="0" width="${outerW}" height="${Math.max(1, Math.round(moulding * 0.45))}" fill="url(#bevel)"/>
    <rect x="${moulding}" y="${moulding}" width="${outerW - 2 * moulding}" height="${outerH - 2 * moulding}" fill="#F5F1E9"/>
    <rect x="${moulding}" y="${moulding}" width="${outerW - 2 * moulding}" height="${Math.max(1, Math.round(mount * 0.12))}" fill="#000" fill-opacity="0.10"/>
    <rect x="${moulding + mount + px - 1}" y="${moulding + mount + py - 1}" width="${(pm.width ?? innerW) + 2}" height="${(pm.height ?? innerH) + 2}" fill="#000" fill-opacity="0.22"/>
    <rect x="${moulding + mount + px - 2}" y="${moulding + mount + py - 2}" width="${(pm.width ?? innerW) + 4}" height="${(pm.height ?? innerH) + 4}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="1"/>
  </svg>`;
  const glareSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outerW}" height="${outerH}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.09"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.03"/></linearGradient></defs>
    <rect width="${outerW}" height="${outerH}" fill="url(#g)"/>
  </svg>`;

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
