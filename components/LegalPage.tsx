import Footer from '@/components/Footer';

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <main className="wrap" style={{ paddingTop: 'var(--s6)', paddingBottom: 'var(--s9)' }}>
        <div className="container" style={{ display: 'grid', gap: 'var(--s5)' }}>
          <a href="/" style={{ fontFamily: 'var(--display)', fontSize: 22, textDecoration: 'none', color: 'var(--ink)' }}>Genfundet</a>
          <h1 style={{ maxWidth: '16em' }}>{title}</h1>
          <p className="caption">Udkast – skal gennemgås af advokat før lancering. Opdateret {updated}.</p>
          <div className="legal measure" style={{ maxWidth: '38em', display: 'grid', gap: 'var(--s4)' }}>{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
