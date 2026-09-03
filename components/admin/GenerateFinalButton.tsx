'use client';
import { useState } from 'react';

/** Re-runs the restoration at quality "high" from the stored original (≈ 2 min) and stores it as the final. */
export default function GenerateFinalButton({ orderId }: { orderId: string }) {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const run = async () => {
    setState('running');
    try {
      const r = await fetch('/api/admin/final', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId }) });
      if (!r.ok) throw new Error();
      setState('done'); window.location.reload();
    } catch { setState('error'); }
  };
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <button type="button" className="btn btn-quiet" onClick={run} disabled={state === 'running'}>{state === 'running' ? 'Genererer (ca. 2 min)…' : 'Generér final i høj kvalitet'}</button>
      {state === 'error' && <span className="caption" style={{ color: 'var(--error)' }}>Fejlede – prøv igen eller upload manuelt.</span>}
    </div>
  );
}
