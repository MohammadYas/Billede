import { test } from 'node:test';
import assert from 'node:assert/strict';
import { track, setConsent } from '../lib/analytics/client';

test('accepting cookies replays the arrival PageView exactly once', () => {
  const previous = ['window', 'document', 'location', 'sessionStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const storage = new Map<string, string>();
  const win: Record<string, any> = {};
  try {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = 'synthetic-test-pixel';
    Object.assign(globalThis, {
      window: win,
      document: { cookie: '', createElement: () => ({}), head: { appendChild() {} } },
      location: { protocol: 'http:' },
      sessionStorage: { getItem: (k: string) => storage.get(k), setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) },
    });
    track('PageView', {}, { serverLog: false });
    track('FlowOpened', { cta: 'C' }, { serverLog: false });
    assert.equal(win.fbq, undefined, 'no pixel before consent');
    setConsent('yes');
    const events = win.fbq.queue as unknown[][];
    assert.equal(events.filter(e => e[1] === 'PageView').length, 1, 'one arrival must not become two views');
    assert.equal(events.filter(e => e[1] === 'FlowOpened').length, 1);
  } finally {
    for (const [key, desc] of previous) { if (desc) Object.defineProperty(globalThis, key, desc); else Reflect.deleteProperty(globalThis, key); }
    if (pixel === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID; else process.env.NEXT_PUBLIC_META_PIXEL_ID = pixel;
  }
});
