/**
 * Hard ceilings on what a single order may contain.
 *
 * These are the durable half of the denial-of-inventory defence (the per-IP throttle in
 * `rate-limit.ts` is the other half). A stock hold is placed before payment, so without
 * a quantity ceiling one request asking for a product's entire stock takes that product
 * off sale for the whole reservation TTL - and the request looks completely legitimate,
 * because it is asking for an amount the shop genuinely has.
 *
 * Capping the quantity means the worst a single request can do is freeze
 * MAX_QUANTITY_PER_LINE units, which turns a one-shot shop-killer into something the
 * throttle can actually contain.
 *
 * These are business rules, not security theatre: AB Essentia sells retail skincare, so
 * nobody legitimately orders 40 of one balm through the storefront. A genuine bulk buyer
 * should be talking to the merchant directly.
 *
 * Shared between the browser and the server (like `shipping.ts`) so the quantity stepper
 * cannot offer a basket the server will then refuse. The server-side check in
 * `priceOrder` remains the authority; the client use is purely to avoid dead controls.
 */

/** Maximum units of any one product in a single order. */
export const MAX_QUANTITY_PER_LINE = 10;

/** Maximum distinct products in a single order. */
export const MAX_LINES_PER_ORDER = 20;

/** Maximum total units across the whole order. */
export const MAX_UNITS_PER_ORDER = 50;

export class OrderLimitError extends Error {
  readonly code = 'order_limit_exceeded';
  readonly productId: number | null;
  readonly limit: number;

  constructor(message: string, limit: number, productId: number | null = null) {
    super(message);
    this.name = 'OrderLimitError';
    this.limit = limit;
    this.productId = productId;
  }
}

export interface QuantityLimitedItem {
  product_id: number;
  quantity: number;
}

/**
 * Reject an order that exceeds any ceiling.
 *
 * Throws rather than silently clamping: quietly reducing someone's basket and then
 * charging them for less than they asked for is a worse experience than telling them
 * plainly, and it would also hide abuse from the logs.
 */
export function assertWithinOrderLimits(items: QuantityLimitedItem[]): void {
  if (items.length > MAX_LINES_PER_ORDER) {
    throw new OrderLimitError(
      `An order can contain at most ${MAX_LINES_PER_ORDER} different products. ` +
        `Please split your basket into separate orders.`,
      MAX_LINES_PER_ORDER
    );
  }

  // Aggregate per product BEFORE applying the per-product ceiling. A client can send
  // the same product_id on several lines, and checking each line on its own would let
  // [10, 10, 10, 10, 10] of one product walk through as five "valid" lines - 50 units
  // held, exactly what this cap exists to prevent. PayGlobe merges duplicate ids when
  // reserving, so the aggregation here mirrors what the hold actually covers.
  const perProduct = new Map<number, number>();
  let totalUnits = 0;
  for (const item of items) {
    const merged = (perProduct.get(item.product_id) ?? 0) + item.quantity;
    perProduct.set(item.product_id, merged);
    totalUnits += item.quantity;
  }

  for (const [productId, quantity] of perProduct) {
    if (quantity > MAX_QUANTITY_PER_LINE) {
      throw new OrderLimitError(
        `You can order at most ${MAX_QUANTITY_PER_LINE} of any single item online. ` +
          `Please contact us directly for larger quantities.`,
        MAX_QUANTITY_PER_LINE,
        productId
      );
    }
  }

  if (totalUnits > MAX_UNITS_PER_ORDER) {
    throw new OrderLimitError(
      `An order can contain at most ${MAX_UNITS_PER_ORDER} items in total. ` +
        `Please contact us directly for larger quantities.`,
      MAX_UNITS_PER_ORDER
    );
  }
}
