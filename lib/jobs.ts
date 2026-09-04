import { CONFIG } from '@/lib/config';
import { getOrder, updateOrder, type Order } from '@/lib/db/orders';

/**
 * Long-running work (restoration ≈ 40 s, colour ≈ 30 s, print final ≈ 2 min, the hourly housekeeping)
 * never runs inside a request. A request enqueues a job; the job runs in a Netlify Background Function
 * (15 min limit) or, on a long-lived Node server and in `next dev`, in-process. The browser polls the order.
 * Job state lives in orders.preview_meta.job — no extra table, visible in admin.
 */
export type JobKind = 'restore' | 'colour' | 'final' | 'housekeeping';
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

/**
 * Is a job of this kind still legitimately in flight? A background function acknowledges within seconds,
 * so `queued` older than 60 s means the call never landed; `running` older than 5 min means the function
 * died (deploy mid-run, out of memory). Both count as not busy, so "Prøv igen" actually runs again.
 */
export function jobBusy(order: Order, kind: JobKind): boolean {
  const j = getJob(order);
  if (!j || j.kind !== kind) return false;
  const age = Date.now() - (Date.parse(j.startedAt ?? j.queuedAt ?? '') || 0);
  if (j.state === 'queued') return age < 60_000;
  if (j.state === 'running') return age < 5 * 60_000;
  return false;
}

export function jobSecret(): string {
  return process.env.JOB_SECRET ?? process.env.CRON_SECRET ?? '';
}

/** Netlify sets NETLIFY=true; JOB_RUNNER=netlify forces the background function, JOB_RUNNER=inline forces in-process. */
export function usesBackgroundFunction(): boolean {
  if (process.env.JOB_RUNNER === 'inline') return false;
  return process.env.JOB_RUNNER === 'netlify' || process.env.NETLIFY === 'true';
}

export function jobRunnerUrl(): string {
  return `${(process.env.URL ?? CONFIG.siteUrl).replace(/\/$/, '')}/.netlify/functions/job-background`;
}

export async function enqueue(kind: JobKind, orderId: string): Promise<void> {
  if (orderId) await setJob(orderId, { kind, state: 'queued', queuedAt: new Date().toISOString() });
  if (usesBackgroundFunction()) {
    try {
      const r = await fetch(jobRunnerUrl(), { method: 'POST', headers: { 'content-type': 'application/json', 'x-job-secret': jobSecret() }, body: JSON.stringify({ kind, orderId }), signal: AbortSignal.timeout(10_000) });
      if (!r.ok && r.status !== 202) throw new Error(`job enqueue failed: ${r.status}`);
    } catch (e) {
      // never leave a phantom "queued" job: the customer's retry must be able to run
      if (orderId) await setJob(orderId, { kind, state: 'failed', reason: 'queue', error: String(e instanceof Error ? e.message : e) });
      throw e;
    }
    return;
  }
  // in-process: the response returns now, the work continues on this server
  void runJob(kind, orderId).catch((e) => console.error('job failed', kind, orderId, e));
}

export async function runJob(kind: JobKind, orderId: string): Promise<void> {
  if (kind === 'housekeeping') {
    const [{ runRetention }, { reconcilePayments }] = await Promise.all([import('@/lib/retention'), import('@/lib/reconcile')]);
    const r = await reconcilePayments();
    const h = await runRetention();
    console.log('housekeeping', { ...r, ...h });
    return;
  }
  const svc = await import('@/lib/preview-service');
  if (kind === 'restore') return svc.processRestore(orderId);
  if (kind === 'colour') return svc.processColour(orderId);
  return svc.processFinal(orderId);
}
