import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import axios from 'axios';
import {
  fulfillFromReference,
  isNonRetryableError,
  verifyWebhookSignature,
} from './paystack';

// Read lazily inside the functions under test, so setting them here is enough.
process.env.PAYSTACK_SECRET_KEY = 'sk_test_dummy_for_tests';
process.env.PAYGLOBE_API_KEY = 'pg_test_dummy_for_tests';

afterEach(() => mock.restoreAll());

const OUR_METADATA = {
  source: 'ab_essentia',
  external_order_id: 'ext-order-1',
  expected_amount_minor: 10000,
  currency: 'GHS',
  shipping_address: '1 Street',
  shipping_city: 'Accra',
  shipping_state: 'Greater Accra',
  shipping_postal_code: 'GA-000-0000',
  shipping_country: 'GH',
  shipping_phone: '0240000000',
  items: [{ product_id: 1, quantity: 1 }],
};

function verifyPayload(dataOverrides: Record<string, unknown> = {}) {
  return {
    data: {
      status: true,
      data: {
        status: 'success',
        amount: 10000,
        currency: 'GHS',
        reference: 'abess-ext-order-1',
        metadata: OUR_METADATA,
        ...dataOverrides,
      },
    },
  };
}

/** Mimic the axios response shape consumed by the code under test. */
function axiosError(status: number, data?: unknown): Error {
  const err = new Error(`Request failed with status code ${status}`) as Error & {
    isAxiosError: boolean;
    response: { status: number; data?: unknown };
  };
  err.isAxiosError = true;
  err.response = { status, data };
  return err;
}

type GetImpl = (url: string, config?: unknown) => Promise<unknown>;
type PostImpl = (url: string, body?: unknown, config?: unknown) => Promise<unknown>;

function mockHttp(getImpl: GetImpl, postImpl: PostImpl) {
  const getSpy = mock.method(axios, 'get', getImpl);
  const postSpy = mock.method(axios, 'post', postImpl);
  return { getSpy, postSpy };
}

const refundListEmpty = async (url: string) => {
  if (url.includes('/refund')) return { data: { status: true, data: [] } };
  throw new Error(`unexpected GET ${url}`);
};

const refundCreated = async (url: string) => {
  if (url.endsWith('/refund'))
    return { data: { status: true, data: { id: 'rf_1', amount: 10000, status: 'pending' } } };
  throw new Error(`unexpected POST ${url}`);
};

// ---------------------------------------------------------------------------
// verifyWebhookSignature
// ---------------------------------------------------------------------------

test('webhook signature: valid HMAC accepted, everything else rejected', () => {
  const body = JSON.stringify({ event: 'charge.success', data: { reference: 'x' } });
  const good = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex');

  assert.equal(verifyWebhookSignature(body, good), true);
  assert.equal(verifyWebhookSignature(body, 'deadbeef'), false);
  assert.equal(verifyWebhookSignature(body, null), false);
  assert.equal(verifyWebhookSignature('tampered', good), false);
});

// ---------------------------------------------------------------------------
// isNonRetryableError - the predicate that decides whether money moves backwards
// ---------------------------------------------------------------------------

test('isNonRetryableError: only explicit non-retryable HTTP 4xx may trigger a refund', () => {
  // No response at all (DNS/timeout/deploy): could not be more retryable.
  const noResponse = new Error('network down') as Error & { isAxiosError: boolean };
  noResponse.isAxiosError = true;
  assert.equal(isNonRetryableError(noResponse), false);

  // Explicit retryable statuses.
  for (const status of [408, 409, 425, 429]) {
    assert.equal(isNonRetryableError(axiosError(status)), false, `status ${status}`);
  }

  // Business-rule rejections are final.
  for (const status of [400, 404, 422]) {
    assert.equal(isNonRetryableError(axiosError(status)), true, `status ${status}`);
  }

  // ...unless PayGlobe explicitly says retryable.
  assert.equal(
    isNonRetryableError(axiosError(400, { retryable: true })),
    false
  );

  // 5xx means PayGlobe is having a bad moment - the webhook will redeliver.
  for (const status of [500, 502, 503]) {
    assert.equal(isNonRetryableError(axiosError(status)), false, `status ${status}`);
  }

  // A plain Error (e.g. missing PAYGLOBE_API_KEY) must never refund: fixable
  // inside the webhook retry window, and a refund cannot be un-sent.
  assert.equal(isNonRetryableError(new Error('config missing')), false);
});

// ---------------------------------------------------------------------------
// fulfillFromReference
// ---------------------------------------------------------------------------

test('fulfill: an unpaid transaction is reported, never recorded, never refunded', async () => {
  const { postSpy } = mockHttp(
    async (url) => {
      if (url.includes('/transaction/verify/')) return verifyPayload({ status: 'failed' });
      throw new Error(`unexpected GET ${url}`);
    },
    async (url) => {
      throw new Error(`unexpected POST ${url}`);
    }
  );

  const result = await fulfillFromReference('abess-ext-order-1', { autoRefund: true });
  assert.equal(result.status, 'not_paid');
  assert.equal(result.success, false);
  assert.equal(postSpy.mock.callCount(), 0);
});

