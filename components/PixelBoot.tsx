'use client';
import { useEffect, useRef } from 'react';
import { consent, loadPixel, track } from '@/lib/analytics/client';

/**
 * One page view per route, everywhere — /tak, /godkend and the legal pages included, because a funnel
 * that only counts two of its seven screens cannot tell you where people leave. `loadPixel()` fires
 * Meta's own PageView when it boots, so the tracked one is server-log only for a consented visitor
 * (it used to be counted twice at Meta). Without consent it is queued for the browser and still logged
 * on our own server, which is the only measurement a visitor who never answers the banner produces.
 */
export default function PixelBoot() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return; // StrictMode runs effects twice in development
    done.current = true;
    const c = consent();
    if (c === 'yes') { loadPixel(); track('PageView', {}, { serverLog: true, pixel: false }); }
    else track('PageView', {}, { serverLog: true });
  }, []);
  return null;
}
