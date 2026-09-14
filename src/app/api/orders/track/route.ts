import { NextRequest, NextResponse } from 'next/server';
import { getOrderStatus } from '@/lib/server/payglobe';

/**
 * Look up an order for a customer.
 *
 * Runs server-side so the PayGlobe API key never reaches the browser. Both the order
 * reference AND the email used at checkout are required: order references are
 * guessable, and without the email check anyone could enumerate them and read other
 * customers' delivery details.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderRef = typeof body?.order_ref === 'string' ? body.order_ref.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!orderRef || !email) {
      return NextResponse.json(
        { error: 'Please enter both your order number and the email you used at checkout.' },
        { status: 400 }
      );
    }

    // PayGlobe resolves order numbers, its own order ids, our external order id and the
    // Paystack payment reference, so whatever the customer kept hold of will match.

    const order = await getOrderStatus(orderRef, email);

    if (!order) {
      // One message for "no such order" and "wrong email" alike, so this cannot be
      // used to work out which order numbers are real.
      return NextResponse.json(
        {
          error:
            'We could not find an order matching those details. ' +
            'Please check the order number and email address and try again.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to look up order';
    console.error('Order tracking error:', message);
    return NextResponse.json(
      { error: 'We could not look up your order right now. Please try again shortly.' },
      { status: 500 }
    );
  }
}
