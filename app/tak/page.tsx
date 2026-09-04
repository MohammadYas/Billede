import { copy } from '@/lib/copy';
import { paymentProvider } from '@/lib/payments/stripe';
import { getOrderByField, latestOrderForSession, updateOrder, type Order } from '@/lib/db/orders';
import { markPaid } from '@/lib/payments/fulfil-paid';
import { imageUrl } from '@/lib/preview-service';
import { readSessionId } from '@/lib/session';
import Footer from '@/components/Footer';
import Wordmark from '@/components/Wordmark';
import PurchaseEvent from '@/components/PurchaseEvent';
import { headers } from 'next/headers';

export const metadata = { robots: { index: false, follow: false } };

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
        const h = await headers();
        order = await markPaid(verified.orderId, verified, { ip: (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || null, ua: h.get('user-agent') });
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
  // Unverified: the session cookie still knows the customer's preview, so the way back is the preview, not the front page.
  let backTo: string | null = null;
  if (!order) {
    const sid = await readSessionId();
    const last = sid ? await latestOrderForSession(sid).catch(() => null) : null;
    if (last && last.preview_path) backTo = `/p/${last.id}`;
    // cookie gone (in-app browser → Safari hand-off): the Checkout session still names the order, and the share token opens it anywhere
    if (!backTo && session_id) {
      const bySession = await getOrderByField('payment_session_id', session_id).catch(() => null);
      const token = (bySession?.preview_meta as { share_token?: string } | null)?.share_token;
      if (bySession?.preview_path && token) backTo = `/p/${bySession.id}?t=${encodeURIComponent(token)}`;
    }
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
                {firePurchase && <PurchaseEvent value={value} eventId={order.id} email={order.customer_email} phone={order.customer_phone} />}
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
              <h1 style={{ maxWidth: '12em' }}>{c.tak.unverifiedH1}</h1>
              <p className="lead" style={{ maxWidth: '26em' }}>{c.tak.unverifiedP}</p>
              {c.tak.doubt && <p className="measure">{c.tak.doubt.split(c.phone).map((part, i, arr) => <span key={i}>{part}{i < arr.length - 1 && <a href={c.phoneHref}>{c.phone}</a>}</span>)}</p>}
              <p>{backTo ? <a className="btn" href={backTo}>{c.tak.back}</a> : <a className="btn" href="/">{c.tak.home}</a>}</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
