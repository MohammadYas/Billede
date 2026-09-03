'use client';
import { useState } from 'react';
import BeforeAfter, { type Source } from './BeforeAfter';

/** A wipe pair whose "after" can be switched to the colourised version — the same toggle the customer gets. */
export default function ColourExample({ before, after, colour, alt, aspect }: { before: Source; after: Source; colour: string; alt: string; aspect: string }) {
  const [col, setCol] = useState(false);
  return (
    <div style={{ display: 'grid', gap: 'var(--s2)' }}>
      <BeforeAfter before={before} after={col ? { src: colour } : after} alt={alt} aspect={aspect} afterLabel={col ? 'Efter, farve' : 'Efter'} />
      <div style={{ display: 'flex', gap: 'var(--s4)', minHeight: 44, alignItems: 'center' }}>
        <button type="button" className="link-btn" aria-pressed={col} onClick={() => setCol((v) => !v)}>{col ? 'Vis i sort-hvid' : 'Vis i farver'}</button>
      </div>
    </div>
  );
}
