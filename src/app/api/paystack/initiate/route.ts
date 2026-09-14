import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { randomUUID } from 'crypto';
import {
  priceOrder,
  reserveStock,
  releaseStock,
  StockUnavailableError,
  type OrderItemInput,
} from '@/lib/server/payglobe';
import { initializeTransaction, type PaystackOrderMetadata } from '@/lib/server/paystack';
import { resolveCallbackUrl, withQueryParam } from '@/lib/server/site';
import { quoteShipping } from '@/lib/shipping';

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
    if (priced.subtotal <= 0) {
      return NextResponse.json({ error: 'Order total must be greater than zero' }, { status: 400 });
    }

    // Delivery fee is computed here, from the destination region, and never taken from
    // the browser. The customer is charged subtotal + delivery.
    const shipping = quoteShipping(String(shipping_state), priced.subtotal);
    const orderTotal = Number((priced.subtotal + shipping.fee).toFixed(2));
    const amountMinor = Math.round(orderTotal * 100);

    if (amountMinor <= 0) {
      return NextResponse.json({ error: 'Order total must be greater than zero' }, { status: 400 });
    }

    const externalOrderId = randomUUID();
    const reference = `abess-${externalOrderId}`;

    // Hold the stock BEFORE sending anyone to a payment page. If this fails the
    // customer is told the item just sold out and is never charged - which is the
    // whole point. Charging first and discovering the shortfall afterwards leaves the
    // merchant owing a manual refund.
    await reserveStock(
      externalOrderId,
      priced.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }))
    );

    // The canonical site URL wins over the request's Origin. Preview deployments have
    // their own hostname, and a callback pointing at one sends the customer to a URL
    // that disappears on the next deploy. A caller-supplied callback is accepted only
    // if it is same-origin with this site.
    const baseCallback = resolveCallbackUrl(callback_url, request.headers.get('origin'));
    const finalCallbackUrl = withQueryParam(baseCallback, 'external_order_id', externalOrderId);

    const metadata: PaystackOrderMetadata = {
      external_order_id: externalOrderId,
      source: 'ab_essentia',
      expected_amount_minor: amountMinor,
      currency: currency.toUpperCase(),
      shipping_method: `standard-${shipping.zone}`,
      shipping_cost: shipping.fee,
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

    let result;
    try {
      result = await initializeTransaction({
        email,
        amountMinor,
        currency,
        reference,
        callbackUrl: finalCallbackUrl,
        metadata,
      });
    } catch (error) {
      // We hold stock but will never charge for it, so give it straight back rather
      // than making the next shopper wait out the reservation TTL.
      await releaseStock(externalOrderId);
      throw error;
    }

    return NextResponse.json({
      authorization_url: result.authorization_url,
      reference: result.reference,
      access_code: result.access_code,
      external_order_id: externalOrderId,
      amount: orderTotal,
      subtotal: priced.subtotal,
      shipping_cost: shipping.fee,
    });
  } catch (error: unknown) {
    // Stock ran out while the customer was filling in the form. This is an expected
    // outcome, not a server fault, and the customer has NOT been charged.
    if (error instanceof StockUnavailableError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'stock_unavailable',
          product_id: error.productId,
          available: error.available,
        },
        { status: 409 }
      );
    }

    const message = axios.isAxiosError(error)
      ? ((error.response?.data as { message?: string })?.message || error.message)
      : error instanceof Error
        ? error.message
        : 'Failed to initialize Paystack payment';
    console.error('Paystack initiate error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
