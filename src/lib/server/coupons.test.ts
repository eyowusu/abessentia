import { test } from 'node:test';
import assert from 'node:assert/strict';
import { couponDiscount, resolveCoupon } from './coupons';

const NOW = new Date('2025-10-15T12:00:00Z');

function withCodes(value: string | undefined, fn: () => void) {
  const prev = process.env.COUPON_CODES;
  if (value === undefined) delete process.env.COUPON_CODES;
  else process.env.COUPON_CODES = value;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env.COUPON_CODES;
    else process.env.COUPON_CODES = prev;
  }
}

test('resolveCoupon returns the code and percent for a valid entry', () => {
  withCodes('ESSENTIA10:10:2025-10-31', () => {
    const c = resolveCoupon('essentia10', NOW);
    assert.equal(c?.code, 'ESSENTIA10');
    assert.equal(c?.percent, 10);
    assert.equal(c?.expiresOn, '2025-10-31');
  });
});

test('resolveCoupon is case-insensitive and trims whitespace', () => {
  withCodes('SAVE20:20:', () => {
    assert.equal(resolveCoupon('  save20  ', NOW)?.percent, 20);
  });
});

test('resolveCoupon honours a code on its expiry date (inclusive) and rejects after', () => {
  withCodes('ESSENTIA10:10:2025-10-31', () => {
    assert.ok(resolveCoupon('ESSENTIA10', new Date('2025-10-31T20:00:00Z')));
    assert.equal(resolveCoupon('ESSENTIA10', new Date('2025-11-01T00:00:01Z')), null);
  });
});

test('resolveCoupon rejects a code that is not yet configured when env is unset', () => {
  withCodes(undefined, () => {
    assert.equal(resolveCoupon('ESSENTIA10', NOW), null);
  });
});

test('resolveCoupon rejects unknown, malformed and out-of-range entries', () => {
  withCodes('GOOD:10:,BAD:nope:,OVER:150:,ZERO:0:', () => {
    assert.equal(resolveCoupon('NOPE', NOW), null);
    assert.equal(resolveCoupon('BAD', NOW), null);
    assert.equal(resolveCoupon('OVER', NOW), null);
    assert.equal(resolveCoupon('ZERO', NOW), null);
    assert.equal(resolveCoupon('GOOD', NOW)?.percent, 10);
  });
});

test('resolveCoupon ignores a blank code', () => {
  withCodes('ESSENTIA10:10:', () => {
    assert.equal(resolveCoupon('   ', NOW), null);
  });
});

test('couponDiscount takes a percent off and rounds to 2dp', () => {
  assert.equal(couponDiscount(35, 10), 3.5);
  assert.equal(couponDiscount(100, 10), 10);
  assert.equal(couponDiscount(0, 10), 0);
  // 33.33 * 10% = 3.333 - must round to a chargeable amount, not float noise.
  assert.equal(couponDiscount(33.33, 10), 3.33);
});
