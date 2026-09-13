'use client';
import { useEffect, useState } from 'react';
import { consent, setConsent } from '@/lib/analytics/client';

/**
 * Minimal bottom banner. Only rendered when a pixel id is configured.
 * It sits above the sticky CTA / preview order bar (body.sticky-on, body.has-pv-bar → --bar-h) so the one
 * persistent button is never covered during the first scroll.
 */
export default function Consent({ text, accept, decline }: { text: string; accept: string; decline: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // PixelBoot owns loading the pixel and logging the page view on every route; this component is
    // only the banner, so a visitor is never counted twice for arriving once.
    if (consent() !== null || !process.env.NEXT_PUBLIC_META_PIXEL_ID) return;
    // only after the first scroll: the visitor who taps the button straight away is never interrupted (nothing is tracked before consent anyway)
    const reveal = () => { setShow(true); window.removeEventListener('scroll', onScroll); window.clearTimeout(timer); };
    const onScroll = () => { if (window.scrollY > 60) reveal(); };
    // Six seconds was too long to wait. Three days of ads (2026-09-09/11) put the median visit at three
    // seconds, so almost nobody was ever asked: no answer means no pixel, no pixel means Meta learns nothing,
    // and a campaign that learns nothing keeps buying three-second visits. Asking sooner is the only way out
    // of that loop, and the banner is the same banner — no harder to decline, only offered in time.
    const timer = window.setTimeout(reveal, 2500);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(timer); };
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
