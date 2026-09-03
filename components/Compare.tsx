'use client';
import { useEffect, useRef, useState } from 'react';
import type { Source } from './BeforeAfter';

export type CompareMode = 'lens' | 'hold' | 'fade';

type Props = {
  before: string | Source; after: string | Source; alt: string; aspect: string;
  mode: CompareMode; beforeLabel?: string; afterLabel?: string; className?: string;
};

const toSource = (s: string | Source): Source => (typeof s === 'string' ? { src: s } : s);

function Pic({ s, className }: { s: Source; className: string }) {
  return (
    <picture>
      {s.srcSetWebp && <source type="image/webp" srcSet={s.srcSetWebp} sizes={s.sizes} />}
      <img className={className} src={s.src} srcSet={s.srcSetJpg} sizes={s.srcSetJpg ? s.sizes : undefined} alt="" aria-hidden draggable={false} loading="lazy" decoding="async" />
    </picture>
  );
}

/**
 * Three further ways to compare the same two images:
 * - lens: the restoration with a round window showing the damaged original under the finger.
 * - hold: press and hold (or space) to see the original; release for the restoration. 220 ms crossfade.
 * - fade: a slow dissolve every 4 s, paused off-screen, while touched, and under prefers-reduced-motion (then it behaves like hold).
 */
export default function Compare({ before, after, alt, aspect, mode, beforeLabel = 'Før', afterLabel = 'Efter', className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const b = toSource(before), a = toSource(after);
  const [showBefore, setShowBefore] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 42 });

  const [radius, setRadius] = useState(120);
  useEffect(() => { setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  // lens radius in px from the rendered width, so the clip and the ring share one geometry
  useEffect(() => {
    if (mode !== 'lens') return;
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setRadius(Math.round(Math.min(el.clientWidth * 0.3, 150))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);

  useEffect(() => {
    if (mode !== 'fade' || reduce) return;
    const el = ref.current; if (!el) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);
    const t = setInterval(() => { if (visible && !paused && document.visibilityState === 'visible') setShowBefore((v) => !v); }, 4000);
    return () => { io.disconnect(); clearInterval(t); };
  }, [mode, paused, reduce]);

  const setLens = (clientX: number, clientY: number) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)), y: Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100)) });
  };
  const holdLike = mode === 'hold' || (mode === 'fade' && reduce);
  const onPointerDown = (e: React.PointerEvent) => {
    if (mode === 'lens') { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setLens(e.clientX, e.clientY); }
    if (holdLike) setShowBefore(true);
    if (mode === 'fade' && !reduce) setPaused(true);
  };
  const onPointerMove = (e: React.PointerEvent) => { if (mode === 'lens' && (e.buttons & 1 || e.pointerType === 'touch')) setLens(e.clientX, e.clientY); };
  const onPointerUp = () => { if (holdLike) setShowBefore(false); if (mode === 'fade' && !reduce) setPaused(false); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (mode !== 'lens') setShowBefore((v) => !v); return; }
    if (mode === 'lens' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      setPos((p) => ({ x: Math.max(0, Math.min(100, p.x + (e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0))), y: Math.max(0, Math.min(100, p.y + (e.key === 'ArrowDown' ? 5 : e.key === 'ArrowUp' ? -5 : 0))) }));
    }
  };

  const hint = mode === 'lens' ? 'Træk luppen' : holdLike ? 'Hold for at se før' : 'Overtoner langsomt · rør for at holde';
  return (
    <div ref={ref} className={`cmp cmp-${mode}${showBefore ? ' show-before' : ''} ${className}`.trim()} style={{ aspectRatio: aspect, ['--lx' as string]: `${pos.x}%`, ['--ly' as string]: `${pos.y}%`, ['--r' as string]: `${radius}px` }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerLeave={onPointerUp}
      onKeyDown={onKey} tabIndex={0} role="img" aria-label={`${alt}. ${hint}.`}>
      <Pic s={a} className="after" />
      <Pic s={b} className="before" />
      {mode === 'lens' && <div className="lens-ring" aria-hidden />}
      <span className="lbl before" aria-hidden>{beforeLabel}</span>
      <span className="lbl after" aria-hidden>{afterLabel}</span>
      <span className="hint" aria-hidden>{hint}</span>
    </div>
  );
}
