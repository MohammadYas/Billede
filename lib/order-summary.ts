import { CONFIG, campaignActive } from '@/lib/config';
import type { Order } from '@/lib/db/orders';
import { formatLabelFor, formatOere, quote, readAddOns, type Product, type Quote, type QuoteLine } from '@/lib/pricing';

type Meta = { product?: unknown; addons?: unknown; repeat_of?: string; share_token?: string; gift_note?: string; output?: { width?: number; height?: number }; quote?: { lines?: QuoteLine[]; totalOere?: number } };
const metaOf = (o: Order): Meta => (o.preview_meta ?? {}) as Meta;

/**
 * What this order is: the framed parcel or the file alone. Read from the order, not from today's
 * configuration — an order placed while the digital offer was on stays a digital order after it is
 * switched off again, or its own receipt would start describing a frame nobody bought.
 */
export function orderProduct(o: Order): Product {
  return metaOf(o).product === 'digital' ? 'digital' : 'framed';
}
export const isDigitalOrder = (o: Order): boolean => orderProduct(o) === 'digital';

/**
 * The order's own quote. Once checkout has run, the lines are whatever the customer agreed to — read
 * from the snapshot, never re-priced from today's PRICING, or an old receipt starts disagreeing with
 * its own total the first time a price changes.
 */
/** A landscape photograph is printed landscape: the frame turns, the price does not. Read from the restored output's proportions. */
export function isLandscape(o: Order): boolean {
  const out = metaOf(o).output;
  return Number(out?.width ?? 0) > Number(out?.height ?? 0);
}

/** "30×40 cm" or "40×30 cm" for this order. */
export function orderLabel(o: Order): string {
  return formatLabelFor(o.format, isLandscape(o));
}

export function orderQuote(o: Order): Quote {
  const m = metaOf(o);
  const a = readAddOns(m.addons);
  // the stored product is re-quoted with the offer forced on: an order that was digital stays digital,
  // whatever the flag says today, and its snapshot lines are what the receipt prints anyway
  const product = orderProduct(o);
  const live = quote({ product, digital: product === 'digital' ? { enabled: true, priceDkk: Math.round((o.amount ?? 0) / 100) } : undefined, format: o.format, frame: a.frame, extraPrints: a.extraPrints, landscape: isLandscape(o), campaign: campaignActive() });
  const snap = m.quote;
  if (snap?.lines?.length && typeof snap.totalOere === 'number') return { ...live, lines: snap.lines, totalOere: snap.totalOere };
  return live;
}

/** "30×40 cm · sort ramme · i farver · 2 ekstra eksemplarer" — for mails, admin and the print checklist. */
export function orderDescription(o: Order): string {
  const a = readAddOns(metaOf(o).addons);
  // a file has no size, no frame and no copies; only the colour choice survives
  if (isDigitalOrder(o)) return ['Digital fil i høj opløsning', o.chosen_colour ? 'i farver' : 'sort-hvid'].join(' · ');
  return [
    orderLabel(o),
    isLandscape(o) ? 'liggende' : '',
    a.frame === 'eg' ? 'egetræsramme' : 'sort ramme',
    o.chosen_colour ? 'i farver' : 'sort-hvid',
    a.extraPrints > 0 ? `${a.extraPrints} ekstra ${a.extraPrints === 1 ? 'eksemplar' : 'eksemplarer'}` : '',
  ].filter(Boolean).join(' · ');
}

/** Every line the customer agreed to, as plain text: "Restaureret … 599 kr." */
export function orderLines(o: Order): string[] {
  const q = orderQuote(o);
  return q.lines.map((l) => `${l.quantity > 1 ? `${l.quantity} × ` : ''}${l.name} — ${formatOere(l.amountOere)}`);
}

/**
 * "Endnu et billede": the link a paid order carries, on /tak and in the ordrebekræftelse. It is the
 * order's own share token, so the link cannot be guessed from an order id alone.
 */
const REPEAT_PAID: Order["status"][] = ["PAID", "IN_RETOUCH", "AWAITING_APPROVAL", "CHANGE_REQUESTED", "APPROVED", "IN_PRODUCTION", "SHIPPED", "COMPLETED"];
/** Only a paid order has one: it rides in the receipt, and `repeatSource` refuses to resolve any other. */
export function repeatLink(o: Order): string | null {
  const token = metaOf(o).share_token;
  if (!token || !REPEAT_PAID.includes(o.status)) return null;
  return `${CONFIG.siteUrl.replace(/\/$/, '')}/?igen=${encodeURIComponent(`${o.id}.${token}`)}`;
}

