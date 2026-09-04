'use client';
import { forwardRef, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics/client';
import type { Copy } from '@/lib/copy';

type Stage = 'uploading' | 'sending' | 'restoring' | 'preparing';
type State =
  | { kind: 'closed' }
  | { kind: 'pick'; file?: File; thumb?: string; error?: string; over?: boolean }
  | { kind: 'processing'; stage: Stage; percent: number; file: File; thumb: string }
  | { kind: 'error'; file: File; thumb: string; message: string; title: string; orderId?: string | null }
  | { kind: 'fallback'; orderId: string | null; email: string; sending: boolean; sent: boolean; error?: string }
  | { kind: 'nophoto'; email: string; sending: boolean; sent: boolean; error?: string };

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
const MAX = 25 * 1024 * 1024;

/**
 * Upload sheet → processing → hands off to /p/<orderId> (the preview is a page, not a sheet).
 * Falls back to the manual-review state on server doubt, and to a retry state on network loss.
 */
export default function UploadFlow({ c, resumeOrderId, cancelled }: { c: Copy; resumeOrderId?: string | null; cancelled?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: 'closed' });
  const sheetRef = useRef<HTMLDivElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [coarse, setCoarse] = useState(true);
  const [slow, setSlow] = useState(false);
  const [phase, setPhase] = useState(0); // 0–2: the wait sentence rotates at 15 s and 30 s

  const open = useCallback(() => setState({ kind: 'pick' }), []);
  const close = useCallback(() => { xhrRef.current?.abort(); setState({ kind: 'closed' }); }, []);

  useEffect(() => { setCoarse(window.matchMedia('(pointer: coarse)').matches); }, []);
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === 'nophoto') setState({ kind: 'nophoto', email: '', sending: false, sent: false }); else open(); };
    window.addEventListener('gf:open', h); return () => window.removeEventListener('gf:open', h);
  }, [open]);
  useEffect(() => { if (resumeOrderId) router.replace(`/p/${resumeOrderId}${cancelled ? '?cancelled=1' : ''}`); }, [resumeOrderId, cancelled, router]);

  useEffect(() => {
    const openNow = state.kind !== 'closed';
    if (openNow) { document.body.setAttribute('data-flow-open', '1'); document.body.style.overflow = 'hidden'; }
    else { document.body.removeAttribute('data-flow-open'); document.body.style.overflow = ''; }
    return () => { document.body.removeAttribute('data-flow-open'); document.body.style.overflow = ''; };
  }, [state.kind]);

  // after 45 s the wait copy admits it is taking longer today (the bar keeps creeping)
  useEffect(() => {
    if (state.kind !== 'processing') { setSlow(false); setPhase(0); return; }
    const t = setTimeout(() => setSlow(true), 35_000);
    const p1 = setTimeout(() => setPhase(1), 15_000);
    const p2 = setTimeout(() => setPhase(2), 30_000);
    return () => { clearTimeout(t); clearTimeout(p1); clearTimeout(p2); };
  }, [state.kind]);

  useEffect(() => {
    if (state.kind === 'closed') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    sheetRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [state.kind, close]);

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX) { setState({ kind: 'pick', error: c.upload.tooBig }); return; }
    const okType = /^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) || /\.(heic|heif)$/i.test(file.name) || file.type === '';
    if (!okType) { setState({ kind: 'pick', error: c.upload.wrongType }); return; }
    setState({ kind: 'pick', file, thumb: URL.createObjectURL(file) });
  };

  const start = (file: File, thumb: string) => {
    setState({ kind: 'processing', stage: 'uploading', percent: 0, file, thumb });
    track('UploadStarted', { bytes: file.size, type: file.type });
    const fd = new FormData(); fd.append('file', file, file.name || 'photo.jpg');
    const xhr = new XMLHttpRequest(); xhrRef.current = xhr;
    xhr.open('POST', '/api/preview');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setState((s) => (s.kind === 'processing' ? { ...s, stage: 'uploading', percent: Math.round((e.loaded / e.total) * 100) } : s)); };
    let seen = 0; let finished = false;
    const consume = () => {
      const text = xhr.responseText; const chunk = text.slice(seen); const lastNl = chunk.lastIndexOf('\n');
      if (lastNl < 0) return; seen += lastNl + 1;
      for (const line of chunk.slice(0, lastNl).split('\n')) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line) as { stage?: Stage; done?: boolean; fallback?: boolean; orderId?: string | null; reason?: string; preview?: string; isMonochrome?: boolean; token?: string | null };
          if (msg.stage) setState((s) => (s.kind === 'processing' ? { ...s, stage: msg.stage!, percent: 100 } : s));
          if (msg.done) {
            finished = true;
            if (msg.fallback || !msg.orderId || !msg.preview) {
              track('PreviewFallback', { reason: msg.reason ?? 'unknown' });
              // a slow minute at the provider is not "your photo needs hands": keep the file, offer retry
              if (msg.reason === 'timeout' || msg.reason === 'provider_error') setState({ kind: 'error', file, thumb, message: c.processing.timeout, title: c.processing.timeoutTitle, orderId: msg.orderId ?? null });
              else setState({ kind: 'fallback', orderId: msg.orderId ?? null, email: '', sending: false, sent: false });
            } else {
              track('UploadCompleted', {});
              track('PreviewShown', { monochrome: msg.isMonochrome });
              router.push(`/p/${msg.orderId}${msg.token ? `?t=${encodeURIComponent(msg.token)}` : ''}`);
            }
          }
        } catch { /* partial line */ }
      }
    };
    xhr.onprogress = consume;
    xhr.onload = () => { consume(); if (!finished) setState({ kind: 'error', file, thumb, message: c.processing.networkError, title: c.processing.networkTitle }); };
    xhr.onerror = () => setState({ kind: 'error', file, thumb, message: c.processing.networkError, title: c.processing.networkTitle });
    xhr.onabort = () => { /* user cancelled */ };
    xhr.send(fd);
  };

  const sendLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.kind !== 'fallback' && state.kind !== 'nophoto') return;
    const email = state.email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setState({ ...state, error: 'Skriv en e-mail, vi kan svare på.' }); return; }
    setState({ ...state, sending: true, error: undefined });
    try {
      const r = await fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: state.kind === 'fallback' ? state.orderId : null, email, kind: state.kind === 'nophoto' ? 'nophoto' : undefined }) });
      if (!r.ok) throw new Error('lead');
      setState({ ...state, sending: false, sent: true });
    } catch { setState({ ...state, sending: false, error: 'Det lykkedes ikke at sende. Prøv igen.' }); }
  };

  if (state.kind === 'closed') return null;
  const processing = state.kind === 'processing';
  // upload 0–30 %, then a 28 s creep to 85 % while the model works (the request is in flight = 'sending'), 92 % once stored, 100 % when the preview is ready
  const pct = processing ? (state.stage === 'uploading' ? state.percent * 0.3 : state.stage === 'sending' ? 92 : state.stage === 'restoring' ? 96 : 100) : 0;
  const creep = processing && state.stage === 'sending' ? '60s' : '300ms'; // never stalls before the 90 s server limit
  const sentence = processing ? (state.stage === 'sending' && phase > 0 ? c.processing.more[phase - 1] : c.processing.sentences[state.stage]) : '';

  return (
    <>
      <div className="scrim" onClick={close} aria-hidden />
      <Sheet ref={sheetRef} onDismiss={close} label={state.kind === 'pick' ? 'Vis os billedet' : state.kind === 'processing' ? 'Vi arbejder på dit billede' : state.kind === 'nophoto' ? c.upload.noPhotoH : 'Det her kræver et par hænder'}>
        {state.kind === 'pick' && (
          <div style={{ display: 'grid', gap: 'var(--s4)' }}>
            <h2>Vis os billedet.</h2>
            {state.thumb ? (
              <div style={{ display: 'grid', gap: 'var(--s3)' }}>
                <img src={state.thumb} alt="Dit valgte billede" style={{ maxHeight: '38dvh', width: 'auto', maxWidth: '100%', objectFit: 'contain', justifySelf: 'start' }} />
                <div style={{ display: 'flex', gap: 'var(--s5)' }}>
                  <label className="link-btn" style={{ display: 'inline-flex', alignItems: 'center' }}>{c.upload.reupload}<input type="file" accept={ACCEPT} hidden onChange={(e) => pickFile(e.target.files?.[0])} /></label>
                  <button type="button" className="link-btn" onClick={() => setState({ kind: 'pick' })}>{c.upload.remove}</button>
                </div>
                <p className="caption">{c.upload.check}</p>
                <button type="button" className="btn btn-block" onClick={() => start(state.file!, state.thumb!)}>{c.upload.cta}</button>
                <p className="caption">{c.upload.free}</p>
              </div>
            ) : coarse ? (
              <div style={{ display: 'grid', gap: 'var(--s3)' }}>
                <label className="btn btn-block" style={{ cursor: 'pointer' }}>{c.upload.camera}<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => pickFile(e.target.files?.[0])} /></label>
                <label className="btn btn-block btn-quiet" style={{ cursor: 'pointer' }}>{c.upload.library}<input type="file" accept={ACCEPT} hidden onChange={(e) => pickFile(e.target.files?.[0])} /></label>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--s3)' }}
                onDragOver={(e) => { e.preventDefault(); if (!state.over) setState({ ...state, over: true }); }}
                onDragLeave={() => setState({ ...state, over: false })}
                onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}>
                <label className="btn btn-block" style={{ cursor: 'pointer' }}>{c.upload.pick}<input type="file" accept={ACCEPT} hidden onChange={(e) => pickFile(e.target.files?.[0])} /></label>
                <div className={`drop${state.over ? ' over' : ''}`}>{c.upload.drop}</div>
              </div>
            )}
            {state.error && <p className="small" style={{ color: 'var(--error)' }} role="alert">{state.error}</p>}
            {!state.thumb && <p className="caption">{c.upload.free}</p>}
            {!state.thumb && <p className="caption">{c.upload.tips}</p>}
            <p className="caption">{c.upload.note} <a href="/privatliv">{c.upload.privacy}</a>.</p>
            {!state.thumb && <p className="small"><button type="button" className="link-btn" onClick={() => setState({ kind: 'nophoto', email: '', sending: false, sent: false })}>{c.upload.noPhoto}</button></p>}
          </div>
        )}

        {state.kind === 'processing' && (
          <div style={{ display: 'grid', gap: 'var(--s4)' }} aria-live="polite" aria-busy="true">
            <div className="proc">
              <img src={state.thumb} alt="" />
              <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={c.processing.stages[state.stage]}>
                <span style={{ ['--p' as string]: pct / 100, ['--pt' as string]: creep }} />
              </div>
            </div>
            <p className="lead" style={{ fontFamily: 'var(--display)' }}>{sentence}</p>
            <p className="caption">{c.processing.stages[state.stage]}{state.stage === 'uploading' ? ` · ${state.percent} %` : ''} · {slow ? c.processing.slow : c.processing.wait}</p>
            <button type="button" className="link-btn" style={{ justifySelf: 'start' }} onClick={close}>{c.processing.cancel}</button>
          </div>
        )}

        {state.kind === 'error' && (
          <div style={{ display: 'grid', gap: 'var(--s4)' }}>
            <h2 style={{ maxWidth: '12em' }}>{state.title}</h2>
            <img src={state.thumb} alt="" style={{ maxHeight: '30dvh', width: 'auto', maxWidth: '100%', justifySelf: 'start' }} />
            <p className="measure" role="alert">{state.message}</p>
            <button type="button" className="btn btn-block" onClick={() => start(state.file, state.thumb)}>{c.processing.retry}</button>
            <div style={{ display: 'flex', gap: 'var(--s5)', flexWrap: 'wrap' }}>
              <button type="button" className="link-btn" onClick={() => setState({ kind: 'fallback', orderId: state.orderId ?? null, email: '', sending: false, sent: false })}>{c.processing.sendInstead}</button>
              <button type="button" className="link-btn" onClick={() => setState({ kind: 'pick' })}>{c.upload.reupload}</button>
            </div>
          </div>
        )}

        {state.kind === 'nophoto' && (
          <div style={{ display: 'grid', gap: 'var(--s4)' }}>
            <h2 style={{ maxWidth: '12em' }}>{c.upload.noPhotoH}</h2>
            {state.sent ? (
              <p className="lead">{c.upload.noPhotoDone}</p>
            ) : (
              <form onSubmit={sendLead} style={{ display: 'grid', gap: 'var(--s4)' }} noValidate>
                <p className="measure">{c.upload.noPhotoP}</p>
                <div className="field">
                  <label htmlFor="nophoto-email">{c.upload.noPhotoEmail}</label>
                  <input id="nophoto-email" type="email" inputMode="email" autoComplete="email" required value={state.email} onChange={(e) => setState({ ...state, email: e.target.value })} aria-invalid={Boolean(state.error)} aria-describedby={state.error ? 'nophoto-error' : undefined} />
                  {state.error && <span id="nophoto-error" className="error" role="alert">{state.error}</span>}
                </div>
                <button type="submit" className="btn btn-block" disabled={state.sending}>{state.sending ? 'Sender…' : c.upload.noPhotoCta}</button>
              </form>
            )}
            <button type="button" className="link-btn" style={{ justifySelf: 'start' }} onClick={() => setState({ kind: 'pick' })}>{c.upload.back}</button>
          </div>
        )}

        {state.kind === 'fallback' && (
          <div style={{ display: 'grid', gap: 'var(--s4)' }}>
            <h2>Det her kræver et par hænder.</h2>
            {state.sent ? (
              <p className="lead">{c.fallback.sent}</p>
            ) : (
              <form onSubmit={sendLead} style={{ display: 'grid', gap: 'var(--s4)' }} noValidate>
                <p className="measure">{c.fallback.p}</p>
                <div className="field">
                  <label htmlFor="lead-email">{c.fallback.email}</label>
                  <input id="lead-email" type="email" inputMode="email" autoComplete="email" required value={state.email} onChange={(e) => setState({ ...state, email: e.target.value })} aria-invalid={Boolean(state.error)} aria-describedby={state.error ? 'lead-error' : undefined} />
                  {state.error && <span id="lead-error" className="error" role="alert">{state.error}</span>}
                </div>
                <button type="submit" className="btn btn-block" disabled={state.sending}>{state.sending ? 'Sender…' : c.fallback.cta}</button>
              </form>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}

/**
 * Bottom sheet (mobile) / centred modal (desktop).
 * Opens with a critically damped spring; drag-to-dismiss from the grab area or when the content
 * is scrolled to the top, with a 10 px threshold so a reading swipe never dismisses; rubber-band
 * upward; velocity-projected release; spring back (apple-design §2, §5, §6, §9, §10).
 */
const Sheet = forwardRef<HTMLDivElement, { children: ReactNode; onDismiss?: () => void; label: string }>(function Sheet({ children, onDismiss, label }, ref) {
  const el = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ startY: number; startX: number; y: number; t: number; vy: number; active: boolean; committed: boolean; id: number }>({ startY: 0, startX: 0, y: 0, t: 0, vy: 0, active: false, committed: false, id: -1 });
  const setRefs = (n: HTMLDivElement | null) => { el.current = n; if (typeof ref === 'function') ref(n); else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = n; };
  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const apply = (y: number) => { if (el.current) el.current.style.transform = `translateY(${y}px)`; };

  // Spring toward 0 from `from` with initial velocity v0 (px/s). Critically damped, response ≈ 0.35 s.
  const spring = (from: number, v0: number, done?: () => void) => {
    const w = (2 * Math.PI) / 0.35; let y = from, v = v0, last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(0.032, (t - last) / 1000); last = t;
      const a = -w * w * y - 2 * w * v; v += a * dt; y += v * dt;
      if (Math.abs(y) < 0.5 && Math.abs(v) < 5) { apply(0); done?.(); return; }
      apply(y); requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Enter: from below the viewport (mobile) or a short rise + fade (desktop). Interruptible: a drag reads the live transform.
  useEffect(() => {
    const n = el.current; if (!n) return;
    if (reduce()) { n.style.opacity = '1'; return; }
    if (isMobile()) { const h = n.getBoundingClientRect().height; apply(h); spring(h, -400); }
    else { n.animate([{ opacity: 0, transform: 'translate(-50%, calc(-50% + 12px))' }, { opacity: 1, transform: 'translate(-50%, -50%)' }], { duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' }); }
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!onDismiss || !isMobile() || e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement;
    if (target.closest('input,textarea,button,a,label,.ba,select')) return;
    const current = el.current ? new DOMMatrixReadOnly(getComputedStyle(el.current).transform).m42 : 0; // live value (apple-design §3)
    drag.current = { startY: e.clientY - current, startX: e.clientX, y: current, t: performance.now(), vy: 0, active: true, committed: false, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d.active || e.pointerId !== d.id) return;
    const dy = e.clientY - d.startY;
    if (!d.committed) {
      const moved = Math.hypot(e.clientX - d.startX, dy);
      if (moved < 10) return; // hysteresis (apple-design §10)
      const atTop = (el.current?.scrollTop ?? 0) <= 0;
      if (dy < 0 || !atTop || Math.abs(e.clientX - d.startX) > Math.abs(dy)) { d.active = false; return; } // let the content scroll
      d.committed = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      if (el.current) el.current.style.transition = 'none';
    }
    const now = performance.now(); const dt = Math.max(1, now - d.t);
    const y = dy >= 0 ? dy : (dy * 120 * 0.55) / (120 + 0.55 * Math.abs(dy));
    d.vy = ((y - d.y) / dt) * 1000; d.y = y; d.t = now;
    apply(y);
  };
  const onPointerUp = () => {
    const d = drag.current; if (!d.active || !d.committed) { d.active = false; return; } d.active = false;
    const projected = d.y + ((d.vy / 1000) * 0.998) / (1 - 0.998);
    const h = el.current?.getBoundingClientRect().height ?? 400;
    if (d.vy > 600 || projected > h * 0.5) {
      if (reduce() || !el.current) { onDismiss?.(); return; }
      el.current.style.transition = 'transform 200ms cubic-bezier(0.2, 0, 0, 1)';
      apply(h + 40);
      setTimeout(() => onDismiss?.(), 190);
    } else {
      spring(d.y, d.vy);
    }
  };

  return (
    <div ref={setRefs} className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} style={{ opacity: 1 }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <div className="grab" aria-hidden />
      {onDismiss && <button type="button" onClick={onDismiss} className="close" aria-label="Luk">×</button>}
      {children}
    </div>
  );
});
