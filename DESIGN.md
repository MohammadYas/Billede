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
- Scale (px at 390 / at ≥1024): display 36/60 · h2 28/38 · lead 18/20 · body 16/17 · small 14/14 · caption 14/14 · price 88–168.
- Display leading 1.02, tracking −0.025em, `text-wrap: balance`. Body leading 1.55, tracking 0. Metric-compatible fallback faces (`size-adjust`) so the swap does not reflow.
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
- **Hero = a photo-book spread.** Square, full bleed on mobile with a one-line caption (subject in ink, year in ink-2) and the
  headline directly beneath; on desktop the 4:3 photograph is left-set inside the 1120 px container, the caption column sits at
  its bottom edge, the headline and the CTA share one baseline below (`.hero-grid`, `.hero-text`).
- **Editorial grid ≥ 1024:** every text section is 5/12 heading (sticky) + 7/12 content (`.ed`). Examples and the offer stay full width.
- Rhythm: hero (tight) → one hairline trust row → "Sådan fungerer det" (three sentences with 112/160 px photographs of the object at
  each stage) → examples (swipe on mobile, offset two-column grid on desktop) → offer (paper-2 band, the price set as an object at
  88–168 px Newsreader 300, right-aligned on desktop) → founder (only when portrait and lines exist) → questions (hairline accordion)
  → closing line → footer.
- Radii: 0 on images, 2 px on buttons/inputs, 12 px only on the top corners of the mobile sheet (a physical sheet). Shadows only
  where the frame casts one.
- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128.

## Surfaces
- **/** landing. **/p/[id]** the preview as a product page: heading, slider at the photograph's own aspect (never cropped),
  colour toggle, framed mockup with caption, the offer paragraph, price button; mobile gets a fixed price bar, desktop a sticky
  right column. **/tak** shows the framed mockup and a three-row hairline timeline. **/godkend/[token]** approval.
- **Sheet** (upload + processing + fallback only): enters with a critically damped spring, 10 px drag hysteresis, dismisses only
  from the top of its content; the processing state keeps the customer's photograph on screen with the progress line along its
  bottom edge and a sentence per real stage.

## Motion
Motion exists only where comparison is the content. The hero before/after slider auto-reveals once from 88 % to 35 %
(damaged → restored, so the still image the reader is left with is two-thirds restoration) over 1.6 s (ease-out expo),
then is pointer-driven 1:1 with `setPointerCapture`; the round knob rides the seam (handle is full-width, translated by `--x`). Each example in the grid uses one
comparison form: wipe, lens (round window, `clip-path: circle()`), hold (220 ms crossfade while pressed) or fade
(1.4 s dissolve every 4 s, paused off-screen and while touched; hold-like under reduced motion). Under `prefers-reduced-motion` the slider sits at 35 %
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
