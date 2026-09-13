/**
 * Runs the full restoration pipeline on every image in a source directory and
 * writes QUALITY_REPORT.md plus thumbnails under checkpoints/quality/.
 *
 *   npx tsx scripts/quality-report.ts                # assets/originals
 *   npx tsx scripts/quality-report.ts --source work/pd-originals --label "public-domain validation set"
 *   npx tsx scripts/quality-report.ts --quality high --concurrency 2
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { restore, colourise, type RestoreResult, RestoreError } from '@/lib/restoration/restore';
import { makePreview } from '@/lib/restoration/preview';
import { makeMockup } from '@/lib/restoration/mockup';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SOURCE = arg('--source', 'assets/originals');
const LABEL = arg('--label', 'assets/originals');
const QUALITY = arg('--quality', 'medium') as 'low' | 'medium' | 'high';
const CONCURRENCY = Number(arg('--concurrency', '3'));
const MIN = Number(arg('--min', '5'));
const OUT = path.join('work', 'quality');
const THUMBS = path.join('checkpoints', 'quality');

// Rough list prices (USD per 1M tokens) used only for the estimate column.
const IMAGE_TOKEN_USD = Number(process.env.IMAGE_TOKEN_USD_PER_M ?? 40);
const VISION_TOKEN_USD = Number(process.env.VISION_TOKEN_USD_PER_M ?? 5);

type Row = { name: string; context: string; consent: string; result?: RestoreResult; colour?: Buffer; error?: string; thumbs: string[] };

async function readSidecar(file: string): Promise<{ context: string; consent: string }> {
  const md = file.replace(/\.[^.]+$/, '.md');
  try {
    const text = await fs.readFile(md, 'utf8');
    const get = (k: string) => text.match(new RegExp(`^${k}:\\s*(.+)$`, 'mi'))?.[1]?.trim() ?? '';
    return { context: get('context') || text.split('\n').find((l) => l.trim() && !l.includes(':'))?.trim() || '', consent: get('consent').toLowerCase() };
  } catch {
    return { context: '', consent: '' };
  }
}

async function thumb(buf: Buffer, file: string): Promise<string> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await sharp(buf).resize(360, 360, { fit: 'inside' }).jpeg({ quality: 78 }).toFile(file);
  return file;
}

async function processOne(file: string): Promise<Row> {
  const name = path.basename(file).replace(/\.[^.]+$/, '');
  const side = await readSidecar(file);
  const row: Row = { name, ...side, thumbs: [] };
  const dir = path.join(OUT, name);
  await fs.mkdir(dir, { recursive: true });
  try {
    const input = await fs.readFile(file);
    const result = await restore(input, { quality: QUALITY, timeoutMs: 180_000 });
    row.result = result;
    await fs.writeFile(path.join(dir, 'original.jpg'), result.original);
    await fs.writeFile(path.join(dir, 'restored.jpg'), result.restored);
    await Promise.all(result.candidates.map((c, i) => fs.writeFile(path.join(dir, `candidate-${i}.jpg`), c)));
    await fs.writeFile(path.join(dir, 'preview.jpg'), await makePreview(result.restored));
    await fs.writeFile(path.join(dir, 'mockup.jpg'), await makeMockup(result.restored));
    await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify(result.meta, null, 2));
    row.thumbs.push(await thumb(result.original, path.join(THUMBS, `${name}-original.jpg`)));
    row.thumbs.push(await thumb(result.restored, path.join(THUMBS, `${name}-restored.jpg`)));
    if (result.isMonochrome) {
      try {
        const c = await colourise(result.restored, QUALITY);
        row.colour = c.image;
        result.meta.colourisationMs = c.ms;
        result.meta.usage.imageTokens += c.tokens;
        await fs.writeFile(path.join(dir, 'colourised.jpg'), c.image);
        row.thumbs.push(await thumb(c.image, path.join(THUMBS, `${name}-colour.jpg`)));
      } catch (e) {
        row.error = `colourisation failed: ${e instanceof Error ? e.message : e}`;
      }
    }
  } catch (e) {
    row.error = e instanceof RestoreError ? `${e.code}: ${e.message}` : String(e);
  }
  return row;
}

async function main() {
  const files = (await fs.readdir(SOURCE)).filter((f) => /\.(jpe?g|png|webp|heic|heif|tiff?)$/i.test(f)).map((f) => path.join(SOURCE, f)).sort();
  if (files.length < MIN) {
    console.error(`Only ${files.length} usable originals in ${SOURCE}. Need at least ${MIN}.`);
    process.exit(2);
  }
  const rows: Row[] = [];
  const queue = [...files];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) { const f = queue.shift()!; console.log('→', f); rows.push(await processOne(f)); console.log('✓', f); }
  }));
  rows.sort((a, b) => a.name.localeCompare(b.name));

  const lines: string[] = [];
  lines.push('# QUALITY_REPORT');
  lines.push('');
  lines.push(`Source: \`${SOURCE}\` (${LABEL}). Model: ${rows.find((r) => r.result)?.result?.meta.model ?? '?'} at quality **${QUALITY}**, 2 candidates, vision check ${rows.find((r) => r.result)?.result?.meta.visionModel ?? '?'}. Generated ${new Date().toISOString()}.`);
  lines.push('');
  lines.push('Automated columns come from the pipeline. The two **own rating** columns (likeness, naturalness, 1–5) are filled in by hand after looking at the full-size files in `work/quality/<name>/` — see the notes under each image.');
  lines.push('');
  lines.push('| Image | Original | Restored | Colour | Restore s | Total s | Tokens (img / vision) | Est. USD | SSIM (chosen / other) | Faces A→B | Vision JSON | Manual review |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    if (!r.result) { lines.push(`| ${r.name} | — | — | — | — | — | — | — | — | — | ERROR: ${r.error ?? ''} | — |`); continue; }
    const m = r.result.meta;
    const usd = (m.usage.imageTokens / 1e6) * IMAGE_TOKEN_USD + (m.usage.visionTokens / 1e6) * VISION_TOKEN_USD;
    const img = (i: number) => (r.thumbs[i] ? `![](${r.thumbs[i]})` : '—');
    const other = m.candidateSsim.filter((_, i) => i !== m.candidateId).map((s) => s.toFixed(3)).join(', ') || '—';
    const v = m.likeness ? `same_people=${m.likeness.same_people}, likeness=${m.likeness.likeness}, invented=${m.likeness.invented_details}, removed=${m.likeness.removed_content}, over=${m.likeness.over_processed}` : 'n/a';
    lines.push(`| ${r.name} | ${img(0)} | ${img(1)} | ${img(2)} | ${(m.restorationMs / 1000).toFixed(0)} | ${(m.durationMs / 1000).toFixed(0)} | ${m.usage.imageTokens} / ${m.usage.visionTokens} | ${usd.toFixed(2)} | ${m.ssim.toFixed(3)} / ${other} | ${m.faceCheck ? `${m.faceCheck.original}→${m.faceCheck.restored}` : '?'} | ${v} | ${m.needsManualReview ? `**yes** (${m.reviewReasons.join(', ')})` : 'no'} |`);
  }
  lines.push('');
  lines.push('## Per-image notes and own ratings');
  lines.push('');
  for (const r of rows) {
    lines.push(`### ${r.name}`);
    if (r.context) lines.push(`Context: ${r.context}${r.consent ? ` · consent: ${r.consent}` : ''}`);
    if (r.result) {
      const m = r.result.meta;
      lines.push(`Input ${m.input.width}×${m.input.height}${m.input.trimmed ? ', border trimmed' : ''}${m.input.upscaled ? ', upscaled before send' : ''} → output ${m.output.width}×${m.output.height}. Chroma std ${m.chroma.chromaStd.toFixed(1)} (${m.chroma.isMonochrome ? 'monochrome/sepia' : 'colour'}).`);
      if (m.likeness?.notes) lines.push(`Vision notes: ${m.likeness.notes}`);
    }
    if (r.error) lines.push(`Error: ${r.error}`);
    lines.push('');
    lines.push('- Own likeness (1–5): _[fill in]_');
    lines.push('- Own naturalness (1–5): _[fill in]_');
    lines.push('- Notes: _[fill in]_');
    lines.push('');
  }
  await fs.mkdir('work', { recursive: true });
  await fs.writeFile('QUALITY_REPORT.md', lines.join('\n'));
  await fs.writeFile(path.join(OUT, 'rows.json'), JSON.stringify(rows.map((r) => ({ name: r.name, context: r.context, consent: r.consent, error: r.error, meta: r.result?.meta ?? null })), null, 2));
  console.log('Wrote QUALITY_REPORT.md');
}

main().catch((e) => { console.error(e); process.exit(1); });
