import { CheckCircle2, Package, Truck, type LucideIcon } from 'lucide-react';

/**
 * Presentation helpers for how an order's status is shown to the customer.
 * Shared by the order-tracking page and the order-history (account) page.
 */

export function formatOrderDate(value?: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Tailwind classes for an order-status badge. */
export function orderStatusTone(status: string): string {
  switch (status) {
    case 'delivered':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'shipped':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'cancelled':
    case 'refunded':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
}

export interface OrderStage {
  key: string;
  label: string;
  icon: LucideIcon;
}

/** The journey we show the customer, in order. */
export const ORDER_STAGES: OrderStage[] = [
  { key: 'confirmed', label: 'Order Confirmed', icon: CheckCircle2 },
  { key: 'processing', label: 'Being Prepared', icon: Package },
  { key: 'shipped', label: 'On Its Way', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

/** How far along ORDER_STAGES this order is; -1 for cancelled/refunded. */
export function orderStageIndex(status: string): number {
  if (status === 'cancelled' || status === 'refunded') return -1;
  const index = ORDER_STAGES.findIndex((s) => s.key === status);
  // Anything paid but not yet moved (e.g. 'pending') still counts as confirmed.
  return index === -1 ? 0 : index;
}
