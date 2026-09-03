'use client';
import { useEffect, useState } from 'react';
import { consent, loadPixel, setConsent, track } from '@/lib/analytics/client';

/** Minimal bottom banner. Only rendered when a pixel id is configured. */
export default function Consent({ text, accept, decline }: { text: string; accept: string; decline: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const c = consent();
    if (c === 'yes') loadPixel();
    if (c === null && process.env.NEXT_PUBLIC_META_PIXEL_ID) setShow(true);
    track('PageView', {}, { serverLog: true });
  }, []);
  if (!show) return null;
  return (
    <div role="dialog" aria-label="Cookies" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, background: 'var(--paper-2)', borderTop: '1px solid var(--hairline)', padding: 'var(--s4) var(--gutter) calc(var(--s4) + var(--safe-bottom))' }}>
      <div className="container" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s3) var(--s5)', alignItems: 'center', justifyContent: 'space-between' }}>
        <p className="small" style={{ maxWidth: '40em' }}>{text} <a href="/privatliv">Privatliv</a></p>
        <div style={{ display: 'flex', gap: 'var(--s3)' }}>
          <button type="button" className="btn btn-quiet" style={{ minHeight: 44 }} onClick={() => { setConsent('no'); setShow(false); }}>{decline}</button>
          <button type="button" className="btn" style={{ minHeight: 44 }} onClick={() => { setConsent('yes'); setShow(false); }}>{accept}</button>
        </div>
      </div>
    </div>
  );
}
