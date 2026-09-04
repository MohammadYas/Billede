// All prices live here. The customer picks a size on the preview page; every other
// surface (mockup generator, Stripe line item, mails, admin) reads the order's format
// from this file. Adding a size = one line here.
export const PRICING = {
  '20x30': { priceDkk: 449, enabled: false, widthCm: 20, heightCm: 30 },
  '30x40': { priceDkk: 599, enabled: true, widthCm: 30, heightCm: 40 },
  '40x50': { priceDkk: 799, enabled: true, widthCm: 40, heightCm: 50 },
  '50x70': { priceDkk: 999, enabled: true, widthCm: 50, heightCm: 70 },
} as const;

export type Format = keyof typeof PRICING;
export const FORMATS = Object.keys(PRICING) as Format[];
export const DEFAULT_FORMAT: Format = '30x40';

export function isFormat(value: unknown): value is Format {
  return typeof value === 'string' && value in PRICING;
}

/** The sizes the customer can choose between, cheapest first. */
export function customerFormats(): Format[] {
  return FORMATS.filter((f) => PRICING[f].enabled).sort((a, b) => PRICING[a].priceDkk - PRICING[b].priceDkk);
}

/** The size an order starts on, and the price the landing page quotes. */
export function customerFormat(): Format {
  const enabled = customerFormats();
  return enabled.includes(DEFAULT_FORMAT) ? DEFAULT_FORMAT : enabled[0];
}

/** A size the customer is allowed to order (anything else falls back to the default). */
export function sellableFormat(value: unknown): Format {
  return isFormat(value) && PRICING[value].enabled ? value : customerFormat();
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

/** A landscape photograph is printed landscape: "40×30 cm". */
export function formatLabelFor(format: Format, landscape = false): string {
  const s = PRICING[format];
  return landscape ? `${s.heightCm}×${s.widthCm} cm` : `${s.widthCm}×${s.heightCm} cm`;
}

export function lineItemName(format: Format): string {
  return `Restaureret og indrammet familiebillede, ${formatLabel(format)}`;
}
