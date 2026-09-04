import { supabaseAdmin } from '@/lib/db/supabase';
import { removeOrderObjects } from '@/lib/db/storage';
import { CONFIG } from '@/lib/config';
import { transition, updateOrder, type Order } from '@/lib/db/orders';
import { sendApprovalMail } from '@/lib/approval';
import { notifyOwner } from '@/lib/email/owner';

const UNPAID: Order['status'][] = ['NEW', 'PREVIEW_READY', 'MANUAL_REVIEW', 'ABANDONED'];
const DONE: Order['status'][] = ['COMPLETED', 'REFUNDED', 'SHIPPED'];

function pathsOf(o: Order): string[] {
  const meta = (o.preview_meta ?? {}) as { colourised_full_path?: string; upload_path?: string };
  return [meta.upload_path ?? null, o.original_path, o.preview_path, o.restored_path, o.colourised_path, o.mockup_path, o.final_path, meta.colourised_full_path ?? null].filter((p): p is string => Boolean(p));
}

/**
 * Housekeeping (hourly): 30-day deletion of unpaid uploads (counted from the last time the customer
 * touched it), 90-day deletion after delivery, shipped → completed after 14 days, approval reminders
 * at 48 h and 7 days, and an owner nudge at 10 days.
 */
export async function runRetention(): Promise<{ deleted: number; reminded: number; completed: number; nudged: number }> {
  const db = supabaseAdmin();
  const now = Date.now();
  const unpaidBefore = new Date(now - CONFIG.retentionUnpaidDays * 864e5).toISOString();
  const doneBefore = new Date(now - CONFIG.retentionCompletedDays * 864e5).toISOString();

  // shipped 14 days ago and nothing heard → completed (starts the 90-day clock the privacy page promises)
  const shippedBefore = new Date(now - 14 * 864e5).toISOString();
  const { data: shipped } = await db.from('orders').select('*').eq('status', 'SHIPPED').lt('shipped_at', shippedBefore).limit(100);
  let completed = 0;
  for (const o of (shipped ?? []) as Order[]) { if (await transition(o.id, ['SHIPPED'], 'COMPLETED')) completed++; }

  const { data: stale } = await db.from('orders').select('*').is('deleted_at', null)
    .or(`and(status.in.(${UNPAID.join(',')}),updated_at.lt.${unpaidBefore}),and(status.in.(${DONE.join(',')}),updated_at.lt.${doneBefore})`).limit(200);
  let deleted = 0;
  for (const o of (stale ?? []) as Order[]) {
    try {
      const paths = [...new Set([...(await removeOrderObjects(o.id)), ...pathsOf(o)])];
      await db.from('orders').update({ original_path: null, preview_path: null, restored_path: null, colourised_path: null, mockup_path: null, final_path: null, deleted_at: new Date().toISOString(), status: UNPAID.includes(o.status) ? 'ABANDONED' : o.status === 'SHIPPED' ? 'COMPLETED' : o.status }).eq('id', o.id);
      await db.from('deletion_log').insert({ order_id: o.id, reason: UNPAID.includes(o.status) ? `unpaid>${CONFIG.retentionUnpaidDays}d` : `completed>${CONFIG.retentionCompletedDays}d`, paths });
      deleted++;
    } catch (e) { console.error('retention delete failed', o.id, e); }
  }

  // approval reminders: 48 h, 7 days, then the owner calls
  let reminded = 0, nudged = 0;
  const { data: waiting } = await db.from('orders').select('*').eq('status', 'AWAITING_APPROVAL').limit(100);
  for (const o of (waiting ?? []) as Order[]) {
    const sentAt = Date.parse(o.awaiting_approval_at ?? o.updated_at ?? '') || now;
    const age = now - sentAt;
    const meta = (o.preview_meta ?? {}) as { reminder2_at?: string; owner_nudged_at?: string };
    try {
      if (age > 48 * 3600e3 && !o.approval_reminder_sent_at) { await sendApprovalMail(o, { reminder: true }); reminded++; }
      else if (age > 7 * 864e5 && !meta.reminder2_at) { await sendApprovalMail(o, { reminder: true, second: true }); await updateOrder(o.id, { preview_meta: { ...meta, reminder2_at: new Date().toISOString() } }); reminded++; }
      else if (age > 10 * 864e5 && !meta.owner_nudged_at) {
        await notifyOwner(`Skriv personligt til kunden – ordre ${o.id.slice(0, 8)} har ventet ${Math.round(age / 864e5)} dage på godkendelse`, [`${o.customer_name ?? ''} · ${o.customer_email ?? ''}`, 'To automatiske mails er sendt uden svar. En personlig mail plejer at afgøre det.'], o.id);
        await updateOrder(o.id, { preview_meta: { ...meta, owner_nudged_at: new Date().toISOString() } }); nudged++;
      }
    } catch (e) { console.error('reminder failed', o.id, e); }
  }
  return { deleted, reminded, completed, nudged };
}
