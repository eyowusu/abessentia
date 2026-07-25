# AB Essentia E-Commerce Website

A modern, responsive Next.js e-commerce website for AB Essentia, a PayGlobe merchant. The website features a beautiful glass-morphism design, product catalog, shopping cart, and PayGlobe payment integration.

## Features

- **Modern UI/UX**: Glass-morphism design with gradient backgrounds and smooth animations
- **Product Catalog**: Browse products with search and category filtering
- **Shopping Cart**: Full cart functionality with quantity management
- **PayGlobe Integration**: Secure payment processing through PayGlobe API
- **Responsive Design**: Mobile-first approach, works on all devices
- **TypeScript**: Fully typed for better development experience
- **State Management**: Zustand for cart state management

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- PayGlobe merchant account (for production)

### Installation

1. Clone the repository:
```bash
cd ab-essentia-web
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
# Edit src/lib/config.ts to set your PayGlobe API URL and merchant ID
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
ab-essentia-web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Home page
│   │   ├── products/           # Products pages
│   │   ├── cart/               # Shopping cart
│   │   ├── checkout/           # Checkout flow
│   │   ├── about/              # About page
│   │   ├── contact/            # Contact page
│   │   └── layout.tsx          # Root layout
│   ├── components/             # React components
│   │   ├── ui/                 # UI components (Button, Card, Modal)
│   │   ├── navigation.tsx      # Navigation bar
│   │   └── footer.tsx          # Footer
│   ├── lib/                    # Utilities and configurations
│   │   ├── api-client.ts       # PayGlobe API client
│   │   ├── config.ts           # App configuration
│   │   ├── store.ts            # Zustand cart store
│   │   └── utils.ts            # Utility functions
│   └── globals.css             # Global styles
└── package.json
```

## PayGlobe Integration

This website integrates with **PayGlobe** purely as the product catalogue and order-of-record.

- **Product Fetching**: Retrieves products from PayGlobe merchant inventory.
- **Order Recording**: After payment, the order is written back to PayGlobe for inventory/stock updates.

### AB Essentia owns all payments (Paystack)

PayGlobe is **deliberately not involved in payments**. All payment collection and verification is done by AB Essentia using the merchant's **own Paystack** account:

- `POST /api/paystack/initiate` — Calculates the authoritative total from PayGlobe product prices, then opens a Paystack payment link. Order details are stored inside the Paystack transaction metadata.
- `POST /api/paystack/fulfill` — Confirms a payment by reference and records the order in PayGlobe.
- `POST /api/paystack/webhook` — Reliable server-to-server fulfillment for cases where the customer closes the browser after paying.

### API Endpoints Used

- `GET /api/v1/merchants/public/products/` - Get all products
- `GET /api/v1/merchants/public/products/{id}/` - Get product details
- `GET /api/v1/merchants/public/products/categories/` - Get categories
- `GET /api/v1/merchants/public/products/search/` - Search products
- `POST /api/v1/external/paystack-orders/` - Record a paid order in PayGlobe (server-to-server)

### Configuration

Copy `env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_SITE_URL=https://abessentiagh.com
NEXT_PUBLIC_PAYGLOBE_API_URL=https://api.payglobe.net
# Set EXACTLY one of these so the shop only shows this merchant's products:
NEXT_PUBLIC_STORE_ID=<the PayGlobe store id for AB Essentia>
# OR, if you have multiple stores under one merchant:
# NEXT_PUBLIC_MERCHANT_ID=<the PayGlobe merchant id>
PAYSTACK_SECRET_KEY=sk_test_...
PAYGLOBE_API_KEY=<PayGlobe API key with `create_orders` scope>
```

`NEXT_PUBLIC_STORE_ID` is preferred because it scopes products to a single store. `NEXT_PUBLIC_MERCHANT_ID` scopes products to every store owned by that merchant. If both are set, `NEXT_PUBLIC_STORE_ID` wins.

## Deployment to Google Cloud Platform (GCP)

### Option 1: Google Cloud Run (Recommended)

