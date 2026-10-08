import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { RATE_LIMITS, rateLimit, rateLimitedResponse } from '@/lib/server/rate-limit';
import { applyCatalogueScope, catalogueScopeParams } from '@/lib/server/store-scope';

const PAYGLOBE_API_URL = process.env.NEXT_PUBLIC_PAYGLOBE_API_URL || 'https://api.payglobe.net';

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, 'catalogue', RATE_LIMITS.catalogue.limit, RATE_LIMITS.catalogue.windowSeconds);
  if (!limit.ok) {
    return rateLimitedResponse(limit);
  }

  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams(searchParams);
    
    // Always scope to this shop's store/merchant - never let a caller widen it.
    applyCatalogueScope(params);
    
    const url = `${PAYGLOBE_API_URL}/api/v1/merchants/public/products/trending/?${params.toString()}`;
    
    const response = await axios.get(url, {
      timeout: 30000,
    });
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.warn('Trending endpoint failed; falling back to featured products:', axios.isAxiosError(error) ? error.message : error);
    
    // Fallback to featured products so the homepage still has data to show
    try {
      const fallbackParams = new URLSearchParams(catalogueScopeParams());
      const fallbackUrl = `${PAYGLOBE_API_URL}/api/v1/merchants/public/products/featured/?${fallbackParams.toString()}`;
      const fallbackResponse = await axios.get(fallbackUrl, { timeout: 30000 });
      return NextResponse.json(fallbackResponse.data);
    } catch (fallbackError) {
      console.error('Proxy error:', fallbackError);
      const message = axios.isAxiosError(fallbackError) 
        ? fallbackError.response?.data?.detail || fallbackError.message 
        : 'Failed to fetch trending products';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
}
