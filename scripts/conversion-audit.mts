/** Local-only audit. External requests and all writes are intercepted; preview uses synthetic props. */
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { copy } from '../lib/copy';

const phase = process.argv[2] ?? 'before';
const base = 'http://localhost:3000';
const out = `docs/audit-2026-09-07/${phase}`;
await fs.mkdir(out, { recursive: true });
const files = await fs.readdir('public/examples');
const jpg = files.find(f => /after.*\.jpg$/.test(f)) ?? files.find(f => f.endsWith('.jpg'))!;
const img = `/examples/${jpg}`;
const id = '00000000-0000-4000-8000-000000000001';
const data = { orderId: id, original: img, preview: img, mockup: img, colour: null, format: '30x40', addons: { frame: 'sort', extraPrints: 0 }, mockups: {}, isMonochrome: true, chosenColour: false, status: 'PREVIEW_READY', token: 'synthetic-audit-token', width: 800, height: 1000 };
const bundle = await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import PreviewPanel from './components/PreviewPanel'; createRoot(document.getElementById('root')).render(<main className="wrap"><PreviewPanel c={${JSON.stringify(copy())}} data={${JSON.stringify(data)}} paid={false} cancelled={true} token="synthetic-audit-token" /></main>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_META_PIXEL_ID': '""' } });
const css = await fs.readFile('app/globals.css', 'utf8');
const fixture = `<!doctype html><html lang="da"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview – syntetisk audit</title><style>${css}</style></head><body><div id="root"></div><script>${bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
const browser = await chromium.launch();
const index: { route: string; width: number; state: string; file: string; synthetic: boolean }[] = [];
const findings: unknown[] = [];
try {
 for (const width of [390, 768, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, locale: 'da-DK', reducedMotion: 'reduce', isMobile: width === 390, hasTouch: width === 390 });
  let mode = 'offline';
  await ctx.route('**/*', async route => {
   const req = route.request(), url = new URL(req.url());
   if (url.origin !== base && !['blob:', 'data:'].includes(url.protocol)) return route.abort();
   if (url.pathname === '/audit-preview') return route.fulfill({ contentType: 'text/html', body: fixture });
   if (url.pathname === '/api/track') return route.fulfill({ status: 204 });
   if (mode === 'processing') {
    if (url.pathname === '/api/preview/start') return route.fulfill({ json: { orderId: id, token: 'synthetic-audit-token', uploadUrl: base + '/audit-upload' } });
    if (url.pathname === '/audit-upload' || url.pathname.endsWith('/run')) return route.fulfill({ status: 200, json: { ok: true } });
    if (url.pathname === `/api/preview/${id}`) return route.fulfill({ json: { status: 'NEW', token: 'synthetic-audit-token', job: { kind: 'restore', state: 'running', stage: 'sending' }, payload: null } });
   }
   if (mode === 'lead-delay' && url.pathname === '/api/lead') { await new Promise(r => setTimeout(r, 700)); return route.fulfill({ json: { ok: true } }); }
   if (req.method() !== 'GET') return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"synthetic outage"}' });
   return route.continue();
  });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const shot = async (name: string, state: string, fullPage = true) => {
   const file = `${name}-${width}.png`;
   await page.screenshot({ path: `${out}/${file}`, fullPage });
   index.push({ route: new URL(page.url()).pathname, width, state, file, synthetic: page.url().includes('audit-preview') });
  };
  for (const [name, route] of [['landing', '/'], ['privacy', '/privatliv'], ['terms', '/handelsbetingelser'], ['thanks-unverified', '/tak'], ['preview-invalid', '/p/invalid'], ['approval-invalid', '/godkend/invalid'], ['change-invalid', '/godkend/invalid/aendring'], ['not-found', '/audit-missing'], ['preview-fixture', '/audit-preview']]) {
   console.log(width, route);
   const response = await page.goto(base + route, { waitUntil: 'networkidle' });
   await page.evaluate(async () => { const h = Math.min(document.body.scrollHeight, 30000); for (let y = 0; y < h; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); await document.fonts.ready; await Promise.race([Promise.all([...document.images].map(i => i.decode().catch(() => {}))), new Promise(r => setTimeout(r, 3000))]); });
   await shot(name, 'full');
   if (route === '/') await shot('landing-first', 'first viewport', false);
   findings.push({ width, route, status: response?.status(), ...await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, broken: [...document.images].filter(i => !i.naturalWidth).map(i => i.getAttribute('src')), h1: document.querySelector('h1')?.textContent })), errors: errors.splice(0) });
  }
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('.hero button').last().count();
  await page.getByRole('button', { name: 'Se hvad mit billede kan blive til', exact: true }).first().click();
  await shot('upload-empty', 'upload dialog', false);
  findings.push({ width, test: 'keyboard upload', inputs: await page.locator('input[type=file]').evaluateAll(es => es.map(e => ({ hidden: e.hasAttribute('hidden'), tabIndex: (e as HTMLElement).tabIndex }))) });
  if (!await page.locator('input[type=file]').first().getAttribute('hidden').then(v => v !== null)) {
    await page.locator('input[type=file]').first().focus();
    const chooser = page.waitForEvent('filechooser', { timeout: 3000 });
    await page.keyboard.press('Enter');
    await (await chooser).setFiles([]);
    findings.push({ width, test: 'Enter opens native file chooser', passed: true });
  }
  await page.keyboard.press('Shift+Tab');
  findings.push({ width, test: 'dialog focus remains inside', inside: await page.evaluate(() => Boolean(document.activeElement?.closest('[role=dialog]'))) });
  await page.keyboard.press('Escape');
  findings.push({ width, test: 'focus restored', active: await page.evaluate(() => document.activeElement?.tagName) });
  await page.getByRole('button', { name: 'Se hvad mit billede kan blive til', exact: true }).first().click();
  await page.getByRole('button', { name: 'Jeg har ikke billedet lige nu', exact: true }).click();
  await page.locator('form button[type=submit]').click();
  await shot('email-invalid', 'empty email validation', false);
  await page.getByRole('textbox').fill('audit@example.invalid');
  await page.locator('form button[type=submit]').click();
  await page.locator('.sheet [role=alert]').waitFor();
  await shot('email-network-error', 'synthetic 503; input retained', false);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Se hvad mit billede kan blive til', exact: true }).first().click();
  await page.locator('input[type=file]').first().setInputFiles({ name: 'unsupported.pdf', mimeType: 'application/pdf', buffer: Buffer.from('synthetic') });
  await shot('upload-type-error', 'unsupported file', false);
  await page.locator('input[type=file]').first().setInputFiles({ name: 'audit.jpg', mimeType: 'image/jpeg', buffer: await fs.readFile(`public${img}`) });
  await shot('upload-selected', 'selected archive image; not submitted externally', false);
  await page.getByRole('button', { name: 'Vis mig resultatet', exact: true }).click();
  await page.locator('.sheet [role=alert]').waitFor();
  await shot('upload-network-error', 'synthetic 503; photo retained', false);
  await page.keyboard.press('Escape');
  mode = 'processing';
  await page.getByRole('button', { name: 'Se hvad mit billede kan blive til', exact: true }).first().click();
  await page.locator('input[type=file]').first().setInputFiles({ name: 'audit.jpg', mimeType: 'image/jpeg', buffer: await fs.readFile(`public${img}`) });
  await page.getByRole('button', { name: 'Vis mig resultatet', exact: true }).click();
  await page.locator('#keep-email').waitFor();
  await shot('processing', 'synthetic running restoration', false);
  await page.locator('form button[type=submit]').click();
  findings.push({ width, test: 'keep email validation', passed: await page.locator('.sheet [role=alert]').count() > 0 });
  await shot('keep-invalid', 'empty email while processing', false);
  await page.locator('#keep-email').fill('audit@example.invalid');
  await page.locator('form button[type=submit]').click();
  await page.waitForTimeout(150);
  findings.push({ width, test: 'keep email failure', passed: await page.locator('.sheet [role=alert]').count() > 0 && await page.locator('#keep-email').count() > 0 });
  await shot('keep-error', 'synthetic save 503', false);
  await page.keyboard.press('Escape');
  mode = 'lead-delay';
  await page.getByRole('button', { name: 'Se hvad mit billede kan blive til', exact: true }).first().click();
  await page.getByRole('button', { name: 'Jeg har ikke billedet lige nu', exact: true }).click();
  await page.getByRole('textbox').fill('audit@example.invalid');
  await page.locator('form button[type=submit]').click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  findings.push({ width, test: 'late response does not reopen dialog', passed: await page.locator('.sheet').count() === 0 });
  await shot('late-response', 'closed during synthetic delayed response', false);
  mode = 'offline';
  await page.goto(base + '/audit-preview', { waitUntil: 'networkidle' });
  await page.locator('label.size').filter({ hasText: '50×70' }).click();
  await page.getByRole('button', { name: /Tilføj et eksemplar/ }).click();
  await shot('preview-extras', '50x70 plus extra copy; synthetic', true);
  findings.push({ width, test: 'price', bill: await page.locator('.bill-total').innerText() });
  await page.getByRole('button', { name: /Bestil mit billede/ }).filter({ visible: true }).first().click();
  await page.locator('.alert:visible').first().waitFor();
  await shot('checkout-error', 'synthetic 503; selection retained', true);
  page.on('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Slet mit billede nu', exact: true }).click();
  await page.waitForTimeout(300);
  findings.push({ width, test: 'delete failure retains preview', url: page.url() });
  await shot('delete-error', 'synthetic deletion 503', true);
  await ctx.close();
 }
} finally {
 await browser.close();
 await fs.writeFile(`${out}/index.json`, JSON.stringify(index, null, 2));
 await fs.writeFile(`${out}/findings.json`, JSON.stringify(findings, null, 2));
 await fs.writeFile(`${out}/index.md`, `# ${phase} screenshots\n\nAll API mutations intercepted; preview is a component fixture, not an authenticated order.\n\n| Route | Width | State | Screenshot |\n|---|---:|---|---|\n` + index.map(i => `| ${i.route}${i.synthetic ? ' (synthetic)' : ''} | ${i.width} | ${i.state} | [${i.file}](${i.file}) |`).join('\n'));
 console.log(`Saved ${index.length} screenshots; ${findings.length} observations to ${out}`);
}
if (process.argv.includes('--verify')) {
 const failures = (findings as any[]).filter(f => f.passed === false || f.inside === false || (f.test === 'focus restored' && f.active !== 'BUTTON') || (f.test === 'keyboard upload' && f.inputs.every((i: any) => i.hidden)) || (f.test === 'delete failure retains preview' && !f.url.includes('/audit-preview')) || f.overflow > 0 || f.broken?.length || f.errors?.length);
 if (failures.length) throw new Error(`${failures.length} regression checks failed: ${JSON.stringify(failures)}`);
}
