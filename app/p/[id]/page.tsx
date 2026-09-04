import { notFound } from 'next/navigation';
import { copy } from '@/lib/copy';
import { getOrder } from '@/lib/db/orders';
import { readSessionId } from '@/lib/session';
import { ownsOrder, payloadFor } from '@/lib/preview-service';
import PreviewPanel from '@/components/PreviewPanel';
import Footer from '@/components/Footer';
import Wordmark from '@/components/Wordmark';
import Consent from '@/components/Consent';

export const metadata = { robots: { index: false, follow: false }, alternates: { canonical: '/' } };

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
      {/* the slider needs both images before it can say anything: fetch them with the HTML */}
      <link rel="preload" as="image" href={payload.original} />
      <link rel="preload" as="image" href={payload.preview} />
      <main className="wrap">
        <div className="container site-head">
          <Wordmark />
          {/* the price lives in the bill on this page; the header carries the promise instead */}
          <span className="caption">{c.preview.headNote}</span>
        </div>
        <PreviewPanel c={c} data={payload} cancelled={cancelled === '1'} paid={paid} token={t} />
      </main>
      <Footer />
      <Consent text={c.cookie.text} accept={c.cookie.accept} decline={c.cookie.decline} />
    </>
  );
}
