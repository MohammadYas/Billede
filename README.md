# Genfundet

Danish direct-to-consumer service: upload a phone photo of a damaged family photograph, see it restored in about
20 seconds, order it restored, printed and framed (30×40 cm, 599 kr., free shipping). One product, one price.
The customer approves the finished image by mail before anything is printed.

Read in this order: `HANDOFF.md` (what the owner must do before the test) → `DECISIONS.md` → `QUALITY_REPORT.md` → `QA.md`.

## Stack

Next.js 16 (app router, Node runtime), TypeScript, sharp, OpenAI SDK (`gpt-image-2` for restoration and colourisation,
`gpt-5.5` vision for the likeness check), Supabase (Postgres + private Storage, EU region), Stripe Checkout, Resend.
No UI kit. Two self-hosted fonts. One third-party script (Meta Pixel, after consent).

## Run locally

```bash
cp .env.example .env.local   # fill in the keys
npm install
npm run dev                   # http://localhost:3000
```

Admin: `/admin` with `ADMIN_PASSWORD`. The database schema is in `supabase/migrations/` (already applied to the
project in `.env.local`; re-apply with the Supabase SQL editor or the Management API on a new project).

## Env vars

| Var | Purpose |
|---|---|
| `OPENAI_API_KEY` | restoration, colourisation, likeness check |
| `OPENAI_IMAGE_MODEL` / `OPENAI_VISION_MODEL` | defaults `gpt-image-2` / `gpt-5.5` |
| `PREVIEW_IMAGE_QUALITY` | `medium` (≈33 s for two candidates). `high` is ≈90 s and only used for the print final |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | database and private bucket (server only uses the service role) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MOBILEPAY_ENABLED` | Checkout; MobilePay is added to the payment-method list only when the flag is `true` |
| `RESEND_API_KEY`, `EMAIL_DOMAIN`, `EMAIL_FROM_LOCAL` | mails from `<fornavn>@genfundet.dk` |
| `NEXT_PUBLIC_META_PIXEL_ID` | Pixel; the consent banner only renders when set |
| `ADMIN_PASSWORD`, `CRON_SECRET`, `JOB_SECRET`, `JOB_RUNNER` | admin login (rate-limited), retention cron auth, background job runner secret, `netlify`/`inline` |
| `NEXT_PUBLIC_SITE_URL`, `DELIVERY_DAYS_MAX`, `CHRISTMAS_START_DATE`, `CHRISTMAS_CUTOFF_DATE`, `LEGAL_DRAFT` | absolute URLs; delivery promises and the Christmas window (never hard-coded in copy); legal draft stamp |

## How an order flows (as the founder)

1. **Preview.** Customer uploads → `POST /api/preview` streams real stages (`sending`, `restoring`, `preparing`) →
   `lib/preview-service.ts` runs `lib/restoration/restore.ts` (two candidates, SSIM selection, vision likeness +
   face-count check). Any doubt → status `MANUAL_REVIEW` and the fallback copy with an e-mail field (`POST /api/lead`).
   Otherwise `PREVIEW_READY` and the browser navigates to `/p/<orderId>` — the preview page (slider at the photo's own aspect,
   framed mockup, price). Colour version is fetched as a second request; images are streamed same-origin and session-gated.
2. **Checkout.** `POST /api/checkout` → Stripe Checkout (DKK, da, DK shipping, terms checkbox). Webhook
   `checkout.session.completed` and the `/tak` page both call `markPaid` (idempotent) → `PAID`, confirmation mail,
   `Purchase` fired once (`purchase_tracked_at`).
3. **Retouch.** In `/admin/orders/<id>`: set `IN_RETOUCH`; either press **Generér final i høj kvalitet** (re-runs
   `gpt-image-2` at quality `high` from the stored original, ≈2 min, colour if the customer chose it) or upload your
   own final. Download it, fix anything in your editor, upload again.
4. **Approval.** Press **Send "Dit færdige billede er klar"** → `AWAITING_APPROVAL`, mail with Godkend / ændring
   buttons (`/godkend/<token>`). A reminder goes out after 48 h (cron). Change request → `CHANGE_REQUESTED` with the
   customer's text on the order page; set `IN_RETOUCH` and repeat. Approval → `APPROVED`.
5. **Print (manual this week).** The order page shows the checklist from `lib/fulfillment/manual.ts`:
   download the final at print resolution → order at CEWE "Billede i ramme" (or a Danish photo lab) in the order's
   format → paste the reference → set `IN_PRODUCTION` → paste tracking → set `SHIPPED` (sends "Dit billede er på vej")
   → `COMPLETED` when delivered.
   CEWE is a consumer service: **no API, CEWE-branded packaging, 6–11 business days.** Fine for the first orders,
   not for scale. A POD provider (Gelato / Printful / Prodigi) is the intended next `FulfillmentProvider` implementation.
6. **Refund.** Set status `REFUNDED` on the order page → refund via the Stripe SDK on the payment intent.

Retention: `netlify/functions/retention.ts` (scheduled, 03:00 UTC) or `GET /api/cron/retention` (Bearer `CRON_SECRET`) on other hosts; deletes files for
unpaid orders after 30 days and completed orders after 90 days, logging to `deletion_log`, and sends approval reminders.

## Enable a second format

1. `lib/pricing.ts`: set `enabled: true` on the format (and the price).
2. Nothing else is required for Checkout (line items are built from `lib/pricing.ts` with `price_data`).
   If you prefer Stripe-side prices, create one per format and map it in `lib/payments/stripe.ts`.
3. The customer flow still exposes one format (`customerFormat()`); the admin can change format per order today.
   A customer-facing picker is deferred until the test produces purchases.

## Re-run the quality report on new originals

```bash
# put ≥5 damaged originals (+ optional <name>.md sidecars) in assets/originals/
npm run quality:report                                  # → QUALITY_REPORT.md, checkpoints/quality/, work/quality/
npm run examples:export -- --source assets/originals    # → public/examples/ (consent: yes only; several folders: a,b)
```

Options: `--quality high`, `--concurrency 1` (the OpenAI org is limited to 5 input images/min on gpt-image-2).
Fill in the two "own rating" columns by looking at `work/quality/<name>/restored.jpg`. Gate: ≥70 % of images with
own likeness ≥4, naturalness ≥3, `same_people = true`, `invented_details = false`.

## Known limits

- `gpt-image-2` returns ≈1475 px on the long edge for `size: "auto"`; the final is upscaled with lanczos3 to ≥2400 px
  (≈150 dpi at 30×40). Set `FINAL_IMAGE_SIZE` (e.g. `1536x2048`) to request a larger explicit size when the aspect fits.
- Rate limit 5 input images/min → ≈2 live previews per minute. Ask OpenAI for a higher tier before the ad test.
- Route `maxDuration` is 60 s for previews and 300 s for the final; on Vercel Hobby the final needs Pro (or run it locally).
