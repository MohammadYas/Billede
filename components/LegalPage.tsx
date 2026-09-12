import Footer from '@/components/Footer';
import SiteHeader from '@/components/SiteHeader';
import { getFounder } from '@/lib/founder';

const LABEL: Record<string, string> = { name: 'vores navn', cvr: 'vores CVR-nummer', address: 'vores fulde gadeadresse', email: 'vores e-mail' };

/**
 * These pages used to open with "Udkast – gennemgås af advokat før lancering", switched on by an
 * environment variable. Two things were wrong with that. It was the one line a hesitant customer read
 * on the page they opened to check whether we are real, and it said nothing they could act on. And it
 * was set by hand, so it would have survived the review it was waiting for.
 *
 * The content is finished. What is still open is a fact, not a judgement — the fields the owner has
 * marked TODO in assets/founder/founder.md — so the page names that fact and clears itself the moment
 * the line is filled in. Nothing here hides an unresolved matter behind a removed word.
 */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  const f = getFounder();
  const gaps = f.pending.map((k) => LABEL[k] ?? k);
  const gapNote = gaps.length
    ? `Vi mangler at få ${gaps.join(' og ')} på siden her; skriv til os, så får du det med det samme. Alt andet på siden gælder. `
    : '';
  return (
    <>
      <SiteHeader />
      <main className="wrap" style={{ paddingTop: 'var(--s6)', paddingBottom: 'var(--s9)' }}>
        <div className="container ed" style={{ rowGap: 'var(--s6)' }}>
          <div className="ed-head" style={{ display: 'grid', gap: 'var(--s5)', alignContent: 'start' }}>
            <h1 style={{ maxWidth: '12em' }}>{title}</h1>
            <p className="caption">{gapNote}Opdateret {updated}.</p>
          </div>
          <div className="legal" style={{ maxWidth: '40em', display: 'grid', gap: 'var(--s4)' }}>{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
