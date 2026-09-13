import { NextRequest, NextResponse } from 'next/server';
import { reconcilePayments } from '@/lib/reconcile';
import { runRetention } from '@/lib/retention';
import { secretMatches } from '@/lib/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * HTTP entry for an external cron (Bearer CRON_SECRET): the same hourly housekeeping as
 * netlify/functions/retention.ts — Stripe reconciliation of open Checkout sessions, then retention.
 * Supabase pg_cron calls this at :30 (see HANDOFF.md); the Netlify scheduled function runs at :00.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || !secretMatches(auth, `Bearer ${process.env.CRON_SECRET}`)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const r = await reconcilePayments();
  const h = await runRetention();
  return NextResponse.json({ ...r, ...h });
}
