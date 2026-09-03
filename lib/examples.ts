import fs from 'node:fs';
import path from 'node:path';

export type Example = {
  id: string;
  before: string;   // /examples/<id>-before.jpg
  after: string;    // /examples/<id>-after.jpg
  width: number;
  height: number;
  widths?: number[]; // available long-edge sizes: <id>-<side>-<w>.jpg|webp
  caption: string;  // one line, book style
  consent: boolean;
  /** true for archive placeholders that must be replaced before launch */
  placeholder?: boolean;
};

const FILE = path.join(process.cwd(), 'public', 'examples', 'examples.json');

/** Only consented pairs are ever returned. Order = file order; first = hero. */
export function getExamples(): Example[] {
  try {
    const all = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Example[];
    return all.filter((e) => e.consent === true);
  } catch {
    return [];
  }
}
