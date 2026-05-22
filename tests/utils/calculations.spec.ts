import { describe, it, expect } from 'vitest';
import {
  getTotalMonthlyIncome,
  getAlloc,
  grandTotal,
  daysInMonth,
  getRenewalDatesBetween,
  getNextRenewal,
  getCurrentPeriodStart,
  getSubsDeductedThisPeriod,
  getSubsDeductedThisMonth,
  getLoansDeductedThisMonth,
  getLoansDeductedThisPeriod,
  calculateActualNeeds,
  calculateActualWants,
  calculateActualSavings,
  getMonthActuals,
  getMonthBudgeted,
  calculateVariance,
  getAllocationForMonth,
  getGoalProgress,
  getNetWorthData,
  getMonthForecast,
  getCalendarDayMap,
  getSixMonthForecast,
  getFilteredSpendingHistory,
  getTopCategories,
  getCategorySpending,
  getMonthlyWantsHistory,
  getMomInsights,
  applyRulesToName,
  getTriggeredAlerts,
} from '@/utils/calculations';
import { makeBlankState } from '@/stores/budget';
import type { BudgetState } from '@/types/state';

function buildState(overrides: Partial<BudgetState> = {}): BudgetState {
  return { ...makeBlankState(), ...overrides };
}

// ─── Income / budget primitives ──────────────────────────────────

describe('getTotalMonthlyIncome', () => {
  it('returns 0 with no streams', () => {
    expect(getTotalMonthlyIncome(buildState())).toBe(0);
  });

  it('sums monthly streams', () => {
    const state = buildState({
      incomeStreams: [
        { id: '1', name: 'Job', amount: 4000, biweekly: false },
        { id: '2', name: 'Side', amount: 500, biweekly: false },
      ],
    });
    expect(getTotalMonthlyIncome(state)).toBe(4500);
  });

  it('doubles biweekly streams', () => {
    const state = buildState({
      incomeStreams: [{ id: '1', name: 'Paycheque', amount: 1500, biweekly: true }],
    });
    expect(getTotalMonthlyIncome(state)).toBe(3000);
  });
});

describe('getAlloc', () => {
  it('converts percentages to decimals', () => {
    expect(getAlloc(buildState())).toEqual({ needs: 0.5, wants: 0.3, savings: 0.2 });
  });

  it('handles custom allocation', () => {
    const state = buildState({ allocation: { needs: 60, wants: 30, savings: 10 } });
    expect(getAlloc(state)).toEqual({ needs: 0.6, wants: 0.3, savings: 0.1 });
  });
});

describe('grandTotal', () => {
  it('sums expense card items with biweekly doubling', () => {
    const state = buildState({
      expenseCards: [
        {
          id: 'C1',
          label: 'TD',
          items: [
            { id: 'I1', name: 'Rent', amount: 1000, biweekly: false },
            { id: 'I2', name: 'Bus', amount: 50, biweekly: true },
          ],
        },
      ],
    });
    expect(grandTotal(state)).toBe(1100);
  });
});

describe('daysInMonth', () => {
  it('returns 31 for Jan', () => expect(daysInMonth(2026, 1)).toBe(31));
  it('returns 28 for non-leap Feb', () => expect(daysInMonth(2026, 2)).toBe(28));
  it('returns 29 for leap Feb', () => expect(daysInMonth(2024, 2)).toBe(29));
  it('returns 30 for April', () => expect(daysInMonth(2026, 4)).toBe(30));
  it('returns 31 for December', () => expect(daysInMonth(2026, 12)).toBe(31));
});

// ─── Renewal date arithmetic ─────────────────────────────────────

describe('getRenewalDatesBetween — monthly', () => {
  const item = { date: '2026-05-15', frequency: 'monthly' };

  it('finds one renewal in the same month', () => {
    const dates = getRenewalDatesBetween(item, new Date(2026, 4, 1), new Date(2026, 4, 31));
    expect(dates).toEqual(['2026-05-15']);
  });

  it('finds two renewals across two months', () => {
    const dates = getRenewalDatesBetween(item, new Date(2026, 4, 1), new Date(2026, 5, 30));
    expect(dates.length).toBe(2);
  });

  it('clamps to end of month for short months', () => {
    const sub = { date: '2026-01-31', frequency: 'monthly' };
    const dates = getRenewalDatesBetween(sub, new Date(2026, 1, 1), new Date(2026, 1, 28));
    expect(dates).toEqual(['2026-02-28']);
  });

  it('returns empty array when no anchor date', () => {
    const dates = getRenewalDatesBetween({ frequency: 'monthly' }, new Date(), new Date());
    expect(dates).toEqual([]);
  });
});

