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
 * The two products.
 *
 * `framed` is the parcel that exists today: restoration, print, frame, file, shipping.
 * `digital` is the same restoration without the parcel — the high-resolution file and nothing else.
 * It is finished code behind a flag, because the price is the owner's to set and a price nobody has
 * approved must never reach a customer. Both halves are required: a flag without a price is off, and
 * a price without the flag is off. Everything downstream asks `sellableProduct`, so a browser that
 * posts `product: "digital"` while the offer is off buys the framed parcel at the framed price.
 * ------------------------------------------------------------------------- */
export const PRODUCTS = ['framed', 'digital'] as const;
export type Product = (typeof PRODUCTS)[number];
export const DEFAULT_PRODUCT: Product = 'framed';
export function isProduct(v: unknown): v is Product {
  return v === 'framed' || v === 'digital';
}

export type DigitalOffer = { enabled: boolean; priceDkk: number };

/** Reads the digital offer out of the environment. Both halves required; anything else is off. */
export function digitalOffer(env: Record<string, string | undefined> = process.env): DigitalOffer {
  const priceDkk = Math.max(0, Math.trunc(Number(env.NEXT_PUBLIC_DIGITAL_PRICE_DKK ?? 0)) || 0);
  return { enabled: env.NEXT_PUBLIC_DIGITAL_ENABLED === 'true' && priceDkk > 0, priceDkk };
}

/** The product an order is allowed to be (anything else, or a disabled offer, is the framed parcel). */
export function sellableProduct(value: unknown, offer: DigitalOffer = digitalOffer()): Product {
  return value === 'digital' && offer.enabled ? 'digital' : DEFAULT_PRODUCT;
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
export function quote(input: { product?: unknown; digital?: DigitalOffer; format?: unknown; frame?: unknown; extraPrints?: unknown; landscape?: boolean; campaign?: boolean } = {}): Quote {
  const offer = input.digital ?? digitalOffer();
  const product = sellableProduct(input.product, offer);
  const format = sellableFormat(input.format);
  const addons = readAddOns({ frame: input.frame, extraPrints: input.extraPrints });
  const landscape = Boolean(input.landscape);
  const label = formatLabelFor(format, landscape);
  // The digital file has no size, no frame and no parcel: one line, one price, and the print add-ons
  // are dropped rather than ignored, so the bill on the page and the order row say the same thing.
  if (product === 'digital') {
    const lines: QuoteLine[] = [{
      key: 'digital',
      name: 'Restaureret familiebillede, digital fil i høj opløsning',
      short: 'Restaureret billede, digital fil',
      note: 'Fil i høj opløsning uden vandmærke · klar til download, når du har godkendt billedet',
      quantity: 1,
      unitOere: offer.priceDkk * 100,
      amountOere: offer.priceDkk * 100,
    }];
    return { product, format, label, addons: { ...DEFAULT_ADDONS }, lines, totalOere: lines[0].amountOere, needsAddress: false };
  }
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
