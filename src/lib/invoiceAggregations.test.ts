import { describe, it, expect, beforeEach } from 'vitest';
import {
  isVoid,
  isUnpaid,
  isInvoiceOverdue,
  totalUnpaid,
  totalOverdue,
  totalOutstanding,
  totalPaid,
  countUnpaid,
  countOverdue,
  countPaid,
  countVoid,
  revenueLast7Days,
  revenueLast30Days,
  revenueThisQuarter,
  revenueForMonth,
  paidDateObj,
  monthlyRevenueChart,
  type InvoiceAggregate,
} from './invoiceAggregations';

const NOW = new Date('2026-08-01T12:00:00Z');

function makeInv(partial: Partial<InvoiceAggregate> & { id: string }): InvoiceAggregate {
  return {
    status: 'pending',
    amount: 100,
    due_date: '2026-08-15T00:00:00Z',
    paid_at: null,
    issued_at: null,
    created_at: '2026-07-01T00:00:00Z',
    ...partial,
  };
}

describe('isVoid', () => {
  it('returns true for void status', () => {
    expect(isVoid({ status: 'void' })).toBe(true);
    expect(isVoid({ status: 'Void' })).toBe(true);
    expect(isVoid({ status: 'VOID' })).toBe(true);
  });
  it('returns false for other statuses', () => {
    expect(isVoid({ status: 'paid' })).toBe(false);
    expect(isVoid({ status: 'pending' })).toBe(false);
    expect(isVoid({ status: 'overdue' })).toBe(false);
  });
});

describe('isUnpaid', () => {
  it('returns true for pending, unpaid, ready', () => {
    expect(isUnpaid({ status: 'pending' })).toBe(true);
    expect(isUnpaid({ status: 'unpaid' })).toBe(true);
    expect(isUnpaid({ status: 'ready' })).toBe(true);
  });
  it('returns false for paid, void, overdue, draft', () => {
    expect(isUnpaid({ status: 'paid' })).toBe(false);
    expect(isUnpaid({ status: 'void' })).toBe(false);
    expect(isUnpaid({ status: 'overdue' })).toBe(false);
    expect(isUnpaid({ status: 'draft' })).toBe(false);
  });
});

describe('isInvoiceOverdue', () => {
  it('returns true for explicit overdue status', () => {
    expect(isInvoiceOverdue({ status: 'overdue', due_date: null, paid_at: null })).toBe(true);
  });
  it('returns true for pending past due date', () => {
    expect(isInvoiceOverdue({ status: 'pending', due_date: '2026-07-01T00:00:00Z', paid_at: null })).toBe(true);
  });
  it('returns false for pending with future due date', () => {
    expect(isInvoiceOverdue({ status: 'pending', due_date: '2026-12-01T00:00:00Z', paid_at: null })).toBe(false);
  });
  it('returns false for paid invoices even if past due date', () => {
    expect(isInvoiceOverdue({ status: 'paid', due_date: '2020-01-01T00:00:00Z', paid_at: '2020-01-02T00:00:00Z' })).toBe(false);
  });
  it('returns false for draft', () => {
    expect(isInvoiceOverdue({ status: 'draft', due_date: '2020-01-01T00:00:00Z', paid_at: null })).toBe(false);
  });
  it('returns false for void even if past due date', () => {
    expect(isInvoiceOverdue({ status: 'void', due_date: '2020-01-01T00:00:00Z', paid_at: null })).toBe(false);
  });
  it('returns false for void with explicit overdue status field', () => {
    expect(isInvoiceOverdue({ status: 'void', due_date: '2020-01-01T00:00:00Z', paid_at: null })).toBe(false);
  });
});

describe('totalUnpaid', () => {
  it('sums pending, unpaid, and ready invoices', () => {
    const invoices = [
      makeInv({ id: '1', status: 'pending', amount: 100 }),
      makeInv({ id: '2', status: 'unpaid', amount: 200 }),
      makeInv({ id: '3', status: 'ready', amount: 50 }),
    ];
    expect(totalUnpaid(invoices)).toBe(350);
  });
  it('excludes void invoices', () => {
    const invoices = [
      makeInv({ id: '1', status: 'pending', amount: 100 }),
      makeInv({ id: '2', status: 'void', amount: 500 }),
    ];
    expect(totalUnpaid(invoices)).toBe(100);
  });
  it('excludes paid, overdue, draft', () => {
    const invoices = [
      makeInv({ id: '1', status: 'paid', amount: 100 }),
      makeInv({ id: '2', status: 'overdue', amount: 200 }),
      makeInv({ id: '3', status: 'draft', amount: 50 }),
    ];
    expect(totalUnpaid(invoices)).toBe(0);
  });
});

