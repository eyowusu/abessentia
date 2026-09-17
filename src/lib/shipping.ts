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
}

export const SHIPPING_ZONES: Record<ShippingZone, ZoneInfo> = {
  accra: { label: 'Greater Accra', estimate: '1-2 business days' },
  major_city: { label: 'Major cities', estimate: '2-4 business days' },
  other: { label: 'Other regions', estimate: '3-6 business days' },
};

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
  };
}
