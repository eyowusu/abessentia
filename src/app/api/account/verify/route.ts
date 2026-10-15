import { NextRequest, NextResponse } from 'next/server';
import { verifyCustomerAccessCode } from '@/lib/server/payglobe';
import { CUSTOMER_EMAIL_COOKIE, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-session';
import { RATE_LIMITS, rateLimit, rateLimitedResponse } from '@/lib/server/rate-limit';

/**
 * Exchange the emailed code for a session.
 *
 * On success the PayGlobe access token is stored in an httpOnly cookie: it is a
 * bearer credential for the customer's own orders, so it must not be readable by
 * page JavaScript. The email itself goes into a second, JS-readable cookie - it
 * only carries what the customer typed, and lets the account page say who is
 * signed in and pre-fill tracking links.
 */
export async function POST(request: NextRequest) {
  // Throttled like the other auth endpoints: the code is six digits, so an
  // unthrottled endpoint is a brute-force oracle against a customer's order history.
  const limit = rateLimit(
    request,
    'verify-code',
    RATE_LIMITS.verifyCode.limit,
    RATE_LIMITS.verifyCode.windowSeconds
  );
  if (!limit.ok) {
    return rateLimitedResponse(limit);
  }

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
    const cookieOptions = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: grant.expiresIn,
    };
    response.cookies.set(CUSTOMER_SESSION_COOKIE, grant.accessToken, {
      httpOnly: true,
      ...cookieOptions,
    });
    response.cookies.set(CUSTOMER_EMAIL_COOKIE, email, {
      httpOnly: false,
      ...cookieOptions,
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
