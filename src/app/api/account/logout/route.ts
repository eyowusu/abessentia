import { NextResponse } from 'next/server';
import { CUSTOMER_SESSION_COOKIE } from '@/lib/server/customer-session';

/** End the customer session by clearing the access-token cookie. */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(CUSTOMER_SESSION_COOKIE);
  return response;
}
