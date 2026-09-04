import { NextRequest, NextResponse } from 'next/server';
import { repeatSource } from '@/lib/preview-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * "Billede nummer to": is this receipt link real? The sheet asks before it promises the discount,
 * so a refunded, purged or mistyped reference never shows a price the bill will not honour.
 */
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  const parent = await repeatSource(ref).catch(() => null);
  return NextResponse.json({ ok: Boolean(parent) }, { headers: { 'cache-control': 'no-store' } });
}
