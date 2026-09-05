/**
 * A tiled, rotated text mark across the whole image, as an SVG layer for sharp to composite.
 * Every crop of the picture carries at least one full word, so a screenshot cannot be used as the
 * product — that is the entire point of a watermark. Opacity is the only dial: the preview the
 * customer decides on uses about 18 %, the approval mail's picture a lighter 10 % (they have paid;
 * the file they own is one click away once they say yes).
 */
export function tiledWatermark(width: number, height: number, opts: { text?: string; opacity?: number } = {}): Buffer {
  const text = opts.text ?? 'GENFUNDET · PREVIEW';
  const opacity = opts.opacity ?? 0.18;
  const fs = Math.max(12, Math.round(Math.min(width, height) / 22));
  const tileW = Math.round(fs * 0.68 * text.length + fs * 2.5); // bold caps with tracking ≈ 0.68 em per glyph, then a gap
  const tileH = Math.round(fs * 3.4);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <pattern id="wm" width="${tileW}" height="${tileH}" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
      <text x="0" y="${fs}" font-family="Helvetica, Arial, sans-serif" font-size="${fs}" font-weight="700" letter-spacing="${Math.max(1, Math.round(fs / 6))}" fill="#ffffff" fill-opacity="${opacity}" stroke="#000000" stroke-opacity="${(opacity * 0.6).toFixed(3)}" stroke-width="${Math.max(0.6, fs / 28).toFixed(2)}">${text}</text>
      <text x="${Math.round(tileW / 2)}" y="${Math.round(fs + tileH / 2)}" font-family="Helvetica, Arial, sans-serif" font-size="${fs}" font-weight="700" letter-spacing="${Math.max(1, Math.round(fs / 6))}" fill="#ffffff" fill-opacity="${opacity}" stroke="#000000" stroke-opacity="${(opacity * 0.6).toFixed(3)}" stroke-width="${Math.max(0.6, fs / 28).toFixed(2)}">${text}</text>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#wm)"/>
</svg>`;
  return Buffer.from(svg);
}
