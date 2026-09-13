'use client';
import { useEffect, useRef } from 'react';
import { consent, loadPixel, track } from '@/lib/analytics/client';
import { usePathname } from 'next/navigation';

/**
 * Owns PageView for both initial load and client navigation. Pixel initialization never emits one.
 * Route values (including private order tokens) are not added to event metadata.
 */
export default function PixelBoot() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (consent() === 'yes') loadPixel();
    track('PageView', {}, { serverLog: true });
  }, [pathname]);
  return null;
}
