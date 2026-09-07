/**
 * The framed print as a product shot: black or oak moulding, a mount, the print. Styles in landing.css.
 * A real wall photograph belongs to the mockup pipeline (lib/restoration/mockup.ts); this is the object on its own.
 */
export default function Framed({ src, alt, width, height, frame = 'sort', className = '', loading = 'lazy' }: { src: string; alt: string; width: number; height: number; frame?: 'sort' | 'eg'; className?: string; loading?: 'lazy' | 'eager' }) {
  return (
    <span className={`framed ${frame === 'eg' ? 'eg' : ''} ${className}`.trim()} aria-hidden={alt === '' || undefined}>
      <span className="mat"><img src={src} alt={alt} width={width} height={height} loading={loading} decoding="async" /></span>
    </span>
  );
}
