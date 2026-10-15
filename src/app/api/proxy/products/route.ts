import { NextRequest } from 'next/server';
import { proxyCatalogue } from '@/lib/server/catalogue-proxy';

export async function GET(request: NextRequest) {
  return proxyCatalogue(request, '/api/v1/merchants/public/products/');
}
