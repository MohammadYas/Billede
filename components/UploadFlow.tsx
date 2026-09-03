'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import BeforeAfter from './BeforeAfter';
import { track } from '@/lib/analytics/client';
import type { Copy } from '@/lib/copy';

type PreviewPayload = {
  orderId: string; original: string; preview: string; mockup: string; colour?: string | null;
  isMonochrome: boolean; chosenColour?: boolean;
};
type Stage = 'uploading' | 'sending' | 'restoring' | 'preparing';
type State =
  | { kind: 'closed' }
  | { kind: 'pick'; file?: File; thumb?: string; error?: string }
  | { kind: 'processing'; stage: Stage; percent: number }
  | { kind: 'preview'; data: PreviewPayload; showColour: boolean; colourLoading: boolean; message?: string; ordering?: boolean; error?: string }
  | { kind: 'fallback'; orderId: string | null; email: string; sending: boolean; sent: boolean; error?: string };

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
const MAX = 25 * 1024 * 1024;

export type UploadFlowHandle = { open: () => void };

export default function UploadFlow({ c, resume }: { c: Copy; resume?: { orderId: string; cancelled: boolean } | null }) {
  const [state, setState] = useState<State>({ kind: 'closed' });
  const sheetRef = useRef<HTMLDivElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const open = useCallback(() => setState({ kind: 'pick' }), []);
  const close = useCallback(() => { xhrRef.current?.abort(); setState({ kind: 'closed' }); }, []);

  // Global opener for the CTAs (server-rendered buttons dispatch this event).
  useEffect(() => {
    const h = () => open();
    window.addEventListener('gf:open', h);
    return () => window.removeEventListener('gf:open', h);
  }, [open]);

  // Resume a preview after a cancelled/failed checkout.
  useEffect(() => {
    if (!resume) return;
    fetch(`/api/preview/${resume.orderId}`).then(async (r) => {
      if (!r.ok) return;
      const data = (await r.json()) as PreviewPayload;
      setState({ kind: 'preview', data, showColour: Boolean(data.chosenColour && data.colour), colourLoading: false, message: resume.cancelled ? c.preview.cancelled : undefined });
    }).catch(() => {});
  }, [resume, c.preview.cancelled]);

  // Body flag hides the sticky CTA; lock scroll while open.
  useEffect(() => {
    const openNow = state.kind !== 'closed';
    if (openNow) { document.body.setAttribute('data-flow-open', '1'); document.body.style.overflow = 'hidden'; }
    else { document.body.removeAttribute('data-flow-open'); document.body.style.overflow = ''; }
    return () => { document.body.removeAttribute('data-flow-open'); document.body.style.overflow = ''; };
  }, [state.kind]);

  // Escape closes; focus moves into the sheet.
  useEffect(() => {
    if (state.kind === 'closed') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && state.kind !== 'processing') close(); };
    window.addEventListener('keydown', onKey);
    sheetRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [state.kind, close]);

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX) { setState({ kind: 'pick', error: c.upload.tooBig }); return; }
    const okType = /^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) || /\.(heic|heif)$/i.test(file.name) || file.type === '';
    if (!okType) { setState({ kind: 'pick', error: c.upload.wrongType }); return; }
    const url = URL.createObjectURL(file);
    setState({ kind: 'pick', file, thumb: url });
  };

  const start = (file: File) => {
    setState({ kind: 'processing', stage: 'uploading', percent: 0 });
    track('UploadStarted', { bytes: file.size, type: file.type });
    const fd = new FormData(); fd.append('file', file, file.name || 'photo.jpg');
    const xhr = new XMLHttpRequest(); xhrRef.current = xhr;
    xhr.open('POST', '/api/preview');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setState({ kind: 'processing', stage: 'uploading', percent: Math.round((e.loaded / e.total) * 100) }); };
    let seen = 0;
    const consume = () => {
      const text = xhr.responseText;
      const chunk = text.slice(seen);
      const lastNl = chunk.lastIndexOf('\n');
      if (lastNl < 0) return;
      seen += lastNl + 1;
      for (const line of chunk.slice(0, lastNl).split('\n')) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line) as { stage?: Stage; done?: boolean; fallback?: boolean; orderId?: string | null; reason?: string } & Partial<PreviewPayload>;
          if (msg.stage) setState({ kind: 'processing', stage: msg.stage, percent: 100 });
          if (msg.done) {
            if (msg.fallback || !msg.preview) {
              track('PreviewFallback', { reason: msg.reason ?? 'unknown' });
              setState({ kind: 'fallback', orderId: msg.orderId ?? null, email: '', sending: false, sent: false });
            } else {
              track('UploadCompleted', {});
              track('PreviewShown', { monochrome: msg.isMonochrome });
              const data = msg as PreviewPayload;
              setState({ kind: 'preview', data, showColour: false, colourLoading: Boolean(data.isMonochrome) });
              if (data.isMonochrome) requestColour(data.orderId);
            }
          }
        } catch { /* partial line */ }
      }
    };
    xhr.onprogress = consume;
    xhr.onload = () => { consume(); setState((s) => (s.kind === 'processing' ? { kind: 'fallback', orderId: null, email: '', sending: false, sent: false } : s)); };
    xhr.onerror = () => setState({ kind: 'fallback', orderId: null, email: '', sending: false, sent: false });
    xhr.send(fd);
  };

  const requestColour = async (orderId: string) => {
    try {
      const r = await fetch(`/api/preview/${orderId}/colour`, { method: 'POST' });
      if (!r.ok) throw new Error('colour failed');
      const { colour } = (await r.json()) as { colour: string | null };
      setState((s) => (s.kind === 'preview' && s.data.orderId === orderId ? { ...s, data: { ...s.data, colour }, colourLoading: false } : s));
    } catch {
      setState((s) => (s.kind === 'preview' ? { ...s, colourLoading: false } : s));
    }
  };

  const toggleColour = async () => {
    if (state.kind !== 'preview' || !state.data.colour) return;
    const next = !state.showColour;
    setState({ ...state, showColour: next });
    fetch(`/api/preview/${state.data.orderId}/choose`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ colour: next }) }).catch(() => {});
  };

  const order = async () => {
    if (state.kind !== 'preview') return;
    setState({ ...state, ordering: true, error: undefined });
    track('InitiateCheckout', { value: 599, currency: 'DKK' });
    try {
      const r = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: state.data.orderId, colour: state.showColour }) });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) throw new Error(j.error ?? 'checkout');
      window.location.assign(j.url);
    } catch {
      setState({ ...state, ordering: false, error: 'Vi kunne ikke åbne betalingen lige nu. Prøv igen om et øjeblik.' });
    }
  };

  const sendLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.kind !== 'fallback') return;
    const email = state.email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setState({ ...state, error: 'Skriv en e-mail, vi kan svare på.' }); return; }
    setState({ ...state, sending: true, error: undefined });
    try {
      const r = await fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: state.orderId, email }) });
      if (!r.ok) throw new Error('lead');
      setState({ ...state, sending: false, sent: true });
    } catch {
      setState({ ...state, sending: false, error: 'Det lykkedes ikke at sende. Prøv igen.' });
    }
  };

  if (state.kind === 'closed') return null;

  return (
    <>
      <div className="scrim" onClick={state.kind === 'processing' ? undefined : close} aria-hidden />
      <Sheet ref={sheetRef} onDismiss={state.kind === 'processing' ? undefined : close} label={state.kind === 'preview' ? c.preview.h2 : 'Upload dit billede'}>
        {state.kind === 'pick' && (
          <div style={{ display: 'grid', gap: 'var(--s4)' }}>
            <h2 style={{ fontSize: 'var(--fs-h2)' }}>Vis os billedet.</h2>
            {state.thumb ? (
              <div style={{ display: 'grid', gap: 'var(--s3)' }}>
                <img src={state.thumb} alt="Dit valgte billede" style={{ maxHeight: '38dvh', width: 'auto', maxWidth: '100%', objectFit: 'contain', justifySelf: 'start', border: '1px solid var(--hairline)' }} />
                <div style={{ display: 'flex', gap: 'var(--s4)' }}>
                  <button type="button" className="link-btn" onClick={() => setState({ kind: 'pick' })}>{c.upload.remove}</button>
                  <label className="link-btn" style={{ display: 'inline-flex', alignItems: 'center' }}>{c.upload.reupload}<input type="file" accept={ACCEPT} hidden onChange={(e) => pickFile(e.target.files?.[0])} /></label>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--s3)' }}>
                <label className="btn btn-block" style={{ cursor: 'pointer' }}>{c.upload.camera}<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => pickFile(e.target.files?.[0])} /></label>
                <label className="btn btn-block btn-quiet" style={{ cursor: 'pointer' }}>{c.upload.library}<input type="file" accept={ACCEPT} hidden onChange={(e) => pickFile(e.target.files?.[0])} /></label>
              </div>
            )}
            {state.error && <p className="small" style={{ color: 'var(--error)' }} role="alert">{state.error}</p>}
            <p className="caption">{c.upload.note}</p>
            {state.file && <button type="button" className="btn btn-block" onClick={() => start(state.file!)}>{c.upload.cta}</button>}
          </div>
        )}

        {state.kind === 'processing' && (
          <div style={{ display: 'grid', gap: 'var(--s4)', minHeight: '30dvh', alignContent: 'center' }} aria-live="polite">
            <p className="lead">{c.processing.stages[state.stage]}{state.stage === 'uploading' ? ` · ${state.percent} %` : '…'}</p>
            <div className="progress"><span style={{ ['--p' as string]: (state.stage === 'uploading' ? state.percent * 0.25 : state.stage === 'sending' ? 35 : state.stage === 'restoring' ? 60 : 90) / 100 }} /></div>
            <p className="caption">Det tager normalt 20–40 sekunder. Lad siden være åben.</p>
          </div>
        )}

        {state.kind === 'preview' && (
          <div style={{ display: 'grid', gap: 'var(--s4)' }}>
            {state.message && <p className="small" role="status" style={{ background: 'var(--paper-2)', padding: 'var(--s3) var(--s4)' }}>{state.message}</p>}
            <BeforeAfter before={state.data.original} after={state.showColour && state.data.colour ? state.data.colour : state.data.preview} alt="Dit billede før og efter" beforeLabel={c.preview.before} afterLabel={c.preview.after} aspect="1 / 1" reveal />
            {state.data.isMonochrome && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', minHeight: 44 }}>
                <button type="button" className="link-btn" onClick={toggleColour} disabled={!state.data.colour} aria-pressed={state.showColour}>
                  {state.showColour ? c.preview.monoToggle : c.preview.colourToggle}
                </button>
                {state.colourLoading && <span className="caption">farver er på vej…</span>}
              </div>
            )}
            <img src={state.data.mockup} alt={`Dit billede indrammet i ${c.formatLabel}`} style={{ width: '100%' }} />
            <h2 style={{ fontSize: 'var(--fs-h2)' }}>{c.preview.h2}</h2>
            <p className="measure">{c.preview.p}</p>
            {state.error && <p className="small" style={{ color: 'var(--error)' }} role="alert">{state.error}</p>}
            <button type="button" className="btn btn-block" onClick={order} disabled={state.ordering}>{state.ordering ? 'Åbner betaling…' : c.preview.cta}</button>
            <p className="caption" style={{ textAlign: 'center' }}>{c.preview.under}</p>
          </div>
        )}

        {state.kind === 'fallback' && (
          <div style={{ display: 'grid', gap: 'var(--s4)' }}>
            <h2 style={{ fontSize: 'var(--fs-h2)' }}>Det her kræver et par hænder.</h2>
            {state.sent ? (
              <p className="lead">{c.fallback.sent}</p>
            ) : (
              <form onSubmit={sendLead} style={{ display: 'grid', gap: 'var(--s4)' }}>
                <p className="measure">{c.fallback.p}</p>
                <div className="field">
                  <label htmlFor="lead-email">{c.fallback.email}</label>
                  <input id="lead-email" type="email" inputMode="email" autoComplete="email" required value={state.email} onChange={(e) => setState({ ...state, email: e.target.value })} aria-invalid={Boolean(state.error)} />
                  {state.error && <span className="error" role="alert">{state.error}</span>}
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
 * Drag-to-dismiss on mobile: 1:1 tracking with pointer capture, rubber-band upward,
 * velocity-projected release, critically damped spring back (apple-design §2, §5, §6, §9).
 */
import { forwardRef, type ReactNode } from 'react';
const Sheet = forwardRef<HTMLDivElement, { children: ReactNode; onDismiss?: () => void; label: string }>(function Sheet({ children, onDismiss, label }, ref) {
  const el = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ startY: number; y: number; t: number; vy: number; active: boolean }>({ startY: 0, y: 0, t: 0, vy: 0, active: false });
  const setRefs = (n: HTMLDivElement | null) => { el.current = n; if (typeof ref === 'function') ref(n); else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = n; };
  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
  const apply = (y: number) => { if (el.current) el.current.style.transform = `translateY(${y}px)`; };

  const springBack = (from: number, v0: number) => {
    // critically damped spring, response ≈ 0.35 s
    const w = 2 * Math.PI / 0.35; let y = from, v = v0, last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(0.032, (t - last) / 1000); last = t;
      const a = -w * w * y - 2 * w * v; v += a * dt; y += v * dt;
      if (Math.abs(y) < 0.5 && Math.abs(v) < 5) { apply(0); return; }
      apply(y); requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!onDismiss || !isMobile()) return;
    const target = e.target as HTMLElement;
    if (target.closest('input,textarea,button,a,label,.ba')) return;
    if (el.current && el.current.scrollTop > 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, y: 0, t: performance.now(), vy: 0, active: true };
    if (el.current) el.current.style.transition = 'none';
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d.active) return;
    const dy = e.clientY - d.startY;
    const now = performance.now(); const dt = Math.max(1, now - d.t);
    const y = dy >= 0 ? dy : (dy * 120 * 0.55) / (120 + 0.55 * Math.abs(dy)); // rubber-band upward
    d.vy = ((y - d.y) / dt) * 1000; d.y = y; d.t = now;
    apply(y);
  };
  const onPointerUp = () => {
    const d = drag.current; if (!d.active) return; d.active = false;
    const projected = d.y + (d.vy / 1000) * 0.998 / (1 - 0.998);
    const h = el.current?.getBoundingClientRect().height ?? 400;
    if (d.vy > 600 || projected > h * 0.5) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || !el.current) { onDismiss?.(); return; }
      el.current.style.transition = 'transform 220ms cubic-bezier(0.2, 0, 0, 1)';
      apply(h + 40);
      setTimeout(() => onDismiss?.(), 200);
    } else {
      springBack(d.y, d.vy);
    }
  };

  return (
    <div ref={setRefs} className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <div className="grab" aria-hidden />
      {onDismiss && <button type="button" onClick={onDismiss} className="link-btn" style={{ position: 'absolute', right: 'var(--gutter)', top: 'var(--s3)', minWidth: 44, textDecoration: 'none', fontSize: 22, lineHeight: 1 }} aria-label="Luk">×</button>}
      {children}
    </div>
  );
});