describe('totalOverdue', () => {
  it('sums overdue invoices', () => {
    const invoices = [
      makeInv({ id: '1', status: 'overdue', amount: 100 }),
      makeInv({ id: '2', status: 'overdue', amount: 200 }),
    ];
    expect(totalOverdue(invoices)).toBe(300);
  });
  it('sums pending invoices that are past due', () => {
    const invoices = [
      makeInv({ id: '1', status: 'pending', amount: 105, due_date: '2026-07-31T00:00:00Z' }),
    ];
    expect(totalOverdue(invoices)).toBe(105);
  });
  it('excludes void invoices even if past due', () => {
    const invoices = [
      makeInv({ id: '1', status: 'void', amount: 105, due_date: '2026-07-31T00:00:00Z' }),
    ];
    expect(totalOverdue(invoices)).toBe(0);
  });
});

describe('totalOutstanding — the bug fix', () => {
  it('equals unpaid sum, not unpaid + overdue (no double count)', () => {
    // INV-000106: pending, past due — would be double-counted in the old code
    const invoices = [
      makeInv({ id: '106', status: 'pending', amount: 105, due_date: '2026-07-31T00:00:00Z' }),
      makeInv({ id: '103', status: 'pending', amount: 105, due_date: '2026-08-20T00:00:00Z' }),
      makeInv({ id: 'other1', status: 'pending', amount: 500, due_date: '2026-09-01T00:00:00Z' }),
      makeInv({ id: 'other2', status: 'pending', amount: 500, due_date: '2026-09-02T00:00:00Z' }),
      makeInv({ id: 'other3', status: 'pending', amount: 500, due_date: '2026-09-03T00:00:00Z' }),
      makeInv({ id: 'other4', status: 'pending', amount: 208, due_date: '2026-09-04T00:00:00Z' }),
    ];
    // All 6 are unpaid = 1918
    expect(totalUnpaid(invoices)).toBe(1918);
    // Only INV-000106 is overdue = 105
    expect(totalOverdue(invoices)).toBe(105);
    // Outstanding must equal unpaid (1918), NOT 1918 + 105 = 2023
    expect(totalOutstanding(invoices)).toBe(1918);
    expect(totalOutstanding(invoices)).not.toBe(2023);
  });
  it('drops by exactly 105 when INV-000106 is voided', () => {
    const before = [
      makeInv({ id: '106', status: 'pending', amount: 105, due_date: '2026-07-31T00:00:00Z' }),
      makeInv({ id: '103', status: 'pending', amount: 105, due_date: '2026-08-20T00:00:00Z' }),
      makeInv({ id: 'o1', status: 'pending', amount: 500, due_date: '2026-09-01T00:00:00Z' }),
      makeInv({ id: 'o2', status: 'pending', amount: 500, due_date: '2026-09-02T00:00:00Z' }),
      makeInv({ id: 'o3', status: 'pending', amount: 500, due_date: '2026-09-03T00:00:00Z' }),
      makeInv({ id: 'o4', status: 'pending', amount: 208, due_date: '2026-09-04T00:00:00Z' }),
    ];
    const afterVoid106 = [
      makeInv({ id: '106', status: 'void', amount: 105, due_date: '2026-07-31T00:00:00Z' }),
      ...before.slice(1),
    ];
    expect(totalOutstanding(before)).toBe(1918);
    expect(totalOutstanding(afterVoid106)).toBe(1813);
    expect(totalOutstanding(before) - totalOutstanding(afterVoid106)).toBe(105);
  });
  it('drops by exactly 210 when both INV-000106 and INV-000103 are voided', () => {
    const before = [
      makeInv({ id: '106', status: 'pending', amount: 105, due_date: '2026-07-31T00:00:00Z' }),
      makeInv({ id: '103', status: 'pending', amount: 105, due_date: '2026-08-20T00:00:00Z' }),
      makeInv({ id: 'o1', status: 'pending', amount: 500, due_date: '2026-09-01T00:00:00Z' }),
      makeInv({ id: 'o2', status: 'pending', amount: 500, due_date: '2026-09-02T00:00:00Z' }),
      makeInv({ id: 'o3', status: 'pending', amount: 500, due_date: '2026-09-03T00:00:00Z' }),
      makeInv({ id: 'o4', status: 'pending', amount: 208, due_date: '2026-09-04T00:00:00Z' }),
    ];
    const afterBothVoid = [
      makeInv({ id: '106', status: 'void', amount: 105, due_date: '2026-07-31T00:00:00Z' }),
      makeInv({ id: '103', status: 'void', amount: 105, due_date: '2026-08-20T00:00:00Z' }),
      ...before.slice(2),
    ];
    expect(totalOutstanding(before)).toBe(1918);
    expect(totalOutstanding(afterBothVoid)).toBe(1708);
    expect(totalOutstanding(before) - totalOutstanding(afterBothVoid)).toBe(210);
  });
  it('overdue funds drops to 0 when INV-000106 is voided', () => {
    const before = [
      makeInv({ id: '106', status: 'pending', amount: 105, due_date: '2026-07-31T00:00:00Z' }),
      makeInv({ id: '103', status: 'pending', amount: 105, due_date: '2026-08-20T00:00:00Z' }),
    ];
    const after = [
      makeInv({ id: '106', status: 'void', amount: 105, due_date: '2026-07-31T00:00:00Z' }),
      makeInv({ id: '103', status: 'pending', amount: 105, due_date: '2026-08-20T00:00:00Z' }),
    ];
    expect(totalOverdue(before)).toBe(105);
    expect(totalOverdue(after)).toBe(0);
  });
});

