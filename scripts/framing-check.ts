/**
 * Runs the framing step over a folder of uploads and writes the crop next to each one, so a human can see
 * what the customer would have been sold. Read-only: it touches no order and no bucket.
 *
 *   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/framing-check.ts <folder> [outFolder]
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { findPhotograph } from '@/lib/restoration/restore';
import { cropToBox, normaliseToJpeg } from '@/lib/restoration/image-utils';

const dir = process.argv[2];
const out = process.argv[3] ?? join(dir, 'cropped');
if (!dir) { console.error('usage: tsx scripts/framing-check.ts <folder> [outFolder]'); process.exit(1); }
mkdirSync(out, { recursive: true });

const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && /before/i.test(f));
console.log(`${files.length} uploads\n`);

async function main() {
for (const f of files) {
  const name = basename(f, extname(f));
  const norm = await normaliseToJpeg(readFileSync(join(dir, f)));
  const t = Date.now();
  const { result, tokens } = await findPhotograph(norm.jpeg);
  const ms = Date.now() - t;
  if (!result) { console.log(`${name.padEnd(22)} unreadable answer (${ms} ms)`); continue; }

  const willCrop = result.confident && result.surround !== 'none';
  const cut = willCrop
    ? await cropToBox(norm.jpeg, norm.dims, result.box, result.angled ? -0.02 : 0.012)
    : { jpeg: norm.jpeg, dims: norm.dims, cropped: false };
  const area = (result.box.w * result.box.h * 100).toFixed(0);

  console.log(
    name.padEnd(22),
    result.surround.padEnd(8),
    result.confident ? 'sure  ' : 'unsure',
    result.angled ? 'angled' : '      ',
    `keeps ${area}%`.padEnd(11),
    cut.cropped ? `CROPPED ${norm.dims.width}x${norm.dims.height} -> ${cut.dims.width}x${cut.dims.height}` : 'kept as is',
    `| ${ms} ms, ${tokens} tok`,
  );
  console.log('   ', result.notes);
  if (cut.cropped) writeFileSync(join(out, `${name}-cropped.jpg`), cut.jpeg);
}
console.log(`\ncrops in ${out}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
