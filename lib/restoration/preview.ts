import sharp from 'sharp';

const WATERMARK = 'GENFUNDET · PREVIEW';

/**
 * Customer-facing preview: 1000 px long edge, JPEG q80, diagonal repeated
 * semi-transparent watermark over the whole image. The watermark is an SVG
 * pattern rendered by sharp — no fonts required at runtime.
 */
export async function makePreview(restored: Buffer, longEdge = 1000): Promise<Buffer> {
  const meta = await sharp(restored).metadata();
  const w0 = meta.width ?? longEdge, h0 = meta.height ?? longEdge;
  const s = longEdge / Math.max(w0, h0);
  const width = Math.round(w0 * Math.min(1, s));
  const height = Math.round(h0 * Math.min(1, s));
  const base = await sharp(restored).resize(width, height, { kernel: sharp.kernel.lanczos3 }).toBuffer();

  const cell = Math.round(Math.max(width, height) / 3.2);
  const fontSize = Math.round(cell / 9);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <pattern id="p" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
      <text x="0" y="${Math.round(cell / 2)}" font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="600" letter-spacing="${Math.round(fontSize / 6)}" fill="#ffffff" fill-opacity="0.28" stroke="#000000" stroke-opacity="0.18" stroke-width="1">${WATERMARK}</text>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#p)"/>
</svg>`;
  return sharp(base)
    .composite([{ input: Buffer.from(svg), blend: 'over' }])
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}
