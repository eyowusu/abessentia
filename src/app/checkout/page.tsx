'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Lock, Loader2, Sparkles, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCartStore } from '@/lib/store';
import { paymentApi } from '@/lib/api-client';
import { GHANA_REGIONS, quoteShipping } from '@/lib/shipping';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, getTotalItems } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    fullName: '',
    address: '',
    city: '',
    state: '',
    // GhanaPost GPS digital address (e.g. GA-183-4290). This is what couriers in Ghana
    // actually navigate by; a postal code is meaningless here.
    gpsAddress: '',
    landmark: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // No delivery fee is charged online: the rider collects their own fee from the
  // customer in person on delivery. The zone lookup only drives the estimate shown
  // here; the order total charged through Paystack is the subtotal alone.
  const subtotal = getTotalPrice();
  const shipping = quoteShipping(formData.state);
  const orderTotal = subtotal;

  const handlePayGlobeCheckout = async () => {
    setLoading(true);
    setError(null);

    const requiredFields = ['email', 'phone', 'fullName', 'address', 'city', 'state'] as const;
    const missing = requiredFields.filter(key => !formData[key].trim());
    if (missing.length > 0) {
      setError('Please fill in all customer and delivery details.');
      setLoading(false);
      return;
    }

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      const paymentResponse = await paymentApi.initiatePaystack({
        email: formData.email,
        currency: 'GHS',
        callback_url: `${origin}/checkout/success`,
        customer_name: formData.fullName,
        customer_phone: formData.phone,
        // The GPS code and landmark travel with the street address because that is
        // what the person delivering the parcel needs to read in one place.
        shipping_address: [
          formData.address,
          formData.gpsAddress.trim() ? `GPS: ${formData.gpsAddress.trim()}` : '',
          formData.landmark.trim() ? `Landmark: ${formData.landmark.trim()}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
        shipping_city: formData.city,
        shipping_state: formData.state,
        shipping_postal_code: formData.gpsAddress.trim(),
        shipping_country: 'GH',
        shipping_phone: formData.phone,
        items: items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
      });

      if (paymentResponse.authorization_url && typeof window !== 'undefined') {
        window.location.href = paymentResponse.authorization_url;
      } else {
        throw new Error('Invalid payment response from Paystack');
      }
    } catch (err) {
      console.error('Checkout error:', err);

      // A 409 means an item sold out while this cart was open. The customer has NOT
      // been charged, and telling them exactly what happened is far better than a
      // generic failure that makes them wonder whether their money left.
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const data = err.response.data as { error?: string };
        setError(
          `${data?.error || 'An item in your cart just sold out.'} ` +
            `You have not been charged. Please adjust your cart and try again.`
        );
      } else {
        const message =
          axios.isAxiosError(err) && (err.response?.data as { error?: string })?.error
            ? (err.response!.data as { error?: string }).error!
            : 'We could not start your payment. You have not been charged. Please try again.';
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (items.length === 0 && typeof window !== 'undefined') {
      router.push('/cart');
    }
  }, [items, router]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            <Sparkles className="w-4 h-4" />
            Secure Checkout
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground font-serif mb-4">
            Complete Your Order
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-primary/10">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground font-serif">Customer & Shipping Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="Enter your email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="Enter your street address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="Enter your city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
                    >
                      <option value="">Select your region</option>
                      {GHANA_REGIONS.map((region) => (
                        <option key={region.name} value={region.name}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GhanaPost GPS Address{' '}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      name="gpsAddress"
                      value={formData.gpsAddress}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="e.g. GA-183-4290"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Helps our courier find you faster.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nearest Landmark{' '}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      name="landmark"
                      value={formData.landmark}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="e.g. Behind Melcom, near Shell filling station"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-secondary/10">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-secondary to-secondary-dark rounded-2xl flex items-center justify-center shadow-lg shadow-secondary/20">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground font-serif">Order Items ({getTotalItems()})</h2>
                </div>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-4 border-b border-border last:border-0">
                      <div>
                        <p className="font-bold text-lg text-foreground font-serif">{item.name}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <p className="text-xl font-bold text-primary">₵{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 border-primary/10">
              <CardContent className="p-8">
                <div className="flex items-center gap-2 mb-6">
                  <Shield className="w-5 h-5 text-secondary" />
                  <h2 className="text-xl font-bold text-foreground font-serif">Order Summary</h2>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'})</span>
                    <span className="font-semibold text-foreground">₵{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>
                      Delivery
                      {formData.state && (
                        <span className="block text-xs text-gray-500">
                          {shipping.label} &middot; {shipping.estimate}
                        </span>
                      )}
                    </span>
                    {!formData.state ? (
                      <span className="text-gray-400 text-sm">Select a region</span>
                    ) : (
                      <span className="text-secondary font-medium">Paid to rider on delivery</span>
                    )}
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span className="text-secondary font-medium">Included</span>
                  </div>

                  {/* The customer must know the rider will ask for a delivery fee at
                      the door - hiding it here guarantees a refusal on delivery. */}
                  <p className="text-xs text-gray-500 bg-secondary/5 rounded-xl p-3">
                    No delivery charge is added online. You pay the delivery fee
                    directly to the rider when your order arrives.
                  </p>

                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between text-2xl font-bold text-foreground">
                      <span>Total</span>
                      <span className="text-primary">₵{orderTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  onClick={handlePayGlobeCheckout}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 w-5 h-5" />
                      Pay with Paystack
                    </>
                  )}
                </Button>

                <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                    <Shield className="w-4 h-4 text-secondary" />
                    <span>Secure SSL encryption via Paystack</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
