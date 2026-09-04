import sharp from 'sharp';

const WATERMARK = 'GENFUNDET · PREVIEW';

/**
 * Customer-facing preview: 1000 px long edge, JPEG q80, one quiet row of small text along the
 * bottom edge (never across the faces — the customer's only question is "ligner det?") plus a
 * small mark in the top-right corner, so a cropped screenshot still carries it. SVG rendered by
 * sharp — no fonts required at runtime.
 */
export async function makePreview(restored: Buffer, longEdge = 1000): Promise<Buffer> {
  const meta = await sharp(restored).metadata();
  const w0 = meta.width ?? longEdge, h0 = meta.height ?? longEdge;
  const s = longEdge / Math.max(w0, h0);
  const width = Math.round(w0 * Math.min(1, s));
  const height = Math.round(h0 * Math.min(1, s));
  const base = await sharp(restored).resize(width, height, { kernel: sharp.kernel.lanczos3 }).toBuffer();

  const fontSize = Math.max(11, Math.round(width / 46));
  const gap = Math.round(fontSize * 3.2);
  const textW = Math.round(fontSize * 0.8 * WATERMARK.length); // bold caps + tracking ≈ 0.8 em per glyph
  const y = height - Math.round(fontSize * 1.1);
  const row: string[] = [];
  for (let x = Math.round(fontSize * 0.8); x < width; x += textW + gap) row.push(`<text x="${x}" y="${y}">${WATERMARK}</text>`);
  const corner = `<text x="${width - Math.round(fontSize * 0.8)}" y="${Math.round(fontSize * 1.6)}" text-anchor="end">${WATERMARK}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <g font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="600" letter-spacing="${Math.max(1, Math.round(fontSize / 5))}" fill="#ffffff" fill-opacity="0.34" stroke="#000000" stroke-opacity="0.12" stroke-width="0.6">
    ${row.join('\n    ')}
    ${corner}
  </g>
</svg>`;
  return sharp(base)
    .composite([{ input: Buffer.from(svg), blend: 'over' }])
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}
