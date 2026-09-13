import Wordmark from '@/components/Wordmark';
import { actionLogout } from '@/lib/admin/actions';
import { unreadCount } from '@/lib/db/messages';

/** The one line at the top of every admin page: where you are, what waits, and the way out. */
export default async function AdminBar({ title }: { title?: string }) {
  const unread = await unreadCount().catch(() => 0);
  return (
    <div className="adm-bar">
      <div className="adm-bar-left">
        <Wordmark />
        <a href="/admin" className="small">Ordrer</a>
        <a href="/admin/beskeder" className="small">Beskeder{unread ? <b className="msg-badge">{unread}</b> : null}</a>
        {title && <span className="small muted">· {title}</span>}
      </div>
      <form action={actionLogout}><button type="submit" className="link-btn small">Log ud</button></form>
    </div>
  );
}
