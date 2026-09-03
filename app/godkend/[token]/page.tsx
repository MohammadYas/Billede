import { notFound } from 'next/navigation';
import { orderByToken } from '@/lib/approval';
import { setStatus } from '@/lib/db/orders';
import { copy } from '@/lib/copy';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

async function approve(token: string) {
  'use server';
  const order = await orderByToken(token);
  if (!order || order.status !== 'AWAITING_APPROVAL') return;
  await setStatus(order.id, 'APPROVED', { approval_status: 'APPROVED' });
}

export default async function Godkend({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await orderByToken(token);
  if (!order) notFound();
  const c = copy();
  const done = order.status !== 'AWAITING_APPROVAL' && order.status !== 'CHANGE_REQUESTED';
  const approveWithToken = approve.bind(null, token);
  return (
    <>
      <main className="wrap" style={{ paddingTop: 'var(--s6)', paddingBottom: 'var(--s9)' }}>
        <div className="container" style={{ display: 'grid', gap: 'var(--s5)', maxWidth: 720 }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 22 }}>Genfundet</span>
          {done ? (
            <>
              <h1>Tak. Vi printer og sender.</h1>
              <p className="lead measure">Du får en mail med tracking, når pakken er sendt. Ordre {order.id.slice(0, 8)}.</p>
            </>
          ) : (
            <>
              <h1 style={{ maxWidth: '14em' }}>Ligner det?</h1>
              <img src={`/godkend/${token}/billede`} alt="Dit færdige billede" style={{ width: '100%', border: '1px solid var(--hairline)' }} />
              <p className="measure">Tryk Godkend, og vi printer det i {c.formatLabel}, indrammer det og sender det. Er der noget, du vil have ændret, så skriv det – det koster ikke ekstra, og vi printer ikke, før du siger ja.</p>
              <form action={approveWithToken} style={{ display: 'grid', gap: 'var(--s3)' }}>
                <button type="submit" className="btn btn-block">Godkend</button>
                <a href={`/godkend/${token}/aendring`} className="btn btn-block btn-quiet">Jeg vil have en ændring</a>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
