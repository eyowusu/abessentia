import { NextResponse } from 'next/server';
import { CUSTOMER_EMAIL_COOKIE, CUSTOMER_SESSION_COOKIE } from '@/lib/customer-session';

/** End the customer session by clearing the access-token and display cookies. */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(CUSTOMER_SESSION_COOKIE);
  response.cookies.delete(CUSTOMER_EMAIL_COOKIE);
  return response;
}
