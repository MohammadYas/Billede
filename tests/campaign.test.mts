/**
 * Dates that change the site by themselves.
 *
 *   npm test
 *
 * Two of them: the launch offer's end date, and the Christmas window. Nobody deploys on the day they
 * turn over, so the only way to know what the site will say is to ask it here, with the clock held
 * still. This file exists because the deployed CHRISTMAS_START_DATE (2026-10-01) and the code's own
 * default (2026-11-14) disagree — so on 1 October the live site starts calling itself a Christmas
 * present and promising delivery "inden jul", unattended, in the middle of a running campaign.
 * Whether that is wanted is the owner's call; that it happens should not be a surprise.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_bundle.mts';

/** A fresh copy of lib/config.ts with the dates it would have in that environment. */
const withDates = async (env: Record<string, string>) => {
  const saved: Record<string, string | undefined> = {};
  for (const k of ['CAMPAIGN_END_DATE', 'CHRISTMAS_START_DATE', 'CHRISTMAS_CUTOFF_DATE']) { saved[k] = process.env[k]; delete process.env[k]; }
  Object.assign(process.env, env);
  try { return await load('lib/config.ts', {}); }
  finally { for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } }
};

const at = (iso: string) => new Date(`${iso}T12:00:00+02:00`);

test('the launch offer ends on its last day and never comes back', async () => {
  const c = await withDates({ CAMPAIGN_END_DATE: '2026-09-30' });
  assert.equal(c.campaignActive(at('2026-09-12')), true);
  assert.equal(c.campaignActive(at('2026-09-30')), true, 'the last day is included, as the copy promises');
  assert.equal(c.campaignActive(at('2026-10-01')), false);
  // and it stays off: there is no start date to come round again
  assert.equal(c.campaignActive(at('2026-12-24')), false);
  assert.equal(c.campaignActive(at('2027-09-12')), false);
});

test('an empty or broken end date turns the offer off rather than leaving it on forever', async () => {
  for (const CAMPAIGN_END_DATE of ['', 'snart', '30-09-2026', '2026-13-45x']) {
    const c = await withDates({ CAMPAIGN_END_DATE });
    assert.equal(c.campaignActive(at('2026-09-12')), false, JSON.stringify(CAMPAIGN_END_DATE));
  }
});

test('the Christmas layer turns on and off on exactly the configured days', async () => {
  const c = await withDates({ CHRISTMAS_START_DATE: '2026-11-14', CHRISTMAS_CUTOFF_DATE: '2026-12-02' });
  assert.equal(c.currentSeason(at('2026-11-13')), 'default');
  assert.equal(c.currentSeason(at('2026-11-14')), 'jul');
  assert.equal(c.currentSeason(at('2026-12-02')), 'jul', 'the last order date is still Christmas');
  assert.equal(c.currentSeason(at('2026-12-03')), 'default');
  assert.equal(c.currentSeason(at('2027-01-05')), 'default', 'and it does not run on into the new year');
});

test('what the live configuration actually does on 1 October', async () => {
  // the deployed value, not the code default: this is the change nobody scheduled
  const c = await withDates({ CHRISTMAS_START_DATE: '2026-10-01', CHRISTMAS_CUTOFF_DATE: '2026-12-02' });
  assert.equal(c.currentSeason(at('2026-09-30')), 'default');
  assert.equal(c.currentSeason(at('2026-10-01')), 'jul', 'the site starts selling Christmas on 1 October by itself');
  assert.equal(c.deliveryPromise(c.currentSeason(at('2026-10-01'))), 'inden jul');
  assert.equal(c.daysToCutoff(at('2026-10-01')), 62, 'and counts down 62 days to the last order date');
});

test('the countdown never promises a day that has passed', async () => {
  const c = await withDates({ CHRISTMAS_START_DATE: '2026-11-14', CHRISTMAS_CUTOFF_DATE: '2026-12-02' });
  assert.equal(c.daysToCutoff(at('2026-12-01')), 1);
  assert.equal(c.daysToCutoff(at('2026-12-02')), 0, 'the last day counts zero, not one');
  assert.ok(c.daysToCutoff(at('2026-12-03')) < 0);
  // after the cutoff the season is over, so nothing can still be offering "inden jul"
  assert.equal(c.currentSeason(at('2026-12-03')), 'default');
  assert.match(c.deliveryPromise(c.currentSeason(at('2026-12-03'))), /inden \d+ hverdage/);
});

test('a delivery promise is always either a real deadline or a number of working days', async () => {
  const c = await withDates({ CHRISTMAS_START_DATE: '2026-11-14', CHRISTMAS_CUTOFF_DATE: '2026-12-02', CAMPAIGN_END_DATE: '2026-09-30' });
  for (const day of ['2026-09-12', '2026-10-01', '2026-11-14', '2026-12-02', '2026-12-03', '2027-02-01']) {
    const promise = c.deliveryPromise(c.currentSeason(at(day)));
    assert.match(promise, /^(inden jul|inden \d+ hverdage)$/, `${day}: ${promise}`);
  }
});

test('the copy follows the offer off without leaving a free extra copy behind', async () => {
  // a dead campaign must not keep offering "gratis" — and the paid price must reappear on the button
  const copy = await load('lib/copy.ts', {
    '@/lib/config': `
      export const CONFIG = { deliveryDaysMax: 10, christmasStartDate: '2026-11-14', christmasCutoffDate: '2026-12-02', campaignEndDate: '2026-09-01', retentionUnpaidDays: 30, retentionCompletedDays: 90 };
      export const campaignActive = () => false;
      export const currentSeason = () => 'default';
      export const daysToCutoff = () => 0;
      export const deliveryPromise = () => 'inden 10 hverdage';
      export const formatCutoffDate = () => '1. september';`,
    '@/lib/founder': `export const getFounder = () => ({ name: 'Test', firstName: 'Test', city: 'By', cvr: '1', email: 'a@b.dk', address: 'Vej 1', company: 'Co', portrait: null, why: [], complete: true, pending: [] }); export const fornavn = () => 'vi';`,
  });
  const c = copy.copy();
  assert.equal(c.campaign.active, false);
  assert.match(c.preview.extraAdd, /Tilføj et eksemplar/);
  assert.doesNotMatch(c.preview.extraAdd, /gratis/i, 'the button the customer sees when the offer is over');
  assert.doesNotMatch(c.spoergsmaal.items.map((i: { a: string }) => i.a).join(' '), /lanceringstilbud/i, 'and the FAQ stops mentioning it');
});
