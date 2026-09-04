// Delivery promises are configuration, never copy.
// Owner edits these two values (or the matching env vars) before the test.

export const CONFIG = {
  /** Max business days from approval to delivery, shown as "inden X hverdage". */
  deliveryDaysMax: Number(process.env.DELIVERY_DAYS_MAX ?? 10),
  /** Christmas copy runs from this date … */
  christmasStartDate: process.env.CHRISTMAS_START_DATE ?? '2026-11-01',
  /** … until this last order date that is still delivered before Christmas (ISO dates). */
  christmasCutoffDate: process.env.CHRISTMAS_CUTOFF_DATE ?? '2026-12-10',
  /** Retention in days. */
  retentionUnpaidDays: 30,
  retentionCompletedDays: 90,
  /** Signed URL lifetime, seconds (≤ 15 min per security rules). */
  signedUrlSeconds: 15 * 60,
  /** Upload limits. */
  maxUploadBytes: 25 * 1024 * 1024,
  /** Preview pipeline hard limit. */
  previewTimeoutMs: 90_000, // a normal run is ~40 s; 45 s turned every slow minute at OpenAI into a lead form (attack #2, H1)
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  siteName: 'Genfundet',
} as const;

export type Season = 'jul' | 'default';

/** Season is `jul` between the start and cutoff dates (Europe/Copenhagen), otherwise `default`. */
export function currentSeason(now: Date = new Date()): Season {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Copenhagen' }).format(now);
  return today >= CONFIG.christmasStartDate && today <= CONFIG.christmasCutoffDate ? 'jul' : 'default';
}

/** "10. december" — Danish long date without year. */
export function formatCutoffDate(iso: string = CONFIG.christmasCutoffDate): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/** "inden jul" or "inden 10 hverdage", depending on season. */
export function deliveryPromise(season: Season = currentSeason()): string {
  return season === 'jul' ? 'inden jul' : `inden ${CONFIG.deliveryDaysMax} hverdage`;
}
