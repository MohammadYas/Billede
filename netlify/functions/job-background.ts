import type { Config } from '@netlify/functions';
import { jobSecret, runJob, type JobKind } from '../../lib/jobs';

/**
 * Background job runner (Netlify answers 202 at once and lets this run for up to 15 minutes).
 * Invoked by lib/jobs.ts `enqueue()` and the hourly schedule with the shared JOB_SECRET.
 * Restoration ≈ 40 s, colour ≈ 30 s, print final ≈ 2 min, housekeeping ≈ seconds to minutes —
 * none of which fits a synchronous function (10–26 s) or a streamed one (60 s).
 */
const KINDS: JobKind[] = ['restore', 'colour', 'final', 'housekeeping'];

export default async (req: Request) => {
  if (!jobSecret() || req.headers.get('x-job-secret') !== jobSecret()) return new Response('unauthorized', { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { kind?: JobKind; orderId?: string };
  if (!body.kind || !KINDS.includes(body.kind)) return new Response('bad request', { status: 400 });
  if (body.kind !== 'housekeeping' && !/^[0-9a-f-]{36}$/.test(body.orderId ?? '')) return new Response('bad request', { status: 400 });
  await runJob(body.kind, body.orderId ?? '');
  return new Response('ok');
};

export const config: Config = { background: true };
