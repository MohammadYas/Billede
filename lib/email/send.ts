import { Resend } from 'resend';
import { getFounder } from '@/lib/founder';

let resend: Resend | null = null;

export function fromAddress(): string {
  const domain = process.env.EMAIL_DOMAIN ?? 'genfundet.dk';
  const local = (process.env.EMAIL_FROM_LOCAL ?? getFounder().firstName).toLowerCase().replace(/[^a-z0-9.-]/g, '') || 'hej';
  const name = getFounder().name || 'Genfundet';
  return `${name} · Genfundet <${local}@${domain}>`;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Sends one mail. Returns the provider id, or null when email is not configured (logged, never throws in that case). */
export async function sendMail(opts: { to: string; subject: string; html: string; text: string; replyTo?: string }): Promise<string | null> {
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
    replyTo: opts.replyTo ?? getFounder().email ?? undefined,
  });
  if (error) throw new Error(`resend: ${error.message}`);
  return data?.id ?? null;
}
