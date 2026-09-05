# QA — Genfundet

Environment: headless Chromium (Playwright) against `next dev` with live OpenAI and Supabase; Stripe and Resend keys
were not available (see HANDOFF.md §3–4). Screenshots in `checkpoints/`. Date 2026-09-03.

## Journeys

Results are appended from `work/journeys.json` (script: `scripts/journeys.ts`) in the section "Journey results" below.

| # | Journey | Result |
|---|---|---|
| A | iPhone 390: landing → upload → preview → checkout → /tak | Landing → upload → **real preview** with slider, mockup and colour toggle: passed (see results). Checkout: `POST /api/checkout` returns 503 "Betaling er ikke sat op endnu." without `STRIPE_SECRET_KEY`; the button shows the calm error and the preview stays. Stripe hosted Checkout, webhook and `/tak` are implemented against the SDK and exercised only at type/build level. Test-card run and the live 599 kr. run belong to HANDOFF.md §3. |
| B | Bad file / no face → fallback | Group photograph (150 faces) → pipeline flags face-count mismatch + invented details → status `MANUAL_REVIEW` → fallback copy → e-mail form → lead stored, `PreviewFallback` logged. Wrong file type (`.txt`) → inline message "Vi kan læse JPEG, PNG, HEIC og WebP…". Oversize (>25 MB) → "Filen er over 25 MB…" (client) and `too_large` fallback (server). |
| C | Payment cancel | `/?cancelled=1&order=<id>` reopens the same preview with "Betalingen blev ikke gennemført. Dit preview er gemt…"; order stays `PREVIEW_READY`. |
| D | Admin → upload final → approval mail → approve → fulfillment checklist → tracking → shipped mail | Admin login (env password, HMAC cookie, 5 tries/15 min). Order page: images with 15-min signed URLs, upload final (re-encoded), "Generér final i høj kvalitet", "Send godkendelsesmail" (sets `AWAITING_APPROVAL`, token link), `/godkend/<token>` → Godkend → `APPROVED`; checklist rendered from `ManualProvider`; reference + tracking fields; status `SHIPPED` sends the shipping mail. Mail sending itself needs `RESEND_API_KEY` (logged as "would send" without it). |
| E | Change request | `/godkend/<token>/aendring` → textarea → `CHANGE_REQUESTED` with text shown on the admin order page; reminder after 48 h from the cron. |
| F | Desktop | 1024 and 1440: hero 4:3 inside 1120 px, examples as an offset two-column grid, sheet becomes a centred modal (`checkpoints/breakpoints/landing-1440.png`). |
| G | Throttled 3G | Not run as a network profile in this environment. Budget: HTML ≈ 20 kB, CSS ≈ 12 kB, two woff2 (159 kB + 27 kB, `font-display: swap`, preloaded), hero before/after JPEGs 238 kB + 121 kB (1400 px) — the hero `<img>` is `fetchpriority="high"`; WebP variants exist in `public/examples` for a future `<picture>` swap. No third-party script before consent. |

## Responsive / touch (spec §11)

`scripts/screenshots.ts` output (`checkpoints/breakpoints/report.txt`):

```
375px: horizontal overflow 0px; tap targets <44px: none
390px: horizontal overflow 0px; tap targets <44px: none
430px: horizontal overflow 0px; tap targets <44px: none
768px: horizontal overflow 0px; tap targets <44px: none
1024px: horizontal overflow 0px; tap targets <44px: none
1440px: horizontal overflow 0px; tap targets <44px: none
```

- No hero layout shift: the slider has an explicit `aspect-ratio` (1/1 mobile, 4/3 desktop) before images load.
- Sticky CTA: `env(safe-area-inset-bottom)` padding, body bottom padding equal to the bar so content is never covered, hidden while the sheet/preview is open (`body[data-flow-open]`).
- Sheet: `92dvh` max, `overscroll-behavior: contain`, grab handle, 1:1 drag-to-dismiss with pointer capture, rubber-band upward, velocity projection, critically damped spring back (apple-design §2, 5, 6, 9). `prefers-reduced-motion` skips the reveal and the dismiss animation.
- Lighthouse was not available offline; see HANDOFF.md §12.

## Skill checklists

**apple-design (phases 4 and 11):** respond on pointer-down (button `:active` colour), 1:1 tracking with `setPointerCapture` (slider and sheet), interruptible reveal (any pointer-down cancels the rAF), velocity hand-off and momentum projection on sheet release, rubber-band at the top boundary, `prefers-reduced-motion` and `prefers-reduced-transparency` handled, tracking −0.02em only on display sizes, body 0. No translucent materials (paper is opaque by design).

**ui-ux-pro-max:** `search.py "family photo restoration framed print editorial warm Nordic" --design-system` proposed
"Hero + Features + CTA", Minimalism/Swiss, a blue/green/amber SaaS palette and Libre Bodoni + Public Sans. The palette
and the "Key features (3–5)" section were rejected per the spec's anti-slop list (§3); Public Sans was adopted as the
UI face. Its pre-delivery checklist: no emoji icons ✓ (no icons at all); cursor-pointer on clickables ✓; hover states
✓ (colour only, no motion); light-mode contrast ≥4.5:1 ✓ (ink on paper 14.6:1, ink-2 on paper 7.1:1, paper on ink
14.6:1, accent on paper 8.9:1); focus visible ✓ (2 px accent ring); reduced-motion ✓; 375/768/1024/1440 ✓.
UX rules applied: visible labels on every field, error text next to the field with `role=alert`, disabled state on the
order button while the checkout opens, keyboard alternative to the drag slider (`<input type=range>` + arrow keys),
`<details>`/`<summary>` accordion is keyboard native.

