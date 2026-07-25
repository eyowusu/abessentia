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
    return NextResponse.json({ status: 'ignored' });
  }

  const reference = event?.data?.reference;
  if (!reference) {
    return NextResponse.json({ status: 'ignored', reason: 'no reference' });
  }

  try {
    const result = await fulfillFromReference(reference);
    if (!result.success) {
      // Log but still return 200 so Paystack does not hammer retries for
      // permanent errors; investigate via logs / PayGlobe reconciliation.
      console.error('Paystack webhook fulfillment did not succeed:', result.error);
    }
    return NextResponse.json({ status: 'processed', order_number: result.order_number ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook fulfillment failed';
    console.error('Paystack webhook error:', message);
    // Return 500 so Paystack retries transient failures (e.g. PayGlobe briefly down).
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
