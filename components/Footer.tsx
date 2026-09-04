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
          {f.email && <p><a className="tap" href={`mailto:${f.email}`}>{f.email}</a></p>}
          {f.email && <p className="caption">Vi svarer på mail inden 24 timer – som regel meget hurtigere.</p>}
        </div>
      </div>
    </footer>
  );
}
