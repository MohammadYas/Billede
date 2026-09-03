import type { Example } from '@/lib/examples';

/** srcset for an example side; falls back to the single canonical file when no widths are recorded. */
export function exampleSrcSet(e: Example, side: 'before' | 'after', format: 'jpg' | 'webp'): string | undefined {
  if (!e.widths?.length) return undefined;
  const long = Math.max(e.width, e.height);
  return e.widths.map((w) => `/examples/${e.id}-${side}-${w}.${format} ${Math.round((w / long) * e.width)}w`).join(', ');
}

/** sizes attribute for the hero (full width on mobile, 1120 px container on desktop) and the examples grid. */
export const HERO_SIZES = '(min-width: 1024px) 1120px, 100vw';
export const GRID_SIZES = '(min-width: 768px) 45vw, 82vw';
