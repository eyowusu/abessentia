'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import {
  Package,
  Search,
  Truck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TrackedOrder {
  order_number: string;
  status: string;
  status_display?: string;
  payment_status: string;
  total: string;
  currency: string;
  shipping_city?: string;
  shipping_carrier?: string;
  tracking_number?: string;
  /** Resolved by PayGlobe from the carrier, or pasted by the merchant. May be absent. */
  tracking_url?: string;
  /** False when tracking_url is only a search page the customer must fill in. */
  tracking_is_deep_link?: boolean;
  shipped_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  items: Array<{ product_name: string; quantity: number; subtotal: string }>;
}

/** The journey we show the customer, in order. */
const STAGES = [
  { key: 'confirmed', label: 'Order Confirmed', icon: CheckCircle2 },
  { key: 'processing', label: 'Being Prepared', icon: Package },
  { key: 'shipped', label: 'On Its Way', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

/** How far along the STAGES list this order is; -1 for cancelled/refunded. */
function stageIndex(status: string): number {
  if (status === 'cancelled' || status === 'refunded') return -1;
  const index = STAGES.findIndex((s) => s.key === status);
  // Anything paid but not yet moved (e.g. 'pending') still counts as confirmed.
  return index === -1 ? 0 : index;
}

function formatDate(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [orderRef, setOrderRef] = useState(searchParams.get('order') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (ref: string, mail: string) => {
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const response = await axios.post('/api/orders/track', {
        order_ref: ref.trim(),
        email: mail.trim(),
      });
      setOrder(response.data.order as TrackedOrder);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && (err.response?.data as { error?: string })?.error
          ? (err.response!.data as { error?: string }).error!
          : 'We could not look up your order right now. Please try again shortly.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Deep link straight from a confirmation email: ?order=...&email=...
  // The rule against setState in effects is meant to prevent cascading renders;
  // here we are doing a one-shot data fetch on mount/deep-link, which is the
  // standard pattern and is also used elsewhere in this app.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const ref = searchParams.get('order');
    const mail = searchParams.get('email');
    if (ref && mail) {
      lookup(ref, mail);
    }
  }, [searchParams, lookup]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderRef.trim() || !email.trim()) {
      setError('Please enter both your order number and the email you used at checkout.');
      return;
    }
    lookup(orderRef, email);
  };

  const currentStage = order ? stageIndex(order.status) : 0;
  const isCancelled = order?.status === 'cancelled' || order?.status === 'refunded';

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            <Sparkles className="w-4 h-4" />
            Order Tracking
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground font-serif mb-4">
            Track Your Order
          </h1>
          <p className="text-gray-600">
            Enter your order number and the email you used at checkout.
          </p>
        </div>

        <Card className="border-primary/10 mb-8">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="orderRef" className="block text-sm font-medium text-gray-700 mb-1">
                  Order or Payment Reference
                </label>
                <input
                  id="orderRef"
                  type="text"
                  value={orderRef}
                  onChange={(e) => setOrderRef(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="e.g. EXT-PAY-1A2B3C4D"
                />
                {/* Most customers still have the payment reference from their bank or
                    mobile money SMS long after losing the confirmation email, so accept
                    that too rather than sending them away. */}
                <p className="mt-1 text-xs text-gray-500">
                  Your order number, or the payment reference from your receipt.
                </p>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="The email you used at checkout"
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" size="lg" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      Looking up your order...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 w-5 h-5" />
                      Track Order
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {error && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 mb-8 flex gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {order && (
          <Card className="border-primary/10">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="text-2xl font-bold text-foreground font-serif">
                    {order.order_number}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Placed {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-primary">
                    ₵{Number(order.total).toFixed(2)}
                  </p>
                </div>
              </div>

              {isCancelled ? (
                <div className="p-5 bg-red-50 border border-red-200 rounded-2xl mb-8">
                  <p className="font-semibold text-red-800 mb-1">
                    This order was {order.status}.
                  </p>
                  <p className="text-sm text-red-700">
                    If you were expecting this order, please contact us at{' '}
                    <a href="mailto:info@abessentiagh.com" className="underline">
                      info@abessentiagh.com
                    </a>
                    .
                  </p>
                </div>
              ) : (
                <div className="mb-8">
                  <ol className="space-y-4">
                    {STAGES.map((stage, index) => {
                      const done = index <= currentStage;
                      const isCurrent = index === currentStage;
                      const Icon = stage.icon;
                      return (
                        <li key={stage.key} className="flex items-start gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              done
                                ? 'bg-gradient-to-br from-primary to-secondary text-white'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="pt-2">
                            <p
                              className={`font-semibold ${
                                done ? 'text-foreground' : 'text-gray-400'
                              }`}
                            >
                              {stage.label}
                              {isCurrent && (
                                <span className="ml-2 text-xs font-medium text-primary uppercase tracking-wide">
                                  Current
                                </span>
                              )}
                            </p>
                            {stage.key === 'shipped' && order.shipped_at && (
                              <p className="text-sm text-gray-500">
                                {formatDate(order.shipped_at)}
                              </p>
                            )}
                            {stage.key === 'delivered' && order.delivered_at && (
                              <p className="text-sm text-gray-500">
                                {formatDate(order.delivered_at)}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {order.tracking_number && (
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-secondary" />
                    <p className="font-semibold text-foreground">Delivery Details</p>
                  </div>
                  {order.shipping_carrier && (
                    <p className="text-sm text-gray-700">Carrier: {order.shipping_carrier}</p>
                  )}
                  <p className="text-sm text-gray-700">
                    Tracking Number:{' '}
                    <span className="font-mono">{order.tracking_number}</span>
                  </p>

                  {order.tracking_url && (
                    <div className="mt-4">
                      <a
                        href={order.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          {order.tracking_is_deep_link
                            ? 'Track your parcel'
                            : `Track on ${order.shipping_carrier || "the courier's site"}`}
                        </Button>
                      </a>
                      {/* Say plainly when the courier only offers a search form, rather
                          than letting the customer click through and assume the link is
                          broken when their parcel is not already on screen. */}
                      {!order.tracking_is_deep_link && (
                        <p className="mt-2 text-xs text-gray-500">
                          Enter the tracking number above on that page to see progress.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="font-semibold text-foreground mb-3">Items</p>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.product_name}-${index}`}
                      className="flex justify-between items-center py-3 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="font-medium text-foreground">{item.product_name}</p>
                        <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-primary">
                        ₵{Number(item.subtotal).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {!order.tracking_number && !isCancelled && currentStage < 2 && (
                <div className="mt-6 flex items-start gap-3 text-sm text-gray-600">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-secondary" />
                  <p>
                    We&apos;ll email you a tracking number as soon as your order ships.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-10 text-center">
          <Link href="/products">
            <Button variant="outline" size="lg">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center py-16 px-4 bg-background">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}
