'use client';
import { useEffect } from 'react';
import { consent, loadPixel, PRODUCT, track } from '@/lib/analytics/client';

/**
 * Meta Purchase from the browser, once per order (server decides via purchase_tracked_at), with
 * advanced matching from what /tak knows, and the same event_id as the server-side copy (dedup).
 */
export default function PurchaseEvent({ value, eventId, email, phone, format }: { value: number; eventId: string; email?: string | null; phone?: string | null; format?: string }) {
  useEffect(() => {
    if (consent() === 'yes') loadPixel({ em: email, ph: phone });
    track('Purchase', { ...PRODUCT, value, ...(format ? { content_ids: [format] } : {}) }, { serverLog: false, eventId });
  }, [value, eventId, email, phone, format]);
  return null;
}
