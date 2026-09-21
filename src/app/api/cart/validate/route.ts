import { NextRequest, NextResponse } from 'next/server';
import { checkCartItems, type OrderItemInput } from '@/lib/server/payglobe';
import { MAX_LINES_PER_ORDER } from '@/lib/order-limits';
import { RATE_LIMITS, rateLimit, rateLimitedResponse } from '@/lib/server/rate-limit';

/**
 * Re-check a cart against PayGlobe's live catalogue.
 *
 * The cart lives in the browser's localStorage, so prices and stock in it can be
 * arbitrarily stale. This lets the cart page correct itself and tell the customer what
 * changed BEFORE they reach the payment page, instead of surprising them with a
 * different amount at Paystack.
 */
export async function POST(request: NextRequest) {
  // Read-only, but it fans out to one PayGlobe request per cart line, so an unthrottled
  // caller can amplify a single request into many and exhaust the shared API key's quota
  // that real customers need.
  const limit = rateLimit(
    request,
    'cart-validate',
    RATE_LIMITS.cartValidate.limit,
    RATE_LIMITS.cartValidate.windowSeconds
  );
  if (!limit.ok) {
    return rateLimitedResponse(limit);
  }

  try {
    const body = await request.json();
    const items: OrderItemInput[] = Array.isArray(body?.items)
      ? body.items.map((i: { product_id: string | number; quantity: string | number }) => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity),
        }))
      : [];

    if (items.length === 0) {
      return NextResponse.json({ lines: [] });
    }

    // Bound the fan-out. A real cart cannot exceed what an order may contain, so anything
    // larger is either a bug or an attempt to turn one request into hundreds.
    if (items.length > MAX_LINES_PER_ORDER) {
      return NextResponse.json(
        { error: `A cart can contain at most ${MAX_LINES_PER_ORDER} different products.` },
        { status: 400 }
      );
    }

    const lines = await checkCartItems(items);
    return NextResponse.json({ lines });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to validate cart';
    console.error('Cart validation error:', message);
    return NextResponse.json({ error: 'Could not refresh your cart' }, { status: 500 });
  }
}
