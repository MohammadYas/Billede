import { cookies, headers } from 'next/headers';
import { clientIp } from '@/lib/api/client';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isAdmin, makeSessionCookie, passwordOk, rateLimited, recordAttempt, safeNext } from '@/lib/admin/auth';
import { listOrders } from '@/lib/db/orders';
import { supabaseAdmin } from '@/lib/db/supabase';
import type { Utm } from '@/lib/analytics/events';
import { FUNNEL_STEPS, funnel } from '@/lib/analytics/funnel';
import { signedUrl } from '@/lib/db/storage';
import { formatLabel } from '@/lib/pricing';
import { readAddOns } from '@/lib/pricing';
import { STATUS_DA } from '@/lib/admin/status';
import AdminBar from '@/components/admin/AdminBar';
import Wordmark from '@/components/Wordmark';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

async function login(formData: FormData) {
  'use server';
  const h = await headers();
  const ip = clientIp(h) ?? 'local';
  // the page the admin actually asked for, carried through the form so a deep link survives the login
  const next = safeNext(String(formData.get('next') ?? ''));
  const q = next === '/admin' ? '' : `&next=${encodeURIComponent(next)}`;
  if (rateLimited(ip)) redirect(`/admin?fejl=vent${q}`);
  const ok = passwordOk(String(formData.get('password') ?? ''));
  recordAttempt(ip, ok);
  if (!ok) redirect(`/admin?fejl=1${q}`);
  const c = await cookies();
  // 'lax', not 'strict': a link in a mail is a cross-site navigation, and a strict cookie is withheld on
  // it — so an admin who was already logged in was shown the login form every time he opened an order
  // from his inbox. Lax still withholds the cookie on cross-site POSTs, which is where CSRF lives.
  c.set(ADMIN_COOKIE, makeSessionCookie(), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 3600 });
  redirect(next);
}

const WORK: Record<string, string> = {
  PAID: 'Generér/upload final og send godkendelsesmail',
  CHANGE_REQUESTED: 'Ret efter kundens besked, ny final, ny mail',
  AWAITING_APPROVAL: 'Venter på kundens ja · påmindelser dag 2, 7 og 14 · automatisk refusion dag 21',
  APPROVED: 'Bestil print hos partneren',
  IN_PRODUCTION: 'Gem tracking og sæt SHIPPED',
  MANUAL_REVIEW: 'Svar kunden inden 24 timer',
};
const ANALYTICS = ['NEW', 'PREVIEW_READY', 'ABANDONED'];

/** One label per link a visitor arrived on: utm_source · utm_campaign · utm_content (the ad's name). */
const srcKey = (u: Utm | null | undefined) => `${u?.utm_source ?? (u?.fbclid ? 'facebook (uden utm)' : 'direkte')}${u?.utm_campaign ? ' · ' + u.utm_campaign : ''}${u?.utm_content ? ' · ' + u.utm_content : ''}`;

