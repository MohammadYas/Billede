/** Renders the three mails to work/emails/*.html and screenshots the approval mail to checkpoints/04-email-approval.png */
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { approvalRequest, orderConfirmation, shippedNotice } from '@/lib/email/templates';

async function main() {
  await fs.mkdir('work/emails', { recursive: true });
  const mails = {
    confirmation: orderConfirmation({ format: '30x40', orderShort: 'a1b2c3d4' }),
    approval: approvalRequest({ imageUrl: 'file://' + process.cwd() + '/public/examples/olesen-after.jpg', approveUrl: 'https://genfundet.dk/godkend/x', changeUrl: 'https://genfundet.dk/godkend/x/aendring' }),
    shipped: shippedNotice({ trackingNumber: '00570123456789', trackingUrl: 'https://tracking.postnord.com/?id=00570123456789' }),
  };
  for (const [k, m] of Object.entries(mails)) await fs.writeFile(`work/emails/${k}.html`, m.html);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined });
  const page = await browser.newPage({ viewport: { width: 600, height: 900 } });
  await page.goto('file://' + process.cwd() + '/work/emails/approval.html');
  await page.screenshot({ path: 'checkpoints/04-email-approval.png', fullPage: true });
  await page.goto('file://' + process.cwd() + '/work/emails/confirmation.html');
  await page.screenshot({ path: 'checkpoints/04-email-confirmation.png', fullPage: true });
  await browser.close();
  console.log('emails rendered');
}
main().catch((e) => { console.error(e); process.exit(1); });
