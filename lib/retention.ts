import { supabaseAdmin } from '@/lib/db/supabase';
import { removeObjects } from '@/lib/db/storage';
import { CONFIG } from '@/lib/config';
import type { Order } from '@/lib/db/orders';
import { sendApprovalMail } from '@/lib/approval';

const UNPAID: Order['status'][] = ['NEW', 'PREVIEW_READY', 'MANUAL_REVIEW', 'ABANDONED'];
const DONE: Order['status'][] = ['COMPLETED', 'REFUNDED'];

function pathsOf(o: Order): string[] {
  const meta = (o.preview_meta ?? {}) as { colourised_full_path?: string; upload_path?: string };
  return [meta.upload_path ?? null, o.original_path, o.preview_path, o.restored_path, o.colourised_path, o.mockup_path, o.final_path, meta.colourised_full_path ?? null].filter((p): p is string => Boolean(p));
}

/** Scheduled deletion (30 days unpaid, 90 days completed) + 48 h approval reminders. Runs daily (Netlify scheduled function or /api/cron/retention). */
export async function runRetention(): Promise<{ deleted: number; reminded: number }> {
  const db = supabaseAdmin();
  const now = Date.now();
  const unpaidBefore = new Date(now - CONFIG.retentionUnpaidDays * 864e5).toISOString();
  const doneBefore = new Date(now - CONFIG.retentionCompletedDays * 864e5).toISOString();

  const { data: stale } = await db.from('orders').select('*').is('deleted_at', null).or(`and(status.in.(${UNPAID.join(',')}),created_at.lt.${unpaidBefore}),and(status.in.(${DONE.join(',')}),updated_at.lt.${doneBefore})`).limit(200);
  let deleted = 0;
  for (const o of (stale ?? []) as Order[]) {
    const paths = pathsOf(o);
    try {
      await removeObjects(paths);
      await db.from('orders').update({ original_path: null, preview_path: null, restored_path: null, colourised_path: null, mockup_path: null, final_path: null, deleted_at: new Date().toISOString(), status: UNPAID.includes(o.status) ? 'ABANDONED' : o.status }).eq('id', o.id);
      await db.from('deletion_log').insert({ order_id: o.id, reason: UNPAID.includes(o.status) ? `unpaid>${CONFIG.retentionUnpaidDays}d` : `completed>${CONFIG.retentionCompletedDays}d`, paths });
      deleted++;
    } catch (e) { console.error('retention delete failed', o.id, e); }
  }

  const remindBefore = new Date(now - 48 * 3600e3).toISOString();
  const { data: waiting } = await db.from('orders').select('*').eq('status', 'AWAITING_APPROVAL').is('approval_reminder_sent_at', null).lt('awaiting_approval_at', remindBefore).limit(50);
  let reminded = 0;
  for (const o of (waiting ?? []) as Order[]) {
    try { await sendApprovalMail(o, { reminder: true }); reminded++; } catch (e) { console.error('reminder failed', o.id, e); }
  }
  return { deleted, reminded };
}
