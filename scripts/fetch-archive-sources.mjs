/**
 * Re-downloads the public-domain originals behind the colour example set from Wikimedia Commons
 * and trims each scan down to the photograph inside its slide mount.
 *
 *   node scripts/fetch-archive-sources.mjs                      # → assets/examples-source/
 *   node scripts/fetch-archive-sources.mjs --out work/somewhere
 *
 * The files are already committed under assets/examples-source/; this exists so the set can be
 * rebuilt from the archive at higher resolution, and so the provenance is executable, not a claim.
 * Every file below is a U.S. federal photograph (FSA/OWI colour transparency) in the public domain.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = (process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'assets/examples-source');
const UA = 'GenfundetBuild/0.1 (https://genfundet.dk)';

/**
 * name → Commons file title. The sidecar next to each output file carries the caption and the licence.
 *
 * Two groups, for two things the old example set could not show:
 *   fsa-*      1940-42 colour transparencies (U.S. federal, public domain) — a faded colour photograph.
 *   vernacular found family snapshots from the simpleinsomnia collection (CC BY 2.0) — a damaged print,
 *              with the tears, the foxing, the missing corner and the sticky-album stain a customer has.
 *              Not a museum scan: no accession number, no plate edge, no gilt mat.
 */
const FILES = {
  'whinery-familie': 'Jack Whinery and his family, homesteaders, Pie Town, New Mexico LCCN2017877757.tif',
  'whinery-tre': 'Jack Whinery, homesteader, with his wife and the youngest of his five children, Pie Town, New Mexico LCCN2017877758.tif',
  'caudill-middag': 'The Faro Caudill (family) eating dinner in their dugout, Pie Town, New Mexico LCCN2017877693.jpg',
  'far-datter': 'Homesteader feeding his daughter at the Pie Town, New Mexico Fair free barbeque LCCN2017877730.tif',
  'pige-dukke': 'Girl with doll standing by fence LCCN2017877931.tif',
  'modelfly': 'Boy building a model airplane (as girl watches), FSA camp, Robstown, Texas, LCCN2017877653.jpg',
  'pige-lade': 'Girl next to barn with chicken LCCN2017877932.tif',
  // vernacular prints — Flickr/simpleinsomnia, CC BY 2.0
  'skolefoto-pige': 'School photo of a smiling girl (10508141153).jpg',
  'to-drenge-hund': 'Damaged polaroid of two boys dressing up a dog (13428706935).jpg',
  'fotoautomat-pige': 'Grungy photo booth image of a little girl (16238851683).jpg',
  'barnevogn': 'Baby in a stroller with a creepy house in the background (10694225606).jpg',
  'barn-bil': 'Child sits on the edge of a car (12478058314).jpg',
  'kvinde-barn-hat': 'Eyeless woman and child wearing a hat (10888209904).jpg',
  'mand-hat': 'Well-dressed, confused man (10878038805).jpg',
};

/** The vernacular prints are photographed as they are — paper edge and all — so nothing is trimmed. */
const NO_TRIM = new Set(['skolefoto-pige', 'to-drenge-hund', 'fotoautomat-pige', 'barnevogn', 'barn-bil', 'kvinde-barn-hat', 'mand-hat']);

async function originalUrl(title) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  u.searchParams.set('action', 'query');
  u.searchParams.set('format', 'json');
  u.searchParams.set('titles', `File:${title}`);
  u.searchParams.set('prop', 'imageinfo');
  u.searchParams.set('iiprop', 'url');
  const r = await fetch(u, { headers: { 'User-Agent': UA } }).then((r) => r.json());
  return Object.values(r.query?.pages ?? {})[0]?.imageinfo?.[0]?.url ?? null;
}

/**
 * The archive scans include the cardboard slide mount and a black key line around the frame.
 * A customer never photographs the mount, so the "before" must be the photograph alone: find the
 * first and last row/column whose pixel variance rises above a third of the peak — the mount is flat,
 * the photograph is not — and cut just inside them.
 */
async function trimMount(buf, floor = 0.35) {
  const { width: W, height: H } = await sharp(buf, { limitInputPixels: false }).metadata();
  const s = 400;
  const { data, info } = await sharp(buf, { limitInputPixels: false }).resize(s, s, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const sd = (v) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); };
  const rows = [], cols = [];
  for (let y = 0; y < info.height; y++) { const v = []; for (let x = 0; x < info.width; x++) v.push(data[y * info.width + x]); rows.push(sd(v)); }
  for (let x = 0; x < info.width; x++) { const v = []; for (let y = 0; y < info.height; y++) v.push(data[y * info.width + x]); cols.push(sd(v)); }
  const edge = (arr) => { const t = Math.max(...arr) * floor; let a = arr.findIndex((v) => v > t), b = arr.length - 1; for (; b >= 0; b--) if (arr[b] > t) break; return [a / arr.length, b / arr.length]; };
  const [t, b] = edge(rows), [l, r] = edge(cols);
  const pad = 0.012;
  const box = {
    left: Math.max(0, Math.round((l + pad) * W)),
    top: Math.max(0, Math.round((t + pad) * H)),
  };
  box.width = Math.min(W, Math.round((r - pad) * W)) - box.left;
  box.height = Math.min(H, Math.round((b - pad) * H)) - box.top;
  if (box.width < W * 0.4 || box.height < H * 0.4) return null;
  return box;
}

// caudill-middag and far-datter have a dark, low-contrast band along one edge that the 0.35 floor
// reads as mount and cuts into the picture; they get a lower floor.
const FLOOR = { 'caudill-middag': 0.18, 'far-datter': 0.18 };

await fs.mkdir(OUT, { recursive: true });
for (const [name, title] of Object.entries(FILES)) {
  const url = await originalUrl(title);
  if (!url) { console.error('not found on Commons:', title); continue; }
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(300_000) });
  if (!res.ok) { console.error('download failed', name, res.status); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  const box = NO_TRIM.has(name) ? null : await trimMount(buf, FLOOR[name] ?? 0.35);
  const img = sharp(buf, { limitInputPixels: false }).rotate();
  const out = path.join(OUT, `${name}.jpg`);
  const info = await (box ? img.extract(box) : img).resize(3000, 3000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 93 }).toFile(out);
  console.log(name, `${info.width}×${info.height}`, `(${(buf.length / 1e6).toFixed(0)} MB from Commons)`);
}
