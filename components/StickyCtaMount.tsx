'use client';
import StickyCta from './StickyCta';
export default function StickyCtaMount({ label }: { label: string }) {
  return <StickyCta label={label} onClick={() => window.dispatchEvent(new CustomEvent('gf:open'))} />;
}
