'use client';
import { useEffect } from 'react';
import { track } from '@/lib/analytics/client';

/** Fires ViewContent once when the hero has been ≥ 50 % visible for 3 s. */
export default function HeroViewContent({ targetId }: { targetId: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId); if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null; let fired = false;
    const io = new IntersectionObserver(([e]) => {
      if (fired) return;
      if (e.isIntersecting && !timer) timer = setTimeout(() => { fired = true; track('ViewContent', { content_name: 'hero' }); io.disconnect(); }, 3000);
      else if (!e.isIntersecting && timer) { clearTimeout(timer); timer = null; }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); if (timer) clearTimeout(timer); };
  }, [targetId]);
  return null;
}
