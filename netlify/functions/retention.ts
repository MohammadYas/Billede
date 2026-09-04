import type { Config } from '@netlify/functions';
import { jobRunnerUrl, jobSecret, usesBackgroundFunction, runJob } from '../../lib/jobs';

/**
 * Hourly housekeeping: reconcile open Checkout sessions with Stripe, delete files past retention,
 * send approval reminders, auto-complete shipped orders. The work itself runs in the background
 * function (15 min); this scheduled function only hands it over, so a long loop is never cut mid-way.
 */
export default async () => {
  if (usesBackgroundFunction()) {
    const r = await fetch(jobRunnerUrl(), { method: 'POST', headers: { 'content-type': 'application/json', 'x-job-secret': jobSecret() }, body: JSON.stringify({ kind: 'housekeeping', orderId: '' }) });
    return new Response(JSON.stringify({ handed_over: r.status }), { headers: { 'content-type': 'application/json' } });
  }
  await runJob('housekeeping', '');
  return new Response('ok');
};

export const config: Config = { schedule: '0 * * * *' };
