/**
 * Per-IP rate limiting for the storefront's own API routes.
 *
 * Why this exists
 * ---------------
 * `/api/paystack/initiate` is necessarily unauthenticated - shoppers are guests - and
 * every call places a real stock hold in PayGlobe for the length of the reservation
 * TTL. Without a throttle, a single unauthenticated caller can hold a product's entire
 * stock and keep it held indefinitely, taking the shop out of business without ever
 * paying a pesewa. Nothing downstream can save us either: PayGlobe's own limiter is
 * per-API-key, and this whole site shares one key, so an attacker who exhausts it locks
 * out genuine customers too. The throttle has to happen here, before PayGlobe is ever
 * called.
 *
 * Deliberate limitation
 * ---------------------
 * State is in-process. On Vercel that means the limit is enforced per serverless
 * instance, so a distributed attacker spread across many warm instances gets a higher
 * effective ceiling than the numbers below suggest. This is a conscious trade-off: it
 * needs no Redis/KV provisioning, and combined with the hard per-order quantity caps in
 * `order-limits.ts` it removes the cheap one-request-kills-the-shop attack, which is
 * what actually matters. If the shop later gains a KV store, swap the Map for it and
 * keep this same interface.
 */

interface Window {
  count: number;
  /** Epoch ms at which this window resets. */
  resetAt: number;
}

const windows = new Map<string, Window>();

/**
 * Drop expired entries so an attacker rotating IPs cannot grow the map without bound.
 * Called opportunistically rather than on a timer, because a serverless instance can be
 * frozen at any moment and a background interval would simply never fire.
 */
function evictExpired(now: number): void {
  if (windows.size < 5000) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

/**
 * Best-effort client IP.
 *
 * Header order matters and is easy to get wrong. Vercel's edge APPENDS the real
 * connecting IP to whatever X-Forwarded-For chain the client sent, so the FIRST
 * entry is attacker-controlled - a caller rotating `X-Forwarded-For: <random>` per
 * request gets a fresh bucket every time and the limit evaporates. The edge also
 * sets `x-vercel-forwarded-for` itself, which the client cannot forge, so it is the
 * most trustworthy source on this platform.
 *
 * Order: x-vercel-forwarded-for -> LAST x-forwarded-for entry (the one the edge
 * appended) -> x-real-ip -> 'unknown'. The last-entry rule is also correct for
 * other append-style proxies; only a REPLACE-style proxy would make first safe.
 */
export function clientIp(request: Request): string {
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for')?.trim();
  if (vercelForwarded) return vercelForwarded;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const last = forwarded.split(',').pop()?.trim();
    if (last) return last;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds the caller should wait before retrying. Only meaningful when !ok. */
  retryAfter: number;
  remaining: number;
}

/**
 * Consume one unit from `bucket` for this request's client IP.
 *
 * Fixed window rather than a sliding log: a shopper legitimately submits checkout a
 * handful of times at most, so the extra precision of a sliding window buys nothing
 * worth the memory.
 */
export function rateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  evictExpired(now);

  const key = `${bucket}:${clientIp(request)}`;
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, retryAfter: 0, remaining: limit - 1 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  return { ok: true, retryAfter: 0, remaining: limit - existing.count };
}

/**
 * Limits per route, tuned so a real shopper never notices.
 *
 * `checkout` is the expensive one: each call reserves stock. Five attempts per ten
 * minutes covers a customer who mistypes their details, retries after a declined card,
 * and tries once more - while capping how much inventory one address can tie up.
 */
export const RATE_LIMITS = {
  /** POST /api/paystack/initiate - places a stock hold. */
  checkout: { limit: 5, windowSeconds: 600 },
  /** POST /api/paystack/fulfill - verifies against Paystack; safe but not free. */
  fulfill: { limit: 20, windowSeconds: 600 },
  /** POST /api/cart/validate - read-only, called on every cart page view. */
  cartValidate: { limit: 60, windowSeconds: 600 },
  /** POST /api/account/request-code - sends an email to a customer-supplied address. */
  requestCode: { limit: 5, windowSeconds: 900 },
  /** POST /api/orders/track - guessing order numbers should be slow. */
  orderTrack: { limit: 20, windowSeconds: 600 },
  /**
   * GET /api/proxy/* - public catalogue reads. Unthrottled, a scraper can hammer
   * these and burn the shared PayGlobe API key's rate limit, which locks out real
   * customers. Generous because a shopper browsing produces a burst per page.
   */
  catalogue: { limit: 120, windowSeconds: 600 },
} as const;

/** 429 response with the headers a well-behaved client expects. */
export function rateLimitedResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please wait a moment and try again.',
      code: 'rate_limited',
      retry_after: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter),
      },
    }
  );
}
