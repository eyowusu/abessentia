export const config = {
  payglobe: {
    apiBaseUrl: process.env.NEXT_PUBLIC_PAYGLOBE_API_URL || 'https://api.payglobe.net',
    // Exactly one of storeId or merchantId should be set. storeId is preferred
    // because it scopes the shop to a single store; merchantId scopes it to all
    // stores belonging to that merchant.
    storeId: process.env.NEXT_PUBLIC_STORE_ID || '',
    merchantId: process.env.NEXT_PUBLIC_MERCHANT_ID || '',
  },
  site: {
    name: 'AB Essentia',
    domain: 'abessentiagh.com',
    description: 'Premium quality products for your lifestyle',
  },
};
