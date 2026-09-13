'use client';
import { useEffect, useState } from 'react';

export const RESUME_KEY = 'gf_resume';
type Saved = { id: string; t: string; at: number };

/**
 * The way back to a picture that was started here. The upload sheet writes {id, token, at} to
 * localStorage the moment an order exists; this banner reads it on the landing page, asks the
 * server how far the picture is, and says either "still working" (and keeps asking) or "ready —
 * see it". So a visitor can close the tab during the ninety seconds and find the picture again
 * from the front page, on the same phone, without a mail. Gone after 48 h, after payment, after
 * deletion, or when the visitor closes it.
 */
export function rememberResume(id: string, t: string) { try { localStorage.setItem(RESUME_KEY, JSON.stringify({ id, t, at: Date.now() })); } catch { /* private mode */ } }
export function forgetResume() { try { localStorage.removeItem(RESUME_KEY); } catch { /* ignore */ } }

type View = { kind: 'working' } | { kind: 'ready'; href: string } | { kind: 'again' } | null;

export default function ResumeBanner({ working, ready, cta, again, retry }: { working: string; ready: string; cta: string; again: string; retry: string }) {
  const [view, setView] = useState<View>(null);
  const [saved, setSaved] = useState<Saved | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RESUME_KEY);
      const s = raw ? (JSON.parse(raw) as Saved) : null;
      if (!s || !/^[0-9a-f-]{36}$/.test(s.id) || Date.now() - s.at > 48 * 3600e3) { forgetResume(); return; }
      if (sessionStorage.getItem(RESUME_KEY + ':hide') === s.id) return;
      if (/[?&](order|igen)=/.test(location.search)) return;
      setSaved(s);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!saved) return;
    let alive = true;
    let timer: number | null = null;
    const ask = async () => {
      // not while the sheet itself is open: it already shows the progress
      if (document.querySelector('.sheet')) { timer = window.setTimeout(ask, 4000); return; }
      try {
        const r = await fetch(`/api/preview/${saved.id}?t=${encodeURIComponent(saved.t)}`, { cache: 'no-store' });
        if (!alive) return;
        if (r.status === 404) { forgetResume(); setView(null); return; }
        const j = (await r.json()) as { status?: string; job?: { state?: string } | null; cancelled?: boolean };
        if (j.cancelled || !j.status) { forgetResume(); setView(null); return; }
        if (j.status === 'PREVIEW_READY') { setView({ kind: 'ready', href: `/p/${saved.id}?t=${encodeURIComponent(saved.t)}` }); return; }
        if (j.status === 'NEW') {
          const st = j.job?.state;
          if (st === 'running' || st === 'queued') { setView({ kind: 'working' }); timer = window.setTimeout(ask, 6000); return; }
          // the tab was closed between the upload and the start of the job: ask for the job now (idempotent server-side)
          if (!j.job) {
            const r2 = await fetch(`/api/preview/${saved.id}/run?t=${encodeURIComponent(saved.t)}`, { method: 'POST' }).catch(() => null);
            if (!alive) return;
            if (r2?.ok) { setView({ kind: 'working' }); timer = window.setTimeout(ask, 6000); return; }
          }
          // the photo never landed (closed during the upload) or the job failed: the way back is to pick it again
          forgetResume(); setView({ kind: 'again' }); return;
        }
        // paid, refunded, deleted: nothing to come back to from here
        forgetResume();
        setView(null);
      } catch { if (alive) timer = window.setTimeout(ask, 10000); }
    };
    ask();
    return () => { alive = false; if (timer) window.clearTimeout(timer); };
  }, [saved]);

  if (!view || !saved) return null;
  const hide = () => { try { sessionStorage.setItem(RESUME_KEY + ':hide', saved.id); } catch { /* ignore */ } setView(null); };
  return (
    <div className={`resume ${view.kind}`} role="status" aria-live="polite">
      <div className="resume-body">
        {view.kind === 'working' ? <span className="resume-dot" aria-hidden /> : null}
        <p>{view.kind === 'working' ? working : view.kind === 'again' ? again : ready}</p>
        {view.kind === 'ready' && <a className="btn btn-sm" href={view.href}>{cta}</a>}
        {view.kind === 'again' && <button type="button" className="btn btn-sm" onClick={() => { setView(null); window.dispatchEvent(new CustomEvent('gf:open')); }}>{retry}</button>}
      </div>
      <button type="button" className="resume-close" aria-label="Luk" onClick={hide}>×</button>
    </div>
  );
}
