import { notFound, redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin/auth';
import { markThreadRead, threadMessages } from '@/lib/db/messages';
import { supabaseAdmin } from '@/lib/db/supabase';
import { actionReply } from '@/lib/admin/actions';
import { statusDa } from '@/lib/admin/status';
import AdminBar from '@/components/admin/AdminBar';
import SubmitButton from '@/components/SubmitButton';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

const when = (iso: string) => new Date(iso).toLocaleString('da-DK', { timeZone: 'Europe/Copenhagen', dateStyle: 'medium', timeStyle: 'short' });

/** One conversation: the messages in order, the customer's orders beside them, and the answer box. */
export default async function Samtale({ params, searchParams }: { params: Promise<{ thread: string }>; searchParams: Promise<{ msg?: string }> }) {
  if (!(await isAdmin())) redirect('/admin');
  const { thread: raw } = await params;
  const { msg } = await searchParams;
  const thread = decodeURIComponent(raw).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(thread)) notFound();
  const messages = await threadMessages(thread);
  if (messages.length === 0) notFound();
  await markThreadRead(thread);
  const { data: orders } = await supabaseAdmin().from('orders').select('id, status, created_at, format').eq('customer_email', thread).order('created_at', { ascending: false }).limit(10);
  const name = messages.find((m) => m.direction === 'in' && m.from_name)?.from_name ?? null;
  const reply = actionReply.bind(null, thread);
  return (
    <main className="wrap admin" style={{ paddingTop: 'var(--s3)', paddingBottom: 'var(--s9)' }}>
      <div className="container" style={{ display: 'grid', gap: 'var(--s5)', maxWidth: 860 }}>
        <AdminBar title={name ?? thread} />
        {msg && <p className="small notice" role="status">{msg}</p>}
        <div style={{ display: 'grid', gap: 'var(--s1)' }}>
          <h1 style={{ fontSize: 'var(--fs-h2)' }}>{name ?? thread}</h1>
          <p className="small muted">{thread}{orders?.length ? <> · {orders.map((o) => <a key={o.id} href={`/admin/orders/${o.id}`} style={{ marginRight: 8 }}>Ordre {o.id.slice(0, 8)} ({statusDa(o.status)})</a>)}</> : ' · ingen ordre på denne adresse'}</p>
        </div>
        <ol className="msg-thread">
          {messages.map((m) => (
            <li key={m.id} className={m.direction === 'out' ? 'is-out' : 'is-in'}>
              <div className="msg-meta"><b>{m.direction === 'out' ? 'Du' : m.from_name ?? m.from_email}</b> · {when(m.created_at)}{m.channel === 'form' ? ' · kontaktformular' : ''}{m.subject && m.channel === 'email' ? ` · ${m.subject}` : ''}</div>
              {m.text_body ? <p className="msg-body">{m.text_body}</p> : m.html_body ? <div className="msg-body" dangerouslySetInnerHTML={{ __html: m.html_body }} /> : <p className="msg-body muted">(tom)</p>}
              {m.attachments?.length ? <p className="caption">Vedhæftet: {m.attachments.map((a) => `${a.filename} (${Math.round(a.size / 1024)} KB)`).join(', ')} – hentes i Resend → Emails → Receiving.</p> : null}
            </li>
          ))}
        </ol>
        <form action={reply} className="adm-card" style={{ maxWidth: 'none' }}>
          <h3>Svar til {thread}</h3>
          <div className="field"><label htmlFor="reply" className="visually-hidden">Svar</label><textarea id="reply" name="text" rows={7} required placeholder="Skriv dit svar. Det sendes fra hej@billedearv.dk med underskrift." /></div>
          <SubmitButton label="Send svar" pending="Sender…" />
        </form>
      </div>
    </main>
  );
}
