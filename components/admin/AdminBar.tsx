import Wordmark from '@/components/Wordmark';
import { actionLogout } from '@/lib/admin/actions';

/** The one line at the top of every admin page: where you are, and the way out. */
export default function AdminBar({ title }: { title?: string }) {
  return (
    <div className="adm-bar">
      <div className="adm-bar-left">
        <Wordmark />
        <a href="/admin" className="small">Ordrer</a>
        {title && <span className="small muted">· {title}</span>}
      </div>
      <form action={actionLogout}><button type="submit" className="link-btn small">Log ud</button></form>
    </div>
  );
}
