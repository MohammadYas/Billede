import { CONFIG } from '@/lib/config';
import { getFounder, fornavn } from '@/lib/founder';
import { formatLabel, type Format } from '@/lib/pricing';

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Plain, typographic, one image max. Inline CSS only. */
function shell(title: string, body: string): string {
  const f = getFounder();
  const sig = [f.name || 'Genfundet', f.phone ? `Tlf. ${f.phone}` : '', f.email || '', f.cvr ? `CVR ${f.cvr}` : ''].filter(Boolean).join(' · ');
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#F6F1E8;color:#1C1A17;font-family:'Instrument Sans','Helvetica Neue',Arial,sans-serif;font-size:17px;line-height:1.55;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px 56px;">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:-0.01em;margin-bottom:32px;">Genfundet</div>
  ${body}
  <hr style="border:0;border-top:1px solid #D9D1C3;margin:40px 0 16px;">
  <p style="margin:0;font-size:14px;color:#5B554C;">${esc(sig)}</p>
</div></body></html>`;
}

const h1 = (t: string) => `<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:28px;line-height:1.1;letter-spacing:-0.015em;margin:0 0 20px;">${esc(t)}</h1>`;
const p = (t: string) => `<p style="margin:0 0 16px;">${t}</p>`;
const button = (href: string, label: string, quiet = false) =>
  `<a href="${href}" style="display:inline-block;padding:14px 22px;border-radius:2px;text-decoration:none;font-weight:600;${quiet ? 'color:#1C1A17;border:1px solid #1C1A17;' : 'background:#1C1A17;color:#F6F1E8;'}margin:0 12px 12px 0;">${esc(label)}</a>`;

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

import type { Order } from '@/lib/db/orders';
import { formatDkk } from '@/lib/pricing';

/** Full-width on a phone: the two decision buttons stack and fill the line. */
const blockButton = (href: string, label: string, quiet = false) =>
  `<a href="${href}" style="display:block;box-sizing:border-box;width:100%;text-align:center;padding:14px 22px;border-radius:2px;text-decoration:none;font-weight:600;${quiet ? 'color:#1C1A17;border:1px solid #1C1A17;' : 'background:#1C1A17;color:#F6F1E8;'}margin:0 0 12px;">${esc(label)}</a>`;

/**
 * Ordrebekræftelse (forbrugeraftaleloven §13): what was bought, the amount incl. VAT, the delivery
 * address, the order id, the refund promise and the terms — plus the framed mockup, which is the
 * picture people forward to their siblings.
 */
export function orderConfirmation(opts: { order: Order }): { subject: string; html: string; text: string } {
  const o = opts.order;
  const navn = cap(fornavn());
  const kontakt = navn === 'Vi' ? 'os' : navn;
  const f = getFounder();
  const subject = 'Tak for din bestilling';
  const addr = (o.shipping_address ?? {}) as Record<string, string | null | undefined>;
  const address = [o.customer_name ?? addr.name, addr.line1, addr.line2, [addr.postal_code, addr.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const amount = formatDkk((o.amount ?? 59900) / 100);
  const meta = (o.preview_meta ?? {}) as { share_token?: string };
  const mockup = o.mockup_path && meta.share_token ? siteUrl(`/api/preview/${o.id}/image?kind=mockup&t=${encodeURIComponent(meta.share_token)}`) : null;
  const previewLink = meta.share_token ? siteUrl(`/p/${o.id}?t=${encodeURIComponent(meta.share_token)}`) : null;
  const gift = (o.preview_meta as { gift_note?: string } | null)?.gift_note;
  const html = shell(subject, [
    h1('Tak for din bestilling.'),
    p(`${esc(navn)} kigger på dit billede inden 24 timer og finjusterer det i hånden.`),
    p('Inden 48 timer får du en mail med det færdige billede. Du godkender det – eller beder om en ændring – før vi printer noget.'),
    p(`Derefter printer vi det i ${esc(formatLabel(o.format))}, indrammer det og sender det hjem til dig med fri fragt – leveret inden ${CONFIG.deliveryDaysMax} hverdage efter dit ja.`),
    mockup ? `<img src="${mockup}" alt="Sådan hænger det" style="display:block;width:100%;height:auto;margin:8px 0 24px;border:1px solid #D9D1C3;">` : '',
    `<p style="margin:0 0 6px;font-weight:600;">Din bestilling</p>`,
    p(`Restaureret og indrammet familiebillede, ${esc(formatLabel(o.format))}${o.chosen_colour ? ', i farver' : ''} · ${esc(amount)} inkl. moms og fragt<br>` +
      (address ? `Leveres til: ${esc(address)}<br>` : '') +
      `Ordre ${esc(o.id.slice(0, 8))} · betalt ${esc(o.paid_at ? new Date(o.paid_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Copenhagen' }) : 'i dag')}` +
      (gift ? `<br>Hilsen på kortet i pakken: “${esc(gift)}”` : '')),
    p(`Indtil du har godkendt det færdige billede, kan du fortryde og få hele beløbet tilbage. <a href="${siteUrl('/handelsbetingelser')}" style="color:#2F4A3A;">Handelsbetingelser</a>${previewLink ? ` · <a href="${previewLink}" style="color:#2F4A3A;">Dit preview</a>` : ''}`),
    f.phone ? p(`Spørgsmål? Ring eller skriv til ${esc(kontakt)} på <a href="tel:${esc(f.phone.replace(/\s/g, ''))}" style="color:#2F4A3A;">${esc(f.phone)}</a> – eller svar på denne mail.`) : '',
  ].join(''));
  const text = `Tak for din bestilling.\n\n${navn} kigger på dit billede inden 24 timer og finjusterer det i hånden. Inden 48 timer får du en mail med det færdige billede til godkendelse. Vi printer først, når du siger ja – leveret inden ${CONFIG.deliveryDaysMax} hverdage efter dit ja.\n\nDin bestilling: Restaureret og indrammet familiebillede, ${formatLabel(o.format)}${o.chosen_colour ? ', i farver' : ''} · ${amount} inkl. moms og fragt${address ? `\nLeveres til: ${address}` : ''}\nOrdre ${o.id.slice(0, 8)}\n\nIndtil du har godkendt det færdige billede, kan du fortryde og få hele beløbet tilbage. ${siteUrl('/handelsbetingelser')}${previewLink ? `\nDit preview: ${previewLink}` : ''}${f.phone ? `\nTlf. ${f.phone}` : ''}`;
  return { subject, html, text };
}

export function changeReceived(opts: { text: string }): { subject: string; html: string; text: string } {
  const subject = 'Vi har fået din ændring';
  const html = shell(subject, [
    h1('Vi har fået din ændring.'),
    p('Tak. Vi retter det og sender dig en ny mail til godkendelse inden 48 timer. Vi printer ikke, før du siger ja.'),
    p(`<span style="color:#5B554C;">Din besked: “${esc(opts.text)}”</span>`),
  ].join(''));
  const text = `Vi har fået din ændring.\n\nTak. Vi retter det og sender dig en ny mail til godkendelse inden 48 timer. Vi printer ikke, før du siger ja.\n\nDin besked: "${opts.text}"`;
  return { subject, html, text };
}

export function refundNotice(opts: { amount: number }): { subject: string; html: string; text: string } {
  const subject = 'Vi har refunderet din betaling';
  const a = formatDkk(opts.amount);
  const html = shell(subject, [
    h1('Vi har refunderet din betaling.'),
    p(`${esc(a)} er sendt retur til det kort eller den MobilePay, du betalte med. Pengene står på din konto inden 5–10 hverdage.`),
    p('Er der noget, vi kunne have gjort bedre, så svar gerne på denne mail.'),
  ].join(''));
  const text = `Vi har refunderet din betaling.\n\n${a} er sendt retur. Pengene står på din konto inden 5–10 hverdage.`;
  return { subject, html, text };
}

export function approvalRequest(opts: { imageUrl: string; approveUrl: string; changeUrl: string; reminder?: boolean; second?: boolean; version?: number }): { subject: string; html: string; text: string } {
  const f = getFounder();
  const subject = opts.second ? 'Dit færdige billede venter stadig på dit ja' : opts.reminder ? 'Dit færdige billede venter på dit ja' : 'Dit færdige billede er klar';
  const buttons = `<div style="margin:0 0 8px;">${blockButton(opts.approveUrl, 'Godkend')}${blockButton(opts.changeUrl, 'Jeg vil have en ændring', true)}</div>`;
  const html = shell(subject, [
    h1(opts.second ? 'Dit færdige billede venter stadig.' : opts.reminder ? 'Dit færdige billede venter på dit ja.' : 'Dit færdige billede er klar.'),
    p(opts.second
      ? `Vi har ikke hørt fra dig. Ligner det? Så tryk Godkend, og vi printer og sender det. Vil du hellere tale om det, så ring${f.phone ? ` på <a href="tel:${esc(f.phone.replace(/\s/g, ''))}" style="color:#2F4A3A;">${esc(f.phone)}</a>` : ''}.`
      : 'Ligner det? Så tryk Godkend, og vi printer og sender det. Er der noget, du vil have ændret, så skriv det – det koster ikke ekstra.'),
    buttons,
    `<img src="${opts.imageUrl}" alt="Dit restaurerede billede" style="display:block;width:100%;height:auto;margin:8px 0 24px;border:1px solid #D9D1C3;">`,
    buttons,
    p(`<span style="color:#5B554C;font-size:14px;">${opts.version && opts.version > 1 ? `Version ${opts.version}. ` : ''}Du kan også bare svare på denne mail med “ja”. Vi printer ikke, før du har godkendt.</span>`),
  ].join(''));
  const text = `${subject}\n\nSe dit billede og godkend her: ${opts.approveUrl}\nVil du have en ændring: ${opts.changeUrl}\n\nDu kan også svare på denne mail med "ja". Vi printer ikke, før du har godkendt.`;
  return { subject, html, text };
}

export function shippedNotice(opts: { trackingNumber: string | null; trackingUrl: string | null }): { subject: string; html: string; text: string } {
  const subject = 'Dit billede er på vej';
  const track = opts.trackingUrl
    ? `<a href="${opts.trackingUrl}" style="color:#2F4A3A;">${esc(opts.trackingNumber ?? 'Følg pakken')}</a>`
    : esc(opts.trackingNumber ?? '');
  const html = shell(subject, [
    h1('Dit billede er på vej.'),
    p('Det er printet, indrammet og pakket. Nu er det hos fragtfirmaet.'),
    track ? p(`Tracking: ${track}`) : '',
    p('Er rammen eller glasset beskadiget, når pakken kommer, så tag et foto og svar på denne mail – så sender vi et nyt.'),
  ].join(''));
  const text = `Dit billede er på vej.\n\nDet er printet, indrammet og pakket.${opts.trackingNumber ? `\nTracking: ${opts.trackingNumber}${opts.trackingUrl ? ` – ${opts.trackingUrl}` : ''}` : ''}\n\nEr noget beskadiget ved levering, så svar på denne mail med et foto, så sender vi et nyt.`;
  return { subject, html, text };
}

export function siteUrl(path: string): string {
  return `${CONFIG.siteUrl.replace(/\/$/, '')}${path}`;
}
