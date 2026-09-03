import { NextRequest, NextResponse } from 'next/server';
import { paymentProvider } from '@/lib/payments/stripe';
import { markPaid } from '@/lib/payments/fulfil-paid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get('stripe-signature');
  let outcome;
  try {
    outcome = await paymentProvider().handleWebhook(raw, sig);
  } catch (e) {
    console.error('webhook signature failed', e);
    return NextResponse.json({ error: 'signature' }, { status: 400 });
  }
  if (outcome.handled && outcome.orderId && outcome.session) {
    try { await markPaid(outcome.orderId, outcome.session); } catch (e) { console.error('markPaid failed', e); return NextResponse.json({ error: 'db' }, { status: 500 }); }
  }
  return NextResponse.json({ received: true });
}
