# HANDOFF — what the owner must do before the 1.500 kr. test

Everything below was either impossible for the agent to do (needs your identity, your money, your DNS) or is
unverified. Items in **bold** block the test.

## 0. Launch checklist — everything that is still yours (in order)

Nothing in this list is code. The code is done and verified; each line below is a login, a form or a decision only you can make.

**A. Before the first Netlify build**
1. Netlify → Import from GitHub → this repo, branch `main`. Build command and functions come from `netlify.toml`.
2. Netlify → Environment variables (copy names from `.env.example`): `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_DOMAIN`, `EMAIL_REPLY_TO`, `OWNER_EMAIL`, `NEXT_PUBLIC_META_PIXEL_ID`,
   `META_CAPI_TOKEN`, `ADMIN_PASSWORD` (long, random), `JOB_SECRET` (long, random), `CRON_SECRET`, `JOB_RUNNER=netlify`,
   `NEXT_PUBLIC_SITE_URL=https://genfundet.dk`, `DELIVERY_DAYS_MAX=5`, `LEGAL_DRAFT` (true until the lawyer has read).
   The build refuses to run without `JOB_SECRET`.
3. Netlify → Site configuration → Functions → Region: an EU region (Frankfurt/Ireland). Supabase is in Ireland.
4. Domain: genfundet.dk on Netlify, HTTPS on.

**B. Accounts and identity**
5. `assets/founder/founder.md`: `city`, `cvr`, `address`, three `why` lines, `portrait.jpg`. **A mailbox on the domain
   (kontakt@genfundet.dk) as `email`, `EMAIL_REPLY_TO` and `OWNER_EMAIL`** — a Gmail address next to 999 kr. is the trust
   leak this audience notices first, and since there is no phone number anywhere, that address is now the only way a
   customer can reach you. It is printed on the price block, in the footer, on the 404, on `/tak`, on both approval
   pages and in every mail. The site promises an answer within 24 hours, so the mailbox must be one you read daily.
6. Stripe Dashboard: Public details → Terms of service URL `https://genfundet.dk/handelsbetingelser` and Privacy URL
   (Checkout refuses to open without the Terms URL); webhook on `https://genfundet.dk/api/webhooks/stripe` for
   `checkout.session.completed` + `checkout.session.async_payment_succeeded` → copy the signing secret to
   `STRIPE_WEBHOOK_SECRET` → "Send test event" → a 200 in Netlify → Functions log; MobilePay activated, then
   `STRIPE_MOBILEPAY_ENABLED=true`; live keys when you go live.
7. Resend: domain genfundet.dk verified (SPF, DKIM, DMARC `p=none`), `RESEND_API_KEY`.
8. Meta: domain verified in Business Manager; pixel id; Conversions API token (`META_CAPI_TOKEN`); Aggregated Event
   Measurement priorities Purchase > InitiateCheckout > PreviewShown (custom conversion) > ViewContent; first campaign
   optimised for the PreviewShown custom conversion, not Purchase.
