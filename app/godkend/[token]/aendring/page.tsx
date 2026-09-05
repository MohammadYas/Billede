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

const COLOUR_REQUEST = 'Jeg vil gerne se billedet i farver.';

export default async function Aendring({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ r?: string; tom?: string; farver?: string }> }) {
  const { token } = await params;
  const { r, tom, farver } = await searchParams;
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
              {order.final_path && <p><a className="tap" href={`/godkend/${token}`}>Hent din fil i høj opløsning</a></p>}
            </>
          ) : r === 'ok' || order.status === 'CHANGE_REQUESTED' ? (
            <>
              <h1>Tak. Vi retter det.</h1>
              <p className="lead measure">Du får en ny mail til godkendelse inden 48 timer. Vi printer ikke, før du siger ja – og leveringen tæller først fra dit ja.</p>
              {order.change_request_text && <p className="measure small notice">Din besked: “{order.change_request_text}”</p>}
            </>
          ) : (
            <>
              <h1 style={{ maxWidth: '14em' }}>{farver === '1' ? 'I farver – uden ekstra beregning.' : 'Hvad skal ændres?'}</h1>
              {farver === '1' && <p className="lead measure">Send, så laver vi en farveversion og sender dig et nyt billede til godkendelse. Du kan stadig vælge sort-hvid til sidst.</p>}
              <form action={action} style={{ display: 'grid', gap: 'var(--s4)' }}>
                <div className="field">
                  <label htmlFor="text">Skriv så konkret som muligt – f.eks. “min mors øjne er blevet for mørke” eller “der mangler en knap på jakken”.</label>
                  <textarea id="text" name="text" rows={6} required maxLength={2000} aria-invalid={Boolean(tom)} defaultValue={farver === '1' ? COLOUR_REQUEST : undefined} />
                  {tom && <span className="error" role="alert">Skriv, hvad der skal ændres.</span>}
                </div>
                <SubmitButton label="Send ændring" pending="Sender…" />
                <a href={`/godkend/${token}`}>Tilbage til billedet</a>
                {/* the guarantee, where it actually applies: the customer must be able to say no and get the money back */}
                <p className="small muted measure" style={{ paddingTop: 'var(--s3)', borderTop: '1px solid var(--hairline)' }}>
                  Vil du hellere fortryde? Skriv <b>“jeg vil have pengene tilbage”</b> i feltet, så refunderer vi hele beløbet – vi har ikke printet noget endnu.
                </p>
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
