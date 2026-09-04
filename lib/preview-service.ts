import { randomBytes } from 'node:crypto';
import { CONFIG } from '@/lib/config';
import { createOrder, getOrder, setStatus, updateOrder, type Order } from '@/lib/db/orders';
import { objectPath, putObject, getObject, removeOrderObjects, createSignedUpload } from '@/lib/db/storage';
import { RestoreError } from '@/lib/restoration/errors';
import { notifyOwner } from '@/lib/email/owner';

/** sharp + the OpenAI SDK are loaded only inside jobs, never on the request path (cold starts on the first tap). */
const heavy = async () => {
  const [r, iu, pv, mk] = await Promise.all([import('@/lib/restoration/restore'), import('@/lib/restoration/image-utils'), import('@/lib/restoration/preview'), import('@/lib/restoration/mockup')]);
  return { restore: r.restore, colourise: r.colourise, ensureLongEdge: iu.ensureLongEdge, makePreview: pv.makePreview, makeMockup: mk.makeMockup };
};
import { logEvent, type Utm } from '@/lib/analytics/events';
import { customerFormat } from '@/lib/pricing';
import { getJob, setJob, type JobState } from '@/lib/jobs';

export type PreviewPayload = {
  orderId: string; original: string; preview: string; mockup: string; colour: string | null;
  isMonochrome: boolean; chosenColour: boolean; status: Order['status'];
  /** share token, so the URL the customer sees (and copies to a sister) opens on any phone */
  token: string | null;
  /** the photograph's own proportions (restored output) so the slider never crops it */
  width: number; height: number;
};

/** What the sheet polls while the job runs. */
export type PreviewStatus = {
  orderId: string; status: Order['status']; token: string | null;
  job: JobState | null;
  payload: PreviewPayload | null;
};

type Meta = { session_id?: string | null; share_token?: string; upload_path?: string; cancelled?: boolean; output?: { width?: number; height?: number }; job?: JobState; colourised_full_path?: string; [k: string]: unknown };
const metaOf = (o: Order): Meta => (o.preview_meta ?? {}) as Meta;

/**
 * Customer-facing image URLs are same-origin and gated by session cookie or share token
 * (app/api/preview/[id]/image). The token rides along so the page works wherever its URL does.
 */
export function imageUrl(order: Order, kind: 'original' | 'preview' | 'colour' | 'mockup'): string {
  const token = metaOf(order).share_token;
  return `/api/preview/${order.id}/image?kind=${kind}&v=${encodeURIComponent((order.updated_at ?? '').slice(0, 19))}${token ? `&t=${encodeURIComponent(token)}` : ''}`;
}

export async function payloadFor(order: Order): Promise<PreviewPayload | null> {
  if (!order.original_path || !order.preview_path || !order.mockup_path) return null;
  const meta = metaOf(order);
  return {
    orderId: order.id,
    original: imageUrl(order, 'original'), preview: imageUrl(order, 'preview'), mockup: imageUrl(order, 'mockup'),
    colour: order.colourised_path ? imageUrl(order, 'colour') : null,
    isMonochrome: Boolean(order.is_monochrome), chosenColour: order.chosen_colour, status: order.status,
    token: meta.share_token ?? null,
    width: Number(meta.output?.width ?? 4),
    height: Number(meta.output?.height ?? 3),
  };
}

export async function statusFor(order: Order): Promise<PreviewStatus> {
  return { orderId: order.id, status: order.status, token: metaOf(order).share_token ?? null, job: getJob(order), payload: order.status === 'PREVIEW_READY' || order.status === 'PAID' ? await payloadFor(order) : await payloadFor(order) };
}

/**
 * Step 1 of an upload: the order exists before the file does, and the browser uploads straight to
 * the private bucket with a one-time signed URL (no function body limit, no double transfer).
 */
export async function beginUpload(ctx: { sessionId: string | null; utm: Utm | null; size: number; type: string }): Promise<{ orderId: string; token: string; uploadUrl: string; path: string }> {
  const token = randomBytes(18).toString('base64url');
  const order = await createOrder({ status: 'NEW', format: customerFormat(), utm: ctx.utm ?? null, preview_meta: { session_id: ctx.sessionId, share_token: token, upload_type: ctx.type, upload_size: ctx.size } });
  const path = objectPath(order.id, 'upload');
  const { signedUrl } = await createSignedUpload(path);
  await updateOrder(order.id, { preview_meta: { ...metaOf(order), upload_path: path } });
  return { orderId: order.id, token, uploadUrl: signedUrl, path };
}

