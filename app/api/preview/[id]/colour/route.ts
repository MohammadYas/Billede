import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { ensureColour, ownsOrder } from '@/lib/preview-service';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [order, sid] = await Promise.all([getOrder(id), readSessionId()]);
  if (!order || !ownsOrder(order, sid)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  try {
    const colour = await ensureColour(order);
    return NextResponse.json({ colour }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    console.error('colour failed', e);
    return NextResponse.json({ colour: null }, { status: 502 });
  }
}
