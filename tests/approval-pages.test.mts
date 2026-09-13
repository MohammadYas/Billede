import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, textOf } from './_bundle.mts';

// The approval pages must describe the order as it is now. A refunded order must never read "vi printer".
const state = { status: 'AWAITING_APPROVAL', final: true };
(globalThis as any).__auditApproval = state;
const stubs = {
  '@/lib/approval': `export const orderByToken=async()=>({id:'00000000-0000-4000-8000-000000000001',status:globalThis.__auditApproval.status,final_path:globalThis.__auditApproval.final?'final.jpg':null,change_request_text:null,awaiting_approval_at:null,is_monochrome:false,chosen_colour:false,preview_meta:{}}); export const isOldToken=async()=>false; export const approveByToken=async()=>'approved'; export const requestChangeByToken=async()=>'ok';`,
  '@/lib/copy': `export const copy=()=>({email:'audit@example.invalid',emailHref:'mailto:audit@example.invalid'});`,
  '@/lib/config': `export const CONFIG={retentionCompletedDays:90}; export const deliveryPromise=()=>'inden 10 hverdage';`,
  '@/lib/order-summary': `export const orderDescription=()=>'30×40 cm, sort ramme';export const orderProduct=()=>'framed';export const isDigitalOrder=()=>false;`,
  '@/components/Footer': `export default function Footer(){return null}`,
  '@/components/Wordmark': `export default function Wordmark(){return null}`,
  '@/components/SubmitButton': `export default function SubmitButton(){return null}`,
};
const approve = await load('app/godkend/[token]/page.tsx', stubs);
const change = await load('app/godkend/[token]/aendring/page.tsx', stubs);
const token = 'synthetic-approval-token-0001';
const render = async (page: any, status: string, q: Record<string, string> = {}) => { state.status = status; return textOf(await page.default({ params: Promise.resolve({ token }), searchParams: Promise.resolve(q) })); };

test('a refunded order never claims to be printed, on either page', async () => {
  for (const page of [approve, change]) {
    const t = await render(page, 'REFUNDED');
    assert.match(t, /refunderet/);
    assert.doesNotMatch(t, /printer og sender|godkendt og på vej|Hent din fil/);
  }
});
test('an order back in retouch reads as "vi retter det", not as approved', async () => {
  for (const page of [approve, change]) {
    const t = await render(page, 'IN_RETOUCH');
    assert.match(t, /retter det/);
    assert.doesNotMatch(t, /printer og sender|godkendt og på vej/);
  }
});
test('a shipped order says it is sent and still offers the file', async () => {
  const t = await render(approve, 'SHIPPED');
  assert.match(t, /er sendt/);
  assert.match(t, /Hent din fil/);
  assert.doesNotMatch(t, /printer og sender/);
});
test('approved and in-production orders keep the printing promise and the file', async () => {
  for (const s of ['APPROVED', 'IN_PRODUCTION']) {
    const t = await render(approve, s, { r: 'approved' });
    assert.match(t, /printer og sender/);
    assert.match(t, /Hent din fil/);
  }
});
test('the decision page and the change form still render for an order awaiting approval', async () => {
  assert.match(await render(approve, 'AWAITING_APPROVAL'), /Ligner det\?/);
  assert.match(await render(change, 'AWAITING_APPROVAL'), /Hvad skal ændres\?/);
  assert.match(await render(change, 'CHANGE_REQUESTED'), /retter det/);
});