A `Dockerfile` is already in the project root and produces a Next.js standalone bundle.

1. **Build and push the image**:
```bash
gcloud auth configure-docker

docker build -t gcr.io/PROJECT_ID/ab-essentia-web .
docker push gcr.io/PROJECT_ID/ab-essentia-web
```

2. **Deploy to Cloud Run**:
```bash
gcloud run deploy ab-essentia-web \
  --image gcr.io/PROJECT_ID/ab-essentia-web \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars NEXT_PUBLIC_SITE_URL=https://abessentiagh.com \
  --set-env-vars NEXT_PUBLIC_PAYGLOBE_API_URL=https://api.payglobe.net \
  --set-env-vars PAYSTACK_SECRET_KEY=sk_live_... \
  --set-env-vars PAYGLOBE_API_KEY=...
```

### Important Paystack setup

Go to your Paystack dashboard → Settings → Webhooks and set:
```
https://abessentiagh.com/api/paystack/webhook
```
This makes order recording reliable even if the customer closes the browser immediately after payment.

### Option 2: Google App Engine

1. **Create app.yaml**:
```yaml
runtime: nodejs18
instance_class: F2
handlers:
  - url: /_next/static
    static_dir: .next/static
    expiration: 1h
  - url: /.*
    script: auto
```

2. **Deploy**:
```bash
gcloud app deploy
```

### Option 3: Google Cloud Storage + Cloud CDN (Static Export)

1. **Configure for static export** in `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
}
module.exports = nextConfig
```

2. **Build static export**:
```bash
npm run build
```

3. **Upload to Cloud Storage**:
```bash
gsutil rsync -R out gs://YOUR_BUCKET_NAME
```

4. **Set up Cloud CDN** for the bucket

## Domain Configuration (Namecheap)

1. **Purchase domain**: Buy `abessentiagh.com` from Namecheap
2. **Configure DNS**: Point domain to your GCP deployment
   - For Cloud Run: Use a load balancer and set up custom domain
   - For App Engine: Configure custom domain in GCP Console
3. **SSL Certificate**: Enable SSL through GCP (automatic for Cloud Run/App Engine)

## Environment Variables

Create a `.env.local` file (not committed to git). Server-only keys must not be prefixed with `NEXT_PUBLIC_`:

```env
# Public (browser)
NEXT_PUBLIC_SITE_URL=https://abessentiagh.com
NEXT_PUBLIC_PAYGLOBE_API_URL=https://api.payglobe.net
NEXT_PUBLIC_MERCHANT_ID=your_merchant_id

# Server-only
PAYSTACK_SECRET_KEY=sk_live_...
PAYGLOBE_API_KEY=...
# Optional: only needed if the external API path differs from the default.
# PAYGLOBE_BASE_URL=https://api.payglobe.net/api/v1/external
```

## PayGlobe CORS requirement

AB Essentia fetches products from the browser, so `abessentiagh.com` must be in PayGlobe's `CORS_ALLOWED_ORIGINS` environment variable before going live. Configure this in your PayGlobe deployment settings.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features

1. **New Page**: Create a new folder in `src/app/` with `page.tsx`
2. **New Component**: Add to `src/components/`
3. **API Integration**: Add functions to `src/lib/api-client.ts`

## Performance Optimization

- Image optimization with Next.js Image component
- Static generation where possible
- Code splitting automatic with Next.js
- Lazy loading for components

## Security

- **PayGlobe never touches payments**: AB Essentia uses its own Paystack account for all payment collection and verification.
- Server-side secrets (`PAYSTACK_SECRET_KEY`, `PAYGLOBE_API_KEY`) are never exposed to the browser.
- Paystack webhooks are signature-verified (HMAC SHA512) before any order is recorded.
- HTTPS enforced in production.
- Product prices are computed authoritatively from PayGlobe on the server so the client cannot alter the amount charged.

## Support

For issues or questions:
- Email: info@abessentiagh.com
- PayGlobe Merchant Dashboard: https://payglobe.net

## License

Copyright © 2024 AB Essentia. All rights reserved.
