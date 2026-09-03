'use client';
import { useEffect } from 'react';
import { consent, loadPixel, track } from '@/lib/analytics/client';

/** Fires the Meta Purchase event once per order (server decides via purchase_tracked_at). */
export default function PurchaseEvent({ value, eventId }: { value: number; eventId: string }) {
  useEffect(() => {
    if (consent() === 'yes') loadPixel();
    track('Purchase', { value, currency: 'DKK' }, { serverLog: false, eventId });
  }, [value, eventId]);
  return null;
}
