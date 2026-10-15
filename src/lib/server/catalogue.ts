import { PAYGLOBE_PUBLIC_BASE } from './config';
import { catalogueScopeParams } from './store-scope';
import {
  asString,
  normalizeCategoryList,
  normalizeProduct,
  normalizeProductList,
  type CatalogueBundle,
  type CatalogueCategory,
  type CatalogueProduct,
} from '../catalogue';

/**
 * Server-side catalogue fetcher for AB Essentia.
 *
 * Hits PayGlobe's public catalogue endpoints directly (no API key — these are
 * the same URLs the /api/proxy routes forward to). Next.js caches each fetch
 * for `revalidate` seconds, so product pages render instantly from cache and
 * stay fresh without per-request API calls.
 *
 * The response types and normalizers are shared with the browser in
 * lib/catalogue.ts, so server-rendered and client-fetched products are always
 * the same shape.
 */

const REVALIDATE = 300; // 5 minutes

export type { CatalogueBundle, CatalogueCategory, CatalogueProduct };

async function fetchJson(path: string): Promise<unknown> {
  const scope = new URLSearchParams(catalogueScopeParams()).toString();
  const url = `${PAYGLOBE_PUBLIC_BASE}${path}${path.includes('?') ? '&' : '?'}${scope}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error(`Catalogue request failed: ${res.status} ${path}`);
  return res.json();
}

/**
 * The full catalogue, following PayGlobe's pagination rather than stopping at the
 * first page. `next` is an absolute URL upstream - only the `page` number is
 * extracted from it, so we never follow a caller-influenced host. Bounded by
 * maxPages so a misbehaving API cannot loop forever.
 */
export async function getProducts(pageSize = 100, maxPages = 10): Promise<CatalogueProduct[]> {
  let data = await fetchJson(
    `/api/v1/merchants/public/products/?page_size=${pageSize}&include_out_of_stock=true`
  );

  const results = normalizeProductList(data);
  let next = (data as Record<string, unknown> | null)?.next;

  for (let pages = 1; pages < maxPages && typeof next === 'string' && next; pages += 1) {
    let pageNum: number | null = null;
    try {
      const param = new URL(next).searchParams.get('page');
      pageNum = param ? Number(param) : null;
    } catch {
      break;
    }
    if (!Number.isInteger(pageNum) || pageNum === null) break;

    data = await fetchJson(
      `/api/v1/merchants/public/products/?page_size=${pageSize}&include_out_of_stock=true&page=${pageNum}`
    );
    results.push(...normalizeProductList(data));
    next = (data as Record<string, unknown> | null)?.next;
  }

  return results;
}

export async function getProduct(id: string): Promise<CatalogueProduct | null> {
  try {
    const data = await fetchJson(`/api/v1/merchants/public/products/${id}/`);
    return normalizeProduct(data);
  } catch {
    return null;
  }
}

export async function getFeatured(): Promise<CatalogueProduct[]> {
  try {
    return normalizeProductList(
      await fetchJson('/api/v1/merchants/public/products/featured/?include_out_of_stock=true')
    );
  } catch {
    return [];
  }
}

export async function getTrending(): Promise<CatalogueProduct[]> {
  try {
    return normalizeProductList(
      await fetchJson('/api/v1/merchants/public/products/trending/?include_out_of_stock=true')
    );
  } catch {
    return [];
  }
}

export async function getBundles(): Promise<CatalogueBundle[]> {
  try {
    const data = await fetchJson('/api/v1/merchants/public/products/bundles/');
    const list = Array.isArray(data)
      ? data
      : ((data as Record<string, unknown> | null)?.results ?? []);
    return (list as unknown[]).map((b) => {
      const r = b as Record<string, unknown> | null | undefined;
      return {
        id: String(r?.id ?? ''),
        name: String(r?.name ?? ''),
        image: asString(r?.image_url || r?.image),
        products: r?.products as string | string[] | undefined,
      };
    });
  } catch {
    return [];
  }
}

export async function getCategories(): Promise<CatalogueCategory[]> {
  try {
    return normalizeCategoryList(
      await fetchJson('/api/v1/merchants/public/products/categories/')
    );
  } catch {
    return [];
  }
}
