import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, fulfillFromReference } from '@/lib/server/paystack';

/**
 * Paystack webhook.
 *
 * This is the reliability backbone of checkout: even if the customer closes their
 * browser after paying, Paystack calls this endpoint server-to-server, and we record
 * the order in PayGlobe here. Fulfillment is idempotent, so it is safe if the success
 * page also fulfills the same order.
 *
 * Configure this URL in the Paystack dashboard:
 *   https://<your-domain>/api/paystack/webhook
 */
export async function POST(request: NextRequest) {
  // Paystack signs the RAW body with HMAC SHA512 using the secret key.
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('Paystack webhook: invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Always acknowledge receipt quickly; only act on successful charges.
  if (event?.event !== 'charge.success') {
    // Disputes and refunds move money backwards. They are resolved manually in the
    // Paystack dashboard, but a silent chargeback leaves the order 'paid' in
    // PayGlobe while the money is gone - so at minimum these must be loud in logs
    // where an alert can find them.
    if (
      typeof event?.event === 'string' &&
      (event.event.startsWith('charge.dispute') || event.event.startsWith('refund'))
    ) {
      console.error(
        'PAYSTACK_MONEY_REVERSAL event=%s reference=%s - reconcile this order manually',
        event.event,
        event?.data?.reference
      );
    }
    return NextResponse.json({ status: 'ignored' });
  }

  const reference = event?.data?.reference;
  if (!reference) {
    return NextResponse.json({ status: 'ignored', reason: 'no reference' });
  }

  try {
    // The webhook is the reliability backbone: even if the customer closed their
    // browser, we have the money and must not leave them stranded. Auto-refund for
    // non-retryable failures means PayGlobe never has to touch the payout, but the
    // customer does not have to wait for a manual refund either.
    const result = await fulfillFromReference(reference, { autoRefund: true });

    if (result.status === 'foreign') {
      // A successful charge that did not come from this storefront (manual payment
      // link, invoice, another channel sharing the account). Not ours to touch -
      // acknowledge so Paystack stops retrying, but never refund or record it.
      return NextResponse.json({ status: 'ignored', reason: 'not an ab-essentia transaction' });
    }

    if (result.status === 'refunded') {
      console.error(
        'PAID_ORDER_REFUNDED reference=%s refund_id=%s error=%s',
        reference,
        result.refund_id,
        result.error
      );
      return NextResponse.json(
        { status: 'refunded', reference, refund_id: result.refund_id, error: result.error },
        { status: 200 }
      );
    }

    if (!result.success) {
      // A charge succeeded but the order did not land. Retryable failures (network,
      // PayGlobe 5xx) still return 500 so Paystack retries. Non-retryable failures
      // should have already been refunded above.
      console.error(
        'PAID_ORDER_NOT_RECORDED reference=%s status=%s error=%s',
        reference,
        result.status,
        result.error
      );
      return NextResponse.json(
        { status: 'fulfillment_failed', reference, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'processed', order_number: result.order_number ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook fulfillment failed';
    console.error('PAID_ORDER_NOT_RECORDED reference=%s error=%s', reference, message);
    // Return 500 so Paystack retries transient failures (e.g. PayGlobe briefly down).
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
