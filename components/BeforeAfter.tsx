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
  /** where the reveal settles (percent of width shown as "before") */
  rest?: number;
};

const REST = 35;
const START = 88;
const KNOB = 22; // px, half the knob

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

/** Apple's momentum projection (Designing Fluid Interfaces): where a flick would come to rest. Units: %/s → %. */
const project = (v: number, d = 0.99) => ((v / 1000) * d) / (1 - d);
/** Progressive resistance past an edge (apple-design §9). */
const rubber = (over: number, dim = 100, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));

/**
 * Before/after wipe, built like a physical object (apple-design §1–§10):
 * - the seam is driven by one critically damped spring; the reveal, a tap, a keyboard step and a
 *   release all just re-target it, so any motion can be grabbed mid-flight and carries its velocity;
 * - a drag on the knob keeps the grab offset and tracks 1:1; a press elsewhere springs the seam to
 *   the finger, then tracks 1:1 once it has caught up;
 * - release hands the finger's velocity to the spring and projects momentum to the landing point;
 * - past an edge the knob rubber-bands a few px and springs back;
 * - feedback lands on pointer-down (knob grows); the labels are buttons that show a whole side, and both stay so there is always a way back;
 * - reduced motion: no reveal, no springs, direct set.
 * All per-frame work touches CSS custom properties on the node; React state only mirrors the
 * settled value for the range input.
 */
export default function BeforeAfter({ before, after, alt, beforeLabel = 'Før', afterLabel = 'Efter', aspect = '1 / 1', contain = false, reveal = false, priority = false, className = '', rest = REST }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(reveal ? START : 50);
  const b = toSource(before), a = toSource(after);

  // physics state lives in refs
  const pos = useRef(reveal ? START : 50);
  const vel = useRef(0);
  const target = useRef<number | null>(null);
  const response = useRef(0.35);
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  const reduce = useRef(false);
  const revealed = useRef(!reveal);
  const drag = useRef<{ id: number; offset: number; catchUp: boolean; hist: { t: number; x: number }[] } | null>(null);

  const paint = (v: number, knobOver = 0) => {
    const el = ref.current; if (!el) return;
    const c = Math.max(0, Math.min(100, v));
    el.style.setProperty('--x', `${c}%`);
    el.style.setProperty('--kx', `${knobOver}px`);
  };

  const stop = () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; target.current = null; };

  /** Re-target the spring from the live value (never from the logical one). */
  const springTo = (to: number, resp = 0.35, v0 = vel.current) => {
    const t = Math.max(0, Math.min(100, to));
    if (reduce.current) { stop(); pos.current = t; vel.current = 0; paint(t); setX(t); return; }
    target.current = t; response.current = resp; vel.current = v0;
    if (raf.current) return; // the running loop picks up the new target
    last.current = performance.now();
    const step = (now: number) => {
      const tgt = target.current; if (tgt === null) { raf.current = null; return; }
      const dt = Math.min(0.032, (now - last.current) / 1000); last.current = now;
      const w = (2 * Math.PI) / response.current;
      const acc = -w * w * (pos.current - tgt) - 2 * w * vel.current; // damping ratio 1: no overshoot
      vel.current += acc * dt; pos.current += vel.current * dt;
      if (Math.abs(pos.current - tgt) < 0.05 && Math.abs(vel.current) < 0.5) {
        pos.current = tgt; vel.current = 0; paint(tgt); raf.current = null; target.current = null; setX(tgt); return;
      }
      paint(pos.current);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (revealed.current) return;
    if (reduce.current) { revealed.current = true; pos.current = rest; paint(rest); setX(rest); return; }
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || revealed.current) return;
      revealed.current = true; io.disconnect();
      springTo(rest, 0.9, 0); // slow, graceful, interruptible
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 100;
  };
  const pxPerPct = () => (ref.current?.getBoundingClientRect().width ?? 100) / 100;

  const onPointerDown = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    if ((e.target as HTMLElement).closest('.lbl')) return; // label buttons handle themselves
    el.setPointerCapture(e.pointerId);
    revealed.current = true;
    el.classList.add('pressed'); // feedback on pointer-down (§1)
    const p = pct(e.clientX);
    const seamPx = (pos.current - p) * pxPerPct();
    const onKnob = Math.abs(seamPx) <= KNOB + 8; // hysteresis around the knob
    drag.current = { id: e.pointerId, offset: onKnob ? pos.current - p : 0, catchUp: !onKnob, hist: [{ t: performance.now(), x: p }] };
    if (onKnob) { stop(); vel.current = 0; paint(pos.current); }
    else springTo(p, 0.22); // spring toward the finger, then track 1:1 once caught up
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || e.pointerId !== d.id) return;
    const p = pct(e.clientX);
    const now = performance.now();
    d.hist.push({ t: now, x: p }); if (d.hist.length > 6) d.hist.shift();
    const want = p + d.offset;
    if (d.catchUp) {
      target.current = want;
      if (Math.abs(pos.current - want) < 0.6) { d.catchUp = false; stop(); }
      else return;
    }
    // 1:1 with the finger; past an edge the knob rubber-bands while the seam stays on the image
    const over = want < 0 ? want : want > 100 ? want - 100 : 0;
    pos.current = Math.max(0, Math.min(100, want)); vel.current = 0;
    paint(pos.current, over ? rubber(over) * pxPerPct() * 0.6 : 0);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    (e.currentTarget as HTMLElement).classList.remove('pressed');
    const h = d.hist; const now = performance.now();
    const recent = h.filter((s) => now - s.t < 100);
    const a0 = recent[0] ?? h[0]; const a1 = h[h.length - 1];
    const v = a1 && a0 && a1.t > a0.t ? ((a1.x - a0.x) / (a1.t - a0.t)) * 1000 : 0; // %/s
    if (d.catchUp) { // released before the seam arrived: let it finish, with the finger's velocity
      springTo(target.current ?? pos.current, 0.3, v); return;
    }
    const landing = pos.current + project(v); // momentum projection (§6), then velocity handoff (§5)
    springTo(landing, 0.4, v);
  };
  const onPointerCancel = (e: React.PointerEvent) => { drag.current = null; (e.currentTarget as HTMLElement).classList.remove('pressed'); springTo(pos.current, 0.3, 0); };

  const showSide = (side: 'before' | 'after') => { revealed.current = true; springTo(side === 'before' ? 100 : 0, 0.5, vel.current); };

  return (
    <div ref={ref} className={`ba${contain ? ' contain' : ''} ${className}`.trim()} style={{ ['--x' as string]: `${x}%`, aspectRatio: aspect }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}>
      <Picture s={b} className="before" alt={alt} priority={priority} />
      <Picture s={a} className="after" alt="" priority={priority} ariaHidden />
      <div className="handle" aria-hidden><div className="knob" /></div>
      <button type="button" className="lbl before" onClick={() => showSide('before')} aria-label={`Vis hele billedet ${beforeLabel.toLowerCase()}`}><span>{beforeLabel}</span></button>
      <button type="button" className="lbl after" onClick={() => showSide('after')} aria-label={`Vis hele billedet ${afterLabel.toLowerCase()}`}><span>{afterLabel}</span></button>
      <input type="range" min={0} max={100} step={5} value={Math.round(x / 5) * 5} aria-label={`${beforeLabel} og ${afterLabel}: træk for at sammenligne`}
        onChange={(e) => { revealed.current = true; springTo(Number(e.target.value), 0.25, 0); setX(Number(e.target.value)); }}
        onPointerDown={(e) => e.stopPropagation()} />
      <span className="focus-ring" aria-hidden />
    </div>
  );
}
