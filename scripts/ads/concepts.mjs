// The creative system: six buying motives, one idea per ad. A cold ad carries a hook, visual proof and one
// CTA/value line with the price qualifier — nothing else. Copy and assets live here; scripts/ads/static.mjs
// and scripts/ads/video.mjs only render. Facts: docs/landing-brief-2026-09-08.md (nothing invented here).
import { readFileSync } from 'node:fs';

export const PRICE = 'I ramme fra 599 kr.';
export const CTA = {
  own: 'Se dit billede restaureret gratis',
  first: 'Se resultatet gratis først',
  look: 'Se restaureringen gratis',
};
const scene = (name) => `work/ads/creatives/${name}-1080x1350.jpg`;
export const pairSrc = (id, side) => `public/examples/${id}-${side}-1400.jpg`;

/** The launch offer is read from lib/config.ts (env first): the offer concept exists only while it is on. */
export function campaign() {
  const src = readFileSync('lib/config.ts', 'utf8');
  const m = src.match(/campaignEndDate: process\.env\.CAMPAIGN_END_DATE \?\? '(\d{4}-\d{2}-\d{2})'/);
  const end = process.env.CAMPAIGN_END_DATE ?? m?.[1] ?? '';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Copenhagen' }).format(new Date());
  const active = /^\d{4}-\d{2}-\d{2}$/.test(end) && today <= end;
  const [y, mo, d] = end.split('-').map(Number);
  const until = active ? new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, mo - 1, d))) : '';
  return { active, until };
}
export const offer = campaign();

/**
 * One concept = one buying motive.
 *   stage    cold | retargeting | offer
 *   style    polished | ugc (caption boxes, no brand mark, less polish — social content, not an ad)
 *   hooks    the first renders by default; the rest are hook variants (--hooks renders every one)
 *   sub      one optional supporting line (only trust / original / physical / offer carry one)
 *   visual   the static: { kind: scene|split|framed, … } — scene = a composed photograph from
 *            work/ads/creatives; split = the same face half damaged / half restored (never a group photo);
 *            framed = the restored picture in a black frame on the wall, the old print in front of it.
 *   text     where the hook sits on 4:5 and 1:1 (top | bottom); 9:16 puts text in the bands above and below.
 *   pair     the example pair for the before → after reveal, with the crop position both sides share.
 *   reel     the 9:16 reel (scripts/ads/reel.mjs): `open` = where the old print starts (a scene with the
 *            print's box in 4:5 px and an optional `zoom` about that print, a print on a table, or the photo full-screen), `line` under the frame, `hookAt: 'bottom'` when the top of the scene is busy,
 *            `endLine` over the CTA. Absent = static only.
 */
