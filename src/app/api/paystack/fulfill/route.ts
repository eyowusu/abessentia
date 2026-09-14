import { NextRequest, NextResponse } from 'next/server';
import { fulfillFromReference } from '@/lib/server/paystack';

/**
 * Confirm a Paystack payment (by reference) and record the order in PayGlobe.
 *
 * The order details are read from the VERIFIED Paystack transaction metadata, not from
 * the client, so the browser cannot tamper with items, amounts, or shipping after payment.
 * This endpoint is idempotent and is safe to call from the success page even if the
 * webhook has already fulfilled the order.
 */
export async function POST(request: NextRequest) {
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
