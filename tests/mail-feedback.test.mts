import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { NextRequest } from 'next/server';

// Exercise the real route, replacing only database/session/mail boundaries. No network or real orders.
const state = { sent: 0, mode: 'reject', logged: null as any, leadCount: 0 };
(globalThis as any).__auditMail = state;
const stubs: Record<string, string> = {
 '@/lib/db/orders': `export const getOrder=async()=>({id:'00000000-0000-4000-8000-000000000001',status:'NEW',customer_email:null,preview_meta:{share_sent_count:globalThis.__auditMail.sent,share_token:'synthetic-token'}}); export const updateOrder=async()=>({}); export const createOrder=getOrder; export const setStatus=async()=>({});`,
 '@/lib/session': `export const readSessionId=async()=>null; export const readUtm=async()=>null; export const ensureSessionId=async()=>({sid:'synthetic',fresh:false}); export const sessionCookie=()=>'';`,
 '@/lib/preview-service': `export const ownsOrder=()=>true; export const payloadFor=async()=>null;`,
 '@/lib/email/send': `export const isEmailConfigured=()=>globalThis.__auditMail.mode!=='unconfigured'; export const sendMail=async()=>{if(globalThis.__auditMail.mode==='reject')throw Error('provider failure'); return globalThis.__auditMail.mode==='unconfigured'?null:'synthetic-mail-id';};`,
 '@/lib/email/templates': `export const esc=(s)=>s; export const siteUrl=(s)=>'http://localhost:3000'+s;`,
 '@/lib/founder': `export const fornavn=()=>'vi'; export const getFounder=()=>({name:'Test',email:'audit@example.invalid'});`,
 '@/lib/analytics/events': `export const logEvent=async(name,opts)=>{globalThis.__auditMail.logged=opts.meta};`,
 '@/lib/email/owner': `export const notifyOwner=async()=>{};`,
 '@/lib/db/supabase': `export const supabaseAdmin=()=>({from:()=>({select(){return this},eq(){return this},gte:async()=>({count:globalThis.__auditMail.leadCount})})});`,
};
async function route(path: string) {
 const result = await build({ entryPoints: [path], bundle: true, write: false, jsx: 'automatic', platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'external-boundaries', setup(b) { b.onResolve({ filter: /^@\/lib\// }, a => stubs[a.path] ? { path: a.path, namespace: 'fixture' } : undefined); b.onLoad({ filter: /.*/, namespace: 'fixture' }, a => ({ contents: stubs[a.path], loader: 'ts' })); } }] });
 const mod = { exports: {} as any };
 new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
 return mod.exports;
}
const save = await route('app/api/preview/[id]/save/route.ts');
const trackRoute = await route('app/api/track/route.ts');
const previewPage = await route('app/p/[id]/page.tsx');
const lead = await route('app/api/lead/route.ts');
const request = () => new NextRequest('http://localhost:3000/api/preview/00000000-0000-4000-8000-000000000001/save', { method: 'POST', body: JSON.stringify({ email: 'audit@example.invalid' }), headers: { 'content-type': 'application/json' } });
const ctx = { params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }) };
test('save-link reports mail provider failure instead of success', async () => { state.mode = 'reject'; state.sent = 0; assert.equal((await save.POST(request(), ctx)).status, 503); });
test('save-link cannot report sent when mail is unconfigured', async () => { state.mode = 'unconfigured'; state.sent = 0; assert.equal((await save.POST(request(), ctx)).status, 503); });
test('save-link exposes the send limit rather than claiming delivery', async () => { state.mode = 'success'; state.sent = 5; assert.equal((await save.POST(request(), ctx)).status, 429); });
test('save-link succeeds when provider accepts the mail', async () => { state.mode = 'success'; state.sent = 0; assert.equal((await save.POST(request(), ctx)).status, 200); });
test('client analytics discard personal and arbitrary metadata', async () => {
 const req = new NextRequest('http://localhost:3000/api/track', { method: 'POST', body: JSON.stringify({ name: 'FlowOpened', meta: { cta: 'C', email: 'audit@example.invalid', phone: '12345678', token: 'private', nested: { secret: 'x' } } }) });
 await trackRoute.POST(req);
 assert.deepEqual(state.logged, { cta: 'C' });
});
test('an authorized pending preview has a recoverable page instead of 404', async () => {
 await assert.doesNotReject(() => previewPage.default({ ...ctx, searchParams: Promise.resolve({ t: 'synthetic-token' }) }));
});
for (const [mode, count, status] of [['unconfigured', 0, 503], ['reject', 0, 503], ['success', 0, 200], ['success', 5, 429]] as const) {
 test(`no-photo lead: ${mode}, previous sends ${count}, HTTP ${status}`, async () => {
  state.mode = mode; state.leadCount = count;
  const req = new NextRequest('http://localhost:3000/api/lead', { method: 'POST', body: JSON.stringify({ email: 'audit@example.invalid', kind: 'nophoto' }) });
  assert.equal((await lead.POST(req)).status, status);
 });
}
