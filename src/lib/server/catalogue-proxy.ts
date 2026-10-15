import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { PAYGLOBE_PUBLIC_BASE } from './config';
import { applyCatalogueScope } from './store-scope';
import { RATE_LIMITS, rateLimit, rateLimitedResponse } from './rate-limit';

/**
 * Forward a browser catalogue request to PayGlobe's public API, same-origin.
 *
 * Exists because the browser cannot call PayGlobe directly without a CORS
 * whitelist entry, and must never see anything but this shop's catalogue:
 * applyCatalogueScope() overwrites any caller-supplied scope params.
 * Throttled on the shared 'catalogue' bucket so a scraper cannot burn the
 * site-wide budget that real customers need.
 */
export async function proxyCatalogue(
  request: NextRequest,
  upstreamPath: string
): Promise<NextResponse | Response> {
  const limit = rateLimit(
    request,
    'catalogue',
    RATE_LIMITS.catalogue.limit,
    RATE_LIMITS.catalogue.windowSeconds
  );
  if (!limit.ok) {
    return rateLimitedResponse(limit);
  }

  try {
    const params = new URL(request.url).searchParams;
    // Always scope to this shop's store/merchant - never let a caller widen it.
    applyCatalogueScope(params);

    const response = await axios.get(
      `${PAYGLOBE_PUBLIC_BASE}${upstreamPath}?${params.toString()}`,
      { timeout: 30000 }
    );

    return NextResponse.json(response.data);
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? ((error.response?.data as { detail?: string } | undefined)?.detail || error.message)
      : 'Failed to fetch from the catalogue';
    console.error(`Catalogue proxy error (${upstreamPath}):`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
