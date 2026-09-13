import fs from 'node:fs';
import path from 'node:path';
import type { Product } from '@/lib/pricing';

/**
 * Photographs of the actual product — a frame in somebody's hands, the parcel it arrives in, the
 * loose print between its two pieces of card.
 *
 * Everything the site shows of the physical product today is composited by code: `makeMockup` puts
 * the customer's restoration onto `public/mockup/wall.jpg`, a room nobody here has stood in. That is
 * honest as a visualisation and useless as proof, and the audience is buying an object from a Danish
 * company they have never heard of. One photograph of a real parcel does what no render can.
 *
 * So the slot exists and stays empty until it is filled. `getProductPhotos()` returns nothing when
 * the manifest is missing, malformed, or points at files that are not there — the section then does
 * not render at all, rather than showing a placeholder that quietly becomes the proof. What the owner
 * has to shoot is written in `public/produkt/README.md`.
 */
export type ProductPhoto = {
  /** file in public/produkt/ */
  file: string;
  /** what is in the picture, for someone who cannot see it */
  alt: string;
  /** one line under it, in the owner's own words */
  caption: string;
  /** which product this documents; omit for one that documents all of them */
  product?: Product;
  /**
   * true for a staged demonstration rather than a real parcel that went to a real customer. It is
   * shown with a visible label, never silently — a mocked-up parcel presented as documentation is
   * exactly the fake proof ANTI_SLOP.md exists to stop.
   */
  demo?: boolean;
};

const DIR = path.join(process.cwd(), 'public', 'produkt');
const FILE = path.join(DIR, 'produkt.json');

/** Photographs that exist on disk, in file order. An empty list means the section is not rendered. */
export function getProductPhotos(product?: Product): ProductPhoto[] {
  let all: ProductPhoto[] = [];
  try {
    all = JSON.parse(fs.readFileSync(FILE, 'utf8')) as ProductPhoto[];
  } catch {
    return [];
  }
  if (!Array.isArray(all)) return [];
  return all.filter((p) => {
    if (!p || typeof p.file !== 'string' || typeof p.alt !== 'string' || typeof p.caption !== 'string') return false;
    // a manifest entry whose file never arrived would render a broken image on the page that is
    // supposed to prove we send real things
    if (!fs.existsSync(path.join(DIR, p.file))) return false;
    return !product || !p.product || p.product === product;
  });
}
