'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { CheckCircle, Home, Package, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { paymentApi } from '@/lib/api-client';
import { useCartStore } from '@/lib/store';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const clearCart = useCartStore((state) => state.clearCart);

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!reference || typeof window === 'undefined') return;

    const fulfill = async () => {
      // The server verifies the payment with Paystack and rebuilds the order from the
      // verified transaction metadata. If the webhook already fulfilled this order,
      // the call is idempotent and still returns success.
      const result = await paymentApi.fulfillPaystack({ reference });

      if (!result?.success) {
        throw new Error(result?.error || 'Order could not be completed');
      }

      setStatus('success');
      setOrderNumber(result.order_number || result.order_id || null);
      clearCart();
    };

    fulfill().catch((err: unknown) => {
      const message = axios.isAxiosError(err)
        ? ((err.response?.data as { error?: string })?.error || err.message)
        : err instanceof Error
          ? err.message
          : 'Failed to confirm your payment. Please contact support.';
      setStatus('error');
      setErrorMessage(message);
    });
  }, [reference, clearCart]);

  if (!reference) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16 px-4 bg-background">
        <Card className="max-w-lg w-full text-center p-8 md:p-12 border-primary/10">
          <CardContent className="p-0">
            <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
            <h1 className="text-2xl font-bold text-foreground font-serif mb-4">Invalid Payment Link</h1>
            <p className="text-gray-600 mb-8">No payment reference was found. Please try your order again.</p>
            <Link href="/cart">
              <Button size="lg">Return to Cart</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4 bg-background">
      <Card className="max-w-lg w-full text-center p-8 md:p-12 border-primary/10">
        <CardContent className="p-0">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-6 text-primary animate-spin" />
              <h1 className="text-2xl font-bold text-foreground font-serif mb-4">Confirming Payment...</h1>
              <p className="text-gray-600">Please wait while we verify your payment and create your order.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>

              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
                <Sparkles className="w-4 h-4" />
                Success
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground font-serif mb-4">Order Confirmed!</h1>

              <p className="text-gray-600 mb-4">
                Thank you for your purchase. Your payment has been received and your order is being processed.
              </p>

              {orderNumber && (
                <p className="font-medium text-primary mb-8">Order Number: {orderNumber}</p>
              )}

              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 mb-8 text-left">
                <h3 className="font-bold text-foreground font-serif mb-4">What&apos;s Next?</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 mt-2 bg-primary rounded-full flex-shrink-0" />
                    You&apos;ll receive an order confirmation email shortly
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 mt-2 bg-primary rounded-full flex-shrink-0" />
                    Track your order in your PayGlobe merchant dashboard
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 mt-2 bg-primary rounded-full flex-shrink-0" />
                    Expected delivery: 3-5 business days
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 mt-2 bg-primary rounded-full flex-shrink-0" />
                    Contact us if you have any questions
                  </li>
                </ul>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
              <h1 className="text-2xl font-bold text-foreground font-serif mb-4">Payment Confirmation Failed</h1>
              <p className="text-red-600 mb-8">{errorMessage}</p>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/">
              <Button variant="outline" size="lg">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Link href="/products">
              <Button size="lg">
                <Package className="w-4 h-4 mr-2" />
                Continue Shopping
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center py-16 px-4 bg-background"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
