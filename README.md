# AB Essentia E-Commerce Website

The public storefront for AB Essentia — a Ghanaian natural-beauty brand selling via
[PayGlobe](https://api.payglobe.net) as its catalogue and order-of-record, and its
**own Paystack account** for all payment collection.

## Features

- **Product catalogue** — server-rendered listing, detail, search and category filtering, revalidated every 5 minutes
- **Cart & wishlist** — persisted client-side (Zustand), re-priced against live PayGlobe data before checkout
- **Checkout** — Paystack hosted payment page; amount computed server-side, never trusted from the browser
- **Order fulfilment** — success-page call + signed Paystack webhook + daily reconciliation sweep, all idempotent
- **Order tracking** — look up by order number or payment reference + email
- **Account** — passwordless sign-in (emailed one-time code) showing full order history
- **Coupons & promos** — server-validated codes plus an optional site-wide automatic promo

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State**: Zustand (cart + wishlist persisted to localStorage)
- **HTTP**: Axios
- **Icons**: Lucide React
- **Tests**: Node's built-in test runner (`node --test`), compiled via `tsconfig.test.json`

## Getting Started

### Prerequisites

- Node.js **20.9+** (required by Next.js 16)
- npm

### Installation

```bash
cd ab-essentia-web
npm install
cp env.example .env.local   # then fill in the values - env.example documents each one
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
ab-essentia-web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Home (ISR, 5 min)
│   │   ├── products/           # Catalogue + product detail (ISR)
│   │   ├── cart/               # Shopping cart (client, revalidated on open)
│   │   ├── checkout/           # Checkout + success page
│   │   ├── orders/track/       # Order tracking (order ref + email)
│   │   ├── account/            # Passwordless order history (email code)
│   │   ├── wishlist/           # Saved products
│   │   ├── about/, contact/    # Marketing pages
│   │   ├── api/
│   │   │   ├── proxy/          # Same-origin catalogue proxy (products, categories)
│   │   │   ├── paystack/       # initiate / fulfill / webhook / reconcile
│   │   │   ├── cart/validate/  # Re-price stale carts against live catalogue
│   │   │   ├── coupon/validate/# Coupon + auto-promo resolution
│   │   │   ├── orders/track/   # Order status lookup
│   │   │   └── account/        # request-code / verify / orders / logout
│   │   ├── error.tsx           # Segment error boundary
│   │   ├── not-found.tsx       # Styled 404
│   │   └── layout.tsx          # Root layout (nav + footer)
│   ├── components/             # navigation, footer, product-card, ui/ primitives
│   └── lib/
│       ├── catalogue.ts        # SHARED types + response normalizers (client & server)
│       ├── config.ts           # Brand constants (WhatsApp, contact details)
│       ├── customer-session.ts # Session + display cookie names
│       ├── errors.ts           # apiError() message extraction
│       ├── order-display.ts    # Order status badges / timeline helpers
│       ├── api-client.ts       # Browser-facing catalogue + payment calls
│       ├── store.ts            # Zustand cart/wishlist stores
│       ├── order-limits.ts     # Hard per-order quantity ceilings
│       ├── shipping.ts         # Ghana regions + delivery windows
│       ├── validation.ts       # Shared validators (email)
│       ├── use-mounted.ts      # Hydration-safe "mounted" flag
│       └── server/             # Server-only
│           ├── config.ts       # PayGlobe bases + canonical site URL
│           ├── payglobe.ts     # Pricing, stock holds, order recording, account
│           ├── paystack.ts     # Init/verify/webhook/refund/reconcile
│           ├── catalogue.ts    # Cached server-side catalogue fetcher
│           ├── catalogue-proxy.ts  # Shared proxy forwarder
│           ├── store-scope.ts  # store_id / merchant_id resolution (fails closed)
│           ├── coupons.ts      # Coupon + auto-promo config parsing
│           ├── rate-limit.ts   # In-process per-IP throttling
│           └── site.ts         # Canonical URL / callback-origin checks
├── env.example             # Every env var, documented
├── Dockerfile              # Optional: standalone bundle for Cloud Run / Docker
└── vercel.json             # Daily cron -> /api/paystack/reconcile
```

## How payments work

**PayGlobe never touches money.** It supplies products and stores orders; all payment
collection and verification uses AB Essentia's own Paystack account.

1. `POST /api/paystack/initiate` — re-prices the cart against live PayGlobe data,
   applies any coupon/auto-promo, places a **stock reservation**, then opens a
   Paystack transaction with the order encoded in its metadata.
2. Paystack redirects the customer to `/checkout/success?reference=…`, which calls
   `POST /api/paystack/fulfill` — the payment is **verified server-side** and the
   order recorded in PayGlobe.
3. `POST /api/paystack/webhook` does the same server-to-server (HMAC SHA-512
   verified), so a customer who closes the tab after paying still gets their order.
4. A daily cron hits `GET /api/paystack/reconcile` and re-runs fulfilment for any
   orphaned successful charge. Set `CRON_SECRET` or it stays closed.

Fulfilment is idempotent across all three paths. A permanent failure (e.g. item sold
out) triggers an automatic refund; a transient one is retried.

### Paystack dashboard setup

Settings → Webhooks:

```
https://www.abessentiagh.com/api/paystack/webhook
```

Use the **www** host — the apex domain 308-redirects and webhook callbacks should not
rely on redirects.

## Configuration

See **`env.example`** — it documents every variable, which are required, and why.
The short list:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, must be `https://www.abessentiagh.com` (drives payment callbacks, sitemap, metadata) |
| `NEXT_PUBLIC_PAYGLOBE_API_URL` | PayGlobe public API base |
| `NEXT_PUBLIC_STORE_ID` **or** `NEXT_PUBLIC_MERCHANT_ID` | Scopes the catalogue to this shop (exactly one; store_id wins if both set) |
| `PAYSTACK_SECRET_KEY` | Server-only, AB Essentia's own Paystack account |
| `PAYGLOBE_API_KEY` | Server-only, `create_orders` scope |
| `CRON_SECRET` | Guards `/api/paystack/reconcile` |
| `PAYGLOBE_BASE_URL`, `RECONCILE_LOOKBACK_HOURS`, `NEXT_PUBLIC_IMAGE_HOSTS`, `COUPON_CODES`, `PROMO_AUTO_*` | Optional |

No CORS configuration is needed on PayGlobe: the browser only ever talks to this
app's own API routes, which forward catalogue reads server-side.

## Deployment

### Vercel (production)

Push to `main` → deploy. `vercel.json` registers the daily cron
(`0 3 * * *` → `/api/paystack/reconcile`). Set all env vars from `env.example`
in the Vercel project, including `CRON_SECRET`.

### Docker / Cloud Run (alternative)

The `Dockerfile` produces a Next.js standalone bundle (`output: 'standalone'`):

```bash
docker build -t gcr.io/PROJECT_ID/ab-essentia-web .
docker push gcr.io/PROJECT_ID/ab-essentia-web
gcloud run deploy ab-essentia-web \
  --image gcr.io/PROJECT_ID/ab-essentia-web \
  --platform managed --region us-central1 --allow-unauthenticated --port 3000 \
  --set-env-vars NEXT_PUBLIC_SITE_URL=https://www.abessentiagh.com \
  --set-env-vars PAYSTACK_SECRET_KEY=sk_live_... \
  --set-env-vars PAYGLOBE_API_KEY=... \
  --set-env-vars NEXT_PUBLIC_STORE_ID=...
```

The reconcile sweep is an HTTP endpoint, so on non-Vercel hosting schedule it with
any external cron that can send `Authorization: Bearer $CRON_SECRET`.

A static export is **not** possible — this app is API-route-driven.

## Development

```bash
npm run dev    # dev server
npm run build  # production build
npm start      # serve the production build
npm run lint   # ESLint
npm test       # unit tests (tsc -> node --test)
```

Tests live beside the code as `*.test.ts` and cover the payment/fulfilment
decisions, coupons/promos, order limits, callback-URL safety and rate limiting.

## Security

- Server-side authoritative pricing — the browser total is never trusted
- Paystack webhook signature verification (HMAC SHA-512)
- Callback URLs constrained to the canonical origin (open-redirect guard)
- Foreign Paystack transactions are ignored, never refunded
- Per-IP rate limiting before any PayGlobe call
- Strict headers: CSP (production), HSTS, nosniff, frame/permissions policies
- Server secrets never reach the browser; the customer session token is httpOnly

## Support

- Email: info@abessentiagh.com
- PayGlobe Merchant Dashboard: https://payglobe.net

Copyright © AB Essentia. All rights reserved.
