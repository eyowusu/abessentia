/**
 * Extract a customer-presentable message from an API failure.
 *
 * Prefers the server's `{error}` payload (our routes always return one) over the
 * raw Error message, so callers show "Insufficient stock for X" rather than
 * "Request failed with status code 409".
 */
export function apiError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: unknown }; message?: string };
    const data =
      e.response?.data && typeof e.response.data === 'object'
        ? (e.response.data as { error?: string })
        : undefined;
    if (data?.error) return data.error;
    if (e.message) return e.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
