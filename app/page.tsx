import { copy } from '@/lib/copy';
import { getExamples, type Example } from '@/lib/examples';
import { getFounder } from '@/lib/founder';
import { exampleSrcSet, GRID_SIZES, HERO_SIZES } from '@/lib/images';
import BeforeAfter, { type Source } from '@/components/BeforeAfter';
import Compare from '@/components/Compare';
import ColourExample from '@/components/ColourExample';
import UploadFlow from '@/components/UploadFlow';
import OpenFlowButton from '@/components/OpenFlowButton';
import StickyCtaMount from '@/components/StickyCtaMount';
import HeroViewContent from '@/components/HeroViewContent';
import Consent from '@/components/Consent';
import Footer from '@/components/Footer';
import Wordmark from '@/components/Wordmark';

export const dynamic = 'force-dynamic';

const src = (e: Example, side: 'before' | 'after', sizes: string): Source => ({
  src: side === 'before' ? e.before : e.after,
  srcSetJpg: exampleSrcSet(e, side, 'jpg'),
  srcSetWebp: exampleSrcSet(e, side, 'webp'),
  sizes,
});

/** "Soldat og ung kvinde, ca. 1916. Arkivfoto, …" → subject in ink, date in ink-2, credit to title. */
function Caption({ text, credit = false }: { text: string; credit?: boolean }) {
  const m = text.match(/^(.+?),\s*(ca\.\s*\d{4}|\d{4})\.\s*(.*)$/);
  if (!m) return <span className="caption">{text}</span>;
  // the hero says "arkivfoto" out loud so nobody reads Gunhild as a customer; the grid keeps the credit in the title
  return <span className="caption" title={m[3] || undefined}><b>{m[1]}</b>, {m[2]}{credit && m[3] ? ' · arkivfoto' : '.'}</span>;
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const c = copy();
  const examples = getExamples();
  const hero = examples[0] ?? null;
  const stepEx = examples[1] ?? examples[0] ?? null;
  const gridExamples = examples.slice(1, 7);
  const f = getFounder();
  const showFounder = Boolean(f.portrait && f.why.length > 0);
  const placeholders = examples.some((e) => e.placeholder);
  // "Tæt på" must open with a pair where the difference is unmistakable, so the (soft) hero pair goes last
  const details = [...examples.filter((e) => e.detail && e.id !== hero?.id), ...examples.filter((e) => e.detail && e.id === hero?.id)].slice(0, 6);
  const productMock = (examples.find((e) => e.mockup && e.id !== hero?.id) ?? hero)?.mockup ?? null;
  const resumeOrder = typeof sp.order === 'string' && /^[0-9a-f-]{36}$/.test(sp.order) ? sp.order : null;

  return (
    <>
      <main>
        <header className="wrap">
          <div className="container site-head">
            <Wordmark />
            <span className="caption">{c.price} · fri fragt</span>
          </div>
        </header>

        {/* Hero — the photograph is the argument. */}
        <section id="hero" aria-label="Eksempel på restaurering">
          <HeroViewContent targetId="hero" />
          <div className="hero-grid">
            <div className="hero-media">
              {hero ? (
                <BeforeAfter before={src(hero, 'before', HERO_SIZES)} after={src(hero, 'after', HERO_SIZES)} alt={`Før og efter: ${hero.caption}`} aspect="4 / 3" reveal rest={50} priority />
              ) : (
                <div className="ba" style={{ aspectRatio: '4 / 3' }} />
              )}
            </div>
            {hero && <p className="hero-caption"><Caption text={hero.caption} credit /></p>}
          </div>
          <div className="wrap">
            <div className="container hero-text">
              <h1>{c.hero.h1}</h1>
              <p className="lead">{c.hero.sub}</p>
              <div className="hero-cta">
                <OpenFlowButton style={{ minWidth: 240 }}>{c.hero.cta}</OpenFlowButton>
                <span className="caption">{c.hero.small}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="wrap"><div className="container trust">{c.tryghed.map((t, i) => <span key={i}>{t}</span>)}</div></div>

        {/* Sådan fungerer det — the object at each stage: the damaged print, the restored screen, the frame. */}
        <section className="wrap section" aria-labelledby="saadan">
          <div className="container ed">
            <h2 id="saadan">{c.saadan.h2}</h2>
            <ol className="steps">
              {c.saadan.steps.map((s, i) => {
                // small variants: the step photographs render at 112–160 px
                const small = (u: string) => u.replace(/\.jpg$/, '-480.jpg');
                const img = stepEx ? [small(stepEx.before), small(stepEx.after), stepEx.mockup ? small(stepEx.mockup) : small(stepEx.after)][i] : null;
                return (
                  <li key={i} className="step">
                    {img ? <img src={img} alt="" width={160} height={200} loading="lazy" /> : <span className="ph" />}
                    <p><span className="n">{i + 1}</span>{s}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Eksempler — each pair compared a different way; never the hero photograph again */}
        {gridExamples.length > 0 && (
          <section className="section" aria-labelledby="eksempler" style={{ paddingTop: 0 }}>
            <div className="wrap"><div className="container"><h2 id="eksempler" style={{ marginBottom: 'var(--s5)' }}>{c.eksempler.h2}</h2></div></div>
            <div className="container">
              <div className="swipe">
                {gridExamples.map((e, i) => {
                  const mode = e.mode ?? (['wipe', 'lens', 'hold', 'fade', 'wipe', 'lens'] as const)[i % 6];
                  const aspect = `${e.width} / ${e.height}`;
                  const alt = `Før og efter: ${e.caption}`;
                  return (
                    <figure key={e.id} style={{ margin: 0 }}>
                      {e.colour ? (
                        <ColourExample before={src(e, 'before', GRID_SIZES)} after={src(e, 'after', GRID_SIZES)} colour={e.colour} alt={alt} aspect={aspect} />
                      ) : mode === 'wipe' ? (
                        <BeforeAfter before={src(e, 'before', GRID_SIZES)} after={src(e, 'after', GRID_SIZES)} alt={alt} aspect={aspect} />
                      ) : (
                        <Compare mode={mode} before={src(e, 'before', GRID_SIZES)} after={src(e, 'after', GRID_SIZES)} alt={alt} aspect={aspect} />
                      )}
                      <figcaption style={{ paddingTop: 'var(--s2)' }}><Caption text={e.caption} /></figcaption>
                    </figure>
                  );
                })}
              </div>
              {placeholders && <p className="wrap caption" style={{ paddingTop: 'var(--s5)', maxWidth: '44em' }}>{c.eksempler.placeholderNote}</p>}
            </div>
          </section>
        )}

        {/* Tæt på — 2× detail crops: where restoration is judged */}
        {details.length > 0 && (
          <section className="wrap section" aria-labelledby="taetpaa" style={{ paddingTop: 0 }}>
            <div className="container" style={{ display: 'grid', gap: 'var(--s6)' }}>
              <div className="ed">
                <h2 id="taetpaa">{c.taetPaa.h2}</h2>
                <p className="lead" style={{ maxWidth: '26em' }}>{c.taetPaa.p}</p>
              </div>
              <div className="details">
                {details.map((e) => (
                  <figure key={e.id} className="detail">
                    <img src={e.detail!.before} alt={`Før, udsnit: ${e.caption}`} width={700} height={700} loading="lazy" />
                    <img src={e.detail!.after} alt={`Efter, udsnit: ${e.caption}`} width={700} height={700} loading="lazy" />
                    <figcaption><Caption text={e.detail!.label ? `${e.detail!.label} – ${e.caption}` : e.caption} /></figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Det får du — the object and a gallery label */}
        <section className="wrap section" aria-labelledby="produkt" style={{ paddingTop: 0 }}>
          <div className="container product">
            <div>
              {productMock ? <img className="mock" src={productMock} alt={`Indrammet ${c.formatLabel} på en væg`} width={1200} height={960} loading="lazy" /> : null}
            </div>
            <div style={{ display: 'grid', gap: 'var(--s5)' }}>
              <h2 id="produkt">{c.produkt.h2}</h2>
              <dl className="label">
                {c.produkt.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
              <p className="compare-note">{c.produkt.note}</p>
            </div>
          </div>
        </section>

        {/* Offer — one price, set like an object */}
        <section className="wrap section section-quiet" aria-labelledby="tilbud">
          <div className="container offer">
            <h2 id="tilbud" className="visually-hidden">Pris</h2>
            <div className="offer-act" style={{ display: 'grid', gap: 'var(--s4)', alignContent: 'end' }}>
              <p className="lead" style={{ maxWidth: '22em' }}>{c.offer.line}</p>
              <div><OpenFlowButton style={{ minWidth: 240 }}>{c.offer.cta}</OpenFlowButton></div>
              <p className="caption" style={{ maxWidth: '26em' }}>{c.offer.under}</p>
            </div>
            <div style={{ display: 'grid', gap: 'var(--s2)' }}>
              <p className="price" aria-label={c.offer.price}>{c.offer.price.replace(' kr.', '')}<small>kr.</small></p>
              <p className="caption price-note">{c.offer.priceNote}</p>
              {c.offer.phone && <p className="caption price-note"><a href={c.offer.phoneHref}>{c.offer.phone}</a></p>}
            </div>
          </div>
        </section>

        {showFounder && (
          <section className="wrap section" aria-labelledby="hvem">
            <div className="container founder">
              <img src="/founder.jpg" alt={f.name} width={220} height={286} loading="lazy" />
              <div style={{ display: 'grid', gap: 'var(--s4)' }}>
                <h2 id="hvem">{c.hvem.h2}</h2>
                <p className="lead italic" style={{ maxWidth: '24em' }}>{f.why[0]}</p>
                {f.why.slice(1).map((w, i) => <p key={i} className="measure">{w}</p>)}
                <p className="caption"><b>{f.name}</b>{f.city ? `, ${f.city}` : ''}{f.cvr ? ` · CVR ${f.cvr}` : ''}</p>
                <p className="small">
                  {f.phone && <a className="tap" href={`tel:${f.phone.replace(/\s/g, '')}`}>{f.phone}</a>}
                  {f.phone && f.email && ' · '}
                  {f.email && <a className="tap" href={`mailto:${f.email}`}>{f.email}</a>}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="wrap section" aria-labelledby="spoergsmaal" style={{ paddingTop: showFounder ? 0 : undefined }}>
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

        <section className="wrap" aria-label="Afslutning" style={{ paddingTop: 'var(--s6)', paddingBottom: 'var(--s10)' }}>
          <div className="container ed">
            <p className="closing">{c.slut.line}</p>
            <div><OpenFlowButton style={{ minWidth: 240 }}>{c.slut.cta}</OpenFlowButton></div>
          </div>
        </section>
      </main>
      <Footer />
      <UploadFlow c={c} resumeOrderId={resumeOrder} cancelled={sp.cancelled === '1'} />
      <StickyCtaMount label={c.sticky} />
      <Consent text={c.cookie.text} accept={c.cookie.accept} decline={c.cookie.decline} />
    </>
  );
}
