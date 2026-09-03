import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isAdmin, makeSessionCookie, passwordOk, rateLimited, recordAttempt } from '@/lib/admin/auth';
import { listOrders } from '@/lib/db/orders';
import { formatLabel } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

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

export default async function Admin({ searchParams }: { searchParams: Promise<{ fejl?: string; status?: string }> }) {
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
  const active = orders.filter((o) => !['ABANDONED'].includes(o.status));
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
