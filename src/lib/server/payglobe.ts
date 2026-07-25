import axios from 'axios';

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
    stock: Number(p?.stock_quantity ?? 0),
  };
}

/**
 * Build an authoritative priced order from a list of {product_id, quantity}.
 * Prices come from PayGlobe, never from the browser.
 */
export async function priceOrder(items: OrderItemInput[]): Promise<PricedOrder> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one order item is required');
  }

  const priced: AuthoritativeItem[] = [];
  let subtotal = 0;

  for (const item of items) {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error(`Invalid product_id: ${item.product_id}`);
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for product ${productId}`);
    }

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
    shipping_method: 'standard',
    shipping_cost: 0,
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
