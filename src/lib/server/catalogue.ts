/**
 * Server-side catalogue fetcher for AB Essentia.
 *
 * Hits PayGlobe's public catalogue endpoints directly (no API key — these are
 * the same URLs the /api/proxy routes forward to). Next.js caches each fetch
 * for `revalidate` seconds, so product pages render instantly from cache and
 * stay fresh without per-request API calls.
 */

const PUBLIC_BASE = (
  process.env.NEXT_PUBLIC_PAYGLOBE_API_URL || 'https://api.payglobe.net'
).replace(/\/$/, '');

const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID || '2';
const REVALIDATE = 300; // 5 minutes

export interface CatalogueProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  category?: string;
  stock: number;
  rating?: number;
  isAvailable: boolean;
  createdAt?: string;
  sku?: string;
}

export interface CatalogueCategory {
  id: string;
  name: string;
  description?: string;
  image?: string;
}

const asString = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : undefined;

const asNumber = (v: unknown): number | undefined => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v !== '') return Number(v);
  return undefined;
};

function normalizeProduct(p: unknown): CatalogueProduct {
  const r = p as Record<string, unknown> | null | undefined;
  return {
    id: String(r?.id ?? ''),
    name: String(r?.name ?? ''),
    price: Number(r?.price ?? 0),
    description: asString(r?.description),
    image: asString(r?.image_url || r?.thumbnail_url || r?.image),
    category: asString(r?.category_name || r?.category),
    stock: Number(r?.stock_quantity ?? 0),
    rating: asNumber(r?.rating),
    isAvailable: Boolean(r?.is_available ?? true),
    createdAt: asString(r?.created_at),
    sku: asString(r?.sku),
  };
}

function normalizeList(data: unknown): CatalogueProduct[] {
  const results = Array.isArray(data)
    ? data
    : ((data as Record<string, unknown> | null)?.results ?? []);
  return (results as unknown[]).map(normalizeProduct);
}

async function fetchJson(path: string): Promise<unknown> {
  const url = `${PUBLIC_BASE}${path}${path.includes('?') ? '&' : '?'}store_id=${STORE_ID}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error(`Catalogue request failed: ${res.status} ${path}`);
  return res.json();
}

export async function getProducts(pageSize = 100): Promise<CatalogueProduct[]> {
  const data = await fetchJson(
    `/api/v1/merchants/public/products/?page_size=${pageSize}&include_out_of_stock=true`
  );
  return normalizeList(data);
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
    return normalizeList(
      await fetchJson('/api/v1/merchants/public/products/featured/?include_out_of_stock=true')
    );
  } catch {
    return [];
  }
}

export async function getTrending(): Promise<CatalogueProduct[]> {
  try {
    return normalizeList(
      await fetchJson('/api/v1/merchants/public/products/trending/?include_out_of_stock=true')
    );
  } catch {
    return [];
  }
}

export interface CatalogueBundle {
  id: string;
  name: string;
  image?: string;
  products?: string | string[];
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
    const data = await fetchJson('/api/v1/merchants/public/products/categories/');
    const cats =
      ((data as Record<string, unknown> | null)?.categories as unknown[] | undefined) ??
      (Array.isArray(data) ? data : []);
    return cats.map((cat: unknown) => {
      if (typeof cat === 'string') return { id: '', name: cat };
      const c = cat as Record<string, unknown> | null | undefined;
      return {
        id: String(c?.id ?? ''),
        name: String(c?.name ?? ''),
        description: asString(c?.description),
        image: asString(c?.image),
      };
    });
  } catch {
    return [];
  }
}
