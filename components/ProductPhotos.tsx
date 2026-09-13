import type { ProductPhoto } from '@/lib/product-photos';

/**
 * The product as a photograph rather than a render. Renders nothing at all when there are no
 * photographs — an empty strip with a heading over it would say "we have documentation" louder than
 * the missing pictures say we do not.
 *
 * A staged shot carries a visible label. Styles: .prod-shots in app/landing.css.
 */
export default function ProductPhotos({ photos, title, lead }: { photos: ProductPhoto[]; title: string; lead?: string }) {
  if (photos.length === 0) return null;
  return (
    <section className="wrap section" aria-labelledby="produktfotos">
      <div className="container prod-shots">
        <div className="prod-shots-head">
          <h2 id="produktfotos">{title}</h2>
          {lead && <p className="lead">{lead}</p>}
        </div>
        <div className="prod-shots-grid">
          {photos.map((p) => (
            <figure key={p.file}>
              <div className="prod-shot">
                <img src={`/produkt/${p.file}`} alt={p.alt} loading="lazy" decoding="async" />
                {p.demo && <span className="prod-shot-tag">Opstillet foto</span>}
              </div>
              <figcaption className="caption">{p.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
