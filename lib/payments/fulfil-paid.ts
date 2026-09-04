import { getOrder, transition, updateOrder, type Order } from '@/lib/db/orders';
import type { VerifiedSession } from '@/lib/payments/provider';
import { orderConfirmation } from '@/lib/email/templates';
import { sendMail } from '@/lib/email/send';
import { notifyOwner } from '@/lib/email/owner';
import { logEvent } from '@/lib/analytics/events';
import { sendServerEvent, eventSourceUrl } from '@/lib/analytics/capi';
import { formatDkk } from '@/lib/pricing';

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
    }
    return current;
  }
  if (updated.customer_email) {
    const mail = orderConfirmation({ order: updated });
    sendMail({ to: updated.customer_email, ...mail }).catch((e) => console.error('confirmation mail failed', e));
  }
  const addr = (updated.shipping_address ?? {}) as Record<string, string | null | undefined>;
  notifyOwner(`Ny betaling ${formatDkk((updated.amount ?? 59900) / 100)} · ordre ${updated.id.slice(0, 8)}`, [
    `${updated.customer_name ?? addr.name ?? ''} · ${updated.customer_email ?? ''} · ${updated.customer_phone ?? ''}`,
    `${[addr.line1, addr.postal_code, addr.city].filter(Boolean).join(', ')}`,
    `${updated.chosen_colour ? 'Farveversion' : 'Sort-hvid'} · ${updated.format}`,
    'Næste skridt: generér eller upload final, send godkendelsesmail (inden 48 timer).',
  ], updated.id).catch(() => {});
  await logEvent('Purchase', { orderId: updated.id, utm: updated.utm, sessionId: (updated.preview_meta as { session_id?: string } | null)?.session_id ?? null, meta: { value: (updated.amount ?? 0) / 100, currency: 'DKK' } });
  await sendServerEvent('Purchase', { eventId: updated.id, order: updated, sourceUrl: eventSourceUrl('/tak'), ip: ctx.ip, ua: ctx.ua });
  return updated;
}
