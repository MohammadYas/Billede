// All prices live here. Enabling a second format later = flip `enabled`
// and add a Stripe price id in HANDOFF/env. Mockup generator, line-item
// builder and admin all read from this file.
export const PRICING = {
  '20x30': { priceDkk: 449, enabled: false, widthCm: 20, heightCm: 30 },
  '30x40': { priceDkk: 599, enabled: true, widthCm: 30, heightCm: 40 },
  '40x50': { priceDkk: 799, enabled: false, widthCm: 40, heightCm: 50 },
  '50x70': { priceDkk: 999, enabled: false, widthCm: 50, heightCm: 70 },
} as const;

export type Format = keyof typeof PRICING;
export const FORMATS = Object.keys(PRICING) as Format[];
export const DEFAULT_FORMAT: Format = '30x40';

export function isFormat(value: unknown): value is Format {
  return typeof value === 'string' && value in PRICING;
}

/** The single format the customer flow exposes this week. */
export function customerFormat(): Format {
  const enabled = FORMATS.filter((f) => PRICING[f].enabled);
  return enabled.includes(DEFAULT_FORMAT) ? DEFAULT_FORMAT : enabled[0];
}

export function priceOere(format: Format): number {
  return PRICING[format].priceDkk * 100;
}

/** Danish price formatting: "599 kr." / "1.500 kr." */
export function formatDkk(dkk: number): string {
  return `${new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 }).format(dkk)} kr.`;
}

export function formatLabel(format: Format): string {
  return `${PRICING[format].widthCm}×${PRICING[format].heightCm} cm`;
}

export function lineItemName(format: Format): string {
  return `Restaureret og indrammet familiebillede, ${formatLabel(format)}`;
}