describe('totalPaid', () => {
  it('sums paid invoices', () => {
    const invoices = [
      makeInv({ id: '1', status: 'paid', amount: 100, paid_at: '2026-07-15T00:00:00Z' }),
      makeInv({ id: '2', status: 'paid', amount: 200, paid_at: '2026-07-20T00:00:00Z' }),
    ];
    expect(totalPaid(invoices)).toBe(300);
  });
  it('excludes void invoices', () => {
    const invoices = [
      makeInv({ id: '1', status: 'paid', amount: 100, paid_at: '2026-07-15T00:00:00Z' }),
      makeInv({ id: '2', status: 'void', amount: 200, paid_at: null }),
    ];
    expect(totalPaid(invoices)).toBe(100);
  });
});

describe('counts', () => {
  const invoices = [
    makeInv({ id: '1', status: 'paid', amount: 100, paid_at: '2026-07-15T00:00:00Z' }),
    makeInv({ id: '2', status: 'pending', amount: 100 }),
    makeInv({ id: '3', status: 'pending', amount: 100, due_date: '2026-07-01T00:00:00Z' }),
    makeInv({ id: '4', status: 'void', amount: 100 }),
    makeInv({ id: '5', status: 'void', amount: 100 }),
  ];
  it('counts paid excluding void', () => expect(countPaid(invoices)).toBe(1));
  it('counts unpaid excluding void', () => expect(countUnpaid(invoices)).toBe(2));
  it('counts overdue excluding void', () => expect(countOverdue(invoices)).toBe(1));
  it('counts void', () => expect(countVoid(invoices)).toBe(2));
});

describe('revenue figures — void exclusion', () => {
  it('excludes void from last 7 days', () => {
    const invoices = [
      makeInv({ id: '1', status: 'paid', amount: 500, paid_at: '2026-07-30T00:00:00Z' }),
      makeInv({ id: '2', status: 'void', amount: 999, paid_at: '2026-07-30T00:00:00Z' }),
    ];
    expect(revenueLast7Days(invoices, NOW)).toBe(500);
  });
  it('excludes void from last 30 days', () => {
    const invoices = [
      makeInv({ id: '1', status: 'paid', amount: 500, paid_at: '2026-07-15T00:00:00Z' }),
      makeInv({ id: '2', status: 'void', amount: 999, paid_at: '2026-07-15T00:00:00Z' }),
    ];
    expect(revenueLast30Days(invoices, NOW)).toBe(500);
  });
  it('excludes void from this quarter', () => {
    const invoices = [
      makeInv({ id: '1', status: 'paid', amount: 500, paid_at: '2026-07-15T00:00:00Z' }),
      makeInv({ id: '2', status: 'void', amount: 999, paid_at: '2026-07-15T00:00:00Z' }),
    ];
    expect(revenueThisQuarter(invoices, NOW)).toBe(500);
  });
  it('excludes void from monthly revenue', () => {
    const invoices = [
      makeInv({ id: '1', status: 'paid', amount: 500, paid_at: '2026-07-15T00:00:00Z' }),
      makeInv({ id: '2', status: 'void', amount: 999, paid_at: '2026-07-15T00:00:00Z' }),
    ];
    expect(revenueForMonth(invoices, 2026, 6)).toBe(500);
  });
  it('paidDateObj returns null for void', () => {
    expect(paidDateObj({ status: 'void', paid_at: '2026-07-15T00:00:00Z' })).toBeNull();
  });
  it('paidDateObj returns null for unpaid without paid_at', () => {
    expect(paidDateObj({ status: 'pending', paid_at: null })).toBeNull();
  });
});

