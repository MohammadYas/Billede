'use client';
import { useEffect, useState } from 'react';
import { consent, loadPixel, setConsent, track } from '@/lib/analytics/client';

/**
 * Minimal bottom banner. Only rendered when a pixel id is configured.
 * It sits above the sticky CTA / preview order bar (body.sticky-on, body.has-pv-bar → --bar-h) so the one
 * persistent button is never covered during the first scroll.
 */
export default function Consent({ text, accept, decline }: { text: string; accept: string; decline: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const c = consent();
    if (c === 'yes') loadPixel();
    track('PageView', {}, { serverLog: true });
    if (c !== null || !process.env.NEXT_PUBLIC_META_PIXEL_ID) return;
    // only after the first scroll: the visitor who taps the button straight away is never interrupted (nothing is tracked before consent anyway)
    const onScroll = () => { if (window.scrollY > 120) { setShow(true); window.removeEventListener('scroll', onScroll); } };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <div role="dialog" aria-label="Cookies" className="consent">
      <div className="container" style={{ display: 'flex', gap: 'var(--s3) var(--s5)', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ maxWidth: '40em' }}>{text} <a href="/privatliv">Privatliv</a></p>
        <div style={{ display: 'flex', gap: 'var(--s3)' }}>
          <button type="button" className="btn btn-quiet" onClick={() => { setConsent('no'); setShow(false); }}>{decline}</button>
          <button type="button" className="btn" onClick={() => { setConsent('yes'); setShow(false); }}>{accept}</button>
        </div>
      </div>
    </div>
  );
}
