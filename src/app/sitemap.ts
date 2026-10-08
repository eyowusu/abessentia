import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/server/catalogue';

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.abessentiagh.com'
).replace(/\/+$/, '');

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/products',
    '/about',
    '/contact',
    '/orders/track',
    '/wishlist',
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  // A catalogue outage must not take the sitemap down with it - static routes
  // alone are still a valid sitemap.
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    products = await getProducts();
  } catch {
    products = [];
  }

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/products/${p.id}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
