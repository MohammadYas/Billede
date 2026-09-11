/**
 * One personal follow-up to a single address. Prints the mail and exits unless --send is passed.
 *
 *   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/one-off-mail.ts <address> [--send]
 *
 * The address is an argument on purpose: a customer's e-mail must not end up in the repository's history.
 */
import { sendMail, isEmailConfigured } from '@/lib/email/send';
import { getFounder } from '@/lib/founder';

const TO = process.argv.slice(2).find((a) => a.includes('@'));
if (!TO) { console.error('usage: one-off-mail.ts <address> [--send]'); process.exit(1); }
const SUBJECT = 'Dit billede hos Billedearv – rammen kom med, det er rettet nu';

const f = getFounder();
const name = f.firstName || 'Billedearv';

const lines = [
  'Hej,',
  'Du prøvede Billedearv i dag, og resultatet blev ikke, som det skulle. Billedet var fotograferet i sin ramme, og rammen kom med i restaureringen – så det, du fik at se, var billedet med guldrammen printet ind i det.',
  'Det er rettet nu. Vi finder selve billedet inde i fotografiet og skærer rammen fra, før vi går i gang. Prøv at lægge det op igen, så ser du forskellen med det samme:',
  'https://billedearv.dk',
  'Du betaler stadig ingenting for at se det. Driller det, så svar bare på denne mail – så kigger jeg selv på det.',
  `Venlig hilsen\n${name}\nBilledearv`,
];

const text = lines.join('\n\n');
const html = `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#FBFAF7;color:#171614;font-family:'Public Sans','Helvetica Neue',Arial,sans-serif;font-size:17px;line-height:1.55;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px 56px;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;margin-bottom:32px;">Billedearv</div>
${lines
  .slice(0, 3)
  .map((l) => `<p style="margin:0 0 16px;">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`)
  .join('\n')}
<p style="margin:0 0 24px;"><a href="https://billedearv.dk" style="display:inline-block;padding:14px 22px;border-radius:2px;background:#171614;color:#FBFAF7;text-decoration:none;font-weight:600;">Læg billedet op igen</a></p>
<p style="margin:0 0 16px;">${lines[4]}</p>
<p style="margin:0 0 16px;">Venlig hilsen<br>${name}<br>Billedearv</p>
<hr style="border:0;border-top:1px solid #E2DDD4;margin:40px 0 16px;">
<p style="margin:0;font-size:14px;color:#5D5953;">Billedearv · ${f.email} · ${f.company} · CVR ${f.cvr}</p>
</div></body></html>`;

async function main() {
  console.log('TO      :', TO);
  console.log('SUBJECT :', SUBJECT);
  console.log('CONFIG  :', isEmailConfigured() ? 'Resend configured' : 'NOT configured');
  console.log('\n--- text ---\n' + text + '\n------------\n');
  if (!process.argv.includes('--send')) { console.log('dry run — pass --send to actually send'); return; }
  const id = await sendMail({ to: TO as string, subject: SUBJECT, html, text });
  console.log('sent, provider id:', id);
}

main().catch((e) => { console.error(e); process.exit(1); });
