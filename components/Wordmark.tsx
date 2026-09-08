export default function Wordmark({ as = 'a' }: { as?: 'a' | 'span' }) {
  const inner = <><img className="logo-mark" src="/logo-mark.png" alt="" width={28} height={28} aria-hidden />Billedearv</>;
  return as === 'a' ? <a href="/" className="wordmark" aria-label="Billedearv – til forsiden">{inner}</a> : <span className="wordmark">{inner}</span>;
}
