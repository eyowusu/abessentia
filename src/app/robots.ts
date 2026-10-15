import type { MetadataRoute } from 'next';
import { getCanonicalSiteUrl } from '@/lib/server/site';

const SITE_URL = getCanonicalSiteUrl();

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
