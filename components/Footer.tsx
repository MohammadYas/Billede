import { getFounder } from '@/lib/founder';

export default function Footer() {
  const f = getFounder();
  return (
    <footer className="wrap" style={{ paddingTop: 'var(--s6)', paddingBottom: 'calc(var(--s6) + var(--safe-bottom))', borderTop: '1px solid var(--hairline)' }}>
      <div className="container small" style={{ display: 'grid', gap: 'var(--s2)', color: 'var(--ink-2)' }}>
        <p style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--ink)' }}>Genfundet</p>
        {(f.name || f.cvr || f.address) && (
          <p>{[f.name, f.cvr ? `CVR ${f.cvr}` : '', f.address].filter(Boolean).join(' · ')}</p>
        )}
        <p>
          <a href="/handelsbetingelser">Handelsbetingelser</a> · <a href="/privatliv">Privatliv</a>
          {f.email ? <> · <a href={`mailto:${f.email}`}>{f.email}</a></> : null}
          {f.phone ? <> · <a href={`tel:${f.phone.replace(/\s/g, '')}`}>{f.phone}</a></> : null}
        </p>
      </div>
    </footer>
  );
}
