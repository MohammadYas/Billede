# DESIGN — Billedarv

**Direction: the product page of one product, played straight.** A framed photograph, proven before it is bought.
Warm white paper, near-black ink, one deep green; the visitor's own picture is the argument, so the page opens on a real
damaged print turning sharp under the finger. Mode (impeccable): *Persuade* — one visitor, one decision, on a phone,
usually in the evening. Chosen by the owner on 2026-09-07 as the category standard (the standing exit) over three
committed worlds; bar: Bolia, Apple product pages, Framebridge. Replaces the 2026-09 "Nordic editorial" photo-book spread.

## Type
- **Display and controls: Schibsted Grotesk** (variable 400–900, latin, self-hosted `public/fonts/SchibstedGrotesk-normal.woff2`).
  A Norwegian newspaper grotesk: sturdy, Nordic, commercial without being a tech face. Headings at weight 650, buttons at 600.
- **Body: Public Sans** (variable 400–700, self-hosted). Danish compounds fit at 390 px; italic available.
- **Wordmark only: Newsreader** 500, 26 px. The one serif on the site; it is the brand, not a heading style.
- Scale (px at 390 / 768 / ≥1024): display 34/46/58 · h2 26/30/36 · lead 18/19/20 · body 16/16/17 · small 14 · caption 14 (13 under the phone grid) · price 44/56.
- Display leading 1.06, tracking −0.03em; h2 tracking −0.02em; body leading 1.55, tracking 0. `text-wrap: balance` on headings, `hyphens: auto`, `lang="da"`.
- Metric-compatible fallbacks (`size-adjust`) for all three faces so the swap does not reflow.
- Prices: `font-variant-numeric: tabular-nums lining-nums` in the display face.

## Colour
| Token | Value | Use |
|---|---|---|
| `--paper` | `#FBFAF7` | page ground (warm white, not cream) |
| `--paper-2` | `#F1EEE7` | quiet blocks: the product shot, the gift section, the closing block, the sheet |
| `--ink` | `#171614` | text, wordmark, the primary button |
| `--ink-2` | `#5D5953` | secondary text (6.9:1 on paper) |
| `--hairline` | `#E2DDD4` | rules, input borders, the examples' grid lines |
| `--accent` | `#1F5A3C` | deep green: links, focus ring, the trust dots, step numbers, the guarantee ticks |
| `--accent-ink` | `#FBFAF7` | text on accent |
| `--error` | `#8A3B2E` | errors only |
| `--shadow-object` | `0 24px 48px -28px rgba(23,22,20,.45), 0 2px 6px rgba(23,22,20,.10)` | the one shadow: under the hero slider and the framed print |
Strategy: restrained. No gradients, no pure white or black, no purple; photographs supply every other colour.

## Layout
- Container 1120 px; gutters 20 → 32 → 48 px; text measure 34em. Spacing scale 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128.
- **Header** `.nav`: sticky, solid paper, one hairline; wordmark left, "fra 599 kr. · fri fragt" right, the button right on ≥768.
- **Hero** `.hero`: phone: headline, one sentence, the button, the risk reversal, then the slider (4:5, `object-position 50% 28%`);
  desk (≥1024): copy 5/11 left, slider 6/11 right, centred on a `100vh − 68px` first screen; tablet caps the slider at 520 px.
- **Trust row** `.trust`: one hairline row, green dots, 1 → 2 → 4 columns.
- **Examples** `.ex-grid`: two across on every width, three at ≥1024; each pair a wipe slider at its own proportions, caption
  subject in ink and year in ink-2, colour pairs carry the same "Vis i farver" toggle the customer gets. One line under the grid
  says what the examples are (`c.eksempler.syntheticNote`).
- **How it works** `.steps`: three hairline-topped steps, the same photograph at each stage (damaged, restored, framed), green
  step numbers because the order is the product; 1 column → 3 columns at ≥768.
- **Offer** `.offer`: the framed print as an object on a `--paper-2` block (sticky at ≥1024) beside the spec rows (`.label`), the
  three size boxes (`.size-compare`, the recommended one outlined), the two frame swatches, the price line, the guarantee list
  and the button. 1 column → 6/5 at ≥1024.
- **Gift** `.gift` on `--paper-2`; **contact strip** `.strip`; **questions** as the hairline accordion; **closing block** on `--paper-2`
  with the last button; footer. Founder section renders on the three lines, the name, the company and the CVR (`assets/founder/founder.md`); a portrait joins when one exists.
- Radii: 4 px on buttons and grid images, 6 px on the hero slider, 8 px on quiet blocks, 0 on the framed print (frames are square),
  12 px only on the top corners of the mobile sheet.

## Components
1. **Button** — ink on paper, 52 px tall (44 px `.btn-sm` in the header), 4 px radius, display face 600; press: darker ink and `scale(.985)`.
   Secondary `.btn-quiet` outlined; text actions `.link-btn` underlined.
2. **Text field** — hairline, bottom edge in ink-2, label above, error in `--error` beneath, 48 px tall.
3. **Upload sheet** — bottom sheet on a phone, centred modal on a desk; focus trapped, background `inert`, focus returned to the trigger.
4. **Before/after slider** (`BeforeAfter`) — one critically damped spring, 1:1 drag, momentum, rubber-band, "Før"/"Efter" as buttons,
   keyboard range; `reveal` once on the hero. `Compare` (lens/hold/fade) still exists for the preview page; the landing uses wipes only.
5. **Framed print** (`components/Framed.tsx`) — the product shot: 6 % moulding (black `#161412` or oak `#8A6A46`), 9 % mount `#F7F5F0`
   with an inset edge, the print, `--shadow-object`. Used in the third step and as the fallback product shot. The wall mockup
   (`lib/restoration/mockup.ts` on `public/mockup/wall.jpg`) is the product shot on the landing page, `/p` and `/tak`.
6. **Sticky mobile CTA** — paper bar, hairline top, safe-area padding, hidden while the sheet or the preview bar is open.
7. **Hairline accordion** — `<details>`/`<summary>`, plus sign, no card.
8. **Size boxes and frame swatches** — the same `.size-compare` / `.swatch` the order page uses, so the choice is familiar when it matters.

## Motion
Motion exists where comparison is the content: the slider's spring (apple-design §1–§10), the hero reveal once, the sheet's spring
and drag-to-dismiss, the button's press. Nothing else moves; no scroll animation. `prefers-reduced-motion`: no reveal, no springs,
direct set.

## Imagery
Seven example pairs in `public/examples/` (`examples.json`, first = hero). Originals in `assets/originals/` are generated damaged
prints made to show the process (creases, foxing, water stains, faded 1970s dye); the restorations are the real pipeline's output
(`npm run quality:report` → `npm run examples:export`). Captions name subject and year and end in "Eksempelbillede."; the page says so
under the grid. No invented names or towns. `public/og.jpg` is the wedding pair, before | after. Replace with consented family
photographs as they arrive (HANDOFF §1).

## Browser surfaces
`::selection` ink on paper-2; caret `--accent`; focus ring 2 px `--accent` offset 2 px; underline offset 0.16em; OS scrollbar.

## What this design refuses
See ANTI_SLOP.md. No cards as page structure, no eyebrow above a heading, no icon system, no gradients, no purple, no scroll
animation, no fake proof, no rendered wall on the landing page.
