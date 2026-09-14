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
  shipping_method?: string;
  shipping_cost?: number;
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

export interface RefundResult {
  success: boolean;
  refund_id?: string;
  amount_minor?: number;
  status?: string;
  error?: string;
}

export interface FulfillResult {
  success: boolean;
  status: 'succeeded' | 'not_paid' | 'error' | 'refunded';
  order_number?: string | null;
  order_id?: string | null;
  reference: string;
  error?: string;
  refund_id?: string;
}

export interface FulfillOptions {
  /**
   * If true and the order cannot be fulfilled for a non-retryable reason,
   * automatically refund the customer through Paystack. This is intended for the
   * server-to-server webhook path, which must not leave a paid customer stranded.
   */
  autoRefund?: boolean;
}

function isAxiosErrorWithResponse(error: unknown): error is {
  message: string;
  response: { status: number; data?: { message?: string; error?: string; detail?: string } };
} {
  return axios.isAxiosError(error) && error.response !== undefined;
}

function isNonRetryableError(error: unknown): boolean {
  if (isAxiosErrorWithResponse(error)) {
    const status = error.response.status;
    // 408 / 429 are transient; anything else 4xx from PayGlobe is a business rule failure.
    if (status === 408 || status === 429) return false;
    if (status >= 400 && status < 500) return true;
    return false;
  }
  // A plain Error thrown before the PayGlobe call means the inputs are bad, not the network.
  return error instanceof Error;
}

function formatError(error: unknown): string {
  if (isAxiosErrorWithResponse(error)) {
    const data = error.response.data;
    return data?.message || data?.error || data?.detail || error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

interface PaystackRefundListItem {
  id: string;
  status: string;
  amount: number;
  transaction: string | { reference?: string };
}

/**
 * Initiate a full or partial refund through Paystack.
 *
 * First checks for an existing refund for this transaction so a retried webhook does
 * not accidentally issue a duplicate refund.
 */
export async function refundTransaction(reference: string, amountMinor?: number): Promise<RefundResult> {
  try {
    const listRes = await axios.get(`${PAYSTACK_BASE}/refund`, {
      headers: { Authorization: `Bearer ${getSecretKey()}` },
      params: { transaction: reference, perPage: 10 },
      timeout: 30000,
    });
    const refunds = (listRes.data?.data || []) as PaystackRefundListItem[];
    const existing = refunds.find((r) => {
      const tx = r.transaction;
      const txRef = typeof tx === 'string' ? tx : tx?.reference;
      return (
        txRef === reference &&
        ['pending', 'processed', 'success', 'completed'].includes(String(r.status).toLowerCase())
      );
    });
    if (existing) {
      return {
        success: true,
        refund_id: existing.id,
        amount_minor: existing.amount,
        status: existing.status,
      };
    }
  } catch (e) {
    console.error('PAYSTACK_REFUND_LIST_FAILED', reference, e instanceof Error ? e.message : e);
  }

  try {
    const body: { transaction: string; amount?: number } = { transaction: reference };
    if (typeof amountMinor === 'number' && amountMinor > 0) {
      body.amount = amountMinor;
    }
    const res = await axios.post(`${PAYSTACK_BASE}/refund`, body, {
      headers: { Authorization: `Bearer ${getSecretKey()}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    const data = res.data?.data;
    return {
      success: Boolean(res.data?.status && data),
      refund_id: data?.id,
      amount_minor: data?.amount,
      status: data?.status,
      error: res.data?.status ? undefined : res.data?.message,
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
}

async function handleFulfillmentFailure(
  reference: string,
  tx: VerifiedTransaction,
  message: string,
  autoRefund: boolean
): Promise<FulfillResult> {
  if (autoRefund) {
    const refund = await refundTransaction(reference, tx.amountMinor);
    if (refund.success) {
      return {
        success: false,
        status: 'refunded',
        reference,
        error: `We could not finalise your order, so a refund of ${(tx.amountMinor / 100).toFixed(2)} ${tx.currency} has been initiated. It should reach your account within a few business days.`,
        refund_id: refund.refund_id,
      };
    }
    return {
      success: false,
      status: 'error',
      reference,
      error: `Order could not be fulfilled and the automatic refund could not be completed: ${refund.error || message}`,
    };
  }
  return { success: false, status: 'error', reference, error: message };
}

/**
 * The single source of truth for turning a verified Paystack payment into a PayGlobe order.
 * Called by BOTH the success page (customer returns) and the webhook (server-to-server),
 * so an order is never lost even if the customer closes their browser. Idempotent because
 * PayGlobe deduplicates by external_order_id.
 *
 * When `autoRefund` is true, any non-retryable failure (e.g. PayGlobe rejects because the
 * product just sold out, or the amount mismatches) refunds the customer through Paystack
 * before returning. Retryable failures (network blips, PayGlobe 5xx) are still thrown so the
 * caller can retry.
 */
export async function fulfillFromReference(
  reference: string,
  options: FulfillOptions = {}
): Promise<FulfillResult> {
  const { autoRefund = false } = options;
  let tx: VerifiedTransaction | undefined;

  try {
    tx = await verifyTransaction(reference);
  } catch (error) {
    // Cannot verify the payment yet; let the webhook retry rather than guessing about a refund.
    throw new Error(formatError(error));
  }

  if (tx.status !== 'success') {
    return { success: false, status: 'not_paid', reference, error: `Payment status is ${tx.status}` };
  }

  const meta = tx.metadata;
  if (!meta || !meta.external_order_id || !Array.isArray(meta.items) || meta.items.length === 0) {
    return handleFulfillmentFailure(
      reference,
      tx,
      'Transaction metadata is missing order details',
      autoRefund
    );
  }

  // Defense-in-depth: the amount actually paid must match the authoritative amount
  // we computed (and stored in metadata) at initiation time.
  if (meta.expected_amount_minor && tx.amountMinor !== meta.expected_amount_minor) {
    return handleFulfillmentFailure(
      reference,
      tx,
      `Paid amount (${tx.amountMinor}) does not match expected (${meta.expected_amount_minor})`,
      autoRefund
    );
  }

  try {
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
      paid_amount: tx.amountMinor,
      shipping_method: meta.shipping_method,
      shipping_cost: meta.shipping_cost,
      items: meta.items,
    });

    return {
      success: true,
      status: 'succeeded',
      order_number: result?.order_number ?? null,
      order_id: result?.order_id ?? null,
      reference,
    };
  } catch (error) {
    const message = formatError(error);
    if (!tx) {
      // Should not happen because verifyTransaction succeeded, but keep retry semantics.
      throw new Error(message);
    }
    if (autoRefund && isNonRetryableError(error)) {
      return handleFulfillmentFailure(reference, tx, message, autoRefund);
    }
    throw new Error(message);
  }
}
