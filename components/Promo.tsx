import { copy } from '@/lib/copy';

/**
 * The launch offer as a block a 55-year-old reads in two seconds: a tag that says what kind of thing
 * it is, one line that says what you get, one that says until when. Styles: .promo in app/landing.css.
 */
export default function Promo({ compact = false }: { compact?: boolean }) {
  const c = copy();
  if (!c.campaign.active) return null;
  return (
    <div className={`promo${compact ? ' is-compact' : ''}`} role="note" aria-label={c.campaign.tag}>
      <span className="promo-tag">{c.campaign.tag}</span>
      <b>{c.campaign.title}</b>
      {!compact && <span>{c.campaign.body}</span>}
      <span className="promo-until">{c.campaign.untilLine}</span>
      {!compact && <span className="caption">{c.campaign.terms}</span>}
    </div>
  );
}
