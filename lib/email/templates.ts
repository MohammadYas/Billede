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

export function orderConfirmation(opts: { format: Format; orderShort: string }): { subject: string; html: string; text: string } {
  const navn = cap(fornavn());
  const kontakt = navn === 'Vi' ? 'os' : navn;
  const f = getFounder();
  const subject = 'Tak for din bestilling';
  const html = shell(subject, [
    h1('Tak for din bestilling.'),
    p(`${esc(navn)} kigger på dit billede inden 24 timer og finjusterer det i hånden.`),
    p('Inden 48 timer får du en mail med det færdige billede. Du godkender det – eller beder om en ændring – før vi printer noget.'),
    p(`Derefter printer vi det i ${esc(formatLabel(opts.format))}, indrammer det og sender det hjem til dig med fri fragt.`),
    f.phone ? p(`Spørgsmål? Ring eller skriv til ${esc(kontakt)} på <a href="tel:${esc(f.phone.replace(/\s/g, ''))}" style="color:#2F4A3A;">${esc(f.phone)}</a>.`) : '',
    p(`<span style="color:#5B554C;font-size:14px;">Ordre ${esc(opts.orderShort)}</span>`),
  ].join(''));
  const text = `Tak for din bestilling.\n\n${navn} kigger på dit billede inden 24 timer og finjusterer det i hånden. Inden 48 timer får du en mail med det færdige billede til godkendelse. Vi printer først, når du siger ja.\n\nOrdre ${opts.orderShort}${f.phone ? `\nTlf. ${f.phone}` : ''}`;
  return { subject, html, text };
}

export function approvalRequest(opts: { imageUrl: string; approveUrl: string; changeUrl: string; reminder?: boolean }): { subject: string; html: string; text: string } {
  const subject = opts.reminder ? 'Dit færdige billede venter på dit ja' : 'Dit færdige billede er klar';
  const html = shell(subject, [
    h1(opts.reminder ? 'Dit færdige billede venter på dit ja.' : 'Dit færdige billede er klar.'),
    p('Se det her. Ligner det? Så tryk Godkend, og vi printer og sender det. Er der noget, du vil have ændret, så skriv det – det koster ikke ekstra.'),
    `<img src="${opts.imageUrl}" alt="Dit restaurerede billede" style="display:block;width:100%;height:auto;margin:8px 0 24px;border:1px solid #D9D1C3;">`,
    `<p style="margin:0 0 16px;">${button(opts.approveUrl, 'Godkend')}${button(opts.changeUrl, 'Jeg vil have en ændring', true)}</p>`,
    p('<span style="color:#5B554C;font-size:14px;">Linket virker i 30 dage. Vi printer ikke, før du har godkendt.</span>'),
  ].join(''));
  const text = `${subject}\n\nSe dit billede og godkend her: ${opts.approveUrl}\nVil du have en ændring: ${opts.changeUrl}\n\nVi printer ikke, før du har godkendt.`;
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
