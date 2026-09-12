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

/**
 * The same price split in two, for anywhere it is set large in the display face. Tabular figures give
 * every glyph a digit's width — including the full stop in "kr.", which then floats a space away from
 * the r. Only the figures need the fixed width (so the total does not shuffle as it counts), so only
 * the figures get it: `["599", "kr."]`.
 */
export function dkkParts(dkk: number): [string, string] {
  return [new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 }).format(dkk), 'kr.'];
}
export function oereParts(oere: number): [string, string] {
  return dkkParts(Math.round(oere / 100));
}

export function formatLabel(format: Format): string {
  return `${PRICING[format].widthCm}×${PRICING[format].heightCm} cm`;
}

/** A landscape photograph is printed landscape: "40×30 cm". */
export function formatLabelFor(format: Format, landscape = false): string {
  const s = PRICING[format];
  return landscape ? `${s.heightCm}×${s.widthCm} cm` : `${s.widthCm}×${s.heightCm} cm`;
}

export function lineItemName(format: Format, landscape = false): string {
  return `Restaureret og indrammet familiebillede, ${formatLabelFor(format, landscape)}`;
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

/* ---------------------------------------------------------------------------
 * The three products.
 *
 * `framed`  — the parcel the site was built around: restoration, print, frame with mount and glass,
 *             the high-resolution file, free shipping. From 599 kr., four sizes.
 * `print`   — the same photograph as a loose 20×30 print with the file. No frame, no glass, so it
 *             goes in a flat envelope: the cheapest thing that still arrives in somebody's hands.
 * `digital` — the file alone. Nothing is posted, so Stripe is not asked for an address.
 *
 * The two small ones are configuration, not code. Both halves are required — a flag without a price
 * is off, and a price without the flag is off — so a price nobody approved can never be charged, and
 * either can be withdrawn without a deploy. Everything downstream asks `sellableProduct`, so a
 * browser posting `product: "digital"` while that offer is off buys the framed parcel at its price.
 * ------------------------------------------------------------------------- */
export const PRODUCTS = ['framed', 'print', 'digital'] as const;
export type Product = (typeof PRODUCTS)[number];
export const DEFAULT_PRODUCT: Product = 'framed';
export function isProduct(v: unknown): v is Product {
  return typeof v === 'string' && (PRODUCTS as readonly string[]).includes(v);
}

/** The loose print has one size. It is not part of the framed ladder, which stays as it is. */
export const PRINT_FORMAT: Format = '20x30';

export type ProductOffer = { enabled: boolean; priceDkk: number };
export type Offers = { print: ProductOffer; digital: ProductOffer };

/** Reads both small offers out of the environment. Both halves required, per product. */
export function productOffers(env: Record<string, string | undefined> = process.env): Offers {
  const read = (flag: string | undefined, price: string | undefined): ProductOffer => {
    const priceDkk = Math.max(0, Math.trunc(Number(price ?? 0)) || 0);
    return { enabled: flag === 'true' && priceDkk > 0, priceDkk };
  };
  return {
    print: read(env.NEXT_PUBLIC_PRINT_ENABLED, env.NEXT_PUBLIC_PRINT_PRICE_DKK),
    digital: read(env.NEXT_PUBLIC_DIGITAL_ENABLED, env.NEXT_PUBLIC_DIGITAL_PRICE_DKK),
  };
}

/**
 * The product an order is allowed to be (anything else, or an offer that is off, is the framed
 * parcel). The price is checked here as well as in `productOffers`, because an `Offers` object can
 * be hand-built by a caller and a product with no price is a product that cannot be charged for.
 */
const sellable = (o: ProductOffer) => o.enabled && o.priceDkk > 0;
export function sellableProduct(value: unknown, offers: Offers = productOffers()): Product {
  if (value === 'digital' && sellable(offers.digital)) return 'digital';
  if (value === 'print' && sellable(offers.print)) return 'print';
  return DEFAULT_PRODUCT;
}

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
export type Quote = {
  product: Product;
  format: Format; /** "30×40 cm" or "40×30 cm" — the frame follows the photograph */ label: string;
  addons: AddOns; lines: QuoteLine[]; totalOere: number;
  /** Stripe asks for a delivery address only when something is actually posted. */
  needsAddress: boolean;
};

/**
 * Launch offer (lib/config.ts `campaignEndDate`): while it runs, the first extra copy is in the parcel at 0 kr.
 * `campaign` is passed in by the caller, never read from the clock here, so the arithmetic stays a pure function
 * and the server decides the date once, at checkout.
 */
export const CAMPAIGN_FREE_EXTRA_COPIES = 1;

/** The one place an order's amount is decided. Input is untrusted; output is always sellable. */
export function quote(input: { product?: unknown; offers?: Offers; format?: unknown; frame?: unknown; extraPrints?: unknown; landscape?: boolean; campaign?: boolean } = {}): Quote {
  const offers = input.offers ?? productOffers();
  const product = sellableProduct(input.product, offers);
  const landscape = Boolean(input.landscape);
  // A small product has one line, one price and no add-ons. The print options are dropped rather than
  // ignored, so the bill on the page, the order row and Stripe all say the same thing.
  if (product !== 'framed') {
    const single = (key: string, name: string, short: string, note: string, priceDkk: number, fmt: Format, needsAddress: boolean): Quote => ({
      product, format: fmt, label: formatLabelFor(fmt, landscape), addons: { ...DEFAULT_ADDONS }, needsAddress,
      lines: [{ key, name, short, note, quantity: 1, unitOere: priceDkk * 100, amountOere: priceDkk * 100 }],
      totalOere: priceDkk * 100,
    });
    if (product === 'digital') {
      return single('digital',
        'Restaureret familiebillede, digital fil i høj opløsning',
        'Restaureret billede, digital fil',
        'Fil i høj opløsning uden vandmærke · klar til download, når du har godkendt billedet',
        offers.digital.priceDkk, sellableFormat(input.format), false);
    }
    const printLabel = formatLabelFor(PRINT_FORMAT, landscape);
    return single('print_only',
      `Restaureret familiebillede, print ${printLabel} uden ramme`,
      `Restaureret billede, print ${printLabel}`,
      'Mat fotopapir, uden ramme · digital fil i høj opløsning inkluderet · fri fragt',
      offers.print.priceDkk, PRINT_FORMAT, true);
  }
  const format = sellableFormat(input.format);
  const addons = readAddOns({ frame: input.frame, extraPrints: input.extraPrints });
  const label = formatLabelFor(format, landscape);
  const lines: QuoteLine[] = [
    {
      key: 'print',
      name: lineItemName(format, landscape),
      short: `Restaureret billede, ${label}`,
      note: `${label} · ${addons.frame === 'eg' ? 'egetræsramme' : 'sort ramme'} med passepartout og glas · digital fil i høj opløsning inkluderet · fri fragt`,
      quantity: 1,
      unitOere: priceOere(format),
      amountOere: priceOere(format),
    },
  ];
  if (addons.extraPrints > 0) {
    const unit = EXTRA_PRINT_DKK[format] * 100;
    const free = input.campaign ? Math.min(CAMPAIGN_FREE_EXTRA_COPIES, addons.extraPrints) : 0;
    if (free > 0) {
      lines.push({
        key: 'extra_print_free',
        name: `Ekstra eksemplar, ${label} – lanceringstilbud`,
        short: `Ekstra eksemplar, ${label}`,
        note: 'Lanceringstilbud: med i pakken uden beregning',
        quantity: free,
        unitOere: 0,
        amountOere: 0,
      });
    }
    const paid = addons.extraPrints - free;
    if (paid > 0) {
      lines.push({
        key: 'extra_print',
        name: `Ekstra eksemplar, ${label}`,
        short: `Ekstra eksemplar, ${label}`,
        note: 'Samme billede, samme ramme – til en anden i familien',
        quantity: paid,
        unitOere: unit,
        amountOere: unit * paid,
      });
    }
  }
  const totalOere = lines.reduce((sum, l) => sum + l.amountOere, 0);
  return { product, format, label, addons, lines, totalOere, needsAddress: true };
}

export function formatOere(oere: number): string {
  return formatDkk(Math.round(oere / 100));
}
