import { copy } from '@/lib/copy';
import { paymentProvider } from '@/lib/payments/stripe';
import { getOrderByField, updateOrder } from '@/lib/db/orders';
import { markPaid } from '@/lib/payments/fulfil-paid';
import Footer from '@/components/Footer';
import PurchaseEvent from '@/components/PurchaseEvent';

export const dynamic = 'force-dynamic';

/** /tak — verifies the Checkout session server-side; Purchase fires exactly once (purchase_tracked_at). */
export default async function Tak({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { session_id } = await searchParams;
  const c = copy();
  let firePurchase = false;
  let ok = false;
  let value = 599;
  let orderId: string | null = null;
  if (session_id && /^cs_(test|live)_[A-Za-z0-9]+$/.test(session_id) && process.env.STRIPE_SECRET_KEY) {
    try {
      const verified = await paymentProvider().verifySession(session_id);
      if (verified.paid && verified.orderId) {
        const order = await markPaid(verified.orderId, verified);
        if (order) {
          ok = true; orderId = order.id; value = (order.amount ?? 59900) / 100;
          const alreadyTracked = (order as unknown as { purchase_tracked_at?: string | null }).purchase_tracked_at;
          if (!alreadyTracked) {
            await updateOrder(order.id, { purchase_tracked_at: new Date().toISOString() } as never);
            firePurchase = true;
          }
        }
      }
    } catch (e) {
      console.error('tak verify failed', e);
    }
  } else if (session_id) {
    const o = await getOrderByField('payment_session_id', session_id).catch(() => null);
    ok = Boolean(o && o.status !== 'NEW' && o.status !== 'PREVIEW_READY');
  }
  return (
    <>
      <main className="wrap" style={{ minHeight: '70dvh', display: 'grid', alignContent: 'center', paddingTop: 'var(--s8)', paddingBottom: 'var(--s8)' }}>
        <div className="container" style={{ display: 'grid', gap: 'var(--s5)' }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 22 }}>Genfundet</span>
          {ok ? (
            <>
              <h1 className="measure" style={{ maxWidth: '16em' }}>{c.tak.h1}</h1>
              <p className="lead measure" style={{ maxWidth: '28em' }}>{c.tak.p}</p>
              {orderId && <p className="caption">Ordre {orderId.slice(0, 8)}</p>}
              {firePurchase && <PurchaseEvent value={value} eventId={orderId ?? session_id ?? ''} />}
            </>
          ) : (
            <>
              <h1 className="measure" style={{ maxWidth: '16em' }}>Vi kunne ikke bekræfte betalingen.</h1>
              <p className="lead measure" style={{ maxWidth: '28em' }}>Hvis pengene er trukket, får du en bekræftelse på mail inden for få minutter. Ellers kan du prøve igen fra forsiden.</p>
              <p><a href="/">Til forsiden</a></p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
