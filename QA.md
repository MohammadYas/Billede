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
  that the copy says "inden 10 hverdage" everywhere it matters. Honest and configurable.

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
