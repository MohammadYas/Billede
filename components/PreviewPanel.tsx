'use client';
import { useEffect, useRef, useState } from 'react';
import BeforeAfter from './BeforeAfter';
import { PRODUCT, track } from '@/lib/analytics/client';
import MailLine from './MailLine';
import type { Copy } from '@/lib/copy';
import type { PreviewPayload } from '@/lib/preview-service';
import { quote, formatOere, MAX_EXTRA_PRINTS, customerFormat, isFormat, isFrame, type Format, type Frame } from '@/lib/pricing';
import { PICK_KEY } from './SizePicker';
import Promo from './Promo';
import { forgetResume } from './ResumeBanner';

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
  const [data] = useState(initial);
  const [zoom, setZoom] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [specOpen, setSpecOpen] = useState(false); // phone: the spec is one line until asked
  const [error, setError] = useState<string | null>(null);
  const [erasing, setErasing] = useState(false);
  const [eraseError, setEraseError] = useState<string | null>(null);
  const eraseBusy = useRef(false);
  const orderBusy = useRef(false);

  // The configuration. `quote()` is the same pure function the server runs before Stripe sees anything,
  // so the total under the finger and the amount on the card are one piece of arithmetic, not two guesses.
  const [format, setFormat] = useState<Format>(data.format);
  const [frame, setFrame] = useState<Frame>(data.addons.frame);
  const [extraPrints, setExtraPrints] = useState(data.addons.extraPrints);
  const bill = quote({ format, frame, extraPrints, campaign: c.campaign.active });

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

  // the bottom bar waits until the picture has been looked at: it slides in once the picture's lower edge has
  // scrolled clear of where the bar sits, so nothing is sold over the thing being judged
  const picRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [barOn, setBarOn] = useState(false);
  useEffect(() => {
    // clear = the picture and the row of buttons under it sit above where the bar will be
    const look = () => { const r = picRef.current?.getBoundingClientRect(); const barH = barRef.current?.offsetHeight ?? 120; setBarOn(!r || r.bottom + 56 < window.innerHeight - barH); };
    look();
    window.addEventListener('scroll', look, { passive: true }); window.addEventListener('resize', look);
    return () => { window.removeEventListener('scroll', look); window.removeEventListener('resize', look); };
  }, []);
  const viewed = useRef(false);
  useEffect(() => {
    document.body.classList.add('has-pv-bar');
    if (!viewed.current) { // one view per visit, whatever the runtime does with effects
      viewed.current = true;
      track('ViewContent', { ...PRODUCT, content_name: 'preview', content_ids: [data.format], value: quote({ format: data.format, frame: data.addons.frame, extraPrints: data.addons.extraPrints, campaign: c.campaign.active }).totalOere / 100 });
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
    track('AddToCart', { ...PRODUCT, content_ids: [next], value: quote({ format: next, frame, extraPrints, campaign: c.campaign.active }).totalOere / 100 }, { serverLog: true });
  };
  const pickFrame = (next: Frame) => { if (next === frame) return; setFrame(next); persist({ frame: next }); };
  // the size and frame chosen on the landing page: applied once, only while the order still sits on its defaults
  useEffect(() => { if (paid) forgetResume(); }, [paid]);
  useEffect(() => {
    let raw: string | null = null;
    try { raw = localStorage.getItem(PICK_KEY); localStorage.removeItem(PICK_KEY); } catch { /* private mode */ }
    if (!raw || paid || cancelled) return;
    if (data.format !== customerFormat() || data.addons.frame !== 'sort' || data.addons.extraPrints !== 0) return;
    try {
      const pick = JSON.parse(raw) as { format?: unknown; frame?: unknown };
      if (isFormat(pick.format) && pick.format !== format) pickFormat(pick.format);
      if (isFrame(pick.frame) && pick.frame !== frame) pickFrame(pick.frame);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setExtras = (next: number) => {
    const n = Math.min(MAX_EXTRA_PRINTS, Math.max(0, next));
    if (n === extraPrints) return;
    const up = n > extraPrints;
    setExtraPrints(n); persist({ extraPrints: n });
    if (up) track('AddToCart', { ...PRODUCT, content_name: 'ekstra_eksemplar', content_ids: [format], value: quote({ format, frame, extraPrints: n, campaign: c.campaign.active }).totalOere / 100 }, { serverLog: true });
  };

  // One question before payment, asked once: an extra copy. A yes writes the copy on the order (persist) and goes
  // straight on; a no goes straight on. Nothing is pre-ticked, nothing is asked twice.
  const [upsell, setUpsell] = useState(false);
  const upsellAsked = useRef(false);
  const upsellRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = upsellRef.current; if (!d) return; if (upsell && !d.open) d.showModal(); if (!upsell && d.open) d.close(); }, [upsell]);
  const order = () => {
    if (orderBusy.current || paid) return;
    if (extraPrints === 0 && !upsellAsked.current) { upsellAsked.current = true; setUpsell(true); return; }
    void checkout(extraPrints);
  };
  const answerUpsell = (yes: boolean) => {
    setUpsell(false);
    if (yes) setExtras(1);
    void checkout(yes ? 1 : 0);
  };
  const checkout = async (copies: number) => {
    if (orderBusy.current || paid) return;
    orderBusy.current = true;
    setOrdering(true); setError(null);
    try {
      const r = await fetch(`/api/checkout${q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: data.orderId, colour: false, format, frame, extraPrints: copies, t: token }) });
      const j = (await r.json().catch(() => ({}))) as { url?: string; sessionId?: string };
      if (!r.ok || !j.url) throw new Error('checkout');
      // same event_id as the server-side copy, so Meta counts one InitiateCheckout
      track('InitiateCheckout', { ...PRODUCT, content_ids: [format], value: quote({ format, frame, extraPrints: copies, campaign: c.campaign.active }).totalOere / 100 }, { eventId: j.sessionId });
      window.location.assign(j.url);
    } catch {
      // never a server string: one calm message with a second door (e-mail)
      setOrdering(false);
      orderBusy.current = false;
      setError(c.preview.checkoutError);
    }
  };

  /** "Slet mit billede nu": the deletion promise, as a button rather than a sentence. */
  const erase = async () => {
    if (eraseBusy.current) return;
    if (!window.confirm(c.preview.eraseConfirm)) return;
    eraseBusy.current = true; setErasing(true); setEraseError(null);
    try {
      const r = await fetch(`/api/preview/${data.orderId}/cancel${q}`, { method: 'POST' });
      if (!r.ok) throw new Error('delete');
      forgetResume();
      window.location.assign('/?slettet=1');
    } catch {
      setEraseError('Billedet blev ikke slettet. Prøv igen om lidt, eller skriv til os.');
      eraseBusy.current = false; setErasing(false);
    }
  };

  const saveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveState === 'sending') return;
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
      <fieldset className="cfg" id="vaelg">
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
        <Promo campaign={c.campaign} compact />
        {extraPrints === 0 ? (
          <button type="button" className="btn btn-quiet extra-add" onClick={() => setExtras(1)}>
            {c.preview.extraAdd} <span className="tabular">+ {c.campaign.active ? '0 kr.' : v.extraPrint}</span>
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
        <div className="email-row">
          <div className="field"><label htmlFor="save-email">{c.preview.saveEmail}</label><input id="save-email" type="email" inputMode="email" autoComplete="email" maxLength={200} disabled={saveState === 'sending'} value={saveEmail} onChange={(e) => setSaveEmail(e.target.value)} aria-invalid={saveState === 'invalid'} aria-describedby={saveState === 'invalid' || saveState === 'failed' ? 'save-error' : undefined} /></div>
          <button type="submit" className="btn btn-quiet" disabled={saveState === 'sending'}>{c.preview.saveCta}</button>
        </div>
      )}
      {saveState === 'invalid' && <p id="save-error" className="small" style={{ color: 'var(--error)' }} role="alert">{c.preview.saveInvalid}</p>}
      {saveState === 'failed' && <p id="save-error" className="small" style={{ color: 'var(--error)' }} role="alert">{c.preview.saveFailed}</p>}
      </form>
    </details>
  );

  return (
    <div className="container pv">
      <dialog ref={upsellRef} className="offer-dialog upsell" aria-labelledby="upsell-title" onClose={() => setUpsell(false)} onClick={(e) => { if (e.target === e.currentTarget) setUpsell(false); }}>
        <div className="offer-text">
          {c.campaign.active && <span className="promo-tag">{c.campaign.tag}</span>}
          <h2 id="upsell-title">{c.preview.upsellTitle}</h2>
          <div className="upsell-pair" aria-hidden><img src={mockup} alt="" width={160} height={119} /><img src={mockup} alt="" width={160} height={119} /></div>
          <p>{c.preview.upsellBody}</p>
          <button type="button" className="btn btn-block" onClick={() => answerUpsell(true)}>{c.preview.upsellYes}</button>
          <button type="button" className="btn btn-block btn-quiet" onClick={() => answerUpsell(false)}>{c.preview.upsellNo}</button>
        </div>
      </dialog>
      <div className="pv-left">
        {cancelled && <p className="small notice" role="status">{c.preview.cancelled}</p>}
        <ol className="pv-steps" aria-label="Hvor du er i bestillingen">
          {c.preview.steps.map((s, i) => <li key={s} className={i === 0 ? 'done' : i === 1 ? 'now' : ''} aria-current={i === 1 ? 'step' : undefined}>{s}</li>)}
        </ol>
        <h1 style={{ fontSize: 'var(--fs-h2)', maxWidth: '14em' }}>{c.preview.h2}</h1>
        <p className="caption measure">{c.preview.howTo}</p>
        <div ref={picRef}><BeforeAfter before={data.original} after={data.preview} alt="Dit billede før og efter" beforeLabel={c.preview.before} afterLabel={c.preview.after} aspect={`${data.width} / ${data.height}`} contain reveal rest={0} controls zoom={zoom ? 2.2 : 1} /></div>
        <a href="#vaelg" className="btn btn-quiet btn-block pv-next">{c.preview.nextStep} <span className="arrow" aria-hidden>↓</span></a>
        {!paid && <p className="caption measure">{c.preview.watermarkNote}</p>}
        <div className="pv-toggle">
          <button type="button" className="link-btn" onClick={() => setZoom((z) => !z)} aria-pressed={zoom}>{zoom ? c.preview.zoomOut : c.preview.zoomIn}</button>
        </div>
        {/* colour is a post-purchase option: offered in the approval mail, produced by a person, no extra charge */}
        {data.isMonochrome && <p className="caption measure">{c.preview.colourLater}</p>}
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
          {/* a phone gets the spec as one line and a link; a desktop has the room for the rows */}
          <div className={`spec${specOpen ? ' open' : ''}`}>
            <p className="spec-line small">{label} · {c.preview.specTail} <button type="button" className="link-btn spec-toggle" aria-expanded={specOpen} aria-controls="spec-rows" onClick={() => setSpecOpen((o) => !o)}>{specOpen ? c.preview.specLess : c.preview.specMore}</button></p>
            <dl id="spec-rows" className="label small spec-rows">
              {v.rows.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}
            </dl>
          </div>
          {config}
          {/* desktop: the button again, right under the total it belongs to */}
          <div className="pv-desktop-cta">{cta}</div>
        </div>
        {!paid && save}
        <p className="small" style={{ display: 'flex', gap: 'var(--s5)', flexWrap: 'wrap' }}>
          <a className="tap" href="/">{c.preview.again}</a>
          {!paid && <button type="button" className="link-btn" onClick={erase} disabled={erasing}>{erasing ? 'Sletter…' : c.preview.erase}</button>}
        </p>
        {eraseError && <p role="alert" className="small" style={{ color: 'var(--error)' }}>{eraseError} {c.email && <a href={c.emailHref}>{c.email}</a>}</p>}
      </div>
      <div ref={barRef} className={`pv-cta-bar${barOn ? ' on' : ''}`} aria-hidden={!barOn}>
        {errorLine}
        <p className="caption">{c.preview.payment}</p>
        {button}
      </div>
    </div>
  );
}