describe('getRenewalDatesBetween — yearly', () => {
  const item = { date: '2026-05-15', frequency: 'yearly' };

  it('finds one renewal per year', () => {
    const dates = getRenewalDatesBetween(item, new Date(2026, 0, 1), new Date(2028, 11, 31));
    expect(dates.length).toBe(3);
  });

  it('accepts legacy "annual" alias', () => {
    const legacyItem = { date: '2026-05-15', frequency: 'annual' };
    const dates = getRenewalDatesBetween(legacyItem, new Date(2026, 0, 1), new Date(2026, 11, 31));
    expect(dates).toEqual(['2026-05-15']);
  });
});

describe('getRenewalDatesBetween — biweekly', () => {
  it('finds 14-day-spaced dates', () => {
    const item = { date: '2026-05-01', frequency: 'biweekly' };
    const dates = getRenewalDatesBetween(item, new Date(2026, 4, 1), new Date(2026, 4, 31));
    expect(dates.length).toBe(3); // May 1, May 15, May 29
  });

  it('accepts legacy "bi-weekly" alias', () => {
    const item = { date: '2026-05-01', frequency: 'bi-weekly' };
    const dates = getRenewalDatesBetween(item, new Date(2026, 4, 1), new Date(2026, 4, 31));
    expect(dates.length).toBe(3);
  });
});

describe('getRenewalDatesBetween — quarterly', () => {
  it('finds renewals every 3 months', () => {
    const item = { date: '2026-01-15', frequency: 'quarterly' };
    const dates = getRenewalDatesBetween(item, new Date(2026, 0, 1), new Date(2026, 11, 31));
    expect(dates).toEqual(['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15']);
  });
});

describe('getNextRenewal', () => {
  it('returns the next future renewal', () => {
    const item = { date: '2026-05-15', frequency: 'monthly' };
    const result = getNextRenewal(item, new Date(2026, 4, 14));
    expect(result).toBe('2026-05-15');
  });

  it('skips past renewals', () => {
    const item = { date: '2026-05-15', frequency: 'monthly' };
    const result = getNextRenewal(item, new Date(2026, 4, 16));
    expect(result).toBe('2026-06-15');
  });

  it('returns null for items with no anchor', () => {
    expect(getNextRenewal({ frequency: 'monthly' }, new Date())).toBe(null);
  });
});

// ─── Pay periods + deductions ────────────────────────────────────

describe('getCurrentPeriodStart', () => {
  it('returns null when payStart unset', () => {
    expect(getCurrentPeriodStart(buildState())).toBe(null);
  });

  it('returns payStart when today equals payStart', () => {
    const state = buildState({ payStart: '2026-05-15' });
    expect(getCurrentPeriodStart(state, new Date(2026, 4, 15))).toBe('2026-05-15');
  });

  it('advances 14 days after a full period', () => {
    const state = buildState({ payStart: '2026-05-01' });
    expect(getCurrentPeriodStart(state, new Date(2026, 4, 15))).toBe('2026-05-15');
  });

  it('returns payStart when in the future', () => {
    const state = buildState({ payStart: '2026-06-01' });
    expect(getCurrentPeriodStart(state, new Date(2026, 4, 15))).toBe('2026-06-01');
  });
});

describe('getSubsDeductedThisPeriod / thisMonth', () => {
  const state = buildState({
    payStart: '2026-05-01',
    subscriptions: [
      // Netflix renews on the 20th — falls within the May 15 → May 28 period
      { id: 'S1', name: 'Netflix', amount: 18, frequency: 'monthly', date: '2026-05-20', category: 'Entertainment', budgetType: 'wants', cardId: null },
      // Insurance renews on the 5th — falls in the current month
      { id: 'S2', name: 'Insurance', amount: 100, frequency: 'monthly', date: '2026-05-05', category: 'Other', budgetType: 'needs', cardId: null },
    ],
  });

  it('finds wants subs in the current period', () => {
    // today = May 28 → period starts May 15 (2 full periods after May 1)
    const result = getSubsDeductedThisPeriod(state, new Date(2026, 4, 28));
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Netflix');
    expect(result[0].renewalDates).toContain('2026-05-20');
  });

  it('finds needs subs in the current month', () => {
    const result = getSubsDeductedThisMonth(state, new Date(2026, 4, 15));
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Insurance');
  });

  it('returns empty when payStart unset', () => {
    const noPay = { ...state, payStart: null };
    expect(getSubsDeductedThisPeriod(noPay, new Date(2026, 4, 15))).toEqual([]);
  });
});

