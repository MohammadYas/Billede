'use client';
import { useEffect, useRef, useState } from 'react';
import BeforeAfter from './BeforeAfter';
import { PRODUCT, track } from '@/lib/analytics/client';
import MailLine from './MailLine';
import type { Copy } from '@/lib/copy';
import type { PreviewPayload } from '@/lib/preview-service';
import { quote, formatOere, MAX_EXTRA_PRINTS, type Format, type Frame } from '@/lib/pricing';

/** Loads an image off-screen so a swap never flashes the wrong picture. */
const preload = (src: string) => new Promise<void>((resolve) => { const i = new Image(); i.onload = () => resolve(); i.onerror = () => resolve(); i.src = src; });

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The total counts to its new value instead of jumping: the number is what the eye is on when a size
 * or an extra copy is picked, and a jump reads as a different price rather than the same price
 * changing. 380 ms, ease-out, tabular figures so nothing reflows. Reduced motion sets it straight away.
 */
function Total({ oere }: { oere: number }) {
  const [shown, setShown] = useState(oere);
  const from = useRef(oere);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (reduced()) { setShown(oere); from.current = oere; return; }
    const a = from.current; const b = oere;
    if (a === b) return;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 380);
      const e = 1 - Math.pow(1 - t, 3);
      const value = Math.round(a + (b - a) * e);
      setShown(value); from.current = value;
      if (t < 1) raf.current = requestAnimationFrame(step); else { from.current = b; raf.current = null; }
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [oere]);
  return <span className="tabular">{formatOere(shown)}</span>;
}

