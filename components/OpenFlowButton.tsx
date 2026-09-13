'use client';
/** A server-renderable CTA that opens the upload flow (UploadFlow listens for "gf:open"). */
export default function OpenFlowButton({ children, className = 'btn', style, detail }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; detail?: 'nophoto' }) {
  // focus first: Safari does not focus a clicked button, and the sheet returns focus to document.activeElement on close
  return (
    <button type="button" className={className} style={style} onClick={(e) => { e.currentTarget.focus(); window.dispatchEvent(new CustomEvent('gf:open', { detail })); }}>
      {children}
    </button>
  );
}
