import axios from 'axios';
import crypto from 'crypto';
import { recordPaidOrder, type OrderItemInput } from './payglobe';

/**
 * Server-only Paystack helpers.
 *
 * ALL payment responsibility lives here, on the AB Essentia merchant side, using the
 * merchant's OWN Paystack account (PAYSTACK_SECRET_KEY). PayGlobe is never involved in
 * collecting or verifying money.
 */

const PAYSTACK_BASE = 'https://api.paystack.co';

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }
  return key;
}

/** Order details we carry inside Paystack metadata so fulfillment never depends on the browser. */
export interface PaystackOrderMetadata {
  external_order_id: string;
  source: 'ab_essentia';
  expected_amount_minor: number;
  currency: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  shipping_phone: string;
  items: OrderItemInput[];
}

export interface InitializeInput {
  email: string;
  amountMinor: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: PaystackOrderMetadata;
}

export async function initializeTransaction(input: InitializeInput) {
  const res = await axios.post(
    `${PAYSTACK_BASE}/transaction/initialize`,
    {
      email: input.email,
      amount: input.amountMinor,
      currency: input.currency.toUpperCase(),
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    },
    {
      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const data = res.data;
  if (!data?.status || !data?.data?.authorization_url) {
    throw new Error(data?.message || 'Paystack initialization failed');
  }
  return {
    authorization_url: data.data.authorization_url as string,
    reference: data.data.reference as string,
    access_code: data.data.access_code as string,
  };
}

export interface VerifiedTransaction {
  status: string;
  amountMinor: number;
  currency: string;
  reference: string;
  metadata: PaystackOrderMetadata | null;
}

export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  const res = await axios.get(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${getSecretKey()}` },
      timeout: 30000,
    }
  );

  const data = res.data?.data;
  if (!res.data?.status || !data) {
    throw new Error(res.data?.message || 'Paystack verification failed');
  }

  return {
    status: data.status,
    amountMinor: Number(data.amount ?? 0),
    currency: String(data.currency ?? '').toUpperCase(),
    reference: String(data.reference ?? reference),
    metadata: (data.metadata as PaystackOrderMetadata) ?? null,
  };
}

/**
 * Verify Paystack webhook signature (HMAC SHA512 of the raw request body using the secret key).
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const hash = crypto
    .createHmac('sha512', getSecretKey())
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

export interface FulfillResult {
  success: boolean;
  status: 'succeeded' | 'not_paid' | 'error';
  order_number?: string | null;
  order_id?: string | null;
  reference: string;
  error?: string;
}

/**
 * The single source of truth for turning a verified Paystack payment into a PayGlobe order.
 * Called by BOTH the success page (customer returns) and the webhook (server-to-server),
 * so an order is never lost even if the customer closes their browser. Idempotent because
 * PayGlobe deduplicates by external_order_id.
 */
export async function fulfillFromReference(reference: string): Promise<FulfillResult> {
  const tx = await verifyTransaction(reference);

  if (tx.status !== 'success') {
    return { success: false, status: 'not_paid', reference, error: `Payment status is ${tx.status}` };
  }

  const meta = tx.metadata;
  if (!meta || !meta.external_order_id || !Array.isArray(meta.items) || meta.items.length === 0) {
    return {
      success: false,
      status: 'error',
      reference,
      error: 'Transaction metadata is missing order details',
    };
  }

  // Defense-in-depth: the amount actually paid must match the authoritative amount
  // we computed (and stored in metadata) at initiation time.
  if (meta.expected_amount_minor && tx.amountMinor !== meta.expected_amount_minor) {
    return {
      success: false,
      status: 'error',
      reference,
      error: `Paid amount (${tx.amountMinor}) does not match expected (${meta.expected_amount_minor})`,
    };
  }

  const result = await recordPaidOrder({
    external_order_id: meta.external_order_id,
    paystack_reference: reference,
    customer_email: meta.customer_email,
    customer_phone: meta.customer_phone,
    customer_name: meta.customer_name,
    shipping_address: meta.shipping_address,
    shipping_city: meta.shipping_city,
    shipping_state: meta.shipping_state,
    shipping_postal_code: meta.shipping_postal_code,
    shipping_country: meta.shipping_country,
    shipping_phone: meta.shipping_phone,
    currency: meta.currency || tx.currency,
    items: meta.items,
  });

  return {
    success: Boolean(result?.success),
    status: 'succeeded',
    order_number: result?.order_number ?? null,
    order_id: result?.order_id ?? null,
    reference,
  };
}
