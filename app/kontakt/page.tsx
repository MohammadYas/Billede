import type { Metadata } from 'next';
import { copy } from '@/lib/copy';
import ContactForm from '@/components/ContactForm';
import Footer from '@/components/Footer';
import SiteHeader from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'Skriv til Billedearv – spørgsmål om et gammelt billede, en bestilling eller en gave. Vi svarer inden 24 timer.',
  alternates: { canonical: '/kontakt' },
};

export default function Kontakt() {
  const c = copy();
  const k = c.kontakt;
  return (
    <>
      <SiteHeader />
      <main className="wrap" style={{ paddingTop: 'var(--s6)', paddingBottom: 'var(--s9)' }}>
        <div className="container" style={{ display: 'grid', gap: 'var(--s5)', maxWidth: 720 }}>
          <h1 style={{ maxWidth: '14em' }}>{k.h1}</h1>
          <p className="lead measure">{k.lead}</p>
          <ContactForm t={k.form} />
          {c.email && <p className="small muted">{k.mailInstead} <a href={c.emailHref}>{c.email}</a>.</p>}
        </div>
      </main>
      <Footer />
    </>
  );
}
