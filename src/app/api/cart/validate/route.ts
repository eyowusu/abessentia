import { NextRequest, NextResponse } from 'next/server';
import { checkCartItems, type OrderItemInput } from '@/lib/server/payglobe';

/**
 * Re-check a cart against PayGlobe's live catalogue.
 *
 * The cart lives in the browser's localStorage, so prices and stock in it can be
 * arbitrarily stale. This lets the cart page correct itself and tell the customer what
 * changed BEFORE they reach the payment page, instead of surprising them with a
 * different amount at Paystack.
 */
export async function POST(request: NextRequest) {
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

    const lines = await checkCartItems(items);
    return NextResponse.json({ lines });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to validate cart';
    console.error('Cart validation error:', message);
    return NextResponse.json({ error: 'Could not refresh your cart' }, { status: 500 });
  }
}
