import { NextRequest, NextResponse } from 'next/server';
import { orderByToken } from '@/lib/approval';
import { getObject } from '@/lib/db/storage';
import { makeApprovalImage } from '@/lib/restoration/preview';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Token-gated image for the approval mail and page: 1200 px with a light mark. The print file is /fil, after the yes. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const order = await orderByToken(token);
  if (!order?.final_path) return new NextResponse('Not found', { status: 404 });
  const buf = await makeApprovalImage(await getObject(order.final_path));
  return new NextResponse(new Uint8Array(buf), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=300', 'x-robots-tag': 'noindex' } });
}
