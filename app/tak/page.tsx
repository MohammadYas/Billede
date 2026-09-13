import { copy } from '@/lib/copy';
import { paymentProvider } from '@/lib/payments/stripe';
import { claimPurchaseTracking, getOrderByField, latestOrderForSession, type Order } from '@/lib/db/orders';
import { markPaid } from '@/lib/payments/fulfil-paid';
import { imageUrl } from '@/lib/preview-service';
import { orderDescription, orderLines, orderProduct, repeatLink } from '@/lib/order-summary';
import { readAddOns, formatOere } from '@/lib/pricing';
import { readSessionId } from '@/lib/session';
import Footer from '@/components/Footer';
import MailLine from '@/components/MailLine';
import SiteHeader from '@/components/SiteHeader';
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
        // one conditional update, not read-then-write: two tabs or a reload cannot both fire the browser Purchase
        if (order && (await claimPurchaseTracking(order.id))) firePurchase = true;
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
  const value = (order?.amount ?? 0) / 100;
  const product = order ? orderProduct(order) : 'framed';
  const digital = product === 'digital';
  const timeline = c.tak.timeline.map(([k, v], i) => [k, i === 2 && product !== 'framed' ? (digital ? c.tak.afterDigital : c.tak.afterPrint) : v]);
  return (
    <>
      <SiteHeader note={c.preview.headNote} />
      <main className="wrap" style={{ paddingTop: 'var(--s6)', paddingBottom: 'var(--s9)' }}>
        <div className="container" style={{ display: 'grid', gap: 'var(--s6)' }}>
          {order ? (
            <div className="ed" style={{ rowGap: 'var(--s6)' }}>
              <div style={{ display: 'grid', gap: 'var(--s4)', alignContent: 'start' }}>
                <h1 style={{ maxWidth: '12em' }}>{c.tak.h1}</h1>
                <p className="lead" style={{ maxWidth: '24em' }}>{digital ? c.tak.pDigital : c.tak.p}</p>
                <p className="caption tabular">Ordre {order.id.slice(0, 8)}</p>
                {firePurchase && <PurchaseEvent value={value} eventId={order.id} email={order.customer_email} phone={order.customer_phone} format={order.format} product={product} />}
              </div>
              <div style={{ display: 'grid', gap: 'var(--s5)' }}>
                {product === 'framed' && order.mockup_path
                  ? <img src={imageUrl(order, 'mockup', order.format, readAddOns((order.preview_meta as { addons?: unknown } | null)?.addons).frame)} alt={`Dit billede indrammet: ${orderDescription(order)}`} width={1200} height={960} style={{ maxWidth: 520 }} />
                  : order.preview_path && <img src={imageUrl(order, order.chosen_colour ? 'colour' : 'preview')} alt={`Dit restaurerede billede: ${orderDescription(order)}`} style={{ width: '100%', maxWidth: 520, height: 'auto' }} />}
                <div className="bill">
                  <p className="cfg-label">{c.preview.summaryTitle}</p>
                  <dl className="bill-lines">
                    {orderLines(order).map((l) => {
                      const i = l.lastIndexOf(' — ');
                      return <div key={l}><dt>{l.slice(0, i)}</dt><dd className="tabular">{l.slice(i + 3)}</dd></div>;
                    })}
                    {digital
                      ? <div><dt>{c.preview.deliveryDigital}</dt><dd>{c.preview.deliveryDigitalValue}</dd></div>
                      : <div><dt>{c.preview.shipping}</dt><dd>{c.preview.shippingFree}</dd></div>}
                  </dl>
                  <p className="bill-total"><span>{c.preview.total}</span> <b className="tabular">{formatOere(order.amount ?? 0)}</b></p>
                  <p className="caption">{orderDescription(order)} · {c.preview.vat}</p>
                </div>
                <dl className="timeline">
                  {timeline.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                </dl>
                {repeatLink(order) && (
                  <section className="again">
                    <h2>{c.tak.againH2}</h2>
                    <p className="measure">{digital ? c.tak.againPDigital : c.tak.againP}</p>
                    <p><a className="btn btn-quiet" href={repeatLink(order)!}>{c.tak.againCta}</a></p>
                  </section>
                )}
                {!repeatLink(order) && <p className="small"><a className="tap" href="/">{c.tak.more}</a></p>}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--s4)' }}>
              <h1 style={{ maxWidth: '12em' }}>{c.tak.unverifiedH1}</h1>
              <p className="lead" style={{ maxWidth: '26em' }}>{c.tak.unverifiedP}</p>
              <MailLine text={c.tak.doubt} email={c.email} href={c.emailHref} />
              <p>{backTo ? <a className="btn" href={backTo}>{c.tak.back}</a> : <a className="btn" href="/">{c.tak.home}</a>}</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
