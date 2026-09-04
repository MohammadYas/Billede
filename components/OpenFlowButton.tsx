'use client';
/** A server-renderable CTA that opens the upload flow (UploadFlow listens for "gf:open"). */
export default function OpenFlowButton({ children, className = 'btn', style, detail }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; detail?: 'nophoto' }) {
  return (
    <button type="button" className={className} style={style} onClick={() => window.dispatchEvent(new CustomEvent('gf:open', { detail }))}>
      {children}
    </button>
  );
}
