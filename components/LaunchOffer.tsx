'use client';
import { useEffect, useRef, useState } from 'react';
import Compare from './Compare';
import type { Source } from './BeforeAfter';
import type { Copy } from '@/lib/copy';

const SEEN = 'gf_offer_seen'; // sessionStorage: once per visit
const DISMISSED = 'gf_offer_until'; // localStorage: "Nej tak" holds for a week
const DELAY = 1800; // the page paints and the headline is read before the dialog arrives

/**
 * The launch offer as a dialog on the first visit. What it leans on is real and cheap to verify:
 * the offer has a date (scarcity that is true), the extra copy has a price (anchoring: 349 kr. against 0),
 * the picture shows the repair happening (proof before promise), the first step costs nothing
 * (reciprocity: the free preview comes before any decision), and the one button starts that free
 * step rather than asking for an e-mail (a small commitment first). No countdown, no fake stock, no
 * guilt-worded decline: the "no" is a plain "no", and once said it holds for a week.
 */
export default function LaunchOffer({ campaign, cta, before, after, alt }: { campaign: Copy['campaign']; cta: string; before: Source; after: Source; alt: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!campaign.active) return;
    try {
      if (sessionStorage.getItem(SEEN)) return;
      if (Number(localStorage.getItem(DISMISSED) ?? 0) > Date.now()) return;
      // someone coming back for a picture they already started is not sold to again: the banner has the floor
      if (localStorage.getItem('gf_resume')) return;
    } catch { /* private mode: show it */ }
    // a returning customer with a repeat link, or a visitor arriving straight at the upload, is not interrupted
    if (/[?&](igen|order)=/.test(location.search) || location.hash) return;
    const t = setTimeout(() => {
      try { sessionStorage.setItem(SEEN, '1'); } catch { /* ignore */ }
      setOpen(true);
    }, DELAY);
    return () => clearTimeout(t);
  }, [campaign.active]);

  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) { d.showModal(); document.body.classList.add('offer-open'); }
    if (!open && d.open) d.close();
    return () => { document.body.classList.remove('offer-open'); };
  }, [open]);

  const dismiss = (forAWeek: boolean) => {
    if (forAWeek) { try { localStorage.setItem(DISMISSED, String(Date.now() + 7 * 864e5)); } catch { /* ignore */ } }
    setOpen(false);
  };
  const start = () => {
    setOpen(false);
    // the sheet returns focus to document.activeElement on close; make that the hero button, not the closed dialog
    document.querySelector<HTMLButtonElement>('.hero-cta button')?.focus({ preventScroll: true });
    window.dispatchEvent(new CustomEvent('gf:open'));
  };

  if (!campaign.active) return null;
  return (
    <dialog ref={ref} className="offer-dialog" aria-labelledby="offer-title" onClose={() => setOpen(false)} onClick={(e) => { if (e.target === e.currentTarget) dismiss(false); }}>
      <div className="offer-dialog-body">
        <button type="button" className="offer-close" aria-label="Luk" onClick={() => dismiss(false)}>×</button>
        <div className="offer-pic">
          {open && <Compare mode="fade" initialBefore interval={2600} before={before} after={after} alt={alt} aspect="4 / 5" />}
        </div>
        <div className="offer-text">
          <span className="promo-tag">{campaign.tag}</span>
          <h2 id="offer-title">{campaign.title}</h2>
          <p className="offer-body">{campaign.body}</p>
          <ul className="offer-points">
            {campaign.points.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <p className="promo-until">{campaign.untilLine}</p>
          <button type="button" className="btn btn-block" onClick={start}>{cta}</button>
          <button type="button" className="link-btn offer-no" onClick={() => dismiss(true)}>Nej tak, jeg kigger videre</button>
        </div>
      </div>
    </dialog>
  );
}
