import { test } from 'node:test';
import assert from 'node:assert/strict';
import { couponDiscount, resolveAutoPromo, resolveCoupon } from './coupons';

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

function withPromo(
  env: { percent?: string; expires?: string; label?: string },
  fn: () => void
) {
  const prev = {
    percent: process.env.PROMO_AUTO_PERCENT,
    expires: process.env.PROMO_AUTO_EXPIRES,
    label: process.env.PROMO_AUTO_LABEL,
  };
  const set = (key: string, value: string | undefined) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };
  set('PROMO_AUTO_PERCENT', env.percent);
  set('PROMO_AUTO_EXPIRES', env.expires);
  set('PROMO_AUTO_LABEL', env.label);
  try {
    fn();
  } finally {
    set('PROMO_AUTO_PERCENT', prev.percent);
    set('PROMO_AUTO_EXPIRES', prev.expires);
    set('PROMO_AUTO_LABEL', prev.label);
  }
}

test('resolveAutoPromo returns null when unset or malformed', () => {
  withPromo({}, () => assert.equal(resolveAutoPromo(NOW), null));
  withPromo({ percent: 'abc' }, () => assert.equal(resolveAutoPromo(NOW), null));
  withPromo({ percent: '0' }, () => assert.equal(resolveAutoPromo(NOW), null));
  withPromo({ percent: '150' }, () => assert.equal(resolveAutoPromo(NOW), null));
});

test('resolveAutoPromo returns the promo while inside its window', () => {
  withPromo({ percent: '10', expires: '2025-10-31', label: 'October promo' }, () => {
    const p = resolveAutoPromo(NOW);
    assert.equal(p?.percent, 10);
    assert.equal(p?.label, 'October promo');
    assert.equal(p?.expiresOn, '2025-10-31');
  });
});

test('resolveAutoPromo expires inclusively and rejects past the window', () => {
  withPromo({ percent: '10', expires: '2025-10-31' }, () => {
    assert.ok(resolveAutoPromo(new Date('2025-10-31T18:00:00Z')));
    assert.equal(resolveAutoPromo(new Date('2025-11-01T00:00:01Z')), null);
  });
});

test('resolveAutoPromo without expiry never expires and defaults the label', () => {
  withPromo({ percent: '25' }, () => {
    const p = resolveAutoPromo(new Date('2035-01-01T00:00:00Z'));
    assert.equal(p?.percent, 25);
    assert.equal(p?.label, 'Promotion');
    assert.equal(p?.expiresOn, undefined);
  });
});
