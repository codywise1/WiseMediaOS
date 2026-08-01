/**
 * Pure invoice aggregation helpers.
 *
 * Void invoices are excluded from every money figure: unpaid, overdue,
 * outstanding, revenue, and chart data. They remain visible in the "All"
 * list and the "Void" filter tab for auditability.
 *
 * These helpers are framework-agnostic and unit-tested so the accounting
 * logic can be verified independently of the React components that render it.
 */

export interface InvoiceAggregate {
  id: string;
  status: string;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  issued_at?: string | null;
  created_at: string;
}

/** True when an invoice is void and must be excluded from all money figures. */
export function isVoid(inv: Pick<InvoiceAggregate, 'status'>): boolean {
  return inv.status?.toLowerCase() === 'void';
}

/** Statuses that count as "unpaid" for the Unpaid tab and outstanding total. */
const UNPAID_STATUSES = new Set(['pending', 'unpaid', 'ready']);

export function isUnpaid(inv: Pick<InvoiceAggregate, 'status'>): boolean {
  return UNPAID_STATUSES.has(inv.status?.toLowerCase() ?? '');
}

/**
 * True when an invoice is genuinely overdue: it is unpaid (not void, not
 * paid, not draft) AND its due date is in the past OR its status is
 * explicitly 'overdue'. A void invoice is never overdue.
 */
export function isInvoiceOverdue(
  inv: Pick<InvoiceAggregate, 'status' | 'due_date' | 'paid_at'>,
): boolean {
  const s = inv.status?.toLowerCase() ?? '';
  if (s === 'paid' || s === 'void' || s === 'draft') return false;
  if (s === 'overdue') return true;
  if (!UNPAID_STATUSES.has(s)) return false;
  if (!inv.due_date) return false;
  const due = new Date(inv.due_date);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < Date.now();
}

/** Number of days an invoice is overdue (0 if not overdue). */
export function daysOverdue(inv: Pick<InvoiceAggregate, 'status' | 'due_date'>): number | null {
  if (!isInvoiceOverdue(inv)) return null;
  if (!inv.due_date) return null;
  const due = new Date(inv.due_date);
  if (Number.isNaN(due.getTime())) return null;
  return Math.floor((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24));
}

/** Sum of amounts for invoices matching a predicate, void excluded. */
function sumExcludingVoid(
  invoices: InvoiceAggregate[],
  predicate: (inv: InvoiceAggregate) => boolean,
): number {
  return invoices
    .filter((inv) => !isVoid(inv) && predicate(inv))
    .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
}

/** Total of unpaid (pending/unpaid/ready) invoices, void excluded. */
export function totalUnpaid(invoices: InvoiceAggregate[]): number {
  return sumExcludingVoid(invoices, (inv) => isUnpaid(inv));
}

/** Total of overdue invoices, void excluded. Overdue is a subset of unpaid. */
export function totalOverdue(invoices: InvoiceAggregate[]): number {
  return sumExcludingVoid(invoices, (inv) => isInvoiceOverdue(inv));
}

/**
 * Total outstanding = sum of all unpaid invoices (void excluded), counted
 * once each. Overdue invoices are a subset of unpaid, so they are NOT added
 * on top — this fixes the double-count bug where a past-due 'pending'
 * invoice was counted in both the pending sum and the overdue sum.
 */
export function totalOutstanding(invoices: InvoiceAggregate[]): number {
  return totalUnpaid(invoices);
}

/** Total collected from paid invoices, void excluded. */
export function totalPaid(invoices: InvoiceAggregate[]): number {
  return sumExcludingVoid(invoices, (inv) => inv.status?.toLowerCase() === 'paid');
}

/** Count of unpaid invoices, void excluded. */
export function countUnpaid(invoices: InvoiceAggregate[]): number {
  return invoices.filter((inv) => !isVoid(inv) && isUnpaid(inv)).length;
}

/** Count of overdue invoices, void excluded. */
export function countOverdue(invoices: InvoiceAggregate[]): number {
  return invoices.filter((inv) => !isVoid(inv) && isInvoiceOverdue(inv)).length;
}

/** Count of paid invoices, void excluded. */
export function countPaid(invoices: InvoiceAggregate[]): number {
  return invoices.filter((inv) => !isVoid(inv) && inv.status?.toLowerCase() === 'paid').length;
}

/** Count of void invoices. */
export function countVoid(invoices: InvoiceAggregate[]): number {
  return invoices.filter((inv) => isVoid(inv)).length;
}

/**
 * Returns the revenue date for a paid invoice (paid_at if present, else null).
 * Void and unpaid invoices always return null so they never appear in revenue.
 */
export function paidDate(inv: Pick<InvoiceAggregate, 'status' | 'paid_at'>): string | null {
  return inv.status?.toLowerCase() === 'paid' && inv.paid_at ? inv.paid_at : null;
}

export function paidDateObj(inv: Pick<InvoiceAggregate, 'status' | 'paid_at'>): Date | null {
  const pd = paidDate(inv);
  if (!pd) return null;
  const d = new Date(pd);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Revenue collected in the last 7 days, void excluded. */
export function revenueLast7Days(invoices: InvoiceAggregate[], now: Date = new Date()): number {
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return sumExcludingVoid(invoices, (inv) => {
    const d = paidDateObj(inv);
    return d !== null && d >= cutoff;
  });
}

/** Revenue collected in the last 30 days, void excluded. */
export function revenueLast30Days(invoices: InvoiceAggregate[], now: Date = new Date()): number {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return sumExcludingVoid(invoices, (inv) => {
    const d = paidDateObj(inv);
    return d !== null && d >= cutoff;
  });
}

/** Revenue collected this quarter, void excluded. */
export function revenueThisQuarter(invoices: InvoiceAggregate[], now: Date = new Date()): number {
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  return sumExcludingVoid(invoices, (inv) => {
    const d = paidDateObj(inv);
    return d !== null && d >= quarterStart;
  });
}

/** Revenue collected in a specific calendar month, void excluded. */
export function revenueForMonth(invoices: InvoiceAggregate[], year: number, month: number): number {
  return sumExcludingVoid(invoices, (inv) => {
    const d = paidDateObj(inv);
    return d !== null && d.getMonth() === month && d.getFullYear() === year;
  });
}

export interface ChartPoint {
  label: string;
  value: number;
}

/** Monthly revenue chart data for the last N months, void excluded. */
export function monthlyRevenueChart(
  invoices: InvoiceAggregate[],
  pointCount: number,
  now: Date = new Date(),
): ChartPoint[] {
  const monthAbbr = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  return Array.from({ length: pointCount }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (pointCount - 1 - i), 1);
    const value = revenueForMonth(invoices, d.getFullYear(), d.getMonth());
    return { label: `${monthAbbr(d)} '${String(d.getFullYear()).slice(-2)}`, value };
  });
}
