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

const args = process.argv.slice(2);
const arg = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SOURCE = arg('--source', 'assets/originals');
const PLACEHOLDER = args.includes('--placeholder');
const ONLY = arg('--only', '').split(',').filter(Boolean);
const OUT = path.join('public', 'examples');

async function sidecar(name: string) {
  try {
    const t = await fs.readFile(path.join(SOURCE, `${name}.md`), 'utf8');
    const get = (k: string) => t.match(new RegExp(`^${k}:\\s*(.+)$`, 'mi'))?.[1]?.trim() ?? '';
    return { caption: get('context'), consent: /^yes|ja$/i.test(get('consent')), order: Number(get('order') || 99) };
  } catch { return { caption: '', consent: false, order: 99 }; }
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
    await sharp(orig).resize(W, H, { fit: 'fill' }).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, `${name}-before.jpg`));
    await sharp(rest).resize(W, H).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, `${name}-after.jpg`));
    await sharp(orig).resize(W, H, { fit: 'fill' }).webp({ quality: 74 }).toFile(path.join(OUT, `${name}-before.webp`));
    await sharp(rest).resize(W, H).webp({ quality: 76 }).toFile(path.join(OUT, `${name}-after.webp`));
    out.push({ id: name, before: `/examples/${name}-before.jpg`, after: `/examples/${name}-after.jpg`, width: W, height: H, caption: s.caption, consent: true, placeholder: PLACEHOLDER || undefined, order: s.order });
    console.log('exported', name, `${W}×${H}`);
  }
  (out as { order: number }[]).sort((a, b) => a.order - b.order);
  await fs.writeFile(path.join(OUT, 'examples.json'), JSON.stringify(out.map((o) => { const { order: _o, ...rest } = o as { order: number }; return rest; }), null, 2));
  console.log(`wrote ${out.length} examples`);
}
main().catch((e) => { console.error(e); process.exit(1); });
