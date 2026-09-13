import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_bundle.mts';

// /tak fires the browser Purchase only for the caller that wins one conditional update (purchase_tracked_at is null).
const db = { row: null as unknown, ops: [] as unknown[][] };
(globalThis as any).__auditDb = db;
const orders = await load('lib/db/orders.ts', {
  './supabase': `const chain=(ops)=>({update(f){ops.push(['update',f]);return this},eq(...a){ops.push(['eq',...a]);return this},is(...a){ops.push(['is',...a]);return this},select(){return this},maybeSingle:async()=>({data:globalThis.__auditDb.row,error:null})}); export const supabaseAdmin=()=>({from:()=>chain(globalThis.__auditDb.ops)}); export const isSupabaseConfigured=()=>true;`,
});

test('the first caller claims the purchase; the condition is the null column, not a prior read', async () => {
  db.row = { id: 'x' }; db.ops.length = 0;
  assert.equal(await orders.claimPurchaseTracking('00000000-0000-4000-8000-000000000001'), true);
  assert.deepEqual(db.ops.find(o => o[0] === 'is'), ['is', 'purchase_tracked_at', null]);
  assert.ok(typeof (db.ops.find(o => o[0] === 'update') as any)[1].purchase_tracked_at === 'string');
});
test('a reload or a concurrent render after the claim gets false', async () => {
  db.row = null;
  assert.equal(await orders.claimPurchaseTracking('00000000-0000-4000-8000-000000000001'), false);
});
