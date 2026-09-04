'use client';
import { useState } from 'react';

/**
 * Hand-retouched finals are 5–40 MB; a function body is capped at 6 MB on Netlify, so the file goes
 * straight into the bucket with a signed URL (same path as the customer upload), then the order is told.
 */
export default function FinalUpload({ orderId }: { orderId: string }) {
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState('');
  const onChange = async (file: File | undefined) => {
    if (!file) return;
    setState('uploading'); setPct(0); setMsg('');
    try {
      const r = await fetch('/api/admin/final-upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId, size: file.size, type: file.type }) });
      if (!r.ok) throw new Error(`start ${r.status}`);
      const { uploadUrl, path } = (await r.json()) as { uploadUrl: string; path: string };
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl); xhr.timeout = 600_000;
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('network')); xhr.ontimeout = () => reject(new Error('timeout'));
        const fd = new FormData(); fd.append('cacheControl', '3600'); fd.append('', file, file.name || 'final.jpg');
        xhr.send(fd);
      });
      const c = await fetch('/api/admin/final-upload', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId, path }) });
      if (!c.ok) throw new Error(`commit ${c.status}`);
      setState('done'); window.location.reload();
    } catch (e) { setState('error'); setMsg(e instanceof Error ? e.message : String(e)); }
  };
  return (
    <div style={{ display: 'grid', gap: 'var(--s2)' }}>
      <label className="small" htmlFor="final"><strong>Upload færdig fil</strong> (JPEG/PNG/TIFF, printopløsning – går direkte i bucketen, ingen størrelsesgrænse under 25 MB)</label>
      <input id="final" type="file" accept="image/jpeg,image/png,image/tiff" onChange={(e) => onChange(e.target.files?.[0])} disabled={state === 'uploading'} />
      {state === 'uploading' && <span className="caption">Uploader · {pct} %</span>}
      {state === 'error' && <span className="caption" style={{ color: 'var(--error)' }}>Fejlede ({msg}). Prøv igen.</span>}
    </div>
  );
}
