import { getFounder } from '@/lib/founder';
import Wordmark from './Wordmark';

export default function Footer() {
  const f = getFounder();
  return (
    <footer className="wrap foot">
      <div className="container foot-grid">
        <div style={{ display: 'grid', gap: 'var(--s3)', alignContent: 'start' }}>
          <Wordmark />
          {(f.name || f.cvr || f.address) && <p>{[f.name, f.cvr ? `CVR ${f.cvr}` : '', f.address].filter(Boolean).join(' · ')}</p>}
        </div>
        <div style={{ display: 'grid', gap: 'var(--s2)', alignContent: 'start' }}>
          <p><a className="tap" href="/handelsbetingelser">Handelsbetingelser</a> · <a className="tap" href="/privatliv">Privatliv</a></p>
          {(f.email || f.phone) && (
            <p>
              {f.email && <a className="tap" href={`mailto:${f.email}`}>{f.email}</a>}
              {f.email && f.phone && ' · '}
              {f.phone && <a className="tap" href={`tel:${f.phone.replace(/\s/g, '')}`}>{f.phone}</a>}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
