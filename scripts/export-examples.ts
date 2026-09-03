/**
 * Exports approved before/after pairs from work/quality/<name>/ to public/examples/ and writes examples.json.
 * Reads `<name>.md` sidecars in the source dir for caption/consent. Only consent: yes pairs are exported.
 *
 *   npx tsx scripts/export-examples.ts --source assets/originals
 *   npx tsx scripts/export-examples.ts --source work/pd-originals --placeholder   # archive placeholders (HANDOFF.md)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { makeMockup } from '@/lib/restoration/mockup';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SOURCES = arg('--source', 'assets/originals').split(',');
const PLACEHOLDER = args.includes('--placeholder');
const ONLY = arg('--only', '').split(',').filter(Boolean);
const OUT = path.join('public', 'examples');

async function readSidecarText(name: string): Promise<string> {
  for (const src of SOURCES) { try { return await fs.readFile(path.join(src, `${name}.md`), 'utf8'); } catch { /* next */ } }
  throw new Error('no sidecar');
}

async function sidecar(name: string) {
  try {
    const t = await readSidecarText(name);
    const get = (k: string) => t.match(new RegExp(`^${k}:\\s*(.+)$`, 'mi'))?.[1]?.trim() ?? '';
    const detail = get('detail').split(',').map(Number);
    return { caption: get('context'), consent: /^yes|ja$/i.test(get('consent')), order: Number(get('order') || 99), mode: get('mode') || undefined, colour: /^yes|ja$/i.test(get('colour')), detail: detail.length === 2 && detail.every((n) => !Number.isNaN(n)) ? detail as [number, number] : null, detailLabel: get('detailLabel') || '' };
  } catch { return { caption: '', consent: false, order: 99, mode: undefined, colour: false, detail: null, detailLabel: '' }; }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const dirs = (await fs.readdir('work/quality', { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  const out: unknown[] = [];
  for (const name of dirs) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    const meta = await fs.readFile(path.join('work/quality', name, 'meta.json'), 'utf8').then(JSON.parse).catch(() => null);
    if (!meta || meta.needsManualReview) continue;
    const s = await sidecar(name);
    if (!s.consent) { console.log('skip (no consent):', name); continue; }
    const orig = await fs.readFile(path.join('work/quality', name, 'original.jpg'));
    const rest = await fs.readFile(path.join('work/quality', name, 'restored.jpg'));
    const m = await sharp(rest).metadata();
    const w = m.width ?? 1, h = m.height ?? 1;
    const target = 1400;
    const scale = target / Math.max(w, h);
    const W = Math.round(w * Math.min(1, scale)), H = Math.round(h * Math.min(1, scale));
    // The restored file defines the frame; the original is fitted to the same box so the slider lines up.
    // Responsive set: 480 / 800 / 1400 on the long edge, JPEG + WebP. The <picture> in BeforeAfter picks by width.
    const widths = [480, 800, 1000, 1400].filter((w) => w <= Math.max(W, H));
    for (const side of ['before', 'after'] as const) {
      const src = side === 'before' ? sharp(orig).resize(W, H, { fit: 'fill' }) : sharp(rest).resize(W, H);
      const base = await src.toBuffer();
      for (const lw of widths) {
        const sc = lw / Math.max(W, H);
        const w = Math.round(W * sc), h = Math.round(H * sc);
        await sharp(base).resize(w, h, { kernel: sharp.kernel.lanczos3 }).jpeg({ quality: side === 'before' ? 62 : 80, mozjpeg: true, progressive: true }).toFile(path.join(OUT, `${name}-${side}-${lw}.jpg`));
        await sharp(base).resize(w, h, { kernel: sharp.kernel.lanczos3 }).webp({ quality: side === 'before' ? 52 : 74, effort: 6 }).toFile(path.join(OUT, `${name}-${side}-${lw}.webp`));
      }
      // canonical unsuffixed file = largest (used by og.jpg and as a plain fallback)
      await fs.copyFile(path.join(OUT, `${name}-${side}-${widths[widths.length - 1]}.jpg`), path.join(OUT, `${name}-${side}.jpg`));
    }
    // Detail crops ("Tæt på"): a 2× window around the point the sidecar names, before and after, 700 px square.
    if (s.detail) {
      const [fx, fy] = s.detail;
      const side = Math.round(Math.min(w, h) * 0.30);
      const left = Math.max(0, Math.min(w - side, Math.round(fx * w - side / 2)));
      const top = Math.max(0, Math.min(h - side, Math.round(fy * h - side / 2)));
      const origFit = await sharp(orig).resize(w, h, { fit: 'fill' }).toBuffer();
      for (const [side_, buf] of [['before', origFit], ['after', rest]] as const) {
        await sharp(buf).extract({ left, top, width: side, height: side }).resize(700, 700, { kernel: sharp.kernel.lanczos3 }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, `${name}-detail-${side_}.jpg`));
        await sharp(buf).extract({ left, top, width: side, height: side }).resize(700, 700, { kernel: sharp.kernel.lanczos3 }).webp({ quality: 76 }).toFile(path.join(OUT, `${name}-detail-${side_}.webp`));
      }
    }
    // Colourised version when the sidecar asks for it and the pipeline produced one
    let colour: string | undefined;
    if (s.colour) {
      try {
        const col = await fs.readFile(path.join('work/quality', name, 'colourised.jpg'));
        await sharp(col).resize(W, H).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, `${name}-colour.jpg`));
        await sharp(col).resize(Math.min(W, 1000)).webp({ quality: 74 }).toFile(path.join(OUT, `${name}-colour-1000.webp`));
        colour = `/examples/${name}-colour.jpg`;
      } catch { /* no colour file */ }
    }
    const mock = await makeMockup(rest, { width: 1200 });
    await sharp(mock).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, `${name}-mockup.jpg`));
    await sharp(mock).resize(800).webp({ quality: 74 }).toFile(path.join(OUT, `${name}-mockup-800.webp`));
    await sharp(mock).resize(480).jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(OUT, `${name}-mockup-480.jpg`));
    out.push({ id: name, mode: s.mode, colour, detail: s.detail ? { before: `/examples/${name}-detail-before.jpg`, after: `/examples/${name}-detail-after.jpg`, label: s.detailLabel } : undefined, mockup: `/examples/${name}-mockup.jpg`, before: `/examples/${name}-before.jpg`, after: `/examples/${name}-after.jpg`, width: W, height: H, widths, caption: s.caption, consent: true, placeholder: PLACEHOLDER || undefined, order: s.order });
    console.log('exported', name, `${W}×${H}`);
  }
  (out as { order: number }[]).sort((a, b) => a.order - b.order);
  await fs.writeFile(path.join(OUT, 'examples.json'), JSON.stringify(out.map((o) => { const { order: _o, ...rest } = o as { order: number }; return rest; }), null, 2));
  console.log(`wrote ${out.length} examples`);
}
main().catch((e) => { console.error(e); process.exit(1); });
