import { getOrderByField, newApprovalToken, setStatus, transition, updateOrder, type Order } from '@/lib/db/orders';
import { signedUrl } from '@/lib/db/storage';
import { approvalRequest, changeReceived, siteUrl } from '@/lib/email/templates';
import { sendMail } from '@/lib/email/send';
import { notifyOwner } from '@/lib/email/owner';

/**
 * Sends "Dit færdige billede er klar" with token buttons and sets AWAITING_APPROVAL.
 * Every fresh send gets a NEW token, so Tuesday's mail can never approve Thursday's picture:
 * an old token opens a page that says a newer version exists. Reminders reuse the current token.
 */
export async function sendApprovalMail(order: Order, opts: { reminder?: boolean; second?: boolean } = {}): Promise<void> {
  if (!order.final_path) throw new Error('Ingen færdig fil på ordren endnu.');
  if (!order.customer_email) throw new Error('Ordren har ingen e-mail.');
  const token = opts.reminder && order.approval_token ? order.approval_token : newApprovalToken();
  const meta = (order.preview_meta ?? {}) as Record<string, unknown>;
  const version = Number(meta.approval_version ?? 0) + (opts.reminder ? 0 : 1);
  // The mail image must outlive a 15-min signed URL: it is served through /godkend/<token>/billede (token-gated).
  const imageUrl = siteUrl(`/godkend/${token}/billede`);
  const mail = approvalRequest({ imageUrl, approveUrl: siteUrl(`/godkend/${token}`), changeUrl: siteUrl(`/godkend/${token}/aendring`), reminder: opts.reminder, second: opts.second, version });
  await sendMail({ to: order.customer_email, ...mail });
  if (opts.reminder) await updateOrder(order.id, { approval_reminder_sent_at: new Date().toISOString() });
  else {
    const old = order.approval_token ? [...((meta.old_approval_tokens as string[] | undefined) ?? []), order.approval_token] : ((meta.old_approval_tokens as string[] | undefined) ?? []);
    await setStatus(order.id, 'AWAITING_APPROVAL', { approval_token: token, approval_status: 'SENT', approval_reminder_sent_at: null, preview_meta: { ...meta, approval_version: version, old_approval_tokens: old.slice(-10), reminder2_at: undefined, owner_nudged_at: undefined } });
  }
}

/** Customer tapped Godkend. Atomic: a double-tap or a stale tab cannot approve twice or approve after a change request. */
export async function approveByToken(token: string): Promise<'approved' | 'already' | 'stale' | 'missing'> {
  const order = await orderByToken(token);
  if (!order) return (await isOldToken(token)) ? 'stale' : 'missing';
  const updated = await transition(order.id, ['AWAITING_APPROVAL'], 'APPROVED', { approval_status: 'APPROVED' });
  if (!updated) return order.status === 'APPROVED' || order.status === 'IN_PRODUCTION' || order.status === 'SHIPPED' || order.status === 'COMPLETED' ? 'already' : 'stale';
  await notifyOwner(`Godkendt – bestil print · ordre ${updated.id.slice(0, 8)}`, [`${updated.customer_name ?? ''} · ${updated.customer_email ?? ''}`, 'Leveringsløftet tæller fra nu. Bestil printet i dag.'], updated.id);
  return 'approved';
}

/** Customer asked for a change: status, text, a mail back to the customer and one to the owner. */
export async function requestChangeByToken(token: string, text: string): Promise<'ok' | 'late' | 'missing'> {
  const order = await orderByToken(token);
  if (!order) return 'missing';
  const updated = await transition(order.id, ['AWAITING_APPROVAL', 'CHANGE_REQUESTED'], 'CHANGE_REQUESTED', { approval_status: 'CHANGE_REQUESTED', change_request_text: text });
  if (!updated) return 'late';
  if (updated.customer_email) sendMail({ to: updated.customer_email, ...changeReceived({ text }) }).catch((e) => console.error('change mail failed', e));
  await notifyOwner(`Ændring ønsket · ordre ${updated.id.slice(0, 8)}`, [`"${text}"`, `${updated.customer_name ?? ''} · ${updated.customer_email ?? ''}`, 'Ret, upload ny final og send en ny godkendelsesmail inden 48 timer.'], updated.id);
  return 'ok';
}

export async function finalUrl(order: Order): Promise<string | null> {
  return order.final_path ? signedUrl(order.final_path) : null;
}

export async function orderByToken(token: string): Promise<Order | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  return getOrderByField('approval_token', token);
}

/** A token from an earlier approval mail (superseded by a newer version). */
export async function isOldToken(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return false;
  const { supabaseAdmin } = await import('@/lib/db/supabase');
  const { data } = await supabaseAdmin().from('orders').select('id').contains('preview_meta', { old_approval_tokens: [token] }).limit(1);
  return Boolean(data && data.length);
}
