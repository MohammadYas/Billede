import { NextRequest, NextResponse } from 'next/server';
import { runRetention } from '@/lib/retention';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** HTTP entry for hosts with an external cron (Bearer CRON_SECRET). On Netlify the scheduled function netlify/functions/retention.ts runs the same code. */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await runRetention());
}
