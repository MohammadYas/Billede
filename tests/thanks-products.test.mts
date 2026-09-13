import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, textOf } from './_bundle.mts';

// Exercise the real paid receipt without payment, database writes or customer mail.
const state = { product: 'digital', amount: 9900 };
(globalThis as any).__thanksProduct = state;
const page = await load('app/tak/page.tsx', {
  '@/lib/payments/stripe': `export const paymentProvider=()=>({verifySession:async()=>({paid:true,orderId:'fixture'})});`,
  '@/lib/payments/fulfil-paid': `export const markPaid=async()=>({id:'fixture',status:'PAID',format:'30x40',amount:globalThis.__thanksProduct.amount,preview_path:'preview.jpg',mockup_path:'wall.jpg',chosen_colour:false,preview_meta:{product:globalThis.__thanksProduct.product}});`,
  '@/lib/db/orders': `export const claimPurchaseTracking=async()=>true; export const getOrderByField=async()=>null; export const latestOrderForSession=async()=>null;`,
  '@/lib/session': `export const readSessionId=async()=>null;`,
  '@/lib/preview-service': `export const imageUrl=(_o,kind)=>'/fixture/'+kind+'.jpg';`,
  'next/headers': `export const headers=async()=>new Headers();`,
});

function images(n: any): any[] {
  if (!n || typeof n !== 'object') return [];
  if (Array.isArray(n)) return n.flatMap(images);
  return [...(n.type === 'img' ? [n.props] : []), ...images(n.props?.children)];
}
async function render(product: string, amount: number) {
  state.product = product; state.amount = amount;
  const previous = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = 'synthetic';
  try { return await page.default({searchParams:Promise.resolve({session_id:'cs_test_fixture'})}); }
  finally { if (previous === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = previous; }
}

test('digital receipt promises download after approval, with no printing, frame or shipping', async () => {
  const tree = await render('digital', 9900);
  const text = textOf(tree);
  assert.match(text, /download/i);
  assert.doesNotMatch(text, /Vi printer|Print i den valgte|Fragt og indpakning|ramme og fri fragt/i);
  assert.ok(images(tree).every(i => !i.src.includes('mockup')));
});

test('loose print receipt promises an unframed print and shows the photo, not a wall frame', async () => {
  const tree = await render('print', 25000);
  const text = textOf(tree);
  assert.match(text, /uden ramme/i);
  assert.match(text, /Fragt og indpakning/);
  assert.doesNotMatch(text, /Print i den valgte størrelse, ramme/);
  assert.ok(images(tree).every(i => !i.src.includes('mockup')));
});

test('framed receipt retains its frame, delivery and mockup', async () => {
  const tree = await render('framed', 59900);
  assert.match(textOf(tree), /ramme og fri fragt/);
  assert.ok(images(tree).some(i => i.src.includes('mockup')));
});
