import { getOrder, setStatus, type Order } from '@/lib/db/orders';
import type { VerifiedSession } from '@/lib/payments/provider';
import { orderConfirmation } from '@/lib/email/templates';
import { sendMail } from '@/lib/email/send';
import { logEvent } from '@/lib/analytics/events';

/**
 * Marks an order PAID from a verified session (webhook or /tak). Idempotent:
 * a second call for an already-paid order does nothing. Sends the confirmation mail once.
 */
export async function markPaid(orderId: string, s: VerifiedSession): Promise<Order | null> {
  const order = await getOrder(orderId);
  if (!order) return null;
  if (!s.paid) return order;
  if (order.status !== 'NEW' && order.status !== 'PREVIEW_READY' && order.status !== 'ABANDONED') return order; // already progressed
  const updated = await setStatus(order.id, 'PAID', {
    payment_session_id: s.sessionId, payment_intent: s.paymentIntent, amount: s.amount ?? order.amount, currency: s.currency ?? 'dkk',
    customer_email: s.email ?? order.customer_email, customer_phone: s.phone ?? order.customer_phone, customer_name: s.name ?? order.customer_name,
    shipping_address: s.shippingAddress ?? order.shipping_address,
  });
  if (updated.customer_email) {
    const mail = orderConfirmation({ format: updated.format, orderShort: updated.id.slice(0, 8) });
    sendMail({ to: updated.customer_email, ...mail }).catch((e) => console.error('confirmation mail failed', e));
  }
  await logEvent('Purchase', { orderId: updated.id, utm: updated.utm, sessionId: (updated.preview_meta as { session_id?: string } | null)?.session_id ?? null, meta: { value: (updated.amount ?? 0) / 100, currency: 'DKK' } });
  return updated;
}
