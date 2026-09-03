'use client';
import { useEffect, useRef, useState } from 'react';

export type Source = { src: string; srcSetJpg?: string; srcSetWebp?: string; sizes?: string };

type Props = {
  before: string | Source; after: string | Source; alt: string;
  beforeLabel?: string; afterLabel?: string;
  /** aspect as CSS aspect-ratio value, e.g. "1 / 1" or "1030 / 1400" */
  aspect?: string;
  /** letterbox instead of crop (customer previews) */
  contain?: boolean;
  /** auto-reveal once on first view (the site's single motion) */
  reveal?: boolean;
  priority?: boolean;
  className?: string;
};

const toSource = (s: string | Source): Source => (typeof s === 'string' ? { src: s } : s);

function Picture({ s, className, alt, priority, ariaHidden }: { s: Source; className: string; alt: string; priority: boolean; ariaHidden?: boolean }) {
  return (
    <picture>
      {s.srcSetWebp && <source type="image/webp" srcSet={s.srcSetWebp} sizes={s.sizes} />}
      <img
        className={className}
        src={s.src}
        srcSet={s.srcSetJpg}
        sizes={s.srcSetJpg ? s.sizes : undefined}
        alt={alt}
        aria-hidden={ariaHidden}
        draggable={false}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'sync' : 'async'}
      />
    </picture>
  );
}

/**
 * Before/after slider. Direct manipulation: 1:1 with the pointer via setPointerCapture,
 * the reveal is interruptible (any pointer-down cancels it), keyboard via the range input.
 * The handle moves with transform, the after image with clip-path — no layout work per frame.
 */
export default function BeforeAfter({ before, after, alt, beforeLabel = 'Før', afterLabel = 'Efter', aspect = '1 / 1', contain = false, reveal = false, priority = false, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(reveal ? 12 : 50);
  const revealed = useRef(!reveal);
  const raf = useRef<number | null>(null);
  const b = toSource(before), a = toSource(after);

  useEffect(() => {
    if (revealed.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { revealed.current = true; setX(50); return; }
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || revealed.current) return;
      revealed.current = true; io.disconnect();
      // Drive the reveal on the node itself (no React re-render per frame); commit state once at the end.
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / 1600);
        const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        const v = 12 + 50 * ease;
        el.style.setProperty('--x', `${v}%`);
        if (p < 1) raf.current = requestAnimationFrame(step); else { raf.current = null; setX(62); }
      };
      raf.current = requestAnimationFrame(step);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  const setFromClientX = (clientX: number, commit = false) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const v = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    el.style.setProperty('--x', `${v}%`);
    if (commit) setX(v);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (raf.current) { cancelAnimationFrame(raf.current); raf.current = null; }
    revealed.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => { if (e.buttons & 1 || e.pointerType === 'touch') setFromClientX(e.clientX); };
  const onPointerUp = (e: React.PointerEvent) => setFromClientX(e.clientX, true);

  return (
    <div ref={ref} className={`ba${contain ? ' contain' : ''} ${className}`.trim()} style={{ ['--x' as string]: `${x}%`, aspectRatio: aspect }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <Picture s={b} className="before" alt={alt} priority={priority} />
      <Picture s={a} className="after" alt="" priority={priority} ariaHidden />
      <div className="handle" aria-hidden><div className="knob" /></div>
      <span className="lbl before" aria-hidden>{beforeLabel}</span>
      <span className="lbl after" aria-hidden>{afterLabel}</span>
      <input type="range" min={0} max={100} value={Math.round(x)} aria-label={`${beforeLabel} og ${afterLabel}: træk for at sammenligne`}
        onChange={(e) => { revealed.current = true; setX(Number(e.target.value)); }}
        onKeyDown={() => { if (raf.current) cancelAnimationFrame(raf.current); revealed.current = true; }} />
      <span className="focus-ring" aria-hidden />
    </div>
  );
}