export const CONCEPTS = [
  {
    key: 'memory', motive: 'Memory / self-recognition', stage: 'cold', style: 'polished',
    hooks: ['Har du også sådan et billede?', 'Har du også ét billede, ingen nænner at smide ud?'],
    cta: CTA.own, price: PRICE,
    visual: { kind: 'scene', src: scene('familie-ved-vandet-1948-i-haenderne'), pos: '50% 45%' }, text: 'top',
    pair: 'portraet-1962', pairPos: '50% 22%',
    reel: { open: { kind: 'scene', src: scene('portraet-1962-skuffen'), box: { x: 455, y: 613, w: 174, h: 256 } }, hookAt: 'bottom', line: 'Print, ramme og fri fragt' },
  },
  {
    key: 'gift', motive: 'Gift', stage: 'cold', style: 'polished',
    hooks: ['Hvad giver man sine forældre, når de allerede har alt?', 'Har du også ét billede fra dine forældres bryllup?'],
    sub: 'Et billede, de troede var tabt.',
    cta: CTA.first, price: PRICE,
    visual: { kind: 'framed' }, text: 'top',
    pair: 'bryllup-1954', pairPos: '50% 30%',
    reel: { open: { kind: 'scene', src: scene('bryllup-1954-koekkenbord'), box: { x: 283, y: 648, w: 477, h: 276 }, zoom: 1.6 }, line: 'Lån billedet et øjeblik. Resten kan være en overraskelse.' },
  },
  {
    key: 'reveal', motive: 'Before/after as the buying reason (cold)', stage: 'cold', style: 'polished',
    hooks: ['Så tydeligt har du ikke set hende i 60 år.', 'Nogle billeder bliver ved med at betyde noget, selv når papiret falmer.'],
    cta: CTA.own, price: PRICE,
    visual: { kind: 'split', pair: 'portraet-1962', pos: '50% 18%', seam: 50 }, text: 'bottom',
  },
  {
    key: 'trust', motive: 'Trust / likeness', stage: 'retargeting', style: 'polished',
    hooks: ['Det skal stadig ligne hende.'],
    sub: 'Vi gennemgår ansigterne. Du godkender før print.',
    cta: CTA.own, price: PRICE,
    visual: { kind: 'split', pair: 'portraet-1962', pos: '50% 18%', seam: 50 }, text: 'bottom',
  },
  {
    key: 'original', motive: 'Friction / the original stays home', stage: 'cold', style: 'polished',
    hooks: ['Du skal ikke sende originalen.', 'Du skal ikke sende det gamle billede nogen steder.'],
    sub: 'Et foto med mobilen er nok.',
    cta: CTA.look, price: PRICE,
    visual: { kind: 'scene', src: scene('bryllup-1954-koekkenbord'), pos: '50% 40%' }, text: 'top',
    pair: 'bryllup-1954', pairPos: '50% 30%',
    reel: { open: { kind: 'scene', src: scene('bryllup-1954-koekkenbord'), box: { x: 283, y: 648, w: 477, h: 276 } }, endLine: 'Et foto med mobilen er nok.' },
  },
  {
    key: 'physical', motive: 'Physical product / value', stage: 'cold', style: 'polished',
    hooks: ['Det er ikke bare en fil.', 'Fra skuffen til væggen.'],
    cta: CTA.look, price: 'Print, ramme og fri fragt fra 599 kr.',
    visual: { kind: 'scene', src: scene('have-1976-paa-vaeggen'), pos: '50% 15%', shift: 100 }, text: 'top', stack1x1: true,
    pair: 'have-1976', pairPos: '50% 40%',
    reel: { open: { kind: 'before' }, line: 'Print, ramme og fri fragt fra 599 kr.' },
  },
  ...(offer.active ? [{
    key: 'offer', motive: 'Offer (only while lib/config.ts says the launch offer is on)', stage: 'offer', style: 'polished',
    hooks: ['Der er næsten altid én mere, der også husker det.'],
    big: '2 indrammede eksemplarer fra 599 kr.',
    sub: 'Ét til dig. Ét til den, der også husker det.',
    small: `Det første ekstra eksemplar af samme billede, størrelse og ramme er gratis · til og med ${offer.until}`,
    cta: CTA.first, price: null,
    visual: { kind: 'scene', src: scene('foedselsdag-1985-gaven-pakkes-op'), pos: '50% 45%' }, text: 'top',
  }] : []),
  // UGC: the same motives as social content — caption boxes, no brand mark, nothing polished.
  {
    key: 'ugc-memory', motive: 'Memory (UGC look)', stage: 'cold', style: 'ugc',
    hooks: ['Har du også sådan et billede?'],
    cta: CTA.own, price: 'Fra 599 kr. i ramme',
    visual: { kind: 'scene', src: scene('portraet-1962-skuffen'), pos: '50% 40%' }, text: 'top',
    pair: 'portraet-1962', pairPos: '50% 22%',
    reel: { open: { kind: 'scene', src: scene('portraet-1962-skuffen'), box: { x: 455, y: 613, w: 174, h: 256 } }, hookAt: 'bottom' },
  },
  {
    key: 'ugc-original', motive: 'Original stays home (UGC look)', stage: 'cold', style: 'ugc',
    hooks: ['Du skal ikke sende originalen.'],
    sub: 'Et foto med mobilen er nok.',
    cta: CTA.look, price: PRICE,
    visual: { kind: 'scene', src: scene('bryllup-1954-koekkenbord'), pos: '50% 40%' }, text: 'top',
    pair: 'bryllup-1954', pairPos: '50% 30%',
    reel: { open: { kind: 'scene', src: scene('bryllup-1954-koekkenbord'), box: { x: 283, y: 648, w: 477, h: 276 } }, endLine: 'Et foto med mobilen er nok.' },
  },
];

/** The launch set: exactly three cold statics, exported as FINAL_COLD_01–03 by `static.mjs --launch`. */
export const LAUNCH = { memory: 'FINAL_COLD_01', gift: 'FINAL_COLD_02', reveal: 'FINAL_COLD_03' };

export function pick(keys) {
  if (!keys.length) return CONCEPTS;
  return keys.map((k) => CONCEPTS.find((c) => c.key === k) ?? (console.error('unknown or inactive concept', k), null)).filter(Boolean);
}
