/**
 * Server-only, environment-derived configuration.
 *
 * Single source for the PayGlobe base URLs and the canonical site host so the
 * API client, catalogue fetcher, proxy routes and SEO routes cannot drift apart.
 */

/** PayGlobe's public (unauthenticated) API base, no trailing slash. */
export const PAYGLOBE_PUBLIC_BASE = (
  process.env.NEXT_PUBLIC_PAYGLOBE_API_URL || 'https://api.payglobe.net'
).replace(/\/+$/, '');

/**
 * PayGlobe's external (headless-commerce, API-key) base. Defaults to the public
 * base plus the standard path; overridable via PAYGLOBE_BASE_URL.
 */
export const PAYGLOBE_EXTERNAL_BASE = (
  process.env.PAYGLOBE_BASE_URL || `${PAYGLOBE_PUBLIC_BASE}/api/v1/external`
).replace(/\/+$/, '');

/**
 * Canonical production host for build-time consumers (metadata, robots, sitemap)
 * when NEXT_PUBLIC_SITE_URL is unset. Must be the host that serves content
 * directly (www), since the apex 308-redirects.
 */
export const DEFAULT_SITE_URL = 'https://www.abessentiagh.com';
