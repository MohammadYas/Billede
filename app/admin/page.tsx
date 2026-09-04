import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isAdmin, makeSessionCookie, passwordOk, rateLimited, recordAttempt } from '@/lib/admin/auth';
import { listOrders } from '@/lib/db/orders';
import { formatLabel } from '@/lib/pricing';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

async function login(formData: FormData) {
  'use server';
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  if (rateLimited(ip)) redirect('/admin?fejl=vent');
  const ok = passwordOk(String(formData.get('password') ?? ''));
  recordAttempt(ip, ok);
  if (!ok) redirect('/admin?fejl=1');
  const c = await cookies();
  c.set(ADMIN_COOKIE, makeSessionCookie(), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 3600 });
  redirect('/admin');
}

const STATUS_DA: Record<string, string> = {
  NEW: 'Ny', PREVIEW_READY: 'Preview klar', PAID: 'Betalt', IN_RETOUCH: 'I retouch', AWAITING_APPROVAL: 'Venter på godkendelse', CHANGE_REQUESTED: 'Ændring ønsket',
  APPROVED: 'Godkendt', IN_PRODUCTION: 'I produktion', SHIPPED: 'Sendt', COMPLETED: 'Afsluttet', REFUNDED: 'Refunderet', MANUAL_REVIEW: 'Manuel vurdering', ABANDONED: 'Opgivet',
};

const WORK: Record<string, string> = {
  PAID: 'Generér/upload final og send godkendelsesmail',
  CHANGE_REQUESTED: 'Ret efter kundens besked, ny final, ny mail',
  AWAITING_APPROVAL: 'Venter på kundens ja (ring efter 7 dage)',
  APPROVED: 'Bestil print hos partneren',
  IN_PRODUCTION: 'Gem tracking og sæt SHIPPED',
  MANUAL_REVIEW: 'Svar kunden inden 24 timer',
};
const ANALYTICS = ['NEW', 'PREVIEW_READY', 'ABANDONED'];

export default async function Admin({ searchParams }: { searchParams: Promise<{ fejl?: string; status?: string; alle?: string }> }) {
  const sp = await searchParams;
  if (!(await isAdmin())) {
    return (
      <main className="wrap admin" style={{ paddingTop: 'var(--s8)' }}>
        <form action={login} className="container" style={{ maxWidth: 360, display: 'grid', gap: 'var(--s4)' }}>
          <h1 style={{ fontSize: 'var(--fs-h2)' }}>Genfundet admin</h1>
          <div className="field"><label htmlFor="pw">Adgangskode</label><input id="pw" name="password" type="password" autoComplete="current-password" required /></div>
          {sp.fejl === 'vent' && <p className="small" style={{ color: 'var(--error)' }}>For mange forsøg. Vent 15 minutter.</p>}
          {sp.fejl === '1' && <p className="small" style={{ color: 'var(--error)' }}>Forkert adgangskode.</p>}
          <button className="btn" type="submit">Log ind</button>
        </form>
      </main>
    );
  }
  const orders = await listOrders({ status: sp.status as never });
  const active = sp.status || sp.alle ? orders.filter((o) => o.status !== 'ABANDONED' || sp.status === 'ABANDONED') : orders.filter((o) => !ANALYTICS.includes(o.status));
  const age = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / 864e5);
  const work = Object.keys(WORK).map((st) => ({ st, rows: orders.filter((o) => o.status === st && !(st === 'MANUAL_REVIEW' && !o.customer_email)) })).filter((g) => g.rows.length);
  return (
    <main className="wrap admin" style={{ paddingTop: 'var(--s6)', paddingBottom: 'var(--s9)' }}>
      <div className="container" style={{ display: 'grid', gap: 'var(--s5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 'var(--s3)' }}>
          <h1 style={{ fontSize: 'var(--fs-h2)' }}>Ordrer</h1>
          <p className="small">
            {['PAID', 'IN_RETOUCH', 'AWAITING_APPROVAL', 'CHANGE_REQUESTED', 'APPROVED', 'IN_PRODUCTION', 'MANUAL_REVIEW'].map((s) => <a key={s} href={`/admin?status=${s}`} style={{ marginRight: 12 }}>{STATUS_DA[s]}</a>)}
            <a href="/admin">Alle</a>
          </p>
        </div>
        {!sp.status && (
          <section style={{ display: 'grid', gap: 'var(--s3)' }}>
            <h2 style={{ fontSize: 'var(--fs-lead)', fontFamily: 'var(--sans)', fontWeight: 600 }}>Til handling</h2>
            {work.length === 0 && <p className="small muted">Intet at gøre lige nu.</p>}
            {work.map((g) => (
              <div key={g.st} className="small" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 'var(--s2)' }}>
                <p><strong>{STATUS_DA[g.st]} · {g.rows.length}</strong> — {WORK[g.st]}</p>
                <ul style={{ margin: 'var(--s1) 0 0', paddingLeft: '1.2em' }}>
                  {g.rows.map((o) => <li key={o.id}><a href={`/admin/orders/${o.id}`}>{o.id.slice(0, 8)}</a> · {o.customer_name ?? o.customer_email ?? '—'} · {age(o.updated_at ?? o.created_at)} d{o.change_request_text ? ` · “${o.change_request_text.slice(0, 60)}”` : ''}</li>)}
                </ul>
              </div>
            ))}
            <p className="caption">Previews uden køb og opgivne uploads er skjult her (<a href="/admin?alle=1">vis alle</a>).</p>
          </section>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table className="tabular">
            <thead><tr><th>Oprettet</th><th>Ordre</th><th>Status</th><th>Format</th><th>Kunde</th><th>Beløb</th><th>Kilde</th></tr></thead>
            <tbody>
              {active.map((o) => (
                <tr key={o.id}>
                  <td>{new Date(o.created_at).toLocaleString('da-DK', { timeZone: 'Europe/Copenhagen', dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td><a href={`/admin/orders/${o.id}`}>{o.id.slice(0, 8)}</a></td>
                  <td>{STATUS_DA[o.status] ?? o.status}</td>
                  <td>{formatLabel(o.format)}{o.chosen_colour ? ' · farve' : ''}</td>
                  <td>{o.customer_email ?? '—'}</td>
                  <td>{o.amount ? `${(o.amount / 100).toLocaleString('da-DK')} kr.` : '—'}</td>
                  <td>{o.utm?.utm_content ?? o.utm?.utm_source ?? '—'}</td>
                </tr>
              ))}
              {active.length === 0 && <tr><td colSpan={7} className="muted">Ingen ordrer endnu.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
