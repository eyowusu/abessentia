/**
 * Ghana delivery regions and delivery windows.
 *
 * No delivery fee is charged online: the rider collects their own fee from the
 * customer in person on delivery. Regions still map to zones because the zone
 * drives the delivery estimate shown at checkout and the shipping_method recorded
 * on the PayGlobe order for fulfillment.
 */

export type ShippingZone = 'accra' | 'major_city' | 'other';

interface ZoneInfo {
  label: string;
  /** Indicative delivery window, shown to the customer. */
  estimate: string;
  /**
   * Indicative range, in GHS, of what the rider will ask for at the door.
   *
   * Saying only "you pay the rider" tells the customer a fee exists but not whether to
   * expect ₵20 or ₵120, and a courier asking for an unexpected amount on the doorstep is
   * the classic cause of a refused delivery - the goods come back and the sale is lost
   * even though the payment succeeded. A range is honest about the uncertainty while
   * still letting the customer have the right money ready.
   *
   * ⚠ CONFIRM WITH THE MERCHANT before relying on these figures: they are placeholders
   * based on typical Ghanaian intra-city courier rates, not AB Essentia's actual agreed
   * rider pricing. Override per environment with NEXT_PUBLIC_DELIVERY_FEE_<ZONE>.
   */
  feeRange: { min: number; max: number };
}

/** Env override so the ranges can be corrected without a code change. */
function feeRange(zone: string, min: number, max: number): { min: number; max: number } {
  const raw = process.env[`NEXT_PUBLIC_DELIVERY_FEE_${zone.toUpperCase()}`];
  if (raw) {
    // Expected form "20-40". Ignore anything malformed rather than showing nonsense.
    const [rawMin, rawMax] = raw.split('-').map((part) => Number(part.trim()));
    if (Number.isFinite(rawMin) && Number.isFinite(rawMax) && rawMin > 0 && rawMax >= rawMin) {
      return { min: rawMin, max: rawMax };
    }
  }
  return { min, max };
}

export const SHIPPING_ZONES: Record<ShippingZone, ZoneInfo> = {
  accra: {
    label: 'Greater Accra',
    estimate: '1-2 business days',
    feeRange: feeRange('accra', 20, 40),
  },
  major_city: {
    label: 'Major cities',
    estimate: '2-4 business days',
    feeRange: feeRange('major_city', 40, 70),
  },
  other: {
    label: 'Other regions',
    estimate: '3-6 business days',
    feeRange: feeRange('other', 60, 120),
  },
};

/** Human-readable fee range, e.g. "₵20 - ₵40". */
export function formatFeeRange(range: { min: number; max: number }): string {
  if (range.min === range.max) return `₵${range.min}`;
  return `₵${range.min} - ₵${range.max}`;
}

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

/** Zone for a region name. Unknown regions fall back to the longest window. */
export function zoneForRegion(region: string): ShippingZone {
  const match = GHANA_REGIONS.find(
    (r) => r.name.toLowerCase() === region.trim().toLowerCase()
  );
  return match ? match.zone : 'other';
}

export interface DeliveryInfo {
  zone: ShippingZone;
  label: string;
  estimate: string;
  feeRange: { min: number; max: number };
  /** Preformatted range for display, e.g. "₵20 - ₵40". */
  feeRangeLabel: string;
}

/**
 * Delivery window for a region. Used by both the browser (to preview) and the
 * server (authoritatively), so the two can never disagree about what the customer
 * was shown.
 */
export function quoteShipping(region: string): DeliveryInfo {
  const zone = zoneForRegion(region);
  const rate = SHIPPING_ZONES[zone];

  return {
    zone,
    label: rate.label,
    estimate: rate.estimate,
    feeRange: rate.feeRange,
    feeRangeLabel: formatFeeRange(rate.feeRange),
  };
}
