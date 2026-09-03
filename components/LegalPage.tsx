import Footer from '@/components/Footer';
import Wordmark from '@/components/Wordmark';

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  const draft = process.env.LEGAL_DRAFT !== 'false';
  return (
    <>
      <main className="wrap" style={{ paddingTop: 'var(--s5)', paddingBottom: 'var(--s9)' }}>
        <div className="container ed" style={{ rowGap: 'var(--s6)' }}>
          <div className="ed-head" style={{ display: 'grid', gap: 'var(--s5)', alignContent: 'start' }}>
            <Wordmark />
            <h1 style={{ maxWidth: '12em' }}>{title}</h1>
            <p className="caption">{draft ? 'Udkast – gennemgås af advokat før lancering. ' : ''}Opdateret {updated}.</p>
          </div>
          <div className="legal" style={{ maxWidth: '40em', display: 'grid', gap: 'var(--s4)' }}>{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
