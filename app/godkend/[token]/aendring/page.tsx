import { notFound, redirect } from 'next/navigation';
import { orderByToken } from '@/lib/approval';
import { setStatus } from '@/lib/db/orders';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

async function requestChange(token: string, formData: FormData) {
  'use server';
  const text = String(formData.get('text') ?? '').trim().slice(0, 2000);
  const order = await orderByToken(token);
  if (!order || (order.status !== 'AWAITING_APPROVAL' && order.status !== 'CHANGE_REQUESTED')) return;
  if (!text) return;
  await setStatus(order.id, 'CHANGE_REQUESTED', { approval_status: 'CHANGE_REQUESTED', change_request_text: text });
  redirect(`/godkend/${token}/aendring?sendt=1`);
}

export default async function Aendring({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ sendt?: string }> }) {
  const { token } = await params;
  const { sendt } = await searchParams;
  const order = await orderByToken(token);
  if (!order) notFound();
  const action = requestChange.bind(null, token);
  return (
    <>
      <main className="wrap" style={{ paddingTop: 'var(--s6)', paddingBottom: 'var(--s9)' }}>
        <div className="container" style={{ display: 'grid', gap: 'var(--s5)', maxWidth: 720 }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 22 }}>Genfundet</span>
          {sendt || order.status === 'CHANGE_REQUESTED' ? (
            <>
              <h1>Tak. Vi retter det.</h1>
              <p className="lead measure">Du får en ny mail til godkendelse, når det er klar. Vi printer ikke, før du siger ja.</p>
            </>
          ) : (
            <>
              <h1 style={{ maxWidth: '14em' }}>Hvad skal ændres?</h1>
              <form action={action} style={{ display: 'grid', gap: 'var(--s4)' }}>
                <div className="field">
                  <label htmlFor="text">Skriv så konkret som muligt – f.eks. "min mors øjne er blevet for mørke" eller "der mangler en knap på jakken".</label>
                  <textarea id="text" name="text" rows={6} required maxLength={2000} />
                </div>
                <button type="submit" className="btn btn-block">Send ændring</button>
                <a href={`/godkend/${token}`}>Tilbage til billedet</a>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
