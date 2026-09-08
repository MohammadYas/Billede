'use client';
import { useState } from 'react';

type T = { name: string; email: string; message: string; send: string; sending: string; done: string; doneP: string; invalidEmail: string; tooShort: string; rate: string; failed: string };

/** Three fields and one button. The answer comes by mail; the page says so before and after. */
export default function ContactForm({ t }: { t: T }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === 'sending') return;
    const fd = new FormData(e.currentTarget);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError(t.invalidEmail); return; }
    if (message.trim().length < 3) { setError(t.tooShort); return; }
    setState('sending'); setError(null);
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, email, message, website: String(fd.get('website') ?? '') }) });
      if (r.status === 429) { setState('error'); setError(t.rate); return; }
      if (!r.ok) throw new Error(String(r.status));
      setState('done');
    } catch { setState('error'); setError(t.failed); }
  };
  if (state === 'done') {
    return <div className="notice" role="status" style={{ display: 'grid', gap: 'var(--s2)', maxWidth: '36em' }}><p style={{ fontWeight: 600, margin: 0 }}>{t.done}</p><p className="small" style={{ margin: 0 }}>{t.doneP.replace('{email}', email.trim())}</p></div>;
  }
  return (
    <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 'var(--s4)', maxWidth: '36em' }}>
      <div className="field"><label htmlFor="ct-name">{t.name}</label><input id="ct-name" name="name" autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label htmlFor="ct-email">{t.email}</label><input id="ct-email" name="email" type="email" inputMode="email" autoComplete="email" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={error === t.invalidEmail} /></div>
      <div className="field"><label htmlFor="ct-message">{t.message}</label><textarea id="ct-message" name="message" rows={6} required maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} aria-invalid={error === t.tooShort} /></div>
      <div className="visually-hidden" aria-hidden><label htmlFor="ct-website">Website</label><input id="ct-website" name="website" tabIndex={-1} autoComplete="off" /></div>
      {error && <p className="small" role="alert" style={{ color: 'var(--error)', margin: 0 }}>{error}</p>}
      <button type="submit" className="btn" disabled={state === 'sending'} style={{ justifySelf: 'start' }}>{state === 'sending' ? t.sending : t.send}</button>
    </form>
  );
}
