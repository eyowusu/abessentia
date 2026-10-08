import type { MetadataRoute } from 'next';

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.abessentiagh.com'
).replace(/\/+$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // No value in indexing transient/customer-specific flows.
      disallow: ['/api/', '/cart', '/checkout', '/checkout/success', '/account'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
