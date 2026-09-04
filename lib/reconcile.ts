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
  // Not just the newest session, and not just the unpaid rows: a customer who paid twice (once in a tab
  // whose webhook never arrived) leaves a paid session that is referenced nowhere. markPaid refunds the
  // second payment when it sees it — but only if somebody asks Stripe about that session.
  const { data } = await supabaseAdmin().from('orders').select('*').not('payment_session_id', 'is', null).gte('created_at', since).limit(200);
  const { paymentProvider } = await import('@/lib/payments/stripe');
  let marked = 0, checked = 0;
  for (const o of (data ?? []) as Order[]) {
    const meta = (o.preview_meta ?? {}) as { sessions?: string[] };
    const ids = [...new Set([...(meta.sessions ?? []), o.payment_session_id!].filter(Boolean))];
    for (const id of ids) {
      checked++;
      try {
        const v = await paymentProvider().verifySession(id);
        if (v.paid) { const r = await markPaid(o.id, v); if (r?.status === 'PAID') marked++; }
      } catch (e) { console.error('reconcile', o.id, id, e); }
    }
  }
  return { checked, marked };
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
