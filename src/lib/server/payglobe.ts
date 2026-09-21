import axios from 'axios';
import { assertWithinOrderLimits } from '../order-limits';

/**
 * Server-only helpers for talking to PayGlobe.
 *
 * PayGlobe is used purely as the product/inventory source and the order-of-record.
 * It NEVER touches payments: it does not collect, verify, hold, or settle money.
 * AB Essentia (this app) collects and verifies all payments via its own Paystack
 * account, then records the resulting order in PayGlobe for fulfillment/stock.
 */

const PUBLIC_BASE = (
  process.env.NEXT_PUBLIC_PAYGLOBE_API_URL || 'https://api.payglobe.net'
).replace(/\/$/, '');

const EXTERNAL_BASE = (
  process.env.PAYGLOBE_BASE_URL ||
  `${PUBLIC_BASE}/api/v1/external`
).replace(/\/$/, '');

function getScopeParams(): Record<string, string> {
  const params: Record<string, string> = {};
  const storeId = process.env.NEXT_PUBLIC_STORE_ID;
  const merchantId = process.env.NEXT_PUBLIC_MERCHANT_ID;
  if (storeId) {
    params.store_id = storeId;
  } else if (merchantId) {
    params.merchant_id = merchantId;
  }
  return params;
}

export interface OrderItemInput {
  product_id: number;
  quantity: number;
}

export interface AuthoritativeItem extends OrderItemInput {
  name: string;
  price: number;
  line_total: number;
}

export interface PricedOrder {
  items: AuthoritativeItem[];
  subtotal: number;
  /** Amount in the smallest currency unit (pesewas for GHS). */
  amountMinor: number;
}

/**
 * Fetch a single product from PayGlobe's public catalogue.
 * Used to compute an AUTHORITATIVE price server-side so the client cannot tamper
 * with the amount that gets charged.
 */
async function fetchPublicProduct(productId: number) {
  const url = `${PUBLIC_BASE}/api/v1/merchants/public/products/${productId}/`;
  const res = await axios.get(url, {
    params: getScopeParams(),
    timeout: 30000,
  });
  const p = res.data as Record<string, unknown>;
  const price = Number(p?.price ?? NaN);
  if (Number.isNaN(price)) {
    throw new Error(`Product ${productId} returned an invalid price`);
  }
  return {
    id: Number(p?.id ?? productId),
    name: String(p?.name ?? `Product ${productId}`),
    price,
    isAvailable: Boolean(p?.is_available ?? true),
    // Purchasable units, capped by PayGlobe so the catalogue cannot be polled for real
    // inventory. `available_quantity` is the current field; `stock_quantity` is the
    // deprecated alias carrying the same capped value.
    //
    // This is only a courtesy pre-check to fail fast and give the shopper a useful
    // message - reserveStock() remains the authority on whether the units exist, so a
    // capped figure here cannot oversell anything.
    stock: Number(p?.available_quantity ?? p?.stock_quantity ?? 0),
  };
}

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

/**
 * Report the current price and availability of each cart line, without throwing.
 *
 * The cart is persisted in the browser's localStorage, so a cart opened a week later
 * still shows whatever price and stock applied when the item was added. Left
 * unchecked, the customer only discovers the real figure on the Paystack page - which
 * reads as a bait-and-switch even though the server was right all along.
 *
 * Unlike priceOrder this never rejects: the caller wants to describe every problem to
 * the customer at once, not stop at the first one.
 */
export async function checkCartItems(items: OrderItemInput[]): Promise<CartLineCheck[]> {
  const results = await Promise.all(
    items.map(async (item): Promise<CartLineCheck> => {
      const productId = Number(item.product_id);
      const requested = Number(item.quantity);

      try {
        const product = await fetchPublicProduct(productId);
        return {
          product_id: productId,
          name: product.name,
          price: product.price,
          available: product.isAvailable ? product.stock : 0,
          requested,
          isAvailable: product.isAvailable,
        };
      } catch {
        // A product that has been withdrawn 404s here. Report it as unavailable
        // rather than failing the whole cart check.
        return {
          product_id: productId,
          name: `Product ${productId}`,
          price: 0,
          available: 0,
          requested,
          isAvailable: false,
        };
      }
    })
  );

  return results;
}

/**
 * Build an authoritative priced order from a list of {product_id, quantity}.
 * Prices come from PayGlobe, never from the browser.
 */
