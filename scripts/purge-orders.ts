/**
 * Deletes QA/test orders, their events and their storage objects. Run before launch, never after.
 *   npx tsx scripts/purge-orders.ts            # dry run: lists what would go
 *   npx tsx scripts/purge-orders.ts --yes      # deletes everything listed
 * Only orders that never reached PAID are touched unless --all is given.
 */
process.loadEnvFile?.('.env.local');
import { supabaseAdmin } from '../lib/db/supabase';
import { BUCKET } from '../lib/db/storage';

const yes = process.argv.includes('--yes');
const all = process.argv.includes('--all');
const PAID = ['PAID', 'IN_RETOUCH', 'AWAITING_APPROVAL', 'CHANGE_REQUESTED', 'APPROVED', 'IN_PRODUCTION', 'SHIPPED', 'COMPLETED', 'REFUNDED'];

async function main() {
  const db = supabaseAdmin();
  const { data: orders, error } = await db.from('orders').select('id,status,created_at,customer_email').order('created_at');
  if (error) throw error;
  const victims = (orders ?? []).filter((o) => all || !PAID.includes(o.status));
  console.log(`${orders?.length ?? 0} orders, ${victims.length} to delete${yes ? '' : ' (dry run)'}`);
  for (const o of victims) console.log(` ${o.id} ${o.status} ${o.created_at} ${o.customer_email ?? ''}`);
  if (!yes || victims.length === 0) return;
  const ids = victims.map((o) => o.id);
  // storage: everything under orders/<orderId>/
  for (const id of ids) {
    const { data: files } = await db.storage.from(BUCKET).list(`orders/${id}`, { limit: 100 });
    const paths = (files ?? []).map((f) => `orders/${id}/${f.name}`);
    if (paths.length) { const { error: e } = await db.storage.from(BUCKET).remove(paths); if (e) console.error('storage', id, e.message); }
  }
  const ev = await db.from('events').delete().in('order_id', ids);
  if (ev.error) console.error('events', ev.error.message);
  const del = await db.from('orders').delete().in('id', ids);
  if (del.error) throw del.error;
  console.log('deleted', ids.length);
}
main().catch((e) => { console.error(e); process.exit(1); });