/** Two stacked layers, so a new frame or size fades in over the old one instead of blinking. */
function Mockup({ src, alt }: { src: string; alt: string }) {
  const [layers, setLayers] = useState<{ src: string; key: number }[]>([{ src, key: 0 }]);
  const n = useRef(0);
  useEffect(() => {
    if (layers[layers.length - 1].src === src) return;
    let alive = true;
    preload(src).then(() => {
      if (!alive) return;
      n.current += 1;
      setLayers((ls) => [...ls.slice(-1), { src, key: n.current }]);
      window.setTimeout(() => { if (alive) setLayers((ls) => ls.slice(-1)); }, 300);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  return (
    <div className="pv-mock">
      {layers.map((l, i) => (
        <img key={l.key} className={i > 0 ? 'in' : ''} src={l.src} alt={i === layers.length - 1 ? alt : ''} aria-hidden={i !== layers.length - 1} width={1200} height={960} />
      ))}
    </div>
  );
}

export default function PreviewPanel({ c, data: initial, cancelled, paid, token }: { c: Copy; data: PreviewPayload; cancelled: boolean; paid: boolean; token?: string }) {
  const q = token ? `?t=${encodeURIComponent(token)}` : '';
  const [saveEmail, setSaveEmail] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'sending' | 'done' | 'invalid' | 'failed'>('idle');
  const [data, setData] = useState(initial);
  const [showColour, setShowColour] = useState(Boolean(initial.chosenColour && initial.colour));
  const [colourReady, setColourReady] = useState(Boolean(initial.colour));
  const [colourLoading, setColourLoading] = useState(Boolean(initial.isMonochrome && !initial.colour));
  const [zoom, setZoom] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The configuration. `quote()` is the same pure function the server runs before Stripe sees anything,
  // so the total under the finger and the amount on the card are one piece of arithmetic, not two guesses.
  const [format, setFormat] = useState<Format>(data.format);
  const [frame, setFrame] = useState<Frame>(data.addons.frame);
  const [extraPrints, setExtraPrints] = useState(data.addons.extraPrints);
  const bill = quote({ format, frame, extraPrints });

  // landscape photographs are printed landscape: "40×30 cm (liggende)"
  const landscape = data.width > data.height;
  const variants = landscape ? c.variants.landscape : c.variants.portrait;
  const v = variants.find((x) => x.format === format) ?? variants[0];
  const label = landscape ? `${v.label} ${c.preview.landscape}` : v.label;
  const mockup = data.mockups[`${format}:${frame}`] ?? data.mockup;

  // every combination is fetched up front, so picking a size or a frame swaps the wall with no wait
  useEffect(() => {
    // the one on screen is already loading; the rest wait for an idle moment so they do not compete
    // with the customer's own photograph on a phone connection
    const others = Object.entries(data.mockups).filter(([k]) => k !== `${data.format}:${data.addons.frame}`).map(([, u]) => u);
    const run = () => others.forEach((u) => { if (u) void preload(u); });
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 }); else window.setTimeout(run, 2500);
  }, [data.mockups, data.format, data.addons.frame]);

  const viewed = useRef(false);
  useEffect(() => {
    document.body.classList.add('has-pv-bar');
    if (!viewed.current) { // one view per visit, whatever the runtime does with effects
      viewed.current = true;
      track('ViewContent', { ...PRODUCT, content_name: 'preview', content_ids: [data.format], value: quote({ format: data.format, frame: data.addons.frame, extraPrints: data.addons.extraPrints }).totalOere / 100 });
    }
    return () => document.body.classList.remove('has-pv-bar');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The order row follows what the customer is looking at, so admin — and a recovered checkout — sees it. */
  const persist = (patch: { format?: Format; frame?: Frame; extraPrints?: number }) => {
    fetch(`/api/preview/${data.orderId}/choose${q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) }).catch(() => {});
  };
  const pickFormat = (next: Format) => {
    if (next === format) return;
    setFormat(next); persist({ format: next });
    // the size is the price ladder: this is the real AddToCart, and it was the one step nobody measured
    track('AddToCart', { ...PRODUCT, content_ids: [next], value: quote({ format: next, frame, extraPrints }).totalOere / 100 }, { serverLog: true });
  };
  const pickFrame = (next: Frame) => { if (next === frame) return; setFrame(next); persist({ frame: next }); };
  const setExtras = (next: number) => {
    const n = Math.min(MAX_EXTRA_PRINTS, Math.max(0, next));
    if (n === extraPrints) return;
    const up = n > extraPrints;
    setExtraPrints(n); persist({ extraPrints: n });
    if (up) track('AddToCart', { ...PRODUCT, content_name: 'ekstra_eksemplar', content_ids: [format], value: quote({ format, frame, extraPrints: n }).totalOere / 100 }, { serverLog: true });
  };

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
    if (next) track('ColourViewed', { ...PRODUCT, content_ids: [format] }, { serverLog: true });
    fetch(`/api/preview/${data.orderId}/choose${q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ colour: next }) }).catch(() => {});
  };

  const order = async () => {
    setOrdering(true); setError(null);
    try {
      const r = await fetch(`/api/checkout${q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: data.orderId, colour: showColour, format, frame, extraPrints, t: token }) });
      const j = (await r.json().catch(() => ({}))) as { url?: string; sessionId?: string };
      if (!r.ok || !j.url) throw new Error('checkout');
      // same event_id as the server-side copy, so Meta counts one InitiateCheckout
      track('InitiateCheckout', { ...PRODUCT, content_ids: [format], value: bill.totalOere / 100 }, { eventId: j.sessionId });
      window.location.assign(j.url);
    } catch {
      // never a server string: one calm message with a second door (e-mail)
      setOrdering(false);
      setError(c.preview.checkoutError);
    }
  };

  /** "Slet mit billede nu": the deletion promise, as a button rather than a sentence. */
  const erase = async () => {
    if (!window.confirm(c.preview.eraseConfirm)) return;
    try { await fetch(`/api/preview/${data.orderId}/cancel${q}`, { method: 'POST' }); } catch { /* it is deleted by retention anyway */ }
    window.location.assign('/?slettet=1');
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

  // the address in the error is a mailto link (in-app browsers do not auto-link anything)
  const errorLine = error && <MailLine className="alert" role="alert" text={error} email={c.email} href={c.emailHref} />;
  const button = (
    <button type="button" className="btn btn-block" onClick={order} disabled={ordering || paid}>
      {paid ? 'Bestilt' : ordering ? 'Åbner betaling…' : <>{c.preview.ctaShort} <span aria-hidden>·</span> <Total oere={bill.totalOere} /></>}
    </button>
  );

  const cta = (
    <div className="pv-cta">
      {errorLine}
      <p className="caption" style={{ textAlign: 'center' }}>{c.preview.payment}</p>
      {button}
      <p className="caption" style={{ textAlign: 'center' }}>{c.preview.under} {c.preview.payWhenPre} <Total oere={bill.totalOere} /> {c.preview.payWhenPost}</p>
    </div>
  );

  const config = (
    <div className="config">
      <fieldset className="cfg">
        <legend className="cfg-label"><span className="n">1</span>{c.preview.sizeTitle}</legend>
        <div className="sizes-row">
          {variants.map((x) => (
            <label key={x.format} className={`size${x.format === format ? ' is-on' : ''}${x.recommended ? ' is-recommended' : ''}`}>
              <input type="radio" name="stoerrelse" value={x.format} checked={x.format === format} onChange={() => pickFormat(x.format)} />
              {x.recommended && <span className="tag">{c.preview.recommended}</span>}
              <b>{x.label}</b>
              <span className="size-price tabular">{x.price}</span>
              <span className="caption">{x.hint}</span>
            </label>
          ))}
        </div>
        <p className="caption">{c.preview.sizeNote}</p>
      </fieldset>

      <fieldset className="cfg">
        <legend className="cfg-label"><span className="n">2</span>{c.preview.frameTitle}</legend>
        <div className="frames-row">
          {([['sort', c.preview.frameSort, c.preview.frameSortHint], ['eg', c.preview.frameEg, c.preview.frameEgHint]] as [Frame, string, string][]).map(([key, name, hint]) => (
            <label key={key} className={`frame${key === frame ? ' is-on' : ''}`}>
              <input type="radio" name="ramme" value={key} checked={key === frame} onChange={() => pickFrame(key)} />
              <span className={`swatch swatch-${key}`} aria-hidden />
              <span className="frame-text"><b>{name}</b><span className="caption">{hint}</span></span>
            </label>
          ))}
        </div>
        <p className="caption">{c.preview.frameNote}</p>
      </fieldset>

      <div className="cfg extra">
        <p className="cfg-label"><span className="n">3</span>{c.preview.extraLabel}</p>
        <p className="cfg-title">{c.preview.extraTitle}</p>
        <p className="caption measure">{c.preview.extraLead}</p>
        {extraPrints === 0 ? (
          <button type="button" className="btn btn-quiet extra-add" onClick={() => setExtras(1)}>
            {c.preview.extraAdd} <span className="tabular">+ {v.extraPrint}</span>
          </button>
        ) : (
          <div className="stepper" role="group" aria-label={c.preview.extraTitle}>
            <button type="button" onClick={() => setExtras(extraPrints - 1)} aria-label={c.preview.extraRemove}>−</button>
            <span aria-live="polite"><b className="tabular">{extraPrints}</b> {extraPrints === 1 ? c.preview.extraOne : c.preview.extraMany}</span>
            <button type="button" onClick={() => setExtras(extraPrints + 1)} aria-label={c.preview.extraAdd} disabled={extraPrints >= MAX_EXTRA_PRINTS}>+</button>
          </div>
        )}
      </div>
      <div className="cfg bill">
        <p className="cfg-label"><span className="n">4</span>{c.preview.summaryTitle}</p>
        <div className="bill-head">
          <img src={mockup} alt={c.preview.yourPhoto} width={96} height={77} />
          <p><b>{c.preview.yourPhoto}</b><span>{label} · {frame === 'eg' ? 'egetræsramme' : 'sort ramme'} · {1 + extraPrints} {extraPrints === 0 ? c.preview.copiesOne : c.preview.copiesMany}</span></p>
        </div>
        <dl className="bill-lines">
          {bill.lines.map((l) => (
            <div key={l.key}>
              <dt>{l.quantity > 1 ? `${l.quantity} × ` : ''}{l.short}{l.note ? <span className="caption">{l.note}</span> : null}</dt>
              <dd className="tabular">{formatOere(l.amountOere)}</dd>
            </div>
          ))}
          <div><dt>{c.preview.shipping}</dt><dd>{c.preview.shippingFree}</dd></div>
        </dl>
        <p className="bill-total"><span>{c.preview.total}</span> <b><Total oere={bill.totalOere} /></b></p>
        <p className="caption">{c.preview.vat}</p>
        {/* the three promises, where the doubt is: right above the button */}
        <ul className="guarantee">{c.preview.trust.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="caption measure">{c.preview.gift}</p>
      </div>
    </div>
  );

  const save = (
    <details className="pv-save">
      <summary className="small">{c.preview.saveTitle}</summary>
      <form onSubmit={saveLink} noValidate style={{ display: 'grid', gap: 'var(--s3)', paddingTop: 'var(--s3)' }}>
      <p className="small muted">{c.preview.saveP}</p>
      {saveState === 'done' ? <p className="small" role="status">{c.preview.saveDone}</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--s2)' }}>
          <div className="field"><label htmlFor="save-email" className="visually-hidden">{c.preview.saveEmail}</label><input id="save-email" type="email" inputMode="email" autoComplete="email" placeholder={c.preview.saveEmail} value={saveEmail} onChange={(e) => setSaveEmail(e.target.value)} aria-invalid={saveState === 'invalid'} /></div>
          <button type="submit" className="btn btn-quiet" disabled={saveState === 'sending'}>{c.preview.saveCta}</button>
        </div>
      )}
      {saveState === 'invalid' && <p className="small" style={{ color: 'var(--error)' }} role="alert">{c.preview.saveInvalid}</p>}
      {saveState === 'failed' && <p className="small" style={{ color: 'var(--error)' }} role="alert">{c.preview.saveFailed}</p>}
      </form>
    </details>
  );

  return (
    <div className="container pv">
      <div className="pv-left">
        {cancelled && <p className="small notice" role="status">{c.preview.cancelled}</p>}
        <ol className="pv-steps" aria-label="Hvor du er i bestillingen">
          {c.preview.steps.map((s, i) => <li key={s} className={i === 0 ? 'done' : i === 1 ? 'now' : ''} aria-current={i === 1 ? 'step' : undefined}>{s}</li>)}
        </ol>
        <h1 style={{ fontSize: 'var(--fs-h2)', maxWidth: '14em' }}>{c.preview.h2}</h1>
        <BeforeAfter before={data.original} after={showColour && data.colour ? data.colour : data.preview} alt="Dit billede før og efter" beforeLabel={c.preview.before} afterLabel={c.preview.after} aspect={`${data.width} / ${data.height}`} contain reveal zoom={zoom ? 2.2 : 1} />
        {/* both controls belong to the picture, so they share one row */}
        <div className="pv-toggle">
          <button type="button" className="link-btn" onClick={() => setZoom((z) => !z)} aria-pressed={zoom}>{zoom ? c.preview.zoomOut : c.preview.zoomIn}</button>
          {data.isMonochrome && <button type="button" className="link-btn" onClick={toggleColour} disabled={!data.colour || !colourReady} aria-pressed={showColour}>{showColour ? c.preview.monoToggle : c.preview.colourToggle}</button>}
          {(colourLoading || (data.colour && !colourReady)) && <span className="caption">{c.preview.colourLoading}</span>}
        </div>
        {data.isMonochrome && colourReady && <p className="caption measure">{c.preview.colourHint}</p>}
        <p className="caption measure">{c.preview.next}</p>
        {/* the money answer, in the content on a phone (the fixed bar stays two rows) and again under the desktop button */}
        <p className="small measure pv-money"><b style={{ fontWeight: 600 }}>{c.preview.under}</b> {c.preview.payWhenPre} <Total oere={bill.totalOere} /> {c.preview.payWhenPost}</p>
      </div>
      <div className="pv-right">
        {/* desktop: the decision first, the object and the label under it */}
        <div className="pv-desktop-cta">{cta}</div>
        <div className="pv-grid">
          {/* the object first, then what it is, then the price — the decisions come after the value */}
          <h2 style={{ fontSize: 'var(--fs-h2)', maxWidth: '14em' }}>{c.preview.hang}</h2>
          <Mockup src={mockup} alt={`Dit billede indrammet i ${label}, ${frame === 'eg' ? 'egetræsramme' : 'sort ramme'}`} />
          <h2 style={{ fontSize: 'var(--fs-lead)', fontFamily: 'var(--display)', fontWeight: 500 }}>{v.specTitle}</h2>
          <p className="caption measure">{c.produkt.lead}</p>
          <dl className="label small">
            {v.rows.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}
          </dl>
          {config}
          {/* desktop: the button again, right under the total it belongs to */}
          <div className="pv-desktop-cta">{cta}</div>
        </div>
        {!paid && save}
        <p className="small" style={{ display: 'flex', gap: 'var(--s5)', flexWrap: 'wrap' }}>
          <a className="tap" href="/">{c.preview.again}</a>
          {!paid && <button type="button" className="link-btn" onClick={erase}>{c.preview.erase}</button>}
        </p>
      </div>
      <div className="pv-cta-bar">
        {errorLine}
        <p className="caption">{c.preview.payment}</p>
        {button}
      </div>
    </div>
  );
}
