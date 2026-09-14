import axios, { AxiosError } from 'axios';

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value !== '') return Number(value);
  return undefined;
};

const normalizeProduct = (product: unknown) => {
  const p = product as Record<string, unknown> | null | undefined;
  return {
    id: String(p?.id ?? ''),
    name: String(p?.name ?? ''),
    price: Number(p?.price ?? 0),
    description: asString(p?.description),
    image: asString(p?.image_url || p?.thumbnail_url || p?.image),
    category: asString(p?.category_name || p?.category),
    stock: Number(p?.stock_quantity ?? 0),
    rating: asNumber(p?.rating),
    isAvailable: Boolean(p?.is_available ?? true),
    createdAt: asString(p?.created_at),
    sku: asString(p?.sku),
  };
};

const normalizeProductList = (data: unknown) => {
  const results = Array.isArray(data) ? data : (data as Record<string, unknown> | null)?.results ?? [];
  return (results as unknown[]).map(normalizeProduct);
};

const api = axios.create({
  baseURL: '/api/proxy', // Use Next.js API proxy to avoid CORS
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    console.error('API Response Error:', error);
    
    if (error.response) {
      // Server responded with error status
      console.error('Error Data:', error.response.data);
      console.error('Error Status:', error.response.status);
    } else if (error.request) {
      // Request made but no response
      console.error('No response received:', error.request);
    } else {
      // Error in request setup
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Product API functions
export const productApi = {
  getAll: async (params?: Record<string, string | number | boolean>) => {
    const baseParams = { ...params, include_out_of_stock: true };

    const fetchPage = async (pageParams: Record<string, string | number | boolean>) => {
      const response = await api.get('/products/', { params: pageParams });
      const data = response.data as Record<string, unknown> | null;
      if (data && typeof data === 'object' && 'results' in data) {
        return {
          results: normalizeProductList(data.results),
          count: Number(data.count ?? 0),
          next: data.next as string | null | undefined,
          previous: data.previous as string | null | undefined,
        };
      }
      return {
        results: normalizeProductList(response.data),
        count: normalizeProductList(response.data).length,
        next: null,
        previous: null,
      };
    };

    let page = await fetchPage(baseParams);
    let results = page.results;
    const count = page.count;
    let next = page.next;

    while (next && typeof next === 'string') {
      let nextPage: number | null = null;
      try {
        const nextUrl = new URL(next);
        const pageParam = nextUrl.searchParams.get('page');
        if (pageParam) {
          nextPage = parseInt(pageParam, 10);
        }
      } catch {
        nextPage = null;
      }

      if (!nextPage || Number.isNaN(nextPage)) {
        break;
      }

      page = await fetchPage({ ...baseParams, page: nextPage });
      results = results.concat(page.results);
      next = page.next;
    }

    return {
      results,
      count,
      next: null,
      previous: null,
    };
  },

  getById: async (productId: string) => {
    const response = await api.get(`/products/${productId}/`);
    return normalizeProduct(response.data);
  },

  getFeatured: async () => {
    const response = await api.get('/featured/', {
      params: { include_out_of_stock: true },
    });
    return normalizeProductList(response.data);
  },

  getTrending: async () => {
    const response = await api.get('/trending/', {
      params: { include_out_of_stock: true },
    });
    return normalizeProductList(response.data);
  },

  getBundles: async () => {
    const response = await api.get('/bundles/');
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/categories/');
    const cats = (response.data as Record<string, unknown> | null)?.categories || response.data || [];
    return (cats as unknown[]).map((cat: unknown) => {
      if (typeof cat === 'string') {
        return { id: '', name: cat };
      }
      const c = cat as Record<string, unknown> | null | undefined;
      return {
        id: String(c?.id ?? ''),
        name: String(c?.name ?? ''),
        description: asString(c?.description),
        image: asString(c?.image),
      };
    });
  },

};

// Payment API functions
export const paymentApi = {
  initiatePaystack: async (data: {
    email: string;
    currency?: string;
    callback_url?: string;
    customer_name?: string;
    customer_phone?: string;
    shipping_address: string;
    shipping_city: string;
    shipping_state: string;
    shipping_postal_code?: string;
    shipping_country?: string;
    shipping_phone: string;
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
      shipping_cost: number;
    };
  },

  fulfillPaystack: async (data: { reference: string }) => {
    const response = await axios.post('/api/paystack/fulfill', data);
    return response.data as {
      success: boolean;
      status?: 'succeeded' | 'not_paid' | 'error' | 'refunded';
      order_number?: string | null;
      order_id?: string | null;
      reference: string;
      refund_id?: string;
      error?: string;
    };
  },
};

export default api;
