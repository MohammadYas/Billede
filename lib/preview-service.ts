import { CONFIG } from '@/lib/config';
import { createOrder, getOrder, setStatus, updateOrder, type Order } from '@/lib/db/orders';
import { objectPath, putObject, getObject } from '@/lib/db/storage';
import { restore, colourise, RestoreError } from '@/lib/restoration/restore';
import { makePreview } from '@/lib/restoration/preview';
import { makeMockup } from '@/lib/restoration/mockup';
import { sniffImageType } from '@/lib/restoration/image-utils';
import { logEvent, type Utm } from '@/lib/analytics/events';
import { customerFormat } from '@/lib/pricing';

export type PreviewPayload = {
  orderId: string; original: string; preview: string; mockup: string; colour: string | null;
  isMonochrome: boolean; chosenColour: boolean; status: Order['status'];
  /** the photograph's own proportions (restored output) so the slider never crops it */
  width: number; height: number;
};

export type Progress = (stage: 'sending' | 'restoring' | 'preparing') => void;

/** Customer-facing image URLs are same-origin and session-gated (app/api/preview/[id]/image). */
export function imageUrl(order: Order, kind: 'original' | 'preview' | 'colour' | 'mockup'): string {
  return `/api/preview/${order.id}/image?kind=${kind}&v=${encodeURIComponent((order.updated_at ?? '').slice(0, 19))}`;
}

export async function payloadFor(order: Order): Promise<PreviewPayload | null> {
  if (!order.original_path || !order.preview_path || !order.mockup_path) return null;
  return {
    orderId: order.id,
    original: imageUrl(order, 'original'), preview: imageUrl(order, 'preview'), mockup: imageUrl(order, 'mockup'),
    colour: order.colourised_path ? imageUrl(order, 'colour') : null,
    isMonochrome: Boolean(order.is_monochrome), chosenColour: order.chosen_colour, status: order.status,
    width: Number((order.preview_meta as { output?: { width?: number } } | null)?.output?.width ?? 4),
    height: Number((order.preview_meta as { output?: { height?: number } } | null)?.output?.height ?? 3),
  };
}

/**
 * Upload → restore → store → PREVIEW_READY, or MANUAL_REVIEW on any doubt.
 * Returns the payload, or { fallback } with a reason the UI maps to the manual-review copy.
 */
export async function runPreview(file: Buffer, ctx: { sessionId: string | null; utm: Utm | null }, progress: Progress): Promise<{ payload: PreviewPayload } | { fallback: true; orderId: string | null; reason: string }> {
  if (file.length > CONFIG.maxUploadBytes) return { fallback: true, orderId: null, reason: 'too_large' };
  if (!sniffImageType(file)) return { fallback: true, orderId: null, reason: 'unsupported_image' };

  const order = await createOrder({ status: 'NEW', format: customerFormat(), utm: ctx.utm ?? null, preview_meta: { session_id: ctx.sessionId } });
  progress('sending');
  try {
    const result = await restore(file, { quality: (process.env.PREVIEW_IMAGE_QUALITY as 'low' | 'medium' | 'high') ?? 'medium', candidates: 2, colourise: false, likenessCheck: true, minLongEdge: 1600 });
    progress('restoring');
    const originalPath = objectPath(order.id, 'original');
    await putObject(originalPath, result.original);

    if (result.meta.needsManualReview) {
      const restoredPath = objectPath(order.id, 'restored');
      await putObject(restoredPath, result.restored);
      await setStatus(order.id, 'MANUAL_REVIEW', { original_path: originalPath, restored_path: restoredPath, preview_meta: { ...result.meta, session_id: ctx.sessionId }, is_monochrome: result.isMonochrome });
      await logEvent('PreviewFallback', { sessionId: ctx.sessionId, orderId: order.id, utm: ctx.utm, meta: { reasons: result.meta.reviewReasons } });
      return { fallback: true, orderId: order.id, reason: result.meta.reviewReasons.join(',') };
    }

    progress('preparing');
    const [previewBuf, mockupBuf] = await Promise.all([makePreview(result.restored), makeMockup(result.restored, { format: order.format })]);
    const restoredPath = objectPath(order.id, 'restored');
    const previewPath = objectPath(order.id, 'preview');
    const mockupPath = objectPath(order.id, 'mockup');
    await Promise.all([putObject(restoredPath, result.restored), putObject(previewPath, previewBuf), putObject(mockupPath, mockupBuf)]);
    const updated = await setStatus(order.id, 'PREVIEW_READY', {
      original_path: originalPath, restored_path: restoredPath, preview_path: previewPath, mockup_path: mockupPath,
      is_monochrome: result.isMonochrome, preview_meta: { ...result.meta, session_id: ctx.sessionId },
    });
    await logEvent('UploadCompleted', { sessionId: ctx.sessionId, orderId: order.id, utm: ctx.utm });
    await logEvent('PreviewShown', { sessionId: ctx.sessionId, orderId: order.id, utm: ctx.utm, meta: { ms: result.meta.durationMs, ssim: result.meta.ssim } });
    const payload = await payloadFor(updated);
    if (!payload) throw new Error('payload');
    return { payload };
  } catch (e) {
    const reason = e instanceof RestoreError ? e.code : 'error';
    console.error('preview failed', order.id, e);
    try {
      await setStatus(order.id, 'MANUAL_REVIEW', { preview_meta: { session_id: ctx.sessionId, error: String(e instanceof Error ? e.message : e) } });
      if (!(await getOrder(order.id))?.original_path) {
        const p = objectPath(order.id, 'original');
        await putObject(p, file).then(() => updateOrder(order.id, { original_path: p })).catch(() => {});
      }
    } catch { /* ignore */ }
    await logEvent('PreviewFallback', { sessionId: ctx.sessionId, orderId: order.id, utm: ctx.utm, meta: { reason } });
    return { fallback: true, orderId: order.id, reason };
  }
}

/** Colourisation as a second request (see DECISIONS.md). Idempotent. */
export async function ensureColour(order: Order): Promise<string | null> {
  if (!order.is_monochrome || !order.restored_path) return null;
  if (order.colourised_path) return imageUrl(order, 'colour');
  const restored = await getObject(order.restored_path);
  const { image } = await colourise(restored, (process.env.PREVIEW_IMAGE_QUALITY as 'low' | 'medium' | 'high') ?? 'medium');
  const previewColour = await makePreview(image);
  const path = objectPath(order.id, 'colourised');
  await putObject(path, previewColour);
  // keep the un-watermarked colour version too, for the final
  const fullPath = objectPath(order.id, 'colourised');
  await putObject(fullPath, image);
  const updated = await updateOrder(order.id, { colourised_path: path, preview_meta: { ...(order.preview_meta ?? {}), colourised_full_path: fullPath } });
  return imageUrl(updated, 'colour');
}

/** A preview belongs to the browser session that made it (or to admin). */
export function ownsOrder(order: Order, sessionId: string | null): boolean {
  const sid = (order.preview_meta as { session_id?: string } | null)?.session_id;
  return Boolean(sid && sessionId && sid === sessionId);
}
