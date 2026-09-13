'use client';
import { useEffect } from 'react';
import { consent, loadPixel, PRODUCT, track } from '@/lib/analytics/client';
import type { Product } from '@/lib/pricing';

/**
 * Meta Purchase from the browser, once per order (server decides via purchase_tracked_at), with
 * advanced matching from what /tak knows, and the same event_id as the server-side copy (dedup).
 */
export default function PurchaseEvent({ value, eventId, email, phone, format, product = 'framed' }: { value: number; eventId: string; email?: string | null; phone?: string | null; format?: string; product?: Product }) {
  useEffect(() => {
    if (consent() === 'yes') loadPixel({ em: email, ph: phone });
    const id = product === 'framed' ? format : product;
    track('Purchase', { ...PRODUCT, value, content_name: product === 'framed' ? PRODUCT.content_name : product, ...(id ? { content_ids: [id] } : {}) }, { serverLog: false, eventId });
  }, [value, eventId, email, phone, format, product]);
  return null;
}
