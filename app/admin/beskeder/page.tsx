import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin/auth';
import { listThreads } from '@/lib/db/messages';
import AdminBar from '@/components/admin/AdminBar';
import SubmitButton from '@/components/SubmitButton';
import { actionCompose } from '@/lib/admin/actions';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

const when = (iso: string) => new Date(iso).toLocaleString('da-DK', { timeZone: 'Europe/Copenhagen', dateStyle: 'short', timeStyle: 'short' });
const snippet = (t: string | null, h: string | null) => (t ?? h?.replace(/<[^>]+>/g, ' ') ?? '').replace(/\s+/g, ' ').trim().slice(0, 110);

/** Every conversation, newest first: who, what, when, and whether it waits for an answer. */
export default async function Beskeder({ searchParams }: { searchParams: Promise<{ msg?: string; til?: string }> }) {
  if (!(await isAdmin())) redirect(`/admin?next=${encodeURIComponent('/admin/beskeder')}`);
  const { msg, til } = await searchParams;
  const threads = await listThreads();
  const waiting = threads.filter((t) => t.unread > 0).length;
  return (
    <main className="wrap admin" style={{ paddingTop: 'var(--s3)', paddingBottom: 'var(--s9)' }}>
      <div className="container" style={{ display: 'grid', gap: 'var(--s5)' }}>
        <AdminBar title="Beskeder" />
        {msg && <p className="small notice" role="status">{msg}</p>}
        <div style={{ display: 'grid', gap: 'var(--s2)' }}>
          <h1 style={{ fontSize: 'var(--fs-h2)' }}>Beskeder</h1>
          <p className="small muted">{waiting ? `${waiting} ${waiting === 1 ? 'samtale venter' : 'samtaler venter'} på svar.` : 'Alt er besvaret.'} Mails til hej@ og beskeder fra kontaktformularen. Du svarer herfra – svaret sendes fra hej@billedearv.dk.</p>
        </div>
        <details className="adm-card msg-compose" open={Boolean(til)}>
          <summary><h3 style={{ display: 'inline' }}>Ny besked</h3> <span className="caption">– skriv til en kunde fra hej@billedearv.dk</span></summary>
          <form action={actionCompose} style={{ display: 'grid', gap: 'var(--s3)', paddingTop: 'var(--s3)' }}>
            <div className="field"><label htmlFor="to">Til (e-mail)</label><input id="to" name="to" type="email" required defaultValue={til ?? ''} autoComplete="off" /></div>
            <div className="field"><label htmlFor="subject">Emne</label><input id="subject" name="subject" maxLength={150} placeholder="Dit billede hos Billedearv" /></div>
            <div className="field"><label htmlFor="text">Besked</label><textarea id="text" name="text" rows={6} required placeholder="Skriv beskeden. Underskrift sættes på automatisk." /></div>
            <SubmitButton label="Send besked" pending="Sender…" className="btn" />
          </form>
        </details>
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
