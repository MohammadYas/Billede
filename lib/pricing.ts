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
/**
 * The size we recommend, marked "Vores anbefaling" on both pages. It is an opinion, stated as one —
 * not "mest populære", which would be a statistic nobody has yet. The order still starts on the
 * default above, so nothing costs more than the price the landing page quotes until the customer picks it.
 */
export const RECOMMENDED_FORMAT: Format = '40x50';

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

/* ---------------------------------------------------------------------------
 * Frames and add-ons.
 *
 * Everything the customer can add is priced here and nowhere else. The browser
 * renders a quote so the total is live under the finger; the server builds the
 * same quote again before Stripe sees it, so the page can never move the amount.
 * Nothing is pre-selected: an add-on the customer did not tick is an add-on they
 * did not buy (and Danish marketing law agrees).
 * ------------------------------------------------------------------------- */

export type Frame = 'sort' | 'eg';
export const FRAMES: Frame[] = ['sort', 'eg'];
export function isFrame(v: unknown): v is Frame {
  return v === 'sort' || v === 'eg';
}
/** The mockup generator speaks English colours. */
export function frameColour(frame: Frame): 'black' | 'oak' {
  return frame === 'eg' ? 'oak' : 'black';
}

/**
 * A second framed copy of the same photograph — the restoration is already paid for, so only the object
 * repeats. One price at every size, so the offer is a single sentence the customer can hold in their head.
 * (Per-size prices would go here if the margin on a big frame ever demands it.)
 */
export const EXTRA_PRINT_DKK: Record<Format, number> = { '20x30': 349, '30x40': 349, '40x50': 349, '50x70': 349 };
export const MAX_EXTRA_PRINTS = 3;
/*
 * There is deliberately no discount on a *new* photograph ordered from a receipt link. Two prices are
 * all a customer should have to hold in their head: another copy of the same picture is 349 kr., and a
 * new picture costs what a picture costs. A third, conditional price is where surprises come from.
 */

export type AddOns = { frame: Frame; extraPrints: number };
export const DEFAULT_ADDONS: AddOns = { frame: 'sort', extraPrints: 0 };

export function readAddOns(value: unknown): AddOns {
  const v = (value ?? {}) as { frame?: unknown; extraPrints?: unknown };
  const n = Number(v.extraPrints);
  return {
    frame: isFrame(v.frame) ? v.frame : DEFAULT_ADDONS.frame,
    extraPrints: Number.isFinite(n) ? Math.min(MAX_EXTRA_PRINTS, Math.max(0, Math.trunc(n))) : 0,
  };
}

/** `name` is what Stripe and the receipt print; `short` is what the bill on the page shows. */
export type QuoteLine = { key: string; name: string; short: string; note?: string; quantity: number; unitOere: number; amountOere: number };
export type Quote = { format: Format; addons: AddOns; lines: QuoteLine[]; totalOere: number };

/** The one place an order's amount is decided. Input is untrusted; output is always sellable. */
export function quote(input: { format?: unknown; frame?: unknown; extraPrints?: unknown } = {}): Quote {
  const format = sellableFormat(input.format);
  const addons = readAddOns({ frame: input.frame, extraPrints: input.extraPrints });
  const label = formatLabel(format);
  const lines: QuoteLine[] = [
    {
      key: 'print',
      name: lineItemName(format),
      short: `Restaureret billede, ${label}`,
      note: `${label} · ${addons.frame === 'eg' ? 'egetræsramme' : 'sort ramme'} med passepartout og glas · digital fil i høj opløsning inkluderet · fri fragt`,
      quantity: 1,
      unitOere: priceOere(format),
      amountOere: priceOere(format),
    },
  ];
  if (addons.extraPrints > 0) {
    const unit = EXTRA_PRINT_DKK[format] * 100;
    lines.push({
      key: 'extra_print',
      name: `Ekstra eksemplar, ${label}`,
      short: `Ekstra eksemplar, ${label}`,
      note: 'Samme billede, samme ramme – til en anden i familien',
      quantity: addons.extraPrints,
      unitOere: unit,
      amountOere: unit * addons.extraPrints,
    });
  }
  const totalOere = lines.reduce((sum, l) => sum + l.amountOere, 0);
  return { format, addons, lines, totalOere };
}

export function formatOere(oere: number): string {
  return formatDkk(Math.round(oere / 100));
}