/**
 * Step 2, run by the job runner (Netlify background function or in-process): upload → restore →
 * store → PREVIEW_READY, MANUAL_REVIEW on doubt, or a failed job with a reason the sheet maps to
 * "prøv igen" (timeout, provider) — the order stays NEW so the same upload can be retried.
 */
export async function processRestore(orderId: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error('order missing');
  const meta = metaOf(order);
  const sessionId = meta.session_id ?? null;
  const uploadPath = meta.upload_path ?? order.original_path;
  if (!uploadPath) { await setJob(orderId, { kind: 'restore', state: 'failed', reason: 'no_file' }); return; }
  if (order.status !== 'NEW') { await setJob(orderId, { kind: 'restore', state: 'done' }); return; }
  await setJob(orderId, { kind: 'restore', state: 'running', stage: 'restoring', startedAt: new Date().toISOString() });
  try {
    const { restore, ensureLongEdge, makePreview, makeMockup } = await heavy();
    const file = await getObject(uploadPath);
    if (file.length > CONFIG.maxUploadBytes) throw new RestoreError('unsupported_image', 'too large');
    const result = await restore(file, { quality: (process.env.PREVIEW_IMAGE_QUALITY as 'low' | 'medium' | 'high') ?? 'medium', candidates: 2, colourise: false, likenessCheck: true, minLongEdge: 1600 });
    await setJob(orderId, { kind: 'restore', state: 'running', stage: 'preparing', startedAt: getJob(order)?.startedAt });
    if (metaOf((await getOrder(orderId))!).cancelled) { await abandon(orderId); return; }

    // the "before" the customer sees: normalised, ≤ 1600 px, well under any function response limit
    const display = await ensureLongEdge(result.original, 1600, 88);
    const originalPath = objectPath(order.id, 'original');
    await putObject(originalPath, display);

    if (result.meta.needsManualReview) {
      const restoredPath = objectPath(order.id, 'restored');
      await putObject(restoredPath, result.restored);
      await setStatus(order.id, 'MANUAL_REVIEW', { original_path: originalPath, restored_path: restoredPath, is_monochrome: result.isMonochrome, preview_meta: { ...metaOf((await getOrder(orderId))!), ...result.meta } });
      await setJob(orderId, { kind: 'restore', state: 'done', reason: result.meta.reviewReasons.join(',') });
      await logEvent('PreviewFallback', { sessionId, orderId, meta: { reasons: result.meta.reviewReasons } });
      await notifyOwner(`Manuel vurdering · ordre ${order.id.slice(0, 8)}`, [`Årsag: ${result.meta.reviewReasons.join(', ')}`, 'Kunden får en mail-formular; svar inden 24 timer.'], order.id);
      return;
    }

    const [previewBuf, mockupBuf] = await Promise.all([makePreview(result.restored), makeMockup(result.restored, { format: order.format })]);
    const restoredPath = objectPath(order.id, 'restored');
    const previewPath = objectPath(order.id, 'preview');
    const mockupPath = objectPath(order.id, 'mockup');
    await Promise.all([putObject(restoredPath, result.restored), putObject(previewPath, previewBuf), putObject(mockupPath, mockupBuf)]);
    await setStatus(order.id, 'PREVIEW_READY', {
      original_path: originalPath, restored_path: restoredPath, preview_path: previewPath, mockup_path: mockupPath,
      is_monochrome: result.isMonochrome, preview_meta: { ...metaOf((await getOrder(orderId))!), ...result.meta },
    });
    await setJob(orderId, { kind: 'restore', state: 'done', finishedAt: new Date().toISOString() });
    await logEvent('UploadCompleted', { sessionId, orderId });
    await logEvent('PreviewShown', { sessionId, orderId, meta: { ms: result.meta.durationMs, ssim: result.meta.ssim } });
  } catch (e) {
    const reason = e instanceof RestoreError ? e.code : 'error';
    console.error('preview failed', orderId, e);
    if (reason === 'timeout' || reason === 'provider_error') {
      // a slow minute at the provider: the file is still there, the customer can retry without re-uploading
      await setJob(orderId, { kind: 'restore', state: 'failed', reason, error: String(e instanceof Error ? e.message : e) });
    } else {
      await setStatus(order.id, 'MANUAL_REVIEW', { preview_meta: { ...metaOf((await getOrder(orderId)) ?? order), error: String(e instanceof Error ? e.message : e) } });
      await setJob(orderId, { kind: 'restore', state: 'failed', reason });
    }
    await logEvent('PreviewFallback', { sessionId, orderId, meta: { reason } });
  }
}

