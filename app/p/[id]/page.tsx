import { notFound } from 'next/navigation';
import { copy } from '@/lib/copy';
import { getOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { ownsOrder, payloadFor } from '@/lib/preview-service';
import PreviewPanel from '@/components/PreviewPanel';
import Footer from '@/components/Footer';
import Wordmark from '@/components/Wordmark';

export const dynamic = 'force-dynamic';

/** The preview is the product page: it survives an interruption, can be reopened, and has room for the price. */
export default async function PreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cancelled?: string; t?: string }> }) {
  const { id } = await params;
  const { cancelled, t } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [order, sid] = await Promise.all([getOrder(id), readSessionId()]);
  if (!order || !ownsOrder(order, sid, t ?? null)) notFound();
  const payload = await payloadFor(order);
  if (!payload) notFound();
  const c = copy();
  const paid = !['NEW', 'PREVIEW_READY', 'MANUAL_REVIEW', 'ABANDONED'].includes(order.status);
  return (
    <>
      <main className="wrap">
        <div className="container site-head">
          <Wordmark />
          <span className="caption">{c.price} · fri fragt</span>
        </div>
        <PreviewPanel c={c} data={payload} cancelled={cancelled === '1'} paid={paid} token={t} />
      </main>
      <Footer />
    </>
  );
}
