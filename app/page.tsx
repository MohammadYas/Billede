import { copy } from '@/lib/copy';
import { getExamples, type Example } from '@/lib/examples';
import { exampleSrcSet, GRID_SIZES, HERO_SIZES } from '@/lib/images';
import BeforeAfter, { type Source } from '@/components/BeforeAfter';
import Compare from '@/components/Compare';
import ColourExample from '@/components/ColourExample';
import Framed from '@/components/Framed';
import SizePicker from '@/components/SizePicker';
import Promo from '@/components/Promo';
import ResumeBanner from '@/components/ResumeBanner';
import UploadFlow from '@/components/UploadFlow';
import OpenFlowButton from '@/components/OpenFlowButton';
import StickyCtaMount from '@/components/StickyCtaMount';
import HeroViewContent from '@/components/HeroViewContent';
import Consent from '@/components/Consent';
import Footer from '@/components/Footer';
import MailLine from '@/components/MailLine';
import Wordmark from '@/components/Wordmark';
import DeletedNotice from '@/components/DeletedNotice';
import JsonLd from '@/components/JsonLd';
import ProductPhotos from '@/components/ProductPhotos';
import { getProductPhotos } from '@/lib/product-photos';

// Static, regenerated hourly: an ad click hits the CDN, not a cold function. The ?order= resume lives in UploadFlow.
export const revalidate = 3600;

const src = (e: Example, side: 'before' | 'after', sizes: string): Source => ({
  src: side === 'before' ? e.before : e.after,
  srcSetJpg: exampleSrcSet(e, side, 'jpg'),
  srcSetWebp: exampleSrcSet(e, side, 'webp'),
  sizes,
});
const small = (u: string) => u.replace(/\.jpg$/, '-480.jpg');

/**
 * "Bryllup foran landsbykirken, ca. 1954. Eksempelbillede." → subject in ink, year in ink-2. The trailing
 * provenance goes to the title attribute; the section below the grid says out loud what the examples are.
 */
function Caption({ text }: { text: string }) {
  const m = text.match(/^(.+?),\s*(ca\.\s*\d{4}|\d{4}|sommeren \d{4}|årstal ukendt)\.\s*(.*)$/);
  if (!m) return <span className="caption">{text}</span>;
  return <span className="caption" title={m[3] || undefined}><b>{m[1]}</b>, {m[2]}</span>;
}

/** The primary button with the paid object beside it, so "gratis" never stands alone. */
function CtaRow({ cta, value, className = '' }: { cta: string; value: string; className?: string }) {
  return (
    <div className={`cta-row ${className}`.trim()}>
      <OpenFlowButton>{cta}</OpenFlowButton>
      <span className="value-line">{value}</span>
    </div>
  );
}

