import type { Copy } from '@/lib/copy';

/**
 * The launch offer as a block a 55-year-old reads in two seconds: a tag that says what kind of thing
 * it is, one line that says what you get, one that says until when. Presentational: the text comes
 * in as a prop, so the client-side order panel can render it without pulling the server copy module.
 * Styles: .promo in app/landing.css.
 */
export default function Promo({ campaign, compact = false }: { campaign: Copy['campaign']; compact?: boolean }) {
  if (!campaign.active) return null;
  return (
    <div className={`promo${compact ? ' is-compact' : ''}`} role="note" aria-label={campaign.tag}>
      <span className="promo-tag">{campaign.tag}</span>
      <b>{campaign.title}</b>
      {!compact && <span>{campaign.body}</span>}
      <span className="promo-until">{campaign.untilLine}</span>
      {!compact && <span className="caption">{campaign.terms}</span>}
    </div>
  );
}
