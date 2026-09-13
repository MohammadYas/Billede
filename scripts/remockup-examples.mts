/**
 * Re-draws only the wall mockups of the exported examples (public/examples/<id>-mockup*.jpg|webp) from the
 * exported "after" pictures, without running the restoration again. Use after a change to
 * lib/restoration/mockup.ts or to public/mockup/wall.jpg:   npx tsx scripts/remockup-examples.mts
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { makeMockup } from '@/lib/restoration/mockup';

const OUT = 'public/examples';
const list = JSON.parse(await fs.readFile(path.join(OUT, 'examples.json'), 'utf8')) as { id: string; after: string; mockup?: string }[];
for (const e of list) {
  const after = await fs.readFile(path.join('public', e.after));
  const mock = await makeMockup(after, { width: 1200 });
  await sharp(mock).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, `${e.id}-mockup.jpg`));
  await sharp(mock).resize(800).webp({ quality: 74 }).toFile(path.join(OUT, `${e.id}-mockup-800.webp`));
  await sharp(mock).resize(480).jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(OUT, `${e.id}-mockup-480.jpg`));
  console.log('mockup', e.id);
}
