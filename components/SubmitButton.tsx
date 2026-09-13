'use client';
import { useFormStatus } from 'react-dom';

/** A form submit that shows it is working (feedback on the press, not after the round trip). */
export default function SubmitButton({ label, pending, className = 'btn btn-block' }: { label: string; pending: string; className?: string }) {
  const { pending: busy } = useFormStatus();
  return <button type="submit" className={className} disabled={busy} aria-busy={busy}>{busy ? pending : label}</button>;
}
