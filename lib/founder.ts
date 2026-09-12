import fs from 'node:fs';
import path from 'node:path';

export type Founder = {
  name: string; firstName: string; city: string; cvr: string; email: string; address: string;
  /** the registered company behind the CVR number; the seller on the legal pages and in the footer */
  company: string;
  portrait: string | null; why: string[];
  /** true when every legally required field is filled (no TODO). */
  complete: boolean;
  /**
   * Fields whose line in founder.md still carries the owner's own TODO marker. The value is shown —
   * "4241 Vemmelev" is better than nothing — but it is not finished, and the legal pages say so rather
   * than wearing a blanket "udkast" label that tells a hesitant customer nothing they can act on.
   */
  pending: string[];
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
  const raw = (k: string) => (text.match(new RegExp(`^${k}:\\s*(.*)$`, 'mi'))?.[1] ?? '').trim();
  const get = (k: string) => clean(raw(k));
  /** the owner's own "(TODO – …)" on a line: filled in enough to show, not finished */
  const isPending = (k: string) => /\btodo\b/i.test(raw(k));
  const whyBlock = text.split(/^why:\s*$/mi)[1] ?? '';
  const why = whyBlock.split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter((l) => l && !/^todo\b/i.test(l));
  const portraitName = get('portrait');
  const portraitPath = portraitName ? path.join(process.cwd(), 'assets', 'founder', portraitName) : '';
  const portrait = portraitPath && fs.existsSync(portraitPath) ? portraitName : null;
  const name = get('name');
  const firstName = get('firstName') || name.split(' ')[0] || '';
  cache = {
    name, firstName, city: get('city'), cvr: get('cvr'), email: get('email'), address: get('address'),
    company: get('company'),
    portrait, why,
    complete: Boolean(name && get('city') && get('cvr') && get('email') && get('address')),
    pending: (['name', 'cvr', 'address', 'email'] as const).filter((k) => !get(k) || isPending(k)),
  };
  return cache;
}

/**
 * No telephone number anywhere: support is e-mail only (see DECISIONS.md), so founder.md
 * carries no phone field and no surface can print one.
 */

/**
 * "[fornavn]" in copy → the first name, but only once the person is actually on the page
 * (portrait + "why" lines in founder.md). A first name without a face reads as a persona, so
 * until then the copy says "vi". The full name still appears in the footer and legal pages.
 */
export function fornavn(): string {
  const f = getFounder();
  return f.portrait && f.why.length > 0 && f.firstName ? f.firstName : 'vi';
}

/**
 * What a legally required field shows while it is empty. In development the bracketed reminder, so
 * the owner sees exactly which line of founder.md is missing; in production nothing at all — and the
 * production build has already refused to run without these values (next.config.ts), so this branch
 * is the belt behind that suspender. No environment can print "[Udfyld …]" to a customer.
 */
export function missing(label: string): string {
  return process.env.NODE_ENV === 'production' ? '' : `[Udfyld: ${label}]`;
}
