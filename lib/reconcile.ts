import { supabaseAdmin } from '@/lib/db/supabase';
import type { Order } from '@/lib/db/orders';
import { markPaid } from '@/lib/payments/fulfil-paid';

/**
 * The one failure the owner cannot see: money taken, order never marked PAID (webhook secret wrong,
 * endpoint on the wrong URL, the customer never reached /tak after a MobilePay app-switch).
 * Every hour: ask Stripe about every open Checkout session from the last 7 days and mark what is paid.
 */
export async function reconcilePayments(): Promise<{ checked: number; marked: number }> {
  if (!process.env.STRIPE_SECRET_KEY) return { checked: 0, marked: 0 };
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data } = await supabaseAdmin().from('orders').select('*').not('payment_session_id', 'is', null).in('status', ['NEW', 'PREVIEW_READY', 'ABANDONED']).gte('created_at', since).limit(100);
  const { paymentProvider } = await import('@/lib/payments/stripe');
  let marked = 0;
  for (const o of (data ?? []) as Order[]) {
    try {
      const v = await paymentProvider().verifySession(o.payment_session_id!);
      if (v.paid) { const r = await markPaid(o.id, v); if (r?.status === 'PAID') marked++; }
    } catch (e) { console.error('reconcile', o.id, e); }
  }
  return { checked: data?.length ?? 0, marked };
}

/** Admin "Tjek betaling hos Stripe" for one order. */
export async function reconcileOrder(order: Order): Promise<'paid' | 'unpaid' | 'no_session'> {
  if (!order.payment_session_id || !process.env.STRIPE_SECRET_KEY) return 'no_session';
  const { paymentProvider } = await import('@/lib/payments/stripe');
  const v = await paymentProvider().verifySession(order.payment_session_id);
  if (!v.paid) return 'unpaid';
  await markPaid(order.id, v);
  return 'paid';
}
