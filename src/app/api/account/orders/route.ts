import { NextRequest, NextResponse } from 'next/server';
import { getCustomerOrders } from '@/lib/server/payglobe';
import { CUSTOMER_SESSION_COOKIE } from '@/lib/server/customer-session';

/**
 * Order history for the signed-in customer.
 *
 * The access token in the session cookie carries the verified email, so the
 * caller cannot ask for anyone else's orders.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    const orders = await getCustomerOrders(token);
    if (orders === null) {
      // Token expired or invalid: end the session rather than erroring forever.
      const response = NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
      response.cookies.delete(CUSTOMER_SESSION_COOKIE);
      return response;
    }
    return NextResponse.json({ orders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load orders';
    console.error('Customer orders error:', message);
    return NextResponse.json(
      { error: 'We could not load your orders right now. Please try again shortly.' },
      { status: 500 }
    );
  }
}
