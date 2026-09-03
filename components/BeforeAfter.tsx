'use client';
import { useEffect, useRef, useState } from 'react';

type Props = {
  before: string; after: string; alt: string;
  beforeLabel?: string; afterLabel?: string;
  /** aspect as CSS aspect-ratio value, e.g. "1 / 1" or "4 / 3" */
  aspect?: string; aspectDesktop?: string;
  /** auto-reveal once on first view (the site's single motion) */
  reveal?: boolean;
  priority?: boolean;
};

export default function BeforeAfter({ before, after, alt, beforeLabel = 'Før', afterLabel = 'Efter', aspect = '1 / 1', aspectDesktop, reveal = false, priority = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(reveal ? 12 : 50);
  const revealed = useRef(!reveal);
  const raf = useRef<number | null>(null);

  // One authored motion: reveal from 12 % → 62 % over 1.6 s (ease-out expo), once, when visible.
  useEffect(() => {
    if (revealed.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { revealed.current = true; setX(50); return; }
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || revealed.current) return;
      revealed.current = true; io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / 1600);
        const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        setX(12 + 50 * ease);
        if (p < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  const setFromClientX = (clientX: number) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setX(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (raf.current) cancelAnimationFrame(raf.current);
    revealed.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => { if (e.buttons & 1 || e.pointerType === 'touch') setFromClientX(e.clientX); };

  return (
    <div
      ref={ref}
      className="ba"
      style={{ ['--x' as string]: `${x}%`, aspectRatio: aspect, ['--aspect-d' as string]: aspectDesktop ?? aspect }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      <img className="before" src={before} alt={alt} draggable={false} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding={priority ? 'sync' : 'async'} />
      <img className="after" src={after} alt="" aria-hidden draggable={false} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} />
      <div className="handle" aria-hidden><div className="knob" /></div>
      <span className="lbl before" aria-hidden>{beforeLabel}</span>
      <span className="lbl after" aria-hidden>{afterLabel}</span>
      <input
        type="range" min={0} max={100} value={Math.round(x)}
        aria-label={`${beforeLabel} og ${afterLabel}: træk for at sammenligne`}
        onChange={(e) => { revealed.current = true; setX(Number(e.target.value)); }}
        onKeyDown={() => { if (raf.current) cancelAnimationFrame(raf.current); revealed.current = true; }}
      />
    </div>
  );
}
