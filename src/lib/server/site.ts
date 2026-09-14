/**
 * Canonical site URL resolution.
 *
 * Every Paystack callback URL has to survive a redeploy. Vercel gives each deployment
 * its own hostname, so building callbacks from the incoming request's Origin header
 * pointed paying customers at an ephemeral preview deployment that stops existing on
 * the next push. The configured canonical URL therefore wins, and the request origin is
 * only a last resort for local development where nothing is configured.
 */

const FALLBACK_ORIGIN = 'http://localhost:3000';

/** Strip a trailing slash so callers can concatenate paths safely. */
function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * The canonical public origin of this site, e.g. https://www.abessentiagh.com.
 *
 * Note the host must be the one that serves content directly. abessentiagh.com
 * 308-redirects to www, and redirects are not something a payment callback should rely
 * on, so NEXT_PUBLIC_SITE_URL must name the canonical host.
 */
export function getSiteUrl(requestOrigin?: string | null): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }
  if (requestOrigin?.trim()) {
    return trimTrailingSlash(requestOrigin.trim());
  }
  return FALLBACK_ORIGIN;
}

/**
 * Resolve the post-payment return URL.
 *
 * A caller-supplied callback is honoured only when it points at this same site.
 * Without that check, anyone could initialise a transaction whose Paystack callback
 * lands the shopper on a site of their choosing, which is a phishing primitive handed
 * out for free - the shopper has just typed card details and trusts wherever they land.
 */
export function resolveCallbackUrl(
  provided: unknown,
  requestOrigin?: string | null
): string {
  const siteUrl = getSiteUrl(requestOrigin);
  const defaultCallback = `${siteUrl}/checkout/success`;

  if (typeof provided !== 'string' || !provided.trim()) {
    return defaultCallback;
  }

  try {
    const candidate = new URL(provided.trim(), siteUrl);
    const site = new URL(siteUrl);

    // Same-origin only. A different host, or a downgrade to http, is rejected outright
    // rather than sanitised, because there is no legitimate reason for either.
    if (candidate.origin !== site.origin) {
      console.warn(
        'CALLBACK_URL_REJECTED provided_origin=%s expected_origin=%s',
        candidate.origin,
        site.origin
      );
      return defaultCallback;
    }

    return candidate.toString();
  } catch {
    return defaultCallback;
  }
}

/** Append a query parameter to a URL that may or may not already have a query string. */
export function withQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}
