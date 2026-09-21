import { NextRequest, NextResponse } from 'next/server';
import { fulfillFromReference } from '@/lib/server/paystack';
import { RATE_LIMITS, rateLimit, rateLimitedResponse } from '@/lib/server/rate-limit';

/**
 * Confirm a Paystack payment (by reference) and record the order in PayGlobe.
 *
 * The order details are read from the VERIFIED Paystack transaction metadata, not from
 * the client, so the browser cannot tamper with items, amounts, or shipping after payment.
 * This endpoint is idempotent and is safe to call from the success page even if the
 * webhook has already fulfilled the order.
 */
export async function POST(request: NextRequest) {
  // Only genuinely-paid references can ever fulfill anything here, so this is not a
  // security boundary - but it is an unauthenticated endpoint that makes outbound
  // Paystack calls, and the success page needs only a handful of attempts.
  //
  // The limit is deliberately well above the success page's 3 retries so a customer on a
  // flaky connection is never turned away from confirming an order they have paid for.
  const limit = rateLimit(
    request,
    'fulfill',
    RATE_LIMITS.fulfill.limit,
    RATE_LIMITS.fulfill.windowSeconds
  );
  if (!limit.ok) {
    return rateLimitedResponse(limit);
  }

  try {
    const body = await request.json();
    const reference = typeof body?.reference === 'string' ? body.reference.trim() : '';

    if (!reference) {
      return NextResponse.json({ error: 'reference is required' }, { status: 400 });
    }

    // Allow the success-page path to auto-refund too; a refunded result is returned
    // immediately and the list-refund guard prevents duplicate Paystack refunds if the
    // webhook already handled it.
    const result = await fulfillFromReference(reference, { autoRefund: true });

    if (!result.success) {
      if (result.status === 'foreign') {
        return NextResponse.json(
          { success: false, error: 'This transaction did not originate from this store' },
          { status: 400 }
        );
      }
      if (result.status === 'refunded') {
        return NextResponse.json(
          {
            success: false,
            status: 'refunded',
            reference,
            refund_id: result.refund_id,
            error: result.error,
          },
          { status: 200 }
        );
      }
      const status = result.status === 'not_paid' ? 402 : 400;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('PayGlobe fulfill error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fulfill order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
