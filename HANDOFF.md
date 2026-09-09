# HANDOFF — what the owner must do before the 1.500 kr. test

Everything below was either impossible for the agent to do (needs your identity, your money, your DNS) or is
unverified. Items in **bold** block the test.

## 0. Launch checklist — everything that is still yours (in order)

Nothing in this list is code. The code is done and verified; each line below is a login, a form or a decision only you can make.

## Status 2026-09-08 (read this first)

- **Live:** https://billedearv.dk (Netlify site `billedarv`, builds from GitHub on every push to `billedarv-redesign`; `main` is kept identical by fast-forward). Brand and domain are **Billedearv** with an e — the owner bought billedearv.dk; billedarv.dk does not exist.
- **Done and verified:** landing (offer dialog, fading before/after with tap and hold, scaled size cards, examples as prints), upload sheet (readable progress, order survives a closed tab, resume banner on the front page), order page (brand watermark on preview and mockups, mockups to scale with a sideboard as ruler, one extra-copy question before Checkout, bottom bar after the picture is seen), Stripe Checkout (live key, no greeting field), admin (thumbnails, Kilder/UTM table, redraw derived pictures, inbox with replies), contact form at /kontakt, SEO surfaces, Supabase pg_cron housekeeping, security hardening (RLS, IP caps, HSTS, signed webhooks).
- **Tests:** `npm test` (36 unit), `npm run build`, `BASE=http://localhost:3000 node tests/viewport.browser.mjs`, and the whole customer path with one real restoration: `BASE=http://localhost:3000 ADMIN_PASSWORD=… node tests/e2e-flow.browser.mjs` (`PREVIEW_URL=…` reruns from an existing preview).
- **Mail is live (2026-09-08):** billedearv.dk is Verified in Resend (DKIM, SPF on `send`, receiving MX on `@`), the key in the env is Full access, the webhook `email.received` → /api/webhooks/resend has its secret in Netlify. Verified end to end: customer mails delivered, a mail to hej@ received, signed, fetched and filed in admin → Beskeder; the owner can answer there and start conversations ("Ny besked", or "Skriv til kunden" on an order). Every mail is signed Billedearv; the company and CVR only in the legal footer line. Lesson: the domain had first been added to Resend as "biiledearv.dk" — read the API's domain list, not the dashboard's spelling.
- **Stripe is done:** webhook at https://billedearv.dk/api/webhooks/stripe (checkout.session.*), descriptor BILLEDEARV.DK, prefix BILLEDEARV, website billedearv.dk — read back from the API.
- **Cron runs:** Supabase job `billedarv-housekeeping` (:30) answered 200 at 11:30 UTC after the domain switch (earlier runs failed on DNS); Netlify `retention` (:00) is deployed. Both do the same housekeeping.
- **Meta is wired, not switched on:** pixel + Conversions API + consent banner exist and are gated on consent; `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_TOKEN` (and optional `META_TEST_EVENT_CODE`, `META_DOMAIN_VERIFICATION` for the domain meta tag) are empty in Netlify. Set them, redeploy, test with Test Events, then run ads with `?utm_source=facebook&utm_medium=cpc&utm_campaign=…&utm_content=<ad>` on every link (admin → Kilder reads them).
- **Owner still has to (in this order):**
  1. Meta: Pixel ID, CAPI access token, domain-verification content → `.env.local` and Netlify → redeploy → Test Events.
  2. Street address in `assets/founder/founder.md`; lawyer reads /handelsbetingelser and /privatliv → `LEGAL_DRAFT=false` in Netlify.
  3. ~~Delete the two test orders~~ — done 2026-09-08 (`ecf3aaeb`, `6d8f65fc`: 45 storage objects, events and rows each, removed by a scoped script; 17 orders remain, all QA except `17b47d56`, which is PAID, 599 kr., the owner's own mail, 2026-09-08 11:07 — the test purchase from item 5 appears to be made; refund it from admin).
  4. Google Search Console: property billedearv.dk (the Google CNAME is already in DNS) → submit https://billedearv.dk/sitemap.xml.
  5. One real 599 kr. test purchase on the phone, then refund it from admin ("Refunderet" refunds in Stripe and mails the customer).
- **Meta Ads Manager, built 2026-09-10 by Claude in Chrome, nothing published:** ad account Billedearv `2034135650633821` (DKK, Europe/Copenhagen), pixel `1430023292388175` (shared with the account, no data yet), custom conversion PreviewShown (URL rule until the event has been seen), custom audience "Website-besøgende 30 dage", campaign `META_Sales_DK45-70_Lancering_2026-09` with set A (broad 45–65+, 150 kr./day, event View content until PreviewShown appears in the dropdown) and set B (retargeting, paused, 50 kr./day; the "Købere 180 dage" exclusion could not be made before Purchase has been seen), eight named ads with URL/UTM and Advantage+ off. **Done 2026-09-10 (Claude Code via the owner's Chrome):** all eight drafts now carry their images (4:5 for feeds as "Original", 9:16 for Stories/Reels, 1:1 uploaded to the library), primary text / headline / description / CTA "Læs mere", every Advantage+ enhancement off, multi-advertiser off; the Facebook page Billedearv exists and is the sender. Meta creates its file input only on click, so uploads go through a helper `<input type=file>` injected into the page plus a patched `HTMLInputElement.prototype.click` that hands the files to Meta's own input (see the session notes). **Still blocking publish:** error #1815199 — the page is linked to the Instagram account billedearv46, which the ad account is not authorised for: Business Settings → Instagram-konti → add billedearv46 → assign ad account Billedearv (or remove the link and run Facebook-only). Start date on both sets: 11 Sep 09:00 — move it if publishing later. `NEXT_PUBLIC_META_PIXEL_ID` set on Netlify 2026-09-10 (CAPI token and domain tag still missing). Owner's stop rule: 0 purchases after 1.500 kr. spend → pause; set the campaign spending limit to 1.500 kr. before publishing.
- **Meta ads are written, not launched:** `docs/meta-ads-prompt.md` is the prompt for Claude in Chrome (Fase 0 fundament → kampagne → annoncesæt → fire annoncer, alt pauset, stop før Udgiv), `docs/meta-ads-creatives.md` holds five structured scene prompts for gpt-image-2 / Gemini (the owner runs them by hand; Higgsfield credits are spent) that leave two flat black placeholders, and `node scripts/ads-composite.mjs <scene.png> <par>` finds them and drops the real before/after pair in (upper = after, lower = before), writing 4:5 and 1:1 to `work/ads/creatives/` (git-ignored). `scripts/ads-creatives.mjs` still renders the plain collages as fallback. **The five ads are the photographs themselves (2026-09-08):** `node scripts/ads-hero.mjs` renders, per example pair, `overlay-<par>-1080x1350` (the face large, half damaged / half restored down a seam with the site's slider knob, headline + button + price on the photo) and `hero-<par>-…` (same photo, text on a paper panel) in `work/ads/final/` (git-ignored — back it up). The Chrome prompt names the overlay files for 4:5 and the hero 1:1 files for square placements. The generated-scene pipeline (`ads-composite`, `ads-phone-screen`, `ads-render`) stays as secondary product-at-home creatives; the owner judged scene-first ads as selling nothing.
- **Landing page, conversion rounds 1+2 done (2026-09-08, owner's briefs):** hero = eyebrow "Se resultatet, før du køber" → H1 "Få det gamle familiebillede tilbage." → body with the free look and "i ramme fra 599 kr. inkl. fragt" → CTA "Se mit billede restaureret gratis" (`CTA_VARIANTS.C`; short form `PRIMARY_CTA_SHORT` in header/sticky) → trust line "Originalen bliver hjemme · Du godkender før print · Fra 599 kr. inkl. fragt". New sections: "Fra skuffen til væggen." (the same photograph as it is → restored → print → framed on the wall, plus "Det får du fra 599 kr.") right after the hero; "Det skal stadig ligne dem." with the real wipe slider on the hero's face close-up; callout "Du sender aldrig originalen." in the process. Offer copy is "2 indrammede eksemplarer fra 599 kr." everywhere (bar, dialog, promo). Refund wording only by the price, in the FAQ and on the order page — never in the hero. FAQ reordered and extended (original, price, when you pay, faces, approval, cracks, sharpness). JSON-LD `merchantReturnDays` 21 → 14 (the statutory window; 21 was the auto-refund). Verified: `npm test` 36/36, `npm run build`, `tests/viewport.browser.mjs` OK at 375–1280, no console errors. The owner's briefs and the verified facts: `docs/landing-brief-2026-09-08.md`.
- **Ads, creative-strategy reset (2026-09-08, owner's brief):** the brochure statics are gone. `scripts/ads/` = concept data (`concepts.mjs`: six buying motives + two UGC looks, funnel stage, hooks, CTA, price qualifier, visual, video shots), one template (`html.mjs`) for 4:5 / 1:1 / 9:16 / video shots, `static.mjs` → `work/ads/final/`, `reel.mjs` → `work/ads/video/` (9–10 s reels with real motion, one animated page rendered frame by frame: hook word by word → the old print lifts out of the scene → wipe → glides into a frame on the wall → CTA; the first still-based version was rejected as a slideshow). One idea per ad: hook, proof, CTA, "I ramme fra 599 kr.". `docs/meta-ads-prompt.md` Fase 3 = ad set A (cold: memory, gift, original, physical as video + still, ugc-memory, ugc-original as video) and ad set B (retargeting: trust, offer). Audit 2026-09-09 (owner approved): launch statics = memory, gift, reveal (the split with a cold hook; trust keeps the same split for retargeting), original, physical-h2; retargeting = offer, trust, physical-h2; UGC, h2 variants and the reels stay on the bench. `docs/meta-ads-prompt-paste.md` is the message for Claude in Chrome. Assets still missing for a stronger system: a real wedding print in a hand, a phone actually photographing a print, an unboxing/frame-reveal clip, a person hanging the frame. Old renders kept in `work/ads/final-old-brochure/` (git-ignored).
- **Never** run `netlify build` / `netlify deploy --build` on Windows (breaks sharp; `npm install` repairs). Always `npm run build` locally before pushing a change to a client component.

**Deployed 2026-09-07.** Netlify site `billedearv` (id 21e453f1-e0d5-4fd1-ba40-9d401c58977c, https://billedarv.netlify.app) builds branch `billedarv-redesign` on Linux. The repo is linked the manual way because the Netlify GitHub App is not installed on the account: a read-only deploy key on the GitHub repo ("Netlify billedearv") plus two GitHub webhooks (Netlify's generic hook and a build hook for the branch), so every push builds. All env vars are set from `.env.local` (`NEXT_PUBLIC_SITE_URL=https://billedearv.dk`, `JOB_RUNNER=netlify`). `netlify.toml` names `publish = ".next"` (the Next plugin refuses the repo root). **Before every push that touches a client component, run `npm run build` locally**: `next dev` tolerates a server-only import (node:fs via lib/copy → lib/founder) inside a client component, the production build does not, and Netlify only tells you afterwards. **Never run `netlify build` or `netlify deploy --build` on Windows**: the build command installs the Linux sharp binaries and breaks the local install (fix: `npm install`). First live restoration went through in 58 s (upload → background function → sharp → Supabase → PREVIEW_READY). Still to do in Netlify: add the domain billedearv.dk (A @ → 75.2.60.5, CNAME www → billedarv.netlify.app), and when the branch is merged, switch the production branch to `main` in Site configuration → Build & deploy and in the build hook.

**A. Before the first Netlify build**
-1. **Register billedearv.dk.** genfundet.dk was taken; billedearv.dk answered "No entries found" at DK Hostmaster on 2026-09-07 (reserve: skuffefoto.dk). Register it before anything else on this list: every URL, mail address and legal page already says billedearv.dk. Then rename the Stripe business name and statement descriptor (still the old name) and create the mailbox hej@billedearv.dk.
0. **OpenAI: put money on the account.** Checked 2026-09-04: the key in `.env.local` authenticates, but
   every call comes back `429 credit_balance_exhausted` — "You have no credits remaining." Nothing on the
   site works without it: the upload succeeds and then every single preview fails, which is the one failure
   that costs you the click you paid Meta for. Add credits at
   platform.openai.com → Settings → Billing, then run `npm run examples:colour` to confirm the pipeline
   answers. Budget: a preview is roughly 0,15–0,30 USD at `medium`, the print re-run about twice that, so
   1.000 previews is on the order of 300–500 USD — set a monthly limit above your ad budget, not below it.
1. Netlify → Import from GitHub → this repo, branch `main`. Build command and functions come from `netlify.toml`.
2. Netlify → Environment variables (copy names from `.env.example`): `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_DOMAIN`, `EMAIL_REPLY_TO`, `OWNER_EMAIL`, `NEXT_PUBLIC_META_PIXEL_ID`,
   `META_CAPI_TOKEN`, `ADMIN_PASSWORD` (long, random), `JOB_SECRET` (long, random), `CRON_SECRET`, `JOB_RUNNER=netlify`,
   `NEXT_PUBLIC_SITE_URL=https://billedearv.dk`, `DELIVERY_DAYS_MAX=10`, `LEGAL_DRAFT` (true until the lawyer has read),
   `NEXT_PUBLIC_CTA_VARIANT` (A, B or C — the wording of the primary button, see `.env.example`).
   The build refuses to run without `JOB_SECRET`, and without `city`, `cvr`, `address` and `email` in `founder.md` — `LEGAL_DRAFT` does not bypass that.
3. Netlify → Site configuration → Functions → Region: an EU region (Frankfurt/Ireland). Supabase is in Ireland.
4. Domain: billedearv.dk on Netlify, HTTPS on.

**B. Accounts and identity**
5. `assets/founder/founder.md`: `city`, `cvr`, `address`, three `why` lines, `portrait.jpg`. **A mailbox on the domain
   (hej@billedearv.dk) as `email`, `EMAIL_REPLY_TO` and `OWNER_EMAIL`** — a Gmail address next to 999 kr. is the trust
   leak this audience notices first, and since there is no phone number anywhere, that address is now the only way a
   customer can reach you. It is printed on the price block, in the footer, on the 404, on `/tak`, on both approval
   pages and in every mail. The site promises an answer within 24 hours, so the mailbox must be one you read daily.
5b. **Juridisk gennemgang af handelsbetingelserne.** ODR-henvisningen er fjernet på din instruks (portalen lukkede
   20. juli 2025); Center for Klageløsning står. Nyt i teksten: den automatiske refusion efter 21 dage uden
   godkendelse. Få hele siden læst igennem af en, der kender forbrugeraftaleloven, før den første rigtige kunde
   betaler. `LEGAL_DRAFT=true` holder udkastmærket på siden indtil da.
6. Stripe Dashboard: Public details → Terms of service URL `https://billedearv.dk/handelsbetingelser` and Privacy URL
   (Checkout refuses to open without the Terms URL); webhook on `https://billedearv.dk/api/webhooks/stripe` for
   `checkout.session.completed` + `checkout.session.async_payment_succeeded` → copy the signing secret to
   `STRIPE_WEBHOOK_SECRET` → "Send test event" → a 200 in Netlify → Functions log; live keys when you go live.
   Payment methods are chosen in the Stripe Dashboard, not in the code.
7. Resend: domain billedearv.dk verified (SPF, DKIM, DMARC `p=none`), `RESEND_API_KEY`.
8. Meta: domain verified in Business Manager; pixel id; Conversions API token (`META_CAPI_TOKEN`); Aggregated Event
   Measurement priorities Purchase > InitiateCheckout > PreviewShown (custom conversion) > ViewContent; first campaign
   optimised for the PreviewShown custom conversion, not Purchase.
9. Supabase: the HEIC bucket update is already applied; keep the project in Ireland; nothing else.
10. Print partner that ships **framed 30×40, 40×50 and 50×70, in black and in oak**, within 3–4 business days (the site
    promises "inden 10 hverdage" from the customer's approval) — or set `DELIVERY_DAYS_MAX` to what the partner can hold.
    Before the ads run, write down your cost for six combinations (three sizes × two frames) and for a second copy of the
    same picture, and check it against what the page charges:

    | | 30×40 | 40×50 | 50×70 |
    |---|---|---|---|
    | Billedet, i ramme | 599 kr. | 799 kr. | 999 kr. |
    | Ekstra eksemplar af samme billede | 349 kr. | 349 kr. | 349 kr. |

    Everything above includes frame, glass, mount, gift card, packaging and shipping. The extra copy has no restoration
    work in it, only the object — that is why it is cheaper, and why it must still carry the print, the frame and the
    parcel. A second *photograph* ordered from a receipt gets 100 kr. off (`REPEAT_DISCOUNT_DKK`). A size, a frame or a
    price that does not work is one line in `lib/pricing.ts` (`enabled: false`, or another number) and it changes
    everywhere: page, mockups, Stripe, mails, admin and the print checklist.
11. Lawyer reads `/privatliv` and `/handelsbetingelser`, then `LEGAL_DRAFT=false`.
12. `public/mockup/wall.jpg` (a photo of your own wall, optional) and, over time, consented customer before/afters to
    replace the archive examples (§1).

**C. After the first deploy, on a real iPhone**
13. Meta Sharing Debugger → re-scrape `https://billedearv.dk/` (link card with the before/after image).
14. One upload from "Vælg fra kamerarulle" (a HEIC) and one from "Tag et foto"; both must land on `/p/<id>?t=…`.
    Netlify → Functions → `job-background` → logs shows the run.
15. One test purchase in Stripe test mode from the Facebook in-app browser: `/tak`, the ordrebekræftelse, the owner mail,
    the order under "Til handling", the CAPI event in Meta Events Manager (test event code).
16. Send yourself a godkendelsesmail from admin and tap Godkend on the phone.

**D. Every day while the test runs**
17. Read the owner mails; open `/admin` once a day anyway. Reply to manual-review leads within 24 h, send finals within
    48 h, order prints the day of approval.

## 0b. The week before the ads (Meta live in seven days)

One order per day. Nothing here is code; every line is a login, a form or a decision. If a day slips, the ads slip —
do not start paid traffic before day 5 is green, because a broken checkout costs more than a week of waiting.

| Day | What must be true when the day ends |
| --- | --- |
| 1 | The site is on Netlify at billedearv.dk with HTTPS, every environment variable from §0 A2 set, functions in an EU region. Open the front page on your own phone. |
| 2 | hej@billedearv.dk exists and is on your phone; `founder.md` filled in (city, CVR, address, three lines, portrait); Resend domain verified; a test mail from `/admin` arrives and is not in spam. |
| 3 | Print partner confirmed for all three sizes with a price per size, and one test print of your own photo ordered so you have seen the paper, the frame and the packaging before a customer does. |
| 4 | Stripe live: Terms URL and Privacy URL filled in, webhook created and its secret in Netlify, one 1 kr. live purchase made and refunded by you. The lawyer has read the two legal pages, or you accept `LEGAL_DRAFT=true` while they read. |
| 5 | On a real iPhone, from the Facebook in-app browser: upload → preview → pick a size → pay → `/tak` → the order mail → the order in `/admin` → the approval mail → Godkend. Meta Events Manager shows ViewContent, InitiateCheckout and Purchase once each, not twice. |
| 6 | Ad account: domain verified, pixel connected, Aggregated Event Measurement priorities set (Purchase > InitiateCheckout > PreviewShown > ViewContent). Creatives cut from your own examples — the before/after pairs on the page, not stock. |
| 7 | Campaign live, small daily budget, optimised for the **PreviewShown** custom conversion until there are ~30 purchases a week. Owner mails on your phone with sound on. |

Three things about the copy in the ads:

- The price is **"fra 599 kr."** now. Three sizes are on sale (599 / 799 / 999 kr.), and the customer picks after the
  preview, so an ad that says "599 kr." flat will be read as the price of the big one by whoever buys the big one.
- Never write "gratis". The page says "det koster ikke noget at se", and the ad should say the same thing the same way.
- The Christmas layer only appears from **14 November** (`CHRISTMAS_START_DATE`). Ads before that must not promise
  delivery before Christmas, because the page they land on does not.

## 1. Replace the placeholder examples (blocks the test)

**`assets/originals/` was empty, so the site currently shows nine public-domain archive photographs
(Wikimedia Commons / Library of Congress, incl. four 1870s tintypes) restored by the pipeline, with honest provenance
captions and one line under the examples saying so.** They prove the pipeline and the design, but they are not Danish family photos
and the ad copy ("Det gamle billede af hendes forældre") deserves real ones.

1. Put at least 5 damaged family photographs you have written permission to use in `assets/originals/`,
   each with `<name>.md` (`year:`, `context:` one book-style line, `consent: yes|no`, optional `order:`).
2. `npm run quality:report` → open `QUALITY_REPORT.md`, look at `work/quality/<name>/restored.jpg`, fill in your own
   ratings. Gate: ≥70 % pass.
3. `npm run examples:export -- --source assets/originals` → replaces `public/examples/` (only `consent: yes`).
   The strongest example you can add is one the archives do not have: **a faded colour print from the 1970s–80s**
   (your parents' wedding, a birthday in the garden). That is the most common real case for Danish families and
   the site currently has no colour original at all.
   Sidecar extras per photo: `order:` (1 = hero), `mode: wipe|lens|hold|fade`, `detail: x,y` + `detailLabel:` for the
   "Tæt på" crop, `colour: yes` to expose the colourised version. Aim for variety: portraits, children, a group,
   a colour print from the 1970s, one really damaged one.
4. Commit. The hero is the first example by `order:`; pick the most dramatic pair.

Consent for showing a customer's photo as an example must be a separate, explicit, revocable yes (a mail), never a
checkout checkbox. The privacy page already says so.

## 2. Founder identity (blocks the test: legally required)

`assets/founder/founder.md` has your name and e-mail from your Stripe account. There is deliberately **no phone
field**: support runs on e-mail only, and no page can print a number. **Fill in `city`, `cvr`, `address`,
the three `why` lines and drop `portrait.jpg` in the folder.** Until then the site hides the empty fields and the
legal pages show "[Udfyld …]". Handelsbetingelser require name, CVR, address and an e-mail address (e-handelsloven §7); a telephone number is not
required when it is not offered as a contact channel, and we do not offer one.
The copy uses your first name ("Mohammad finjusterer …") only once `portrait.jpg` and the three `why` lines exist;
until then it says "vi", because a first name without a face reads as a persona (conversion attack #1, finding 2.2).
The trust row under the hero becomes "Dansk virksomhed, <by> · CVR <nr>" the moment `city` and `cvr` are filled.
Your Stripe account is `business_type: individual` — if you have no CVR yet, get one (virk.dk) before selling.

## 3. Stripe go-live (blocks the test)

Read via Composio on 2026-09-03 from account `acct_1UBgmTJNJnc6lpkL` (billedearv.dk): country DK, currency DKK,
charges and payouts enabled, statement descriptor BILLEDEARV.DK, payout schedule manual (7 days), no products,
no prices, no webhooks yet.

**Payment methods are Stripe's to choose.** The Checkout session no longer names a method list, so Stripe shows
whatever is enabled on the account and supported by the customer's browser — cards, and Apple Pay or Google Pay
where the device offers them. Turn methods on and off in Stripe Dashboard → Settings → Payment methods; nothing
in the code has to change. The page says "Apple Pay, Google Pay eller kort", which is what Checkout offers on a
phone.

Then, in order (§13 of the spec):
1. `STRIPE_SECRET_KEY` (live) and `NEXT_PUBLIC_SITE_URL=https://billedearv.dk` in the hosting env.
2. Register the webhook: `https://billedearv.dk/api/webhooks/stripe`, event `checkout.session.completed`
   (and `checkout.session.async_payment_succeeded`). Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Buy one 599 kr. order with your own card through the real site. Verify: `PAID` in Supabase (`orders`),
   the `Purchase` event in Meta Events Manager, the confirmation mail in your inbox. Then set the order to
   `REFUNDED` in `/admin` (refunds through the SDK) and verify `REFUNDED`. Record it in `QA.md` §Go-live.
4. Apple Pay / Google Pay ride on the card method in hosted Checkout; Apple Pay needs the domain registered under
   Settings → Payment methods → Apple Pay (Stripe does it automatically for Checkout on your domain).

Until then the code runs against Stripe test keys (`sk_test_…`, card 4242 4242 4242 4242). The agent had no test
keys, so journey A stops at "Stripe Checkout opens" — see QA.md.

### 3b. Before the first ad: three Stripe Dashboard settings (Checkout will not open without the first)
- **Public details → Terms of service URL** = `https://billedearv.dk/handelsbetingelser` (and the privacy URL). Checkout requires it because we ask for consent to the terms.
- **Webhook** on `https://billedearv.dk/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`; then "Send test event" and confirm a 200 in the Netlify function log. The hourly housekeeping job also asks Stripe about every open session from the last 7 days and marks paid orders (so a broken webhook cannot hide a payment), and admin has "Tjek betaling hos Stripe" on an order.
- **Customer receipts** in Stripe on, until you trust our own ordrebekræftelse.

## 4. E-mail (Resend) — DNS

Resend is not connected in Composio, so domain status could not be checked. Create the domain `billedearv.dk` in
Resend and add the records it shows (typically):

| Type | Name | Value |
|---|---|---|
| TXT | `resend._domainkey.billedearv.dk` | the DKIM key Resend shows |
| MX | `send.billedearv.dk` | `feedback-smtp.eu-west-1.amazonses.com` (priority 10) — use the **EU region** |
| TXT | `send.billedearv.dk` | `v=spf1 include:amazonses.com ~all` |
| TXT | `_dmarc.billedearv.dk` | `v=DMARC1; p=none; rua=mailto:<your mail>` |

Then `RESEND_API_KEY`, `EMAIL_DOMAIN=billedearv.dk`, `EMAIL_FROM_LOCAL=mohammad` (mails come from `mohammad@billedearv.dk`).
Send yourself a test order confirmation from `/admin` by completing a test purchase.

## 5. Meta Pixel and Conversions API

- `NEXT_PUBLIC_META_PIXEL_ID` loads the pixel after consent, on every page. Events: PageView, ViewContent (hero and preview), UploadStarted, UploadCompleted, PreviewShown, PreviewFallback (custom), InitiateCheckout, Purchase — all with the same product parameters. Events that happen before the visitor answers the banner are kept in the tab and replayed on "Ok".
- `META_CAPI_TOKEN` (Events Manager → Conversions API → Generate access token) sends **Purchase and InitiateCheckout from the server** too, with the same event ids as the browser (deduplicated) and hashed e-mail/phone/name/postcode + the click id. That is the copy Meta gets when the buyer paid in another browser (a wallet app-switch out of the Facebook browser) or never consented. `META_TEST_EVENT_CODE` shows them in the Test events tab while you check.
- In Business Manager: verify billedearv.dk, prioritise Purchase > InitiateCheckout > PreviewShown (custom conversion) > ViewContent for iOS, create the custom conversion on `PreviewShown`, and run the first campaign optimised for that (1.500 kr. will not produce enough purchases to leave learning).

Create the pixel in Events Manager, set `NEXT_PUBLIC_META_PIXEL_ID`. Events fired: PageView, ViewContent (hero ≥3 s),
UploadStarted, UploadCompleted, PreviewShown, PreviewFallback, InitiateCheckout, Purchase (value 599, DKK, once,
server-verified on `/tak`). Conversions API was **not** built (would have exceeded the 2 h budget); dedup `eventID`
is already passed on Purchase so CAPI can be added later without double counting.
Use `utm_content=<ad name>` in every ad link; the funnel view `v_funnel_daily` groups by it.

## 6. Hosting: Netlify from GitHub

Connect the repo to Netlify (Import from GitHub). Build command `npm run build`, no publish directory (the Next.js runtime
sets it). Nothing else to install: `netlify.toml` is in the repo and the two extra functions deploy with it.

**Why the app is shaped the way it is on Netlify.** A synchronous function may run 10 s (26 s on request), a streamed
one 60 s, and a request body may be at most 6 MB. The restoration takes 30–45 s and a phone photo is 3–12 MB, so:

- the browser uploads the photo **straight into the private Supabase bucket** with a one-time signed URL
  (`POST /api/preview/start` → PUT → `POST /api/preview/<id>/run`); no photo ever passes through a function;
- restoration, colour version and the print final run as **jobs in a Netlify Background Function**
  (`netlify/functions/job-background.ts`, 15 min limit); the sheet polls `GET /api/preview/<id>` every 1.5 s;
- housekeeping runs **hourly** as a scheduled function (`netlify/functions/retention.ts`) that hands the work to the background
  function: Stripe reconciliation of open Checkout sessions, deletion past retention, approval reminders (48 h, 7 d),
  owner nudge at 10 d, shipped → completed after 14 d. The same housekeeping is also triggered from the database:
  Supabase **pg_cron** job `billedarv-housekeeping` (project xsdgbjheochbneauhado) calls
  `GET https://billedearv.dk/api/cron/retention` at :30 every hour with `Authorization: Bearer <Vault secret
  billedarv_cron_secret>`; the app's `CRON_SECRET` must equal that Vault value (it does in `.env.local` — copy it to
  Netlify). Two triggers an hour, both idempotent; if you ever drop Netlify's scheduled function the database one
  keeps the shop tidy. Set up 2026-09-07 via SQL (`create extension pg_cron`, `pg_net`, `vault.create_secret`,
  `cron.schedule`); inspect with `select * from cron.job` and `select * from cron.job_run_details order by start_time desc limit 20`;
- job state is on the order (`preview_meta.job`) and visible in admin.
- the customer can leave during the wait: the sheet keeps the order on dismiss (only "Afbryd" deletes) and stores {id, token} in localStorage; `components/ResumeBanner.tsx` on the front page shows "vi arbejder stadig" / "Dit billede er klar" for 48 h. The order page asks once about an extra copy before Checkout (`upsell` in PreviewPanel).
- wall mockups are drawn to scale on `public/mockup/wall.jpg` (sideboard = 120 cm); after changing the wall or `lib/restoration/mockup.ts`, run `npx tsx scripts/remockup-examples.mts` to redraw the example mockups.
- end-to-end check of the whole customer path (one real restoration, stops on the Stripe page): `BASE=http://localhost:3000 ADMIN_PASSWORD=… node tests/e2e-flow.browser.mjs`; add `PREVIEW_URL=<an existing /p/<id>?t=…>` to rerun without restoring again.
- the inbox (admin → Beskeder): mail to hej@ comes in through Resend receiving (MX on the root domain → Resend; webhook `email.received` → `/api/webhooks/resend`, signature checked, mail fetched with a full-access `RESEND_API_KEY` and filed in `messages`); the contact form (`/kontakt` → `/api/contact`) files there too; answers go out from hej@ with In-Reply-To. The owner still gets one mail per incoming message. Migration `supabase/migrations/0004_messages.sql`.
- abuse caps: one network (salted IP hash in `preview_meta.client`) may start 10 restorations and 5 leads per hour (`lib/api/client.ts`); raise `ORDERS_PER_HOUR` if a school or office ever hits it. Paid orders cannot be re-configured through the API.

**Linux, Windows and sharp.** Netlify builds on Ubuntu and runs functions on Amazon Linux — it is Linux, even if you
develop on Windows. The one thing that bites Windows-developed repos is the image library `sharp`: if `npm install` on
Windows rewrites `package-lock.json` without the Linux binaries, the Netlify build has no `sharp` for Linux and every
restoration fails. `netlify.toml` therefore runs `npm install --os=linux --cpu=x64 --no-save sharp` before the build,
and `NODE_VERSION=22` is pinned. Commit `package-lock.json` as it is in the repo; do not delete it.

**Env vars to set in Netlify** — set `JOB_RUNNER=netlify` explicitly, and the build fails on purpose if `JOB_SECRET` is missing in production; set the **functions region to an EU region** (Site configuration → Functions), otherwise every request hops Ohio → Ireland for the database (Site configuration → Environment variables), from `.env.example`: the OpenAI, Supabase,
Stripe, Resend and Meta keys, `NEXT_PUBLIC_SITE_URL=https://billedearv.dk` (the job runner calls itself on this URL),
`JOB_SECRET` (any long random string), `CRON_SECRET`, `ADMIN_PASSWORD`, `LEGAL_DRAFT`, `META_CAPI_TOKEN`, `OWNER_EMAIL` (where the "ny betaling / ændring ønsket / godkendt" mails go; defaults to founder.md's e-mail), `EMAIL_REPLY_TO` (hej@billedearv.dk once it exists). `JOB_RUNNER` may stay empty
(Netlify sets `NETLIFY=true`; on any other Node host set `JOB_RUNNER=inline`).

**HEIC:** the bucket accepts image/heic and image/heif (migration 0003, applied). Test one upload from an iPhone camera roll before spending.

**After the first deploy, check three things in the Netlify UI:** the deploy log lists `job-background` and `retention`
under Functions; the Stripe webhook URL (`/api/webhooks/stripe`) is the Netlify one; one real upload from a phone lands
on `/p/<id>?t=…` (Functions → job-background → logs shows the run).

`sharp` and `heic-convert` are marked external in `netlify.toml` and are installed by the build; `assets/founder`,
`public/mockup` and `public/examples/examples.json` are traced into the server function (`next.config.ts`) because
they are read with `fs` at runtime.

## 7. Configuration to confirm

- `CHRISTMAS_START_DATE` / `CHRISTMAS_CUTOFF_DATE` (defaults **1 Oct** / 10 Dec) — inside this window the site sells the
  Christmas gift: eyebrow with the deadline, a day countdown, "under juletræet", the gift section's "til tiden" row and the
  FAQ answer. Outside it the gift angle stays but without dates. Start the window earlier by setting the env var
  (e.g. `2026-09-15`) if the campaign runs earlier; the cutoff must be a date your print partner can actually hold.
- **Gavehilsen.** Checkout has an optional 200-character field; the text lands on the order (`preview_meta.gift_note`),
  in the owner mail, the ordrebekræftelse, the admin page and the print checklist — you write it on a card and put it in
  the parcel. It is promised on the page, so do it.
- `CAMPAIGN_END_DATE` (default **2026-09-30**) — the launch offer: the first extra copy of the same photograph is in the parcel at 0 kr. for orders placed up to and including that date. It is printed in the hero, on the price block, on the order page and in the FAQ, and it is a line on the receipt, so **you print and pack the extra copy** (admin shows "1 ekstra eksemplar"). Move the date with the env var; an empty value switches the offer off everywhere at once. Never replace it with a struck-through "før-pris": a reference price that was never charged is illegal under markedsføringsloven.
- `LEGAL_DRAFT=false` once the lawyer has reviewed `/privatliv` and `/handelsbetingelser` (removes the "Udkast" line).
- `DELIVERY_DAYS_MAX` (default **5**, your decision) — the promise "inden 5 hverdage" counts from the customer's approval.
  CEWE's own promise is 6–11 business days, so 5 needs a print partner that ships a framed 30×40 within 3–4 days
  (or a local lab / your own framing). The number is on the page, in the mails and in Handelsbetingelser; if the
  partner cannot hold it, set the env var to what they can — a missed promise is the one thing this audience punishes.
- `ADMIN_PASSWORD` — long and random.

## 8. Legal review

`/privatliv` and `/handelsbetingelser` are marked "Udkast – skal gennemgås af advokat". Points to check with a lawyer:
the fortrydelsesret wording (digital content + bespoke goods), the 5-year bookkeeping retention, the OpenAI
transfer basis (SCCs / DPF — verify OpenAI's current DPA), naming CEWE as processor.
Claims deliberately **not** made anywhere: "aldrig til AI-træning", "forlader aldrig EU", "100 % sikkert",
"krypteret", "GDPR-certificeret".

## 9. OpenAI account

- The org is rate-limited to **5 input images per minute** on gpt-image-2 (observed 429). Each preview uses 2,
  each colour version 1 → ≈2 previews/min. Ask for a higher tier before sending traffic, or set
  `PREVIEW_IMAGE_QUALITY=medium` (already) and accept queueing.
- Cost per preview at medium ≈ 10k image tokens + 2.3k vision tokens (see QUALITY_REPORT.md for the estimate);
  the print final at high is roughly 3–4× that.
- Rotate the API key that was pasted in chat once the 24 h window the owner mentioned is over.

## 10. Print partner

Create a CEWE account (or pick a Danish lab that frames in 30×40) before the first paid order; the admin checklist
assumes it. Buy one framed print of a test image first so you know the mount colour and packaging.

## 11. Mockup wall

`public/mockup/wall.jpg` is missing. The mockup renders a neutral wall by code until you drop in a real photo of a
plain wall (daylight, no objects, ≥1600 px wide). The frame and shadow are composed on top.

## 12. Things the fourth pass added that you should know

- **Preview links are shareable by design.** The URL the app opens after an upload is `/p/<id>?t=<token>`; the same
  token is on every image URL. Anyone with that exact URL can see the preview (not the original file, not the order).
  Without the token a preview only opens on the phone with the session cookie; everything else gets the Danish 404.
- **"Jeg har ikke billedet lige nu"** in the sheet mails a link to the site and creates a `MANUAL_REVIEW` order with the
  note "link requested, no photo yet". In admin, treat those as leads, not as work: nothing to restore until they upload.
- **The wait.** The bar creeps to 85 % while the model runs (~30–45 s); after 45 s the caption says it is taking longer
  today. If OpenAI is slow for a whole day, that line is what people see — no action needed, but expect calls.
- **Founder's first name** is used in copy only once the portrait and the three "why" lines exist (see §2).
- **hej@billedearv.dk must exist before the first ad.** It is now the only address on the site and in every
  mail (`founder.md`), the Resend sender and the default reply-to and owner-notification address. Create
  the mailbox (or a forward to one you read daily), verify the domain in Resend, and set `OWNER_EMAIL`
  if notifications should go elsewhere.
- **`DELIVERY_DAYS_MAX=10` and `CHRISTMAS_CUTOFF_DATE=2026-12-02` are deliberately cautious.** Shorten them only
  when the print partner has confirmed a shorter lead time in writing; they are the only place the promise lives.
- **Orders that are never approved close themselves.** Reminders at day 2 and 7, an owner nudge at 10, a final
  notice at 14 ("refund in 7 days unless you approve") and an automatic Stripe refund at 21 with the refund mail.
  Every step is written into the order's internal notes. A new approval version restarts the clock.
- **Colour is offered after purchase.** The approval mail and page carry "Vil du se det i farver?" for black-and-white
  photographs; it lands as a change request. In admin, press *Skift til farver*, generate the final again and send a
  new approval mail. Nothing is charged for it.
- **The price anchor under 599 kr. is your claim, not ours.** *"Til sammenligning: hos en fotograf koster
  restaureringen alene typisk 300–600 kr. – uden ramme og levering."* is a comparative price statement
  under markedsføringsloven: keep two or three photographers' price lists (screenshots with dates) so you
  can document it if asked. To remove the line, set `PRICE_ANCHOR` in `lib/copy.ts` to an empty string.
- **The test is decided by one number.** `/admin` opens with *Preview → betaling*: of the people who saw
  their own preview in the last 30 days, the share that went on to payment. Judge the first campaign on
  that, not on purchases — purchases at 599 kr. from cold traffic come later and in small numbers.
- **The digital file is delivered on the approval page.** Once the customer taps Godkend, `/godkend/<token>` shows
  "Hent din fil i høj opløsning" (a short signed download of the print final), and the "Dit billede er på vej"
  mail carries the same link. Nothing to do on your side — but the file only exists once you have generated or
  uploaded the final, which you must do before the approval mail anyway. After the 90-day retention the link says
  the file is gone.

## 13. Unverified

- Playwright checkpoints were rendered in headless Chromium; test on a real iPhone (Safari toolbar + safe-area), in particular the sheet's drag-to-dismiss and the fixed price bar on `/p/<id>`.
- Lighthouse (production build, mobile emulation): performance 89–93, a11y/best-practices/SEO 100, CLS 0; desktop 100. Re-run after replacing the example photographs — the damaged "before" images decide LCP.
- Stripe Checkout, webhook, confirmation mail and approval mail were exercised only at code level (no keys).
