import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { PRICING, type Format, DEFAULT_FORMAT } from '@/lib/pricing';

/**
 * Photographic frame mockup, composed by code (sharp), never generated.
 *
 * Wall: `public/mockup/wall.jpg` when present (a real photo of a plain wall,
 * see HANDOFF.md). Until the owner supplies one, a neutral warm-grey wall with
 * a soft light falloff is rendered so the flow works end to end.
 * Frame: thin black moulding, off-white mount, soft natural shadow down-right.
 */
export type MockupOptions = { format?: Format; width?: number; frame?: 'black' | 'oak' };

const WALL_PATH = path.join(process.cwd(), 'public', 'mockup', 'wall.jpg');

async function wallLayer(width: number, height: number): Promise<Buffer> {
  try {
    const wall = await fs.readFile(WALL_PATH);
    return await sharp(wall).resize(width, height, { fit: 'cover' }).toBuffer();
  } catch {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <radialGradient id="l" cx="38%" cy="28%" r="90%">
          <stop offset="0" stop-color="#ECE6DB"/><stop offset="1" stop-color="#CFC7BA"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#l)"/>
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
}

export async function makeMockup(image: Buffer, opts: MockupOptions = {}): Promise<Buffer> {
  const format = opts.format ?? DEFAULT_FORMAT;
  const spec = PRICING[format];
  const W = opts.width ?? 1200;
  const H = Math.round(W * 0.8);
  const frameColour = opts.frame === 'oak' ? '#8A6A46' : '#181614';

  // Physical proportions: the frame covers ~52 % of the wall height for 30×40.
  const meta = await sharp(image).metadata();
  const portrait = (meta.height ?? 1) >= (meta.width ?? 1);
  const outerH = Math.round(H * (portrait ? 0.62 : 0.5) * Math.min(1.25, spec.heightCm / 40));
  const outerW = Math.round(outerH * (portrait ? spec.widthCm / spec.heightCm : spec.heightCm / spec.widthCm));
  const moulding = Math.round(outerH * 0.02);
  const mount = Math.round(outerH * 0.07);
  const innerW = outerW - 2 * (moulding + mount);
  const innerH = outerH - 2 * (moulding + mount);

  // Photograph fitted inside the mount opening (letterboxed on mount if aspect differs).
  const photo = await sharp(image).resize(innerW, innerH, { fit: 'inside', kernel: sharp.kernel.lanczos3 }).toBuffer();
  const pm = await sharp(photo).metadata();
  const px = Math.round((innerW - (pm.width ?? innerW)) / 2);
  const py = Math.round((innerH - (pm.height ?? innerH)) / 2);

  const x0 = Math.round((W - outerW) / 2);
  const y0 = Math.round(H * 0.16);

  const shadowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${Math.round(outerH * 0.02)}"/></filter></defs>
    <rect x="${x0 + Math.round(outerH * 0.012)}" y="${y0 + Math.round(outerH * 0.02)}" width="${outerW}" height="${outerH}" fill="#000" fill-opacity="0.32" filter="url(#b)"/>
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
