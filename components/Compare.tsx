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
 * Three further ways to compare the same two images (apple-design §1–§6 where a finger is involved):
 * - lens: the restoration with a round window showing the damaged original. Grab the ring and it
 *   keeps the grab offset and tracks 1:1; press elsewhere and the lens springs to the finger, then
 *   tracks; release hands over the velocity and projects momentum, clamped inside the image.
 * - hold: press to see the original — feedback on pointer-down, 120 ms in, 260 ms back out; space toggles.
 * - fade: a slow dissolve every 4 s, paused off-screen and while touched; hold-like under reduced motion.
 */
export default function Compare({ before, after, alt, aspect, mode, beforeLabel = 'Før', afterLabel = 'Efter', className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const b = toSource(before), a = toSource(after);
  const [showBefore, setShowBefore] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [radius, setRadius] = useState(120);

  // lens physics (percent units), painted straight onto the node
  const pos = useRef({ x: 50, y: 42 });
  const vel = useRef({ x: 0, y: 0 });
  const target = useRef<{ x: number; y: number } | null>(null);
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  const drag = useRef<{ id: number; ox: number; oy: number; catchUp: boolean; hist: { t: number; x: number; y: number }[] } | null>(null);

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

  const paint = () => {
    const el = ref.current; if (!el) return;
    el.style.setProperty('--lx', `${Math.max(0, Math.min(100, pos.current.x))}%`);
    el.style.setProperty('--ly', `${Math.max(0, Math.min(100, pos.current.y))}%`);
  };
  const stop = () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; target.current = null; };
  /** Two independent critically damped springs (x and y), re-targeted from the live value. */
  const springTo = (x: number, y: number, resp: number, v = vel.current) => {
    const t = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    if (reduce) { stop(); pos.current = t; vel.current = { x: 0, y: 0 }; paint(); return; }
    target.current = t; vel.current = v;
    if (raf.current) return;
    last.current = performance.now();
    const w = (2 * Math.PI) / resp;
    const step = (now: number) => {
      const tg = target.current; if (!tg) { raf.current = null; return; }
      const dt = Math.min(0.032, (now - last.current) / 1000); last.current = now;
      for (const k of ['x', 'y'] as const) {
        const acc = -w * w * (pos.current[k] - tg[k]) - 2 * w * vel.current[k];
        vel.current[k] += acc * dt; pos.current[k] += vel.current[k] * dt;
      }
      paint();
      if (Math.hypot(pos.current.x - tg.x, pos.current.y - tg.y) < 0.05 && Math.hypot(vel.current.x, vel.current.y) < 0.5) { pos.current = { ...tg }; paint(); raf.current = null; target.current = null; return; }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  const pct = (cx: number, cy: number) => { const r = ref.current!.getBoundingClientRect(); return { x: ((cx - r.left) / r.width) * 100, y: ((cy - r.top) / r.height) * 100 }; };
  const project = (v: number, d = 0.99) => ((v / 1000) * d) / (1 - d);

  const holdLike = mode === 'hold' || (mode === 'fade' && reduce);
  const onPointerDown = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.classList.add('pressed');
    if (mode === 'lens') {
      el.setPointerCapture(e.pointerId);
      const p = pct(e.clientX, e.clientY);
      const r = el.getBoundingClientRect();
      const dx = (pos.current.x - p.x) * (r.width / 100), dy = (pos.current.y - p.y) * (r.height / 100);
      const onRing = Math.hypot(dx, dy) <= radius + 10;
      drag.current = { id: e.pointerId, ox: onRing ? pos.current.x - p.x : 0, oy: onRing ? pos.current.y - p.y : 0, catchUp: !onRing, hist: [{ t: performance.now(), ...p }] };
      if (onRing) { stop(); vel.current = { x: 0, y: 0 }; } else springTo(p.x, p.y, 0.22);
    }
    if (holdLike) setShowBefore(true);
    if (mode === 'fade' && !reduce) setPaused(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (mode !== 'lens') return;
    const d = drag.current; if (!d || e.pointerId !== d.id) return;
    const p = pct(e.clientX, e.clientY); const now = performance.now();
    d.hist.push({ t: now, ...p }); if (d.hist.length > 6) d.hist.shift();
    const want = { x: p.x + d.ox, y: p.y + d.oy };
    if (d.catchUp) { target.current = { x: Math.max(0, Math.min(100, want.x)), y: Math.max(0, Math.min(100, want.y)) }; if (Math.hypot(pos.current.x - want.x, pos.current.y - want.y) < 0.8) { d.catchUp = false; stop(); } else return; }
    pos.current = { x: Math.max(0, Math.min(100, want.x)), y: Math.max(0, Math.min(100, want.y)) }; vel.current = { x: 0, y: 0 }; paint();
  };
  const release = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('pressed');
    if (mode === 'lens') {
      const d = drag.current; drag.current = null;
      if (d) {
        const h = d.hist; const now = performance.now(); const rec = h.filter((s) => now - s.t < 100); const a0 = rec[0] ?? h[0]; const a1 = h[h.length - 1];
        const dt = a1 && a0 ? a1.t - a0.t : 0;
        const v = dt > 0 ? { x: ((a1.x - a0.x) / dt) * 1000, y: ((a1.y - a0.y) / dt) * 1000 } : { x: 0, y: 0 };
        if (d.catchUp && target.current) springTo(target.current.x, target.current.y, 0.3, v);
        else springTo(pos.current.x + project(v.x), pos.current.y + project(v.y), 0.4, v);
      }
    }
    if (holdLike) setShowBefore(false);
    if (mode === 'fade' && !reduce) setPaused(false);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (mode !== 'lens') setShowBefore((v) => !v); return; }
    if (mode === 'lens' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      springTo(pos.current.x + (e.key === 'ArrowRight' ? 8 : e.key === 'ArrowLeft' ? -8 : 0), pos.current.y + (e.key === 'ArrowDown' ? 8 : e.key === 'ArrowUp' ? -8 : 0), 0.25, { x: 0, y: 0 });
    }
  };

  const hint = mode === 'lens' ? 'Træk luppen' : holdLike ? 'Hold for at se før' : 'Overtoner langsomt · rør for at holde';
  return (
    <div ref={ref} className={`cmp cmp-${mode}${showBefore ? ' show-before' : ''} ${className}`.trim()} style={{ aspectRatio: aspect, ['--lx' as string]: '50%', ['--ly' as string]: '42%', ['--r' as string]: `${radius}px` }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={release} onPointerCancel={release} onPointerLeave={(e) => { if (mode !== 'lens') release(e); }}
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
