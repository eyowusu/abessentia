'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Home, Package, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { paymentApi } from '@/lib/api-client';
import { useCartStore } from '@/lib/store';

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: unknown }; message?: string };
    const data =
      e.response?.data && typeof e.response.data === 'object'
        ? (e.response.data as { error?: string })
        : undefined;
    if (data?.error) return data.error;
    if (e.message) return e.message;
  }
  if (err instanceof Error) return err.message;
  return 'Failed to confirm your payment. Please contact support.';
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const clearCart = useCartStore((state) => state.clearCart);

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'refunded'>('verifying');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [refundId, setRefundId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!reference || typeof window === 'undefined') return;

    const fulfill = async () => {
      // The server verifies the payment with Paystack and rebuilds the order from the
      // verified transaction metadata. If the webhook already fulfilled this order,
      // the call is idempotent and still returns success.
      //
      // Retried with backoff because the customer has already paid: a momentary blip
      // between here and PayGlobe should not turn a good order into a support ticket.
      const attempts = 3;
      let lastError: unknown;

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const result = await paymentApi.fulfillPaystack({ reference });

          if (result?.success) {
            setStatus('success');
            setOrderNumber(result.order_number || result.order_id || null);
            clearCart();
            return;
          }

          // The server has already refunded the customer for a non-retryable failure
          // (e.g. the product sold out). Stop retrying and show the refund state.
          if (result?.status === 'refunded') {
            setStatus('refunded');
            setRefundId(result.refund_id || null);
            setErrorMessage(result?.error || 'Your order could not be completed and a refund has been initiated.');
            return;
          }

          lastError = new Error(result?.error || 'Order could not be completed');
        } catch (err) {
          lastError = err;
        }

        if (attempt < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        }
      }

      throw lastError ?? new Error('Order could not be completed');
    };

    fulfill().catch((err: unknown) => {
      const message = getErrorMessage(err);
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
                <div className="mb-8">
                  <p className="font-medium text-primary mb-3">Order Number: {orderNumber}</p>
                  {/* The only durable way back to this order. Without it a customer who
                      loses the confirmation email has no way to check on their parcel. */}
                  <Link href={`/orders/track?order=${encodeURIComponent(orderNumber)}`}>
                    <Button variant="outline" size="sm">
                      <Package className="w-4 h-4 mr-2" />
                      Track This Order
                    </Button>
                  </Link>
                </div>
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
                    You&apos;ll receive an email update when your order ships
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
              {/* The customer has already been charged at this point. Leading with a
                  bare "failed" makes them think their money vanished, so state plainly
                  that the payment went through and give them the reference to quote. */}
              <AlertCircle className="w-16 h-16 mx-auto mb-6 text-amber-500" />
              <h1 className="text-2xl font-bold text-foreground font-serif mb-4">
                Payment Received &ndash; Order Processing Delayed
              </h1>
              <p className="text-gray-700 mb-4">
                Your payment was successful and your money is safe. We hit a problem
                finalising your order, and our team has already been alerted.
              </p>
              <p className="text-gray-700 mb-6">
                We will contact you shortly to confirm or refund. Please keep the
                reference below.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                <p className="text-xs uppercase tracking-widest text-amber-700 font-semibold mb-1">
                  Payment Reference
                </p>
                <p className="font-mono text-sm text-gray-900 break-all">{reference}</p>
              </div>

              {errorMessage && (
                <p className="text-sm text-gray-500 mb-4">Details: {errorMessage}</p>
              )}

              <p className="text-sm text-gray-600 mb-8">
                Need help now? Contact us at{' '}
                <a href="mailto:info@abessentiagh.com" className="text-primary underline">
                  info@abessentiagh.com
                </a>{' '}
                quoting your reference.
              </p>
            </>
          )}

          {status === 'refunded' && (
            <>
              <AlertCircle className="w-16 h-16 mx-auto mb-6 text-blue-500" />
              <h1 className="text-2xl font-bold text-foreground font-serif mb-4">
                Order Could Not Be Completed
              </h1>
              <p className="text-gray-700 mb-4">
                {errorMessage ||
                  'We could not finalise your order, so a refund has been initiated automatically.'}
              </p>
              <p className="text-gray-700 mb-6">
                Your money will return to the same account you paid from, usually within a few business days. Please keep the reference below for your records.
              </p>

              <div className="space-y-3 mb-6">
                {refundId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left">
                    <p className="text-xs uppercase tracking-widest text-blue-700 font-semibold mb-1">
                      Refund ID
                    </p>
                    <p className="font-mono text-sm text-gray-900 break-all">{refundId}</p>
                  </div>
                )}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left">
                  <p className="text-xs uppercase tracking-widest text-blue-700 font-semibold mb-1">
                    Payment Reference
                  </p>
                  <p className="font-mono text-sm text-gray-900 break-all">{reference}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-8">
                Need help? Contact us at{' '}
                <a href="mailto:info@abessentiagh.com" className="text-primary underline">
                  info@abessentiagh.com
                </a>{' '}
                quoting your reference.
              </p>
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
