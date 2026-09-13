import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_bundle.mts';

test('the first screen explains all purchase options after the free preview', async () => {
  const { copy } = await load('lib/copy.ts', {});
  const saved = { print: process.env.NEXT_PUBLIC_PRINT_ENABLED, printPrice: process.env.NEXT_PUBLIC_PRINT_PRICE_DKK, digital: process.env.NEXT_PUBLIC_DIGITAL_ENABLED, digitalPrice: process.env.NEXT_PUBLIC_DIGITAL_PRICE_DKK };
  Object.assign(process.env, { NEXT_PUBLIC_PRINT_ENABLED: 'true', NEXT_PUBLIC_PRINT_PRICE_DKK: '250', NEXT_PUBLIC_DIGITAL_ENABLED: 'true', NEXT_PUBLIC_DIGITAL_PRICE_DKK: '99' });
  try {
    const c = copy();
    assert.deepEqual(c.hero.priceLadder, [
      { key: 'framed', label: 'Indrammet', price: 'fra 599 kr.', detail: 'inkl. fragt' },
      { key: 'print', label: 'Print uden ramme', price: '250 kr.', detail: 'inkl. fragt' },
      { key: 'digital', label: 'Digital fil', price: '99 kr.', detail: 'ingen levering' },
    ]);
    assert.equal(c.hero.priceLadderLead, 'Efter dit gratis preview vælger du selv:');
  } finally {
    for (const [key, value] of Object.entries({ NEXT_PUBLIC_PRINT_ENABLED: saved.print, NEXT_PUBLIC_PRINT_PRICE_DKK: saved.printPrice, NEXT_PUBLIC_DIGITAL_ENABLED: saved.digital, NEXT_PUBLIC_DIGITAL_PRICE_DKK: saved.digitalPrice })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('the price ladder hides offers that are switched off', async () => {
  const { copy } = await load('lib/copy.ts', {});
  const saved = { print: process.env.NEXT_PUBLIC_PRINT_ENABLED, digital: process.env.NEXT_PUBLIC_DIGITAL_ENABLED, digitalPrice: process.env.NEXT_PUBLIC_DIGITAL_PRICE_DKK };
  Object.assign(process.env, { NEXT_PUBLIC_PRINT_ENABLED: 'false', NEXT_PUBLIC_DIGITAL_ENABLED: 'true', NEXT_PUBLIC_DIGITAL_PRICE_DKK: '99' });
  try {
    const c = copy();
    assert.deepEqual(c.hero.priceLadder.map((x: { key: string }) => x.key), ['framed', 'digital']);
  } finally {
    for (const [key, value] of Object.entries({ NEXT_PUBLIC_PRINT_ENABLED: saved.print, NEXT_PUBLIC_DIGITAL_ENABLED: saved.digital, NEXT_PUBLIC_DIGITAL_PRICE_DKK: saved.digitalPrice })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
