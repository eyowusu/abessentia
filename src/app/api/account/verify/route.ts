import { NextRequest, NextResponse } from 'next/server';
import { verifyCustomerAccessCode } from '@/lib/server/payglobe';
import { CUSTOMER_SESSION_COOKIE } from '@/lib/server/customer-session';

/**
 * Exchange the emailed code for a session.
 *
 * On success the PayGlobe access token is stored in an httpOnly cookie: it is a
 * bearer credential for the customer's own orders, so it must not be readable by
 * page JavaScript.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Please enter the code we emailed you.' },
        { status: 400 }
      );
    }

    const grant = await verifyCustomerAccessCode(email, code);
    if (!grant) {
      return NextResponse.json(
        { error: 'That code is invalid or has expired. Request a new one.' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(CUSTOMER_SESSION_COOKIE, grant.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: grant.expiresIn,
    });
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify code';
    console.error('Customer access verify error:', message);
    return NextResponse.json(
      { error: 'We could not verify that code right now. Please try again shortly.' },
      { status: 500 }
    );
  }
}
