import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { priceOrder, type OrderItemInput } from '@/lib/server/payglobe';
import { initializeTransaction, type PaystackOrderMetadata } from '@/lib/server/paystack';

/**
 * Initialize a Paystack payment for an AB Essentia order.
 *
 * The order total is computed AUTHORITATIVELY from PayGlobe product prices on the
 * server; the client-supplied amount is never trusted. All order details are stored
 * inside the Paystack transaction metadata so the payment can be fulfilled by either
 * the success callback or the webhook, without depending on the browser.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      email,
      currency = 'GHS',
      items,
      customer_name,
      customer_phone,
      shipping_address,
      shipping_city,
      shipping_state,
      shipping_postal_code,
      shipping_country = 'GH',
      shipping_phone,
      callback_url,
    } = body ?? {};

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const requiredShipping = {
      shipping_address,
      shipping_city,
      shipping_state,
      shipping_postal_code,
      shipping_phone,
    };
    const missing = Object.entries(requiredShipping)
      .filter(([, v]) => !String(v ?? '').trim())
      .map(([k]) => k);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const normalizedItems: OrderItemInput[] = Array.isArray(items)
      ? items.map((i: { product_id: string | number; quantity: string | number }) => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity),
        }))
      : [];

    if (normalizedItems.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Authoritative pricing from PayGlobe (client amount is ignored on purpose).
    const priced = await priceOrder(normalizedItems);
    if (priced.amountMinor <= 0) {
      return NextResponse.json({ error: 'Order total must be greater than zero' }, { status: 400 });
    }

    const externalOrderId = randomUUID();
    const reference = `abess-${externalOrderId}`;

    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000';

    const providedCallback = typeof callback_url === 'string' ? callback_url.trim() : '';
    const baseCallback = providedCallback || `${origin}/checkout/success`;
    const separator = baseCallback.includes('?') ? '&' : '?';
    const finalCallbackUrl = `${baseCallback}${separator}external_order_id=${encodeURIComponent(externalOrderId)}`;

    const metadata: PaystackOrderMetadata = {
      external_order_id: externalOrderId,
      source: 'ab_essentia',
      expected_amount_minor: priced.amountMinor,
      currency: currency.toUpperCase(),
      customer_name,
      customer_email: email,
      customer_phone,
      shipping_address,
      shipping_city,
      shipping_state,
      shipping_postal_code,
      shipping_country: String(shipping_country).toUpperCase(),
      shipping_phone,
      items: priced.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
    };

    const result = await initializeTransaction({
      email,
      amountMinor: priced.amountMinor,
      currency,
      reference,
      callbackUrl: finalCallbackUrl,
      metadata,
    });

    return NextResponse.json({
      authorization_url: result.authorization_url,
      reference: result.reference,
      access_code: result.access_code,
      external_order_id: externalOrderId,
      amount: priced.subtotal,
    });
  } catch (error: unknown) {
    const message = axios.isAxiosError(error)
      ? ((error.response?.data as { message?: string })?.message || error.message)
      : error instanceof Error
        ? error.message
        : 'Failed to initialize Paystack payment';
    console.error('Paystack initiate error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
