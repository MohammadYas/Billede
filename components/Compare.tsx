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
 * - lens: the restoration with a round window showing the damaged original. The ring is a real grab
 *   handle (its own element, touch-action: none), so dragging it tracks the finger 1:1 in both axes
 *   and never fights the page scroll; a tap anywhere else springs the lens to that point, and a
 *   vertical swipe on the photograph still scrolls the page. Release projects the momentum. The
 *   centre is clamped so the whole circle stays inside the photograph — it can never be half cut off.
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
  const tap = useRef<{ id: number; x: number; y: number; t: number; moved: boolean } | null>(null);

  useEffect(() => { setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  // lens radius in px from the rendered width, so the clip and the ring share one geometry
  useEffect(() => {
    if (mode !== 'lens') return;
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setRadius(Math.round(Math.min(el.clientWidth * 0.28, 140))));
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

  /** Keeps the whole circle inside the photograph: the centre can come no closer to an edge than its radius. */
  const clamp = (x: number, y: number) => {
    const el = ref.current;
    const rx = el && el.clientWidth ? (radius / el.clientWidth) * 100 : 30;
    const ry = el && el.clientHeight ? (radius / el.clientHeight) * 100 : 30;
    return {
      x: rx * 2 >= 100 ? 50 : Math.min(100 - rx, Math.max(rx, x)),
      y: ry * 2 >= 100 ? 50 : Math.min(100 - ry, Math.max(ry, y)),
    };
  };
  const paint = () => {
    const el = ref.current; if (!el) return;
    el.style.setProperty('--lx', `${pos.current.x}%`);
    el.style.setProperty('--ly', `${pos.current.y}%`);
  };
  const stop = () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; target.current = null; };
  /** Two independent critically damped springs (x and y), re-targeted from the live value. */
  const springTo = (x: number, y: number, resp: number, v = vel.current) => {
    const t = clamp(x, y);
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

  /** velocity of the last 100 ms of the gesture, in percent per second */
  const flick = (hist: { t: number; x: number; y: number }[]) => {
    const now = performance.now();
    const rec = hist.filter((s) => now - s.t < 100);
    const a0 = rec[0] ?? hist[0]; const a1 = hist[hist.length - 1];
    const dt = a1 && a0 ? a1.t - a0.t : 0;
    return dt > 0 ? { x: ((a1.x - a0.x) / dt) * 1000, y: ((a1.y - a0.y) / dt) * 1000 } : { x: 0, y: 0 };
  };
  const moveDrag = (e: React.PointerEvent) => {
    const d = drag.current!; const p = pct(e.clientX, e.clientY);
    d.hist.push({ t: performance.now(), ...p }); if (d.hist.length > 6) d.hist.shift();
    const want = { x: p.x + d.ox, y: p.y + d.oy };
    if (d.catchUp) {
      if (Math.hypot(pos.current.x - want.x, pos.current.y - want.y) < 1.2) { d.catchUp = false; stop(); }
      else { springTo(want.x, want.y, 0.22); return; } // keeps re-targeting, so it can never stall mid-gesture
    }
    pos.current = clamp(want.x, want.y); vel.current = { x: 0, y: 0 }; paint();
  };
  const endDrag = () => {
    const d = drag.current; drag.current = null; if (!d) return;
    const v = flick(d.hist);
    springTo(pos.current.x + project(v.x), pos.current.y + project(v.y), 0.4, v);
  };

  // The ring is the handle: it owns the pointer for the whole drag, in both axes, on touch as well.
  const onRingDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    ref.current?.classList.add('pressed');
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = pct(e.clientX, e.clientY);
    stop(); vel.current = { x: 0, y: 0 };
    drag.current = { id: e.pointerId, ox: pos.current.x - p.x, oy: pos.current.y - p.y, catchUp: false, hist: [{ t: performance.now(), ...p }] };
  };
  const onRingMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    const d = drag.current; if (!d || e.pointerId !== d.id) return;
    moveDrag(e);
  };
  const onRingUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    ref.current?.classList.remove('pressed');
    if (drag.current && e.pointerId === drag.current.id) endDrag();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.classList.add('pressed');
    if (mode === 'lens') {
      tap.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
      // a mouse has no page to scroll under it: press anywhere and the lens comes to the cursor and follows
      if (e.pointerType === 'mouse') {
        el.setPointerCapture(e.pointerId);
        const p = pct(e.clientX, e.clientY);
        drag.current = { id: e.pointerId, ox: 0, oy: 0, catchUp: true, hist: [{ t: performance.now(), ...p }] };
        springTo(p.x, p.y, 0.22);
      }
    }
    if (holdLike) setShowBefore(true);
    if (mode === 'fade' && !reduce) setPaused(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (mode !== 'lens') return;
    const d = drag.current;
    if (d && e.pointerId === d.id) { moveDrag(e); return; }
    const t = tap.current;
    if (t && e.pointerId === t.id && Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10) t.moved = true; // a scroll, not a tap
  };
  const release = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('pressed');
    if (mode === 'lens') {
      const d = drag.current;
      if (d && e.pointerId === d.id) endDrag();
      else {
        const t = tap.current;
        if (t && e.pointerId === t.id && !t.moved && e.type === 'pointerup' && performance.now() - t.t < 600) {
          const p = pct(e.clientX, e.clientY);
          springTo(p.x, p.y, 0.32, { x: 0, y: 0 }); // tap: the lens comes to you
        }
      }
      tap.current = null;
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

  const hint = mode === 'lens' ? 'Tryk eller træk luppen' : holdLike ? 'Hold for at se før' : 'Overtoner langsomt · rør for at holde';
  return (
    <div ref={ref} className={`cmp cmp-${mode}${showBefore ? ' show-before' : ''} ${className}`.trim()} style={{ aspectRatio: aspect, ['--lx' as string]: '50%', ['--ly' as string]: '42%', ['--r' as string]: `${radius}px` }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={release} onPointerCancel={release} onPointerLeave={(e) => { if (mode !== 'lens') release(e); }}
      onKeyDown={onKey} tabIndex={0} role="img" aria-label={`${alt}. ${hint}.`}>
      <Pic s={a} className="after" />
      <Pic s={b} className="before" />
      {mode === 'lens' && <div className="lens-ring" aria-hidden onPointerDown={onRingDown} onPointerMove={onRingMove} onPointerUp={onRingUp} onPointerCancel={onRingUp} />}
      <span className="lbl before" aria-hidden>{beforeLabel}</span>
      <span className="lbl after" aria-hidden>{afterLabel}</span>
      <span className="hint" aria-hidden>{hint}</span>
    </div>
  );
}
