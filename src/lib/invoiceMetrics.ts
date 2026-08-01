/**
 * Unified invoice metrics — the single source of truth for every financial
 * figure in the app. Dashboard, Invoices, and Analytics all import from here.
 *
 * Rules (from the build spec):
 * - outstanding = sum of invoices with status pending or overdue.
 *   Never includes paid, draft, or void.
 * - overdue = unpaid AND dueDate < now. Derived, never stored as a user-set status.
 * - totalOutstanding must equal the sum of amounts rendered under the Unpaid filter.
 * - Void invoices are excluded from every figure.
 */

import {
  isVoid,
  isUnpaid,
  isInvoiceOverdue,
  totalUnpaid,
  totalOverdue,
  totalPaid,
  countUnpaid,
  countOverdue,
  countPaid,
  paidDateObj,
  type InvoiceAggregate,
} from './invoiceAggregations';

export interface InvoiceMetricsInput {
  /** ISO date string for "now" — defaults to new Date().toISOString() */
  now?: string;
  /** Start of the reporting period (e.g. quarter start). Optional. */
  periodStart?: string;
  /** End of the reporting period. Optional. */
  periodEnd?: string;
}

export interface InvoiceMetrics {
  totalOutstanding: number;
  overdueFunds: number;
  overdueCount: number;
  unpaidCount: number;
  paidCount: number;
  /** Revenue collected within the period [periodStart, periodEnd). */
  periodRevenue: number;
  /** Revenue collected in the prior equivalent period. */
  priorPeriodRevenue: number;
  /** Percent change from prior to current period. Null when no valid comparison. */
  deltaPct: number | null;
  /** Total collected from all paid invoices (all time). */
  collected: number;
}

function sumInPeriod(
  invoices: InvoiceAggregate[],
  start: Date,
  end: Date,
): number {
  return invoices
    .filter((inv) => {
      if (isVoid(inv) || inv.status?.toLowerCase() !== 'paid') return false;
      const d = paidDateObj(inv);
      return d !== null && d >= start && d < end;
    })
    .reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
}

/**
 * Compute every financial figure from a list of invoices.
 * Every page that shows money should call this — no per-component math.
 */
export function getInvoiceMetrics(
  invoices: InvoiceAggregate[],
  opts: InvoiceMetricsInput = {},
): InvoiceMetrics {
  const nowStr = opts.now ?? new Date().toISOString();
  const now = new Date(nowStr);

  const totalOutstanding = totalUnpaid(invoices);
  const overdueFunds = totalOverdue(invoices);
  const overdueCount = countOverdue(invoices);
  const unpaidCount = countUnpaid(invoices);
  const paidCount = countPaid(invoices);
  const collected = totalPaid(invoices);

  // Period revenue
  let periodRevenue = 0;
  let priorPeriodRevenue = 0;
  let deltaPct: number | null = null;

  if (opts.periodStart) {
    const start = new Date(opts.periodStart);
    const end = opts.periodEnd ? new Date(opts.periodEnd) : now;
    periodRevenue = sumInPeriod(invoices, start, end);

    // Prior equivalent period: shift by the period's own duration
    const duration = end.getTime() - start.getTime();
    const priorStart = new Date(start.getTime() - duration);
    const priorEnd = new Date(end.getTime() - duration);
    priorPeriodRevenue = sumInPeriod(invoices, priorStart, priorEnd);

    if (priorPeriodRevenue === 0 && periodRevenue === 0) {
      deltaPct = null;
    } else if (priorPeriodRevenue === 0) {
      deltaPct = 100;
    } else {
      deltaPct = Math.round(((periodRevenue - priorPeriodRevenue) / priorPeriodRevenue) * 100);
    }
  }

  return {
    totalOutstanding,
    overdueFunds,
    overdueCount,
    unpaidCount,
    paidCount,
    periodRevenue,
    priorPeriodRevenue,
    deltaPct,
    collected,
  };
}

/** Quarter start date for the given date (or now). */
export function quarterStart(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
}

/** Prior quarter start date. */
export function priorQuarterStart(d: Date = new Date()): Date {
  const q = quarterStart(d);
  return new Date(q.getFullYear(), q.getMonth() - 3, 1);
}

/** Month start for the given date (or now). */
export function monthStart(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Prior month start. */
export function priorMonthStart(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

/** Year start for the given date. */
export function yearStart(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), 0, 1);
}

/** Prior year start. */
export function priorYearStart(d: Date = new Date()): Date {
  return new Date(d.getFullYear() - 1, 0, 1);
}

// Re-export the aggregation helpers so callers can import everything from one module.
export {
  isVoid,
  isUnpaid,
  isInvoiceOverdue,
  totalUnpaid,
  totalOverdue,
  totalPaid,
  countUnpaid,
  countOverdue,
  countPaid,
  paidDateObj,
};
export type { InvoiceAggregate };
