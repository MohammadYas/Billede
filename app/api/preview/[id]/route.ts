import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { ownsOrder, statusFor } from '@/lib/preview-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Polled by the sheet while the job runs and by the preview page for the colour version. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const [order, sid] = await Promise.all([getOrder(id), readSessionId()]);
  if (!order || !ownsOrder(order, sid, req.nextUrl.searchParams.get('t'))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(await statusFor(order), { headers: { 'cache-control': 'no-store' } });
}
