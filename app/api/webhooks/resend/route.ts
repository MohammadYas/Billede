import { NextRequest, NextResponse } from 'next/server';
import { verifySvix } from '@/lib/webhooks/svix';
import { ingestResendEmail } from '@/lib/inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resend → us: `email.received` for mail to hej@. Signature checked on the raw body; the mail itself is
 * fetched from Resend (the webhook carries only metadata) and filed in the inbox. Other events are
 * acknowledged and ignored. Missing secret = the feature is off, and Resend sees a 503 it will retry.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'not configured' }, { status: 503 });
  const raw = await req.text();
  const ok = verifySvix(secret, { id: req.headers.get('svix-id'), timestamp: req.headers.get('svix-timestamp'), signature: req.headers.get('svix-signature') }, raw);
  if (!ok) return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  let event: { type?: string; data?: { email_id?: string; id?: string } } = {};
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'bad body' }, { status: 400 }); }
  if (event.type !== 'email.received') return NextResponse.json({ ok: true, ignored: event.type });
  const id = event.data?.email_id ?? event.data?.id;
  if (!id) return NextResponse.json({ error: 'no id' }, { status: 400 });
  try {
    const m = await ingestResendEmail(id);
    return NextResponse.json({ ok: true, filed: Boolean(m) });
  } catch (e) {
    console.error('resend ingest failed', id, e);
    return NextResponse.json({ error: 'ingest' }, { status: 500 }); // Resend retries
  }
}
