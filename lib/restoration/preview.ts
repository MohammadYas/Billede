import sharp from 'sharp';
import { tiledWatermark } from './watermark';

/**
 * Customer-facing preview: 1000 px long edge, JPEG q80, and "GENFUNDET · PREVIEW" tiled across the
 * whole picture at about 18 % — light enough to judge the faces, present in every crop so a
 * screenshot is not the product. The zoom view scales this same file, so it is covered too.
 */
export async function makePreview(restored: Buffer, longEdge = 1000): Promise<Buffer> {
  const meta = await sharp(restored).metadata();
  const w0 = meta.width ?? longEdge, h0 = meta.height ?? longEdge;
  const s = longEdge / Math.max(w0, h0);
  const width = Math.round(w0 * Math.min(1, s));
  const height = Math.round(h0 * Math.min(1, s));
  const base = await sharp(restored).resize(width, height, { kernel: sharp.kernel.lanczos3 }).toBuffer();
  return sharp(base)
    .composite([{ input: tiledWatermark(width, height, { opacity: 0.18 }), blend: 'over' }])
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

/** The picture in the approval mail and on /godkend: 1200 px, a light mark. The file itself waits for the yes. */
export async function makeApprovalImage(final: Buffer, longEdge = 1200): Promise<Buffer> {
  const meta = await sharp(final).metadata();
  const w0 = meta.width ?? longEdge, h0 = meta.height ?? longEdge;
  const s = Math.min(1, longEdge / Math.max(w0, h0));
  const width = Math.round(w0 * s), height = Math.round(h0 * s);
  const base = await sharp(final).resize(width, height, { kernel: sharp.kernel.lanczos3 }).toBuffer();
  return sharp(base)
    .composite([{ input: tiledWatermark(width, height, { text: 'GENFUNDET', opacity: 0.1 }), blend: 'over' }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}
