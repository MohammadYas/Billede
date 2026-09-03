'use client';
/** A server-renderable CTA that opens the upload flow (UploadFlow listens for "gf:open"). */
export default function OpenFlowButton({ children, className = 'btn', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <button type="button" className={className} style={style} onClick={() => window.dispatchEvent(new CustomEvent('gf:open'))}>
      {children}
    </button>
  );
}
