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
- **Christmas window.** `CHRISTMAS_START_DATE` (default 1 Nov) added; before it the site says "inden 5 hverdage" (owner's number, `DELIVERY_DAYS_MAX`), not "under juletræet".
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

## Third pass (premium presentation, richer comparisons)

- **More originals.** Four Library of Congress tintypes (1860s–1880s, public domain, LOC "no known restrictions") were pulled from the master TIFFs through the same pipeline: a mother with two children, a boy beside a chair, a three-person group, a woman in a hat on a corroded plate. They add children, groups, ovals/arches and sepia to the set. Still placeholders until the owner's family photos arrive (HANDOFF §1).
- **Four ways to compare, one per example.** Wipe (hero and one example), lens (the damaged original in a round window under the finger), hold (press to see the original, 220 ms crossfade), fade (slow dissolve every 4 s, paused off-screen and while touched; behaves like hold under reduced motion). The motion rule in ANTI_SLOP F4 is amended: comparison is the product's argument, so each example may carry its own comparison motion; nothing else on the page moves.
- **"Tæt på".** 2× detail crops (before | after) around a point named in each sidecar (`detail: x,y`, `detailLabel:`). Faces, freckles, buttons, handwriting: where a customer judges quality. Exported at 700 px by `scripts/export-examples.ts`.
- **Colour example.** One example carries the pipeline's colourised version behind the same "Vis i farver" toggle the customer gets (`colour: yes` in the sidecar).
- **"Det får du".** The framed mockup at full column width and a gallery-label list (print, ramme, fil, hænder, godkendelse, fragt, garanti) plus the photographer comparison from the brief (145–600 kr. for restoration alone). Claims stay within what the manual CEWE fulfilment delivers: matte photo paper, black frame with mount, high-resolution file, hand adjustment, approval, free shipping, money back.
- **Premium details.** Photographs in the examples grid carry a hairline outline like mounted prints; the preview page repeats the product label under the offer paragraph so the price is justified at the decision point.

## Fourth pass (Nordic examples, two conversion attacks)

- **Nordic faces.** The owner asked for the example set to look like the audience's own albums. Eight Europeana pairs (Domkirkeodden, Museene i Nord-Østerdalen, Grenna Museum; CC BY / public domain, credited in the caption) replaced the American studio portraits in the visible grid; all eight pass the quality gate (QUALITY_REPORT.md, set 3). The Library of Congress tintypes stay in `examples.json` after the first seven and are not rendered on the landing page.
- **Hero = Gunhild og Ole Christian, 1935.** A landscape snapshot of a Nordic mother hugging her child: the photograph the headline talks about ("Mors gamle billede"), and landscape means 4:3 on a phone, which is what lets the first screen at 390×664 (Safari with its chrome) hold the headline, the lead, the price line and the button (CTA bottom 644 px, measured). The cracked 1916 soldier portrait, the most dramatic damage demo, opens the examples grid instead.
- **Conversion attack, two rounds.** An adversarial CRO agent walked the live site on an iPhone profile (390×844 and 390×664) and desktop, ran a real restoration, and wrote `work/attack-1/report.md`; every HIGH and MEDIUM finding was fixed, then a second agent verified the fixes and hunted again (`work/attack-2/report.md`, summary in QA.md). What changed, in the order the customer meets it:
  - Slider knob bug: `.ba .handle` had `width: 0`, so the percentage translate moved nothing; the knob sat at 0 % on every slider on the site. Handle is now full-width and the knob sits on the seam. Reveal settles at 35 % instead of 62 %.
  - Headline rewritten for a cold visitor: "Mors gamle billede. Skarpt igen, i ramme, hjemme hos dig." Lead names the mechanism; the price line under the button says it costs nothing to look ("gratis" stays banned).
  - The first name is used only once the person is on the page (portrait + why lines in founder.md); until then the copy says "vi" (`fornavn()`). The full name stays in the footer and the legal pages.
  - Product label: "Det får du for 599 kr.", a "Levering" row, "Manuelt tjek" instead of "Hænder"; the photographer comparison (145–600 kr.) dropped, because the low number anchored the reader downward and could not be sourced.
  - Price block on a phone: price → note → phone → line → button, and "Det koster ikke noget at se. Du bestiller først, når du har set resultatet."
  - Sheet: "Det koster ikke noget at se …" under the buttons and under "Vis mig resultatet", a quality-check line under the thumbnail, the privacy note links to /privatliv, and "Jeg har ikke billedet lige nu" collects an e-mail and mails a link to the site (`/api/lead` with `kind: 'nophoto'`; the order is a MANUAL_REVIEW row with note "link requested, no photo yet").
  - The wait: the request-in-flight stage is labelled "Restaurerer" with the 28 s creeping bar (the model call is what takes the time; "Sender billedet" with a frozen bar read as a stalled upload). After 45 s: "Det tager lidt længere i dag – billedet er stadig i gang." Cancel says "Afbryd (billedet slettes)".
  - Preview page: the share token is created with the order and rides in the URL the app navigates to (`/p/<id>?t=…`) and in every image URL, so the address bar itself is shareable; a URL without token gives a Danish 404 that explains why. One line under the slider says what the preview is and what happens next; the money answer ("Pengene tilbage … Du betaler 599 kr. nu. Indtil du har godkendt …") sits in the content on a phone and under the button on desktop; the fixed bar carries "MobilePay, Apple Pay eller kort · Ingen oprettelse" and the order button; a failed checkout renders a visible alert in the bar with the phone number and "Dit preview er gemt" (never a server string). Colour version is preloaded before the toggle enables. Landscape photographs are labelled "40×30 cm (liggende)".
  - Watermark: one row of small text along the bottom edge plus a corner mark, not a diagonal tile across the face.
  - /tak unverified: links back to the customer's preview (newest order for the session cookie) and shows the phone; "i dag" became "inden 24 timer" on /tak and in the order mail.
  - Consent banner stacks above the sticky CTA / order bar (`--bar-h` set by `body.sticky-on` and `body.has-pv-bar`).
  - FAQ: "Hvad er forskellen på det her og en app?", a new "Virker det også på farvebilleder fra 70'erne og 80'erne?", and the refund answer now states when you pay.
- **Round 2 (verification + new leaks).** The second agent's real run hit the 45 s server limit, so the timeout is now 90 s (route `maxDuration` 120 — on Vercel Hobby the function limit is 60 s, so use Pro or another host, HANDOFF §6), the bar creeps for 60 s, and a timeout is a retry state with the file kept, never "your photo needs hands". The hero now settles at 50 % so the seam runs between the child (before) and the mother (after); "Tæt på" opens with the cracked soldier pair; the hero caption says "arkivfoto" out loud. The consent banner appears after the first scroll and never over the sheet. The save route accepts the share token. Desktop preview puts the order button at the top of the right column.
- **Kept against the attack's advice.** One gesture for all examples: the owner explicitly asked for several comparison forms, so the four forms stay. "Gratis": banned by the brief. Testimonials, scarcity, urgency: still refused.

## Fifth pass (better before/after, Apple principles)

- **The hero must show damage a phone can see.** The Nordic museum scans are clean (soft, hazy, a few spots); at 390 px their before/after reads as a filter. The cracked, burnt 1916 print is the only pair whose damage is unmistakable at a glance, so it is the hero again — cropped 4:3 with `object-position: 50% 16%` so the faces stay in the crop and the phone's first screen keeps the offer and the button — resting at 30 % so both faces sit on the restored side. The Nordic pairs fill the grid (olesen with its spots under the lens, Gunhild as a wipe). No damage was added to any photograph: the honest fix for "more convincing" is choosing originals that are actually damaged; more of those arrive with the owner's customer photos (HANDOFF §1).
- **The slider is now a physical object.** Rebuilt after apple-design §1–§10: one critically damped spring re-targeted from the live value for every input (reveal, tap, drag release, label, keyboard), grab offset respected, 1:1 tracking, velocity handoff, momentum projection (d = 0.99), rubber-banding at the edges, feedback on pointer-down, reduced-motion path. The lens got the same treatment in two independent springs. Per-frame work writes CSS custom properties on the node; React state mirrors the settled value only.
- **Labels became controls.** "Før"/"Efter" are buttons that show the whole side (agency: one tap to see the entire restored image), both always present.
- **Verified in the browser** (`work/attack-1-fix/physics.mjs`): reveal 88 → 30 settles in ~1.4 s; a 100 px knob drag lands exactly where the finger is; a flick from 40 % lands at 17 %; a tap at 80 % brings the seam to 80 %; 60 px past the edge shows the knob at 104.7 % with the seam clamped at 100 %, springing back on release; label taps land at 100 / 0; keyboard steps; lens press at 20/70 springs to 20/70. No console errors.

## Sixth pass (Netlify, and a third attack on the whole system)

- **Netlify from GitHub is the host.** That fixes three numbers: 10 s (26 s on request) for a synchronous function, 60 s for a streamed one, 6 MB per request body. The NDJSON streaming upload could not survive them (a 40 s restoration and a 5 MB phone photo through one function), so the flow is now: the browser uploads straight into the private bucket with a one-time signed URL; a request only creates the order and starts a job; the job (restoration, colour, print final) runs in a Netlify Background Function with a 15 min limit; the sheet polls the order. In `next dev` and on any plain Node server the same job runs in-process (`JOB_RUNNER=inline`), so there is one code path and one UI. Retention runs as a scheduled function. `vercel.json` and the streaming route are gone.
- **What this changed for the customer.** Nothing visible on a good day: upload with real progress, "Restaurerer" with the creeping bar, then the preview page. On a bad day it is better: a failed job leaves the upload in the bucket, so "Prøv igen" re-runs the restoration without uploading again; "Afbryd (billedet slettes)" now really deletes (the cancel route drops the objects, or flags a running job to drop them when it finishes).
- **The customer's "before" is a 1600 px display copy**; the raw upload stays for the print final and is deleted with the order.
- **Attack 3 (the money path and the operations behind it, `work/attack-3/report.md`).** Fixed: HEIC accepted by the bucket and sniffed server-side (iPhones from the camera roll could not upload at all); Godkend now redirects to a confirmation, is atomic, and a change request has its own page, its own mail and a new token per approval version (an old mail can no longer approve a newer picture); the owner gets one mail per event that needs a human (payment, lead, manual review, change request, approval, failed final, double payment, a customer waiting 10 days); payments are reconciled with Stripe hourly and from admin, a stale Checkout session is expired before a new one is made, the PAID transition is atomic, a second payment is refunded automatically, the cancel URL carries the share token; Meta gets Purchase and InitiateCheckout from the server (CAPI) with matching event ids and advanced matching, the pixel boots on every page, pre-consent events are replayed, the preview page fires ViewContent and shows the consent banner; the order confirmation is a real ordrebekræftelse (amount, address, terms, refund line, mockup); approval mail has the buttons above the picture and a second reminder at 7 days; admin has a "Til handling" list, next-step lines, a Stripe check, and a signed-URL final upload (function bodies are capped at 6 MB); the landing page is static (ISR hourly) and the request path no longer loads sharp/OpenAI; jobs cannot get stuck (queued > 60 s / running > 5 min are retried, failed enqueues are recorded, the sheet gives up at 150 s with "Prøv igen"); housekeeping runs hourly in the background function (deletion, auto-complete 14 days after shipping, reminders, reconciliation); robots/sitemap/noindex; privacy text matches the code (gf_utm, Netlify EU, CAPI).

## Seventh pass (the Christmas gift)

- **The buyer is giving a gift.** The page now sells the gift, not the restoration: an eyebrow with the season and the last order date, "i smug, hvis det er en gave" in the lead, a "Den julegave, de ikke selv kan købe" section (photograph it secretly, write a greeting, send it directly or home, under the tree on time), the deadline and a day countdown in the price block, a closing line "Julegaven er klaret i aften", and three gift questions in the FAQ. Everything is date-gated on the Christmas window (`CHRISTMAS_START_DATE`, default 1 Oct); outside it the gift angle stays without dates.
- **The greeting is real, not copy.** Stripe Checkout has an optional 200-character field; the text lands on the order, in the owner mail, the ordrebekræftelse, the admin page and the print checklist. A promise on the page must be a thing the owner does.
- **No MobilePay until it exists.** The payment line reads "Apple Pay, Google Pay eller kort" until `STRIPE_MOBILEPAY_ENABLED=true`; the same flag already controls Checkout.
- **The first screen still holds the button** at 390×664 (CTA bottom 652 px): the archive credit moved into the photograph on phones so the eyebrow could take its row.

## Eighth pass (no phone number, three sizes, the lens, and Christmas back in its box)

- **No telephone number anywhere.** The owner does not want to sell over the phone, so the number is gone from
  `founder.md` upward: there is no `phone` field to render. Every place that used to end in "ring til os" now ends in a
  mailto link — the checkout error ("skriv til os, så sender vi et betalingslink"), the 404, `/tak` when a payment could
  not be verified on the spot, both approval pages, the footer, the order mail, the reminder mail and the owner's
  10-day nudge. `MailLine` renders those sentences with the address as a real link, because in-app browsers auto-link
  nothing. The legal pages name the trader with name, CVR, address and e-mail; e-mail is the contact channel Danish
  distance-selling rules require us to publish, and we publish the one we actually answer. Stripe still collects the
  *customer's* phone: that is for the carrier's delivery SMS, not for us to call.
- **Three sizes, chosen after the customer has seen the restoration.** 30×40 cm 599 kr., 40×50 cm 799 kr., 50×70 cm
  999 kr. (20×30 stays disabled: a 449 kr. anchor under the price the ads quote costs more than it adds). The landing
  page quotes "fra 599 kr." and lists the three as a price list, not a card. The choice itself lives on `/p/[id]`, under
  the wall mockup, where the customer has already seen what they are buying — three real radio inputs, so keyboard and
  VoiceOver get the semantics for free. Picking a size swaps the mockup, the price on the button, the spec list and the
  refund line at once.
- **A mockup per size, rendered up front.** `processRestore` composes one wall mockup for every size on sale (sharp, no
  model) and stores the paths in `preview_meta.mockups`; the preview page preloads all three, so switching size is
  instant and the frame really has that size's proportions. `?f=40x50` on the image route serves them.
- **The price is never taken from the browser.** The page sends a size; `/api/checkout` looks the amount up in
  `PRICING` for a size that is actually on sale (`sellableFormat`) and writes both onto the order before Stripe sees it.
- **The lens is fixed.** Two real bugs: the container is `touch-action: pan-y`, so on a phone every vertical drag was
  handed to the page scroller and the gesture died; and a press outside the ring could stall, because the catch-up
  branch wrote a new target without restarting the spring. Now the ring is the handle — its own element with
  `touch-action: none`, hit-tested as a circle, owning the pointer for the whole drag in both axes — a tap anywhere else
  springs the lens to that point, and a swipe on the photograph still scrolls the page. The centre is clamped by the
  radius, so the circle can never hang half outside the frame. Verified on an iPhone 13 profile
  (`work/lens-test.mjs`): drag lands where the finger is, tap lands at the tap, the circle stays inside on all four edges.
- **Christmas is a layer, not the site.** The headline, the lead, the product and the promise are the same in July and
  in December. The season only adds an eyebrow with the last order date, the deadline line with a day countdown, the
  delivery answer in the FAQ and the closing line. The window starts 14 November (`CHRISTMAS_START_DATE`), not 1 October.

## Ninth pass (the shop: add-ons, the second copy, and a bill that adds up under the finger)

- **One quote, two places.** `quote()` in `lib/pricing.ts` is a pure function from a configuration
  (size, frame, extra copies, repeat) to lines and a total. The browser runs it to draw the bill under the
  customer's finger; `/api/checkout` runs it again from the same file before Stripe sees anything. The page
  therefore never sends a price, only a choice — hostile input (`format: 'hack'`, `extraPrints: 99`) falls back to
  the default size and clamps at three copies (`work/pass9/repeat-guard.mts`).
- **Add-ons that the owner can actually deliver.** A frame choice (sort or eg, same price — a choice, not an
  upsell), and *ekstra eksemplar af samme billede* (349 / 449 / 549 kr. by size, up to three). The extra copy is the
  honest one: the restoration is already paid for, so only the print, the frame and the parcel repeat, and it goes in
  the same box. Nothing is pre-ticked — the add is a button, never a checkbox someone has to find and clear.
- **The frame is visible, not a word.** `processRestore` renders a wall mockup for every size *and* frame
  (six sharp composites, no model), the preview page preloads them all, and picking a frame crossfades the wall.
  A choice you can see is a choice people make.
- **The second photograph is a post-purchase offer, not a cart.** Carts, bundled fulfilment and multi-item approval
  would be a week of risk for an order that is one picture 95 % of the time. Instead the receipt (on /tak and in the
  ordrebekræftelse) carries a link with the order's own share token: `/?igen=<id>.<token>`. It starts a completely
  ordinary new order that remembers where it came from, and that memory — validated server-side against a real, paid
  order — is the only thing that unlocks the 100 kr. repeat price. One order, one approval, one shipment, and an
  upsell at the moment people are most likely to say yes.
- **The preview page became a product page.** Where you are (three steps), the object on the wall, the three
  decisions, and *Din bestilling*: hairline rows, tabular figures, shipping named as included, and a total that counts
  to its new value over 380 ms instead of jumping (reduced motion sets it straight). The order button carries the same
  total, so the number under the thumb and the number on the card are never two different numbers.
- **Risk reversal moved next to the price.** Three lines under the big 599: you see it first, you approve before we
  print, you get the money back. That is where the doubt is, so that is where the answer belongs.
- **No dark patterns.** No fake stock, no countdown that is not a real delivery deadline, no pre-selected add-ons, no
  invented "mest valgt" badge — the size hints are opinions ("Det store, man ser fra døren"), which is what they are.

## Tenth pass (the audit, and everything code could fix)

- **Payment methods belong to Stripe, not to us.** The Checkout session no longer sends a
  `payment_method_types` list, so Stripe offers whatever the account has enabled and the browser can
  show — cards, and Apple Pay or Google Pay where the device supports them. The `STRIPE_MOBILEPAY_ENABLED`
  flag, its config helper, its copy branch and its documentation are gone: one fewer thing that has to be
  true in two places at once.
- **The quote is frozen onto the order at checkout.** Receipts were rebuilt from *today's* PRICING against
  a *frozen* amount, so any future price change would make every old receipt contradict its own total.
  `preview_meta.quote` now holds the lines the customer agreed to, and `/tak`, both mails and admin read
  that snapshot.
- **Stripe line items are asserted.** The repeat discount comes off the first line's *amount* and the unit
  price is derived from it, so a line with a quantity above 1 can no longer multiply the discount, and the
  session is refused outright if the items do not add up to the quoted total.
- **The repeat link is capped at three redemptions.** A receipt can be forwarded; without a cap a leaked
  link is a permanent public 100-kr. coupon.
- **A wrong amount in a mail is worse than no amount:** the `?? 59900` fallbacks are gone from the
  confirmation, the refund notice, the owner mail and the CAPI payload.
- **Admin's format change keeps the money honest:** an unpaid order is re-quoted, a paid one keeps what was
  charged and gets a note saying why the two differ.
- **`CONFIG.siteUrl` falls back to Netlify's own `URL`/`DEPLOY_PRIME_URL`**, so a forgotten
  `NEXT_PUBLIC_SITE_URL` cannot put localhost into a customer's inbox or a Stripe redirect.
- **"Se tæt på".** Restoration is judged in the eyes, and a whole-frame slider can hide the work on a
  photograph whose damage is subtle. One button scales both sides 2.2× from the same origin, so the
  comparison stays honest; the caption says what to look at.
- **The image controls share one row**, the save-your-preview form collapsed behind a summary (it was an
  alternative to buying, sitting between the button and the footer), and the bill sits above the extra-copy
  offer so the last number before the total is the total.
- **Smaller by measurement:** the customer's "before" is 1200 px q78 instead of 1400 px q82, the wall
  mockups are 1040 px instead of 1200 px, and the five combinations nobody is looking at yet are preloaded
  on an idle callback instead of at mount.
- **Nothing under 13 px on the product page**, every tappable thing at least 44 px tall, the consent banner
  appears after six seconds for a visitor who never scrolls, and `/p/[id]` carries a canonical.
- **The example set gets a colour half — sourced, not invented.** Every one of the seventeen examples is a
  black-and-white archive photograph from 1850–1935, so a visitor holding a yellowed 1970s snapshot sees no
  evidence that we can do *her* photograph. Seven U.S. Farm Security Administration colour transparencies
  from 1940–42 are now committed under `assets/examples-source/`: real families, real Kodachrome fading,
  public domain, and — since the buyer's own eye is the argument — mostly the same kind of faces the ads
  will be shown to. The alternative, generating a plausible "before" with the image model and calling it a
  damaged family photo, was refused: an invented before is a fake result, whatever the after looks like.
  The restoration itself has not run — the OpenAI account is out of credit (HANDOFF item A0) — so the
  originals, the sidecars and a one-command rebuild are committed and `examples.json` is untouched.
- **The example set was a museum; it is now a drawer.** Seven of the seventeen examples were objects no
  customer owns: a glass negative with "088" inked on it, two press negatives with the subject's name
  written across the sky, an 1850 daguerreotype, and four tintypes in gilt oval mats. Two more carried the
  lending museum's accession number (`MINØ.27719`, `MINØ.25058`) printed into the frame. A visitor holding a
  creased 10×15 from an album learns nothing from a catalogue entry — worse, she reads the whole page as
  "restoration of antiques", which is not what she came for. The seven are retired (`consent: no` plus a
  `retired:` line saying why, so the decision survives the next export), the two accession numbers are
  cropped off, and the hero is now Gunhild and her son: a snapshot, on a porch, in 1935.
- **A found photograph has no date, and we do not invent one.** The vernacular prints carry
  `årstal ukendt` where the archive photographs carry a year; the caption parser accepts it rather than
  forcing a plausible-looking decade into the line.
- **The examples are ordered by what the pair proves, not by age.** Every restoration that exists was put
  side by side and judged on one question: is the repair unmistakable at a glance? Soldat og ung kvinde
  leads — the emulsion has rotted black down one edge of the print, and the "efter" is a clean photograph
  of two people — because that is the only pair where a cold visitor understands the offer without reading
  a word. Three pairs whose difference is real but subtle (Pauline og Ingeborg, Lars og Marit, Bryllup
  1916) sit at the end, where the page never renders them; they stay exported as cover if a better pair
  has to be pulled.
- **Portrait cards first in the swipe row.** `.swipe` is a flex row, so one landscape card among portraits
  left a column of dead paper under it. The row now aligns to the top and the landscape pairs sit mid-row
  and last, where a taller neighbour is always beside them.
- **Two more archive edges cropped:** the handwriting on Anna Cooper's plate margin, and the museum
  accession numbers. What is left is the photograph.
- **The upsell stopped explaining its own price.** "Restaureringen er lavet én gang, et eksemplar mere
  er kun billedet, rammen og forsendelsen" answered a question nobody asked and planted a worse one:
  *hvorfor koster det første så meget?* The offer is now one line — same picture, same size, same parcel —
  and the button carries the number.
- **The guarantee stands once, under the button.** The bill repeated the refund three centimetres above
  the CTA that repeats it again; it now states the payment fact instead (`Vi printer først, når du har set
  det færdige billede og sagt ja`), and "Pengene tilbage, hvis det ikke ligner" is the last thing read
  before the tap.
- **Colourisation is a choice, not a correction.** The old line ("De fleste vælger sort-hvid: det er
  sådan, billedet blev taget") told the customer which answer was right about their own family photograph.
- **A production build refuses to publish `[Udfyld: CVR]`.** The seller's identity on the two legal pages
  falls back to a placeholder when `assets/founder/founder.md` is unfinished — right for the owner, worst
  possible for a customer checking whether we are a real company. `next.config.ts` now fails a Netlify
  production build that would ship one, names the missing fields, and offers `LEGAL_DRAFT=true` for a
  deliberate draft. It invents nothing.
- **The default order is now asserted, not assumed.** `npm test` (node:test, no new dependency) proves the
  untouched order is 30×40 / sort / 0 ekstra / 599 kr. from three directions: the pricing module, the
  add-on shape a freshly created order actually has, and the arithmetic Stripe is handed across all 48
  combinations. It also proves that nothing a client can send — `null`, `''`, `'abc'`, `NaN`, `-1`, `0.4`,
  a missing key — turns an extra copy on. `npm run test:order` does the same in a real browser: it reads
  *every* price rendered anywhere on the page after each change, so a sticky bar that quietly keeps an old
  number cannot pass, and it asserts the extra-copy control is opt-in on load.
- **`npm run lint` is gone.** It ran `next lint`, which Next 16 removed; the repo has no ESLint installed
  or configured, so the script only ever produced "Invalid project directory provided, no such directory:
  lint". A command that always fails teaches everyone to ignore it.
- **A production build cannot ship `localhost` any more.** `/privatliv`, `/handelsbetingelser` and
  `/sitemap.xml` are prerendered, so the canonical tag, `og:url` and every sitemap entry are frozen at
  *build* time from `CONFIG.siteUrl`. The runtime `console.error` in `lib/config.ts` fires long after the
  wrong host is already inside the HTML — and a Meta ad pointing at a page whose `og:url` says localhost
  loses its share card. `next.config.ts` now fails the build instead. Verified both ways: without the
  variable the build stops; with it, the string `localhost` is gone from the prerendered pages and the
  sitemap reads `https://genfundet.dk/…`.
- **Families open the example row.** The visitor now meets a mother holding her baby, a family on a
  staircase and a family group before she meets anyone's solo portrait. The hero stays the 1916 couple:
  it is the pair whose damage is legible at a glance, and it is the only argument that works before a
  single word is read.
- **The deletion promise now matches what the code does.** Four short lines said the photograph is deleted
  after 30 days, flat. `/privatliv` has always been precise — 30 days for an upload without an order,
  90 days after delivery for one with — so the promise was wrong by two months for the only customer who
  pays. The lines now read the numbers from `CONFIG` and name the case: *bestiller du ikke, slettes
  billedet efter 30 dage*. It cannot drift from the retention job again.
- **The 100-kr. discount on a new photograph is gone.** A customer should have to hold two prices in
  their head, not three: another copy of the same picture is 349 kr., and a new picture costs what a
  picture costs. A conditional third price that only exists if you came through a particular link is
  where a surprise at checkout begins. The receipt link stays — it still records which order sent the
  next one, and it still saves the customer from starting over — it just no longer buys anything.
  `REPEAT_DISCOUNT_DKK`, the `repeat` flag on the quote, the discount line, its Stripe line-item note and
  four pieces of copy that advertised it are all removed, and a test now asserts that no quote can
  contain a negative line at all.
- **The digital file is delivered, not just promised.** The landing page, the Stripe line item, the terms
  and the consent sentence all said a high-resolution file was part of the price — and the terms tie the
  withdrawal right to the moment it is delivered — but nothing ever handed it to a customer; only admin
  could download it, for fifteen minutes at a time. `/godkend/<token>/fil` now redirects to a short
  signed download of the print final once the order is APPROVED or later, the approval page shows
  "Hent din fil i høj opløsning" the moment the customer has said yes, and the shipping mail carries the
  same link. The approval token is the key because it is the key the customer already holds. After the
  90-day retention the link says the file is gone, which is what the privacy page promises.
- **The two mail-sending endpoints have a ceiling.** "Send mig linket" (no photograph at hand) and
  "Gem dit preview" both mail whatever address they are given. A few per address and per browser a day
  is every legitimate use; beyond that the form still says "sent" and sends nothing, so nobody can turn
  our domain into a way of bothering a stranger. Counted in the database, not in memory, because a
  function instance remembers nothing.
- **`/founder.jpg` exists.** The landing page rendered `<img src="/founder.jpg">` the moment
  `founder.md` named a portrait, and no route served it — the one file the owner is told to add would
  have put a broken image on the front page. The route normalises the file (HEIC from a phone included)
  and fits it to 600 px.
- **What a page says about itself is true at 11 px, too.** The cookie banner said "Ingen andre" about
  cookies while the site sets three technical ones; it now says so. A HEIC picked on Android drew a
  broken-image icon at the top of the sheet (the browser cannot decode what it uploads perfectly well);
  the sheet shows the file name in a frame instead. "Slet mit billede nu" returned the customer to the
  front page without a word; it now says the deletion happened.
- **The proof moved up, and the page says why before it says how.** A cold visitor from a before/after
  ad used to meet the hero, the trust row, three steps and the gift story before the second before/after.
  The order is now hero → *Det kunne være jeres* (six pairs, swipe on a phone) → *Tæt på* → how it
  works → what you get → price → the gift → questions. The gift section lost its own button: four
  identical primary buttons down one page is not a hierarchy. Every remaining primary says the same
  thing, *Se hvad dit billede kan blive til*, because that is what the button does; the sticky bar
  carries the same words and fits 390 px exactly.
- **The hero states the outcome and the risk reversal in one breath.** *Du ser resultatet, før du
  køber* is true (the preview is free, the order comes after), so it now stands under the button and
  first in the trust row. The sub-line says what happens: a photo with the phone, ninety seconds, and
  a decision only afterwards.
- **The sizes are compared, not listed.** The landing page shows the same three boxes the order page
  uses, with the default marked *Standard* — the word for what it is, not *Mest populære*, which we have
  no sales to prove. The order page numbers its decisions 1 Størrelse · 2 Ramme · 3 Ekstra eksemplar ·
  4 Din bestilling, and the bill now comes *after* the last decision, with the three real promises
  (approve before print, money back, deleted if you do not order) directly above the button. Two
  paragraphs between the photograph and the wall mockup were cut; the second copy of the spec text went
  with them.
- **The second copy has a reason.** *Én til dig. Én til familien.* — the sister or parent who also
  remembers — then the price. Still a button, still opt-in, still 349 kr. at every size.
- **The FAQ is ordered by what stops a purchase.** Cost of looking, badly damaged or blurred (with the
  honest limit: sharpness that was never there cannot be invented), does it look artificial, can I
  cancel, delivery, what happens to my photo — before sizes, copies, the file, gifts and payment.
- **The headline belongs to everyone's photograph.** *Mors gamle billede* made the product sound like a
  gift for one person; *Jeres gamle billede* is the wedding, the parents when they were young, yourself
  as a child. The eyebrow says what the ad showed — *Dit gamle billede kan blive sådan her.* — and the
  gift moves to supporting content. The ninety seconds left the hero: nobody should meet a waiting
  time before the first tap; the sheet and the steps still say it, after the decision to look.
- **"Du ser resultatet, før du køber" is the sentence under the button**, set in ink, ahead of the
  price. It is Genfundet's structural advantage, and it is true.
- **The primary button is one variable.** `CTA_VARIANTS` in lib/copy.ts, chosen by
  `NEXT_PUBLIC_CTA_VARIANT` at build time and logged on `FlowOpened`, so two deploys can be compared
  in the events table. No experimentation framework; a redeploy is the test.
- **40×50 is marked *Anbefalet*, not *Mest populære*.** A recommendation is an opinion we hold; a
  popularity claim would be a statistic nobody has. The order still starts on 30×40 at 599 kr., so the
  landing page's *fra*-price is the price a customer meets, and `test:order` keeps asserting it.
- **The bill starts with the customer's own picture.** Size, frame and number of copies in one line
  next to the framed mockup, then the lines and the total — *this is exactly what I am buying*. The
  "Din bestilling er klar / du behøver ikke vælge noget" block is gone: a selected box says it.
- **Placeholders cannot reach a customer.** `missing()` prints the bracketed reminder only outside
  production, the legal pages drop an empty field instead of printing *[Udfyld …]*, and the build
  guard for name, CVR, address and e-mail is now unconditional — `LEGAL_DRAFT` only controls the
  *Udkast* stamp. On desktop the hero also shows the same photograph framed: old → restored → on the
  wall, in the first viewport.
- **The hero is five things, in order.** Transformation, headline, one sentence, the button, the risk
  reversal. The enumerating sentence went (the headline's *Jeres* already carries it), the trust row
  stopped repeating the line that stands under the button, and on a phone the framed state of the
  same photograph sits next to the one sentence at 96 px — so the first screen says old → restored →
  in a frame without a paragraph.
- **On the result page the only button-shaped thing is the order button.** *Se tæt på* and *Vis i
  farver* are text links now; they still work, they just no longer compete. Between *Her er dit
  billede.* and the decisions stands *Og sådan hænger det hos dig.* over the customer's own framed
  picture — the caption that used to repeat the frame's spec is gone; the rows below say it once.
- **Fewer repeats.** The price block no longer lists the other two sizes under the big price (the
  three boxes above already do), *Du bestiller først, når du har set resultatet* left the price block
  (the list beside it says the same), *Manuelt tjek* and *Godkendelse* are one row, and the second
  copy's reason is one line with the price on the button.
- **The button speaks in the first person.** *Se hvad mit billede kan blive til* is the default
  variant now: the order button already says *Bestil mit billede* and the sheet *Vis mig
  resultatet*, so the funnel has one voice from the first tap. A and B stay one env variable away.
- **Two words less about technology.** The FAQ said *hvis AI'en har ændret noget i et ansigt*; it says
  *restaureringen* now. The terms and the privacy page keep naming the model and the provider, because
  there it is a duty, not a pitch. And the line under the button says the whole risk reversal in one
  breath: *Du ser resultatet, før du køber – det koster ikke noget.*