/** Colourisation as a second job (see DECISIONS.md). Idempotent. */
export async function processColour(orderId: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) return;
  if (order.colourised_path) { await setJob(orderId, { kind: 'colour', state: 'done' }); return; }
  if (!order.is_monochrome || !order.restored_path) { await setJob(orderId, { kind: 'colour', state: 'failed', reason: 'not_monochrome' }); return; }
  await setJob(orderId, { kind: 'colour', state: 'running', startedAt: new Date().toISOString() });
  try {
    const { colourise, makePreview } = await heavy();
    const restored = await getObject(order.restored_path);
    const { image } = await colourise(restored, (process.env.PREVIEW_IMAGE_QUALITY as 'low' | 'medium' | 'high') ?? 'medium');
    const previewColour = await makePreview(image);
    const path = objectPath(order.id, 'colourised');
    const fullPath = objectPath(order.id, 'colourised');
    await Promise.all([putObject(path, previewColour), putObject(fullPath, image)]);
    const fresh = (await getOrder(orderId)) ?? order;
    await updateOrder(order.id, { colourised_path: path, preview_meta: { ...metaOf(fresh), colourised_full_path: fullPath } });
    await setJob(orderId, { kind: 'colour', state: 'done', finishedAt: new Date().toISOString() });
  } catch (e) {
    console.error('colour failed', orderId, e);
    await setJob(orderId, { kind: 'colour', state: 'failed', reason: e instanceof RestoreError ? e.code : 'error' });
  }
}

/** Print final at quality "high" from the raw upload (admin). */
export async function processFinal(orderId: string): Promise<void> {
  const order = await getOrder(orderId);
  const meta = order ? metaOf(order) : {};
  const source = meta.upload_path ?? order?.original_path;
  if (!order || !source) { if (order) await setJob(orderId, { kind: 'final', state: 'failed', reason: 'no_original' }); return; }
  await setJob(orderId, { kind: 'final', state: 'running', startedAt: new Date().toISOString() });
  try {
    const { restore, colourise } = await heavy();
    const original = await getObject(source);
    const result = await restore(original, { quality: 'high', candidates: 2, likenessCheck: true, minLongEdge: 2400, timeoutMs: 600_000, size: process.env.FINAL_IMAGE_SIZE ?? 'auto' });
    let final = result.restored;
    if (order.chosen_colour && result.isMonochrome) final = (await colourise(result.restored, 'high')).image;
    const path = objectPath(order.id, 'final');
    await putObject(path, final);
    const fresh = (await getOrder(orderId)) ?? order;
    await updateOrder(order.id, { final_path: path, final_generated_at: new Date().toISOString(), preview_meta: { ...metaOf(fresh), final: result.meta } } as never);
    await setJob(orderId, { kind: 'final', state: 'done', finishedAt: new Date().toISOString() });
  } catch (e) {
    console.error('final failed', orderId, e);
    await setJob(orderId, { kind: 'final', state: 'failed', reason: e instanceof RestoreError ? e.code : 'error', error: String(e instanceof Error ? e.message : e) });
    await notifyOwner(`Final fejlede · ordre ${orderId.slice(0, 8)}`, [String(e instanceof Error ? e.message : e), 'Prøv igen fra admin, eller upload en manuel final.'], orderId);
  }
}

/** "Afbryd (billedet slettes)": drop every object and mark the order abandoned. */
export async function abandon(orderId: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) return;
  const meta = metaOf(order);
  await removeOrderObjects(orderId).catch((e) => console.error('abandon: remove failed', orderId, e));
  await setStatus(orderId, 'ABANDONED', { original_path: null, restored_path: null, preview_path: null, mockup_path: null, colourised_path: null, preview_meta: { session_id: meta.session_id, share_token: meta.share_token, cancelled: true } });
}

/** A preview belongs to the browser session that made it, or to whoever holds its share token. */
export function ownsOrder(order: Order, sessionId: string | null, shareToken?: string | null): boolean {
  const meta = metaOf(order);
  if (shareToken && meta.share_token && shareToken.length >= 16 && shareToken === meta.share_token) return true;
  return Boolean(meta.session_id && sessionId && meta.session_id === sessionId);
}
