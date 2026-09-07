'use client';
import { useState } from 'react';
import { quote, type Format, type Frame } from '@/lib/pricing';

export type PickSize = { format: Format; label: string; price: string; hint: string; recommended: boolean };
export const PICK_KEY = 'gf_pick';

/**
 * Size and frame as real choices on the landing page. The price follows the choice at once, and the choice
 * is kept in localStorage so the order page opens on it (PreviewPanel reads PICK_KEY once, then clears it).
 * Same radios and classes as the order page, so the second time the customer meets them, they are familiar.
 */
export default function SizePicker({ sizes, frames, initialFormat, t }: {
  sizes: PickSize[];
  frames: [Frame, string, string][];
  initialFormat: Format;
  t: { sizeTitle: string; sizeNote: string; frameTitle: string; frameNote: string; recommended: string; priceNote: string; allIn: string; carry: string };
}) {
  const [format, setFormat] = useState<Format>(initialFormat);
  const [frame, setFrame] = useState<Frame>('sort');
  const remember = (next: { format?: Format; frame?: Frame }) => {
    try { localStorage.setItem(PICK_KEY, JSON.stringify({ format, frame, ...next })); } catch { /* private mode */ }
  };
  const chosen = sizes.find((s) => s.format === format) ?? sizes[0];
  const total = quote({ format, frame }).totalOere;
  return (
    <div className="o-pick config">
      <fieldset className="cfg">
        <legend className="cfg-label">{t.sizeTitle}</legend>
        <div className="sizes-row">
          {sizes.map((x) => (
            <label key={x.format} className={`size${x.format === format ? ' is-on' : ''}${x.recommended ? ' is-recommended' : ''}`}>
              <input type="radio" name="forside-stoerrelse" value={x.format} checked={x.format === format} onChange={() => { setFormat(x.format); remember({ format: x.format }); }} />
              <picture className="size-shot"><source type="image/webp" srcSet={`/sizes/${x.format}.webp`} /><img src={`/sizes/${x.format}.jpg`} alt="" width={960} height={717} loading="lazy" decoding="async" /></picture>
              {x.recommended && <span className="tag">{t.recommended}</span>}
              <b>{x.label}</b>
              <span className="size-price tabular">{x.price}</span>
              <span className="caption">{x.hint}</span>
            </label>
          ))}
        </div>
        <p className="caption">{t.sizeNote}</p>
      </fieldset>
      <fieldset className="cfg">
        <legend className="cfg-label">{t.frameTitle}</legend>
        <div className="frames-row">
          {frames.map(([key, name, hint]) => (
            <label key={key} className={`frame${key === frame ? ' is-on' : ''}`}>
              <input type="radio" name="forside-ramme" value={key} checked={key === frame} onChange={() => { setFrame(key); remember({ frame: key }); }} />
              <span className={`swatch swatch-${key}`} aria-hidden />
              <span className="frame-text"><b>{name}</b><span className="caption">{hint}</span></span>
            </label>
          ))}
        </div>
        <p className="caption">{t.frameNote}</p>
      </fieldset>
      <div className="pick-price" aria-live="polite">
        <div className="price-line">
          <span className="price tabular">{chosen.price}</span>
          <span className="caption">{chosen.label} · {frame === 'eg' ? 'egetræsramme' : 'sort ramme'} · {t.priceNote}</span>
        </div>
        <p className="small" style={{ maxWidth: '30em' }}>{t.allIn}</p>
        <p className="caption" style={{ maxWidth: '30em' }}>{t.carry}</p>
        <span className="visually-hidden">I alt {Math.round(total / 100)} kr.</span>
      </div>
    </div>
  );
}
