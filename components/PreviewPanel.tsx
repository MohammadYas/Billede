'use client';
import { useEffect, useState } from 'react';
import BeforeAfter from './BeforeAfter';
import { PRODUCT, track } from '@/lib/analytics/client';
import type { Copy } from '@/lib/copy';
import type { PreviewPayload } from '@/lib/preview-service';

/** Loads an image off-screen so a swap never flashes the wrong picture. */
const preload = (src: string) => new Promise<void>((resolve) => { const i = new Image(); i.onload = () => resolve(); i.onerror = () => resolve(); i.src = src; });

export default function PreviewPanel({ c, data: initial, cancelled, paid, token }: { c: Copy; data: PreviewPayload; cancelled: boolean; paid: boolean; token?: string }) {
  const q = token ? `?t=${encodeURIComponent(token)}` : '';
  const [saveEmail, setSaveEmail] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'sending' | 'done' | 'invalid' | 'failed'>('idle');
  const [data, setData] = useState(initial);
  const [showColour, setShowColour] = useState(Boolean(initial.chosenColour && initial.colour));
  const [colourReady, setColourReady] = useState(Boolean(initial.colour));
  const [colourLoading, setColourLoading] = useState(Boolean(initial.isMonochrome && !initial.colour));
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // landscape photographs are printed landscape: "40×30 cm (liggende)"
  const landscape = data.width > data.height;
  const label = landscape ? `${c.formatLabel.replace(/(\d+)\s*×\s*(\d+)/, '$2×$1')} ${c.preview.landscape}` : c.formatLabel;
  const withLabel = (s: string) => (landscape ? s.replace(c.formatLabel, label) : s);

  useEffect(() => {
    document.body.classList.add('has-pv-bar');
    track('ViewContent', { ...PRODUCT, content_name: 'preview' });
    return () => document.body.classList.remove('has-pv-bar');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Colour version: requested once, preloaded before the toggle is enabled, so the swap is instant and never shows the damaged original.
  useEffect(() => {
    if (!data.isMonochrome) return;
    let alive = true;
    if (data.colour) { preload(data.colour).then(() => { if (alive) setColourReady(true); }); return () => { alive = false; }; }
    // the colour job runs on the server; poll the order until the colour version exists (give up after 3 min)
    let timer: number | null = null;
    const deadline = Date.now() + 180_000;
    const arrive = async (colour: string) => { await preload(colour); if (alive) { setData((d) => ({ ...d, colour })); setColourReady(true); setColourLoading(false); } };
    const check = async () => {
      try {
        const r = await fetch(`/api/preview/${data.orderId}${q}`, { cache: 'no-store' });
        const st = (await r.json()) as { payload?: { colour?: string | null } | null; job?: { kind: string; state: string } | null };
        if (st.payload?.colour) { await arrive(st.payload.colour); return; }
        if ((st.job?.kind === 'colour' && st.job.state === 'failed') || Date.now() > deadline) { if (alive) setColourLoading(false); return; }
      } catch { /* transient */ }
      if (alive) timer = window.setTimeout(check, document.visibilityState === 'hidden' ? 15000 : 2500);
    };
    fetch(`/api/preview/${data.orderId}/colour${q}`, { method: 'POST' })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { colour?: string | null; queued?: boolean };
        if (j.colour) { await arrive(j.colour); return; }
        if (!r.ok || !j.queued) { if (alive) setColourLoading(false); return; }
        timer = window.setTimeout(check, 2500);
      })
      .catch(() => { if (alive) setColourLoading(false); });
    return () => { alive = false; if (timer) window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.isMonochrome, data.colour, data.orderId]);

  const toggleColour = () => {
    if (!data.colour || !colourReady) return;
    const next = !showColour;
    setShowColour(next);
    fetch(`/api/preview/${data.orderId}/choose${q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ colour: next }) }).catch(() => {});
  };

  const order = async () => {
    setOrdering(true); setError(null);
    try {
      const r = await fetch(`/api/checkout${q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: data.orderId, colour: showColour, t: token }) });
      const j = (await r.json().catch(() => ({}))) as { url?: string; sessionId?: string };
      if (!r.ok || !j.url) throw new Error('checkout');
      // same event_id as the server-side copy, so Meta counts one InitiateCheckout
      track('InitiateCheckout', { ...PRODUCT }, { eventId: j.sessionId });
      window.location.assign(j.url);
    } catch {
      // never a server string: one calm message with a second door (the phone)
      setOrdering(false);
      setError(c.preview.checkoutError);
    }
  };

  const saveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(saveEmail.trim())) { setSaveState('invalid'); return; }
    setSaveState('sending');
    try {
      const r = await fetch(`/api/preview/${data.orderId}/save${q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: saveEmail.trim() }) });
      setSaveState(r.ok ? 'done' : 'failed');
    } catch { setSaveState('failed'); }
  };

  // the phone number in the error is a tel: link (in-app browsers do not auto-link numbers)
  const errorLine = error && (
    <p className="alert" role="alert">{c.phone && error.includes(c.phone) ? error.split(c.phone).map((part, i, arr) => <span key={i}>{part}{i < arr.length - 1 && <a href={c.phoneHref} style={{ color: 'inherit', fontWeight: 600 }}>{c.phone}</a>}</span>) : error}</p>
  );
  const button = <button type="button" className="btn btn-block" onClick={order} disabled={ordering || paid}>{paid ? 'Bestilt' : ordering ? 'Åbner betaling…' : c.preview.cta}</button>;

  const cta = (
    <div className="pv-cta">
      {errorLine}
      <p className="caption" style={{ textAlign: 'center' }}>{c.preview.payment}</p>
      {button}
      <p className="caption" style={{ textAlign: 'center' }}>{c.preview.under} {c.preview.payWhen}</p>
    </div>
  );

  const save = (
    <form onSubmit={saveLink} noValidate style={{ display: 'grid', gap: 'var(--s3)', paddingTop: 'var(--s4)', borderTop: '1px solid var(--hairline)' }}>
      <p className="small"><b style={{ fontWeight: 600 }}>{c.preview.saveTitle}</b><br /><span className="muted">{c.preview.saveP}</span></p>
      {saveState === 'done' ? <p className="small" role="status">{c.preview.saveDone}</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--s2)' }}>
          <div className="field"><label htmlFor="save-email" className="visually-hidden">{c.preview.saveEmail}</label><input id="save-email" type="email" inputMode="email" autoComplete="email" placeholder={c.preview.saveEmail} value={saveEmail} onChange={(e) => setSaveEmail(e.target.value)} aria-invalid={saveState === 'invalid'} /></div>
          <button type="submit" className="btn btn-quiet" disabled={saveState === 'sending'}>{c.preview.saveCta}</button>
        </div>
      )}
      {saveState === 'invalid' && <p className="small" style={{ color: 'var(--error)' }} role="alert">{c.preview.saveInvalid}</p>}
      {saveState === 'failed' && <p className="small" style={{ color: 'var(--error)' }} role="alert">{c.preview.saveFailed}</p>}
    </form>
  );

  return (
    <div className="container pv">
      <div className="pv-left">
        {cancelled && <p className="small notice" role="status">{c.preview.cancelled}</p>}
        <h1 style={{ fontSize: 'var(--fs-h2)', maxWidth: '14em' }}>{c.preview.h2}</h1>
        <BeforeAfter before={data.original} after={showColour && data.colour ? data.colour : data.preview} alt="Dit billede før og efter" beforeLabel={c.preview.before} afterLabel={c.preview.after} aspect={`${data.width} / ${data.height}`} contain reveal />
        {data.isMonochrome && (
          <div className="pv-toggle">
            <button type="button" className="btn btn-quiet" style={{ minHeight: 44 }} onClick={toggleColour} disabled={!data.colour || !colourReady} aria-pressed={showColour}>{showColour ? c.preview.monoToggle : c.preview.colourToggle}</button>
            {(colourLoading || (data.colour && !colourReady)) && <span className="caption">{c.preview.colourLoading}</span>}
          </div>
        )}
        <p className="caption measure">{c.preview.next}</p>
        {/* the money answer, in the content on a phone (the fixed bar stays two rows) and again under the desktop button */}
        <p className="small measure pv-money"><b style={{ fontWeight: 600 }}>{c.preview.under}</b> {c.preview.payWhen}</p>
        <p className="caption measure">{c.preview.gift}</p>
      </div>
      <div className="pv-right">
        {/* desktop: the decision first, the object and the label under it */}
        <div className="pv-desktop-cta">{cta}</div>
        <div className="pv-grid">
          <img className="pv-mock" src={data.mockup} alt={`Dit billede indrammet i ${label}`} width={1200} height={960} />
          <p className="caption">{withLabel(c.preview.mockupCaption)}</p>
          <p className="measure">{withLabel(c.preview.p)}</p>
          <h2 style={{ fontSize: 'var(--fs-lead)', fontFamily: 'var(--display)', fontWeight: 500 }}>{c.preview.specTitle}</h2>
          <dl className="label small">
            {c.produkt.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{withLabel(v)}</dd></div>)}
          </dl>
        </div>
        {!paid && save}
        <p className="small"><a className="tap" href="/">{c.preview.again}</a></p>
      </div>
      <div className="pv-cta-bar">
        {errorLine}
        <p className="caption">{c.preview.payment}</p>
        {button}
      </div>
    </div>
  );
}
