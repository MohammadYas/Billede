import { notFound, redirect } from 'next/navigation';
import { approveByToken, isOldToken, orderByToken } from '@/lib/approval';
import { copy } from '@/lib/copy';
import Footer from '@/components/Footer';
import Wordmark from '@/components/Wordmark';
import SubmitButton from '@/components/SubmitButton';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

async function approve(token: string) {
  'use server';
  const r = await approveByToken(token);
  redirect(`/godkend/${token}?r=${r}`);
}

/** The customer's decision page. The buttons come first; the picture is what they decide on. */
export default async function Godkend({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ r?: string }> }) {
  const { token } = await params;
  const { r } = await searchParams;
  const order = await orderByToken(token);
  const c = copy();
  const shell = (body: React.ReactNode) => (
    <>
      <main className="wrap" style={{ paddingTop: 'var(--s5)', paddingBottom: 'var(--s9)' }}>
        <div className="container" style={{ display: 'grid', gap: 'var(--s5)', maxWidth: 720 }}>
          <Wordmark />
          {body}
          {c.email && <p className="small muted">Spørgsmål? Skriv til <a href={c.emailHref}>{c.email}</a> – vi svarer inden 24 timer.</p>}
        </div>
      </main>
      <Footer />
    </>
  );
  if (!order) {
    if (await isOldToken(token)) return shell(<><h1 style={{ maxWidth: '14em' }}>Der findes en nyere version.</h1><p className="lead measure">Det her link er fra en tidligere mail. Åbn den seneste mail fra os – det er den version, vi printer.</p></>);
    notFound();
  }
  const meta = (order.preview_meta ?? {}) as { approval_version?: number };
  const sentAt = order.awaiting_approval_at ? new Date(order.awaiting_approval_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', timeZone: 'Europe/Copenhagen' }) : null;
  const approveWithToken = approve.bind(null, token);

  if (order.status === 'CHANGE_REQUESTED') {
    return shell(<>
      <h1 style={{ maxWidth: '14em' }}>Tak, vi retter det.</h1>
      <p className="lead measure">Du får en ny mail til godkendelse inden 48 timer. Vi printer ikke, før du siger ja.</p>
      {order.change_request_text && <p className="measure small notice">Din besked: “{order.change_request_text}”</p>}
    </>);
  }
  if (order.status !== 'AWAITING_APPROVAL') {
    return shell(<>
      <h1>Tak. Vi printer og sender.</h1>
      <p className="lead measure">{r === 'approved' ? 'Dit ja er registreret. ' : ''}Du får en mail med tracking, når pakken er sendt – leveret {c.formatLabel ? '' : ''}inden 5 hverdage. Ordre {order.id.slice(0, 8)}.</p>
      <p className="measure small muted">Skal noget alligevel ændres, så skriv til os med det samme{c.email ? <> på <a href={c.emailHref}>{c.email}</a></> : null} – vi svarer inden 24 timer.</p>
    </>);
  }
  return shell(<>
    <h1 style={{ maxWidth: '14em' }}>Ligner det?</h1>
    <p className="measure">Det her er det billede, vi printer i {c.formatLabel}. Tryk Godkend, og vi printer, indrammer og sender det. Er der noget, du vil have ændret, så skriv det – det koster ikke ekstra, og vi printer ikke, før du siger ja.</p>
    <form action={approveWithToken} style={{ display: 'grid', gap: 'var(--s3)' }}>
      <SubmitButton label="Godkend" pending="Sender dit ja…" />
      <a href={`/godkend/${token}/aendring`} className="btn btn-block btn-quiet">Jeg vil have en ændring</a>
    </form>
    <img src={`/godkend/${token}/billede`} alt="Dit færdige billede" style={{ width: '100%', maxHeight: '70dvh', objectFit: 'contain', border: '1px solid var(--hairline)', background: 'var(--paper-2)' }} />
    <form action={approveWithToken} style={{ display: 'grid', gap: 'var(--s3)' }}>
      <SubmitButton label="Godkend" pending="Sender dit ja…" />
      <a href={`/godkend/${token}/aendring`} className="btn btn-block btn-quiet">Jeg vil have en ændring</a>
    </form>
    <p className="caption">{meta.approval_version && meta.approval_version > 1 ? `Version ${meta.approval_version}` : 'Version 1'}{sentAt ? ` · sendt ${sentAt}` : ''}. Du kan også bare svare på mailen med “ja”.</p>
  </>);
}