test('fulfill: foreign transactions are ignored even if they carry an external_order_id', async () => {
  const { postSpy } = mockHttp(
    async (url) => {
      if (url.includes('/transaction/verify/'))
        return verifyPayload({
          reference: 'manual-payment-link',
          metadata: { source: 'other_channel', external_order_id: 'ext-foreign' },
        });
      throw new Error(`unexpected GET ${url}`);
    },
    async (url) => {
      throw new Error(`unexpected POST ${url}`);
    }
  );

  const result = await fulfillFromReference('manual-payment-link', { autoRefund: true });
  assert.equal(result.status, 'foreign');
  assert.equal(postSpy.mock.callCount(), 0);
});

test('fulfill: our paid transaction is recorded in PayGlobe and returns the order number', async () => {
  mockHttp(
    async (url) => {
      if (url.includes('/transaction/verify/')) return verifyPayload();
      throw new Error(`unexpected GET ${url}`);
    },
    async (url) => {
      if (url.includes('/paystack-orders/'))
        return { data: { order_number: 'AB-1001', order_id: '77' } };
      throw new Error(`unexpected POST ${url}`);
    }
  );

  const result = await fulfillFromReference('abess-ext-order-1', { autoRefund: true });
  assert.equal(result.success, true);
  assert.equal(result.status, 'succeeded');
  assert.equal(result.order_number, 'AB-1001');
});

test('fulfill: paid amount must equal the amount computed at initiation', async () => {
  const { postSpy } = mockHttp(
    async (url) => {
      if (url.includes('/transaction/verify/'))
        return verifyPayload({ amount: 5000 }); // paid half of expected
      return refundListEmpty(url);
    },
    refundCreated
  );

  const result = await fulfillFromReference('abess-ext-order-1', { autoRefund: true });
  assert.equal(result.status, 'refunded');
  assert.equal(result.refund_id, 'rf_1');
  // The order was never recorded.
  assert.ok(
    postSpy.mock.calls.every(
      (c) => typeof c.arguments[0] === 'string' && !(c.arguments[0] as string).includes('paystack-orders')
    )
  );
});

test('fulfill: a retryable PayGlobe failure throws so the caller retries - no refund', async () => {
  // 409 order_in_flight: the webhook and success page arriving together. The
  // losing call must NOT refund - the winner is recording the order right now.
  const { postSpy } = mockHttp(
    async (url) => {
      if (url.includes('/transaction/verify/')) return verifyPayload();
      return refundListEmpty(url);
    },
    async (url) => {
      if (url.includes('/paystack-orders/')) throw axiosError(409, { code: 'order_in_flight' });
      return refundCreated(url);
    }
  );

  await assert.rejects(fulfillFromReference('abess-ext-order-1', { autoRefund: true }));
  assert.ok(
    postSpy.mock.calls.every(
      (c) => !(c.arguments[0] as string).endsWith('/refund')
    )
  );
});

test('fulfill: a non-retryable PayGlobe rejection auto-refunds the customer', async () => {
  const { postSpy } = mockHttp(
    async (url) => {
      if (url.includes('/transaction/verify/')) return verifyPayload();
      return refundListEmpty(url);
    },
    async (url) => {
      if (url.includes('/paystack-orders/')) throw axiosError(400, { error: 'unknown product' });
      return refundCreated(url);
    }
  );

  const result = await fulfillFromReference('abess-ext-order-1', { autoRefund: true });
  assert.equal(result.success, false);
  assert.equal(result.status, 'refunded');
  assert.equal(result.refund_id, 'rf_1');
  // Proof the refund was actually posted to Paystack, not just reported.
  assert.ok(
    postSpy.mock.calls.some((c) => (c.arguments[0] as string).endsWith('/refund'))
  );
});

test('fulfill: an existing refund is reused instead of issuing a duplicate', async () => {
  mockHttp(
    async (url) => {
      if (url.includes('/transaction/verify/')) return verifyPayload();
      if (url.includes('/refund'))
        return {
          data: {
            status: true,
            data: [
              { id: 'rf_existing', status: 'processed', amount: 10000, transaction: 'abess-ext-order-1' },
            ],
          },
        };
      throw new Error(`unexpected GET ${url}`);
    },
    async (url) => {
      if (url.includes('/paystack-orders/')) throw axiosError(400, { error: 'unknown product' });
      throw new Error(`unexpected POST ${url} - refund should not be re-posted`);
    }
  );

  const result = await fulfillFromReference('abess-ext-order-1', { autoRefund: true });
  assert.equal(result.status, 'refunded');
  assert.equal(result.refund_id, 'rf_existing');
});
