import { notFound, redirect } from 'next/navigation';
import { orderByToken, requestChangeByToken } from '@/lib/approval';
import { copy } from '@/lib/copy';
import Footer from '@/components/Footer';
import Wordmark from '@/components/Wordmark';
import SubmitButton from '@/components/SubmitButton';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

async function requestChange(token: string, formData: FormData) {
  'use server';
  const text = String(formData.get('text') ?? '').trim().slice(0, 2000);
  if (!text) redirect(`/godkend/${token}/aendring?tom=1`);
  const r = await requestChangeByToken(token, text);
  redirect(`/godkend/${token}/aendring?r=${r}`);
}

export default async function Aendring({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ r?: string; tom?: string }> }) {
  const { token } = await params;
  const { r, tom } = await searchParams;
  const order = await orderByToken(token);
  if (!order) notFound();
  const c = copy();
  const action = requestChange.bind(null, token);
  const approved = order.status !== 'AWAITING_APPROVAL' && order.status !== 'CHANGE_REQUESTED';
  return (
    <>
      <main className="wrap" style={{ paddingTop: 'var(--s5)', paddingBottom: 'var(--s9)' }}>
        <div className="container" style={{ display: 'grid', gap: 'var(--s5)', maxWidth: 720 }}>
          <Wordmark />
          {approved ? (
            <>
              <h1 style={{ maxWidth: '14em' }}>Billedet er godkendt og på vej i produktion.</h1>
              <p className="lead measure">Skal noget alligevel ændres, så skriv til os med det samme{c.email ? <> på <a href={c.emailHref}>{c.email}</a></> : null} – vi svarer inden 24 timer.</p>
            </>
          ) : r === 'ok' || order.status === 'CHANGE_REQUESTED' ? (
            <>
              <h1>Tak. Vi retter det.</h1>
              <p className="lead measure">Du får en ny mail til godkendelse inden 48 timer. Vi printer ikke, før du siger ja – og leveringen tæller først fra dit ja.</p>
              {order.change_request_text && <p className="measure small notice">Din besked: “{order.change_request_text}”</p>}
            </>
          ) : (
            <>
              <h1 style={{ maxWidth: '14em' }}>Hvad skal ændres?</h1>
              <form action={action} style={{ display: 'grid', gap: 'var(--s4)' }}>
                <div className="field">
                  <label htmlFor="text">Skriv så konkret som muligt – f.eks. “min mors øjne er blevet for mørke” eller “der mangler en knap på jakken”.</label>
                  <textarea id="text" name="text" rows={6} required maxLength={2000} aria-invalid={Boolean(tom)} />
                  {tom && <span className="error" role="alert">Skriv, hvad der skal ændres.</span>}
                </div>
                <SubmitButton label="Send ændring" pending="Sender…" />
                <a href={`/godkend/${token}`}>Tilbage til billedet</a>
              </form>
            </>
          )}
          {c.email && <p className="small muted">Spørgsmål? Skriv til <a href={c.emailHref}>{c.email}</a> – vi svarer inden 24 timer.</p>}
        </div>
      </main>
      <Footer />
    </>
  );
}
