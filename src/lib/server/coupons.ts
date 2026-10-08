/**
 * Coupon codes for storefront discounts.
 *
 * Configured via the COUPON_CODES environment variable as comma-separated
 * CODE:percent:expiresOn entries, e.g. "ESSENTIA10:10:2026-10-31,WELCOME5:5:".
 * An empty expiry means the code never expires. This module is server-only: the
 * code list stays off the client, and the discount applied to a charge is always
 * computed here - anything the browser shows is preview-only.
 *
 * Fails closed by design: no COUPON_CODES configured, malformed entries, unknown
 * codes and expired codes all resolve to null, so a coupon can never be
 * accidentally honoured.
 */

export interface ResolvedCoupon {
  code: string;
  /** Whole-number percent off the order subtotal, e.g. 10 for 10%. */
  percent: number;
  /** ISO date the code is valid through (inclusive), when configured. */
  expiresOn?: string;
}

export function resolveCoupon(code: string, now = new Date()): ResolvedCoupon | null {
  const wanted = code.trim().toUpperCase();
  if (!wanted) return null;

  const raw = process.env.COUPON_CODES || '';
  for (const entry of raw.split(',')) {
    const [rawCode, rawPercent, rawExpiry] = entry.split(':').map((s) => s.trim());
    if (!rawCode || rawCode.toUpperCase() !== wanted) continue;

    const percent = Number(rawPercent);
    // A malformed percent on a configured code must not silently grant a discount.
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return null;

    if (rawExpiry) {
      // Inclusive expiry: the code works for the whole of its expiry date.
      const expiresAt = new Date(`${rawExpiry}T23:59:59Z`);
      if (Number.isNaN(expiresAt.getTime()) || now > expiresAt) return null;
    }

    return { code: rawCode.toUpperCase(), percent, expiresOn: rawExpiry || undefined };
  }

  return null;
}

/** Discount in major units (GH₵), rounded to 2dp so minor-unit conversion is exact. */
export function couponDiscount(subtotal: number, percent: number): number {
  return Number(((subtotal * percent) / 100).toFixed(2));
}
