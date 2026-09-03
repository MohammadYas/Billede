export default function Wordmark({ as = 'a' }: { as?: 'a' | 'span' }) {
  return as === 'a' ? <a href="/" className="wordmark">Genfundet</a> : <span className="wordmark">Genfundet</span>;
}
