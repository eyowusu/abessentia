'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  Package,
  Mail,
  Loader2,
  AlertCircle,
  Sparkles,
  LogOut,
  Truck,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CUSTOMER_EMAIL_COOKIE } from '@/lib/customer-session';
import { apiError } from '@/lib/errors';
import { formatOrderDate, orderStatusTone } from '@/lib/order-display';
import { readCookie } from '@/lib/utils';
import type { CustomerOrderSummary } from '@/lib/catalogue';

type Step = 'loading' | 'email' | 'code' | 'orders';

export default function AccountPage() {
  const [step, setStep] = useState<Step>('loading');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const response = await axios.get('/api/account/orders');
      setOrders(response.data.orders as CustomerOrderSummary[]);
      // A returning session has the cookie but no typed email - recover the signed-in
      // address from the (non-httpOnly) display cookie the verify route set.
      const signedInEmail = readCookie(CUSTOMER_EMAIL_COOKIE);
      if (signedInEmail) setEmail(signedInEmail);
      setStep('orders');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setStep('email');
        return;
      }
      setError('We could not load your orders right now. Please try again shortly.');
      setStep('email');
    }
  }, []);

  // A returning session goes straight to the order list; otherwise sign in.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await axios.post('/api/account/request-code', { email: email.trim() });
      setInfo(`If ${email.trim()} has orders with us, a sign-in code is on its way.`);
      setStep('code');
    } catch (err) {
      setError(apiError(err, 'We could not send a code right now. Please try again shortly.'));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await axios.post('/api/account/verify', {
        email: email.trim(),
        code: code.trim(),
      });
      await loadOrders();
    } catch (err) {
      setError(apiError(err, 'We could not verify that code right now. Please try again shortly.'));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await axios.post('/api/account/logout').catch(() => undefined);
    setOrders([]);
    setCode('');
    setStep('email');
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            <Sparkles className="w-4 h-4" />
            My Orders
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Your Orders
          </h1>
          <p className="text-gray-600">
            {step === 'orders'
              ? 'Every order placed with this email, all in one place.'
              : 'Enter the email you used at checkout and we\u2019ll send you a sign-in code.'}
          </p>
        </div>

        {step === 'loading' && (
          <div className="flex justify-center py-14">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        )}

        {step === 'email' && (
          <Card className="border-primary/10">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={requestCode} className="space-y-4">
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
                  <p className="mt-1 text-xs text-gray-500">
                    No password needed - we email you a one-time code.
                  </p>
                </div>
                <Button type="submit" size="lg" disabled={busy || !email.trim()} className="w-full">
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 w-5 h-5" />
                      Email me a sign-in code
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'code' && (
          <Card className="border-primary/10">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={verifyCode} className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                    Sign-In Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-center text-2xl tracking-[0.5em] font-mono"
                    placeholder="000000"
                    maxLength={6}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Check the inbox (and spam folder) for {email}.
                  </p>
                </div>
                <Button type="submit" size="lg" disabled={busy || code.trim().length < 6} className="w-full">
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'View my orders'
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setCode('');
                    setError(null);
                    setInfo(null);
                  }}
                  className="w-full text-sm text-gray-500 hover:text-primary transition-colors"
                >
                  Use a different email
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {info && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 mb-6 text-sm">
            {info}
          </div>
        )}
        {error && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 mb-8 flex gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {step === 'orders' && (
          <>
            {orders.length === 0 ? (
              <Card className="border-primary/10">
                <CardContent className="p-10 text-center">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-foreground mb-2">No orders yet</p>
                  <p className="text-gray-600 mb-6">
                    Orders placed with {email} will appear here.
                  </p>
                  <Link href="/products">
                    <Button size="lg">Start Shopping</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.order_number} className="border-primary/10">
                    <CardContent className="p-5 md:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-foreground text-lg">
                            {order.order_number}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatOrderDate(order.created_at)} &middot;{' '}
                            {order.items.reduce((n, i) => n + i.quantity, 0)} item(s)
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${orderStatusTone(order.status)}`}
                          >
                            {order.status_display || order.status}
                          </span>
                          <p className="text-lg font-bold text-primary mt-1">
                            GH₵{Number(order.total).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-gray-600">
                        {order.items.slice(0, 3).map((item, i) => (
                          <span key={i}>
                            {i > 0 && ', '}
                            {item.quantity} &times; {item.product_name}
                          </span>
                        ))}
                        {order.items.length > 3 && ` +${order.items.length - 3} more`}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/orders/track?order=${encodeURIComponent(order.order_number)}&email=${encodeURIComponent(email)}`}
                        >
                          <Button variant="outline" size="sm">
                            Track order
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                        {order.tracking_url && (
                          <a
                            href={order.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm">
                              <Truck className="w-4 h-4 mr-2" />
                              {order.tracking_is_deep_link
                                ? 'Track parcel'
                                : `Track on ${order.shipping_carrier || 'courier site'}`}
                              <ExternalLink className="w-3 h-3 ml-2" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <p className="text-sm text-gray-500">Signed in as {email}</p>
              <button
                onClick={signOut}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </>
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
