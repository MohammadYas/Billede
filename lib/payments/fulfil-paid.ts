import { getOrder, transition, updateOrder, type Order } from '@/lib/db/orders';
import type { VerifiedSession } from '@/lib/payments/provider';
import { orderConfirmation } from '@/lib/email/templates';
import { sendMail } from '@/lib/email/send';
import { notifyOwner } from '@/lib/email/owner';
import { logEvent } from '@/lib/analytics/events';
import { sendServerEvent, eventSourceUrl } from '@/lib/analytics/capi';
import { formatDkk } from '@/lib/pricing';
import { orderDescription, orderLines, orderQuote } from '@/lib/order-summary';

/**
 * Marks an order PAID from a verified session (webhook, /tak, or the hourly reconciliation).
 * The transition is atomic, so when the webhook and /tak race only one of them sends the mail and
 * logs the purchase. A second, different payment on an already-paid order is refunded and reported.
 */
export async function markPaid(orderId: string, s: VerifiedSession, ctx: { ip?: string | null; ua?: string | null } = {}): Promise<Order | null> {
  const order = await getOrder(orderId);
  if (!order) return null;
  if (!s.paid) return order;
  const updated = await transition(order.id, ['NEW', 'PREVIEW_READY', 'ABANDONED'], 'PAID', {
    payment_session_id: s.sessionId, payment_intent: s.paymentIntent, amount: s.amount ?? order.amount, currency: s.currency ?? 'dkk',
    customer_email: s.email ?? order.customer_email, customer_phone: s.phone ?? order.customer_phone, customer_name: s.name ?? order.customer_name,
    shipping_address: s.shippingAddress ?? order.shipping_address,
    preview_meta: { ...(order.preview_meta ?? {}), ...(s.giftNote ? { gift_note: s.giftNote } : {}) },
  });
  if (!updated) {
    // already progressed: either the same payment seen twice (fine) or a second payment (refund it, tell the owner)
    const current = (await getOrder(orderId)) ?? order;
    if (s.paymentIntent && current.payment_intent && s.paymentIntent !== current.payment_intent) {
      let note = `Dobbelt betaling ${s.paymentIntent} (${s.sessionId})`;
      try {
        const { paymentProvider } = await import('@/lib/payments/stripe');
        const r = await paymentProvider().refund(s.paymentIntent);
        note += ` – refunderet automatisk (${r.id}, ${r.status})`;
      } catch (e) { note += ` – REFUSION FEJLEDE: ${e instanceof Error ? e.message : e}`; }
      await updateOrder(current.id, { internal_notes: `${current.internal_notes ?? ''}\n${note}`.trim() });
      await notifyOwner(`Dobbelt betaling på ordre ${current.id.slice(0, 8)}`, [note, `Kunde: ${current.customer_email ?? '—'}`], current.id);
      // the customer sees two charges on their statement; they must hear it from us first
      if (current.customer_email) {
        const { refundNotice } = await import('@/lib/email/templates');
        const mail = refundNotice({ amount: (s.amount ?? 0) / 100 });
        sendMail({ to: current.customer_email, ...mail }).catch((e) => console.error('duplicate refund mail failed', e));
      }
    }
    return current;
  }
  // The amount on the card must equal the bill the customer saw. If it does not — a session created
  // before a configuration change, a price edited between order and payment — nobody must find out
  // from a customer's e-mail.
  const expected = orderQuote(updated).totalOere;
  if (typeof updated.amount === 'number' && updated.amount !== expected) {
    const note = `BELØB AFVIGER: betalt ${(updated.amount / 100).toFixed(0)} kr., bestillingen på siden er ${(expected / 100).toFixed(0)} kr.`;
    await updateOrder(updated.id, { internal_notes: `${updated.internal_notes ?? ''}\n${note}`.trim() });
    notifyOwner(`Beløb afviger på ordre ${updated.id.slice(0, 8)}`, [note, 'Ret det med kunden, før du sender godkendelsesmailen — refundér differencen eller send et link til resten.'], updated.id).catch(() => {});
  }
  if (updated.customer_email) {
    const mail = orderConfirmation({ order: updated });
    sendMail({ to: updated.customer_email, ...mail }).catch((e) => console.error('confirmation mail failed', e));
  }
  const addr = (updated.shipping_address ?? {}) as Record<string, string | null | undefined>;
  notifyOwner(`Ny betaling ${typeof updated.amount === 'number' ? formatDkk(updated.amount / 100) : '(beløb ukendt)'} · ordre ${updated.id.slice(0, 8)}`, [
    `${updated.customer_name ?? addr.name ?? ''} · ${updated.customer_email ?? ''} · ${updated.customer_phone ?? ''}`,
    `${[addr.line1, addr.postal_code, addr.city].filter(Boolean).join(', ')}`,
    orderDescription(updated),
    ...orderLines(updated),
    ...(s.giftNote ? [`Gavehilsen: “${s.giftNote}”`] : []),
    'Næste skridt: generér eller upload final, send godkendelsesmail (inden 48 timer).',
  ], updated.id).catch(() => {});
  await logEvent('Purchase', { orderId: updated.id, utm: updated.utm, sessionId: (updated.preview_meta as { session_id?: string } | null)?.session_id ?? null, meta: { value: (updated.amount ?? 0) / 100, currency: 'DKK' } });
  await sendServerEvent('Purchase', { eventId: updated.id, order: updated, sourceUrl: eventSourceUrl('/tak'), ip: ctx.ip, ua: ctx.ua });
  return updated;
}
