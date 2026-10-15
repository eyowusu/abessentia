import axios from 'axios';
import { normalizeCategoryList, normalizeProductList } from './catalogue';

/**
 * Browser-facing API calls.
 *
 * Catalogue reads go through the same-origin /api/proxy routes (no CORS needed,
 * and the server forces this shop's store scope onto every request). Payment
 * calls hit our own API routes; amounts are always computed server-side, never
 * sent by the client.
 */
export const productApi = {
  /**
   * The full catalogue, following pagination. Used only as a fallback when the
   * server render had nothing to show (e.g. the catalogue API was unreachable
   * at revalidate time) - normal browsing is served by lib/server/catalogue.ts.
   */
  getAll: async (params?: Record<string, string | number | boolean>) => {
    const baseParams = { ...params, include_out_of_stock: true };

    const fetchPage = async (pageParams: Record<string, string | number | boolean>) => {
      const response = await axios.get('/api/proxy/products/', {
        params: pageParams,
        timeout: 60000,
      });
      const data = response.data as Record<string, unknown> | null;
      if (data && typeof data === 'object' && 'results' in data) {
        return {
          results: normalizeProductList(data.results),
          next: data.next as string | null | undefined,
        };
      }
      return { results: normalizeProductList(response.data), next: null };
    };

    let page = await fetchPage(baseParams);
    const results = page.results;
    let next = page.next;

    while (next && typeof next === 'string') {
      let nextPage: number | null = null;
      try {
        const pageParam = new URL(next).searchParams.get('page');
        nextPage = pageParam ? parseInt(pageParam, 10) : null;
      } catch {
        nextPage = null;
      }

      if (!nextPage || Number.isNaN(nextPage)) {
        break;
      }

      page = await fetchPage({ ...baseParams, page: nextPage });
      results.push(...page.results);
      next = page.next;
    }

    return { results };
  },

  getCategories: async () => {
    const response = await axios.get('/api/proxy/categories/', { timeout: 60000 });
    return normalizeCategoryList(response.data);
  },
};

export const paymentApi = {
  initiatePaystack: async (data: {
    email: string;
    callback_url?: string;
    customer_name?: string;
    customer_phone?: string;
    shipping_address: string;
    shipping_city: string;
    shipping_state: string;
    shipping_postal_code?: string;
    shipping_country?: string;
    shipping_phone: string;
    coupon?: string;
    items: Array<{ product_id: string | number; quantity: number }>;
  }) => {
    const response = await axios.post('/api/paystack/initiate', data);
    return response.data as {
      authorization_url: string;
      reference: string;
      access_code: string;
      external_order_id: string;
      amount: number;
      subtotal: number;
      discount?: number;
      coupon_code?: string | null;
      promo?: string | null;
      shipping_cost: number;
    };
  },

  fulfillPaystack: async (data: { reference: string }) => {
    const response = await axios.post('/api/paystack/fulfill', data);
    return response.data as {
      success: boolean;
      status?: 'succeeded' | 'not_paid' | 'error' | 'refunded' | 'foreign';
      order_number?: string | null;
      order_id?: string | null;
      reference: string;
      refund_id?: string;
      error?: string;
    };
  },
};
