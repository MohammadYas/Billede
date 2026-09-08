import { NextRequest, NextResponse } from 'next/server';
import { clientKey } from '@/lib/api/client';
import { messagesFromClient } from '@/lib/db/messages';
import { fileFormMessage } from '@/lib/inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MESSAGES_PER_HOUR = 5;

/** The contact form. Files the message in the inbox and tells the owner. A honeypot and a per-network cap keep the bots out. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { name?: string; email?: string; message?: string; website?: string };
  if (body.website) return NextResponse.json({ ok: true }); // the honeypot: a bot filled the field no human sees
  const name = String(body.name ?? '').trim().slice(0, 120);
  const email = String(body.email ?? '').trim().toLowerCase();
  const message = String(body.message ?? '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return NextResponse.json({ error: 'email' }, { status: 400 });
  if (message.length < 3 || message.length > 5000) return NextResponse.json({ error: 'message' }, { status: 400 });
  const client = clientKey(req.headers);
  if (client && (await messagesFromClient(client, 3600e3).catch(() => 0)) >= MESSAGES_PER_HOUR) return NextResponse.json({ error: 'rate' }, { status: 429 });
  try {
    await fileFormMessage({ name, email, message, client });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('contact failed', e);
    return NextResponse.json({ error: 'store' }, { status: 502 });
  }
}
