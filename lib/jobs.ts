import { CONFIG } from '@/lib/config';
import { getOrder, updateOrder, type Order } from '@/lib/db/orders';

/**
 * Long-running work (restoration ≈ 40 s, colour ≈ 30 s, print final ≈ 2 min) never runs inside a
 * request. A request enqueues a job; the job runs in a Netlify Background Function (15 min limit)
 * or, on a long-lived Node server and in `next dev`, in-process. The browser polls the order.
 * Job state lives in orders.preview_meta.job — no extra table, visible in admin.
 */
export type JobKind = 'restore' | 'colour' | 'final';
export type JobState = {
  kind: JobKind;
  state: 'queued' | 'running' | 'done' | 'failed';
  stage?: 'restoring' | 'preparing';
  reason?: string;
  error?: string;
  queuedAt?: string;
  startedAt?: string;
  finishedAt?: string;
};

export function getJob(order: Order): JobState | null {
  return ((order.preview_meta as { job?: JobState } | null)?.job) ?? null;
}

export async function setJob(orderId: string, job: JobState): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) return;
  await updateOrder(orderId, { preview_meta: { ...(order.preview_meta ?? {}), job } });
}

/** Is a job of this kind already queued or running (started less than 15 min ago)? */
export function jobBusy(order: Order, kind: JobKind): boolean {
  const j = getJob(order);
  if (!j || j.kind !== kind || (j.state !== 'queued' && j.state !== 'running')) return false;
  const since = Date.parse(j.startedAt ?? j.queuedAt ?? '') || 0;
  return Date.now() - since < 15 * 60_000;
}

export function jobSecret(): string {
  return process.env.JOB_SECRET ?? process.env.CRON_SECRET ?? '';
}

/** Netlify sets NETLIFY=true at build and run time; JOB_RUNNER=netlify forces it, JOB_RUNNER=inline forces in-process. */
export function usesBackgroundFunction(): boolean {
  if (process.env.JOB_RUNNER === 'inline') return false;
  return process.env.JOB_RUNNER === 'netlify' || process.env.NETLIFY === 'true';
}

export async function enqueue(kind: JobKind, orderId: string): Promise<void> {
  await setJob(orderId, { kind, state: 'queued', queuedAt: new Date().toISOString() });
  if (usesBackgroundFunction()) {
    const url = `${CONFIG.siteUrl.replace(/\/$/, '')}/.netlify/functions/job-background`;
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-job-secret': jobSecret() }, body: JSON.stringify({ kind, orderId }) });
    if (!r.ok && r.status !== 202) throw new Error(`job enqueue failed: ${r.status}`);
    return;
  }
  // in-process: the response returns now, the work continues on this server
  void runJob(kind, orderId).catch((e) => console.error('job failed', kind, orderId, e));
}

export async function runJob(kind: JobKind, orderId: string): Promise<void> {
  const svc = await import('@/lib/preview-service');
  if (kind === 'restore') return svc.processRestore(orderId);
  if (kind === 'colour') return svc.processColour(orderId);
  return svc.processFinal(orderId);
}