describe('getLoansDeductedThisMonth', () => {
  it('filters needs loans with payment > 0 and date', () => {
    const state = buildState({
      loans: [
        { id: 'L1', name: 'Car', remaining: 5000, original: 10000, paymentAmount: 500, frequency: 'monthly', date: '2026-05-10', budgetType: 'needs', cardId: null },
        { id: 'L2', name: 'Empty', remaining: 0, original: 0, paymentAmount: 0, frequency: 'monthly', date: '', budgetType: 'needs', cardId: null },
      ],
    });
    const result = getLoansDeductedThisMonth(state, new Date(2026, 4, 15));
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Car');
  });
});

describe('getLoansDeductedThisPeriod', () => {
  it('returns empty without payStart', () => {
    expect(getLoansDeductedThisPeriod(buildState(), new Date())).toEqual([]);
  });
});

// ─── Budget vs. actual ───────────────────────────────────────────

describe('calculateActualNeeds / Wants / Savings', () => {
  const today = new Date(2026, 4, 15);
  const state = buildState({
    incomeStreams: [{ id: 'I1', name: 'Job', amount: 5000, biweekly: false }],
    expenseCards: [
      {
        id: 'C1',
        label: 'TD',
        items: [{ id: 'X1', name: 'Rent', amount: 1500, biweekly: false }],
      },
    ],
    purchases: [
      { id: 'P1', name: 'Coffee', amount: 5, category: 'Food & Drink', cardId: null, budgetType: 'wants' },
    ],
  });

  it('needs = expense cards (current month)', () => {
    expect(calculateActualNeeds(state, 2026, 5, today)).toBe(1500);
  });

  it('wants = wants-tagged purchases', () => {
    expect(calculateActualWants(state, 2026, 5, today)).toBe(5);
  });

  it('savings = income - needs - wants, floored at 0', () => {
    // 5000 - 1500 - 5 = 3495
    expect(calculateActualSavings(state, 2026, 5, today)).toBe(3495);
  });

  it('getMonthActuals returns all three', () => {
    expect(getMonthActuals(state, 2026, 5, today)).toEqual({ needs: 1500, wants: 5, savings: 3495 });
  });

  it('past month uses spendingHistory for wants', () => {
    const past = buildState({
      spendingHistory: [{ id: 'H1', date: '2026-04-30', total: 200, items: [] }],
    });
    expect(calculateActualWants(past, 2026, 4, today)).toBe(200);
  });
});

describe('getMonthBudgeted', () => {
  it('multiplies income by allocation ratio', () => {
    const state = buildState({
      incomeStreams: [{ id: 'I1', name: 'Job', amount: 5000, biweekly: false }],
    });
    expect(getMonthBudgeted(state)).toEqual({ needs: 2500, wants: 1500, savings: 1000 });
  });
});

describe('calculateVariance', () => {
  it('returns on-track when within budget', () => {
    expect(calculateVariance(1000, 800)).toEqual({ dollar: 200, percent: 80, status: 'on-track' });
  });

  it('returns caution when 100-110% spent', () => {
    expect(calculateVariance(1000, 1050).status).toBe('caution');
  });

  it('returns over when > 110% spent', () => {
    expect(calculateVariance(1000, 1200).status).toBe('over');
  });

  it('returns on-track with zero budget', () => {
    expect(calculateVariance(0, 0).status).toBe('on-track');
  });
});

// ─── Savings + goals ─────────────────────────────────────────────

describe('getAllocationForMonth', () => {
  const acct = {
    id: 'A1',
    name: 'TFSA',
    balance: 0,
    defaultAllocated: 100,
    monthlyAllocations: { '2026-05': 250 },
  };

  it('uses per-month override when present', () => {
    expect(getAllocationForMonth(acct, 2026, 5)).toBe(250);
  });

  it('falls back to defaultAllocated', () => {
    expect(getAllocationForMonth(acct, 2026, 6)).toBe(100);
  });
});

