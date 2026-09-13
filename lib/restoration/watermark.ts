import fs from 'node:fs';
import path from 'node:path';

/**
 * The brand as a watermark: the frame mark and the word "Billedearv", repeated on a diagonal grid,
 * white with a dark edge so it reads on skies and on coats alike. The same idiom as a photo lab's
 * proof print — a customer sees at once that the picture is marked, not damaged, and the page under
 * it says the mark goes away. Every crop of the picture carries at least one whole mark, so a
 * screenshot is not the product. Opacity is the only dial: the preview the customer decides on uses
 * about 26 %, the small picture inside a wall mockup 22 %, the approval mail's picture a light 14 %.
 */
let markData: string | null = null;
function mark(): string {
  if (markData === null) {
    try { markData = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), 'public', 'logo-mark.png')).toString('base64')}`; } catch { markData = ''; }
  }
  return markData;
}

export function tiledWatermark(width: number, height: number, opts: { text?: string; opacity?: number } = {}): Buffer {
  const text = opts.text ?? 'Billedearv';
  const opacity = opts.opacity ?? 0.26;
  const fs_ = Math.max(13, Math.round(Math.min(width, height) / 20));
  const icon = Math.round(fs_ * 1.15);
  const gap = Math.round(fs_ * 0.45);
  const textW = Math.round(fs_ * 0.78 * text.length); // generous: the renderer's fallback sans is wide, and a cut word is worse than a gap
  const unitW = icon + gap + textW;
  const tileW = Math.round(unitW + fs_ * 7); // room after the word, so no tile ever cuts it
  const tileH = Math.round(fs_ * 5);
  const stroke = Math.max(0.8, fs_ / 18).toFixed(2);
  const m = mark();
  const one = (x: number, y: number) => `
      ${m ? `<image href="${m}" x="${x}" y="${y - icon + Math.round(fs_ * 0.18)}" width="${icon}" height="${icon}" opacity="${(opacity * 1.1).toFixed(3)}"/>` : ''}
      <text x="${x + icon + gap}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${fs_}" font-weight="600" letter-spacing="${Math.max(0.5, fs_ / 24).toFixed(1)}" fill="#ffffff" fill-opacity="${opacity}" stroke="#141210" stroke-opacity="${(opacity * 0.9).toFixed(3)}" stroke-width="${stroke}" paint-order="stroke">${text}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}">
  <defs>
    <pattern id="wm" width="${tileW}" height="${tileH}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
      ${one(Math.round(fs_ * 0.5), Math.round(fs_ * 1.4))}
      ${one(Math.round(fs_ * 0.5 + tileW / 2), Math.round(fs_ * 1.4 + tileH / 2))}
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#wm)"/>
</svg>`;
  return Buffer.from(svg);
}
