import { NextRequest, NextResponse } from 'next/server';
import { requestCustomerAccessCode } from '@/lib/server/payglobe';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Send a one-time sign-in code to the customer's checkout email.
 *
 * The response is the same whether or not the address has orders - otherwise
 * this endpoint would reveal which emails belong to customers.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    await requestCustomerAccessCode(email);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send code';
    console.error('Customer access code request error:', message);
    return NextResponse.json(
      { error: 'We could not send a code right now. Please try again shortly.' },
      { status: 500 }
    );
  }
}
