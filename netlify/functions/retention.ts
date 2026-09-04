import type { Config } from '@netlify/functions';
import { runRetention } from '../../lib/retention';

/** Daily at 03:00 UTC: 30-day deletion of unpaid uploads, 90-day deletion of completed orders, 48 h approval reminders. */
export default async () => {
  const r = await runRetention();
  console.log('retention', r);
  return new Response(JSON.stringify(r), { headers: { 'content-type': 'application/json' } });
};

export const config: Config = { schedule: '0 3 * * *' };
