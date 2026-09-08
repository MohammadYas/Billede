import { Resend } from 'resend';
import { getFounder } from '@/lib/founder';

let resend: Resend | null = null;

export function fromAddress(): string {
  const domain = process.env.EMAIL_DOMAIN ?? 'billedearv.dk';
  // the sender is the same address the site prints (hej@billedearv.dk), unless EMAIL_FROM_LOCAL says otherwise
  const local = (process.env.EMAIL_FROM_LOCAL ?? getFounder().email.split('@')[0] ?? '').toLowerCase().replace(/[^a-z0-9.-]/g, '') || 'hej';
  // the company is the sender; a person's name only where the law asks for it (legal pages)
  const name = getFounder().company || 'Billedearv';
  return `${name} · Billedearv <${local}@${domain}>`;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Sends one mail. Returns the provider id, or null when email is not configured (logged, never throws in that case). */
export async function sendMail(opts: { to: string; subject: string; html: string; text: string; replyTo?: string; headers?: Record<string, string> }): Promise<string | null> {
  if (!isEmailConfigured()) {
    console.warn(`[email] RESEND_API_KEY missing — would send "${opts.subject}" to ${opts.to}`);
    return null;
  }
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    replyTo: opts.replyTo ?? process.env.EMAIL_REPLY_TO ?? getFounder().email ?? undefined,
    ...(opts.headers ? { headers: opts.headers } : {}),
  });
  if (error) throw new Error(`resend: ${error.message}`);
  return data?.id ?? null;
}