describe('getGoalProgress', () => {
  const today = new Date(2026, 4, 15);
  const state = buildState({
    savingsAccounts: [
      { id: 'A1', name: 'TFSA', balance: 5000, defaultAllocated: 500, monthlyAllocations: {} },
    ],
  });

  it('returns null for goals with missing account', () => {
    const goal = { id: 'G1', accountId: 'nope', targetAmount: 10000, targetDate: '2027-05' };
    expect(getGoalProgress(state, goal, today)).toBe(null);
  });

  it('computes progress percent', () => {
    const goal = { id: 'G1', accountId: 'A1', targetAmount: 10000, targetDate: '2027-05' };
    const result = getGoalProgress(state, goal, today)!;
    expect(result.progressPercent).toBe(50);
    expect(result.monthsRemaining).toBe(12);
    expect(result.monthlySavingsNeeded).toBeCloseTo(5000 / 12, 2);
  });

  it('caps progress at 100%', () => {
    const goal = { id: 'G1', accountId: 'A1', targetAmount: 1000, targetDate: '2027-05' };
    const result = getGoalProgress(state, goal, today)!;
    expect(result.progressPercent).toBe(100);
  });

  it('marks complete when funded past target date', () => {
    const goal = { id: 'G1', accountId: 'A1', targetAmount: 1000, targetDate: '2026-01' };
    const result = getGoalProgress(state, goal, today)!;
    expect(result.status).toBe('complete');
  });

  it('marks missed when underfunded past target date', () => {
    const goal = { id: 'G1', accountId: 'A1', targetAmount: 100000, targetDate: '2026-01' };
    const result = getGoalProgress(state, goal, today)!;
    expect(result.status).toBe('missed');
  });
});

// ─── Net worth ───────────────────────────────────────────────────

describe('getNetWorthData', () => {
  it('computes net worth across assets and liabilities', () => {
    const state = buildState({
      savingsAccounts: [{ id: 'A1', name: 'TFSA', balance: 5000, defaultAllocated: 0, monthlyAllocations: {} }],
      assets: [{ id: 'AS1', name: 'Car', category: 'vehicle', value: 15000 }],
      loans: [{ id: 'L1', name: 'Mortgage', remaining: 50000, original: 100000, paymentAmount: 500, frequency: 'monthly', date: '', budgetType: 'needs', cardId: null }],
      creditCards: [{ id: 'C1', name: 'Visa', balance: 1000, limit: 5000 }],
    });
    const data = getNetWorthData(state, new Date(2026, 4, 15));
    expect(data.liquidAssets).toBe(5000);
    expect(data.manualAssets).toBe(15000);
    expect(data.totalAssets).toBe(20000);
    expect(data.totalLoans).toBe(50000);
    expect(data.totalCC).toBe(1000);
    expect(data.totalLiabilities).toBe(51000);
    expect(data.netWorth).toBe(-31000);
  });

  it('momChange is null when no prior history', () => {
    const data = getNetWorthData(buildState());
    expect(data.momChange).toBe(null);
  });

  it('momChange uses most recent prior snapshot', () => {
    const state = buildState({
      netWorthHistory: [
        { id: 'H1', date: '2026-04', netWorth: 10000, totalAssets: 10000, totalLiabilities: 0 },
        { id: 'H2', date: '2026-03', netWorth: 8000, totalAssets: 8000, totalLiabilities: 0 },
      ],
      savingsAccounts: [{ id: 'A1', name: 'TFSA', balance: 12000, defaultAllocated: 0, monthlyAllocations: {} }],
    });
    const data = getNetWorthData(state, new Date(2026, 4, 15));
    expect(data.momChange).toBe(2000); // 12000 - 10000
  });
});

// ─── Forecast / calendar ─────────────────────────────────────────