export default async function Page() {
  const c = copy();
  const examples = getExamples();
  const hero = examples[0] ?? null;
  const grid = examples.slice(1, 7);
  // the birthday cake's original only had a crease and a slight cast: the whole picture barely changes in a fade,
  // its close-up does — so that card shows the close-up (the same restoration, a tighter crop)
  const CLOSE_UP = new Set(['foedselsdag-1985']);
  const synthetic = examples.length > 0 && examples.every((e) => /eksempelbillede/i.test(e.caption));
  const placeholders = examples.some((e) => e.placeholder);
  const jul = c.season === 'jul';
  // the face that proves "it still looks like them": the hero's own close-up, the same crop before and after
  const face = examples.find((e) => e.detail && /ansigt|øjne/i.test(e.detail.label))?.detail ?? hero?.detail ?? null;
  const heroH = hero ? Math.round((480 * hero.height) / hero.width) : 0;
  // photographs of the real object, if the owner has taken any yet (public/produkt/README.md)
  const productPhotos = getProductPhotos();

  return (
    <>
      {c.campaign.active && <div className="announce"><span>{c.campaign.bar}</span></div>}
      <header className="nav wrap">
        <div className="container nav-row">
          <Wordmark />
          <div className="nav-right">
            <span className="caption">{c.priceFrom} · fri fragt</span>
            <OpenFlowButton className="btn btn-sm nav-cta">{c.hero.ctaShort}</OpenFlowButton>
          </div>
        </div>
      </header>
      <main>
        <JsonLd />
        <DeletedNotice text={c.preview.erased} />

        {/* Hero — the free look, then the paid object: a photograph, a print, a frame, a price. The proof beside it. */}
        <section id="hero" className="wrap" aria-label="Se hvad restaureringen gør">
          <HeroViewContent targetId="hero" />
          <div className="container hero">
            <div className="hero-copy">
              <p className="eyebrow">{c.hero.eyebrow}</p>
              <h1>{c.hero.h1}</h1>
              <p className="lead">{c.hero.sub}</p>
              {jul && c.hero.deadline && <p className="deadline">{c.hero.deadline}</p>}
              <div className="hero-cta">
                <OpenFlowButton>{c.hero.cta}</OpenFlowButton>
                {/* most of the audience is scrolling Facebook while the photograph lies in a drawer at home;
                    without this the visit is simply over (three days of ads: 11 of 86 opened the upload, 2 had a picture) */}
                <OpenFlowButton className="link-btn hero-nophoto" detail="nophoto">{c.upload.noPhoto}</OpenFlowButton>
                {c.hero.priceLadder.length > 0 && (
                  <div className="hero-price-ladder" aria-label="Priser efter gratis preview">
                    <p className="hero-price-lead">{c.hero.priceLadderLead}</p>
                    <div className="hero-price-options">
                      {c.hero.priceLadder.map((option) => (
                        <span key={option.key} className={`hero-price-option is-${option.key}`}>
                          <b>{option.label}</b>
                          <strong>{option.price}</strong>
                          <small>{option.detail}</small>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <ul className="hero-trust" aria-label="Det skal du vide">
                  {c.hero.trust.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
            </div>
            {hero && (
              <figure className="hero-proof">
                <Compare mode="fade" initialBefore before={src(hero, 'before', HERO_SIZES)} after={src(hero, 'after', HERO_SIZES)} alt={`Før og efter: ${hero.caption.replace(/\.$/, '')}`} aspect="4 / 5" />
                <figcaption><Caption text={hero.caption} /><span className="caption fade-hint">{c.hero.fadeHint}</span></figcaption>
              </figure>
            )}
          </div>
        </section>

        <div className="wrap"><div className="container trust">{c.tryghed.map((t, i) => <span key={i}>{t}</span>)}</div></div>

        {/* From the drawer to the wall — the same photograph as a print, a frame and a parcel: what the price buys */}
        {hero && (
          <section className="wrap section" aria-labelledby="skuffen">
            <div className="container chain-section">
              <div className="chain-head">
                <h2 id="skuffen">{c.skuffen.h2}</h2>
                <p className="lead">{c.skuffen.lead}</p>
              </div>
              <ol className="chain" aria-label="Fra dit gamle billede til det færdige produkt">
                <li className="chain-step">
                  <div className="chain-media"><img src={small(hero.before)} alt={`Det gamle billede, som det er nu: ${hero.caption.replace(/\.$/, '')}`} width={480} height={heroH} loading="lazy" decoding="async" /></div>
                  <span className="chain-label"><span className="n">1</span>{c.skuffen.chain[0]}</span>
                </li>
                <li className="chain-step">
                  <div className="chain-media"><img src={small(hero.after)} alt="Det samme billede, restaureret" width={480} height={heroH} loading="lazy" decoding="async" /></div>
                  <span className="chain-label"><span className="n">2</span>{c.skuffen.chain[1]}</span>
                </li>
                <li className="chain-step">
                  <div className="chain-media is-print"><span className="print"><img src={small(hero.after)} alt="Det restaurerede billede som print på mat fotopapir" width={480} height={heroH} loading="lazy" decoding="async" /></span></div>
                  <span className="chain-label"><span className="n">3</span>{c.skuffen.chain[2]}</span>
                </li>
                <li className="chain-step">
                  <div className="chain-media is-frame">
                    {hero.mockup
                      ? <img src={hero.mockup.replace(/\.jpg$/, '-480.jpg')} alt={`Det færdige produkt: ${c.formatLabel} i sort ramme på væggen`} width={480} height={384} loading="lazy" decoding="async" />
                      : <Framed src={small(hero.after)} alt={`Det færdige produkt: ${c.formatLabel} i ramme`} width={480} height={heroH} />}
                  </div>
                  <span className="chain-label"><span className="n">4</span>{c.skuffen.chain[3]}</span>
                </li>
              </ol>
              <div className="value">
                <h3>{c.skuffen.valueH}</h3>
                <ul className="value-list">{c.skuffen.value.map((v) => <li key={v}>{v}</li>)}</ul>
                <CtaRow cta={c.hero.cta} value={c.hero.valueLine} />
              </div>
            </div>
          </section>
        )}

        {/* How it works — three steps, and the one thing a visitor is afraid of: posting the original */}
        <section className="wrap section section-quiet" aria-labelledby="saadan">
          <div className="container how">
            <div className="how-head">
              <div><h2 id="saadan">{c.saadan.h2}</h2><p className="lead">{c.saadan.note}</p></div>
              <aside className="callout" aria-label={c.original.h2}><b>{c.original.h2}</b><span>{c.original.p}</span></aside>
            </div>
            <ol className="steps">
              {c.saadan.steps.map((s, i) => (
                <li key={i} className="step">
                  <div className={`step-media${i === 2 ? ' is-frame' : ''}`} aria-hidden>
                    {hero && i === 0 && <img src={small(hero.before)} alt="" width={480} height={heroH} loading="lazy" />}
                    {hero && i === 1 && <img src={small(hero.after)} alt="" width={480} height={heroH} loading="lazy" />}
                    {hero && i === 2 && <Framed src={small(hero.after)} alt="" width={480} height={heroH} />}
                  </div>
                  <div className="step-text"><span className="n">{i + 1}</span><h3>{c.saadan.titles[i]}</h3><p>{s}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* It still has to be them — the same face, before and after, under the finger; the process that makes sure */}
        {face && (
          <section className="wrap section" aria-labelledby="ligne">
            <div className="container ligne">
              <figure className="ligne-pic">
                <BeforeAfter before={{ src: face.before, srcSetWebp: face.before.replace(/\.jpg$/, '.webp') }} after={{ src: face.after, srcSetWebp: face.after.replace(/\.jpg$/, '.webp') }} alt={`Samme ansigt før og efter restaureringen: ${face.label.toLowerCase()}`} aspect="1 / 1" reveal beforeLabel={c.preview.before} afterLabel={c.preview.after} />
                <figcaption className="caption">{c.ligne.hint}</figcaption>
              </figure>
              <div className="ligne-text">
                <h2 id="ligne">{c.ligne.h2}</h2>
                <p className="lead">{c.ligne.p}</p>
                <CtaRow cta={c.hero.cta} value={c.hero.valueLine} />
              </div>
            </div>
          </section>
        )}

        {/* Examples — six more of the same object */}
        {grid.length > 0 && (
          <section className="wrap section" aria-labelledby="eksempler" style={{ paddingTop: 0 }}>
            <div className="container">
              <div className="ex-head"><h2 id="eksempler">{c.eksempler.h2}</h2><p className="lead">{c.eksempler.lead}</p><p className="ex-how">{c.eksempler.how}</p></div>
              <div className="ex-grid">
                {grid.map((e) => {
                  const closeUp = CLOSE_UP.has(e.id) && e.detail ? e.detail : null;
                  const aspect = `${e.width} / ${e.height}`; // the close-up is square; shown in the same frame as the rest, face centred
                  const alt = `Før og efter: ${e.caption.replace(/\.$/, '')}`;
                  return (
                    <figure key={e.id} className="ex-card">
                      <div className="ex-media">
                      {closeUp
                        ? <Compare mode="fade" before={{ src: closeUp.before, srcSetWebp: closeUp.before.replace(/\.jpg$/, '.webp') }} after={{ src: closeUp.after, srcSetWebp: closeUp.after.replace(/\.jpg$/, '.webp') }} alt={alt} aspect={aspect} />
                        : e.colour
                        ? <ColourExample before={src(e, 'before', GRID_SIZES)} after={src(e, 'after', GRID_SIZES)} colour={e.colour} alt={alt} aspect={aspect} on={c.eksempler.colourOn} off={c.eksempler.colourOff} />
                        : <Compare mode="fade" before={src(e, 'before', GRID_SIZES)} after={src(e, 'after', GRID_SIZES)} alt={alt} aspect={aspect} />}
                      </div>
                      <figcaption className="ex-cap"><Caption text={e.caption} />{closeUp && <span className="caption">{c.eksempler.detail}: {closeUp.label.toLowerCase()}</span>}</figcaption>
                    </figure>
                  );
                })}
              </div>
              {placeholders ? <p className="caption ex-note">{c.eksempler.placeholderNote}</p> : synthetic ? <p className="caption ex-note">{c.eksempler.syntheticNote}</p> : null}
            </div>
          </section>
        )}

        {/* Offer — the object, the spec, the sizes, the price, the button */}
        <section className="wrap section" aria-labelledby="produkt" style={{ paddingTop: 0 }}>
          <div className="container offer">
            <div className={`offer-shot${hero?.mockup ? ' is-wall' : ''}`}>
              {hero?.mockup
                ? <img src={hero.mockup} srcSet={`${hero.mockup.replace(/\.jpg$/, '-480.jpg')} 480w, ${hero.mockup} 1200w`} sizes="(min-width: 1024px) 560px, 100vw" alt={`Indrammet ${c.formatLabel} på en væg: ${hero.caption.replace(/\.$/, '')}`} width={1200} height={960} loading="lazy" />
                : hero && <Framed src={hero.after.replace(/\.jpg$/, '-800.jpg')} alt={`Indrammet ${c.formatLabel}: ${hero.caption.replace(/\.$/, '')}`} width={800} height={Math.round((800 * hero.height) / hero.width)} />}
            </div>
            <div className="offer-spec">
              <div className="o-head" style={{ display: 'grid', gap: 'var(--s3)' }}>
                <h2 id="produkt">{c.produkt.h2}</h2>
                <p className="lead">{c.produkt.lead}</p>
              </div>
              <dl className="label o-rows">
                {c.produkt.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
              <SizePicker
                sizes={c.produkt.sizeCards.map((x) => ({ format: x.format, label: x.label, price: x.price, hint: x.hint, recommended: x.recommended }))}
                frames={[['sort', c.preview.frameSort, c.preview.frameSortHint], ['eg', c.preview.frameEg, c.preview.frameEgHint]]}
                initialFormat={c.format}
                t={{ sizeTitle: c.produkt.sizesTitle, sizeNote: c.produkt.sizesNote, frameTitle: c.preview.frameTitle, frameNote: c.preview.frameNote, recommended: c.produkt.recommended, priceNote: c.offer.priceNote, allIn: c.offer.allIn, carry: c.produkt.carry }}
              />
              <div className="o-promo" style={{ display: 'grid', gap: 'var(--s3)' }}>
                <Promo campaign={c.campaign} />
                {c.offer.anchor && <p className="caption" style={{ maxWidth: '30em' }}>{c.offer.anchor}</p>}
                {c.offer.deadline && <p className="deadline">{c.offer.deadline}{c.hero.countdown ? ` ${c.hero.countdown}.` : ''}</p>}
              </div>
              <ul className="guarantee o-guarantee">
                {c.offer.guarantee.map((g) => <li key={g}>{g}</li>)}
              </ul>
              <div className="offer-cta o-cta">
                <CtaRow cta={c.offer.cta} value={c.hero.valueLine} />
              </div>
            </div>
          </div>
        </section>

        {/* The object as a photograph, not a render. Renders nothing until the owner has shot it. */}
        <ProductPhotos photos={productPhotos} title="Sådan kommer det frem til dig." lead="Billeder af det, vi rent faktisk sender – ikke tegninger." />

        {/* Gaven — why this is the gift they cannot buy themselves */}
        <section className="wrap section section-quiet" aria-labelledby="gave">
          <div className="container gift">
            <div className="gift-head">
              <h2 id="gave">{c.gave.h2}</h2>
              <p className="lead" style={{ maxWidth: '24em' }}>{c.gave.lead}</p>
            </div>
            <dl className="gift-points">
              {c.gave.points.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          </div>
        </section>

        {/* Who answers — a company, an address, a deadline for the answer */}
        <div className="wrap" style={{ paddingTop: 'var(--s7)' }}>
          <div className="container strip">
            <span><b>{c.tryghed[2]}</b></span>
            {c.email && <span>Spørgsmål? <a href={c.emailHref}>{c.email}</a> eller <a href="/kontakt">kontaktformularen</a></span>}
            <span>Vi svarer på mail inden 24 timer.</span>
          </div>
        </div>

        <section className="wrap section" aria-labelledby="spoergsmaal">
          <div className="container ed">
            <h2 id="spoergsmaal">{c.spoergsmaal.h2}</h2>
            <div style={{ maxWidth: '40em' }}>
              {c.spoergsmaal.items.map((it, i) => (
                <details className="q" key={i}>
                  <summary>{it.q}</summary>
                  <div className="a"><p>{it.a}</p>{it.nophoto && <p><OpenFlowButton className="link-btn" detail="nophoto">{c.upload.noPhotoCta}</OpenFlowButton></p>}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="wrap" aria-label="Afslutning" style={{ paddingBottom: 'var(--s9)' }}>
          <div className="container close-block">
            <p className="closing">{c.slut.line}</p>
            <OpenFlowButton style={{ minWidth: 260 }}>{c.slut.cta}</OpenFlowButton>
          </div>
        </section>
        {c.offer.kontakt && <div className="wrap" style={{ paddingBottom: 'var(--s6)' }}><div className="container"><MailLine className="caption" text={c.offer.kontakt} email={c.email} href={c.emailHref} /></div></div>}
      </main>
      <Footer />
      {/* The launch offer used to open by itself 1,8 s after the page painted — a modal in front of the
          picture, for an audience arriving from Facebook on a phone. It is ordinary content now: the
          bar at the top of this page, the Promo block by the price, and the step beside the size on
          the order page. Nothing interrupts. */}
      <ResumeBanner working={c.resume.working} ready={c.resume.ready} cta={c.resume.cta} again={c.resume.again} retry={c.resume.retry} />
      <UploadFlow c={c} />
      <StickyCtaMount label={c.sticky} />
      <Consent text={c.cookie.text} accept={c.cookie.accept} decline={c.cookie.decline} />
    </>
  );
}
