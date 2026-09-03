# DESIGN — Genfundet

**Direction: Nordic editorial.** A well-made photo book, not a SaaS. Quiet, warm, exact. The photographs
are the hero; the interface is paper, ink and a hairline. Mode (impeccable): *Persuade* — one visitor,
one decision, on a phone, usually in the evening.

## Type
- **Display: Newsreader** (variable, optical size 6–72, weight 300–700). Fraunces was the first pick, but
  impeccable's detector now lists Fraunces (and Instrument Sans) as saturated by AI-generated sites, so the
  brief's second option won: Newsreader's bookish, slightly narrow old-style forms at large opsz read like a
  well-set photo book rather than a newspaper. Self-hosted latin woff2, `font-display: swap`.
- **UI/body: Public Sans** (variable 400–700). Sturdy humanist grotesque; no AI-site saturation; Danish compounds fit at 390 px.
- Scale (px at 390 / at ≥1024): display 34/56 · h2 26/36 · lead 18/20 · body 16/17 · small 14/14 · caption 13/13.
- Display leading 1.04, tracking −0.02em, `text-wrap: balance`. Body leading 1.55, tracking 0.
- Danish hyphenation: `lang="da"`, `hyphens: auto` on display and body.
- Numerals: `font-variant-numeric: tabular-nums` only in admin tables.

## Colour
| Token | Value | Use |
|---|---|---|
| `--paper` | `#F6F1E8` | page background |
| `--paper-2` | `#EFE8DB` | quiet blocks (offer, upload sheet) |
| `--ink` | `#1C1A17` | text, wordmark, primary button |
| `--ink-2` | `#5B554C` | secondary text (7.1:1 on paper) |
| `--hairline` | `#D9D1C3` | rules, input borders |
| `--accent` | `#2F4A3A` | deep green: links, focus ring, the price |
| `--accent-ink` | `#F6F1E8` | text on accent |
| `--error` | `#8A3B2E` | oxidised red, errors only |
No pure white, no pure black, no gradients. Photographs supply all other colour.

## Layout
- Primary canvas 390 px. Text measure max 34em (`--measure`). Gutters 20 px (390) → 32 px (768) → 48 px (1024+).
- Hero image is square on mobile, 4:3 on desktop, full bleed. Section rhythm differs per section:
  hero (tight) → tryghedslinje (one hairline row) → "Sådan fungerer det" (three sentences, 3 small photos, ragged)
  → examples (horizontal swipe, no equal heights) → offer (paper-2 block, price large) → founder (portrait left, text right on desktop; stacked on mobile) → questions (hairline accordion) → slut → footer.
- Radii: 0 on images, 2 px on buttons/inputs, 4 px on the frame mount. Shadows only where the frame casts one.
- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.

## Motion
Exactly one: the hero before/after slider auto-reveals once from 12 % to 62 % over 1.6 s (ease-out expo),
then is pointer-driven 1:1 with `setPointerCapture`. Under `prefers-reduced-motion` the slider starts at 50 %
and does not animate. The bottom sheet uses a critically damped spring (no bounce) for open/close and 1:1
drag-to-dismiss with velocity projection (apple-design §5–6). Everything else is instant.

## Components (seven)
1. **Button** — one primary style: ink on paper, 52 px tall on mobile, 2 px radius, full width in sheets.
   Secondary = text link with underline offset. Press: background `#2A2724`, no transform.
2. **Text field** — hairline bottom-heavy border, label above, error in `--error` beneath, 48 px tall.
3. **Upload sheet** — bottom sheet on mobile (safe-area padded, grab handle, drag-to-dismiss), centred modal on desktop.
4. **Before/after slider** — touch/pointer driven, keyboard accessible (arrow keys), labels "Før"/"Efter" set in Instrument Sans 13.
5. **Frame mockup** — image composed by sharp (`lib/restoration/mockup.ts`), shown as a plain `<img>`.
6. **Sticky mobile CTA** — paper bar with hairline top, `env(safe-area-inset-bottom)` padding, hidden while sheet/preview open.
7. **Hairline accordion** — `<details>`/`<summary>`, plus sign rotates 45° instantly, no card.
Plus: footer.

## Browser surfaces
`::selection` ink on paper-2; caret `--accent`; focus ring 2 px `--accent` offset 2 px; underline offset 0.15em;
scrollbar left as OS default (no custom scrollbar on a one-page site).

## What this design refuses
See ANTI_SLOP.md. In short: no cards, no icons, no gradients, no purple, no scroll animation, no fake proof.
