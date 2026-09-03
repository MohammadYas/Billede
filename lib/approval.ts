import { getOrderByField, newApprovalToken, setStatus, updateOrder, type Order } from '@/lib/db/orders';
import { signedUrl } from '@/lib/db/storage';
import { approvalRequest, siteUrl } from '@/lib/email/templates';
import { sendMail } from '@/lib/email/send';

/** Sends "Dit færdige billede er klar" with signed-token buttons; sets AWAITING_APPROVAL. */
export async function sendApprovalMail(order: Order, opts: { reminder?: boolean } = {}): Promise<void> {
  if (!order.final_path) throw new Error('Ingen færdig fil på ordren endnu.');
  if (!order.customer_email) throw new Error('Ordren har ingen e-mail.');
  const token = order.approval_token ?? newApprovalToken();
  // The mail image must outlive a 15-min signed URL: it is served through /godkend/<token>/billede (token-gated).
  const imageUrl = siteUrl(`/godkend/${token}/billede`);
  const mail = approvalRequest({ imageUrl, approveUrl: siteUrl(`/godkend/${token}`), changeUrl: siteUrl(`/godkend/${token}/aendring`), reminder: opts.reminder });
  await sendMail({ to: order.customer_email, ...mail });
  if (opts.reminder) await updateOrder(order.id, { approval_reminder_sent_at: new Date().toISOString() });
  else await setStatus(order.id, 'AWAITING_APPROVAL', { approval_token: token, approval_status: 'SENT', approval_reminder_sent_at: null });
}

export async function finalUrl(order: Order): Promise<string | null> {
  return order.final_path ? signedUrl(order.final_path) : null;
}

export async function orderByToken(token: string): Promise<Order | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  return getOrderByField('approval_token', token);
}
