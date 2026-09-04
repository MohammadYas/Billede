import { CONFIG } from '@/lib/config';
import type { Order } from '@/lib/db/orders';
import { formatLabel, formatOere, quote, readAddOns, REPEAT_DISCOUNT_DKK, formatDkk, type Quote, type QuoteLine } from '@/lib/pricing';

type Meta = { addons?: unknown; repeat_of?: string; share_token?: string; gift_note?: string; quote?: { lines?: QuoteLine[]; totalOere?: number } };
const metaOf = (o: Order): Meta => (o.preview_meta ?? {}) as Meta;

/**
 * The order's own quote. Once checkout has run, the lines are whatever the customer agreed to — read
 * from the snapshot, never re-priced from today's PRICING, or an old receipt starts disagreeing with
 * its own total the first time a price changes.
 */
export function orderQuote(o: Order): Quote {
  const m = metaOf(o);
  const a = readAddOns(m.addons);
  const live = quote({ format: o.format, frame: a.frame, extraPrints: a.extraPrints, repeat: Boolean(m.repeat_of) });
  const snap = m.quote;
  if (snap?.lines?.length && typeof snap.totalOere === 'number') return { ...live, lines: snap.lines, totalOere: snap.totalOere };
  return live;
}

/** "30×40 cm · sort ramme · i farver · 2 ekstra eksemplarer" — for mails, admin and the print checklist. */
export function orderDescription(o: Order): string {
  const a = readAddOns(metaOf(o).addons);
  return [
    formatLabel(o.format),
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
 * order's own share token, so only whoever holds the receipt can spend the repeat price.
 */
export function repeatLink(o: Order): string | null {
  const token = metaOf(o).share_token;
  if (!token) return null;
  return `${CONFIG.siteUrl.replace(/\/$/, '')}/?igen=${encodeURIComponent(`${o.id}.${token}`)}`;
}

export const repeatDiscount = () => formatDkk(REPEAT_DISCOUNT_DKK);
