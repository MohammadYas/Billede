import { copy } from '@/lib/copy';
import Footer from '@/components/Footer';
import Wordmark from '@/components/Wordmark';

/** Danish 404. Most hits are a preview URL copied to another phone without the share token. */
export default function NotFound() {
  const c = copy();
  return (
    <>
      <main className="wrap" style={{ paddingTop: 'var(--s5)', paddingBottom: 'var(--s9)', minHeight: '70dvh' }}>
        <div className="container" style={{ display: 'grid', gap: 'var(--s6)' }}>
          <Wordmark />
          <div style={{ display: 'grid', gap: 'var(--s4)' }}>
            <h1 style={{ maxWidth: '12em' }}>{c.notFound.h1}</h1>
            <p className="lead" style={{ maxWidth: '26em' }}>{c.notFound.p}</p>
            {c.email && <p className="measure">Er du i tvivl, så skriv til <a href={c.emailHref}>{c.email}</a> – vi svarer inden 24 timer.</p>}
            <p><a className="btn" href="/">{c.notFound.cta}</a></p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
