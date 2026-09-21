import { NextRequest, NextResponse } from 'next/server';
import { fulfillFromReference, listSuccessfulTransactions } from '@/lib/server/paystack';

/**
 * Reconciliation sweep — the backstop for orphaned payments.
 *
 * The normal chain (success page + webhook retries + 409-aware retry classification)
 * covers almost every failure. The one gap that remains: Paystack has retried the
 * webhook and given up while PayGlobe was unreachable, and the customer closed their
 * browser. The money sits in Adwoa's Paystack account and nothing anywhere retries.
 *
 * This endpoint lists recent successful charges and re-runs fulfilment for each one
 * that carries our checkout metadata. It is safe to run repeatedly because PayGlobe
 * deduplicates by external_order_id - an already-recorded order just returns its
 * existing record.
 *
 * Scheduled by Vercel Cron (see vercel.json). Vercel automatically sends
 * `Authorization: Bearer $CRON_SECRET` on cron invocations when CRON_SECRET is set;
 * the endpoint refuses to run without it, because an unauthenticated sweep is an
 * oracle for probing which references were paid.
 */

/** How far back to sweep. Should exceed Paystack's webhook retry window (~72h). */
const LOOKBACK_HOURS = Number(process.env.RECONCILE_LOOKBACK_HOURS || 72);

function isAuthorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // no secret configured => endpoint stays closed
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);

  let transactions;
  try {
    transactions = await listSuccessfulTransactions(since);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'transaction listing failed';
    console.error('RECONCILE_LIST_FAILED error=%s', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const summary = {
    scanned: transactions.length,
    ours: 0,
    ensured: 0,
    refunded: 0,
    still_failing: [] as string[],
    skipped_foreign: 0,
  };

  // Serial, not parallel: this is a backstop, not a hot path, and hammering PayGlobe
  // and Paystack in parallel is how a safety net becomes an outage.
  for (const tx of transactions) {
    // "Ours" means both markers, same as fulfillFromReference's foreign gate: a
    // foreign transaction that happens to carry an external_order_id field must
    // still not be touched.
    const meta = tx.metadata as { source?: string; external_order_id?: string } | null;
    if (meta?.source !== 'ab_essentia' || !meta.external_order_id) {
      // A successful charge that did not come through this storefront's checkout.
      // Not ours to refund or record - but worth a count if the account is expected
      // to be storefront-only.
      summary.skipped_foreign += 1;
      continue;
    }
    summary.ours += 1;

    try {
      const result = await fulfillFromReference(tx.reference, { autoRefund: true });
      if (result.status === 'foreign') {
        summary.skipped_foreign += 1;
        summary.ours -= 1;
      } else if (result.status === 'refunded') {
        summary.refunded += 1;
        console.error(
          'RECONCILE_REFUNDED reference=%s refund_id=%s error=%s',
          tx.reference, result.refund_id, result.error
        );
      } else if (result.success) {
        summary.ensured += 1;
      } else {
        summary.still_failing.push(tx.reference);
        console.error(
          'RECONCILE_STILL_FAILING reference=%s status=%s error=%s',
          tx.reference, result.status, result.error
        );
      }
    } catch (error) {
      // Retryable fulfilment failure (PayGlobe still down, in-flight race). The next
      // sweep catches it; meanwhile this log line is the one to alert on - it means
      // money is sitting with no order behind it.
      summary.still_failing.push(tx.reference);
      console.error(
        'RECONCILE_STILL_FAILING reference=%s error=%s',
        tx.reference, error instanceof Error ? error.message : error
      );
    }
  }

  return NextResponse.json({ status: 'ok', lookback_hours: LOOKBACK_HOURS, ...summary });
}
