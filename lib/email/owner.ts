import { getFounder } from '@/lib/founder';
import { sendMail } from '@/lib/email/send';
import { esc, siteUrl } from '@/lib/email/templates';

/**
 * One short mail to the owner per event that needs a human: payment, lead, change request, approval,
 * a failed final, a suspected double payment. The promises on the site ("inden 24 timer", "inden 48 timer")
 * depend on these arriving — nobody opens an admin page twice a day for years.
 */
export async function notifyOwner(subject: string, lines: string[], orderId?: string | null): Promise<void> {
  const to = process.env.OWNER_EMAIL ?? getFounder().email;
  if (!to) return;
  const link = orderId ? siteUrl(`/admin/orders/${orderId}`) : siteUrl('/admin');
  const html = `<!doctype html><html lang="da"><body style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.5;color:#1C1A17;background:#fff;"><div style="max-width:560px;margin:0 auto;padding:24px;">
<p style="margin:0 0 12px;font-weight:600;">${esc(subject)}</p>
${lines.map((l) => `<p style="margin:0 0 8px;">${esc(l)}</p>`).join('')}
<p style="margin:16px 0 0;"><a href="${link}" style="color:#2F4A3A;">${esc(link)}</a></p></div></body></html>`;
  const text = `${subject}\n\n${lines.join('\n')}\n\n${link}`;
  try { await sendMail({ to, subject: `[Genfundet] ${subject}`, html, text }); } catch (e) { console.error('owner mail failed', e); }
}
