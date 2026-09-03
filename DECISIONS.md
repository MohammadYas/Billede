# DECISIONS

One line of reasoning per non-obvious decision. Newest at the bottom.

- **Branch.** Work was pushed to `claude/openai-gdpr-mobile-ntfhjo` (the session's designated branch), based on the existing skills branch, not directly to `main`: the owner merges after reading HANDOFF.md.
- **Skills.** `apple-skills` is installed as `apple-design`; `ui-ux-pro-max` and `impeccable` present. The impeccable "concept roll" ritual was skipped because the brief pins the direction (Nordic editorial); a pinned brief beats the roll per the skill's own rule.
- **Originals missing.** `assets/originals/` was empty. The spec says stop, the owner said "one shot". Compromise: the pipeline and quality gate were validated on six public-domain archive photographs (Wikimedia Commons / Library of Congress), clearly labelled as such in QUALITY_REPORT.md. The site's example slots read from `public/examples/examples.json`; the archive photos are exported there with honest provenance captions ("Arkivfoto, Library of Congress, ca. 1913") **as a placeholder that must be replaced with consented family photos before the Meta test** (HANDOFF.md, bold). No invented "Indsendt af Kirsten, Vejle" captions.
- **Founder data.** Name, phone and email read from the Stripe account via Composio; city, CVR, address, portrait and the three "why" lines are TODO in `assets/founder/founder.md`. The founder section and footer render what exists and hide what does not.
- **Image model.** `gpt-image-2` (verified live): keeps the input aspect ratio with `size: "auto"`, most faithful output. `gpt-image-1.5` accepts `input_fidelity` but snaps to 1536×1024 and reframes the photograph — rejected.
- **Preview quality = medium, final = high.** Measured: n=2 medium ≈ 33 s; high ≈ 85–100 s. The 45 s hard limit makes "high" impossible for the instant preview; the print final is regenerated at "high" from the admin (async, no time limit).
- **Colourisation is a second request.** Running it inside the preview call would push the total past 45 s. The client requests `/api/preview/[id]/colour` after the preview is shown; the "Vis i farver" toggle appears when it is ready.
- **Face check via vision JSON.** Instead of a separate face-detector dependency, the likeness prompt returns `face_count_a` / `face_count_b`. Same rule as the spec: mismatch, or faces lost, → manual review.
- **Print resolution.** The API returns ≈1475 px on the long edge for "auto" and accepts explicit sizes up to at least 1536×2048. The final is requested at the largest supported size and upscaled with lanczos3 to ≥2400 px (30×40 cm ≈ 150 dpi). Recorded in README as a known limit.
- **Rate limit.** The OpenAI org is limited to 5 input images/min on gpt-image-2 (observed 429). Runtime retries with the server's suggested wait; the quality runner is sequential. This caps live previews at ≈2/min — see HANDOFF.md.
- **Group photos.** The quality gate correctly flags a large group photo (120+ faces) as manual review: the model invented faces. The fallback copy covers this case.
- **Wall photo for the mockup.** No real wall photograph is available in the repo; `lib/restoration/mockup.ts` uses `public/mockup/wall.jpg` when present and otherwise renders a neutral warm-grey wall with a light falloff. The owner should shoot a plain wall (HANDOFF.md).
- **Supabase project.** `xsdgbjheochbneauhado` ("MohammadYas's Project", eu-west-1, created 2026-09-03 18:30 UTC) is the only project on the default Composio account and was created right before this session → used as the Genfundet project. Region is EU (Ireland).
- **Stripe.** Account `acct_1UBgmTJNJnc6lpkL` (genfundet.dk): country DK, currency DKK, charges and payouts enabled, statement descriptor GENFUNDET.DK. **MobilePay is not in the capability list** (card, Klarna, Link, Revolut Pay, etc. are). No products, prices or webhooks exist yet. Read-only via Composio; nothing was created through Composio.
- **Resend is not connected in Composio.** Email code uses the SDK behind `RESEND_API_KEY`; domain DNS status could not be checked — records listed in HANDOFF.md.
- **Fonts.** First pick Fraunces + Instrument Sans; impeccable's detector (`detect.mjs`) flags both as saturated. Switched to Newsreader + Public Sans, both on the brief's allowed list. Detector re-run clean.
- **Likeness prompt tuning (the one allowed round).** The judge penalised reconstruction of destroyed areas that the restoration brief explicitly allows (background, clothing, hair texture). One clarifying sentence aligned the two; faces, people, objects and text stay strict. Both runs are kept in QUALITY_REPORT.md.
- **Preview latency.** Measured 41.6 s end to end in journey A (hard limit 45 s, spec target 25 s). Kept `medium` quality for face fidelity; the in-sheet copy says "normalt 20–40 sekunder". Owner picks between `PREVIEW_IMAGE_QUALITY=low` (~18 s) and rewording the hero sub-line (QA.md).
- **CSP in development.** React dev mode needs `'unsafe-eval'`; it is added to `script-src` only when `NODE_ENV !== 'production'`.
- **Headless QA browser.** The sandbox's Chromium needed the HTTPS proxy to load signed Supabase images; the screenshot/journey scripts pass `HTTPS_PROXY` to Playwright when set. Production browsers are unaffected.
- **Preview images are same-origin.** Customer preview/original/colour/mockup are streamed through `/api/preview/[id]/image` (session-gated, private cache 15 min) instead of exposing Supabase signed URLs to the browser. Fewer third-party hosts in the customer's browser, one CSP source. Admin keeps 15-min signed URLs.

## Second pass (impeccable critique, dual-agent)

- **Critique method.** Assessment A (design review, isolated agent) and Assessment B (detector + browser + Lighthouse, isolated agent) ran in parallel per the impeccable playbook; reports in `work/critique-a/report.md` and `work/critique-b/report.md`, synthesis in QA.md.
- **Preview is a page, not a sheet.** `/p/<orderId>` (session-gated) replaces the preview state inside the bottom sheet. The buy button was below the fold of a 1 286 px sheet; a page gives the slider its own proportions, a sticky price bar on mobile, a two-column layout on desktop, survives an evening interruption and is where Stripe's cancel URL returns to.
- **The customer's photo is never cropped.** The payload carries the restored image's width/height; the slider uses the photo's own aspect with `object-fit: contain`.
- **Christmas window.** `CHRISTMAS_START_DATE` (default 1 Nov) added; before it the site says "inden 10 hverdage", not "under juletræet".
- **"20 sekunder" was factually wrong** (measured 38–42 s). Sub-line and step 2 now say "under et minut"; the processing state says "normalt 30–45 sekunder". The spec allows changing locked copy when it is wrong for the repo.
- **Steps show the object, not an icon and not the hero again.** Damaged print → restored screen → framed mockup, from the second example, 112/160 px.
- **Price as an object.** Newsreader 300 at 88–168 px, ink not green (green is for links), right-aligned on desktop opposite the offer line.
- **Founder section renders only when it is real** (portrait + at least one line). Contact stays in the footer.
- **Processing state keeps the photograph** at 45 % with the progress line on its bottom edge, a sentence per real stage, a creeping bar during restoration (28 s linear, honest about the wait), and "Afbryd". A dropped connection is a retry state, never the manual-review copy.
- **Sheet gestures.** Enter spring (critically damped, response 0.35 s) from the live transform; 10 px drag hysteresis; a downward drag dismisses only when content is scrolled to the top; horizontal intent and upward drags fall through to scrolling; `touch-action: pan-y`.
- **Desktop composition.** Hero photo left-set in a photo-book spread with the caption column at its bottom edge; every text section uses a 5/12 + 7/12 editorial grid with a sticky heading.
- **Captions.** Subject in ink, date in ink-2, archive credit moved to `title` and to one honest line under the examples ("Eksemplerne er arkivfotos …").
- **Performance.** Responsive `<picture>` sets (480/800/1400, WebP + JPEG) with `sizes`; metric-compatible fallback fonts (`size-adjust`, `ascent-override`) to remove swap CLS; the slider handle moves with `transform`.
- **Tap targets.** Inline links carry a `.tap` class (10 px vertical padding, negative margin) so every link is ≥ 44 px tall without changing the text rhythm.
- **Legal draft stamp** is shown unless `LEGAL_DRAFT=false`; the owner flips it after the lawyer's review.