describe('getMonthForecast', () => {
  it('aggregates expense items and subscriptions', () => {
    const state = buildState({
      incomeStreams: [{ id: 'I1', name: 'Job', amount: 5000, biweekly: false }],
      expenseCards: [
        {
          id: 'C1',
          label: 'TD',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items: [{ id: 'X1', name: 'Rent', amount: 1500, biweekly: false, dueDay: 1 } as any],
        },
      ],
      subscriptions: [
        { id: 'S1', name: 'Netflix', amount: 18, frequency: 'monthly', date: '2026-05-10', category: 'Entertainment', budgetType: 'wants', cardId: null },
      ],
    });
    const fc = getMonthForecast(state, 2026, 5);
    expect(fc.total).toBe(1518);
    expect(fc.dated.length).toBeGreaterThanOrEqual(2);
    expect(fc.budgeted).toBe(2500); // 5000 * 0.5
    expect(fc.variance).toBe(2500 - 1518);
  });
});

describe('getCalendarDayMap', () => {
  it('builds day -> items[] map', () => {
    const state = buildState({
      expenseCards: [
        {
          id: 'C1',
          label: 'TD',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items: [{ id: 'X1', name: 'Rent', amount: 1500, biweekly: false, dueDay: 1 } as any],
        },
      ],
    });
    const map = getCalendarDayMap(state, 2026, 5);
    expect(map.get(1)?.length).toBe(1);
  });
});

describe('getSixMonthForecast', () => {
  it('returns N rows', () => {
    const rows = getSixMonthForecast(buildState(), 2026, 5, 3);
    expect(rows.length).toBe(3);
    expect(rows[0].month).toBe(5);
    expect(rows[2].month).toBe(7);
  });
});

// ─── Spending history filters ────────────────────────────────────

describe('getFilteredSpendingHistory', () => {
  const state = buildState({
    spendingHistory: [
      { id: 'H1', date: '2026-01-15', total: 100, items: [{ name: 'Coffee', amount: 5, category: 'Food & Drink' }] },
      { id: 'H2', date: '2026-03-15', total: 200, items: [{ name: 'Movie', amount: 12, category: 'Entertainment' }] },
    ],
  });

  it('filters by date range', () => {
    const result = getFilteredSpendingHistory(state, { startDate: '2026-02-01', endDate: '', search: '' });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('H2');
  });

  it('filters by search term and drops empty periods', () => {
    const result = getFilteredSpendingHistory(state, { startDate: '', endDate: '', search: 'coffee' });
    expect(result.length).toBe(1);
    expect(result[0].items[0].name).toBe('Coffee');
  });
});

describe('getTopCategories', () => {
  it('aggregates and returns top entries sorted desc', () => {
    const result = getTopCategories([
      { id: 'H1', date: '2026-01-01', total: 100, items: [
        { name: 'Coffee', amount: 10, category: 'Food & Drink' },
        { name: 'Movie', amount: 20, category: 'Entertainment' },
      ]},
      { id: 'H2', date: '2026-02-01', total: 100, items: [
        { name: 'Lunch', amount: 15, category: 'Food & Drink' },
      ]},
    ]);
    expect(result[0]).toEqual(['Food & Drink', 25]);
    expect(result[1]).toEqual(['Entertainment', 20]);
  });
});

describe('getCategorySpending', () => {
  it('aggregates purchases by category', () => {
    const result = getCategorySpending([
      { id: 'P1', name: 'Coffee', amount: 5, category: 'Food & Drink', cardId: null, budgetType: 'wants' },
      { id: 'P2', name: 'Lunch', amount: 15, category: 'Food & Drink', cardId: null, budgetType: 'wants' },
    ]);
    expect(result['Food & Drink']).toBe(20);
  });
});

// ─── Month-over-month ────────────────────────────────────────────

describe('getMonthlyWantsHistory', () => {
  it('returns N rows with labels', () => {
    const today = new Date(2026, 4, 15);
    const result = getMonthlyWantsHistory(buildState(), 3, today);
    expect(result.length).toBe(3);
    expect(result[result.length - 1].isCurrent).toBe(true);
    expect(result[result.length - 1].monthKey).toBe('2026-05');
  });

  it('aggregates current-month live purchases', () => {
    const today = new Date(2026, 4, 15);
    const state = buildState({
      purchases: [
        { id: 'P1', name: 'Coffee', amount: 5, category: 'Food & Drink', cardId: null, budgetType: 'wants' },
      ],
    });
    const result = getMonthlyWantsHistory(state, 1, today);
    expect(result[0].total).toBe(5);
    expect(result[0].categories['Food & Drink']).toBe(5);
  });

  it('aggregates past-month spendingHistory periods', () => {
    const today = new Date(2026, 4, 15);
    const state = buildState({
      spendingHistory: [
        { id: 'H1', date: '2026-04-30', total: 100, items: [{ name: 'X', amount: 100, category: 'Other' }] },
      ],
    });
    const result = getMonthlyWantsHistory(state, 2, today);
    expect(result[0].total).toBe(100);
    expect(result[1].total).toBe(0);
  });
});

