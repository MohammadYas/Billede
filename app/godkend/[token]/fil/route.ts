import { NextRequest, NextResponse } from 'next/server';
import { orderByToken } from '@/lib/approval';
import { signedUrl } from '@/lib/db/storage';
import type { Order } from '@/lib/db/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The file is the customer's from the moment they say yes; before that it is still ours to change. */
const DELIVERED: Order['status'][] = ['APPROVED', 'IN_PRODUCTION', 'SHIPPED', 'COMPLETED'];

/**
 * "Hent din fil i høj opløsning": the digital file every surface promises, delivered as a download
 * once the customer has approved (which is also the moment the terms say it is delivered). The
 * approval token is the key, the same one that opened the approval mail. The bytes come straight
 * from storage through a short signed URL — a print-resolution JPEG is several megabytes, more than
 * a function response should carry. After the 90-day retention the file is gone and so is this link.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const order = await orderByToken(token);
  if (!order || !DELIVERED.includes(order.status)) return new NextResponse('Not found', { status: 404 });
  if (!order.final_path) return new NextResponse('Filen er slettet efter opbevaringsfristen.', { status: 410, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  const url = await signedUrl(order.final_path, undefined, `genfundet-${order.id.slice(0, 8)}.jpg`);
  return NextResponse.redirect(url, { status: 302, headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' } });
}
