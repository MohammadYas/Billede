import Wordmark from './Wordmark';

/** The header every page after the landing page shares: the wordmark, and one short line on the right. Styles: .nav in app/landing.css. */
export default function SiteHeader({ note }: { note?: string }) {
  return (
    <header className="nav wrap">
      <div className="container nav-row">
        <Wordmark />
        {note && <div className="nav-right"><span className="caption">{note}</span></div>}
      </div>
    </header>
  );
}
