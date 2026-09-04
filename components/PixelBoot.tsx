'use client';
import { useEffect } from 'react';
import { consent, loadPixel } from '@/lib/analytics/client';

/** On every page: if the visitor has said yes, the pixel is loaded and sees this PageView too (/p, /godkend, /tak). */
export default function PixelBoot() {
  useEffect(() => { if (consent() === 'yes') loadPixel(); }, []);
  return null;
}
