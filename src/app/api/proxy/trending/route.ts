import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const PAYGLOBE_API_URL = process.env.NEXT_PUBLIC_PAYGLOBE_API_URL || 'https://api.payglobe.net';
const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID || '2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams(searchParams);
    
    // Always add store_id to scope to AB Essentia store
    params.set('store_id', STORE_ID);
    
    const url = `${PAYGLOBE_API_URL}/api/v1/merchants/public/products/trending/?${params.toString()}`;
    
    const response = await axios.get(url, {
      timeout: 30000,
    });
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.warn('Trending endpoint failed; falling back to featured products:', axios.isAxiosError(error) ? error.message : error);
    
    // Fallback to featured products so the homepage still has data to show
    try {
      const fallbackUrl = `${PAYGLOBE_API_URL}/api/v1/merchants/public/products/featured/?store_id=${STORE_ID}`;
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