describe('getMomInsights', () => {
  it('returns empty for fewer than 2 months', () => {
    expect(getMomInsights([])).toEqual([]);
  });

  it('flags 20%+ spending increase as warn', () => {
    const result = getMomInsights([
      { year: 2026, month: 4, monthKey: '2026-04', label: 'Apr 26', total: 100, categories: {}, isCurrent: false },
      { year: 2026, month: 5, monthKey: '2026-05', label: 'May 26', total: 130, categories: {}, isCurrent: true },
    ]);
    expect(result[0].type).toBe('warn');
  });

  it('flags 10%+ spending decrease as good', () => {
    const result = getMomInsights([
      { year: 2026, month: 4, monthKey: '2026-04', label: 'Apr 26', total: 100, categories: {}, isCurrent: false },
      { year: 2026, month: 5, monthKey: '2026-05', label: 'May 26', total: 80, categories: {}, isCurrent: true },
    ]);
    expect(result[0].type).toBe('good');
  });

  it('does not falsely claim "highest" when all zero', () => {
    const result = getMomInsights([
      { year: 2026, month: 3, monthKey: '2026-03', label: 'Mar 26', total: 0, categories: {}, isCurrent: false },
      { year: 2026, month: 4, monthKey: '2026-04', label: 'Apr 26', total: 0, categories: {}, isCurrent: false },
      { year: 2026, month: 5, monthKey: '2026-05', label: 'May 26', total: 0, categories: {}, isCurrent: true },
    ]);
    // No "highest spending month" — guarded by maxTotal > 0
    expect(result.some((r) => r.text.includes('Highest'))).toBe(false);
  });
});

// ─── Rules + alerts ──────────────────────────────────────────────

describe('applyRulesToName', () => {
  const rules: import('@/types/budget').Rule[] = [
    { id: 'R1', pattern: 'Tim Hortons', matchType: 'contains', category: 'Food & Drink' },
    { id: 'R2', pattern: 'Uber', matchType: 'startsWith', category: 'Transportation' },
    { id: 'R3', pattern: 'Netflix', matchType: 'exact', category: 'Entertainment' },
  ];

  it('contains match (default)', () => {
    expect(applyRulesToName(rules, 'My Tim Hortons run')).toBe('Food & Drink');
  });

  it('startsWith match', () => {
    expect(applyRulesToName(rules, 'Uber Eats')).toBe('Transportation');
    expect(applyRulesToName(rules, 'My Uber')).toBe(null);
  });

  it('exact match is case-insensitive but otherwise strict', () => {
    expect(applyRulesToName(rules, 'netflix')).toBe('Entertainment');
    expect(applyRulesToName(rules, 'Netflix premium')).toBe(null);
  });

  it('returns null when nothing matches', () => {
    expect(applyRulesToName(rules, 'Random thing')).toBe(null);
  });

  it('skips rules with empty patterns', () => {
    const withEmpty: import('@/types/budget').Rule[] = [
      { id: 'R0', pattern: '', matchType: 'contains', category: 'Other' },
      ...rules,
    ];
    expect(applyRulesToName(withEmpty, 'Netflix')).toBe('Entertainment');
  });
});

describe('getTriggeredAlerts', () => {
  it('returns alerts exceeded by current purchases', () => {
    const state = buildState({
      purchases: [
        { id: 'P1', name: 'Coffee', amount: 60, category: 'Food & Drink', cardId: null, budgetType: 'wants' },
      ],
      budgetAlerts: [
        { id: 'A1', category: 'Food & Drink', threshold: 50 },
        { id: 'A2', category: 'Entertainment', threshold: 100 },
      ],
    });
    const result = getTriggeredAlerts(state);
    expect(result.length).toBe(1);
    expect(result[0].spent).toBe(60);
  });
});
