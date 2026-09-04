'use server';
import { redirect } from 'next/navigation';
import { isAdmin } from './auth';
import { getOrder, setStatus, updateOrder, type OrderStatus } from '@/lib/db/orders';
import { isFormat } from '@/lib/pricing';
import { sendApprovalMail } from '@/lib/approval';
import { refundNotice, shippedNotice } from '@/lib/email/templates';
import { reconcileOrder } from '@/lib/reconcile';
import { sendMail } from '@/lib/email/send';
import { paymentProvider } from '@/lib/payments/stripe';

async function guard() { if (!(await isAdmin())) throw new Error('unauthorized'); }
const back = (id: string, msg?: string) => redirect(`/admin/orders/${id}${msg ? `?msg=${encodeURIComponent(msg)}` : ''}`);

export async function actionSetStatus(id: string, formData: FormData) {
  await guard();
  const status = String(formData.get('status')) as OrderStatus;
  const order = await getOrder(id); if (!order) return;
  if (status === 'REFUNDED' && order.payment_intent && order.status !== 'REFUNDED') {
    const r = await paymentProvider().refund(order.payment_intent);
    await setStatus(id, 'REFUNDED', { internal_notes: `${order.internal_notes ?? ''}\nRefund ${r.id} (${r.status})`.trim() });
    if (order.customer_email) await sendMail({ to: order.customer_email, ...refundNotice({ amount: (order.amount ?? 59900) / 100 }) }).catch((e) => console.error(e));
    back(id, 'Refunderet via Stripe – kunden har fået besked');
  }
  if (status === 'SHIPPED' && order.customer_email) {
    const mail = shippedNotice({ trackingNumber: order.tracking_number, trackingUrl: order.tracking_url });
    await sendMail({ to: order.customer_email, ...mail }).catch((e) => console.error(e));
  }
  await setStatus(id, status);
  back(id, `Status: ${status}`);
}

export async function actionSetFormat(id: string, formData: FormData) {
  await guard();
  const f = String(formData.get('format'));
  if (!isFormat(f)) return;
  await updateOrder(id, { format: f });
  back(id, `Format: ${f}`);
}

export async function actionFulfillment(id: string, formData: FormData) {
  await guard();
  await updateOrder(id, {
    fulfillment_provider: 'manual',
    fulfillment_reference: String(formData.get('reference') ?? '').trim() || null,
    tracking_number: String(formData.get('tracking') ?? '').trim() || null,
    tracking_url: String(formData.get('tracking_url') ?? '').trim() || null,
  });
  back(id, 'Fulfillment gemt');
}

export async function actionNote(id: string, formData: FormData) {
  await guard();
  await updateOrder(id, { internal_notes: String(formData.get('notes') ?? '').slice(0, 5000) });
  back(id, 'Note gemt');
}

export async function actionCheckPayment(id: string) {
  await guard();
  const order = await getOrder(id); if (!order) return;
  try {
    const r = await reconcileOrder(order);
    back(id, r === 'paid' ? 'Stripe siger betalt – ordren er sat til PAID' : r === 'unpaid' ? 'Stripe: ikke betalt' : 'Ingen Checkout-session på ordren');
  } catch (e) { back(id, `Stripe-fejl: ${e instanceof Error ? e.message : e}`); }
}

export async function actionSendApproval(id: string) {
  await guard();
  const order = await getOrder(id); if (!order) return;
  try { await sendApprovalMail(order); } catch (e) { back(id, `Fejl: ${e instanceof Error ? e.message : e}`); }
  back(id, 'Godkendelsesmail sendt');
}
