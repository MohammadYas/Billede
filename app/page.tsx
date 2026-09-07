import { copy } from '@/lib/copy';
import { getExamples, type Example } from '@/lib/examples';
import { exampleSrcSet, GRID_SIZES, HERO_SIZES } from '@/lib/images';
import type { Source } from '@/components/BeforeAfter';
import Compare from '@/components/Compare';
import ColourExample from '@/components/ColourExample';
import Framed from '@/components/Framed';
import UploadFlow from '@/components/UploadFlow';
import OpenFlowButton from '@/components/OpenFlowButton';
import StickyCtaMount from '@/components/StickyCtaMount';
import HeroViewContent from '@/components/HeroViewContent';
import Consent from '@/components/Consent';
import Footer from '@/components/Footer';
import MailLine from '@/components/MailLine';
import Wordmark from '@/components/Wordmark';
import DeletedNotice from '@/components/DeletedNotice';

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

export default async function Page() {
  const c = copy();
  const examples = getExamples();
  const hero = examples[0] ?? null;
  const grid = examples.slice(1, 7);
  const synthetic = examples.length > 0 && examples.every((e) => /eksempelbillede/i.test(e.caption));
  const placeholders = examples.some((e) => e.placeholder);
  const jul = c.season === 'jul';

  return (
    <>
      {c.campaign.active && <div className="announce"><span>{c.campaign.bar}</span></div>}
      <header className="nav wrap">
        <div className="container nav-row">
          <Wordmark />
          <div className="nav-right">
            <span className="caption">{c.priceFrom} · fri fragt</span>
            <OpenFlowButton className="btn btn-sm nav-cta">{c.hero.cta}</OpenFlowButton>
          </div>
        </div>
      </header>
      <main>
        <DeletedNotice text={c.preview.erased} />

        {/* Hero — the claim, the button, and the proof: a real damaged print turning sharp under the finger. */}
        <section id="hero" className="wrap" aria-label="Se hvad restaureringen gør">
          <HeroViewContent targetId="hero" />
          <div className="container hero">
            <div className="hero-copy">
              <h1>{c.hero.h1}</h1>
              <p className="lead">{c.hero.sub}</p>
              {c.campaign.active && <div className="promo"><b>{c.campaign.title}</b><span>{c.campaign.body}</span><span className="caption">{c.campaign.terms}</span></div>}
              {jul && c.hero.eyebrow && <p className="deadline">{c.hero.eyebrow}</p>}
              <div className="hero-cta">
                <OpenFlowButton>{c.hero.cta}</OpenFlowButton>
                <span className="caption hero-note"><b>{c.hero.smallStrong}</b> {c.hero.small}</span>
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

        {/* How it works — the same photograph at each stage */}
        <section className="wrap section" aria-labelledby="saadan">
          <div className="container how">
            <div className="how-head"><h2 id="saadan">{c.saadan.h2}</h2><p className="lead">{c.saadan.note}</p></div>
            <ol className="steps">
              {c.saadan.steps.map((s, i) => (
                <li key={i} className="step">
                  <div className={`step-media${i === 2 ? ' is-frame' : ''}`} aria-hidden>
                    {hero && i === 0 && <img src={small(hero.before)} alt="" width={480} height={Math.round((480 * hero.height) / hero.width)} loading="lazy" />}
                    {hero && i === 1 && <img src={small(hero.after)} alt="" width={480} height={Math.round((480 * hero.height) / hero.width)} loading="lazy" />}
                    {hero && i === 2 && <Framed src={small(hero.after)} alt="" width={480} height={Math.round((480 * hero.height) / hero.width)} />}
                  </div>
                  <div className="step-text"><span className="n">{i + 1}</span><h3>{c.saadan.titles[i]}</h3><p>{s}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Examples — six more of the same object */}
        {grid.length > 0 && (
          <section className="wrap section" aria-labelledby="eksempler" style={{ paddingTop: 0 }}>
            <div className="container">
              <div className="ex-head"><h2 id="eksempler">{c.eksempler.h2}</h2><p className="lead">{c.eksempler.lead}</p></div>
              <div className="ex-grid">
                {grid.map((e) => {
                  const aspect = `${e.width} / ${e.height}`;
                  const alt = `Før og efter: ${e.caption.replace(/\.$/, '')}`;
                  return (
                    <figure key={e.id}>
                      {e.colour
                        ? <ColourExample before={src(e, 'before', GRID_SIZES)} after={src(e, 'after', GRID_SIZES)} colour={e.colour} alt={alt} aspect={aspect} />
                        : <Compare mode="fade" before={src(e, 'before', GRID_SIZES)} after={src(e, 'after', GRID_SIZES)} alt={alt} aspect={aspect} />}
                      <figcaption><Caption text={e.caption} /></figcaption>
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
              <div className="o-sizes" style={{ display: 'grid', gap: 'var(--s3)' }}>
                <p className="small" style={{ fontWeight: 600 }}>{c.produkt.sizesTitle}</p>
                <ul className="size-compare">
                  {c.produkt.sizeCards.map((x) => (
                    <li key={x.label} className={x.recommended ? 'is-recommended' : ''}>
                      {x.recommended && <span className="tag">{c.produkt.recommended}</span>}
                      <b>{x.label}</b>
                      <span className="size-price tabular">{x.price}</span>
                      <span className="caption">{x.hint}</span>
                    </li>
                  ))}
                </ul>
                <p className="caption">{c.produkt.sizesNote}</p>
              </div>
              <div className="o-frames" style={{ display: 'grid', gap: 'var(--s3)' }}>
                <p className="small" style={{ fontWeight: 600 }}>{c.preview.frameTitle}</p>
                <div className="frames">
                  <span><span className="swatch swatch-sort" aria-hidden /> {c.preview.frameSort} · {c.preview.frameSortHint}</span>
                  <span><span className="swatch swatch-eg" aria-hidden /> {c.preview.frameEg} · {c.preview.frameEgHint}</span>
                </div>
                <p className="caption">{c.preview.frameNote}</p>
              </div>
              <div className="o-price" style={{ display: 'grid', gap: 'var(--s3)' }}>
                <div className="price-line">
                  {c.sizes.length > 1 && <span className="caption">fra</span>}
                  <span className="price tabular">{c.offer.price}</span>
                  <span className="caption">{c.offer.priceNote}</span>
                </div>
                <p className="small" style={{ maxWidth: '30em' }}>{c.offer.allIn}</p>
                {c.offer.anchor && <p className="caption" style={{ maxWidth: '30em' }}>{c.offer.anchor}</p>}
                {c.campaign.active && <div className="promo"><b>{c.campaign.title}</b><span>{c.campaign.body}</span><span className="caption">{c.campaign.terms}</span></div>}
                {c.offer.deadline && <p className="deadline">{c.offer.deadline}{c.hero.countdown ? ` ${c.hero.countdown}.` : ''}</p>}
              </div>
              <ul className="guarantee o-guarantee">
                {c.offer.guarantee.map((g) => <li key={g}>{g}</li>)}
              </ul>
              <div className="offer-cta o-cta">
                <OpenFlowButton>{c.offer.cta}</OpenFlowButton>
                <span className="caption"><b style={{ color: 'var(--ink)', fontWeight: 600 }}>{c.hero.smallStrong}</b></span>
              </div>
            </div>
          </div>
        </section>

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
            {c.email && <span>Spørgsmål? <a href={c.emailHref}>{c.email}</a></span>}
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
      <UploadFlow c={c} />
      <StickyCtaMount label={c.sticky} />
      <Consent text={c.cookie.text} accept={c.cookie.accept} decline={c.cookie.decline} />
    </>
  );
}
