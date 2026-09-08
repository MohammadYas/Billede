import { Resend } from 'resend';
import { insertMessage, messageByResendId, threadKey, threadMessages, type Message } from '@/lib/db/messages';
import { supabaseAdmin } from '@/lib/db/supabase';
import { sendMail } from '@/lib/email/send';
import { notifyOwner } from '@/lib/email/owner';
import { esc, siteUrl } from '@/lib/email/templates';
import { getFounder } from '@/lib/founder';

/**
 * The inbox behind admin → Beskeder. Mail to hej@ arrives through Resend receiving (webhook → this),
 * the contact form arrives through /api/contact, answers go out through Resend with the threading
 * headers a mail client expects, and every message is one row in `messages`. The owner still gets one
 * short mail per incoming message: the promise "inden 24 timer" must not depend on opening admin.
 */

const parseAddress = (s: string): { email: string; name: string | null } => {
  const m = s.match(/^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/);
  if (m) return { email: m[2].trim().toLowerCase(), name: (m[1] ?? '').trim() || null };
  return { email: s.trim().toLowerCase(), name: null };
};

/** The customer's latest order, if the address matches one: the message then links straight to it in admin. */
async function orderFor(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin().from('orders').select('id').eq('customer_email', email).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

const snippet = (m: { text_body: string | null; html_body: string | null }) => (m.text_body ?? m.html_body?.replace(/<[^>]+>/g, ' ') ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);

/** Pulls one received email out of Resend and files it. Idempotent on the Resend id (webhooks retry). */
export async function ingestResendEmail(resendId: string): Promise<Message | null> {
  if (await messageByResendId(resendId)) return null;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.receiving.get(resendId);
  if (error || !data) throw new Error(`resend receiving.get: ${error?.message ?? 'no data'}`);
  const from = parseAddress(data.from);
  const to = (data.to?.[0] ?? getFounder().email ?? '').toLowerCase();
  const attachments = (data.attachments ?? []).map((a) => ({ filename: a.filename ?? 'fil', content_type: a.content_type, size: a.size }));
  const m = await insertMessage({
    direction: 'in', channel: 'email', thread: threadKey(from.email), from_email: from.email, from_name: from.name, to_email: to,
    subject: data.subject ?? null, text_body: data.text ?? null, html_body: data.html ?? null,
    message_id: data.message_id ?? null, in_reply_to: null, resend_id: resendId,
    order_id: await orderFor(from.email), client: null, attachments: attachments.length ? attachments : null,
  });
  await notifyOwner(`Ny mail fra ${from.name ?? from.email}`, [data.subject ?? '(uden emne)', snippet(m)], null).catch(() => {});
  return m;
}

/** A message from the contact form: filed like a mail, and the owner told. */
export async function fileFormMessage(input: { name: string; email: string; message: string; client: string | null }): Promise<Message> {
  const email = threadKey(input.email);
  const m = await insertMessage({
    direction: 'in', channel: 'form', thread: email, from_email: email, from_name: input.name || null, to_email: (getFounder().email ?? '').toLowerCase(),
    subject: 'Besked fra kontaktformularen', text_body: input.message, html_body: null,
    message_id: null, in_reply_to: null, resend_id: null, order_id: await orderFor(email), client: input.client, attachments: null,
  });
  await notifyOwner(`Ny besked fra ${input.name || email}`, [snippet(m)], null).catch(() => {});
  return m;
}

/** The owner's answer: sent from hej@ with the threading headers, and filed as the thread's next row. */
export async function replyToThread(thread: string, text: string): Promise<Message> {
  const history = await threadMessages(thread);
  const lastIn = [...history].reverse().find((m) => m.direction === 'in');
  const subjectBase = (lastIn?.subject ?? 'Din besked til Billedearv').replace(/^(re|sv):\s*/i, '');
  const subject = `Re: ${subjectBase}`;
  const f = getFounder();
  const paragraphs = text.trim().split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;white-space:pre-line;">${esc(p)}</p>`).join('');
  const quoted = lastIn ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2ddd4;color:#5D5953;font-size:14px;white-space:pre-line;">${esc(snippet(lastIn))}</div>` : '';
  const html = `<!doctype html><html lang="da"><body style="margin:0;background:#FBFAF7;color:#171614;font-family:'Public Sans','Helvetica Neue',Arial,sans-serif;font-size:17px;line-height:1.55;"><div style="max-width:560px;margin:0 auto;padding:32px 24px 48px;">
${paragraphs}
<p style="margin:20px 0 0;">Venlig hilsen<br>Billedearv<br><a href="${siteUrl('/')}" style="color:#1F5A3C;">billedearv.dk</a> · ${esc(f.email ?? '')}</p>
${quoted}</div></body></html>`;
  const headers: Record<string, string> = {};
  if (lastIn?.message_id) { headers['In-Reply-To'] = lastIn.message_id; headers['References'] = lastIn.message_id; }
  const id = await sendMail({ to: thread, subject, html, text: `${text.trim()}\n\nVenlig hilsen\nBilledearv\n${siteUrl('/')}`, headers });
  return insertMessage({
    direction: 'out', channel: 'email', thread, from_email: (f.email ?? '').toLowerCase(), from_name: 'Billedearv', to_email: thread,
    subject, text_body: text.trim(), html_body: null, message_id: null, in_reply_to: lastIn?.message_id ?? null, resend_id: id,
    order_id: lastIn?.order_id ?? null, client: null, attachments: null, read_at: new Date().toISOString(),
  });
}

/** A conversation the owner starts: sent from hej@ and filed as the thread's first row. */
export async function sendNewMessage(to: string, subject: string, text: string): Promise<Message> {
  const thread = threadKey(to);
  const f = getFounder();
  const subj = subject.trim() || 'Fra Billedearv';
  const paragraphs = text.trim().split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;white-space:pre-line;">${esc(p)}</p>`).join('');
  const html = `<!doctype html><html lang="da"><body style="margin:0;background:#FBFAF7;color:#171614;font-family:'Public Sans','Helvetica Neue',Arial,sans-serif;font-size:17px;line-height:1.55;"><div style="max-width:560px;margin:0 auto;padding:32px 24px 48px;">
${paragraphs}
<p style="margin:20px 0 0;">Venlig hilsen<br>Billedearv<br><a href="${siteUrl('/')}" style="color:#1F5A3C;">billedearv.dk</a> · ${esc(f.email ?? '')}</p></div></body></html>`;
  const id = await sendMail({ to: thread, subject: subj, html, text: `${text.trim()}\n\nVenlig hilsen\nBilledearv\n${siteUrl('/')}` });
  return insertMessage({
    direction: 'out', channel: 'email', thread, from_email: (f.email ?? '').toLowerCase(), from_name: 'Billedearv', to_email: thread,
    subject: subj, text_body: text.trim(), html_body: null, message_id: null, in_reply_to: null, resend_id: id,
    order_id: await orderFor(thread), client: null, attachments: null, read_at: new Date().toISOString(),
  });
}