describe('monthlyRevenueChart', () => {
  it('produces correct number of points', () => {
    const chart = monthlyRevenueChart([], 8, NOW);
    expect(chart).toHaveLength(8);
  });
  it('excludes void from chart values', () => {
    const invoices = [
      makeInv({ id: '1', status: 'paid', amount: 500, paid_at: '2026-07-15T00:00:00Z' }),
      makeInv({ id: '2', status: 'void', amount: 999, paid_at: '2026-07-15T00:00:00Z' }),
    ];
    const chart = monthlyRevenueChart(invoices, 8, NOW);
    const julyPoint = chart.find((p) => p.label.startsWith('Jul'));
    expect(julyPoint?.value).toBe(500);
  });
  it('all points are 0 when no paid invoices', () => {
    const invoices = [
      makeInv({ id: '1', status: 'pending', amount: 500 }),
      makeInv({ id: '2', status: 'void', amount: 999 }),
    ];
    const chart = monthlyRevenueChart(invoices, 6, NOW);
    expect(chart.every((p) => p.value === 0)).toBe(true);
  });
});

describe('definition of done scenarios', () => {
  // Six unpaid invoices: 105 + 105 + 500 + 500 + 500 + 208 = 1918
  const sixUnpaid = [
    makeInv({ id: '106', status: 'pending', amount: 105, due_date: '2026-07-31T00:00:00Z' }),
    makeInv({ id: '103', status: 'pending', amount: 105, due_date: '2026-08-20T00:00:00Z' }),
    makeInv({ id: 'o1', status: 'pending', amount: 500, due_date: '2026-09-01T00:00:00Z' }),
    makeInv({ id: 'o2', status: 'pending', amount: 500, due_date: '2026-09-02T00:00:00Z' }),
    makeInv({ id: 'o3', status: 'pending', amount: 500, due_date: '2026-09-03T00:00:00Z' }),
    makeInv({ id: 'o4', status: 'pending', amount: 208, due_date: '2026-09-04T00:00:00Z' }),
  ];

  it('baseline: 6 unpaid, outstanding = 1918, overdue = 105', () => {
    expect(countUnpaid(sixUnpaid)).toBe(6);
    expect(totalOutstanding(sixUnpaid)).toBe(1918);
    expect(totalOverdue(sixUnpaid)).toBe(105);
  });

  it('void INV-000106: overdue -> 0, unpaid -> 5, outstanding -> 1813', () => {
    const after = [
      makeInv({ id: '106', status: 'void', amount: 105, due_date: '2026-07-31T00:00:00Z' }),
      ...sixUnpaid.slice(1),
    ];
    expect(totalOverdue(after)).toBe(0);
    expect(countUnpaid(after)).toBe(5);
    expect(totalOutstanding(after)).toBe(1813);
  });

  it('void both 106 + 103: unpaid -> 4, outstanding -> 1708 (-210)', () => {
    const after = [
      makeInv({ id: '106', status: 'void', amount: 105, due_date: '2026-07-31T00:00:00Z' }),
      makeInv({ id: '103', status: 'void', amount: 105, due_date: '2026-08-20T00:00:00Z' }),
      ...sixUnpaid.slice(2),
    ];
    expect(countUnpaid(after)).toBe(4);
    expect(totalOutstanding(after)).toBe(1708);
    expect(1918 - totalOutstanding(after)).toBe(210);
  });

  it('total outstanding equals sum of unpaid invoice amounts', () => {
    const after = [
      makeInv({ id: '106', status: 'void', amount: 105, due_date: '2026-07-31T00:00:00Z' }),
      makeInv({ id: '103', status: 'void', amount: 105, due_date: '2026-08-20T00:00:00Z' }),
      ...sixUnpaid.slice(2),
    ];
    const unpaidSum = after
      .filter((i) => !isVoid(i) && isUnpaid(i))
      .reduce((s, i) => s + i.amount, 0);
    expect(totalOutstanding(after)).toBe(unpaidSum);
  });
});
