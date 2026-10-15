/**
 * Cookie names for the passwordless order-history session.
 *
 * Lives outside lib/server/ so the client-side account page can read the
 * (non-httpOnly) email cookie without importing a server module.
 */

/** httpOnly cookie holding the PayGlobe customer access token. Never readable by page JS. */
export const CUSTOMER_SESSION_COOKIE = 'abess_customer_session';

/**
 * Non-httpOnly cookie carrying the signed-in email. It only ever contains an
 * address the customer themselves typed into the sign-in form, and is used purely
 * for display ("Signed in as …") and to pre-fill order-tracking links.
 */
export const CUSTOMER_EMAIL_COOKIE = 'abess_customer_email';
