/** Isolated browser regression: real PreviewPanel, no database, payment, pixel or network traffic. */
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium, webkit } from 'playwright';
import { load } from './_bundle.mts';

const { copy } = await load('lib/copy.ts', {});
const bundled = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
    import Panel from './components/PreviewPanel';
    createRoot(document.getElementById('root')).render(<Panel {...window.fixture} />);`,
    loader: 'tsx', resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
  define: { 'process.env': '{}' },
  plugins: [{ name: 'analytics-isolation', setup(b) {
    b.onResolve({ filter: /^@\/lib\/analytics\/client$/ }, () => ({ path: 'analytics', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: `export const PRODUCT={}; export const track=(name)=>window.events.push(name);` }));
  } }],
});
const html = `<style>body{margin:0} .ba{width:200px;height:200px;position:relative} .ba img{position:absolute;width:100%;height:100%} .pv-cta-bar{display:none}</style><div id="root"></div>`;
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="gray"/></svg>';
for (const [engine, launcher] of [['Chromium', chromium], ['WebKit', webkit]] as const) {
  const browser = await launcher.launch();
  try {
    for (const scenario of ['pending-result', 'broken-result', 'under-half', 'hidden-tab', 'visible-result']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 780 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      let release: (() => void) | undefined;
      const waiting = new Promise<void>(resolve => { release = resolve; });
      await page.route('**/*', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/') return route.fulfill({ contentType: 'text/html', body: html });
        if (path === '/after.svg' && scenario === 'pending-result') await waiting;
        if (path === '/after.svg' && scenario === 'broken-result') return route.abort();
        if (path.endsWith('.svg')) return route.fulfill({ contentType: 'image/svg+xml', body: svg });
        return route.abort();
      });
      await page.goto('http://preview.test/?utm_source=pwtest');
      if (scenario === 'hidden-tab') await page.evaluate("Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })");
      await page.evaluate(({ c, scenario }) => {
        (window as any).events = [];
        if (scenario === 'under-half') {
          const style = document.createElement('style');
          style.textContent = '.ba {position:fixed;top:740px;left:0}';
          document.head.append(style);
        }
        (window as any).fixture = { c, paid: false, cancelled: false,
          offers: { print: { enabled: true, priceDkk: 250 }, digital: { enabled: true, priceDkk: 99 } },
          data: { orderId: 'isolated-fixture', product: 'framed', format: '30x40', addons: { frame: 'sort', extraPrints: 0 },
            original: '/before.svg', preview: '/after.svg', colour: null, mockup: '/frame.svg',
            mockups: { '30x40:sort': '/frame.svg' }, width: 200, height: 200, isMonochrome: false } };
      }, { c: copy(), scenario });
      await page.addScriptTag({ content: bundled.outputFiles[0].text });
      await page.waitForFunction(() => document.querySelector<HTMLImageElement>('img.before')?.naturalWidth === 200);
      await page.waitForTimeout(1350);
      const count = () => page.evaluate(() => (window as any).events.filter((x: string) => x === 'PreviewViewed').length);
      try {
        assert.equal(await count(), scenario === 'visible-result' ? 1 : 0, `${engine}: ${scenario}`);
        assert.equal(await page.evaluate(() => (window as any).events.filter((x: string) => x === 'ViewContent').length), 1, 'the active campaign event is unchanged');
        if (scenario === 'pending-result') {
          release!();
          await page.waitForFunction(() => document.querySelector<HTMLImageElement>('img.after')?.naturalWidth === 200);
          await page.waitForTimeout(1150);
          assert.equal(await count(), 1, `${engine}: counts when the finished result arrives`);
        }
        if (scenario === 'under-half') {
          await page.locator('.ba').evaluate(el => { (el as HTMLElement).style.top = '20px'; });
          await page.waitForTimeout(1150);
          assert.equal(await count(), 1, `${engine}: counts after the picture moves fully into view`);
        }
        if (scenario === 'hidden-tab') {
          await page.evaluate("Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange'))");
          await page.waitForTimeout(1150);
          assert.equal(await count(), 1, `${engine}: counts after returning to the tab`);
        }
        if (scenario === 'visible-result') {
          await page.waitForTimeout(1150);
          assert.equal(await count(), 1, `${engine}: a continued look is not a second view`);
        }
        console.log(`PASS ${engine}: ${scenario}`);
      } finally { release!(); await context.close(); }
    }
  } finally { await browser.close(); }
}
