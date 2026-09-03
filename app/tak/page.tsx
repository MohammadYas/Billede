import { copy } from '@/lib/copy';
import { paymentProvider } from '@/lib/payments/stripe';
import { getOrderByField, updateOrder, type Order } from '@/lib/db/orders';
import { markPaid } from '@/lib/payments/fulfil-paid';
import { imageUrl } from '@/lib/preview-service';
import Footer from '@/components/Footer';
import Wordmark from '@/components/Wordmark';
import PurchaseEvent from '@/components/PurchaseEvent';

export const dynamic = 'force-dynamic';

/** /tak — verifies the Checkout session server-side; Purchase fires exactly once (purchase_tracked_at). */
export default async function Tak({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { session_id } = await searchParams;
  const c = copy();
  let firePurchase = false;
  let order: Order | null = null;
  if (session_id && /^cs_(test|live)_[A-Za-z0-9]+$/.test(session_id) && process.env.STRIPE_SECRET_KEY) {
    try {
      const verified = await paymentProvider().verifySession(session_id);
      if (verified.paid && verified.orderId) {
        order = await markPaid(verified.orderId, verified);
        if (order && !(order as unknown as { purchase_tracked_at?: string | null }).purchase_tracked_at) {
          await updateOrder(order.id, { purchase_tracked_at: new Date().toISOString() } as never);
          firePurchase = true;
        }
      }
    } catch (e) { console.error('tak verify failed', e); }
  } else if (session_id) {
    const o = await getOrderByField('payment_session_id', session_id).catch(() => null);
    if (o && o.status !== 'NEW' && o.status !== 'PREVIEW_READY') order = o;
  }
  const value = ((order?.amount ?? 59900) / 100);
  return (
    <>
      <main className="wrap" style={{ paddingTop: 'var(--s5)', paddingBottom: 'var(--s9)' }}>
        <div className="container" style={{ display: 'grid', gap: 'var(--s6)' }}>
          <Wordmark />
          {order ? (
            <div className="ed" style={{ rowGap: 'var(--s6)' }}>
              <div style={{ display: 'grid', gap: 'var(--s4)', alignContent: 'start' }}>
                <h1 style={{ maxWidth: '12em' }}>{c.tak.h1}</h1>
                <p className="lead" style={{ maxWidth: '24em' }}>{c.tak.p}</p>
                <p className="caption tabular">Ordre {order.id.slice(0, 8)}</p>
                {firePurchase && <PurchaseEvent value={value} eventId={order.id} />}
              </div>
              <div style={{ display: 'grid', gap: 'var(--s5)' }}>
                {order.mockup_path && <img src={imageUrl(order, 'mockup')} alt={`Dit billede indrammet i ${c.formatLabel}`} width={1200} height={960} style={{ maxWidth: 520 }} />}
                <dl className="timeline">
                  {c.tak.timeline.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                </dl>
                <p className="small"><a className="tap" href="/">{c.tak.more}</a></p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--s4)' }}>
              <h1 style={{ maxWidth: '12em' }}>Vi kunne ikke bekræfte betalingen.</h1>
              <p className="lead" style={{ maxWidth: '26em' }}>Hvis pengene er trukket, får du en bekræftelse på mail inden for få minutter. Ellers kan du prøve igen fra forsiden.</p>
              <p><a className="tap" href="/">Til forsiden</a></p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
