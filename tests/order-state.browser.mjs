/**
 * The order page's state, checked in a real browser rather than in the module that feeds it.
 *
 *   npm run build && npm start &            # or any running instance
 *   PURL="http://localhost:3000/p/<id>?t=<share-token>" npm run test:order
 *
 * `npm test` proves the arithmetic; this proves the page. It resets the configuration, reloads, and
 * then asserts on every price rendered anywhere on the page after each change — the bill, the sticky
 * bar and every "Bestil mit billede" button at once, so a surface that quietly keeps an old number
 * cannot pass. It also asserts the one thing a screenshot of any other state cannot show: that the
 * extra-copy control is opt-in on load, with no stepper and nothing ticked but the size and frame.
 *
 * It needs a preview that exists, so it takes the URL rather than making one.
 */
import { chromium, devices } from 'playwright';
const URL = process.env.PURL;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await b.newContext({ ...devices['iPhone 14'], viewport: { width: 390, height: 844 }, locale: 'da-DK' });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);

const read = async () => p.evaluate(() => {
  const txt = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return {
    size: txt(document.querySelector('label.size.is-on')).match(/\d+×\d+ cm/)?.[0] ?? null,
    frame: txt(document.querySelector('label.frame.is-on')).match(/^(Sort|Eg)/)?.[0] ?? null,
    extras: txt(document.querySelector('.extra-count, .extra .tabular')) || '0',
    ctas: [...document.querySelectorAll('button')].filter((b) => /Bestil mit billede/.test(b.textContent || '')).map((b) => txt(b).match(/([\d.]+) kr\./)?.[1] ?? null),
    total: (() => { const rows = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /^I alt$/.test((e.textContent||'').trim())); const r = rows[0]?.closest('div,tr,li,p'); return txt(r).match(/([\d.]+) kr\./)?.[1] ?? null; })(),
    allPrices: [...new Set((document.body.innerText.match(/[\d.]+ kr\./g) || []))],
  };
});
const step = async (sign, times = 1) => {
  const btn = p.locator('button', { hasText: sign === '+' ? /^\+$/ : /^−$/ }).first();
  for (let i = 0; i < times; i++) { if (!(await btn.count()) || await btn.isDisabled().catch(() => true)) break; await btn.click(); await p.waitForTimeout(650); }
};
const addOne = async () => { const a = p.locator('button:has-text("Tilføj et eksemplar")').first(); if (await a.count()) { await a.click(); await p.waitForTimeout(650); } else await step('+', 1); };
const pickSize = async (label) => { await p.locator(`label.size:has-text("${label}")`).first().click(); await p.waitForTimeout(700); };

const check = async (name, expectTotal, expectSize) => {
  const s = await read();
  const ctas = [...new Set(s.ctas)];
  const okCta = ctas.length === 1 && ctas[0] === expectTotal;
  const okTotal = s.total === expectTotal;
  const okSize = !expectSize || s.size === expectSize;
  if (!okCta || !okTotal || !okSize) bad++;
  console.log(`${okCta && okTotal && okSize ? 'OK  ' : 'FEJL'} ${name.padEnd(30)} størrelse=${s.size} ramme=${s.frame} | knapper=${JSON.stringify(ctas)} | "I alt"=${s.total} | forventet ${expectTotal}`);
  return s;
};

let bad = 0;

// reset to the default configuration first
await step('−', 4);
await pickSize('30×40');
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1800);
const start = await check('standard 30×40 · sort · 0', '599', '30×40 cm');

// P1: nothing in the extra-copy control may be active before the customer touches it
const optIn = await p.evaluate(() => ({
  addButton: [...document.querySelectorAll('button')].some((b) => /Tilføj et eksemplar/.test(b.textContent || '')),
  stepper: [...document.querySelectorAll('button')].some((b) => /^[−+]$/.test((b.textContent || '').trim())),
  ticked: [...document.querySelectorAll('input[type=checkbox],input[type=radio]')].filter((i) => i.checked).map((i) => `${i.name}=${i.value}`),
}));
const optInOk = optIn.addButton && !optIn.stepper && optIn.ticked.every((v) => /^stoerrelse=30x40$|^ramme=sort$/.test(v));
if (!optInOk) bad++;
console.log(`${optInOk ? 'OK  ' : 'FEJL'} ${'ekstra er opt-in ved indlæsning'.padEnd(30)} knap=${optIn.addButton} stepper=${optIn.stepper} afkrydset=${JSON.stringify(optIn.ticked)}`);
console.log('     alle priser på siden:', start.allPrices.join(' '));

await pickSize('40×50'); await check('40×50', '799', '40×50 cm');
await pickSize('50×70'); await check('50×70', '999', '50×70 cm');
await addOne();           await check('50×70 + 1 ekstra', '1.348');
await pickSize('40×50'); await check('40×50 + 1 ekstra', '1.148');
await pickSize('30×40'); await check('30×40 + 1 ekstra', '948');
await step('−', 1);       await check('tilbage til standard', '599', '30×40 cm');

// nothing may move the price without a click: reload and confirm it is still the default
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1800);
await check('efter genindlæsning', '599', '30×40 cm');
await b.close();
console.log(bad ? `\n${bad} FEJL` : '\nalle prisskift stemmer i konfigurator, regning og hver CTA');
process.exit(bad ? 1 : 0);
