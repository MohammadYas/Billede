import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin/auth';
import { listThreads } from '@/lib/db/messages';
import AdminBar from '@/components/admin/AdminBar';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

const when = (iso: string) => new Date(iso).toLocaleString('da-DK', { timeZone: 'Europe/Copenhagen', dateStyle: 'short', timeStyle: 'short' });
const snippet = (t: string | null, h: string | null) => (t ?? h?.replace(/<[^>]+>/g, ' ') ?? '').replace(/\s+/g, ' ').trim().slice(0, 110);

/** Every conversation, newest first: who, what, when, and whether it waits for an answer. */
export default async function Beskeder() {
  if (!(await isAdmin())) redirect('/admin');
  const threads = await listThreads();
  const waiting = threads.filter((t) => t.unread > 0).length;
  return (
    <main className="wrap admin" style={{ paddingTop: 'var(--s3)', paddingBottom: 'var(--s9)' }}>
      <div className="container" style={{ display: 'grid', gap: 'var(--s5)' }}>
        <AdminBar title="Beskeder" />
        <div style={{ display: 'grid', gap: 'var(--s2)' }}>
          <h1 style={{ fontSize: 'var(--fs-h2)' }}>Beskeder</h1>
          <p className="small muted">{waiting ? `${waiting} ${waiting === 1 ? 'samtale venter' : 'samtaler venter'} på svar.` : 'Alt er besvaret.'} Mails til hej@ og beskeder fra kontaktformularen. Du svarer herfra – svaret sendes fra hej@billedearv.dk.</p>
        </div>
        <ul className="msg-list">
          {threads.map((t) => (
            <li key={t.thread} className={t.unread ? 'is-unread' : ''}>
              <a href={`/admin/beskeder/${encodeURIComponent(t.thread)}`}>
                <span className="msg-who">{t.name ?? t.thread}{t.name && <span className="muted"> · {t.thread}</span>}</span>
                <span className="msg-what">{t.last.direction === 'out' ? 'Du: ' : ''}{t.last.subject && t.last.channel === 'email' ? `${t.last.subject} – ` : ''}{snippet(t.last.text_body, t.last.html_body)}</span>
                <span className="msg-when">{when(t.last.created_at)}{t.unread ? <b className="msg-badge">{t.unread}</b> : null}</span>
              </a>
            </li>
          ))}
          {threads.length === 0 && <li className="muted small">Ingen beskeder endnu.</li>}
        </ul>
      </div>
    </main>
  );
}
