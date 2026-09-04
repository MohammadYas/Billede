import { notFound, redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin/auth';
import { getOrder } from '@/lib/db/orders';
import { signedUrl } from '@/lib/db/storage';
import { FORMATS, formatLabel, PRICING } from '@/lib/pricing';
import { orderDescription, orderLines, repeatLink } from '@/lib/order-summary';
import { STATUS_FLOW } from '@/lib/db/orders';
import { ManualProvider } from '@/lib/fulfillment/manual';
import { actionCheckPayment, actionFulfillment, actionNote, actionSendApproval, actionSetFormat, actionSetStatus } from '@/lib/admin/actions';
import GenerateFinalButton from '@/components/admin/GenerateFinalButton';
import FinalUpload from '@/components/admin/FinalUpload';
import { getJob } from '@/lib/jobs';

export const metadata = { robots: { index: false, follow: false } };

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  if (!(await isAdmin())) redirect('/admin');
  const { id } = await params;
  const { msg } = await searchParams;
  const order = await getOrder(id);
  if (!order) notFound();
  const meta = (order.preview_meta ?? {}) as Record<string, unknown>;
  const colourFull = meta.colourised_full_path as string | undefined;
  const urls = {
    original: order.original_path ? await signedUrl(order.original_path) : null,
    restored: order.restored_path ? await signedUrl(order.restored_path) : null,
    colour: colourFull ? await signedUrl(colourFull) : order.colourised_path ? await signedUrl(order.colourised_path) : null,
    mockup: order.mockup_path ? await signedUrl(order.mockup_path) : null,
    final: order.final_path ? await signedUrl(order.final_path) : null,
  };
  const checklist = order.final_path ? new ManualProvider().checklist(order, urls.final ?? '') : null;
  const addr = order.shipping_address as Record<string, string> | null;
  const likeness = meta.likeness as Record<string, unknown> | undefined;
  const job = getJob(order);
  const days = (iso?: string | null) => (iso ? Math.floor((Date.now() - Date.parse(iso)) / 864e5) : null);
  const next: string | null = order.status === 'PAID' ? 'Næste: generér eller upload final, send godkendelsesmail (inden 48 timer fra betaling).'
    : order.status === 'CHANGE_REQUESTED' ? 'Næste: ret efter kundens besked, upload ny final, send ny godkendelsesmail (inden 48 timer).'
    : order.status === 'AWAITING_APPROVAL' ? `Venter på kundens ja${days(order.awaiting_approval_at) !== null ? ` i ${days(order.awaiting_approval_at)} dage` : ''}. Efter 7 dage: skriv personligt til kunden.`
    : order.status === 'APPROVED' ? 'Næste: bestil print hos partneren (tjekliste nederst), sæt IN_PRODUCTION.'
    : order.status === 'IN_PRODUCTION' ? 'Næste: når pakken er sendt, gem tracking og sæt SHIPPED (mailen går automatisk).'
    : order.status === 'MANUAL_REVIEW' ? 'Næste: vurder billedet, svar kunden på mail inden 24 timer.'
    : null;

  return (
    <main className="wrap admin" style={{ paddingTop: 'var(--s5)', paddingBottom: 'var(--s9)' }}>
      <div className="container" style={{ display: 'grid', gap: 'var(--s6)' }}>
        <p className="small"><a href="/admin">← Ordrer</a></p>
        {msg && <p className="small" role="status" style={{ background: 'var(--paper-2)', padding: 'var(--s2) var(--s3)' }}>{msg}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s4)', alignItems: 'baseline' }}>
          <h1 style={{ fontSize: 'var(--fs-h2)' }}>Ordre {order.id.slice(0, 8)}</h1>
          <span>{order.status}</span>
          <span>{orderDescription(order)}</span>
          <span>{order.amount ? `${(order.amount / 100).toLocaleString('da-DK')} kr.` : ''}</span>
        </div>

        {next && <p className="notice" style={{ fontWeight: 600 }}>{next}</p>}
        {job && job.state !== 'done' && <p className="small" style={{ color: job.state === 'failed' ? 'var(--error)' : 'var(--ink-2)' }}>Job {job.kind}: {job.state}{job.stage ? ` · ${job.stage}` : ''}{job.reason ? ` · ${job.reason}` : ''}</p>}
        <section style={{ display: 'grid', gap: 'var(--s2)' }} className="small">
          <p><strong>Kunde:</strong> {order.customer_name ?? '—'} · {order.customer_email ?? '—'} · {order.customer_phone ?? '—'}</p>
          <p><strong>Adresse:</strong> {addr ? [addr.line1, addr.line2, `${addr.postal_code ?? ''} ${addr.city ?? ''}`].filter(Boolean).join(', ') : '—'}</p>
          <p><strong>Betaling:</strong> {order.payment_provider ?? '—'} {order.payment_session_id ?? ''} {order.payment_intent ?? ''}{order.payment_session_id && ['NEW', 'PREVIEW_READY', 'ABANDONED'].includes(order.status) ? <form action={actionCheckPayment.bind(null, order.id)} style={{ display: 'inline' }}> <button type="submit" className="link-btn">Tjek betaling hos Stripe</button></form> : null}</p>
          <p><strong>Kilde:</strong> {order.utm ? Object.entries(order.utm).map(([k, v]) => `${k}=${v}`).join(' ') : '—'}</p>
          <p><strong>Pipeline:</strong> {meta.model ? `${meta.model} · ${meta.quality} · ${Math.round(Number(meta.durationMs) / 1000)} s · SSIM ${Number(meta.ssim).toFixed(3)}` : '—'} {likeness ? `· likeness ${likeness.likeness} · invented ${String(likeness.invented_details)} · faces ${likeness.face_count_a}→${likeness.face_count_b}` : ''}</p>
          {likeness?.notes ? <p className="muted">{String(likeness.notes)}</p> : null}
          {Array.isArray(meta.reviewReasons) && (meta.reviewReasons as string[]).length > 0 && <p style={{ color: 'var(--error)' }}>Manuel vurdering: {(meta.reviewReasons as string[]).join(', ')}</p>}
          {order.change_request_text && <p style={{ background: 'var(--paper-2)', padding: 'var(--s3)' }}><strong>Kundens ændringsønske:</strong> {order.change_request_text}</p>}
          {typeof meta.gift_note === 'string' && meta.gift_note && <p style={{ background: 'var(--paper-2)', padding: 'var(--s3)' }}><strong>Gavehilsen til kortet i pakken:</strong> “{String(meta.gift_note)}”</p>}
          <p><strong>Bestilling:</strong> {orderLines(order).join(' · ')}</p>
          {typeof meta.repeat_of === 'string' && meta.repeat_of && <p><strong>Billede nummer to</strong> fra ordre <a href={`/admin/orders/${String(meta.repeat_of)}`}>{String(meta.repeat_of).slice(0, 8)}</a> – samme kunde. Ingen rabat: et nyt billede koster normal pris.</p>}
          {repeatLink(order) && <p><strong>Gentagelseslink (kunden har det i kvitteringen):</strong> <span className="muted">{repeatLink(order)}</span></p>}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--s4)' }}>
          {(['original', 'restored', 'colour', 'mockup', 'final'] as const).map((k) => urls[k] ? (
            <figure key={k} style={{ margin: 0 }}>
              <a href={urls[k]!} target="_blank" rel="noreferrer"><img src={urls[k]!} alt={k} style={{ width: '100%', border: '1px solid var(--hairline)' }} /></a>
              <figcaption className="caption">{k}{k === 'final' ? ' · download i printopløsning (link gælder 15 min)' : ''}</figcaption>
            </figure>
          ) : null)}
        </section>

        <section style={{ display: 'grid', gap: 'var(--s5)', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <form action={actionSetStatus.bind(null, order.id)} style={{ display: 'grid', gap: 'var(--s2)' }}>
            <label className="small"><strong>Status</strong></label>
            <select name="status" defaultValue={order.status} style={{ minHeight: 44, padding: '0 var(--s3)', border: '1px solid var(--hairline)', background: 'var(--paper)' }}>
              {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn" type="submit">Sæt status</button>
            <p className="caption">SHIPPED sender "Dit billede er på vej" (husk tracking først). REFUNDED refunderer via Stripe.</p>
          </form>

          <form action={actionSetFormat.bind(null, order.id)} style={{ display: 'grid', gap: 'var(--s2)' }}>
            <label className="small"><strong>Format</strong></label>
            <select name="format" defaultValue={order.format} style={{ minHeight: 44, padding: '0 var(--s3)', border: '1px solid var(--hairline)', background: 'var(--paper)' }}>
              {FORMATS.map((f) => <option key={f} value={f}>{formatLabel(f)} · {PRICING[f].priceDkk} kr.{PRICING[f].enabled ? '' : ' (ikke i kundeflow)'}</option>)}
            </select>
            <button className="btn btn-quiet" type="submit">Skift format</button>
          </form>

          <div style={{ display: 'grid', gap: 'var(--s3)' }}>
            <FinalUpload orderId={order.id} />
            <GenerateFinalButton orderId={order.id} />
          </div>

          <form action={actionSendApproval.bind(null, order.id)} style={{ display: 'grid', gap: 'var(--s2)' }}>
            <p className="small"><strong>Godkendelsesmail</strong> {order.approval_status !== 'NONE' ? `· ${order.approval_status}` : ''}</p>
            <button className="btn" type="submit" disabled={!order.final_path || !order.customer_email}>Send "Dit færdige billede er klar"</button>
            {order.approval_token && <p className="caption">Link: /godkend/{order.approval_token}</p>}
          </form>

          <form action={actionFulfillment.bind(null, order.id)} style={{ display: 'grid', gap: 'var(--s2)' }}>
            <p className="small"><strong>Fulfillment (manuel: CEWE / fotolab)</strong></p>
            <div className="field"><label htmlFor="reference">Fulfillment-reference</label><input id="reference" name="reference" defaultValue={order.fulfillment_reference ?? ''} /></div>
            <div className="field"><label htmlFor="tracking">Tracking-nummer</label><input id="tracking" name="tracking" defaultValue={order.tracking_number ?? ''} /></div>
            <div className="field"><label htmlFor="tracking_url">Tracking-link</label><input id="tracking_url" name="tracking_url" type="url" defaultValue={order.tracking_url ?? ''} /></div>
            <button className="btn btn-quiet" type="submit">Gem</button>
          </form>

          <form action={actionNote.bind(null, order.id)} style={{ display: 'grid', gap: 'var(--s2)' }}>
            <div className="field"><label htmlFor="notes"><strong>Intern note</strong></label><textarea id="notes" name="notes" rows={5} defaultValue={order.internal_notes ?? ''} /></div>
            <button className="btn btn-quiet" type="submit">Gem note</button>
          </form>
        </section>

        {checklist && (
          <section>
            <h2 style={{ fontSize: 'var(--fs-lead)', fontFamily: 'var(--sans)', fontWeight: 600 }}>Tjekliste – bestil print</h2>
            <ol className="small" style={{ paddingLeft: '1.2em', display: 'grid', gap: 'var(--s2)', maxWidth: '50em' }}>
              {checklist.map((c, i) => <li key={i} style={{ wordBreak: 'break-all' }}>{c}</li>)}
            </ol>
          </section>
        )}
      </div>
    </main>
  );
}
