'use client';
import { useEffect, useRef, useState } from 'react';
import BeforeAfter from './BeforeAfter';
import { PRODUCT, track } from '@/lib/analytics/client';
import MailLine from './MailLine';
import type { Copy } from '@/lib/copy';
import type { PreviewPayload } from '@/lib/preview-service';
import { quote, formatOere, oereParts, MAX_EXTRA_PRINTS, customerFormat, isFormat, isFrame, sellableProduct, PRINT_FORMAT, formatLabelFor, type Offers, type Format, type Frame, type Product } from '@/lib/pricing';
import { viewKind } from '@/lib/analytics/funnel';
import { PICK_KEY } from './SizePicker';
import Promo from './Promo';
import { forgetResume } from './ResumeBanner';

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
  const [amount, unit] = oereParts(shown);
  // only the figures are tabular: see dkkParts in lib/pricing.ts
  return <><span className="tabular">{amount}</span>&nbsp;{unit}</>;
}

/** All six wall mockups are in the page from the start, stacked; a size or a frame only changes which one is on top,
 *  so a tap answers at once — no image to wait for, however fast the customer taps through the sizes. */
function Mockup({ srcs, current, alt }: { srcs: Record<string, string>; current: string; alt: string }) {
  return (
    <div className="pv-mock">
      {Object.entries(srcs).map(([k, s]) => (
        <img key={k} src={s} className={k === current ? 'on' : ''} alt={k === current ? alt : ''} aria-hidden={k !== current} width={1200} height={960} decoding="async" />
      ))}
    </div>
  );
}