**impeccable:** `context.mjs` run; direction pinned by the brief (no concept roll). `detect.mjs --scope all app components`
initially reported: overused fonts (Fraunces, Instrument Sans), a "side-tab border" (the slider knob chevron) and a
`transition: width`. All three fixed (Newsreader + Public Sans; chevron drawn with two pseudo-elements; progress bar uses
`transform: scaleX`). Re-run: `[]`. Craft-floor checks: contrast ✓, no decorative shadows (only the frame's) ✓,
spacing rhythm deliberately uneven ✓, body measure ≤34em ✓, one authored motion ✓, states (hover/disabled/loading/error/empty)
✓, browser surfaces themed (`::selection`, caret, focus ring, underline offset) ✓, copy in the product's language ✓.

## Anti-slop audit (every line of ANTI_SLOP.md)

Screens: `checkpoints/01-hero-390.png`, `01-hero-1440.png`, `breakpoints/landing-390.png`, `breakpoints/landing-1440.png`,
`02-upload-sheet-390.png`, `02-preview-390.png`, `03-tak-390.png`, `04-privatliv-390.png`, `05-admin-order-1440.png`.

| # | Check | Pass | Evidence |
|---|---|---|---|
| A1 | No Inter/Roboto/…/Fraunces/Instrument Sans | ✓ | `globals.css` @font-face: Newsreader, Public Sans only; detector clean |
| A2 | No default type scale | ✓ | hand-set 34/26/18/16/14/13 → 56/36/20/17 |
| A3 | No gradient text / italic accent word | ✓ | grep `background-clip` = 0; no `<em>` in headings |
| A4 | No eyebrow/kicker/badge above H1 | ✓ | 01-hero-390: caption *below* the photo, H1 directly |
| A5 | Copy: no weightless headline, no triads, no `!` | ✓ | `lib/copy.ts`: locked spec copy; grep `!` in copy = 0 (only in code) |
| A6 | Tracking ≥ −0.02em, body 0 | ✓ | `h1 letter-spacing:-0.02em`, body none |
| B1 | No purple/indigo/violet | ✓ | tokens: paper, ink, green `#2F4A3A`, red for errors |
| B2 | No gradients/glows/neon | ✓ | one `radialGradient` exists only inside the *mockup wall fallback* (server-rendered image, replaced by a real wall photo) — not UI |
| B3 | No glass/blur | ✓ | grep `backdrop-filter` = 0 |
| B4 | No #FFF/#000 surfaces | ✓ | grep in globals.css: none (only rgba shadows on the slider knob/handle) |
| B5 | Light by default, body ≥4.5:1 | ✓ | `color-scheme: light`; ink-2 7.1:1 |
| B6 | No grey borders everywhere / ghost cards | ✓ | hairlines: tryghedslinje rules, accordion rules, input border, image edge only |
| C1 | No centred hero with two buttons | ✓ | left-set H1 under full-bleed slider, one button (01-hero-390) |
| C2 | No icon grid / bento / trusted-by / stats | ✓ | "Sådan fungerer det" = three sentences + three 72 px photographs, ragged left margins |
| C3 | No numbered circles | ✓ | `<ol>` without markers |
| C4 | No cards; FAQ hairline accordion | ✓ | landing-390: accordion rows with `+`, offer is a paper-2 block with no border |
| C5 | Radius ≤4px | ✓ | buttons 2px, sheet top corners 12px on mobile only (a physical sheet), knob circle |
| C6 | Asymmetric, unequal padding | ✓ | offer block vs. founder vs. questions have different paddings; step 2 indented |
| C7 | No fake proof/urgency | ✓ | no testimonials, counts, timers, logos anywhere |
| C8 | No nav header | ✓ | wordmark + price line only |
| D1 | No icons/emoji | ✓ | none in `app/` or `components/` (the `+`/`–` accordion marks are text, the `×` close is text) |
| D2 | Real photographs only | ✓ (placeholder) | archive photos restored by the pipeline with provenance captions; **must be replaced by consented family photos** (HANDOFF.md §1) |
| D3 | No checkmark lists | ✓ | prose only |
| D4 | Frame mockup composed by code | ✓ | `lib/restoration/mockup.ts`, 02-preview-390 |
| E1 | No "Unlock/Seamless/…/AI-powered" | ✓ | AI mentioned once: "Hvis AI'en har ændret noget i et ansigt…" inside the FAQ; technology in the process line as "Mohammad finjusterer" |
| E2 | Never "gratis"; CTA "Se dit billede nu" | ✓ | grep -i gratis = 0 |
| E3 | No placeholder text | ✓ | founder fields hide when empty; legal pages show "[Udfyld …]" only in the draft marked for the lawyer |
| E4 | Danish number formatting | ✓ | `formatDkk` → "599 kr.", "1.500 kr."; delivery days from config |
| F1–F2 | No scroll animation / hover-lift | ✓ | grep `IntersectionObserver`: only the one-time reveal and ViewContent timer; no transforms on hover |
| F3 | Real progress stages | ✓ | NDJSON stages from the server; journey A recorded the stage names actually shown |
| F4 | One motion, reduced-motion respected | ✓ | `BeforeAfter.tsx` |
| G1 | Favicon/OG/title | ✓ | `favicon.svg` wordmark G, `og.jpg` before/after, title "Genfundet – gamle billeder, restaureret og indrammet" |
| G2 | Phone, mail, CVR | ✓/TODO | phone and mail live; CVR and address render when `founder.md` is completed |
| G3–G4 | No builder fingerprints, no UI kit | ✓ | hand-written CSS, seven components, no Tailwind/shadcn/Radix/lucide |

Fails found and fixed during the audit: Fraunces/Instrument Sans (A1), slider knob chevron drawn with side borders,
`transition: width`, "Efter" label clipped by the after-image clip-path (selector tightened to `img.after`).

## Conversion red team (answered without adding sections)

- **Why would I not upload?** "It will look fake" and "I don't have the photo here". Both answered above the fold:
  the hero *is* the proof (a real, dramatic restoration), and step 1 says a phone photo in daylight is enough.
  Fix applied: the sheet's first line is "Vis os billedet." with camera first, library second; the privacy line sits
  under the buttons, not above them.
- **Why not trust this?** No company name until the founder fills `founder.md`. Fix: the footer and "Hvem står bag"
  render whatever is real (name, phone, mail today), and the tryghedslinje gives the three concrete promises in one row.
  The rest is the owner's job (HANDOFF §2).
- **Why not a free AI tool?** Because the free tool gives a file on a phone; we give the object on the wall and a
  human who checks the face. The offer line and the preview's mockup say exactly that. We never argue with the free tool.
- **Why not my local photographer (145–600 kr.)?** They need the print brought in and back; we need a phone photo,
  and the price includes frame and shipping. Copy: "inkl. ramme og fri fragt" is in the sub-line and the offer.
- **Why abandon checkout?** Unknown until Stripe runs. Structural answers: MobilePay first (HANDOFF §3), address
  collected by Stripe, no account, one required checkbox, preview kept on cancel (journey C).
- **What if the photo is at my mother's?** FAQ 2 answers it; the sticky CTA keeps the entry point when they come back.
- **Does the preview make me want the object?** The mockup is composed from *their* photo in a real 30×40 frame with a
  natural shadow, directly under the slider. Improvement possible: a real wall photograph (HANDOFF §11).
- **Would I still buy at 10 business days?** The "inden jul" promise switches automatically at the cutoff; after
  that the copy says "inden 5 hverdage" (the configured number) everywhere it matters. Honest and configurable.

## Security checklist (spec §10)

Server-side magic-byte sniffing and re-encode on ingest (`normaliseToJpeg`), size limit 25 MB (client + server +
bucket `file_size_limit`), private bucket with signed URLs ≤15 min, unguessable object paths (`orders/<uuid>/<kind>-<24 hex>`),
preview access tied to the session cookie (`ownsOrder`), customer images streamed same-origin (no storage host in the browser), admin HMAC cookie + rate limit, webhook signature verified,
CSP/`X-Frame-Options`/`nosniff`/Referrer-Policy headers, no client secrets (`NEXT_PUBLIC_` only for URL, anon key, pixel id),
RLS on all tables with no policies (service role only), `.env.local` git-ignored, approval token 192-bit, `/godkend/*/billede`
served `noindex`.

## Go-live (spec §13)

Not executed — requires live Stripe keys, MobilePay activation and the owner's card. Steps and verification list in HANDOFF.md §3.

## Journey results (`work/journeys.json`, iPhone 14 profile, live OpenAI + Supabase)

| Measure | Value |
|---|---|
| A: upload → preview shown | 38.5 s end to end on the final run (41.6 s on the first; upload 1.3 MB, restoration ≈30–35 s, vision check ≈6 s, storage + mockup ≈2 s) |
| A: stages actually displayed | "Uploader · 100 %", "Sender billedet…", "Restaurerer…", "Gør preview klar…" (all real, from the NDJSON stream) |
| A: colour toggle | arrived ≈35 s after the preview ("farver er på vej…" until then); "Vis i sort-hvid" after toggling |
| A: order button | `POST /api/checkout` → 503 "Betaling er ikke sat op endnu." (no Stripe key); calm inline error, preview kept |
| C: cancel return | preview resumed with the message; order still `PREVIEW_READY` |
| Direct API | `curl -F file=@strunk.jpg /api/preview` streamed `sending` → `restoring` (35 s) → `preparing` → `done` in 38.4 s |
| Edge observed | An in-flight preview interrupted by a dev-server config reload left an order in `NEW` with no files; the retention job removes such orders after 30 days. |
| B: group photo | fallback shown after 47.7 s. In this run the 45 s hard limit fired first (restoration of the 150-face plate took ≈38 s plus the vision check), so the reason recorded was `timeout`; in the quality runs the same photo was refused by `face_count_mismatch` + `invented_details`. Either way the customer sees the manual-review copy and the lead e-mail lands on the `MANUAL_REVIEW` order. |
| B2: wrong file type | inline message, no upload |
| Console | clean on the final run. Earlier runs showed (a) React's dev-mode `eval` under the CSP — now allowed only when `NODE_ENV !== 'production'` — and (b) connection resets for Supabase signed URLs, because the sandbox's headless browser cannot reach external hosts. (b) led to serving customer preview images same-origin through `/api/preview/[id]/image` (session-gated), which is also the better privacy posture. |

Target vs. reality: the spec targets ≤25 s for the preview; measured 41.6 s with `gpt-image-2` at `medium`. Options
recorded in DECISIONS.md: `PREVIEW_IMAGE_QUALITY=low` (≈18 s, visibly softer), or one candidate instead of two
(saves little — the two are generated in parallel server-side). The copy says "på 20 sekunder"; the processing line
says "normalt 20–40 sekunder" so the wait is honest inside the sheet. **Owner decision:** keep `medium` and change
the hero sub-line to "på under et minut", or accept `low` for the preview. The code supports both via env.

---

# Second pass — impeccable critique and rebuild (2026-09-03, later the same day)

Method: dual-agent critique per the impeccable playbook. Assessment A (design review) and Assessment B (detector, computed
styles, contrast, tap targets, reduced motion, Lighthouse) ran as two isolated agents in parallel against the dev server;
reports in `work/critique-a/report.md` and `work/critique-b/report.md`. ui-ux-pro-max domain searches (landing, ux ×6,
typography, color) and the apple-design gesture rules were applied during the rebuild.

## What the critique found and what changed

| Priority | Finding (A = design review, B = evidence) | Change |
|---|---|---|
| P0 | A: desktop hero self-centred on its own grid, text on another left edge | Photo-book spread: photo left-set in the container, caption column at its bottom edge, headline and CTA on one baseline below (`.hero-grid`, `.hero-text`) |
| P0 | A: the customer's photo was cropped square in the preview slider | Payload carries the restored image's width/height; slider uses the photo's own aspect with `object-fit: contain` |
| P0 | A: "under juletræet" and "inden jul" rendered in September | `CHRISTMAS_START_DATE` (1 Nov) added to the season window |
| P0 | A: "20 sekunder" vs measured 38–42 s | "under et minut" (hero, step 2); processing state "normalt 30–45 sekunder" |
| P1 | A: first mobile screen had no CTA | Tighter hero text block: photo, one-line caption, four-line headline, sub, button all inside 844 px (`01-hero-390.png`) |
| P1 | A: same photograph three times; 72 px thumbnails illustrate nothing | Steps show the object at each stage (damaged print → restored screen → framed mockup) from the second example at 112/160 px; examples grid starts at the second example |
| P1 | A: price is a paragraph, desktop band empty on the right | `.price` Newsreader 300, 88–168 px, ink, right-aligned opposite the offer line on desktop |
| P1 | A: founder section = name + Gmail | Renders only when portrait and at least one line exist; contact lives in the footer |
| P1 | A: forty seconds in an empty room, no cancel | Photograph stays at 45 % with the progress line on its bottom edge, a sentence per real stage, creeping bar during restoration, "Afbryd" (`02-processing-390.png`) |
| P1 | A: buy button below the fold of a 1 286 px sheet; heading after two images | **Preview is now a page** `/p/[id]`: heading, slider, toggle, mockup, copy; fixed price bar on mobile, sticky right column on desktop (`02-preview-390.png`, `02-preview-1440.png`) |
| P1 | A: a dropped connection showed the manual-review copy | New `error` state with "Forbindelsen røg…" and "Prøv igen"; fallback reserved for server doubt |
| P2 | A: /tak showed nothing she bought | Framed mockup + three-row hairline timeline + "Vis et billede mere" |
| P2 | A: wordmark sizes differed, captions carried the archive credit | `.wordmark` (24 px, always a link); captions = subject in ink, date in ink-2, credit to `title` and one honest line under the examples |
| P2 | A: 1120 px container, 580 px of content | Editorial 5/12 + 7/12 grid with sticky headings on every text section (`landing-1440.png`) |
| P2 | A: legal draft stamp visible to customers; readability | `LEGAL_DRAFT=false` hides it after review; Newsreader section headings, label-on-its-own-line lists |
| P2 | A: "Tag et foto" as primary on a laptop | Camera button only on `pointer: coarse`; desktop gets "Vælg billede" and a drop zone |
| Persona | A: reading swipe in the sheet could dismiss it | 10 px hysteresis, dismiss only from `scrollTop 0`, horizontal/upward intent falls through to scrolling, `touch-action: pan-y` |
| Persona | A: 13 px captions, 16 px-tall inline links | Captions 14 px; `.tap` gives every inline link 44 px of hit height |
| B | 6 inline links < 44 px | fixed as above; screenshot script reports none |
| B | LCP 7.3 s (dev) from a 238 KB hero JPEG; font-swap CLS 0.009; handle animated with `left` | Responsive `<picture>` (480/800/1000/1400, WebP + JPEG, `sizes`), harder compression on damaged before-images, metric-compatible fallback fonts, display-font preload removed, handle on `transform`, reveal driven on the DOM node (no React render per frame) |

Not changed, on purpose: the hero photograph stays (A's first provocative question) because the reveal is the argument the
owner's Meta ad relies on; it becomes a Danish family photo the moment `assets/originals/` is filled (HANDOFF §1).
The real wall photograph for the mockup (A's third question) still needs the owner's camera; the code-rendered wall was
warmed, the frame enlarged to 70 % of the wall height, and a floor line added (`public/examples/*-mockup.jpg`).

## Heuristics (Assessment A, before → my re-score after the rebuild)

| # | Heuristic | Before | After | Why |
|---|---|---|---|---|
| 1 | Visibility of system status | 2 | 4 | photo stays, stage sentences, real progress, /tak shows the object and the timeline |
| 2 | Match with real world | 3 | 4 | season window, honest timing |
| 3 | User control and freedom | 2 | 4 | Afbryd during processing, retry on network loss, preview reopens from the URL |
| 4 | Consistency | 2 | 4 | one wordmark, one timing claim, one grid |
| 5 | Error prevention | 3 | 4 | photo tips in the sheet, no crop in the preview |
| 6 | Recognition over recall | 3 | 4 | the preview page restates the offer beside the photo |
| 8 | Aesthetic and minimalist | 3 | 4 | no repeated photograph, founder hidden until real, price as an object |
| 9 | Error recovery | 2 | 4 | error vs fallback separated, "Prøv igen" keeps the file |
| | **Total** | **20/32** | **32/32** | self-scored; the owner should re-run `impeccable critique` after replacing the placeholders |

## Evidence after the rebuild

- Detector: `detect.mjs --json app components` → `[]` (all scopes).
- Breakpoints 375–1440: horizontal overflow 0, tap targets < 44 px: none (`checkpoints/breakpoints/report.txt`).
- Lighthouse on the **production build** (`next build && next start`, mobile emulation, simulated throttling):
  performance **89–93**, accessibility 100, best practices 100, SEO 100; LCP 3.2–3.8 s simulated (observed 0.18 s),
  CLS **0**, TBT 60–70 ms, Speed Index 0.8 s. Desktop preset: performance **100**, LCP 0.8 s. Reports in `work/lh/`.
- Journey A on the rebuilt flow: landing → sheet → processing (photo + progress + Afbryd) → `/p/<id>` in 37.9 s → colour
  toggle → checkout call (503 without Stripe keys, calm inline error) → cancel URL `/p/<id>?cancelled=1` resumes.
  Console clean. Journey B and B2 unchanged (fallback copy and lead, wrong-type message).

---

# Third pass — premium presentation and richer comparisons

Owner's brief: 599 kr. must feel worth it, and before/after must convince with more forms and more examples.

## What changed
- **Nine examples instead of five.** Four Library of Congress tintypes (mother with two children, boy beside a chair,
  three-person group, woman in a hat on a corroded plate) went through the same pipeline; all four pass the gate
  (QUALITY_REPORT.md, set 2). Ovals, arches, sepia, children and groups are now represented.
- **Four comparison forms**, one per example: wipe (hero + one), lens (`clip-path: circle()` under the finger, radius
  from the rendered width so clip and ring share one geometry, arrow keys move it), hold (press to see the original,
  220 ms crossfade, space toggles), fade (1.4 s dissolve every 4 s, paused off-screen, on touch and under reduced motion).
  `checkpoints/06-examples-390.png`, `06-lens-drag-390.png`.
- **"Tæt på"**: six 2× detail pairs (before | after) around faces, freckles, buttons. `06-details-390.png`.
- **Colour example** with the customer's own toggle (woman in the hat).
- **"Det får du"**: the framed mockup and a gallery-label list of exactly what the price buys, plus the photographer
  comparison from the brief. Repeated on the preview page under the offer paragraph. `06-product-390.png`.
- Photographs in the grid carry a hairline outline like mounted prints; mockup frame enlarged, floor line added.

## Evidence
- Detector: `[]`. Breakpoints 375–1440: no overflow, no tap target < 44 px.
- Lighthouse, production build, mobile emulation: performance **95–97**, accessibility 100, best practices 100, SEO 100,
  LCP 2.4–2.9 s (simulated), CLS 0, TBT 70–80 ms. Desktop 99.
- Anti-slop: the motion rule (F4) was amended and re-audited — motion exists only where comparison is the content; no
  scroll reveals, no hover lifts, no decorative loops. The fade example stops off-screen and under reduced motion.


# Fourth pass — Nordic examples and two conversion attacks

Owner's brief: the examples should look like Danish families; attack every part of the page that stops a conversion, fix, attack again, fix.

## Attack round 1 (`work/attack-1/report.md`)
Method: adversarial CRO agent, read-only, Playwright iPhone 14 at 390×844 and 390×664, desktop 1440×900, one real restoration (40.9 s). 25 findings, 8 HIGH.

| # | Finding | Fix |
|---|---|---|
| 1.1 HIGH | Slider knob never moved (`.ba .handle` had `width: 0`, percentage translate = 0) | handle full-width, `translateX(var(--x))`; knob measured on the seam (35 %) on hero and grid |
| 1.2 HIGH | First screen at 390×664 ended mid-headline | landscape Nordic hero at 4:3, `.hero-text` padding, shorter lead; CTA bottom 644 px, price line 652 px |
| 1.3 MED | "hendes forældre" — ad-continuation voice | "Mors gamle billede. Skarpt igen, i ramme, hjemme hos dig." |
| 1.4 MED | At rest 62 % damage | reveal 88 % → 35 % |
| 2.1 MED | "Dansk virksomhed" without CVR | trust row renders city + CVR from founder.md (owner fills) |
| 2.2 MED | First name without a face | `fornavn()` returns "vi" until portrait + why exist |
| 2.3 MED | 145–600 kr. anchor | "ét beløb, ingen tillæg" |
| 2.4 MED | Button before price on mobile | `.offer-act` ordered after the price below 1024 px; "Det koster ikke noget at se…" |
| 2.5 MED | Consent banner over sticky CTA | `.consent` bottom = `--bar-h` |
| 2.6 LOW | Four gestures | kept (owner's decision) |
| 2.7–2.8 LOW | FAQ wording, no colour-photo answer | rewritten, added |
| 3.1 HIGH | Sheet never says it costs nothing | line under the buttons and under the CTA |
| 3.2 MED | No path for "billedet ligger hos mor" | "Jeg har ikke billedet lige nu" → e-mail → link mailed |
| 3.3 LOW | Tip vanishes after picking | "Er det skarpt og uden genskin? Ellers vælg et andet." |
| 5.1 HIGH | 32 s "Sender billedet" with frozen bar | stage relabelled "Restaurerer", creep runs while the request is in flight, 45 s "tager lidt længere" line |
| 5.2 LOW | "Afbryd" | "Afbryd (billedet slettes)" |
| 6.1 MED | Watermark across the face | bottom row + corner mark |
| 6.2 MED | No sentence about what happens next | line under the slider |
| 6.3 HIGH | No payment reassurance on iPhone | bar: "MobilePay, Apple Pay eller kort · Ingen oprettelse"; content: money-back + when you pay |
| 6.4 HIGH | When do I pay? | "Du betaler 599 kr. nu. Indtil du har godkendt det færdige billede, kan du fortryde og få hele beløbet tilbage." |
| 6.5 MED | English 404 on a copied URL | token in the pushed URL and image URLs; Danish `not-found.tsx` |
| 6.6 LOW | Colour toggle flashes the original | preloaded before enabling; "Farveversion på vej – ca. ½ minut" |
| 6.7–6.8 LOW | Spec list heading, Levering row, "Hænder", landscape label | all done |
| 8.1 HIGH | Silent checkout failure on iPhone | alert rendered inside the bar |
| 9.1 MED | Dead-end error text | phone number + "Dit preview er gemt", never a server string |
| 10.1 MED | /tak unverified sends to the front page | back to `/p/<id>` via session, phone shown |
| 10.2 LOW | "I dag" at 23:15 | "inden 24 timer" |
| 11.1 HIGH | Gmail, no CVR/address, "Udkast" | owner (HANDOFF §2, §8); code already renders them when filled |
| 11.2 LOW | Privacy not reachable from the sheet | linked |

Evidence: `work/attack-1-fix/*.png` (first screen 390×664, sheet, no-photo path, offer, examples, 404, /tak unverified, preview first screen and failed order, desktop preview), `preview-watermark.jpg`.

## Attack round 2 (`work/attack-2/report.md`)
Method: a second adversarial agent verified every round-1 fix on the live page (13 items: 10 VERIFIED, 3 PARTIAL, 0 FAILED) and hunted again. Its one real restoration run hit the 45 s server limit, which became the top finding.

| # | Finding | Fix |
|---|---|---|
| H1 HIGH | 45 s hard limit turns a slow minute at OpenAI into "Det her kræver et par hænder" (untrue for a timeout, no retry) | `previewTimeoutMs` 90 s, route `maxDuration` 120; bar creeps 60 s to 92 %; slow line at 35 s; `reason: timeout/provider_error` → retry state ("Det tog for lang tid." + "Prøv igen" + "Send det til os i stedet"); manual-review copy no longer blames the photo |
| H2 HIGH | Hero pair too subtle at 35 % (bucket vs. face); "Tæt på" opened with the soft pair | hero rests at 50 % (`rest` prop) so the seam runs between the two faces; "Tæt på" opens with the soldier pair, hero pair last |
| H3 HIGH | Consent banner (with pixel id) would cover the first-screen button and float above the sheet | banner appears only after the first scroll, hidden while the sheet is open (`body[data-flow-open]`), one row on phones |
| H4 HIGH | `save` route ignored the share token → 404 for anyone on the mailed link; server errors shown as validation copy | token accepted; `invalid` vs `failed` states with their own copy |
| M1 | Phone in the checkout error not tappable | rendered as `tel:` link |
| M2 | Link-card description said "20 sekunder" | "under et minut" in both descriptions |
| M3 | Hero caption read like a customer | "Gunhild og Ole Christian, ca. 1935 · arkivfoto" |
| M4 | Desktop preview: order button at y 1201 | CTA first in the right column |
| M6 | FAQ "ligger hos min mor" had no way to the link path | "Send mig linket" button opens the sheet in the no-photo state (`gf:open` detail) |
| M7 | Nothing to read during a 60 s wait | two more true sentences rotate at 15 s and 30 s |
| M8 | Price line 12 px under the fold at 390×664 | hero padding s2, shorter caption and price line; CTA bottom 640, price line 648 |
| L1 | "maskinens første bud" | "det automatiske første udkast" |
| L2 | Colour toggle buried | quiet button directly under the slider |
| L6 | /tak unverified without cookie | falls back to `/p/<id>?t=<token>` via the Checkout session's order |

Not done (owner): CVR/address/portrait/why, draft label, domain mailbox, env for the test (HANDOFF §2, §3, §4, §5, §8). Kept: four comparison forms, no "gratis".

Evidence after round 2: `work/attack-1-fix/m-first-664.png` (knob at 50 %, CTA bottom 640), `m-faq-nophoto.png`, `m-preview-first.png`, `d-preview.png` (CTA at top of the right column), `work/attack-2/*` (agent's own captures).

## Evidence after the fourth pass
- Detector/breakpoints (`scripts/screenshots.ts`, 375–1440): horizontal overflow 0, tap targets < 44 px: none. Checkpoints refreshed.
- Lighthouse, production build, mobile emulation: performance **98**, accessibility 100, best practices 100, SEO 100, LCP 2.5 s, CLS 0, TBT 60 ms (a first run straight after `next start` scored 74 with FCP 2.7 s — cold server, not the page). Desktop 99, LCP 1.0 s.
- Test orders, events and storage objects from both attack rounds were deleted with the new `scripts/purge-orders.ts` (dry run by default, `--yes` to delete; only never-paid orders unless `--all`). Run it once more before launch.

# Fifth pass — before/after physics (apple-design)
See DECISIONS.md "Fifth pass". Measured with `work/attack-1-fix/physics.mjs` on the iPhone 14 profile (390×664): reveal samples at 150 ms `88 87 66 47 38 34 32 31 30 30`, knob on the seam; drag from the knob 1:1 (seam 55.6 = finger 55.6); flick 40 → 17; tap 80 → 80; rubber-band past the edge (seam 100, knob 104.7, `--kx` 18 px) and back; labels 100 / 0; lens press springs to the finger. Screenshots `p-01…p-05`.
Evidence after the fifth pass: breakpoints 375–1440 no overflow, no tap target < 44 px (labels are 44 px buttons with the chip inside). Lighthouse production, mobile: 97 / 96 (a cold first run 87), LCP 2.6 s, CLS 0, TBT 70–80 ms; desktop 99, LCP 0.9 s. The damaged hero original is served at 70vw on phones (54 kB) and the italic display face is no longer requested on the landing page.

# Sixth pass — Netlify architecture
- End-to-end on the new flow (`work/attack-1-fix/e2e.mjs`, iPhone 14 profile, dev server with in-process jobs): pick → "Vis mig resultatet" → order created → signed PUT (blocked in this sandbox: the browser cannot reach the bucket host) → watchdog → fallback through the app (4.5 MB cap, browser downscale) → job → poll → landed on `/p/<id>?t=…` after 81.9 s; stage captions "Uploader 100 %" → "Restaurerer" (rotating sentences at 15/30 s, slow line at 35 s) → "Gør preview klar"; colour version arrived by polling after 135 s. No console errors except the expected blocked PUT.
- `zip-it-and-ship-it` (the bundler Netlify uses) bundles both functions from the repo root: `job-background` (19 MB with sharp's linux binaries, `background: true`), `retention` (`schedule: 0 3 * * *`), the `@/` aliases resolve, `processRestore/processColour/processFinal` are in the bundle.
- Not verifiable here: the signed direct upload from a real phone (sandbox network), Netlify's own build. HANDOFF §6 lists the three things to check after the first deploy.

## Attack round 3 (`work/attack-3/report.md`) — the money path and operations
Method: adversarial agent on the Netlify architecture; one real restoration (68.7 s end to end incl. 13 s of blocked PUT in the sandbox), the approval flow staged in Supabase, the four mails rendered, a direct probe of the bucket. 30+ findings.

| # | Finding | Fix |
|---|---|---|
| 1.1 HIGH | HEIC from the camera roll rejected by the bucket (415) and by the fallback route | bucket allows heic/heif (migration 0003, applied live); fallback sniffs bytes; direct PUT retried typed as JPEG |
| 1.2 HIGH | Paid order invisible when the webhook fails or /tak never renders | hourly reconciliation with Stripe (`lib/reconcile.ts`) + admin "Tjek betaling hos Stripe" |
| 1.3 HIGH | Second Checkout session accepted; double payment silent | previous session expired; a second payment refunded automatically, owner mailed, note on the order |
| 1.4 MED | Webhook and /tak race → two mails | atomic `transition()` (PAID, APPROVED, CHANGE_REQUESTED) |
| 1.5 MED | Cancel URL without token → 404 | token appended |
| 1.6 MED | 25 s at 0 % before the fallback | first-byte watchdog 6 s on the direct transport; bar starts at 1 % |
| 1.7 MED | Jobs stuck forever | failed enqueue recorded; `jobBusy` ages; sheet gives up at 150 s with retry |
| 1.8–1.9 LOW | "30 dage" copy; cancel under open checkout | copy; refused within 1 h of a session |
| 2.1 HIGH | Purchase only from a consenting browser | server-side Purchase via CAPI, same event_id, hashed matching, fbc |
| 2.2 HIGH | ViewContent/InitiateCheckout lost pre-consent and on revisits | pre-consent queue replayed on Ok; PixelBoot on every page; Consent on /p; ViewContent on /p; IC with session id |
| 2.3 MED | Advanced matching, product params, mid-funnel event | em/ph on /tak; PRODUCT params everywhere; HANDOFF §5 (custom conversion on PreviewShown) |
| 2.4 LOW | gf_utm not listed | privacy text |
| 3.1 MED | Confirmation not an ordrebekræftelse | amount, address, order, terms link, refund line, mockup, preview link |
| 3.2 MED | Approval buttons under a tall image | buttons above and below, full width; "svar med ja" line |
| 3.3 LOW | Reply-to gmail | `EMAIL_REPLY_TO` |
| 4.1 HIGH | Godkend changed nothing on screen | redirect to a confirmation; SubmitButton pending state; atomic |
| 4.2 HIGH | Change request: old mail still approves; nobody told | own page state, new token per version, old tokens → "nyere version" page, mail to customer and owner |
| 4.3 MED | Decision below the fold | buttons first, image ≤ 70dvh, "Det her er det billede, vi printer" |
| 4.4 MED | One reminder, then silence | 7-day reminder with the phone, owner nudge at 10 days |
| 5.1 HIGH | Owner never told anything | `notifyOwner()` on every event that needs a human |
| 5.2 HIGH | Final upload dies on the 6 MB function limit | signed-URL upload (`FinalUpload`, `/api/admin/final-upload`) |
| 5.3 MED | No "what to do next" | "Til handling" block; next-step line on the order; analytics rows hidden by default |
| 5.4 MED | No refund mail; COMPLETED never set | refund mail; auto-complete 14 days after SHIPPED |
| 5.5 LOW | SDK timeout | 300 s |
| 6.1 HIGH | OG/site URL at build time | HANDOFF; OG image with size and alt; canonical |
| 6.2 MED | Stripe Terms URL | HANDOFF §3b; error message logged |
| 6.3 MED | Privacy vs. code | SHIPPED included in 90-day deletion; Netlify EU; gf_utm; CAPI line |
| 6.5 LOW | robots/noindex | `app/robots.ts`, `app/sitemap.ts`, noindex on /p, /tak, /godkend, /admin |
| 7.1 HIGH | JOB_RUNNER detection | `JOB_RUNNER=netlify` documented; build fails without JOB_SECRET in production |
| 7.2 MED | Landing page hits a function per click | static, ISR hourly; resume via client; sharp/OpenAI loaded only in jobs |
| 7.3 MED | Region | HANDOFF (EU region) |
| 7.4 MED | Retention as a sync scheduled function | scheduled function hands over to the background job, hourly |
| 7.5 LOW | Poll cost | first poll at 6 s, 2 s → 4 s after 60 s; colour poll 15 s when hidden |
| 8 | Wait copy, preview images | "omkring et minut", slow line at 75 s, preload of both slider images |

Evidence after round 3: approval flow on the iPhone profile — first Godkend button at y 281 (above the picture), change request → "Tak, vi retter det." with no Godkend button, a re-send rotates the token (old link: "Der findes en nyere version."), Godkend → "Tak. Vi printer og sender." with "Dit ja er registreret", `/aendring` after approval → "Billedet er godkendt og på vej i produktion."; admin "Til handling" lists the order with the customer's change text; order page shows the next step. Upload flow end to end after the changes: landed in 76 s (a slow provider minute: 60 s of restoration), first-byte watchdog moved the bar to 1 % at 1.5 s, fallback transport took over, colour arrived by polling; no console errors. Emails re-rendered (`checkpoints/04-email-*.png`): ordrebekræftelse with amount, address, order id, terms and preview links; approval mail with the buttons above and below the picture. Netlify bundles rebuilt with the housekeeping job. Production build: the landing page is static (ISR 1 h); robots.txt and sitemap.xml serve. Test orders purged (`--all`).

## Attack round 4 (Netlify reality, Windows-developed repo, fresh eyes)
The fourth agent was cut off by the session limit before writing its report; its logs (`work/attack-4/*.log`) and my own audit give:

| Finding | Fix |
|---|---|
| HIGH — "Afbryd" during the upload closed the sheet but the chain continued (PUT → fallback → run) and re-opened the sheet 12 s later with "Restaurerer" (`cancel.log`) | run token in `UploadFlow`: every `await` in `start()`/`run()` checks it; a cancel after the order exists calls `/cancel`. Verified: after Afbryd at 5.3 s only `start` and `cancel` fire, the sheet stays closed |
| MEDIUM — two colourised objects survived `abandon()` (paths recorded on the row did not cover every object) | `removeOrderObjects()` deletes everything under `orders/<id>/`; used by abandon and retention |
| MEDIUM — deploy previews would enqueue jobs on the production URL | `DEPLOY_PRIME_URL` first, then `URL`, then `NEXT_PUBLIC_SITE_URL` |
| MEDIUM — Windows checkouts: CRLF, a lockfile without Linux sharp binaries | `.gitattributes` (LF), `.nvmrc` 22, `netlify.toml` installs `sharp` for linux-x64 before the build |
| MEDIUM — `proxy.ts` (Next 16) on the Netlify adapter is not documented | routes mint `gf_sid` themselves when no proxy ran (`ensureSessionId`); tokens carry every customer link; verify in the first deploy log |
| Verified by the agent's logs | Godkend → `?r=approved` + "Tak. Vi printer og sender.", DB APPROVED; old token → "nyere version"; change → "Tak. Vi retter det." with the text, no Godkend button; admin "Til handling" with the customer's text; order page next-step line; preview page: images 1.8–2.8 s, consent banner absent without pixel id, bar 103 px, checkout error with `tel:`, save link, cancel-return notice, colour by polling at 2.7 s cadence in 46 s; landing 390×664: CTA bottom 640, trust row, sheet copy; desktop CTA at y 112 |

Facts for the owner: Netlify builds on Ubuntu and runs functions on Amazon Linux — it is Linux. The only Windows-specific risk is the lockfile/sharp one above, now insured against.

## Pass 8 — no phone number, three sizes, the lens, Christmas boxed in

| What was asked | What was done | Evidence |
|---|---|---|
| "Fjern telefonnummeret" | No `phone` field exists any more (`founder.md`, `lib/founder.ts`), so no surface can print one. Every phone-based recovery path became an e-mail one with a real `mailto` link: checkout error, 404, `/tak` unverified, both approval pages, the footer, the price block, the order mail, the 7-day reminder and the owner's 10-day nudge. The page promises an answer within 24 hours, matching §0 D of HANDOFF. | `work/pass8/land.mjs`: the rendered front page contains no `tel:`, no "ring til", no number. Checkout error on the phone reads "…eller skriv til os på <address>, så sender vi et betalingslink." (`s-03-checkout-error.png`) |
| "flere formatter som vi snakkede om" | Three sizes on sale: 30×40 599 kr., 40×50 799 kr., 50×70 999 kr. The landing page quotes "fra 599 kr." and lists all three as a price list; the choice is made on the preview page under the mockup, where the customer has seen the restoration. Picking a size swaps the wall mockup, the button price, the spec list, the refund line and the Stripe line item. One mockup per size is rendered during the restoration job and preloaded, so the swap is instant. The amount is looked up server-side from `PRICING`, never taken from the browser. | `work/pass8/sizes.mjs`: 30×40 → "Bestil mit billede – 599 kr.", mockup `f=30x40`, spec "Det får du for 599 kr.", print row "30×40 cm …"; 50×70 → 999 kr. everywhere and the checkout body carries `format: '50x70'`. Choice survives a reload (`l-04-picker.png`) |
| "luppen virker ikke korrekt" | The container is `touch-action: pan-y`, so on a phone the browser took every vertical drag for scrolling and the lens gesture died; and a press outside the ring could stall the spring. The ring is now the handle (own element, `touch-action: none`, circular hit area, owns the pointer); a tap anywhere else springs the lens there; the centre is clamped by the radius so the circle is never half outside. | `work/lens-test.mjs` on an iPhone 13 profile: ring drag −60/+40 px → lens at 27.9 % / 58.1 %; tap at 85 %/20 % → 72.1 % / 20.2 % (clamped exactly by the radius); all four edges inside; a touch on the photograph still scrolls |
| "Jule udgaven er ik main pagen" | The headline, lead, product and promise are identical all year. The season adds only an eyebrow with the last order date, the deadline line with a countdown, one FAQ answer and the closing line — and it starts 14 November, not 1 October. | Front page today (4 September): eyebrow "Gaven, ingen andre kan give", h1 "Mors gamle billede. Skarpt igen, i ramme, hjemme hos dig." |
| "skal meta adde om en uge maks" | HANDOFF §0b is a seven-day plan with one order per day, and the three things the ad copy must respect (fra 599 kr., never "gratis", no Christmas promise before 14 November). | HANDOFF.md §0b |

End-to-end after the changes: upload → restoration → preview landed in 77 s with three mockups rendered, colour version at 127 s, no console errors (`work/pass8/e2e.mjs`).

## Pass 9 — the shop (add-ons, the second copy, the bill)

| What was asked | What was done | Evidence |
|---|---|---|
| "der skal være add ons" | Frame choice (sort/eg, same price) and *ekstra eksemplar af samme billede* (349/449/549 kr. by size, max 3), both on the preview page under the wall mockup. Nothing pre-ticked. The frame is rendered, not described: a mockup exists for every size × frame and crossfades on pick. | `work/pass9/config.mjs`: eg → mockup `40x50/eg`; two extra copies → bill lines "Restaureret billede, 40×50 cm 799 kr." + "2 × Ekstra eksemplar, 40×50 cm 898 kr.", total 1.697 kr., button "Bestil mit billede · 1.697 kr.", checkout body `{format:'40x50', frame:'eg', extraPrints:2}` |
| "tilføj endnu et billede upsell" | The receipt carries it: /tak and the ordrebekræftelse offer "billede nummer to" with 100 kr. off, as a link holding the paid order's own share token. It starts an ordinary new order that remembers its parent; the discount is only real if the server can match that reference to a real paid order. | `work/pass9/tak.mjs`: receipt → "Har I flere billeder?" → link → front page → sheet says "Billede nummer to: 100 kr. er trukket fra". `repeat-guard.mts`: valid ref resolves, wrong token / missing token / garbage all null |
| "alt psykologisk" | Where-you-are steps on the preview page, the object before the decisions, a real *Din bestilling* receipt with shipping named as included, a total that counts rather than jumps, the three-line guarantee next to the big price, "papir falmer" under the three steps, and the post-purchase moment used for the one question worth asking. No fake proof, no countdown that is not a real deadline, no pre-ticked add-on. | `work/pass9/l-01-offer.png`, `c-04-config.png`, `t-01-tak.png` |
| "front end … Apple / Claude design team" | Hairline configurator rows with gallery labels instead of cards; frame swatches that are the moulding itself; 44 px targets everywhere; radios are real radios (keyboard + VoiceOver); the total animates with an ease-out over 380 ms and tabular figures so nothing reflows; the wall crossfades between combinations; every animation has a reduced-motion path; the fieldset rule is an inset shadow so a legend never cuts a hole in it. | `c-04-config.png`, `t-01-tak.png` |

The money path is arithmetic in one file: `quote()` draws the bill in the browser and builds the Stripe line items on the server. Hostile input (`format:'hack'`, `frame:'guld'`, `extraPrints:99`) resolves to 30×40, sort, 3 — never to a price the page invented.

Desktop (1440): the photograph is sticky while the choices scroll, and the order button appears again directly under the total. The money sentence names the **total**, not the size price — it counts along with everything else (`work/pass9/paywhen.mjs`: 1.697 kr. → 2.097 kr. when the size changes).

Lighthouse after the pass (dev server, so `performance` and `valid-source-maps` are not representative — the production build is what the earlier 93–97 numbers were measured on): landing page **accessibility 100 · best-practices 100 · SEO 100**; the order page **accessibility 100 · best-practices 100 · CLS 0**. One real finding was fixed on the way: the un-reached step in the step indicator was dimmed to 2.44:1 contrast — dimming below AA is not a hierarchy, so the steps now separate by ink and an underline instead of by opacity.

## Pass 10 — brutal full-funnel conversion audit (cold Meta traffic)

Three parallel audits against the running funnel on an iPhone 14 profile: design/CRO, mechanical evidence
(detector, tap targets, contrast, overflow, CLS, Lighthouse, analytics inventory), and price/promise
consistency across every surface. Full report: `work/audit/`, published as an artifact.

**The two findings that decide go/no-go, both measured, neither a design problem:**
1. **The money path has never executed once.** Supabase on 4 September: 5 orders, none with a
   `payment_session_id`; events ever logged: PageView 352 · ViewContent 137 · UploadStarted 13 ·
   UploadCompleted 2 · PreviewShown 2 · **InitiateCheckout 0 · Purchase 0**. `.env.local` has no Stripe,
   Resend, pixel or CAPI keys. Checkout answers 503 today.
2. **The trader cannot be verified.** `founder.md` still has TODO for city/CVR/address and no portrait, so
   the terms page renders a partial identity, the founder section hides itself, and the only contact is a
   personal Gmail address printed directly above the buy button.

**Fixed in this pass (all verified in the browser):**

| Finding | Evidence | Fix |
|---|---|---|
| Both legal pages published the words "Udkast – gennemgås af advokat" | `LegalPage.tsx:5` defaulted to draft | the banner is opt-in (`LEGAL_DRAFT === 'true'`) |
| A missing CVR or address disappeared silently because name + e-mail were present | terms rendered `Mohammad Yassin, <e-mail>` as if complete | each missing field names itself |
| The terms described one size at one price | `handelsbetingelser:18` | the three sizes, both frames, extra-copy prices and the repeat discount, from `PRICING` |
| "under et minut" in five places, measured 75-120 s | `copy.ts` ×4, `layout.tsx` ×2 | "omkring halvandet minut"; the apology moved 75 s → 110 s |
| The browser uploaded the camera's original file | `UploadFlow` downscaled only above 4.5 MB, and only on the fallback transport | ≤3200 px on both transports — **2.83 MB → 1.10 MB measured** |
| Six wall mockups rendered before the page could open | measured 2.453 s vs 346 ms for one | only the order's own combination first; the other five after |
| A stale Checkout tab could charge an amount the bill never showed | session lives 1 h, `choose` mutated the order | changing the configuration expires the session; `markPaid` compares the charge with the order's own quote |
| A second payment made while the webhook was down was referenced nowhere | reconcile only asked about the newest session, only on unpaid rows | every session id is kept and re-checked; the customer now gets the refund mail too |
| Stripe required a phone number | `stripe.ts:58` | off — nothing in fulfilment needs it |
| Opening the upload sheet fired no event | no `track()` on the open path | `FlowOpened`; `AddToCart` now also fires on size choice with the real value; one PageView per route on every route; the duplicate `UploadStarted` row is gone |
| The approval page told every customer "vi printer i 30×40 cm" | `c.formatLabel`, not the order | `orderDescription(order)` |
| Desktop hero pushed its own h1 and CTA below the fold (CTA showed 17.5 px of 52) | 1440×900 | hero image 80vh → 58vh; CTA now ends at 796 px |
| Før/Efter and the colour toggle sat behind the fixed order bar at rest | product page, 390×664 | picture height bound to the viewport minus the bar |
| Horizontal scrollbar at 320 px | `.trust span { white-space: nowrap }` | wraps below 768 px |
| The extra-copy offer sat between the customer and the total | +349 kr. crossed the eye before "I alt" | the bill comes first |
| "gavekort" (= gift voucher in Danish) | `copy.ts:111,239` | "kort med din hilsen" |
| Retention counted 30 days from the last write, not from upload | `retention.ts:34` | `created_at` for unpaid rows |
| The repeat discount was promised on a `.` in the query string | `UploadFlow` | `/api/repeat` validates it first |
| No way to delete your own photograph | promise existed only as a sentence | "Slet mit billede nu" on the preview page |

**Hypothesis killed with data:** dropping to one model candidate would not shorten the wait
(`candidates=1` 44.3 s vs `candidates=2` 42.9 s — the API generates them in parallel, and the second one
buys the SSIM pick). The ~45-65 s restoration is a floor; only the upload leg and the mockups were free.

**After the fixes, measured end to end with a real 2.83 MB phone photograph: 79.8 s** (upload 8.6 s on
localhost, restoration 64.5 s, preparation 4.6 s — down from 9-11 s), the wait-state e-mail capture
delivers, no console errors, landing page accessibility 100 / SEO 100, CLS 0.

### Pass 10b — everything else the code could fix

Verified after the changes (dev server, iPhone 14 profile unless noted):

| Check | Result |
|---|---|
| Full upload → preview with a real 2.83 MB phone photograph | **75.9 s**, "Gør preview klar" under a second, colour ready at 78.5 s, no console errors |
| Hero CTA above the fold | mobile 594→646 of 664 ✓ · desktop 732→784 of 900 ✓ |
| Product page at rest: picture, Før/Efter, image controls clear of the fixed bar | 173→465, 415→459, 481→525 (bar at 561) ✓ |
| Horizontal overflow at 320 / 360 / 390 / 430 px | none ✓ |
| Text under 13 px on the product page | none ✓ |
| Tap targets under 44 px | none ✓ |
| "Se tæt på" | `matrix(1,…)` → `matrix(2.2,…)` on both sides ✓ |
| Save-your-preview form | collapsed by default ✓ |
| Legal pages | no draft banner; missing CVR and address name themselves ✓ |
| Terms | all three sizes, extra-copy prices and the repeat discount ✓ |
| Stripe line items | refused unless they sum to the quoted total (new assertion) |
| Repeat link | capped at 3 redemptions per receipt |

MobilePay was removed on the owner's instruction: the Checkout session sends no payment-method list, so
Stripe offers what the account has enabled and the browser supports (cards, Apple Pay, Google Pay).

## Pass 11 — the fix list, implemented and tested

Verification of the owner's 20-point list. Only what was not already true was changed.

**The one real conflict, resolved in the owner's favour:** the spec says an extra copy is **+349 kr. at any
size** (FIX 2, FIX 12, scenario E = 40×50 + 1 = 1.148 kr.). The code priced it per size (349/449/549), so
scenario E produced 1.248 kr. `EXTRA_PRINT_DKK` is now a flat 349 and every scenario passes.

### Scenario matrix (`work/audit/qa-scenarios.mjs`, iPhone 14 profile, live server)

| # | Configuration | Expected | Bill | Mobile CTA | Desktop CTA | "du betaler" | Server (`/choose`) |
|---|---|---|---|---|---|---|---|
| A | 30×40 + 0 | 599 kr. | ✓ | ✓ | ✓ | ✓ | ✓ |
| B | 40×50 + 0 | 799 kr. | ✓ | ✓ | ✓ | ✓ | ✓ |
| C | 50×70 + 0 | 999 kr. | ✓ | ✓ | ✓ | ✓ | ✓ |
| D | 30×40 + 1 | 948 kr. | ✓ | ✓ | ✓ | ✓ | ✓ |
| E | 40×50 + 1 | 1.148 kr. | ✓ | ✓ | ✓ | ✓ | ✓ |

`work/audit/pricing-matrix.mts` checks all 48 combinations (3 sizes × 2 frames × 0-3 extras × repeat
on/off): `quote()`, the sum of its lines, and the Stripe line-item arithmetic all agree, every total is
positive, and the session is refused if they ever disagree.

### Edge cases (`work/audit/edge-cases.mjs`)

| Case | Result |
|---|---|
| Checkout answers 502 | calm Danish line with the address, order button re-enabled ✓ |
| Refresh on the preview | configuration and total survive (50×70, 2.046 kr.) ✓ |
| Browser back from the landing page | returns to the preview with its state ✓ |
| Preview link without the share token | Danish 404 explaining why, with a way home ✓ |
| Cancel during processing | sheet closes, upload deleted, back on the landing page ✓ |

### Funnel events (`work/audit/events-check.mjs`)
`PageView` (once per route) → `FlowOpened` → `UploadStarted` → `ProcessingStarted` → `UploadCompleted` →
`PreviewShown` → `ViewContent` (with the order's real value) → `ColourViewed` → `AddToCart` (size and
extra copies, real value) → `InitiateCheckout` → `Purchase` (once per order, `purchase_tracked_at`).
No duplicate PageView, no duplicate ViewContent. `PRODUCT` no longer carries a hardcoded 599/30×40.

Lighthouse on the product page after the changes: accessibility 100, best practices 100. Nothing under
13 px, nothing tappable under 44 px, no horizontal overflow at 320-430 px, CTA above the fold on both sizes.

## Launch-hardening, 4. september 2026

Kørt mod en produktionsbygning på 3111.

| Kontrol | Kommando | Resultat |
|---|---|---|
| Standardordren og al prisregning | `npm test` | 7/7 · standard = 30×40 · sort · 0 ekstra · 599 kr. |
| Stripe-beløb = det regningen viste | `npm test` | 48/48 kombinationer |
| Priser og CTA'er i browseren | `npm run test:order` | 9/9 · ingen stale priser |
| Ekstra eksemplar er opt-in ved indlæsning | `npm run test:order` | knap, ingen stepper, intet afkrydset ud over størrelse og ramme |
| Vandret overløb, tryk under 44 px, dækket indhold | `npm run test:viewport` | 12/12 · 375 / 390 / 430 / 768 / 1024 / 1280 px, forside og bestillingsside |
| Placeholders og testdata i kundeflader | `grep` over `app/ components/ lib/` | kun `[Udfyld: …]`, som produktionsbygningen nu afviser |

Ikke kørt, og hvorfor: en rigtig betaling (ingen Stripe-nøgler) og et rigtigt upload-til-preview
(ingen OpenAI-credits). Serverleddet i begge er dækket af `npm test`.

### Efter fjernelsen af gentagelsesrabatten

`npm test` 8/8 (24 kombinationer nu, ikke 48 — gentagelsesaksen findes ikke længere), `npm run test:order`
9/9, `npm run test:viewport` 12/12. Produktionsbygningen indeholder ordet "rabat" ét sted: admin-noten
"Ingen rabat: et nyt billede koster normal pris."

## Produktionsgennemgang, 5. september 2026

Hele produktet gennemgået som kold Meta-trafik: kode, tilstande, copy, mails, sikkerhed, 390 og 1280 px.
Kørt mod en produktionsbygning på 3111 før og efter ændringerne.

| Kontrol | Kommando | Resultat |
|---|---|---|
| Typer | `npm run typecheck` | rent |
| Prisregning, standardordre, ingen negative linjer | `npm test` | 8/8 |
| Priser og CTA'er i browseren, ekstra er opt-in | `npm run test:order` | 9/9 |
| Overløb, tryk under 44 px, dækket indhold | `npm run test:viewport` | 12/12 |
| Konsolfejl på forside, ark, bestillingsside, /tak, 404, handelsbetingelser | `work/pass10/shots.mjs` | ingen (404-siden logger sit eget 404) |
| Ukendt godkendelsesnøgle på `/godkend/<x>/fil` | `curl` | 404 |
| `/founder.jpg` uden portræt i `founder.md` | `curl` | 404 (ingen brudt billedfil på forsiden) |
| Fjerde "Send mig linket" til samme adresse på ét døgn | `curl` × 4 mod `/api/lead` | tre "would send" i serverloggen, den fjerde sender intet |

Fundet og rettet: den digitale fil blev lovet fem steder og leveret ingen steder (nu download fra
godkendelsessiden og fragtmailen); `/founder.jpg` fandtes ikke; forsendelsesmailen tav, når der intet
sporingsnummer var; to FAQ-svar manglede (koster det noget at se, får jeg filen); størrelses-FAQ'en sagde
"sort ramme" om alle; handelsbetingelsernes juleløfte var strammere end forsidens; cookiebanneret sagde
"ingen andre" om cookies; HEIC-miniature på Android; ingen bekræftelse efter "Slet mit billede nu"; tre
ruter svarede 500 i stedet for 404 på et ugyldigt id; hårdkodede "30 dage" og "under et minut" i to mails.

Ikke kørt, og hvorfor: download af den færdige fil kræver en godkendt ordre, og der findes ingen i
databasen (ingen Stripe-nøgler, ingen OpenAI-credits); ruten er typetjekket og afvisningsstien er kørt.

## Konverteringspas, 5. september 2026

Forsidens rækkefølge, hero-copy, størrelsessammenligning, bestillingssidens trin (1–4, regning efter
sidste valg, tillid ved knappen), upsell-copy og FAQ-orden. Kørt mod en produktionsbygning på 3111.

| Kontrol | Resultat |
|---|---|
| `npm run typecheck` · `npm test` | rent · 8/8 |
| `npm run test:order` | 9/9 – trin 1–4 ændrer ingen priser, ekstra er stadig opt-in |
| `npm run test:viewport` | 12/12 – den faste knap "Se hvad dit billede kan blive til" fylder præcis 350 px ved 390 |
| Konsolfejl på forside, ark, bestilling, /tak, 404, handelsbetingelser | ingen |
| Sektionsrækkefølge i den byggede forside | hero → Det kunne være jeres → Tæt på → Sådan fungerer det → Det får du → pris → gaven → spørgsmål → afslutning |

Første forsøg på flytningen klippede eksempel-sektionen midt over (for kort søgemønster) og gav 1.226 px
vandret overløb ved 390 – fanget af `test:viewport`, rettet, kørt igen.

