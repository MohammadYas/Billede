'use client';
import { useEffect, useState } from 'react';
import BeforeAfter from './BeforeAfter';
import { track } from '@/lib/analytics/client';
import type { Copy } from '@/lib/copy';
import type { PreviewPayload } from '@/lib/preview-service';

export default function PreviewPanel({ c, data: initial, cancelled, paid }: { c: Copy; data: PreviewPayload; cancelled: boolean; paid: boolean }) {
  const [data, setData] = useState(initial);
  const [showColour, setShowColour] = useState(Boolean(initial.chosenColour && initial.colour));
  const [colourLoading, setColourLoading] = useState(Boolean(initial.isMonochrome && !initial.colour));
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add('has-pv-bar');
    return () => document.body.classList.remove('has-pv-bar');
  }, []);

  useEffect(() => {
    if (!data.isMonochrome || data.colour) return;
    let alive = true;
    fetch(`/api/preview/${data.orderId}/colour`, { method: 'POST' })
      .then(async (r) => { if (!r.ok) throw new Error(); const { colour } = (await r.json()) as { colour: string | null }; if (alive) setData((d) => ({ ...d, colour })); })
      .catch(() => {})
      .finally(() => { if (alive) setColourLoading(false); });
    return () => { alive = false; };
  }, [data.isMonochrome, data.colour, data.orderId]);

  const toggleColour = () => {
    if (!data.colour) return;
    const next = !showColour;
    setShowColour(next);
    fetch(`/api/preview/${data.orderId}/choose`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ colour: next }) }).catch(() => {});
  };

  const order = async () => {
    setOrdering(true); setError(null);
    track('InitiateCheckout', { value: 599, currency: 'DKK' });
    try {
      const r = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: data.orderId, colour: showColour }) });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) throw new Error(j.error ?? 'checkout');
      window.location.assign(j.url);
    } catch (e) {
      setOrdering(false);
      setError(e instanceof Error && e.message && !/checkout/.test(e.message) ? e.message : 'Vi kunne ikke åbne betalingen lige nu. Prøv igen om et øjeblik.');
    }
  };

  const cta = (
    <div className="pv-cta">
      {error && <p className="small" style={{ color: 'var(--error)' }} role="alert">{error}</p>}
      <button type="button" className="btn btn-block" onClick={order} disabled={ordering || paid}>{paid ? 'Bestilt' : ordering ? 'Åbner betaling…' : c.preview.cta}</button>
      <p className="caption" style={{ textAlign: 'center' }}>{c.preview.under}</p>
    </div>
  );

  return (
    <div className="container pv">
      <div className="pv-left">
        {cancelled && <p className="small notice" role="status">{c.preview.cancelled}</p>}
        <h1 style={{ fontSize: 'var(--fs-h2)', maxWidth: '14em' }}>{c.preview.h2}</h1>
        <BeforeAfter before={data.original} after={showColour && data.colour ? data.colour : data.preview} alt="Dit billede før og efter" beforeLabel={c.preview.before} afterLabel={c.preview.after} aspect={`${data.width} / ${data.height}`} contain reveal />
        {data.isMonochrome && (
          <div className="pv-toggle">
            <button type="button" className="link-btn" onClick={toggleColour} disabled={!data.colour} aria-pressed={showColour}>{showColour ? c.preview.monoToggle : c.preview.colourToggle}</button>
            {colourLoading && <span className="caption">farver er på vej…</span>}
          </div>
        )}
      </div>
      <div className="pv-right">
        <div className="pv-grid">
          <img className="pv-mock" src={data.mockup} alt={`Dit billede indrammet i ${c.formatLabel}`} width={1200} height={960} />
          <p className="caption">{c.preview.mockupCaption}</p>
          <p className="measure">{c.preview.p}</p>
          <dl className="label small">
            {c.produkt.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </div>
        <div className="pv-desktop-cta">{cta}</div>
        <p className="small"><a className="tap" href="/">{c.preview.again}</a></p>
      </div>
      <div className="pv-cta-bar">
        <button type="button" className="btn btn-block" onClick={order} disabled={ordering || paid}>{paid ? 'Bestilt' : ordering ? 'Åbner betaling…' : c.preview.cta}</button>
      </div>
    </div>
  );
}
