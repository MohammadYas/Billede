import fs from 'node:fs';
import path from 'node:path';

export type Founder = {
  name: string; firstName: string; city: string; cvr: string; phone: string; email: string; address: string;
  portrait: string | null; why: string[];
  /** true when every legally required field is filled (no TODO). */
  complete: boolean;
};

const FILE = path.join(process.cwd(), 'assets', 'founder', 'founder.md');
let cache: Founder | null = null;

function clean(v: string | undefined): string {
  const t = (v ?? '').trim();
  return /^todo\b/i.test(t) || t === '' ? '' : t.replace(/\s*\(TODO.*\)$/i, '').trim();
}

/** Parses assets/founder/founder.md. Missing or TODO fields come back empty, and the UI hides them. */
export function getFounder(): Founder {
  if (cache) return cache;
  let text = '';
  try { text = fs.readFileSync(FILE, 'utf8'); } catch { /* no file */ }
  const get = (k: string) => clean(text.match(new RegExp(`^${k}:\\s*(.*)$`, 'mi'))?.[1]);
  const whyBlock = text.split(/^why:\s*$/mi)[1] ?? '';
  const why = whyBlock.split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter((l) => l && !/^todo\b/i.test(l));
  const portraitName = get('portrait');
  const portraitPath = portraitName ? path.join(process.cwd(), 'assets', 'founder', portraitName) : '';
  const portrait = portraitPath && fs.existsSync(portraitPath) ? portraitName : null;
  const name = get('name');
  const firstName = get('firstName') || name.split(' ')[0] || '';
  cache = {
    name, firstName, city: get('city'), cvr: get('cvr'), phone: get('phone'), email: get('email'), address: get('address'),
    portrait, why,
    complete: Boolean(name && get('city') && get('cvr') && get('phone') && get('email') && get('address')),
  };
  return cache;
}

/**
 * "[fornavn]" in copy → the first name, but only once the person is actually on the page
 * (portrait + "why" lines in founder.md). A first name without a face reads as a persona, so
 * until then the copy says "vi". The full name still appears in the footer and legal pages.
 */
export function fornavn(): string {
  const f = getFounder();
  return f.portrait && f.why.length > 0 && f.firstName ? f.firstName : 'vi';
}
