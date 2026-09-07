export default function Wordmark({ as = 'a' }: { as?: 'a' | 'span' }) {
  return as === 'a' ? <a href="/" className="wordmark">Billedarv</a> : <span className="wordmark">Billedarv</span>;
}
