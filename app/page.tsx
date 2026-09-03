import { copy } from '@/lib/copy';
import { getExamples } from '@/lib/examples';
import { getFounder } from '@/lib/founder';
import BeforeAfter from '@/components/BeforeAfter';
import UploadFlow from '@/components/UploadFlow';
import OpenFlowButton from '@/components/OpenFlowButton';
import StickyCtaMount from '@/components/StickyCtaMount';
import HeroViewContent from '@/components/HeroViewContent';
import Consent from '@/components/Consent';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const c = copy();
  const examples = getExamples();
  const hero = examples[0] ?? null;
  const steps = examples.slice(0, 3);
  const f = getFounder();
  const orderParam = typeof sp.order === 'string' && /^[0-9a-f-]{36}$/.test(sp.order) ? sp.order : null;
  const resume = orderParam ? { orderId: orderParam, cancelled: sp.cancelled === '1' } : null;

  return (
    <>
      <main>
        {/* Wordmark. No navigation. */}
        <header className="wrap" style={{ paddingTop: 'var(--s4)', paddingBottom: 'var(--s3)' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.01em' }}>Genfundet</span>
            <span className="caption">{c.price} · fri fragt</span>
          </div>
        </header>

        {/* Hero — the photograph first. Square on mobile, 4:3 on desktop. */}
        <section id="hero" aria-label="Eksempel på restaurering">
          <HeroViewContent targetId="hero" />
          {hero ? (
            <>
              <div className="hero-media">
                <BeforeAfter before={hero.before} after={hero.after} alt={`Før og efter: ${hero.caption}`} aspect="1 / 1" aspectDesktop="4 / 3" reveal priority />
              </div>
              <p className="wrap caption" style={{ paddingTop: 'var(--s2)' }}><span className="container" style={{ display: 'block' }}>{hero.caption}</span></p>
            </>
          ) : (
            <div className="wrap"><div className="container" style={{ aspectRatio: '1 / 1', background: 'var(--paper-2)', maxHeight: 420 }} /></div>
          )}
          <div className="wrap" style={{ paddingTop: 'var(--s5)', paddingBottom: 'var(--s6)' }}>
            <div className="container" style={{ display: 'grid', gap: 'var(--s4)' }}>
              <h1 className="measure" style={{ maxWidth: '16em' }}>{c.hero.h1}</h1>
              <p className="lead measure" style={{ maxWidth: '28em' }}>{c.hero.sub}</p>
              <div style={{ display: 'grid', gap: 'var(--s2)', justifyItems: 'start' }}>
                <OpenFlowButton style={{ minWidth: 220 }}>{c.hero.cta}</OpenFlowButton>
                <span className="caption">{c.hero.small}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tryghedslinje — one hairline row */}
        <div className="wrap">
          <div className="container" style={{ borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)', padding: 'var(--s3) 0', display: 'flex', flexWrap: 'wrap', gap: 'var(--s2) var(--s5)', fontSize: 'var(--fs-small)', color: 'var(--ink-2)' }}>
            {c.tryghed.map((t, i) => <span key={i}>{t}</span>)}
          </div>
        </div>

        {/* Sådan fungerer det — three sentences, three real photographs, ragged */}
        <section className="wrap section" aria-labelledby="saadan">
          <div className="container" style={{ display: 'grid', gap: 'var(--s6)' }}>
            <h2 id="saadan">{c.saadan.h2}</h2>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--s5)' }}>
              {c.saadan.steps.map((s, i) => (
                <li key={i} className="step" style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 'var(--s4)', alignItems: 'start', maxWidth: '38em', marginLeft: i === 1 ? 'min(12vw, 96px)' : 0 }}>
                  {steps[i] ? <img src={i === 0 ? steps[i].before : steps[i].after} alt="" width={72} height={72} loading="lazy" style={{ width: 72, height: 72, objectFit: 'cover', border: '1px solid var(--hairline)' }} /> : <span style={{ width: 72, height: 72, background: 'var(--paper-2)', display: 'block' }} />}
                  <p style={{ fontSize: 'var(--fs-lead)', lineHeight: 1.4 }}>{s}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Eksempler — max four consented pairs */}
        {examples.length > 0 && (
          <section className="section" aria-labelledby="eksempler" style={{ paddingTop: 0 }}>
            <div className="wrap"><div className="container"><h2 id="eksempler" style={{ marginBottom: 'var(--s5)' }}>{c.eksempler.h2}</h2></div></div>
            <div className="container">
              <div className="swipe">
                {examples.slice(0, 4).map((e) => (
                  <figure key={e.id} style={{ margin: 0 }}>
                    <BeforeAfter before={e.before} after={e.after} alt={`Før og efter: ${e.caption}`} aspect={`${e.width} / ${e.height}`} />
                    <figcaption className="caption" style={{ paddingTop: 'var(--s2)' }}>{e.caption}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Offer — one block, one price */}
        <section className="wrap section section-quiet" aria-labelledby="tilbud">
          <div className="container" style={{ display: 'grid', gap: 'var(--s4)', maxWidth: 'min(1120px, 100%)' }}>
            <h2 id="tilbud" className="visually-hidden">Pris</h2>
            <p className="lead measure" style={{ maxWidth: '30em' }}>{c.offer.line}</p>
            <p style={{ fontFamily: 'var(--display)', fontSize: 'calc(var(--fs-display) * 1.1)', lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--accent)' }}>{c.offer.price}</p>
            <div><OpenFlowButton style={{ minWidth: 220 }}>{c.offer.cta}</OpenFlowButton></div>
          </div>
        </section>

        {/* Hvem står bag — only what is real */}
        {(f.name || f.why.length > 0) && (
          <section className="wrap section" aria-labelledby="hvem">
            <div className="container" style={{ display: 'grid', gap: 'var(--s5)', gridTemplateColumns: f.portrait ? 'minmax(120px, 200px) 1fr' : '1fr', alignItems: 'start' }}>
              {f.portrait && <img src="/founder.jpg" alt={f.name} width={200} height={260} loading="lazy" style={{ width: '100%', aspectRatio: '10 / 13', objectFit: 'cover' }} />}
              <div style={{ display: 'grid', gap: 'var(--s3)' }}>
                <h2 id="hvem">{c.hvem.h2}</h2>
                <p className="lead">{[f.name, f.city].filter(Boolean).join(', ')}</p>
                {f.why.map((w, i) => <p key={i} className="measure">{w}</p>)}
                <p className="small">
                  {f.phone && <a href={`tel:${f.phone.replace(/\s/g, '')}`}>{f.phone}</a>}
                  {f.phone && f.email && ' · '}
                  {f.email && <a href={`mailto:${f.email}`}>{f.email}</a>}
                  {f.cvr && <span className="muted"> · CVR {f.cvr}</span>}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Spørgsmål — exactly five, hairline accordion */}
        <section className="wrap section" aria-labelledby="spoergsmaal" style={{ paddingTop: 0 }}>
          <div className="container" style={{ display: 'grid', gap: 'var(--s5)' }}>
            <h2 id="spoergsmaal">{c.spoergsmaal.h2}</h2>
            <div style={{ maxWidth: '40em' }}>
              {c.spoergsmaal.items.map((it, i) => (
                <details className="q" key={i}>
                  <summary>{it.q}</summary>
                  <div className="a"><p>{it.a}</p></div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Slut */}
        <section className="wrap section" aria-label="Afslutning" style={{ paddingTop: 0, paddingBottom: 'var(--s9)' }}>
          <div className="container" style={{ display: 'grid', gap: 'var(--s4)', justifyItems: 'start' }}>
            <p className="lead measure" style={{ fontFamily: 'var(--display)', fontSize: 'var(--fs-h2)', lineHeight: 1.2, maxWidth: '20em' }}>{c.slut.line}</p>
            <OpenFlowButton style={{ minWidth: 220 }}>{c.slut.cta}</OpenFlowButton>
          </div>
        </section>
      </main>
      <Footer />
      <UploadFlow c={c} resume={resume} />
      <StickyCtaMount label={c.sticky} />
      <Consent text={c.cookie.text} accept={c.cookie.accept} decline={c.cookie.decline} />
    </>
  );
}
