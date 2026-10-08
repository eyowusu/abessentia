/**
 * Store/merchant scoping for PayGlobe's PUBLIC catalogue endpoints.
 *
 * These endpoints are unauthenticated, so the scope parameter is the only thing
 * that scopes results to this shop. A missing scope must throw: silently sending
 * an unscoped request either serves another merchant's catalogue or fails
 * upstream - both are wrong answers to show a shopper.
 *
 * `store_id` wins when both are set, matching getScopeParams() in payglobe.ts.
 * No default store id: a hardcoded fallback was previously '2', which works only
 * as long as this merchant keeps that exact id - an assumption the config
 * contract (set exactly one of STORE_ID / MERCHANT_ID) does not make.
 */
export function catalogueScopeParams(): Record<string, string> {
  const storeId = process.env.NEXT_PUBLIC_STORE_ID?.trim();
  const merchantId = process.env.NEXT_PUBLIC_MERCHANT_ID?.trim();

  if (storeId) return { store_id: storeId };
  if (merchantId) return { merchant_id: merchantId };

  throw new Error(
    'Store scope is not configured: set NEXT_PUBLIC_STORE_ID or NEXT_PUBLIC_MERCHANT_ID'
  );
}

/** Apply the scope to a URLSearchParams, replacing any caller-supplied values. */
export function applyCatalogueScope(params: URLSearchParams): void {
  const scope = catalogueScopeParams();
  for (const [key, value] of Object.entries(scope)) {
    params.set(key, value);
  }
}
