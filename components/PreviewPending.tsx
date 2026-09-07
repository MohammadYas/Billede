'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/** A mailed link can be opened before restoration finishes. Refresh only while work can progress. */
export default function PreviewPending({ pending, email }: { pending: boolean; email: string }) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const interval = window.setInterval(() => router.refresh(), 5000);
    const timeout = window.setTimeout(() => { window.clearInterval(interval); setSlow(true); }, 150_000);
    return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [pending, router]);
  return (
    <div style={{ display: 'grid', gap: 'var(--s4)', maxWidth: 'var(--measure)', paddingBlock: 'var(--s6)' }}>
      <h1>{pending ? 'Dit billede er på vej.' : 'Billedet er ikke klar endnu.'}</h1>
      <p role="status" className="lead">{pending && !slow
        ? 'Vi arbejder på billedet. Resultatet vises her, når det er klar. Du kan også åbne linket fra mailen igen senere.'
        : 'Vi kunne ikke vise resultatet endnu. Prøv at opdatere siden, eller skriv til os, så hjælper vi dig videre.'}</p>
      <div><button type="button" className="btn btn-quiet" onClick={() => router.refresh()}>Opdater status</button></div>
      {email && <p>Du kan skrive til <a href={`mailto:${email}`}>{email}</a>.</p>}
      <p><a href="/">Til forsiden</a></p>
    </div>
  );
}
