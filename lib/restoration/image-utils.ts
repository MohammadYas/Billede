import sharp from 'sharp';

export type Dimensions = { width: number; height: number };

/** Detect HEIC/HEIF by the ISO BMFF 'ftyp' brand. */
export function isHeic(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf.toString('ascii', 4, 8) !== 'ftyp') return false;
  const brand = buf.toString('ascii', 8, 12);
  return ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand);
}

/** Sniff magic bytes; returns a MIME type or null when not an accepted image. */
export function sniffImageType(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.toString('hex', 0, 8) === '89504e470d0a1a0a') return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (isHeic(buf)) return 'image/heic';
  return null;
}

/** HEIC → JPEG buffer via heic-convert (pure JS, no native deps). */
export async function heicToJpeg(buf: Buffer): Promise<Buffer> {
  const mod = await import('heic-convert');
  const convert = (mod.default ?? mod) as unknown as (o: { buffer: Buffer; format: 'JPEG'; quality: number }) => Promise<ArrayBuffer>;
  const out = await convert({ buffer: buf, format: 'JPEG', quality: 0.95 });
  return Buffer.from(out);
}

/**
 * Normalise any accepted upload to an auto-oriented, metadata-stripped JPEG.
 * Re-encoding on ingest is also the security step (no foreign chunks survive).
 */
export async function normaliseToJpeg(input: Buffer): Promise<{ jpeg: Buffer; dims: Dimensions }> {
  const type = sniffImageType(input);
  if (!type) throw new Error('unsupported_image');
  const src = type === 'image/heic' ? await heicToJpeg(input) : input;
  const pipeline = sharp(src, { failOn: 'error', limitInputPixels: 80_000_000 }).rotate();
  const jpeg = await pipeline.jpeg({ quality: 95, mozjpeg: true }).toBuffer();
  const meta = await sharp(jpeg).metadata();
  return { jpeg, dims: { width: meta.width ?? 0, height: meta.height ?? 0 } };
}

/**
 * Conservative border trim. Only removes a near-uniform frame (scanner lid,
 * table) and only when it takes away less than 18 % of each dimension.
 * Never crops into the photograph: any doubt keeps the original.
 */
export async function trimScannerBorder(jpeg: Buffer, dims: Dimensions): Promise<{ jpeg: Buffer; dims: Dimensions; trimmed: boolean }> {
  try {
    const { data, info } = await sharp(jpeg).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true });
    const dw = 1 - info.width / dims.width;
    const dh = 1 - info.height / dims.height;
    const removedSomething = dw > 0.01 || dh > 0.01;
    const confident = dw < 0.18 && dh < 0.18;
    if (removedSomething && confident) return { jpeg: data, dims: { width: info.width, height: info.height }, trimmed: true };
  } catch {
    /* trim can throw on flat images — keep original */
  }
  return { jpeg, dims, trimmed: false };
}

/** Upscale inputs under `minLongEdge` on the long edge (lanczos3) so the model sees enough pixels. */
export async function ensureMinimumSize(jpeg: Buffer, dims: Dimensions, minLongEdge = 1200): Promise<{ jpeg: Buffer; dims: Dimensions; upscaled: boolean }> {
  const long = Math.max(dims.width, dims.height);
  if (long >= minLongEdge) return { jpeg, dims, upscaled: false };
  const scale = minLongEdge / long;
  const width = Math.round(dims.width * scale);
  const height = Math.round(dims.height * scale);
  const out = await sharp(jpeg).resize(width, height, { kernel: sharp.kernel.lanczos3 }).jpeg({ quality: 95 }).toBuffer();
  return { jpeg: out, dims: { width, height }, upscaled: true };
}

/**
 * Chroma statistics on a 160 px thumbnail. Monochrome and sepia prints have a
 * uniform colour cast, so the *spread* of chroma across the image is low even
 * when the mean is not. Colour photographs spread widely.
 */
export async function chromaStats(jpeg: Buffer): Promise<{ meanChroma: number; chromaStd: number; isMonochrome: boolean }> {
  const { data, info } = await sharp(jpeg).resize(160, 160, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  let sumC = 0;
  let sumRG = 0, sumGB = 0, sumRG2 = 0, sumGB2 = 0;
  for (let i = 0; i < n; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const rg = r - g, gb = g - b;
    sumC += Math.max(Math.abs(rg), Math.abs(gb), Math.abs(r - b));
    sumRG += rg; sumGB += gb; sumRG2 += rg * rg; sumGB2 += gb * gb;
  }
  const meanChroma = sumC / n;
  const varRG = sumRG2 / n - (sumRG / n) ** 2;
  const varGB = sumGB2 / n - (sumGB / n) ** 2;
  const chromaStd = Math.sqrt(Math.max(0, varRG) + Math.max(0, varGB));
  return { meanChroma, chromaStd, isMonochrome: chromaStd < 14 };
}

/**
 * Mean SSIM on an 8×8-window luminance grid at 256 px. Both images are resized
 * to the *original's* aspect so a candidate that changed framing scores lower.
 */
export async function ssimLuma(a: Buffer, b: Buffer): Promise<number> {
  const size = 256;
  const metaA = await sharp(a).metadata();
  const w = metaA.width! >= metaA.height! ? size : Math.round((size * metaA.width!) / metaA.height!);
  const h = metaA.width! >= metaA.height! ? Math.round((size * metaA.height!) / metaA.width!) : size;
  const load = (buf: Buffer) => sharp(buf).resize(w, h, { fit: 'fill' }).grayscale().raw().toBuffer();
  const [ga, gb] = await Promise.all([load(a), load(b)]);
  const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;
  let total = 0, count = 0;
  for (let y = 0; y + 8 <= h; y += 4) {
    for (let x = 0; x + 8 <= w; x += 4) {
      let ma = 0, mb = 0;
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const k = (y + j) * w + (x + i); ma += ga[k]; mb += gb[k]; }
      ma /= 64; mb /= 64;
      let va = 0, vb = 0, cov = 0;
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const k = (y + j) * w + (x + i); const da = ga[k] - ma, db = gb[k] - mb; va += da * da; vb += db * db; cov += da * db; }
      va /= 63; vb /= 63; cov /= 63;
      total += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      count++;
    }
  }
  return count ? total / count : 0;
}

export async function dimensionsOf(buf: Buffer): Promise<Dimensions> {
  const m = await sharp(buf).metadata();
  return { width: m.width ?? 0, height: m.height ?? 0 };
}

/** Resize so the long edge is at least `target` px (lanczos3). No-op if already larger. */
export async function ensureLongEdge(jpeg: Buffer, target: number, quality = 94): Promise<Buffer> {
  const d = await dimensionsOf(jpeg);
  const long = Math.max(d.width, d.height);
  if (long >= target) return jpeg;
  const s = target / long;
  return sharp(jpeg).resize(Math.round(d.width * s), Math.round(d.height * s), { kernel: sharp.kernel.lanczos3 }).jpeg({ quality, mozjpeg: true }).toBuffer();
}

/** Downscale so the long edge is at most `max` px. No-op if already smaller. */
export async function fitLongEdge(jpeg: Buffer, max: number, quality = 88): Promise<Buffer> {
  const d = await dimensionsOf(jpeg);
  if (Math.max(d.width, d.height) <= max) return jpeg;
  return sharp(jpeg).resize(max, max, { fit: 'inside', kernel: sharp.kernel.lanczos3 }).jpeg({ quality }).toBuffer();
}
