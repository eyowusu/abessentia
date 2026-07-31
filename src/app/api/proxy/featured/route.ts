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
    
    const url = `${PAYGLOBE_API_URL}/api/v1/merchants/public/products/featured/?${params.toString()}`;
    
    const response = await axios.get(url, {
      timeout: 30000,
    });
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error);
    const message = axios.isAxiosError(error) 
      ? error.response?.data?.detail || error.message 
      : 'Failed to fetch featured products';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