export default function PreviewPanel({ c, data: initial, cancelled, paid, token, offers }: { c: Copy; data: PreviewPayload; cancelled: boolean; paid: boolean; token?: string; offers: Offers }) {
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
  const [product, setProduct] = useState<Product>(sellableProduct(data.product, offers));
  const [format, setFormat] = useState<Format>(data.format);
  const [frame, setFrame] = useState<Frame>(data.addons.frame);
  const [extraPrints, setExtraPrints] = useState(data.addons.extraPrints);
  const bill = quote({ product, offers, format, frame, extraPrints, campaign: c.campaign.active });
  // three products, and only the framed parcel has a size, a frame and extra copies
  const isDigital = bill.product === 'digital';
  const isPrint = bill.product === 'print';
  const isFramed = bill.product === 'framed';
  const anySmall = offers.print.enabled || offers.digital.enabled;
  /**
   * What a product is called in an event. The framed parcel is identified by the size on the price
   * ladder, because that is the thing that varies and the thing Meta groups on. The two small ones
   * have no ladder — the loose print is always 20×30 — so they are identified by themselves. Sending
   * the framed size for a loose print, which is what it used to do, files a 250 kr. order under
   * whichever framed size the page happened to be sitting on.
   */
  const contentId = (p: Product = bill.product) => (p === 'framed' ? format : p);

  // landscape photographs are printed landscape: "40×30 cm (liggende)"
  const landscape = data.width > data.height;
  const variants = landscape ? c.variants.landscape : c.variants.portrait;
  const v = variants.find((x) => x.format === format) ?? variants[0];
  const label = landscape ? `${v.label} ${c.preview.landscape}` : v.label;
  // Colour is made only when the customer asks for it: the model call costs money, and most people never
  // tap it. Once it exists it is a free switch, and the choice rides to Stripe as `chosen_colour`.
  const [colourUrl, setColourUrl] = useState<string | null>(data.colour);
  const [colourOn, setColourOn] = useState(Boolean(data.colour) && (data.chosenColour || data.isMonochrome));
  const [colourBusy, setColourBusy] = useState(false);
  const [colourErr, setColourErr] = useState(false);
  const colourTimer = useRef<number | null>(null);
  useEffect(() => () => { if (colourTimer.current) window.clearTimeout(colourTimer.current); }, []);

  // one wall mockup per size and frame; an order from before they existed has only its own. The colour walls
  // are asked for by a parameter, so the page never has to refetch its payload when colour arrives.
  const mockupKey = `${format}:${frame}`;
  const base = data.mockups[mockupKey] ? data.mockups : { [mockupKey]: data.mockup };
  const mockupSrcs = Object.fromEntries(Object.entries(base)
    .filter(([key]) => !key.endsWith(':farve'))
    .map(([key, url]) => [key, colourOn && !url.includes('&c=farve') ? `${url}&c=farve` : url]));
  const mockup = mockupSrcs[mockupKey];
  // " · i farver" / " · sort-hvid", only for a photograph that had a choice to make
  const colourTail = data.isMonochrome ? ` · ${colourOn ? c.preview.summaryColour : c.preview.summaryMono}` : '';

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
  // the cookie banner sits on the order bar only while the bar is up; before that it stays at the bottom, off the picture and its switch
  useEffect(() => { document.body.classList.toggle('pv-bar-on', barOn); return () => document.body.classList.remove('pv-bar-on'); }, [barOn]);
  // …and until the bar is up it would land on the Før|Efter switch in the one second the picture arrives. Hold it
  // until they have scrolled that far, or ten seconds, whichever comes first — never longer, because the pixel and
  // the Conversions API are both gated on the answer and an unasked visitor is an invisible one.
  useEffect(() => {
    if (barOn) { document.body.classList.remove('pv-consent-hold'); return; }
    document.body.classList.add('pv-consent-hold');
    const t = setTimeout(() => document.body.classList.remove('pv-consent-hold'), 10_000);
    return () => { clearTimeout(t); document.body.classList.remove('pv-consent-hold'); };
  }, [barOn]);
  // The wait is long enough that people scroll while it runs, and a client-side navigation keeps the old
  // position — so the page whose whole job is to show the picture opened halfway down the receipt.
  useEffect(() => { window.scrollTo(0, 0); }, []);
  // Both versions are held in the browser from the start, so "Se det i sort-hvid" answers on the tap rather
  // than fetching the picture it is switching to.
  useEffect(() => {
    for (const url of [data.preview, data.colour]) if (url) { const i = new Image(); i.src = url; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const viewed = useRef(false);
  useEffect(() => {
    document.body.classList.add('has-pv-bar');
    if (!viewed.current) { // one view per visit, whatever the runtime does with effects
      viewed.current = true;
      track('ViewContent', { ...PRODUCT, content_name: 'preview', content_ids: [data.format], value: quote({ product: data.product, offers, format: data.format, frame: data.addons.frame, extraPrints: data.addons.extraPrints, campaign: c.campaign.active }).totalOere / 100 });
    }
    return () => document.body.classList.remove('has-pv-bar');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * "The customer saw their result" — the step the funnel never had. Not an API status and not a
   * navigation: the restored picture has to be decoded and at least half of it standing in the
   * viewport for a second. Until 2026-09-12 `PreviewShown` fired when the job finished, which is how
   * eleven finished photographs and zero proven looks read as the same number.
   *
   * A reload inside the half hour is the same look (viewKind), so one customer cannot become four.
   */
  const [pictureReady, setPictureReady] = useState(false);
  const [inView, setInView] = useState(false);
  const viewLogged = useRef(false);
  useEffect(() => {
    const el = picRef.current;
    if (!el) return;
    const imgs = Array.from(el.querySelectorAll('img'));
    const decoded = () => imgs.some((i) => i.complete && i.naturalWidth > 0);
    if (decoded()) { setPictureReady(true); return; }
    const on = () => { if (decoded()) setPictureReady(true); };
    for (const i of imgs) i.addEventListener('load', on);
    return () => { for (const i of imgs) i.removeEventListener('load', on); };
  }, []);
  useEffect(() => {
    const el = picRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver((entries) => { for (const e of entries) setInView(e.isIntersecting); }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!pictureReady || !inView || viewLogged.current) return;
    const t = window.setTimeout(() => {
      if (viewLogged.current) return;
      viewLogged.current = true;
      let store: Storage | null = null;
      try { store = window.localStorage; } catch { /* private mode: every visit is a first view */ }
      const kind = viewKind(store, `gf_viewed:${data.orderId}`);
      if (kind === 'same') return;
      track(kind === 'first' ? 'PreviewViewed' : 'PreviewReopened', { ...PRODUCT, content_name: 'preview', content_ids: [data.format], colour: colourOn }, { serverLog: true, orderId: data.orderId });
    }, 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pictureReady, inView]);

  /** The order row follows what the customer is looking at, so admin — and a recovered checkout — sees it. */
  const persist = (patch: { product?: Product; format?: Format; frame?: Frame; extraPrints?: number; colour?: boolean }) => {
    fetch(`/api/preview/${data.orderId}/choose${q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) }).catch(() => {});
  };
  /** Digital or framed. The server re-decides it (sellableProduct), so this is a request, not a price. */
  const pickProduct = (next: Product) => {
    if (next === product) return;
    setProduct(next); persist({ product: next });
    track('ProductSelected', { ...PRODUCT, content_name: next, content_ids: [contentId(next)], value: quote({ product: next, offers, format, frame, extraPrints, campaign: c.campaign.active }).totalOere / 100 }, { serverLog: true, orderId: data.orderId });
  };
  const pickFormat = (next: Format) => {
    if (next === format) return;
    setFormat(next); persist({ format: next });
    // the size is the price ladder: this is the real AddToCart, and it was the one step nobody measured
    track('AddToCart', { ...PRODUCT, content_ids: [next], value: quote({ product, offers, format: next, frame, extraPrints, campaign: c.campaign.active }).totalOere / 100 }, { serverLog: true, orderId: data.orderId });
    track('ProductSelected', { ...PRODUCT, content_name: 'framed', content_ids: [next], value: quote({ product, offers, format: next, frame, extraPrints, campaign: c.campaign.active }).totalOere / 100 }, { serverLog: true, pixel: false, orderId: data.orderId });
  };
  const pickFrame = (next: Frame) => { if (next === frame) return; setFrame(next); persist({ frame: next }); };
  // A black-and-white photograph turning into a person is the strongest thing on this page, so it is what
  // we lead with once it exists. The moment the customer touches the switch it becomes their choice and we
  // never move it again, and the line under the picture says plainly that the colours are a guess.
  const colourTouched = useRef(false);
  const chooseColour = (on: boolean) => { colourTouched.current = true; setColourOn(on); persist({ colour: on }); };
  // The colour job starts on its own when the restoration is done, a few seconds after this page opens.
  // Watching for it here is the difference between a tap that answers instantly and one that waits.
  useEffect(() => {
    if (!data.isMonochrome || colourUrl) return;
    let alive = true;
    let timer: number | null = null;
    const look = async () => {
      try {
        const r = await fetch(`/api/preview/${data.orderId}${q}`, { cache: 'no-store' });
        const j = (await r.json()) as { payload?: { colour?: string | null } | null };
        if (!alive) return;
        if (j.payload?.colour) {
          const url = j.payload.colour;
          const img = new Image();
          img.onload = () => { if (!alive) return; setColourUrl(url); if (!colourTouched.current) { setColourOn(true); persist({ colour: true }); } };
          img.onerror = () => { if (alive) setColourUrl(url); };
          img.src = url;
          return;
        }
      } catch { /* keep watching */ }
      if (alive) timer = window.setTimeout(() => { void look(); }, 6000);
    };
    timer = window.setTimeout(() => { void look(); }, 4000);
    return () => { alive = false; if (timer) window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.isMonochrome, data.orderId, colourUrl]);
  /** The switch waits for the picture itself: flipping the label while the colour file is still on its way
   *  leaves the customer looking at grey under a button that says the opposite — at the one moment that sells. */
  const showColour = (url: string) => {
    const go = () => { setColourUrl(url); setColourBusy(false); chooseColour(true); };
    const img = new Image();
    img.onload = go; img.onerror = go;
    img.src = url;
  };
  /** First tap starts the colour job and polls for it; every tap after that is a free switch. */
  const askColour = async () => {
    if (colourBusy) return;
    if (colourUrl) { chooseColour(!colourOn); return; }
    setColourBusy(true); setColourErr(false);
    track('ColourViewed', {}, { serverLog: true, orderId: data.orderId });
    const started = Date.now();
    const poll = async (): Promise<void> => {
      try {
        const r = await fetch(`/api/preview/${data.orderId}${q}`, { cache: 'no-store' });
        const j = (await r.json()) as { job?: { kind?: string; state?: string } | null; payload?: { colour?: string | null } | null };
        if (j.payload?.colour) { showColour(j.payload.colour); return; }
        if (j.job?.kind === 'colour' && j.job.state === 'failed') { setColourBusy(false); setColourErr(true); return; }
        if (Date.now() - started > 150_000) { setColourBusy(false); setColourErr(true); return; }
      } catch { /* a dropped connection is not an answer: keep asking until the deadline */ }
      colourTimer.current = window.setTimeout(() => { void poll(); }, 3000);
    };
    try {
      const r = await fetch(`/api/preview/${data.orderId}/colour${q}`, { method: 'POST' });
      const j = (await r.json().catch(() => ({}))) as { colour?: string | null };
      if (j.colour) { showColour(j.colour); return; }
      if (!r.ok) throw new Error('colour');
      colourTimer.current = window.setTimeout(() => { void poll(); }, 3000);
    } catch { setColourBusy(false); setColourErr(true); }
  };
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
    if (up) track('AddToCart', { ...PRODUCT, content_name: 'ekstra_eksemplar', content_ids: [format], value: quote({ product, offers, format, frame, extraPrints: n, campaign: c.campaign.active }).totalOere / 100 }, { serverLog: true, orderId: data.orderId });
  };

  /**
   * The buy button goes to payment. It used to open a modal first — "skal der et ekstra eksemplar
   * med?" — between the decision and the till, on a phone, for an audience of 45–70. The extra copy
   * is an option beside the size and the frame now, priced and counted where the rest of the
   * configuration is, and nothing stands between the button and Stripe.
   */
  const order = () => {
    if (orderBusy.current || paid) return;
    // logged before anything network-shaped happens: a click that dies at Stripe is still a click
    track('CheckoutClicked', { ...PRODUCT, content_name: bill.product, content_ids: [contentId()], value: bill.totalOere / 100 }, { serverLog: true, pixel: false, orderId: data.orderId });
    void checkout(extraPrints);
  };
  // back from Stripe (bfcache restores the page as it was, mid-"Åbner betaling…"): the button must work again
  useEffect(() => {
    const back = () => { orderBusy.current = false; setOrdering(false); };
    window.addEventListener('pageshow', back);
    return () => window.removeEventListener('pageshow', back);
  }, []);
  const checkout = async (copies: number) => {
    if (orderBusy.current || paid) return;
    orderBusy.current = true;
    setOrdering(true); setError(null);
    try {
      const r = await fetch(`/api/checkout${q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: data.orderId, colour: colourOn, product, format, frame, extraPrints: copies, t: token }) });
      const j = (await r.json().catch(() => ({}))) as { url?: string; sessionId?: string };
      if (!r.ok || !j.url) throw new Error('checkout');
      const value = quote({ product, offers, format, frame, extraPrints: copies, campaign: c.campaign.active }).totalOere / 100;
      // same event_id as the server-side copy, so Meta counts one InitiateCheckout
      track('InitiateCheckout', { ...PRODUCT, content_name: bill.product, content_ids: [contentId()], value }, { eventId: j.sessionId, orderId: data.orderId });
      // …and a created session is not a payment page anyone saw. This is the last thing we can observe
      // before the browser leaves: everything after it belongs to Stripe and to the webhook.
      track('CheckoutRedirected', { ...PRODUCT, content_name: bill.product, value }, { serverLog: true, pixel: false, orderId: data.orderId });
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
  // the button says the action and the amount it will charge, so nothing about the next screen is a surprise
  const button = (
    <button type="button" className="btn btn-block" onClick={order} disabled={ordering || paid}>
      {paid ? 'Bestilt' : ordering ? 'Åbner betaling…' : <>{isDigital ? c.preview.ctaDigital : isPrint ? c.preview.ctaPrint : c.preview.ctaShort} <span aria-hidden>·</span> <Total oere={bill.totalOere} /></>}
    </button>
  );

  const cta = (
    <div className="pv-cta">
      {errorLine}
      <p className="caption" style={{ textAlign: 'center' }}>{c.preview.payment}</p>
      {button}
      <p className="caption" style={{ textAlign: 'center' }}>{c.preview.under} {c.preview.payWhenPre} <Total oere={bill.totalOere} /> {isDigital ? c.preview.payWhenPostDigital : c.preview.payWhenPost}</p>
    </div>
  );

  /**
   * The three products, each shown as the object it is rather than as a sentence with a price at the
   * end of it. The audience is 45–70 on a phone: a small picture of a framed print, a loose print and
   * the picture on a screen answers "what am I actually getting" before any words do, and the price
   * gets its own line under the name instead of hiding in grey body text.
   */
  const pic = colourOn && colourUrl ? colourUrl : data.preview;
  const productChoices = ([
    { key: 'framed' as Product, name: c.preview.productFramed, price: c.preview.productFramedPrice, hint: c.preview.productFramedHint, thumb: <img src={mockup} alt="" /> },
    ...(offers.print.enabled ? [{ key: 'print' as Product, name: c.preview.productPrint, price: c.preview.productPrintPrice, hint: c.preview.productPrintHint, thumb: <span className="thumb-paper"><img src={pic} alt="" /></span> }] : []),
    ...(offers.digital.enabled ? [{ key: 'digital' as Product, name: c.preview.productDigital, price: c.preview.productDigitalPrice, hint: c.preview.productDigitalHint, thumb: <span className="thumb-screen"><img src={pic} alt="" /></span> }] : []),
  ]);

  // The steps are numbered as they are shown: the product choice only exists while the digital offer
  // is on, and a "2 Størrelse" under no step 1 reads as a page that lost something.
  let step = 0;
  const n = () => <span className="n">{++step}</span>;

  const config = (
    <div className="config">
      {anySmall && (
        <fieldset className="cfg">
          <legend className="cfg-label">{n()}{c.preview.productTitle}</legend>
          <div className="products-row">
            {productChoices.map(({ key, name, price, hint, thumb }) => (
              <label key={key} className={`product${key === product ? ' is-on' : ''}`}>
                <input type="radio" name="produkt" value={key} checked={key === product} onChange={() => pickProduct(key)} />
                <span className="pick-dot" aria-hidden />
                <span className={`product-thumb is-${key}`} aria-hidden>{thumb}</span>
                <span className="product-text">
                  {key === 'framed' && <span className="tag">{c.preview.recommended}</span>}
                  <b>{name}</b>
                  {/* static, so no tabular figures: nothing here animates, and tabular punctuation
                      pushes the stop in "kr." a digit's width away from the r */}
                  <span className="product-price">{price}</span>
                  <span className="caption">{hint}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="caption">{c.preview.productNote}</p>
        </fieldset>
      )}
      {isFramed && (
      <fieldset className="cfg">
        <legend className="cfg-label">{n()}{c.preview.sizeTitle}</legend>
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
      )}

      {isFramed && (
      <fieldset className="cfg">
        <legend className="cfg-label">{n()}{c.preview.frameTitle}</legend>
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
      )}

      {isFramed && (
      <div className="cfg extra">
        <p className="cfg-label">{n()}{c.preview.extraLabel}</p>
        <p className="cfg-title">{c.preview.extraTitle}</p>
        <p className="caption measure">{c.preview.extraLead}</p>
        <Promo campaign={c.campaign} compact />
        {extraPrints === 0 ? (
          <button type="button" className="btn btn-quiet btn-block extra-add" onClick={() => setExtras(1)}>
            {c.campaign.active ? c.preview.extraAddFree : <>{c.preview.extraAdd} <span className="tabular">· {v.extraPrint}</span></>}
          </button>
        ) : (
          <div className="stepper" role="group" aria-label={c.preview.extraTitle}>
            <button type="button" onClick={() => setExtras(extraPrints - 1)} aria-label={c.preview.extraRemove}>−</button>
            <span aria-live="polite"><b className="tabular">{extraPrints}</b> {extraPrints === 1 ? c.preview.extraOne : c.preview.extraMany}</span>
            <button type="button" onClick={() => setExtras(extraPrints + 1)} aria-label={c.preview.extraAdd} disabled={extraPrints >= MAX_EXTRA_PRINTS}>+</button>
          </div>
        )}
      </div>
      )}
      <div className="cfg bill">
        <p className="cfg-label">{n()}{c.preview.summaryTitle}</p>
        <div className="bill-head">
          <img src={isFramed ? mockup : (colourOn && colourUrl ? colourUrl : data.preview)} alt={c.preview.yourPhoto} width={96} height={77} />
          <p><b>{c.preview.yourPhoto}</b><span>{isFramed
            ? <>{label} · {frame === 'eg' ? 'egetræsramme' : 'sort ramme'}{colourTail} · {1 + extraPrints} {extraPrints === 0 ? c.preview.copiesOne : c.preview.copiesMany}</>
            : <>{isPrint ? `${c.preview.printSummary}` : c.preview.digitalSummary}{colourTail}</>}</span></p>
        </div>
        <dl className="bill-lines">
          {bill.lines.map((l) => (
            <div key={l.key}>
              <dt>{l.quantity > 1 ? `${l.quantity} × ` : ''}{l.short}{l.note ? <span className="caption">{l.note}</span> : null}</dt>
              <dd className="tabular">{formatOere(l.amountOere)}</dd>
            </div>
          ))}
          {isDigital
            ? <div><dt>{c.preview.deliveryDigital}</dt><dd>{c.preview.deliveryDigitalValue}</dd></div>
            : <div><dt>{c.preview.shipping}</dt><dd>{c.preview.shippingFree}</dd></div>}
        </dl>
        <p className="bill-total"><span>{c.preview.total}</span> <b><Total oere={bill.totalOere} /></b></p>
        <p className="caption">{c.preview.vat}</p>
        {/* the three promises, where the doubt is: right above the button */}
        <ul className="guarantee">{(isDigital ? c.preview.trustDigital : c.preview.trust).map((t) => <li key={t}>{t}</li>)}</ul>
        {/* the whole path from this button to the thing in their hands, in the order it happens */}
        <div className="pv-after">
          <p className="cfg-title">{c.preview.afterTitle}</p>
          <ol className="pv-after-steps">
            {(isDigital ? c.preview.afterStepsDigital : isPrint ? c.preview.afterStepsPrint : c.preview.afterSteps).map(([k, v2]) => <li key={k}><b>{k}</b><span>{v2}</span></li>)}
          </ol>
          <p className="caption measure">{c.preview.afterHelp}</p>
        </div>
        {isFramed && <p className="caption measure">{c.preview.gift}</p>}
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
      <div className="pv-left">
        {cancelled && <p className="small notice" role="status">{c.preview.cancelled}</p>}
        <ol className="pv-steps" aria-label="Hvor du er i bestillingen">
          {c.preview.steps.map((s, i) => <li key={s} className={i === 0 ? 'done' : i === 1 ? 'now' : ''} aria-current={i === 1 ? 'step' : undefined}>{s}</li>)}
        </ol>
        <h1 style={{ fontSize: 'var(--fs-h2)', maxWidth: '14em' }}>{c.preview.h2}</h1>
        <p className="caption measure">{c.preview.howTo}</p>
        <div ref={picRef}><BeforeAfter before={data.original} after={colourOn && colourUrl ? colourUrl : data.preview} alt="Dit billede før og efter" beforeLabel={c.preview.before} afterLabel={c.preview.after} aspect={`${data.width} / ${data.height}`} contain rest={0} controls priority zoom={zoom ? 2.2 : 1} /></div>
        <div className="pv-toggle">
          {data.isMonochrome && (
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => void askColour()} aria-pressed={colourOn} disabled={colourBusy}>
              {colourBusy ? c.preview.colourBusy : colourOn ? c.preview.colourBack : c.preview.colourCta}
            </button>
          )}
          <button type="button" className="link-btn" onClick={() => setZoom((z) => !z)} aria-pressed={zoom}>{zoom ? c.preview.zoomOut : c.preview.zoomIn}</button>
        </div>
        {colourBusy && <p className="caption measure pv-wait" role="status"><span className="pv-wait-dot" aria-hidden />{c.preview.colourWait}</p>}
        {colourErr && <p className="caption measure error" role="alert">{c.preview.colourFailed}</p>}
        {colourOn && <p className="caption measure">{c.preview.colourNote}</p>}
        <a href="#videre" className="btn btn-quiet btn-block pv-next" onClick={(e) => { const el = document.getElementById('videre'); if (!el) return; e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{isDigital ? c.preview.nextStepDigital : c.preview.nextStep} <span className="arrow" aria-hidden>↓</span></a>
        {!paid && <p className="caption measure">{c.preview.watermarkNote}</p>}
        <p className="caption measure">{isDigital ? c.preview.nextDigital : c.preview.next}</p>
        {/* the money answer, in the content on a phone (the fixed bar stays two rows) and again under the desktop button */}
        <p className="small measure pv-money"><b style={{ fontWeight: 600 }}>{c.preview.under}</b> {c.preview.payWhenPre} <Total oere={bill.totalOere} /> {isDigital ? c.preview.payWhenPostDigital : c.preview.payWhenPost}</p>
      </div>
      <div className="pv-right">
        {/* desktop: the decision first, the object and the label under it */}
        <div className="pv-desktop-cta">{cta}</div>
        <div className="pv-grid">
          {/* the object first, then what it is, then the price — the decisions come after the value.
              A customer who has chosen the file is not shown a wall and a frame they are not buying. */}
          <h2 id="videre" style={{ fontSize: 'var(--fs-h2)', maxWidth: '14em' }}>{isDigital ? c.preview.digitalSummary : isPrint ? c.preview.printTitle : c.preview.hang}</h2>
          {isDigital
            ? <p className="caption measure">{c.preview.digitalNote}</p>
            : isPrint
            ? <>
                {/* a loose print shown as one: white margin, soft shadow — the same object the landing
                    page uses in "Fra skuffen til væggen", never a wall frame nobody is buying */}
                <div className="pv-print"><span className="print"><img src={colourOn && colourUrl ? colourUrl : data.preview} alt={`Dit billede som løst print i ${formatLabelFor(PRINT_FORMAT, landscape)}`} width={data.width} height={data.height} decoding="async" /></span></div>
                <h2 style={{ fontSize: 'var(--fs-lead)', fontFamily: 'var(--display)', fontWeight: 500 }}>{c.preview.printSpecTitle}</h2>
                <p className="caption measure">{c.preview.printNote}</p>
                <dl className="label small spec-rows is-open">
                  {c.preview.printRows.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}
                </dl>
              </>
            : <>
                <Mockup srcs={mockupSrcs} current={mockupKey} alt={`Dit billede indrammet i ${label}, ${frame === 'eg' ? 'egetræsramme' : 'sort ramme'}`} />
                <h2 style={{ fontSize: 'var(--fs-lead)', fontFamily: 'var(--display)', fontWeight: 500 }}>{v.specTitle}</h2>
                <p className="caption measure">{c.produkt.lead}</p>
                {/* a phone gets the spec as one line and a link; a desktop has the room for the rows */}
                <div className={`spec${specOpen ? ' open' : ''}`}>
                  <p className="spec-line small">{label} · {c.preview.specTail} <button type="button" className="link-btn spec-toggle" aria-expanded={specOpen} aria-controls="spec-rows" onClick={() => setSpecOpen((o) => !o)}>{specOpen ? c.preview.specLess : c.preview.specMore}</button></p>
                  <dl id="spec-rows" className="label small spec-rows">
                    {v.rows.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}
                  </dl>
                </div>
              </>}
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
