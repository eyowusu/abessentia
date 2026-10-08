import { NextRequest, NextResponse } from 'next/server';
import { resolveCoupon } from '@/lib/server/coupons';
import { RATE_LIMITS, rateLimit, rateLimitedResponse } from '@/lib/server/rate-limit';

/**
 * Preview a coupon code for the cart/checkout UI.
 *
 * This only tells the browser what the code is worth so the totals can be shown;
 * the authoritative discount is recomputed in /api/paystack/initiate, which
 * applies (or rejects) the code again at charge time.
 */
export async function POST(request: NextRequest) {
  // Coupon endpoints are enumeration oracles by nature - each answer reveals
  // whether a code exists. Throttled so guessing codes is slow.
  const limit = rateLimit(
    request,
    'coupon-validate',
    RATE_LIMITS.couponValidate.limit,
    RATE_LIMITS.couponValidate.windowSeconds
  );
  if (!limit.ok) {
    return rateLimitedResponse(limit);
  }

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === 'string' ? body.code : '';

  const coupon = resolveCoupon(code);
  if (!coupon) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    percent: coupon.percent,
    expires_on: coupon.expiresOn ?? null,
  });
}
