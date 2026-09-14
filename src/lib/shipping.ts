/**
 * Ghana delivery regions and shipping fees.
 *
 * Shipping was previously hard-coded to free for everywhere, which quietly made the
 * merchant absorb the cost of every out-of-region delivery. Rates are grouped into
 * zones because the real cost difference is Accra vs. other cities vs. the north, not
 * per-region micro-pricing.
 *
 * Amounts are in GHS. Kept on the server and echoed to the client so the browser can
 * preview a total, but the authoritative figure is recomputed server-side at checkout.
 */

export type ShippingZone = 'accra' | 'major_city' | 'other';

interface ZoneRate {
  label: string;
  /** Delivery fee in GHS. */
  fee: number;
  /** Indicative delivery window, shown to the customer. */
  estimate: string;
}

export const SHIPPING_ZONES: Record<ShippingZone, ZoneRate> = {
  accra: { label: 'Greater Accra', fee: 25, estimate: '1-2 business days' },
  major_city: { label: 'Major cities', fee: 40, estimate: '2-4 business days' },
  other: { label: 'Other regions', fee: 60, estimate: '3-6 business days' },
};

/** Order subtotal (GHS) at or above which delivery is free. */
export const FREE_SHIPPING_THRESHOLD = 500;

/** The 16 regions of Ghana, each mapped to its delivery zone. */
export const GHANA_REGIONS: Array<{ name: string; zone: ShippingZone }> = [
  { name: 'Greater Accra', zone: 'accra' },
  { name: 'Ashanti', zone: 'major_city' },
  { name: 'Western', zone: 'major_city' },
  { name: 'Central', zone: 'major_city' },
  { name: 'Eastern', zone: 'major_city' },
  { name: 'Volta', zone: 'other' },
  { name: 'Northern', zone: 'other' },
  { name: 'Upper East', zone: 'other' },
  { name: 'Upper West', zone: 'other' },
  { name: 'Bono', zone: 'other' },
  { name: 'Bono East', zone: 'other' },
  { name: 'Ahafo', zone: 'other' },
  { name: 'Savannah', zone: 'other' },
  { name: 'North East', zone: 'other' },
  { name: 'Oti', zone: 'other' },
  { name: 'Western North', zone: 'other' },
];

/** Zone for a region name. Unknown regions fall back to the most expensive zone. */
export function zoneForRegion(region: string): ShippingZone {
  const match = GHANA_REGIONS.find(
    (r) => r.name.toLowerCase() === region.trim().toLowerCase()
  );
  return match ? match.zone : 'other';
}

export interface ShippingQuote {
  zone: ShippingZone;
  label: string;
  fee: number;
  estimate: string;
  freeShippingApplied: boolean;
}

/**
 * Delivery fee for a region and order subtotal.
 *
 * Used by both the browser (to preview) and the server (authoritatively), so the two
 * can never disagree about what the customer was quoted.
 */
export function quoteShipping(region: string, subtotal: number): ShippingQuote {
  const zone = zoneForRegion(region);
  const rate = SHIPPING_ZONES[zone];
  const freeShippingApplied = subtotal >= FREE_SHIPPING_THRESHOLD;

  return {
    zone,
    label: rate.label,
    fee: freeShippingApplied ? 0 : rate.fee,
    estimate: rate.estimate,
    freeShippingApplied,
  };
}