export default async function Admin({ searchParams }: { searchParams: Promise<{ fejl?: string; status?: string; alle?: string; testbilleder?: string; next?: string }> }) {
  const sp = await searchParams;
  if (!(await isAdmin())) {
    return (
      <main className="wrap admin" style={{ paddingTop: 'var(--s8)' }}>
        <form action={login} className="container" style={{ maxWidth: 360, display: 'grid', gap: 'var(--s4)' }}>
          <Wordmark />
          <h1 style={{ fontSize: 'var(--fs-h2)' }}>Ordrer og produktion</h1>
          <p className="small muted">Kun for Billedearv.</p>
          <input type="hidden" name="next" value={safeNext(sp.next)} />
          <div className="field"><label htmlFor="pw">Adgangskode</label><input id="pw" name="password" type="password" autoComplete="current-password" required /></div>
          {safeNext(sp.next) !== '/admin' && <p className="small muted">Du sendes videre til den ordre, du klikkede på.</p>}
          {sp.fejl === 'vent' && <p className="small" style={{ color: 'var(--error)' }}>For mange forsøg. Vent 15 minutter.</p>}
          {sp.fejl === '1' && <p className="small" style={{ color: 'var(--error)' }}>Forkert adgangskode.</p>}
          <button className="btn" type="submit">Log ind</button>
        </form>
      </main>
    );
  }
  const orders = await listOrders({ status: sp.status as never });
  // The one number that decides the test: of the people who saw their own preview, how many went on
  // to payment. Distinct orders per event, last 30 days, from our own event log (not Meta's).
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  // PostgREST hands out at most 1000 rows per request, so the log is read in pages (newest first).
  type Ev = { name: string; order_id: string | null; session_id: string | null; utm: Utm | null };
  const ev: Ev[] = [];
  for (let from = 0; from < 30000; from += 1000) {
    const { data } = await supabaseAdmin().from('events').select('name, order_id, session_id, utm').in('name', [...FUNNEL_STEPS]).gte('created_at', since).order('created_at', { ascending: false }).range(from, from + 999);
    ev.push(...((data ?? []) as Ev[]));
    if (!data || data.length < 1000) break;
  }
  const distinct = (n: string) => new Set(ev.filter((e) => e.name === n).map((e) => e.order_id ?? e.session_id).filter(Boolean)).size;
  const shown = distinct('PreviewShown'), started = distinct('InitiateCheckout'), bought = distinct('Purchase');
  const ratio = shown ? Math.round((started / shown) * 100) : null;
  /**
   * The whole funnel in one table, in distinct sessions — the report that answers "where do they fall
   * off". Our own tests are excluded (?utm_source=pwtest), because 17 of 38 orders in the launch week
   * were ours and they buried the handful of real ones.
   *
   * The step that matters is "Så sit billede": until 2026-09-12 the report stopped at "billedet blev
   * færdigt", which is a job finishing, not a customer looking at anything.
   */
  const STEP_DA: Record<string, string> = {
    PageView: 'Åbnede siden', FlowOpened: 'Åbnede upload', UploadStarted: 'Valgte et billede',
    ProcessingStarted: 'Restaurering startet', PreviewShown: 'Billedet blev færdigt', PreviewViewed: 'Så sit billede',
    ProductSelected: 'Valgte produkt', CheckoutClicked: 'Trykkede bestil', InitiateCheckout: 'Betalingsside oprettet', Purchase: 'Betalte',
  };
  const real = ev.filter((e) => e.utm?.utm_source !== 'pwtest');
  const steps = funnel(real.map((e) => ({ name: e.name, session_id: e.session_id })));
  const sawResult = steps.find((r) => r.step === 'PreviewViewed')?.sessions ?? 0;
  // revenue per person who actually saw a result. Ad spend lives in Meta and never reaches this database,
  // so this is turnover per viewer, not profit — the caption says so rather than implying otherwise.
  const revenueOere = orders.filter((o) => o.created_at >= since && o.paid_at).reduce((sum, o) => sum + (o.amount ?? 0), 0);
  const perViewer = sawResult ? Math.round(revenueOere / 100 / sawResult) : null;
  const active = sp.status || sp.alle ? orders.filter((o) => o.status !== 'ABANDONED' || sp.status === 'ABANDONED') : orders.filter((o) => !ANALYTICS.includes(o.status));
  const age = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / 864e5);
  // a thumbnail per listed order: the customer's picture is what the owner recognises an order by
  const thumbs = new Map<string, string>();
  await Promise.all(active.slice(0, 60).map(async (o) => { const p = o.preview_path ?? o.original_path; if (p) { try { thumbs.set(o.id, await signedUrl(p, 900)); } catch { /* no thumbnail */ } } }));
  // every generation, newest first: the original next to what the model made of it, whatever happened afterwards
  // A click from an ad always carries fbclid, whatever the visitor answers to cookies. Everything else in
  // here is the owner's own testing or ours, and it buried the handful of real ones.
  const fromCampaign = (o: (typeof orders)[number]) => Boolean(o.utm?.fbclid) || o.utm?.utm_source === 'facebook';
  const allPreviews = orders.filter((o) => o.preview_path);
  const withPreview = sp.testbilleder ? allPreviews : allPreviews.filter(fromCampaign);
  const gens = withPreview.slice(0, 48);
  const pair = new Map<string, { before?: string; after?: string }>();
  await Promise.all(gens.map(async (o) => {
    const p: { before?: string; after?: string } = {};
    try { if (o.original_path) p.before = await signedUrl(o.original_path, 900); p.after = await signedUrl(o.preview_path!, 900); } catch { /* file gone */ }
    pair.set(o.id, p);
  }));
  // where the orders came from, last 30 days: previews, paid, money — per utm_source / utm_campaign
  const PAID = ['PAID', 'IN_RETOUCH', 'AWAITING_APPROVAL', 'CHANGE_REQUESTED', 'APPROVED', 'IN_PRODUCTION', 'SHIPPED', 'COMPLETED'];
  const bySource = new Map<string, { previews: number; paid: number; oere: number }>();
  for (const o of orders) {
    if (o.created_at < since) continue;
    const key = srcKey(o.utm);
    const row = bySource.get(key) ?? { previews: 0, paid: 0, oere: 0 };
    if (o.status !== 'NEW' && o.status !== 'ABANDONED') row.previews += 1;
    if (PAID.includes(o.status)) { row.paid += 1; row.oere += o.amount ?? 0; }
    bySource.set(key, row);
  }
  const sources = [...bySource.entries()].sort((a, b) => b[1].paid - a[1].paid || b[1].previews - a[1].previews);
  // and where the visitors came from, before anyone ordered: distinct sessions per step, per link — the
  // three launch ads show up as three rows (utm_content = the ad's name). Playwright test traffic is left out.
  const STEPS = ['PageView', 'FlowOpened', 'PreviewShown', 'PreviewViewed', 'Purchase'] as const;
  const emptyRow = () => ({ PageView: new Set<string>(), FlowOpened: new Set<string>(), PreviewShown: new Set<string>(), PreviewViewed: new Set<string>(), Purchase: new Set<string>() });
  const visits = new Map<string, Record<(typeof STEPS)[number], Set<string>>>();
  for (const e of ev) {
    if (!(STEPS as readonly string[]).includes(e.name) || e.utm?.utm_source === 'pwtest') continue;
    const k = srcKey(e.utm);
    const row = visits.get(k) ?? emptyRow();
    row[e.name as (typeof STEPS)[number]].add(e.order_id ?? e.session_id ?? '');
    visits.set(k, row);
  }
  const visitRows = [...visits.entries()].sort((a, b) => b[1].Purchase.size - a[1].Purchase.size || b[1].PreviewShown.size - a[1].PreviewShown.size || b[1].PageView.size - a[1].PageView.size);
  const work = Object.keys(WORK).map((st) => ({ st, rows: orders.filter((o) => o.status === st && !(st === 'MANUAL_REVIEW' && !o.customer_email)) })).filter((g) => g.rows.length);
  return (
    <main className="wrap admin" style={{ paddingTop: 'var(--s3)', paddingBottom: 'var(--s9)' }}>
      <div className="container" style={{ display: 'grid', gap: 'var(--s5)' }}>
        <AdminBar />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 'var(--s3)' }}>
          <h1 style={{ fontSize: 'var(--fs-h2)' }}>Ordrer</h1>
          <p className="small">
            {['PAID', 'IN_RETOUCH', 'AWAITING_APPROVAL', 'CHANGE_REQUESTED', 'APPROVED', 'IN_PRODUCTION', 'MANUAL_REVIEW'].map((s) => <a key={s} href={`/admin?status=${s}`} style={{ marginRight: 12 }}>{STATUS_DA[s]}</a>)}
            <a href="/admin">Alle</a>
          </p>
        </div>
        {!sp.status && (
          <section style={{ display: 'grid', gap: 'var(--s1)', padding: 'var(--s4) 0', borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)' }}>
            <p className="cfg-label">Preview → betaling · 30 dage</p>
            <p style={{ fontFamily: 'var(--display)', fontSize: 'var(--fs-display)', lineHeight: 1, fontWeight: 300 }} className="tabular">{ratio === null ? '–' : `${ratio} %`}</p>
            <p className="small muted">{started} af {shown} viste previews gik videre til betaling · {bought} køb. Kilde: vores egen eventlog (PreviewShown → InitiateCheckout), ikke Meta.</p>
          </section>
        )}
        {!sp.status && (
          <section className="adm-sources" style={{ display: 'grid', gap: 'var(--s3)' }}>
            <h2 style={{ fontSize: 'var(--fs-lead)', fontFamily: 'var(--sans)', fontWeight: 600 }}>Trin for trin · 30 dage</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="tabular">
                <thead><tr><th>Trin</th><th>Personer</th><th>Faldt fra</th><th>Videre</th></tr></thead>
                <tbody>
                  {steps.map((r, i) => {
                    const before = i === 0 ? null : steps[i - 1].sessions;
                    return (
                      <tr key={r.step}>
                        <td>{STEP_DA[r.step] ?? r.step}</td>
                        <td>{r.sessions}</td>
                        <td>{i === 0 ? '—' : r.lost || '—'}</td>
                        <td>{before ? `${Math.round((r.sessions / before) * 100)} %` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="caption">
              Unikke sessioner pr. trin, vores egen eventlog, test (utm_source=pwtest) fraregnet. «Billedet blev færdigt» er
              jobbet, der blev færdigt; «Så sit billede» er det restaurerede billede indlæst og synligt på skærmen i mindst
              et sekund. Forskellen mellem de to linjer er dem, der aldrig så resultatet.
            </p>
            <p className="small muted">
              Omsætning pr. person, der så sit billede: {perViewer === null ? '–' : `${perViewer.toLocaleString('da-DK')} kr.`}
              {' '}({(revenueOere / 100).toLocaleString('da-DK')} kr. betalt ÷ {sawResult} personer). Annonceforbrug ligger hos Meta
              og indgår ikke her, så det er omsætning, ikke indtjening.
            </p>
          </section>
        )}
        {!sp.status && (
          <section style={{ display: 'grid', gap: 'var(--s3)' }}>
            <h2 style={{ fontSize: 'var(--fs-lead)', fontFamily: 'var(--sans)', fontWeight: 600 }}>Genereringer · {withPreview.length}{withPreview.length > gens.length ? ` (viser ${gens.length} nyeste)` : ''}</h2>
            <p className="caption">{sp.testbilleder ? <>Alle billeder, også test. <a href="/admin">Vis kun fra annoncer</a></> : <>Kun billeder fra annoncerne. {allPreviews.length - withPreview.length > 0 ? <>{allPreviews.length - withPreview.length} test er skjult. </> : null}<a href="/admin?testbilleder=1">Vis alle</a></>}</p>
            <div className="adm-gens">
              {gens.map((o) => (
                <a key={o.id} href={`/admin/orders/${o.id}`} className="adm-gen">
                  <span className="adm-gen-pics">
                    {pair.get(o.id)?.before ? <img src={pair.get(o.id)!.before} alt="" loading="lazy" /> : <span aria-hidden />}
                    {pair.get(o.id)?.after ? <img src={pair.get(o.id)!.after} alt="" loading="lazy" /> : <span aria-hidden />}
                  </span>
                  <span className="small">{new Date(o.created_at).toLocaleString('da-DK', { timeZone: 'Europe/Copenhagen', dateStyle: 'short', timeStyle: 'short' })} · {STATUS_DA[o.status] ?? o.status}</span>
                  <span className="small muted">{o.customer_name ?? o.customer_email ?? 'ingen e-mail'} · {srcKey(o.utm)}</span>
                </a>
              ))}
              {gens.length === 0 && <p className="muted">{sp.testbilleder ? 'Ingen genereringer endnu.' : 'Ingen billeder fra annoncerne endnu.'}</p>}
            </div>
            <p className="caption">Alle previews, også dem uden køb. Original til venstre, restaurering til højre. Tryk for ordren.</p>
          </section>
        )}
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
        {!sp.status && (
          <section className="adm-sources" style={{ display: 'grid', gap: 'var(--s3)' }}>
            <h2 style={{ fontSize: 'var(--fs-lead)', fontFamily: 'var(--sans)', fontWeight: 600 }}>Besøg · 30 dage</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="tabular">
                <thead><tr><th>Kilde · kampagne · annonce</th><th>Besøg</th><th>Åbnede upload</th><th>Billede klar</th><th>Så det</th><th>Købte</th></tr></thead>
                <tbody>
                  {visitRows.map(([k, r]) => <tr key={k}><td>{k}</td><td>{r.PageView.size}</td><td>{r.FlowOpened.size}</td><td>{r.PreviewShown.size}</td><td>{r.PreviewViewed.size}</td><td>{r.Purchase.size}</td></tr>)}
                  {visitRows.length === 0 && <tr><td colSpan={6} className="muted">Ingen besøg de sidste 30 dage.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="caption">Unikke besøg (sessioner) pr. link fra vores egen eventlog. Annoncerne står som facebook · lancering-sep26 · FINAL_COLD_01/02/03; »facebook (uden utm)« er klik fra Facebook uden annonce-parametre (fx siden eller forhåndsvisning).</p>
            <h2 style={{ fontSize: 'var(--fs-lead)', fontFamily: 'var(--sans)', fontWeight: 600 }}>Ordrer pr. kilde · 30 dage</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="tabular">
                <thead><tr><th>Kilde · kampagne · annonce</th><th>Previews</th><th>Betalt</th><th>Omsætning</th><th>Preview → betalt</th></tr></thead>
                <tbody>
                  {sources.map(([k, r]) => <tr key={k}><td>{k}</td><td>{r.previews}</td><td>{r.paid}</td><td>{r.oere ? `${(r.oere / 100).toLocaleString('da-DK')} kr.` : '—'}</td><td>{r.previews ? `${Math.round((r.paid / r.previews) * 100)} %` : '—'}</td></tr>)}
                  {sources.length === 0 && <tr><td colSpan={5} className="muted">Ingen ordrer de sidste 30 dage.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="caption">utm_source, utm_campaign og utm_content (annoncens navn) fra linket, kunden kom ind på (fbclid uden utm tælles som facebook).</p>
          </section>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table className="tabular">
            <thead><tr><th>Billede</th><th>Oprettet</th><th>Ordre</th><th>Status</th><th>Format</th><th>Kunde</th><th>Beløb</th><th>Kilde</th></tr></thead>
            <tbody>
              {active.map((o) => (
                <tr key={o.id}>
                  <td>{thumbs.get(o.id) ? <a href={`/admin/orders/${o.id}`}><img className="adm-thumb" src={thumbs.get(o.id)} alt="" width={56} height={56} loading="lazy" /></a> : <span className="adm-thumb" aria-hidden />}</td>
                  <td>{new Date(o.created_at).toLocaleString('da-DK', { timeZone: 'Europe/Copenhagen', dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td><a href={`/admin/orders/${o.id}`}>{o.id.slice(0, 8)}</a></td>
                  <td>{STATUS_DA[o.status] ?? o.status}</td>
                  <td>{formatLabel(o.format)}{readAddOns((o.preview_meta as { addons?: unknown } | null)?.addons).frame === 'eg' ? ' · eg' : ''}{o.chosen_colour ? ' · farve' : ''}{readAddOns((o.preview_meta as { addons?: unknown } | null)?.addons).extraPrints > 0 ? ` · +${readAddOns((o.preview_meta as { addons?: unknown } | null)?.addons).extraPrints}` : ''}</td>
                  <td>{o.customer_email ?? '—'}</td>
                  <td>{o.amount ? `${(o.amount / 100).toLocaleString('da-DK')} kr.` : '—'}</td>
                  <td>{o.utm?.utm_source || o.utm?.utm_content || o.utm?.fbclid ? [o.utm?.utm_source ?? (o.utm?.fbclid ? 'facebook' : null), o.utm?.utm_campaign, o.utm?.utm_content].filter(Boolean).join(' · ') : '—'}</td>
                </tr>
              ))}
              {active.length === 0 && <tr><td colSpan={8} className="muted">Ingen ordrer endnu.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
