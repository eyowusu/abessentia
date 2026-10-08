import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertWithinOrderLimits,
  OrderLimitError,
  MAX_QUANTITY_PER_LINE,
  MAX_LINES_PER_ORDER,
  MAX_UNITS_PER_ORDER,
} from './order-limits';

test('a valid order passes', () => {
  assert.doesNotThrow(() =>
    assertWithinOrderLimits([
      { product_id: 1, quantity: 2 },
      { product_id: 2, quantity: 3 },
    ])
  );
});

test('an order exactly at every ceiling passes', () => {
  const items = Array.from({ length: MAX_LINES_PER_ORDER }, (_, i) => ({
    product_id: i + 1,
    quantity: 2,
  }));
  // 20 lines * 2 = 40 units, under the 50-unit cap; each line under 10.
  assert.doesNotThrow(() => assertWithinOrderLimits(items));
});

test('a single line over the per-product cap is rejected', () => {
  assert.throws(
    () => assertWithinOrderLimits([{ product_id: 7, quantity: MAX_QUANTITY_PER_LINE + 1 }]),
    (err: unknown) =>
      err instanceof OrderLimitError &&
      err.productId === 7 &&
      err.limit === MAX_QUANTITY_PER_LINE
  );
});

test('duplicate lines for one product are aggregated before the per-product cap', () => {
  // The attack this aggregation exists to stop: five lines of 10 each is 50 units
  // held for one product, while every individual line looks valid.
  const lines = Array.from({ length: 5 }, () => ({
    product_id: 42,
    quantity: MAX_QUANTITY_PER_LINE,
  }));
  assert.throws(
    () => assertWithinOrderLimits(lines),
    (err: unknown) => err instanceof OrderLimitError && err.productId === 42
  );
});

test('too many distinct products is rejected', () => {
  const items = Array.from({ length: MAX_LINES_PER_ORDER + 1 }, (_, i) => ({
    product_id: i + 1,
    quantity: 1,
  }));
  assert.throws(
    () => assertWithinOrderLimits(items),
    (err: unknown) => err instanceof OrderLimitError && err.limit === MAX_LINES_PER_ORDER
  );
});

test('too many total units is rejected even when every line is under its cap', () => {
  // 6 products x 10 units = 60 > 50 total, no single line over 10.
  const items = Array.from({ length: 6 }, (_, i) => ({
    product_id: i + 1,
    quantity: MAX_QUANTITY_PER_LINE,
  }));
  assert.throws(
    () => assertWithinOrderLimits(items),
    (err: unknown) => err instanceof OrderLimitError && err.limit === MAX_UNITS_PER_ORDER
  );
});