9. Supabase: the HEIC bucket update is already applied; keep the project in Ireland; nothing else.
10. Print partner that ships **framed 30×40, 40×50 and 50×70** within 3–4 business days (the site promises "inden
    5 hverdage" from the customer's approval) — or set `DELIVERY_DAYS_MAX` to what the partner can hold. Confirm your
    cost for all three sizes before the ads run: the prices on the page are 599 / 799 / 999 kr. including frame, glass,
    gift card, packaging and shipping. A size the partner cannot deliver profitably is one line in `lib/pricing.ts`
    (`enabled: false`) and disappears everywhere.
11. Lawyer reads `/privatliv` and `/handelsbetingelser`, then `LEGAL_DRAFT=false`.
12. `public/mockup/wall.jpg` (a photo of your own wall, optional) and, over time, consented customer before/afters to
    replace the archive examples (§1).

**C. After the first deploy, on a real iPhone**
13. Meta Sharing Debugger → re-scrape `https://genfundet.dk/` (link card with the before/after image).
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
| 1 | The site is on Netlify at genfundet.dk with HTTPS, every environment variable from §0 A2 set, functions in an EU region. Open the front page on your own phone. |
| 2 | kontakt@genfundet.dk exists and is on your phone; `founder.md` filled in (city, CVR, address, three lines, portrait); Resend domain verified; a test mail from `/admin` arrives and is not in spam. |
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

Read via Composio on 2026-09-03 from account `acct_1UBgmTJNJnc6lpkL` (genfundet.dk): country DK, currency DKK,
charges and payouts enabled, statement descriptor GENFUNDET.DK, payout schedule manual (7 days), no products,
no prices, no webhooks yet.

**MobilePay is not activated on the account** (capabilities list has card, Klarna, Link, Revolut Pay, Amazon Pay …
but no `mobilepay_payments`). **The test must not start without it** — 60 %+ of Danish mobile checkouts use it.
Activate: Stripe Dashboard → Settings → Payment methods → MobilePay → Turn on (needs the Danish business
verification to be complete). Then set `STRIPE_MOBILEPAY_ENABLED=true`.

Then, in order (§13 of the spec):
1. `STRIPE_SECRET_KEY` (live) and `NEXT_PUBLIC_SITE_URL=https://genfundet.dk` in the hosting env.
2. Register the webhook: `https://genfundet.dk/api/webhooks/stripe`, event `checkout.session.completed`
   (and `checkout.session.async_payment_succeeded`). Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Buy one 599 kr. order with your own card through the real site. Verify: `PAID` in Supabase (`orders`),
   the `Purchase` event in Meta Events Manager, the confirmation mail in your inbox. Then set the order to
   `REFUNDED` in `/admin` (refunds through the SDK) and verify `REFUNDED`. Record it in `QA.md` §Go-live.
4. Apple Pay / Google Pay ride on the card method in hosted Checkout; Apple Pay needs the domain registered under
   Settings → Payment methods → Apple Pay (Stripe does it automatically for Checkout on your domain).

Until then the code runs against Stripe test keys (`sk_test_…`, card 4242 4242 4242 4242). The agent had no test
keys, so journey A stops at "Stripe Checkout opens" — see QA.md.

### 3b. Before the first ad: three Stripe Dashboard settings (Checkout will not open without the first)
- **Public details → Terms of service URL** = `https://genfundet.dk/handelsbetingelser` (and the privacy URL). Checkout requires it because we ask for consent to the terms.
- **Webhook** on `https://genfundet.dk/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`; then "Send test event" and confirm a 200 in the Netlify function log. The hourly housekeeping job also asks Stripe about every open session from the last 7 days and marks paid orders (so a broken webhook cannot hide a payment), and admin has "Tjek betaling hos Stripe" on an order.
- **Customer receipts** in Stripe on, until you trust our own ordrebekræftelse.

## 4. E-mail (Resend) — DNS

Resend is not connected in Composio, so domain status could not be checked. Create the domain `genfundet.dk` in
Resend and add the records it shows (typically):

| Type | Name | Value |
|---|---|---|
| TXT | `resend._domainkey.genfundet.dk` | the DKIM key Resend shows |
| MX | `send.genfundet.dk` | `feedback-smtp.eu-west-1.amazonses.com` (priority 10) — use the **EU region** |
| TXT | `send.genfundet.dk` | `v=spf1 include:amazonses.com ~all` |
| TXT | `_dmarc.genfundet.dk` | `v=DMARC1; p=none; rua=mailto:<your mail>` |

Then `RESEND_API_KEY`, `EMAIL_DOMAIN=genfundet.dk`, `EMAIL_FROM_LOCAL=mohammad` (mails come from `mohammad@genfundet.dk`).
Send yourself a test order confirmation from `/admin` by completing a test purchase.

## 5. Meta Pixel and Conversions API

- `NEXT_PUBLIC_META_PIXEL_ID` loads the pixel after consent, on every page. Events: PageView, ViewContent (hero and preview), UploadStarted, UploadCompleted, PreviewShown, PreviewFallback (custom), InitiateCheckout, Purchase — all with the same product parameters. Events that happen before the visitor answers the banner are kept in the tab and replayed on "Ok".
- `META_CAPI_TOKEN` (Events Manager → Conversions API → Generate access token) sends **Purchase and InitiateCheckout from the server** too, with the same event ids as the browser (deduplicated) and hashed e-mail/phone/name/postcode + the click id. That is the copy Meta gets when the buyer paid in another browser (MobilePay app-switch out of the Facebook browser) or never consented. `META_TEST_EVENT_CODE` shows them in the Test events tab while you check.
- In Business Manager: verify genfundet.dk, prioritise Purchase > InitiateCheckout > PreviewShown (custom conversion) > ViewContent for iOS, create the custom conversion on `PreviewShown`, and run the first campaign optimised for that (1.500 kr. will not produce enough purchases to leave learning).

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
  owner nudge at 10 d, shipped → completed after 14 d;
- job state is on the order (`preview_meta.job`) and visible in admin.

**Linux, Windows and sharp.** Netlify builds on Ubuntu and runs functions on Amazon Linux — it is Linux, even if you
develop on Windows. The one thing that bites Windows-developed repos is the image library `sharp`: if `npm install` on
Windows rewrites `package-lock.json` without the Linux binaries, the Netlify build has no `sharp` for Linux and every
restoration fails. `netlify.toml` therefore runs `npm install --os=linux --cpu=x64 --no-save sharp` before the build,
and `NODE_VERSION=22` is pinned. Commit `package-lock.json` as it is in the repo; do not delete it.

**Env vars to set in Netlify** — set `JOB_RUNNER=netlify` explicitly, and the build fails on purpose if `JOB_SECRET` is missing in production; set the **functions region to an EU region** (Site configuration → Functions), otherwise every request hops Ohio → Ireland for the database (Site configuration → Environment variables), from `.env.example`: the OpenAI, Supabase,
Stripe, Resend and Meta keys, `NEXT_PUBLIC_SITE_URL=https://genfundet.dk` (the job runner calls itself on this URL),
`JOB_SECRET` (any long random string), `CRON_SECRET`, `ADMIN_PASSWORD`, `LEGAL_DRAFT`, `META_CAPI_TOKEN`, `OWNER_EMAIL` (where the "ny betaling / ændring ønsket / godkendt" mails go; defaults to founder.md's e-mail), `EMAIL_REPLY_TO` (kontakt@genfundet.dk once it exists). `JOB_RUNNER` may stay empty
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
- `STRIPE_MOBILEPAY_ENABLED` also drives the **copy**: until it is `true` the page says "Apple Pay, Google Pay eller kort",
  never MobilePay. Flip it the day MobilePay is live on the account.
- **Gavehilsen.** Checkout has an optional 200-character field; the text lands on the order (`preview_meta.gift_note`),
  in the owner mail, the ordrebekræftelse, the admin page and the print checklist — you write it on a card and put it in
  the parcel. It is promised on the page, so do it.
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

## 13. Unverified

- Playwright checkpoints were rendered in headless Chromium; test on a real iPhone (Safari toolbar + safe-area), in particular the sheet's drag-to-dismiss and the fixed price bar on `/p/<id>`.
- Lighthouse (production build, mobile emulation): performance 89–93, a11y/best-practices/SEO 100, CLS 0; desktop 100. Re-run after replacing the example photographs — the damaged "before" images decide LCP.
- Stripe Checkout, webhook, confirmation mail and approval mail were exercised only at code level (no keys).
