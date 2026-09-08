'use client';
import { useState } from 'react';
import type { Source } from './BeforeAfter';
import Compare from './Compare';

/**
 * A fading pair whose "after" can be switched to the colourised version — the same choice the customer
 * gets on the order page. Renders as a fragment: the picture and the button row become the card's own
 * children, so the caption between them lines up with the cards that have no button.
 */
export default function ColourExample({ before, after, colour, alt, aspect, on, off }: { before: Source; after: Source; colour: string; alt: string; aspect: string; on: string; off: string }) {
  const [col, setCol] = useState(false);
  return (
    <>
      <Compare mode="fade" before={before} after={col ? { src: colour } : after} alt={alt} aspect={aspect} afterLabel={col ? 'Efter, farve' : 'Efter'} />
      <div className="ex-actions">
        <button type="button" className="btn btn-quiet btn-sm" aria-pressed={col} onClick={() => setCol((v) => !v)}>{col ? off : on}</button>
      </div>
    </>
  );
}
