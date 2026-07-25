import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
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

    const result = await fulfillFromReference(reference);

    if (!result.success) {
      const status = result.status === 'not_paid' ? 402 : 400;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const axiosError = axios.isAxiosError(error) ? error : undefined;
    console.error('PayGlobe fulfill error:', axiosError?.response?.data || (error as Error).message);
    const message =
      (axiosError?.response?.data as { error?: string })?.error ||
      (axiosError?.response?.data as { detail?: string })?.detail ||
      axiosError?.message ||
      (error instanceof Error ? error.message : 'Failed to fulfill order');
    const status = axiosError?.response?.status || 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
