/**
 * Shared catalogue types and response normalizers.
 *
 * Imported by BOTH client code (api-client.ts, cart/wishlist/product components)
 * and server code (lib/server/catalogue.ts, lib/server/payglobe.ts), so this file
 * must stay pure: no process.env, no axios, no Next APIs.
 */

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface CatalogueProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  category?: string;
  /**
   * Units this shopper may add to their basket, NOT the merchant's true inventory.
   * PayGlobe caps the figure it publishes so the catalogue cannot be polled to read
   * real stock levels, so treat this only as "how many can I buy right now".
   */
  stock: number;
  /** Coarse availability band from PayGlobe; preferred over comparing `stock`. */
  stockStatus: StockStatus;
  rating?: number;
  isAvailable: boolean;
  createdAt?: string;
  sku?: string;
  /** Original price when the product is on sale; the customer still pays `price`. */
  compareAtPrice?: number;
  /** PayGlobe-computed percent off when compareAtPrice > price. */
  discountPercentage?: number;
}

export interface CatalogueCategory {
  id: string;
  name: string;
  description?: string;
  image?: string;
}

export interface CatalogueBundle {
  id: string;
  name: string;
  image?: string;
  products?: string | string[];
}

/** One line of a cart freshness check, as reported by checkCartItems(). */
export interface CartLineCheck {
  product_id: number;
  name: string;
  /** Current price per unit, from PayGlobe. */
  price: number;
  /** Quantity the customer can actually have right now (0 if unavailable). */
  available: number;
  requested: number;
  isAvailable: boolean;
}

export interface OrderLineItem {
  product_name: string;
  quantity: number;
  subtotal: string;
}

/** Status of a single order, returned by the order-tracking endpoint. */
export interface OrderStatus {
  order_number: string;
  status: string;
  status_display?: string;
  payment_status: string;
  total: string;
  currency: string;
  shipping_city?: string;
  shipping_carrier?: string;
  tracking_number?: string;
  /** Direct tracking link resolved by PayGlobe, when the courier is one it knows. */
  tracking_url?: string;
  /** False when tracking_url is a paste-in search page rather than this parcel's status. */
  tracking_is_deep_link?: boolean;
  shipped_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  items: OrderLineItem[];
}

/** Summary of one order in a customer's order history. */
export interface CustomerOrderSummary {
  order_number: string;
  status: string;
  status_display?: string;
  payment_status: string;
  total: string;
  currency: string;
  shipping_carrier?: string;
  tracking_number?: string;
  /** Direct tracking link resolved by PayGlobe, when the courier is one it knows. */
  tracking_url?: string;
  tracking_is_deep_link?: boolean;
  shipped_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  items: OrderLineItem[];
}

export const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value !== '') return Number(value);
  return undefined;
};

/**
 * Read PayGlobe's availability band, falling back to the quantity for older responses
 * that predate `stock_status`.
 */
export function normalizeStockStatus(
  r: Record<string, unknown> | null | undefined
): StockStatus {
  const raw = r?.stock_status;
  if (raw === 'in_stock' || raw === 'low_stock' || raw === 'out_of_stock') {
    return raw;
  }
  const quantity = Number(r?.available_quantity ?? r?.stock_quantity ?? 0);
  if (!(quantity > 0)) return 'out_of_stock';
  return r?.is_low_stock ? 'low_stock' : 'in_stock';
}

export function normalizeProduct(p: unknown): CatalogueProduct {
  const r = p as Record<string, unknown> | null | undefined;
  return {
    id: String(r?.id ?? ''),
    name: String(r?.name ?? ''),
    price: Number(r?.price ?? 0),
    description: asString(r?.description),
    image: asString(r?.image_url || r?.thumbnail_url || r?.image),
    category: asString(r?.category_name || r?.category),
    // available_quantity is the current name; stock_quantity is PayGlobe's deprecated
    // alias carrying the same capped value. Both are read so the storefront works
    // against either version of the API.
    stock: Number(r?.available_quantity ?? r?.stock_quantity ?? 0),
    stockStatus: normalizeStockStatus(r),
    rating: asNumber(r?.rating),
    isAvailable: Boolean(r?.is_available ?? true),
    createdAt: asString(r?.created_at),
    sku: asString(r?.sku),
    compareAtPrice: asNumber(r?.compare_at_price),
    discountPercentage: asNumber(r?.discount_percentage),
  };
}

export function normalizeProductList(data: unknown): CatalogueProduct[] {
  const results = Array.isArray(data)
    ? data
    : ((data as Record<string, unknown> | null)?.results ?? []);
  return (results as unknown[]).map(normalizeProduct);
}

export function normalizeCategoryList(data: unknown): CatalogueCategory[] {
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
}
