'use client';
import { useEffect, useState } from 'react';

/** Starts the print-final job (quality "high", ≈ 2 min) and polls until it is stored. */
export default function GenerateFinalButton({ orderId }: { orderId: string }) {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [note, setNote] = useState('');
  const run = async () => {
    setState('running'); setNote('');
    try {
      const r = await fetch('/api/admin/final', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId }) });
      if (!r.ok) throw new Error();
    } catch { setState('error'); }
  };
  useEffect(() => {
    if (state !== 'running') return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/admin/final?orderId=${orderId}`);
        const j = (await r.json()) as { job?: { kind: string; state: string; reason?: string } | null; final?: boolean };
        if (j.job?.kind === 'final' && j.job.state === 'failed') { setState('error'); setNote(j.job.reason ?? ''); }
        else if (j.final && j.job?.kind === 'final' && j.job.state === 'done') { setState('done'); window.location.reload(); }
      } catch { /* keep polling */ }
    }, 4000);
    return () => clearInterval(t);
  }, [state, orderId]);
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <button type="button" className="btn btn-quiet" onClick={run} disabled={state === 'running'}>{state === 'running' ? 'Genererer i baggrunden (ca. 2 min)…' : 'Generér final i høj kvalitet'}</button>
      {state === 'running' && <span className="caption">Du kan forlade siden – filen ligger under ordren, når den er klar.</span>}
      {state === 'error' && <span className="caption" style={{ color: 'var(--error)' }}>Fejlede{note ? ` (${note})` : ''} – prøv igen eller upload manuelt.</span>}
    </div>
  );
}
