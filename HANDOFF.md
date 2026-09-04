# HANDOFF — what the owner must do before the 1.500 kr. test

Everything below was either impossible for the agent to do (needs your identity, your money, your DNS) or is
unverified. Items in **bold** block the test.

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

`assets/founder/founder.md` has name, phone and e-mail from your Stripe account. **Fill in `city`, `cvr`, `address`,
the three `why` lines and drop `portrait.jpg` in the folder.** Until then the site hides the empty fields and the
legal pages show "[Udfyld …]". Handelsbetingelser require name, CVR and address (e-handelsloven §7).
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

## 5. Meta Pixel

Create the pixel in Events Manager, set `NEXT_PUBLIC_META_PIXEL_ID`. Events fired: PageView, ViewContent (hero ≥3 s),
UploadStarted, UploadCompleted, PreviewShown, PreviewFallback, InitiateCheckout, Purchase (value 599, DKK, once,
server-verified on `/tak`). Conversions API was **not** built (would have exceeded the 2 h budget); dedup `eventID`
is already passed on Purchase so CAPI can be added later without double counting.
Use `utm_content=<ad name>` in every ad link; the funnel view `v_funnel_daily` groups by it.

## 6. Domain and hosting

Deploy to Vercel (or any Node host) with the env vars in `.env.example`. `vercel.json` schedules the retention cron
daily at 03:00 UTC; set `CRON_SECRET`. Node runtime with `sharp` — no edge. Route `/api/admin/final` needs a 300 s
function limit (Vercel Pro) or run finals locally.

## 7. Configuration to confirm

- `CHRISTMAS_START_DATE` / `CHRISTMAS_CUTOFF_DATE` (defaults 1 Nov / 10 Dec) — the Christmas copy runs only inside
  this window; outside it the site says "inden 10 hverdage".
- `LEGAL_DRAFT=false` once the lawyer has reviewed `/privatliv` and `/handelsbetingelser` (removes the "Udkast" line).
- `DELIVERY_DAYS_MAX` (default 10) — CEWE's own promise is 6–11 business days; 10 is honest only if you approve
  finals within 48 h.
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
