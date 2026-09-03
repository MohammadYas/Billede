'use client';
import { useEffect, useState } from 'react';

/** Appears on first scroll on mobile; hidden while the upload sheet / preview is open (body[data-flow-open]). */
export default function StickyCta({ label, onClick }: { label: string; onClick: () => void }) {
  const [on, setOn] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  useEffect(() => {
    document.body.classList.add('has-sticky');
    const onScroll = () => setOn(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const mo = new MutationObserver(() => setSuppressed(document.body.hasAttribute('data-flow-open')));
    mo.observe(document.body, { attributes: true, attributeFilter: ['data-flow-open'] });
    return () => { window.removeEventListener('scroll', onScroll); mo.disconnect(); document.body.classList.remove('has-sticky'); };
  }, []);
  return (
    <div className={`sticky-cta${on && !suppressed ? ' on' : ''}`} aria-hidden={!(on && !suppressed)}>
      <button type="button" className="btn btn-block" onClick={onClick} tabIndex={on && !suppressed ? 0 : -1}>{label}</button>
    </div>
  );
}