export async function priceOrder(items: OrderItemInput[]): Promise<PricedOrder> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one order item is required');
  }

  // Normalise BEFORE checking the ceilings, so the limits are applied to integers we
  // have actually validated rather than to whatever the client sent.
  const normalized = items.map((item) => {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error(`Invalid product_id: ${item.product_id}`);
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for product ${productId}`);
    }
    return { product_id: productId, quantity };
  });

  // Enforced here rather than in the route because this is the one authoritative path
  // every priced order goes through; a future checkout entry point cannot forget it.
  // Without a ceiling, a single request can hold a product's whole stock hostage for the
  // reservation TTL - see order-limits.ts.
  assertWithinOrderLimits(normalized);

  const priced: AuthoritativeItem[] = [];
  let subtotal = 0;

  for (const item of normalized) {
    const productId = item.product_id;
    const quantity = item.quantity;

    const product = await fetchPublicProduct(productId);
    if (!product.isAvailable) {
      throw new Error(`Product ${product.name} is not available`);
    }
    if (product.stock < quantity) {
      throw new Error(
        `Insufficient stock for ${product.name} (requested ${quantity}, available ${product.stock})`
      );
    }

    const lineTotal = Number((product.price * quantity).toFixed(2));
    subtotal = Number((subtotal + lineTotal).toFixed(2));
    priced.push({
      product_id: productId,
      quantity,
      name: product.name,
      price: product.price,
      line_total: lineTotal,
    });
  }

  return {
    items: priced,
    subtotal,
    amountMinor: Math.round(subtotal * 100),
  };
}

/** Thrown when PayGlobe cannot hold the requested stock. Never charge after this. */
export class StockUnavailableError extends Error {
  readonly productId: number | null;
  readonly requested: number;
  readonly available: number;

  constructor(message: string, productId: number | null, requested: number, available: number) {
    super(message);
    this.name = 'StockUnavailableError';
    this.productId = productId;
    this.requested = requested;
    this.available = available;
  }
}

/**
 * Hold stock in PayGlobe for this checkout BEFORE the customer is charged.
 *
 * This is the guard against the worst failure in the whole flow: two shoppers paying
 * for the last unit, with the loser's money already gone and a manual refund the only
 * way out. If the hold cannot be granted we stop here and the customer pays nothing.
 *
 * Holds expire server-side, so an abandoned checkout releases stock on its own.
 */
export async function reserveStock(
  externalOrderId: string,
  items: OrderItemInput[]
): Promise<void> {
  const apiKey = process.env.PAYGLOBE_API_KEY;
  if (!apiKey) {
    throw new Error('PAYGLOBE_API_KEY is not configured');
  }

  const scope = getScopeParams();
  const payload: Record<string, unknown> = {
    external_order_id: externalOrderId,
    external_source: 'ab_essentia',
    items: items.map((i) => ({
      product_id: Number(i.product_id),
      quantity: Number(i.quantity),
    })),
  };
  if (scope.store_id) {
    payload.store_id = Number(scope.store_id);
  }

  try {
    await axios.post(`${EXTERNAL_BASE}/stock-reservations/`, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      const data = error.response.data as {
        error?: string;
        product_id?: number | null;
        requested?: number;
        available?: number;
      };
      throw new StockUnavailableError(
        data?.error || 'One of the items in your cart just sold out',
        data?.product_id ?? null,
        data?.requested ?? 0,
        data?.available ?? 0
      );
    }
    throw error;
  }
}

/**
 * Release a checkout's stock hold. Best-effort: used when we fail before charging, so
 * an aborted checkout does not keep inventory off the shelf until the TTL lapses.
 */
export async function releaseStock(externalOrderId: string): Promise<void> {
  const apiKey = process.env.PAYGLOBE_API_KEY;
  if (!apiKey) return;

  try {
    await axios.delete(
      `${EXTERNAL_BASE}/stock-reservations/${encodeURIComponent(externalOrderId)}/`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        params: { external_source: 'ab_essentia' },
        timeout: 15000,
      }
    );
  } catch (error) {
    // The hold expires by itself, so this is not worth failing a request over.
    console.error(
      'Failed to release stock reservation',
      externalOrderId,
      error instanceof Error ? error.message : error
    );
  }
}

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
  items: Array<{ product_name: string; quantity: number; subtotal: string }>;
}

/**
 * Look up an order's status for a customer.
 *
 * The email is passed through to PayGlobe and must match the order, so a stranger
 * cannot page through order numbers and read other people's delivery addresses.
 * Returns null when there is no match, and the caller must not distinguish between
 * "no such order" and "wrong email" in what it shows the user.
 */
export async function getOrderStatus(
  orderRef: string,
  customerEmail: string
): Promise<OrderStatus | null> {
  const apiKey = process.env.PAYGLOBE_API_KEY;
  if (!apiKey) {
    throw new Error('PAYGLOBE_API_KEY is not configured');
  }

  const scope = getScopeParams();

  try {
    const res = await axios.get(
      `${EXTERNAL_BASE}/order-status/${encodeURIComponent(orderRef)}/`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        params: { ...scope, customer_email: customerEmail },
        timeout: 30000,
      }
    );
    return res.data as OrderStatus;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

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
  items: Array<{ product_name: string; quantity: number; subtotal: string }>;
}

/**
 * Ask PayGlobe to email a one-time sign-in code to the customer.
 *
 * Passwordless: our shoppers are guests with no account, so control of the
 * checkout inbox is the credential. PayGlobe rate-limits this and answers the
 * same way whether or not the email has orders, and so do we.
 */
export async function requestCustomerAccessCode(email: string): Promise<void> {
  const apiKey = process.env.PAYGLOBE_API_KEY;
  if (!apiKey) {
    throw new Error('PAYGLOBE_API_KEY is not configured');
  }

  await axios.post(
    `${EXTERNAL_BASE}/customer-access/request/`,
    { customer_email: email },
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      params: getScopeParams(),
      timeout: 30000,
    }
  );
}

export interface CustomerAccessGrant {
  accessToken: string;
  expiresIn: number;
}

/**
 * Exchange a code for a signed access token. Returns null for an invalid or
 * expired code - PayGlobe deliberately gives one answer for every failure.
 */
export async function verifyCustomerAccessCode(
  email: string,
  code: string
): Promise<CustomerAccessGrant | null> {
  const apiKey = process.env.PAYGLOBE_API_KEY;
  if (!apiKey) {
    throw new Error('PAYGLOBE_API_KEY is not configured');
  }

  try {
    const res = await axios.post(
      `${EXTERNAL_BASE}/customer-access/verify/`,
      { customer_email: email, code },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        params: getScopeParams(),
        timeout: 30000,
      }
    );
    const data = res.data as { access_token?: string; expires_in?: number };
    if (!data.access_token) {
      return null;
    }
    return { accessToken: data.access_token, expiresIn: data.expires_in ?? 7200 };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      return null;
    }
    throw error;
  }
}

/**
 * List the verified customer's orders. The token carries the email - the caller
 * cannot choose whose orders come back. Returns null when the token is invalid
 * or has expired so the caller can end the session.
 */
export async function getCustomerOrders(
  accessToken: string
): Promise<CustomerOrderSummary[] | null> {
  const apiKey = process.env.PAYGLOBE_API_KEY;
  if (!apiKey) {
    throw new Error('PAYGLOBE_API_KEY is not configured');
  }

  try {
    const res = await axios.get(`${EXTERNAL_BASE}/customer-orders/`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      params: { ...getScopeParams(), access_token: accessToken },
      timeout: 30000,
    });
    const data = res.data as { results?: CustomerOrderSummary[] };
    return data.results ?? [];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

export interface RecordOrderInput {
  external_order_id: string;
  paystack_reference: string;
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country?: string;
  shipping_phone: string;
  currency?: string;
  store_id?: number;
  /** What the customer actually paid, in minor units, per the verified transaction. */
  paid_amount?: number;
  shipping_method?: string;
  shipping_cost?: number;
  items: OrderItemInput[];
}

/**
 * Record an already-paid order in PayGlobe. PayGlobe re-computes the total from its
 * own product prices, decrements stock, and marks the order paid. It does NOT verify
 * the Paystack payment (that already happened here). Idempotent by external_order_id.
 */
export async function recordPaidOrder(input: RecordOrderInput) {
  const apiKey = process.env.PAYGLOBE_API_KEY;
  if (!apiKey) {
    throw new Error('PAYGLOBE_API_KEY is not configured');
  }

  const scope = getScopeParams();
  const storeId = input.store_id || (scope.store_id ? Number(scope.store_id) : undefined);

  const payload: Record<string, unknown> = {
    external_order_id: input.external_order_id,
    external_source: 'ab_essentia',
    paystack_reference: input.paystack_reference,
    customer_email: input.customer_email,
    customer_phone: input.customer_phone,
    customer_name: input.customer_name,
    shipping_address: input.shipping_address,
    shipping_city: input.shipping_city,
    shipping_state: input.shipping_state,
    shipping_postal_code: input.shipping_postal_code,
    shipping_country: (input.shipping_country || 'GH').toUpperCase(),
    shipping_phone: input.shipping_phone,
    currency: (input.currency || 'GHS').toUpperCase(),
    // Lets PayGlobe reconcile what was actually charged against what the order is
    // worth at its current prices, and flag any drift for the merchant.
    paid_amount: input.paid_amount,
    shipping_method: input.shipping_method || 'standard',
    shipping_cost: input.shipping_cost ?? 0,
    tax: 0,
    tax_rate: 0,
    items: input.items.map((i) => ({
      product_id: Number(i.product_id),
      quantity: Number(i.quantity),
    })),
  };

  if (storeId) {
    payload.store_id = storeId;
  }

  const res = await axios.post(`${EXTERNAL_BASE}/paystack-orders/`, payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 60000,
  });

  return res.data;
}
