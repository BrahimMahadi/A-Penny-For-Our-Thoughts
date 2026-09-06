import { describe, it, expect } from 'vitest';
import {
  getTotalMonthlyIncome,
  getAlloc,
  grandTotal,
  daysInMonth,
  getRenewalDatesBetween,
  getNextRenewal,
  getCurrentPeriodStart,
  getEnvelopeState,
  getSubsDeductedThisPeriod,
  getSubsDeductedThisMonth,
  getLoansDeductedThisMonth,
  getLoansDeductedThisPeriod,
  getSubsInWindow,
  getLoansInWindow,
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
  getPrevMonthActuals,
  getEnvelopeForecast,
  getSpendingTrend,
  getGoalsTimeline,
  getWantsCategoryActuals,
  getPayPeriodForecast,
  getPayPeriodDayMap,
  getPreviousPeriodPaceSpend,
} from '@/utils/calculations';
import { makeBlankState } from '@/stores/budget';
import type { BudgetState } from '@/types/state';
import type { Frequency } from '@/types/budget';

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

// ─── RS-32 — generic window helpers ─────────────────────────────
describe('getSubsInWindow', () => {
  const subs = [
    { id: 'S1', name: 'Netflix',   amount: 18, frequency: 'monthly' as const, date: '2026-05-20', category: 'Entertainment', budgetType: 'wants' as const, cardId: null, daysOfWeek: [] },
    { id: 'S2', name: 'Insurance', amount: 100, frequency: 'monthly' as const, date: '2026-05-05', category: 'Other',         budgetType: 'needs' as const, cardId: null, daysOfWeek: [] },
  ];
  const wStart = new Date('2026-05-15T00:00:00');
  const wEnd   = new Date('2026-05-28T00:00:00');

  it('returns wants subs whose renewal falls in the window', () => {
    const result = getSubsInWindow({ subscriptions: subs }, wStart, wEnd, 'wants');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Netflix');
    expect(result[0].renewalDates).toContain('2026-05-20');
  });

  it('returns needs subs whose renewal falls in the window', () => {
    // Insurance renews on the 5th — falls outside May 15–28 window
    const result = getSubsInWindow({ subscriptions: subs }, wStart, wEnd, 'needs');
    expect(result.length).toBe(0); // 5th is before the window start

    // Widen window to include the 5th
    const wStartWide = new Date('2026-05-01T00:00:00');
    const result2 = getSubsInWindow({ subscriptions: subs }, wStartWide, wEnd, 'needs');
    expect(result2.length).toBe(1);
    expect(result2[0].name).toBe('Insurance');
  });

  it('returns empty for a window with no matching renewals', () => {
    const future = new Date('2026-07-01T00:00:00');
    const futureEnd = new Date('2026-07-14T00:00:00');
    // Netflix renews on 20th — not in July 1–14 window
    const result = getSubsInWindow({ subscriptions: subs }, future, futureEnd, 'wants');
    expect(result.length).toBe(0);
  });

  it('expands multi-renewal subs into multiple renewalDates', () => {
    // Weekly sub fires many times in a 14-day window
    const weeklySub = [
      { id: 'W1', name: 'Weekly', amount: 5, frequency: 'weekly' as const, date: '2026-05-01', category: 'Other', budgetType: 'wants' as const, cardId: null, daysOfWeek: [] },
    ];
    const result = getSubsInWindow({ subscriptions: weeklySub }, wStart, wEnd, 'wants');
    expect(result.length).toBe(1);
    expect(result[0].renewalDates.length).toBeGreaterThan(1);
  });
});

describe('getLoansInWindow', () => {
  const loans = [
    { id: 'L1', name: 'Car Loan',  remaining: 5000, original: 10000, paymentAmount: 500, frequency: 'monthly' as const, date: '2026-05-10', budgetType: 'needs' as const, cardId: null },
    { id: 'L2', name: 'Boat Loan', remaining: 2000, original: 5000,  paymentAmount: 200, frequency: 'monthly' as const, date: '2026-05-20', budgetType: 'wants' as const, cardId: null },
    { id: 'L3', name: 'NoPay',     remaining: 1000, original: 2000,  paymentAmount: 0,   frequency: 'monthly' as const, date: '2026-05-12', budgetType: 'wants' as const, cardId: null },
  ];
  const wStart = new Date('2026-05-01T00:00:00');
  const wEnd   = new Date('2026-05-31T00:00:00');

  it('returns wants loans in the window', () => {
    const result = getLoansInWindow({ loans }, wStart, wEnd, 'wants');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Boat Loan');
    expect(result[0].renewalDates).toContain('2026-05-20');
  });

  it('returns needs loans in the window', () => {
    const result = getLoansInWindow({ loans }, wStart, wEnd, 'needs');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Car Loan');
  });

  it('excludes loans with paymentAmount = 0', () => {
    const result = getLoansInWindow({ loans }, wStart, wEnd, 'wants');
    expect(result.every(l => l.paymentAmount > 0)).toBe(true);
    expect(result.find(l => l.name === 'NoPay')).toBeUndefined();
  });

  it('returns empty when no loans fall in the window', () => {
    const futureStart = new Date('2026-07-01T00:00:00');
    const futureEnd   = new Date('2026-07-14T00:00:00');
    const result = getLoansInWindow({ loans }, futureStart, futureEnd, 'wants');
    expect(result.length).toBe(0);
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
      // BUG-026: date must be in the current month (May 2026) to pass the month filter
      { id: 'P1', name: 'Coffee', amount: 5, category: 'Food & Drink', cardId: null, budgetType: 'wants', date: '2026-05-10' },
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

  it('past month uses spendingHistory for wants (per-bucket spent snapshot)', () => {
    // BUG-036: archived wants come from the per-bucket `spent` snapshot, not the
    // whole period.total (which would also include the period's needs spend).
    const past = buildState({
      spendingHistory: [
        { id: 'H1', date: '2026-04-30', total: 260, items: [], spent: { wants: 200, needs: 60 } },
      ],
    });
    expect(calculateActualWants(past, 2026, 4, today)).toBe(200);
  });
});

describe('BUG-036 — per-bucket archived spend (no cross-bucket bleed)', () => {
  // "today" in May 2026; archived period sits in the PAST month (April) so only
  // the history fold-in is exercised (no current-month live purchases/deductions).
  const today = new Date(2026, 4, 15);

  it('wants does not absorb the archived needs portion', () => {
    const state = buildState({
      spendingHistory: [
        { id: 'H1', date: '2026-04-12', total: 180, items: [], spent: { wants: 100, needs: 80 } },
      ],
    });
    // Old bug folded the whole 180 total into wants; the fix takes only spent.wants.
    expect(calculateActualWants(state, 2026, 4, today)).toBe(100);
  });

  it('needs now receives its archived portion (was previously dropped)', () => {
    const state = buildState({
      spendingHistory: [
        { id: 'H1', date: '2026-04-12', total: 180, items: [], spent: { wants: 100, needs: 80 } },
      ],
    });
    // Before BUG-036, calculateActualNeeds folded in NO archived history at all.
    expect(calculateActualNeeds(state, 2026, 4, today)).toBe(80);
  });

  it('legacy period (no spent snapshot) splits total by the current allocation ratio', () => {
    // Default allocation 50/30/20 → wants share = 30/(30+50), needs share = 50/(30+50).
    const state = buildState({
      allocation: { needs: 50, wants: 30, savings: 20 },
      spendingHistory: [
        { id: 'H1', date: '2026-04-12', total: 200, items: [] }, // no spent, no budgets
      ],
    });
    expect(calculateActualWants(state, 2026, 4, today)).toBeCloseTo(75, 5);  // 200 * 30/80
    expect(calculateActualNeeds(state, 2026, 4, today)).toBeCloseTo(125, 5); // 200 * 50/80
  });

  it('legacy period prefers its own budgets snapshot over current allocation', () => {
    const state = buildState({
      allocation: { needs: 50, wants: 30, savings: 20 }, // should be ignored — budgets present
      spendingHistory: [
        { id: 'H1', date: '2026-04-12', total: 200, items: [], budgets: { needs: 100, wants: 300, savings: 50 } },
      ],
    });
    expect(calculateActualWants(state, 2026, 4, today)).toBeCloseTo(150, 5); // 200 * 300/400
    expect(calculateActualNeeds(state, 2026, 4, today)).toBeCloseTo(50, 5);  // 200 * 100/400
  });

  it('wants + needs of a per-bucket archive always sum back to the period total', () => {
    const state = buildState({
      spendingHistory: [
        { id: 'H1', date: '2026-04-12', total: 137.5, items: [], spent: { wants: 90.25, needs: 47.25 } },
      ],
    });
    const w = calculateActualWants(state, 2026, 4, today);
    const n = calculateActualNeeds(state, 2026, 4, today);
    expect(w + n).toBeCloseTo(137.5, 5);
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
        // BUG-026: date must be in May 2026 to pass the month filter
        { id: 'P1', name: 'Coffee', amount: 5, category: 'Food & Drink', cardId: null, budgetType: 'wants', date: '2026-05-10' },
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

// ─── getPrevMonthActuals ──────────────────────────────────────────

describe('getPrevMonthActuals', () => {
  it('returns zeros when there is no spending history and no purchases', () => {
    const state = buildState();
    const result = getPrevMonthActuals(state);
    expect(result.needs).toBeGreaterThanOrEqual(0);
    expect(result.wants).toBe(0);
  });

  it('sums spending-history periods from the previous calendar month', () => {
    // Build a "today" in March 2026, previous month = February 2026
    const today = new Date('2026-03-15T00:00:00');
    const state = buildState({
      spendingHistory: [
        { id: 'H1', date: '2026-02-01', total: 200, items: [], spent: { wants: 200, needs: 0 } },
        { id: 'H2', date: '2026-02-14', total: 150, items: [], spent: { wants: 150, needs: 0 } },
        { id: 'H3', date: '2026-03-01', total: 999, items: [], spent: { wants: 999, needs: 0 } }, // current month — excluded
      ],
    });
    const result = getPrevMonthActuals(state, today);
    expect(result.wants).toBe(350); // 200 + 150
  });

  it('does not include current-month purchases in previous-month actuals', () => {
    const today = new Date('2026-03-15T00:00:00');
    const state = buildState({
      purchases: [
        { id: 'p1', name: 'Coffee', amount: 10, category: 'Food & Drink', cardId: null, budgetType: 'wants' },
      ],
    });
    // No spending history for Feb, purchases are in current (March) period
    const result = getPrevMonthActuals(state, today);
    expect(result.wants).toBe(0);
  });
});

// ─── getEnvelopeForecast ──────────────────────────────────────────

describe('getEnvelopeForecast', () => {
  function baseState(payStart: string | null = null): ReturnType<typeof buildState> {
    return buildState({
      payStart,
      incomeStreams: [{ id: 'i1', name: 'Salary', amount: 4000, biweekly: false }],
      allocation: { needs: 50, wants: 30, savings: 20 },
    });
  }

  it('hasData=false when payStart is not set', () => {
    const result = getEnvelopeForecast(baseState(null));
    expect(result.hasData).toBe(false);
  });

  it('hasData=false on day 0 of the period (no time elapsed)', () => {
    const today = new Date('2026-05-01T00:00:00');
    const state = baseState('2026-05-01');
    const result = getEnvelopeForecast(state, today);
    expect(result.hasData).toBe(false);
    expect(result.daysElapsed).toBe(0);
  });

  it('hasData=false when there are no purchases yet (even if days elapsed)', () => {
    const today = new Date('2026-05-05T00:00:00');
    const state = baseState('2026-05-01'); // 4 days elapsed
    const result = getEnvelopeForecast(state, today);
    expect(result.hasData).toBe(false);
    expect(result.daysElapsed).toBe(4);
  });

  it('projects correctly at mid-period with purchases', () => {
    // Period started 2026-05-01, today is 2026-05-08 (day 7 of 14)
    // Budget: income 4000 * 30% / 2 = $600 biweekly
    // Spent: $210 in 7 days → $30/day → projected $420 for 14 days
    const today = new Date('2026-05-08T00:00:00');
    const state = baseState('2026-05-01');
    state.purchases = [
      // BUG-026: date must be within the period window (2026-05-01..2026-05-14)
      { id: 'p1', name: 'Dinner', amount: 210, category: 'Food & Drink', cardId: null, budgetType: 'wants', date: '2026-05-04' },
    ];

    const result = getEnvelopeForecast(state, today);

    expect(result.hasData).toBe(true);
    expect(result.daysElapsed).toBe(7);
    expect(result.daysRemaining).toBe(7);
    expect(result.dailyRate).toBeCloseTo(30, 2);
    expect(result.projectedTotal).toBeCloseTo(420, 2);
    expect(result.status).toBe('on-track'); // 420 < 600
  });

  it('status is "caution" when projected total is 90–99% of budget', () => {
    // Budget: $600. Spend $81 in 7 days → $11.57/day → projected ~$162 → wait, need to be at 90%
    // 90% of 600 = 540. In 7 days, need to project $540 → daily rate = 540/14 = 38.57
    // So spent in 7 days = 38.57 * 7 = 270
    const today = new Date('2026-05-08T00:00:00');
    const state = baseState('2026-05-01');
    state.purchases = [
      { id: 'p1', name: 'Shopping', amount: 270, category: 'Other', cardId: null, budgetType: 'wants', date: '2026-05-04' },
    ];

    const result = getEnvelopeForecast(state, today);

    expect(result.hasData).toBe(true);
    expect(result.projectedTotal).toBeCloseTo(540, 1);
    expect(result.status).toBe('caution');
  });

  it('status is "over" when projected total exceeds the budget', () => {
    // Budget: $600. Spend $500 in 7 days → $71.43/day → projected ~$1000
    const today = new Date('2026-05-08T00:00:00');
    const state = baseState('2026-05-01');
    state.purchases = [
      { id: 'p1', name: 'Everything', amount: 500, category: 'Other', cardId: null, budgetType: 'wants', date: '2026-05-04' },
    ];

    const result = getEnvelopeForecast(state, today);

    expect(result.hasData).toBe(true);
    expect(result.status).toBe('over');
    expect(result.projectedTotal).toBeGreaterThan(600);
  });

  it('daysTotal is always 14', () => {
    const result = getEnvelopeForecast(baseState(null));
    expect(result.daysTotal).toBe(14);
  });

  it('excludes needs-type purchases from the total', () => {
    const today = new Date('2026-05-08T00:00:00');
    const state = baseState('2026-05-01');
    state.purchases = [
      { id: 'p1', name: 'Groceries', amount: 100, category: 'Food & Drink', cardId: null, budgetType: 'needs', date: '2026-05-04' },
      { id: 'p2', name: 'Coffee',    amount: 50,  category: 'Food & Drink', cardId: null, budgetType: 'wants', date: '2026-05-04' },
    ];

    const result = getEnvelopeForecast(state, today);

    // Only the $50 wants purchase should contribute
    expect(result.dailyRate).toBeCloseTo(50 / 7, 4);
    expect(result.projectedTotal).toBeCloseTo((50 / 7) * 14, 1);
  });

  // ── BUG-026 regression ──────────────────────────────────────────
  it('BUG-026: ignores out-of-period purchases (stale cross-period data)', () => {
    // Simulates a stale purchase from the PREVIOUS period still in state.purchases.
    // Before BUG-026 it would inflate the forecast; after the fix it is excluded.
    const today = new Date('2026-05-08T00:00:00');
    const state = baseState('2026-05-01');
    state.purchases = [
      // In-period: should count
      { id: 'p1', name: 'Coffee',     amount: 50,  category: 'Food & Drink', cardId: null, budgetType: 'wants', date: '2026-05-04' },
      // Out-of-period: should be ignored (previous period: Apr 17–30)
      { id: 'p2', name: 'Stale Shop', amount: 400, category: 'Shopping',     cardId: null, budgetType: 'wants', date: '2026-04-25' },
    ];

    const result = getEnvelopeForecast(state, today);

    // Only the $50 in-period purchase should count
    expect(result.dailyRate).toBeCloseTo(50 / 7, 4);
  });

  // ── BUG-033 regression ──────────────────────────────────────────
  it('BUG-033: budget includes the current-period windfall wants boost', () => {
    // Base budget: 4000 × 30% ÷ 2 = $600. Windfall $500 at 30% wants → +$150 → $750.
    // Spend $46.50/day → projected $651: "over" without the boost, on-track with it.
    const today = new Date('2026-05-08T00:00:00');
    const state = baseState('2026-05-01');
    state.oneTimeIncomes = [{
      id: 'w1', label: 'Bonus', amount: 500, date: '2026-05-02', type: 'bonus',
      allocation: { needs: 50, wants: 30, savings: 20 },
      periodStart: '2026-05-01', createdAt: '2026-05-02T00:00:00Z',
    }];
    state.purchases = [
      { id: 'p1', name: 'Shopping', amount: 325.5, category: 'Other', cardId: null, budgetType: 'wants', date: '2026-05-04' },
    ];

    const result = getEnvelopeForecast(state, today);

    expect(result.projectedTotal).toBeCloseTo(651, 1);
    expect(result.status).toBe('on-track');           // 651 < 0.9 × 750
    expect(result.projectedOverage).toBeCloseTo(651 - 750, 1);
  });

  it('BUG-033: windfall from a different period does not boost the forecast budget', () => {
    // Same windfall but anchored to the PREVIOUS period — must not count.
    // Projected $651 vs $600 base budget → "over".
    const today = new Date('2026-05-08T00:00:00');
    const state = baseState('2026-05-01');
    state.oneTimeIncomes = [{
      id: 'w1', label: 'Old Bonus', amount: 500, date: '2026-04-20', type: 'bonus',
      allocation: { needs: 50, wants: 30, savings: 20 },
      periodStart: '2026-04-17', createdAt: '2026-04-20T00:00:00Z',
    }];
    state.purchases = [
      { id: 'p1', name: 'Shopping', amount: 325.5, category: 'Other', cardId: null, budgetType: 'wants', date: '2026-05-04' },
    ];

    const result = getEnvelopeForecast(state, today);

    expect(result.status).toBe('over');               // 651 > 600
  });
});

// ─── getSpendingTrend ─────────────────────────────────────────────

describe('getSpendingTrend', () => {
  it('returns exactly `count` rows', () => {
    const state = buildState();
    const rows = getSpendingTrend(state, 6);
    expect(rows).toHaveLength(6);
  });

  it('oldest row is first, current month is last (isCurrent = true)', () => {
    const rows = getSpendingTrend(buildState(), 6);
    expect(rows[0].isCurrent).toBe(false);
    expect(rows[rows.length - 1].isCurrent).toBe(true);
  });

  it('each row carries the same income figure', () => {
    const state = buildState({
      incomeStreams: [{ id: 'i1', name: 'Salary', amount: 5000, biweekly: false }],
    });
    const rows = getSpendingTrend(state, 3);
    for (const row of rows) {
      expect(row.income).toBe(5000);
    }
  });

  it('includes spending-history wants in past months', () => {
    const today = new Date('2026-03-15T00:00:00');
    const state = buildState({
      spendingHistory: [
        { id: 'H1', date: '2026-02-10', total: 300, items: [], spent: { wants: 300, needs: 0 } },
      ],
    });
    // count=2 → rows for Feb + Mar
    const rows = getSpendingTrend(state, 2, today);
    const feb = rows.find(r => r.monthKey === '2026-02');
    expect(feb?.wants).toBe(300);
  });

  it('current month includes live purchases', () => {
    const today = new Date('2026-03-15T00:00:00');
    const state = buildState({
      purchases: [
        // BUG-026: date must be in March 2026 to pass the month filter
        { id: 'p1', name: 'Coffee', amount: 45, category: 'Food & Drink', cardId: null, budgetType: 'wants', date: '2026-03-10' },
      ],
    });
    const rows = getSpendingTrend(state, 1, today);
    expect(rows[0].wants).toBe(45);
  });

  it('month keys are unique and in ascending order', () => {
    const rows = getSpendingTrend(buildState(), 4);
    const keys = rows.map(r => r.monthKey);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
    const unique = new Set(keys);
    expect(unique.size).toBe(4);
  });
});

// ─── getGoalsTimeline ─────────────────────────────────────────────

describe('getGoalsTimeline', () => {
  function makeAccount(id: string, balance: number, allocated = 0) {
    return {
      id,
      name: id,
      balance,
      defaultAllocated: allocated,
      monthlyAllocations: {} as Record<string, number>,
    };
  }

  it('returns empty array when there are no goals', () => {
    const state = buildState();
    expect(getGoalsTimeline(state)).toHaveLength(0);
  });

  it('skips goals whose account is missing', () => {
    const state = buildState({
      goals: [{ id: 'g1', accountId: 'missing', targetAmount: 1000, targetDate: '2027-12' }],
      savingsAccounts: [],
    });
    expect(getGoalsTimeline(state)).toHaveLength(0);
  });

  it('marks a goal complete when balance >= target', () => {
    const today = new Date('2026-05-01T00:00:00');
    const state = buildState({
      goals: [{ id: 'g1', accountId: 'acc1', targetAmount: 500, targetDate: '2027-06' }],
      savingsAccounts: [makeAccount('acc1', 600)],
    });
    const [item] = getGoalsTimeline(state, today);
    expect(item.status).toBe('complete');
    expect(item.monthsToComplete).toBeNull();
  });

  it('marks a goal missed when target date has passed and balance < target', () => {
    const today = new Date('2026-05-01T00:00:00');
    const state = buildState({
      goals: [{ id: 'g1', accountId: 'acc1', targetAmount: 5000, targetDate: '2026-04' }],
      savingsAccounts: [makeAccount('acc1', 1000)],
    });
    const [item] = getGoalsTimeline(state, today);
    expect(item.status).toBe('missed');
  });

  it('computes on-track when monthly allocation covers shortfall in time', () => {
    // Target: $3000 by 2026-11 (6 months from May 2026)
    // Balance: $0, allocating $600/month → completes in 5 months → on track
    const today = new Date('2026-05-01T00:00:00');
    const state = buildState({
      goals: [{ id: 'g1', accountId: 'acc1', targetAmount: 3000, targetDate: '2026-11' }],
      savingsAccounts: [makeAccount('acc1', 0, 600)],
    });
    const [item] = getGoalsTimeline(state, today);
    expect(item.status).toBe('on-track');
    expect((item.monthsLate ?? 0)).toBeLessThanOrEqual(0);
  });

  it('computes off-track when monthly allocation is too low', () => {
    // Target: $12000 by 2026-11 (6 months)
    // Balance: $0, allocating $100/month → completes in 120 months → very late
    const today = new Date('2026-05-01T00:00:00');
    const state = buildState({
      goals: [{ id: 'g1', accountId: 'acc1', targetAmount: 12000, targetDate: '2026-11' }],
      savingsAccounts: [makeAccount('acc1', 0, 100)],
    });
    const [item] = getGoalsTimeline(state, today);
    expect(item.status).toBe('off-track');
    expect((item.monthsLate ?? 0)).toBeGreaterThan(0);
  });

  it('sorts goals: active (by target date) → complete → missed', () => {
    const today = new Date('2026-05-01T00:00:00');
    const state = buildState({
      goals: [
        { id: 'missed', accountId: 'acc_missed', targetAmount: 1000, targetDate: '2026-03' },
        { id: 'complete', accountId: 'acc_complete', targetAmount: 500, targetDate: '2027-12' },
        { id: 'active_far', accountId: 'acc_far', targetAmount: 2000, targetDate: '2028-01' },
        { id: 'active_near', accountId: 'acc_near', targetAmount: 2000, targetDate: '2026-09' },
      ],
      savingsAccounts: [
        makeAccount('acc_missed',  100, 50),   // balance < target, date passed
        makeAccount('acc_complete', 600, 50),  // balance >= target
        makeAccount('acc_far',       0, 50),   // active, far
        makeAccount('acc_near',      0, 50),   // active, near
      ],
    });
    const items = getGoalsTimeline(state, today);
    expect(items[0].id).toBe('active_near');
    expect(items[1].id).toBe('active_far');
    expect(items[2].id).toBe('complete');
    expect(items[3].id).toBe('missed');
  });
});

// ─── getWantsCategoryActuals ─────────────────────────────────────

describe('getWantsCategoryActuals', () => {
  const today = new Date('2026-05-15T12:00:00');

  it('returns empty object when there are no wants purchases', () => {
    const state = buildState();
    expect(getWantsCategoryActuals(state, today)).toEqual({});
  });

  it('aggregates current-period wants purchases by category', () => {
    const state = buildState({
      purchases: [
        // BUG-026: all must be dated in May 2026 to pass the month filter
        { id: '1', name: 'Coffee', amount: 10, category: 'Food & Drink', budgetType: 'wants', cardId: null, date: '2026-05-10' },
        { id: '2', name: 'Burger', amount: 15, category: 'Food & Drink', budgetType: 'wants', cardId: null, date: '2026-05-12' },
        { id: '3', name: 'Movie',  amount: 20, category: 'Entertainment', budgetType: 'wants', cardId: null, date: '2026-05-14' },
      ],
    });
    const result = getWantsCategoryActuals(state, today);
    expect(result['Food & Drink']).toBe(25);
    expect(result['Entertainment']).toBe(20);
  });

  it('excludes needs purchases', () => {
    const state = buildState({
      purchases: [
        { id: '1', name: 'Rent', amount: 1000, category: 'Housing', budgetType: 'needs', cardId: null, date: '2026-05-10' },
        { id: '2', name: 'Coffee', amount: 5, category: 'Food & Drink', budgetType: 'wants', cardId: null, date: '2026-05-10' },
      ],
    });
    const result = getWantsCategoryActuals(state, today);
    expect(result['Housing']).toBeUndefined();
    expect(result['Food & Drink']).toBe(5);
  });

  it('includes archived history items for the current month', () => {
    const state = buildState({
      purchases: [],
      spendingHistory: [
        {
          id: 'p1',
          date: '2026-05-01',
          total: 80,
          items: [
            { name: 'Netflix', amount: 17, category: 'Entertainment' },
            { name: 'Spotify', amount: 10, category: 'Entertainment' },
            { name: 'Bagel',   amount: 53, category: 'Food & Drink' },
          ],
        },
      ],
    });
    const result = getWantsCategoryActuals(state, today);
    expect(result['Entertainment']).toBe(27);
    expect(result['Food & Drink']).toBe(53);
  });

  it('does not include history from a different month', () => {
    const state = buildState({
      purchases: [],
      spendingHistory: [
        {
          id: 'p1',
          date: '2026-04-15',  // April — not the current May month
          total: 100,
          items: [{ name: 'Old purchase', amount: 100, category: 'Shopping' }],
        },
      ],
    });
    expect(getWantsCategoryActuals(state, today)).toEqual({});
  });

  it('falls back to "Other" when category is missing', () => {
    const state = buildState({
      purchases: [
        { id: '1', name: 'Mystery', amount: 30, category: '', budgetType: 'wants', cardId: null, date: '2026-05-10' },
      ],
    });
    const result = getWantsCategoryActuals(state, today);
    expect(result['Other']).toBe(30);
  });

  it('BUG-026: excludes purchases from a different month', () => {
    const state = buildState({
      purchases: [
        { id: '1', name: 'Current',  amount: 20, category: 'Entertainment', budgetType: 'wants', cardId: null, date: '2026-05-10' },
        { id: '2', name: 'Stale',    amount: 99, category: 'Entertainment', budgetType: 'wants', cardId: null, date: '2026-04-20' },
      ],
    });
    const result = getWantsCategoryActuals(state, today);
    // Only the May purchase should be counted
    expect(result['Entertainment']).toBe(20);
  });
});

// ─── getTriggeredAlerts — BUG-026 period filter ──────────────────
describe('getTriggeredAlerts', () => {
  it('fires when current-period category spending exceeds threshold', () => {
    const state = buildState({
      payStart: '2026-05-01',
      budgetAlerts: [{ id: 'a1', category: 'Entertainment', threshold: 50 }],
      purchases: [
        { id: 'p1', name: 'Concert', amount: 80, category: 'Entertainment', budgetType: 'wants', cardId: null, date: '2026-05-05' },
      ],
    });
    const alerts = getTriggeredAlerts(state, new Date('2026-05-10T00:00:00'));
    expect(alerts.length).toBe(1);
    expect(alerts[0].category).toBe('Entertainment');
    expect(alerts[0].spent).toBe(80);
  });

  it('BUG-026: does NOT fire when only an out-of-period purchase exceeds threshold', () => {
    // Stale purchase from a previous period should not trigger an alert
    const state = buildState({
      payStart: '2026-05-01',
      budgetAlerts: [{ id: 'a1', category: 'Shopping', threshold: 50 }],
      purchases: [
        { id: 'p1', name: 'Old Shop', amount: 300, category: 'Shopping', budgetType: 'wants', cardId: null, date: '2026-04-15' },
      ],
    });
    const alerts = getTriggeredAlerts(state, new Date('2026-05-10T00:00:00'));
    expect(alerts.length).toBe(0);
  });

  it('does not fire when no payStart is set (full purchases list is used as fallback)', () => {
    const state = buildState({
      // payStart: null (default)
      budgetAlerts: [{ id: 'a1', category: 'Food & Drink', threshold: 10 }],
      purchases: [
        { id: 'p1', name: 'Coffee', amount: 5, category: 'Food & Drink', budgetType: 'wants', cardId: null },
      ],
    });
    const alerts = getTriggeredAlerts(state, new Date('2026-05-10T00:00:00'));
    // payStart=null → fallback to all purchases → $5 < $10 threshold → no alert
    expect(alerts.length).toBe(0);
  });
});

// ─── GoalProgress — monthlyAllocation & monthsAtCurrentRate ──────

describe('getGoalProgress — runway fields', () => {
  const today = new Date('2026-05-15T12:00:00');

  function makeAcc(id: string, balance: number, alloc: number) {
    return {
      id,
      name: 'Test Account',
      balance,
      defaultAllocated: alloc,
      monthlyAllocations: {} as Record<string, number>,
    };
  }

  it('returns monthlyAllocation matching account defaultAllocated', () => {
    const state = buildState({
      savingsAccounts: [makeAcc('acc1', 0, 200)],
    });
    const goal = { id: 'g1', accountId: 'acc1', targetAmount: 1000, targetDate: '2027-05' };
    const progress = getGoalProgress(state, goal, today);
    expect(progress?.monthlyAllocation).toBe(200);
  });

  it('monthsAtCurrentRate = null when allocation is 0', () => {
    const state = buildState({
      savingsAccounts: [makeAcc('acc1', 0, 0)],
    });
    const goal = { id: 'g1', accountId: 'acc1', targetAmount: 1000, targetDate: '2027-05' };
    const progress = getGoalProgress(state, goal, today);
    expect(progress?.monthsAtCurrentRate).toBeNull();
  });

  it('monthsAtCurrentRate = 0 when goal is already met', () => {
    const state = buildState({
      savingsAccounts: [makeAcc('acc1', 1000, 100)],
    });
    const goal = { id: 'g1', accountId: 'acc1', targetAmount: 1000, targetDate: '2027-05' };
    const progress = getGoalProgress(state, goal, today);
    expect(progress?.monthsAtCurrentRate).toBe(0);
  });

  it('monthsAtCurrentRate = ceil(shortfall / allocation)', () => {
    const state = buildState({
      savingsAccounts: [makeAcc('acc1', 400, 100)],
    });
    const goal = { id: 'g1', accountId: 'acc1', targetAmount: 1000, targetDate: '2030-05' };
    const progress = getGoalProgress(state, goal, today);
    // shortfall = 600, allocation = 100 → 6 months
    expect(progress?.monthsAtCurrentRate).toBe(6);
  });

  it('rounds up fractional months', () => {
    const state = buildState({
      savingsAccounts: [makeAcc('acc1', 0, 300)],
    });
    const goal = { id: 'g1', accountId: 'acc1', targetAmount: 1000, targetDate: '2030-05' };
    const progress = getGoalProgress(state, goal, today);
    // shortfall = 1000, allocation = 300 → ceil(3.33) = 4
    expect(progress?.monthsAtCurrentRate).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────
//  getPayPeriodForecast / getPayPeriodDayMap
// ─────────────────────────────────────────────────────────────────
describe('getPayPeriodForecast', () => {
  function makeStateWithPayStart(payStart: string | null) {
    const s = makeBlankState() as BudgetState;
    s.payStart = payStart;
    s.incomeStreams = [{ id: 'i1', name: 'Salary', amount: 3000, biweekly: false }];
    s.allocation = { needs: 50, wants: 30, savings: 20 };
    return s;
  }

  it('returns null when payStart is not configured', () => {
    const state = makeStateWithPayStart(null);
    expect(getPayPeriodForecast(state, 0)).toBeNull();
  });

  it('period spans exactly 14 days', () => {
    const state = makeStateWithPayStart('2026-05-19');
    const today = new Date('2026-05-19T12:00:00');
    const fc = getPayPeriodForecast(state, 0, today);
    expect(fc).not.toBeNull();
    expect(fc!.periodStart).toBe('2026-05-19');
    expect(fc!.periodEnd).toBe('2026-06-01');
  });

  it('offset +1 advances start by 14 days', () => {
    const state = makeStateWithPayStart('2026-05-19');
    const today = new Date('2026-05-19T12:00:00');
    const fc = getPayPeriodForecast(state, 1, today);
    expect(fc!.periodStart).toBe('2026-06-02');
    expect(fc!.periodEnd).toBe('2026-06-15');
  });

  it('offset -1 goes back 14 days', () => {
    const state = makeStateWithPayStart('2026-05-19');
    const today = new Date('2026-05-19T12:00:00');
    const fc = getPayPeriodForecast(state, -1, today);
    expect(fc!.periodStart).toBe('2026-05-05');
    expect(fc!.periodEnd).toBe('2026-05-18');
  });

  it('expense card item with dueDay in the window appears in dated', () => {
    const state = makeStateWithPayStart('2026-05-19');
    const today = new Date('2026-05-19T12:00:00');
    state.expenseCards = [{
      id: 'card1', label: 'Bills', items: [
        { id: 'e1', name: 'Hydro', amount: 80, biweekly: false, dueDay: 25 } as any,
      ],
    }];
    const fc = getPayPeriodForecast(state, 0, today)!;
    expect(fc.dated).toHaveLength(1);
    expect(fc.dated[0].name).toBe('Hydro');
    expect(fc.dated[0].periodDate).toBe('2026-05-25');
    expect(fc.undated).toHaveLength(0);
  });

  it('expense card item with dueDay outside the window is excluded', () => {
    const state = makeStateWithPayStart('2026-05-19');
    const today = new Date('2026-05-19T12:00:00');
    state.expenseCards = [{
      id: 'card1', label: 'Bills', items: [
        { id: 'e1', name: 'Phone', amount: 50, biweekly: false, dueDay: 10 } as any,
      ],
    }];
    const fc = getPayPeriodForecast(state, 0, today)!;
    expect(fc.dated).toHaveLength(0);
    expect(fc.undated).toHaveLength(0);
  });

  it('expense card item without dueDay goes to undated with half monthly amount', () => {
    const state = makeStateWithPayStart('2026-05-19');
    const today = new Date('2026-05-19T12:00:00');
    state.expenseCards = [{
      id: 'card1', label: 'Bills', items: [
        { id: 'e1', name: 'Groceries', amount: 400, biweekly: false },
      ],
    }];
    const fc = getPayPeriodForecast(state, 0, today)!;
    expect(fc.dated).toHaveLength(0);
    expect(fc.undated).toHaveLength(1);
    expect(fc.undated[0].totalForMonth).toBeCloseTo(200);
  });

  it('biweekly expense card item without dueDay gets full per-period amount', () => {
    const state = makeStateWithPayStart('2026-05-19');
    const today = new Date('2026-05-19T12:00:00');
    state.expenseCards = [{
      id: 'card1', label: 'Bills', items: [
        { id: 'e1', name: 'BiWk', amount: 100, biweekly: true },
      ],
    }];
    const fc = getPayPeriodForecast(state, 0, today)!;
    expect(fc.undated[0].totalForMonth).toBe(100);
  });

  it('subscription renewing in the window appears in dated', () => {
    const state = makeStateWithPayStart('2026-05-19');
    const today = new Date('2026-05-19T12:00:00');
    state.subscriptions = [{
      id: 's1', name: 'Netflix', amount: 18, date: '2026-01-22', cardId: null,
      frequency: 'monthly', budgetType: 'wants', category: 'Entertainment',
    }];
    const fc = getPayPeriodForecast(state, 0, today)!;
    expect(fc.dated).toHaveLength(1);
    expect(fc.dated[0].name).toBe('Netflix');
    expect(fc.dated[0].periodDate).toBe('2026-05-22');
  });

  it('subscription NOT renewing in the window is excluded', () => {
    const state = makeStateWithPayStart('2026-05-19');
    const today = new Date('2026-05-19T12:00:00');
    state.subscriptions = [{
      id: 's1', name: 'Spotify', amount: 10, date: '2026-01-05', cardId: null,
      frequency: 'monthly', budgetType: 'wants', category: 'Entertainment',
    }];
    const fc = getPayPeriodForecast(state, 0, today)!;
    expect(fc.dated).toHaveLength(0);
  });

  it('total equals sum of dated items', () => {
    const state = makeStateWithPayStart('2026-05-19');
    const today = new Date('2026-05-19T12:00:00');
    state.expenseCards = [{
      id: 'card1', label: 'Bills', items: [
        { id: 'e1', name: 'Hydro', amount: 80, biweekly: false, dueDay: 25 } as any,
        { id: 'e2', name: 'Internet', amount: 60, biweekly: false, dueDay: 28 } as any,
      ],
    }];
    const fc = getPayPeriodForecast(state, 0, today)!;
    expect(fc.total).toBe(140);
    expect(fc.variance).toBe(fc.budgeted - 140);
  });

  it('budgeted equals half the monthly Needs budget', () => {
    const state = makeStateWithPayStart('2026-05-19');
    const today = new Date('2026-05-19T12:00:00');
    const fc = getPayPeriodForecast(state, 0, today)!;
    // Income=3000, needs=50% -> monthly Needs=1500; per period=750
    expect(fc.budgeted).toBe(750);
  });

  it('label is a human-readable range string', () => {
    const state = makeStateWithPayStart('2026-05-19');
    const today = new Date('2026-05-19T12:00:00');
    const fc = getPayPeriodForecast(state, 0, today)!;
    expect(fc.label).toMatch(/May/);
    expect(fc.label).toContain('–'); // en-dash '–'
  });

  it('dated items are sorted chronologically by periodDate', () => {
    const state = makeStateWithPayStart('2026-05-19');
    const today = new Date('2026-05-19T12:00:00');
    state.expenseCards = [{
      id: 'card1', label: 'Bills', items: [
        { id: 'e1', name: 'B', amount: 50, biweekly: false, dueDay: 30 } as any,
        { id: 'e2', name: 'A', amount: 50, biweekly: false, dueDay: 22 } as any,
      ],
    }];
    const fc = getPayPeriodForecast(state, 0, today)!;
    expect(fc.dated[0].name).toBe('A');
    expect(fc.dated[1].name).toBe('B');
  });
});

describe('getPayPeriodDayMap', () => {
  it('returns empty Map when payStart is null', () => {
    const state = makeBlankState() as BudgetState;
    state.payStart = null;
    const map = getPayPeriodDayMap(state, 0);
    expect(map.size).toBe(0);
  });

  it('maps each dated item to its ISODate key', () => {
    const state = makeBlankState() as BudgetState;
    state.payStart = '2026-05-19';
    state.incomeStreams = [{ id: 'i1', name: 'Salary', amount: 3000, biweekly: false }];
    state.allocation = { needs: 50, wants: 30, savings: 20 };
    state.expenseCards = [{
      id: 'card1', label: 'Bills', items: [
        { id: 'e1', name: 'Hydro', amount: 80, biweekly: false, dueDay: 25 } as any,
      ],
    }];
    const today = new Date('2026-05-19T12:00:00');
    const map = getPayPeriodDayMap(state, 0, today);
    expect(map.has('2026-05-25')).toBe(true);
    expect(map.get('2026-05-25')![0].name).toBe('Hydro');
  });
});

// ─────────────────────────────────────────────────────────────────
//  Loans in getMonthForecast
// ─────────────────────────────────────────────────────────────────
describe('getMonthForecast — loans', () => {
  function makeBasicLoan(overrides: Partial<{
    id: string; name: string; paymentAmount: number; date: string;
    frequency: string; budgetType: string; cardId: string | null;
    remaining: number; original: number;
  }> = {}) {
    return {
      id: 'loan1', name: 'Car Loan', paymentAmount: 350, date: '2026-05-15',
      frequency: 'monthly', budgetType: 'needs', cardId: null,
      remaining: 10000, original: 15000,
      ...overrides,
    };
  }

  function makeStateWithLoan(loanOverrides = {}) {
    const s = makeBlankState() as BudgetState;
    s.incomeStreams = [{ id: 'i1', name: 'Salary', amount: 3000, biweekly: false }];
    s.allocation = { needs: 50, wants: 30, savings: 20 };
    s.loans = [makeBasicLoan(loanOverrides) as any];
    return s;
  }

  it('monthly loan with a date appears in dated list', () => {
    const state = makeStateWithLoan();
    const fc = getMonthForecast(state, 2026, 5);
    expect(fc.dated.some(i => i.source === 'loan')).toBe(true);
  });

  it('loan dueDay matches the day of the date field', () => {
    const state = makeStateWithLoan({ date: '2026-05-15' });
    const fc = getMonthForecast(state, 2026, 5);
    const loan = fc.dated.find(i => i.source === 'loan');
    expect(loan?.dueDay).toBe(15);
  });

  it('loan totalForMonth equals paymentAmount', () => {
    const state = makeStateWithLoan({ paymentAmount: 350 });
    const fc = getMonthForecast(state, 2026, 5);
    const loan = fc.dated.find(i => i.source === 'loan');
    expect(loan?.totalForMonth).toBe(350);
  });

  it('loan is included even in different months (monthly cadence)', () => {
    const state = makeStateWithLoan({ date: '2026-01-15', frequency: 'monthly' });
    // June should also show the loan since it's monthly
    const fc = getMonthForecast(state, 2026, 6);
    expect(fc.dated.some(i => i.source === 'loan')).toBe(true);
  });

  it('loan without a date goes to undated', () => {
    const state = makeStateWithLoan({ date: '' });
    const fc = getMonthForecast(state, 2026, 5);
    // No date → dueDay is null → undated
    expect(fc.undated.some(i => i.source === 'loan')).toBe(true);
    expect(fc.dated.some(i => i.source === 'loan')).toBe(false);
  });

  it('loan with paymentAmount 0 is skipped entirely', () => {
    const state = makeStateWithLoan({ paymentAmount: 0 });
    const fc = getMonthForecast(state, 2026, 5);
    expect(fc.dated.some(i => i.source === 'loan')).toBe(false);
    expect(fc.undated.some(i => i.source === 'loan')).toBe(false);
  });

  it('loan with a linked card shows card label', () => {
    const state = makeStateWithLoan({ cardId: 'card1' }) as BudgetState;
    state.expenseCards = [{ id: 'card1', label: 'Housing', items: [] }];
    const fc = getMonthForecast(state, 2026, 5);
    const loan = fc.dated.find(i => i.source === 'loan');
    expect(loan?.cardLabel).toBe('Housing');
  });

  it('loan without a linked card shows "Loan" as cardLabel', () => {
    const state = makeStateWithLoan({ cardId: null });
    const fc = getMonthForecast(state, 2026, 5);
    const loan = fc.dated.find(i => i.source === 'loan');
    expect(loan?.cardLabel).toBe('Loan');
  });

  it('biweekly loan appears on its renewal dates in the month', () => {
    // Anchor date: 2026-05-05; biweekly → renews again May 19
    const state = makeStateWithLoan({ date: '2026-05-05', frequency: 'biweekly', paymentAmount: 200 });
    const fc = getMonthForecast(state, 2026, 5);
    const loanItems = fc.dated.filter(i => i.source === 'loan');
    // Two biweekly payments in May: 5th and 19th
    expect(loanItems).toHaveLength(2);
    expect(loanItems[0].dueDay).toBe(5);
    expect(loanItems[1].dueDay).toBe(19);
  });

  it('biweekly loan totalForMonth reflects each occurrence separately', () => {
    const state = makeStateWithLoan({ date: '2026-05-05', frequency: 'biweekly', paymentAmount: 200 });
    const fc = getMonthForecast(state, 2026, 5);
    const loanItems = fc.dated.filter(i => i.source === 'loan');
    // Each occurrence has its own row with occurrences=1
    loanItems.forEach(item => expect(item.totalForMonth).toBe(200));
  });
});

// ─────────────────────────────────────────────────────────────────
//  Loans in getPayPeriodForecast
// ─────────────────────────────────────────────────────────────────
describe('getPayPeriodForecast — loans', () => {
  function makeStateWithLoanAndPayStart(overrides = {}) {
    const s = makeBlankState() as BudgetState;
    s.payStart = '2026-05-19';
    s.incomeStreams = [{ id: 'i1', name: 'Salary', amount: 3000, biweekly: false }];
    s.allocation = { needs: 50, wants: 30, savings: 20 };
    s.loans = [{
      id: 'loan1', name: 'Mortgage', paymentAmount: 1200, date: '2026-05-22',
      frequency: 'monthly', budgetType: 'needs', cardId: null,
      remaining: 200000, original: 300000,
      ...overrides,
    } as any];
    return s;
  }

  it('monthly loan due within the 14-day window appears in dated', () => {
    // Period: May 19 – Jun 1; May 22 is inside
    const state = makeStateWithLoanAndPayStart({ date: '2026-05-22' });
    const today = new Date('2026-05-19T12:00:00');
    const fc = getPayPeriodForecast(state, 0, today)!;
    expect(fc.dated.some(i => i.source === 'loan')).toBe(true);
  });

  it('loan periodDate matches the actual renewal date', () => {
    const state = makeStateWithLoanAndPayStart({ date: '2026-05-22' });
    const today = new Date('2026-05-19T12:00:00');
    const fc = getPayPeriodForecast(state, 0, today)!;
    const loan = fc.dated.find(i => i.source === 'loan');
    expect(loan?.periodDate).toBe('2026-05-22');
  });

  it('loan due outside the 14-day window is excluded', () => {
    // Due on the 5th → not in May 19 – Jun 1
    const state = makeStateWithLoanAndPayStart({ date: '2026-05-05' });
    const today = new Date('2026-05-19T12:00:00');
    const fc = getPayPeriodForecast(state, 0, today)!;
    expect(fc.dated.some(i => i.source === 'loan')).toBe(false);
  });

  it('loan with paymentAmount 0 is skipped', () => {
    const state = makeStateWithLoanAndPayStart({ paymentAmount: 0 });
    const today = new Date('2026-05-19T12:00:00');
    const fc = getPayPeriodForecast(state, 0, today)!;
    expect(fc.dated.some(i => i.source === 'loan')).toBe(false);
  });

  it('loan without date is skipped', () => {
    const state = makeStateWithLoanAndPayStart({ date: '' });
    const today = new Date('2026-05-19T12:00:00');
    const fc = getPayPeriodForecast(state, 0, today)!;
    expect(fc.dated.some(i => i.source === 'loan')).toBe(false);
  });

  it('loan with linked card shows card label in pay period forecast', () => {
    const state = makeStateWithLoanAndPayStart({ date: '2026-05-22', cardId: 'card1' });
    state.expenseCards = [{ id: 'card1', label: 'Housing', items: [] }];
    const today = new Date('2026-05-19T12:00:00');
    const fc = getPayPeriodForecast(state, 0, today)!;
    const loan = fc.dated.find(i => i.source === 'loan');
    expect(loan?.cardLabel).toBe('Housing');
  });

  it('loan without linked card shows "Loan" label', () => {
    const state = makeStateWithLoanAndPayStart({ date: '2026-05-22', cardId: null });
    const today = new Date('2026-05-19T12:00:00');
    const fc = getPayPeriodForecast(state, 0, today)!;
    const loan = fc.dated.find(i => i.source === 'loan');
    expect(loan?.cardLabel).toBe('Loan');
  });
});

// ─────────────────────────────────────────────────────────────────
//  getRenewalDatesBetween — custom-days frequency (Sprint 17)
// ─────────────────────────────────────────────────────────────────
describe('getRenewalDatesBetween — custom-days', () => {
  function makeItem(daysOfWeek: number[], date = '2026-01-01') {
    return { date, frequency: 'custom-days' as Frequency, daysOfWeek };
  }

  it('returns empty array when daysOfWeek is empty', () => {
    const s = new Date('2026-05-01T00:00:00');
    const e = new Date('2026-05-31T23:59:59');
    expect(getRenewalDatesBetween(makeItem([]), s, e)).toHaveLength(0);
  });

  it('returns only Mondays when daysOfWeek = [1]', () => {
    const s = new Date('2026-05-01T00:00:00');
    const e = new Date('2026-05-31T23:59:59');
    const dates = getRenewalDatesBetween(makeItem([1]), s, e);
    // May 2026 Mondays: 4,11,18,25
    expect(dates).toEqual(['2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25']);
  });

  it('returns Mon+Tue+Wed occurrences for May 2026', () => {
    const s = new Date('2026-05-01T00:00:00');
    const e = new Date('2026-05-31T23:59:59');
    const dates = getRenewalDatesBetween(makeItem([1, 2, 3]), s, e);
    // May 2026: Mon 4,11,18,25 | Tue 5,12,19,26 | Wed 6,13,20,27 = 12 dates
    expect(dates).toHaveLength(12);
    expect(dates[0]).toBe('2026-05-04'); // first Monday
    expect(dates).toContain('2026-05-05'); // Tuesday
    expect(dates).toContain('2026-05-06'); // Wednesday
  });

  it('respects the effective-from anchor date', () => {
    // Pattern starts May 15 — only Mondays on or after May 15
    const s = new Date('2026-05-01T00:00:00');
    const e = new Date('2026-05-31T23:59:59');
    const dates = getRenewalDatesBetween(makeItem([1], '2026-05-15'), s, e);
    // Mondays >= May 15: 18, 25
    expect(dates).toEqual(['2026-05-18', '2026-05-25']);
  });

  it('handles a pay-period window (14 days) correctly', () => {
    const s = new Date('2026-05-19T00:00:00'); // Tuesday
    const e = new Date('2026-06-01T23:59:59'); // Monday
    const dates = getRenewalDatesBetween(makeItem([1, 3]), s, e); // Mon+Wed
    // Wednesdays: 20, 27 | Mondays: 25, Jun 1 = 4 dates
    expect(dates).toHaveLength(4);
    expect(dates).toContain('2026-05-20'); // Wed
    expect(dates).toContain('2026-05-25'); // Mon
    expect(dates).toContain('2026-05-27'); // Wed
    expect(dates).toContain('2026-06-01'); // Mon
  });

  it('returns empty when window is before anchor date', () => {
    // anchor May 20, window May 1-10
    const s = new Date('2026-05-01T00:00:00');
    const e = new Date('2026-05-10T23:59:59');
    expect(getRenewalDatesBetween(makeItem([1], '2026-05-20'), s, e)).toHaveLength(0);
  });

  it('all seven days of the week selected returns every day in range', () => {
    const s = new Date('2026-05-11T00:00:00'); // Monday
    const e = new Date('2026-05-17T23:59:59'); // Sunday
    const dates = getRenewalDatesBetween(makeItem([0, 1, 2, 3, 4, 5, 6]), s, e);
    expect(dates).toHaveLength(7);
  });
});

// ─────────────────────────────────────────────────────────────────
//  getMonthForecast — custom-days subscriptions (Sprint 17)
// ─────────────────────────────────────────────────────────────────
describe('getMonthForecast — custom-days subscriptions', () => {
  function makeStateWithCustomSub(overrides: Record<string, unknown> = {}) {
    const s = makeBlankState() as BudgetState;
    s.incomeStreams = [{ id: 'i1', name: 'Salary', amount: 3000, biweekly: false }];
    s.allocation = { needs: 50, wants: 30, savings: 20 };
    s.subscriptions = [{
      id: 'sub-custom',
      name: 'Parking',
      amount: 8,
      frequency: 'custom-days' as Frequency,
      date: '2026-01-01',
      category: 'Transport',
      budgetType: 'needs' as any,
      cardId: null,
      daysOfWeek: [1, 2, 3], // Mon·Tue·Wed
      ...overrides,
    } as any];
    return s;
  }

  it('produces one ForecastItem per occurrence day', () => {
    const state = makeStateWithCustomSub();
    const fc = getMonthForecast(state, 2026, 5);
    // May 2026 Mon+Tue+Wed: 12 occurrences
    const items = fc.dated.filter(i => i.id === 'sub-custom');
    expect(items).toHaveLength(12);
  });

  it('each occurrence item has amount equal to per-day amount', () => {
    const state = makeStateWithCustomSub();
    const fc = getMonthForecast(state, 2026, 5);
    const items = fc.dated.filter(i => i.id === 'sub-custom');
    items.forEach(item => expect(item.amount).toBe(8));
  });

  it('each occurrence item has totalForMonth = amount (occurrences: 1)', () => {
    const state = makeStateWithCustomSub();
    const fc = getMonthForecast(state, 2026, 5);
    const items = fc.dated.filter(i => i.id === 'sub-custom');
    items.forEach(item => {
      expect(item.occurrences).toBe(1);
      expect(item.totalForMonth).toBe(8);
    });
  });

  it('items carry daysOfWeek on the ForecastItem', () => {
    const state = makeStateWithCustomSub();
    const fc = getMonthForecast(state, 2026, 5);
    const item = fc.dated.find(i => i.id === 'sub-custom');
    expect(item?.daysOfWeek).toEqual([1, 2, 3]);
  });

  it('frequency field is "custom-days" on each item', () => {
    const state = makeStateWithCustomSub();
    const fc = getMonthForecast(state, 2026, 5);
    const items = fc.dated.filter(i => i.id === 'sub-custom');
    items.forEach(item => expect(item.frequency).toBe('custom-days'));
  });

  it('fc.total includes all custom-days occurrences', () => {
    const state = makeStateWithCustomSub();
    const fc = getMonthForecast(state, 2026, 5);
    // 12 occurrences × $8 = $96
    const customTotal = fc.dated
      .filter(i => i.id === 'sub-custom')
      .reduce((sum, i) => sum + i.amount, 0);
    expect(customTotal).toBe(96);
  });

  it('produces zero items when daysOfWeek is empty', () => {
    const state = makeStateWithCustomSub({ daysOfWeek: [] });
    const fc = getMonthForecast(state, 2026, 5);
    expect(fc.dated.filter(i => i.id === 'sub-custom')).toHaveLength(0);
  });

  it('respects effective-from date (anchor after month start)', () => {
    // Anchor May 25: only Mon (25) is a Monday after May 25, no Tue/Wed after 25 in range Mon=25,Tue=26,Wed=27 → 3
    const state = makeStateWithCustomSub({ date: '2026-05-25' });
    const fc = getMonthForecast(state, 2026, 5);
    const items = fc.dated.filter(i => i.id === 'sub-custom');
    // From May 25 onward: Mon 25, Tue 26, Wed 27
    expect(items).toHaveLength(3);
  });

  it('does not appear in undated', () => {
    const state = makeStateWithCustomSub();
    const fc = getMonthForecast(state, 2026, 5);
    expect(fc.undated.filter(i => i.id === 'sub-custom')).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────
//  getPayPeriodForecast — custom-days subscriptions (Sprint 17)
// ─────────────────────────────────────────────────────────────────
describe('getPayPeriodForecast — custom-days subscriptions', () => {
  function makeStateWithCustomSubAndPayStart(overrides: Record<string, unknown> = {}) {
    const s = makeBlankState() as BudgetState;
    s.payStart = '2026-05-19';
    s.incomeStreams = [{ id: 'i1', name: 'Salary', amount: 3000, biweekly: false }];
    s.allocation = { needs: 50, wants: 30, savings: 20 };
    s.subscriptions = [{
      id: 'sub-pp',
      name: 'Parking',
      amount: 10,
      frequency: 'custom-days' as Frequency,
      date: '2026-01-01',
      category: 'Transport',
      budgetType: 'needs' as any,
      cardId: null,
      daysOfWeek: [1, 3], // Mon+Wed
      ...overrides,
    } as any];
    return s;
  }

  it('produces one item per occurrence in the 14-day window', () => {
    const state = makeStateWithCustomSubAndPayStart();
    // May 19 – Jun 1: Mon 25, Jun 1 | Wed 20, 27 = 4 occurrences
    const fc = getPayPeriodForecast(state, 0, new Date('2026-05-23'));
    expect(fc).not.toBeNull();
    const items = fc!.dated.filter(i => i.id === 'sub-pp');
    expect(items).toHaveLength(4);
  });

  it('each item has occurrences=1 and totalForMonth=amount', () => {
    const state = makeStateWithCustomSubAndPayStart();
    const fc = getPayPeriodForecast(state, 0, new Date('2026-05-23'));
    const items = fc!.dated.filter(i => i.id === 'sub-pp');
    items.forEach(item => {
      expect(item.occurrences).toBe(1);
      expect(item.totalForMonth).toBe(10);
    });
  });

  it('each item has a distinct periodDate matching its actual calendar date', () => {
    const state = makeStateWithCustomSubAndPayStart();
    const fc = getPayPeriodForecast(state, 0, new Date('2026-05-23'));
    const dates = fc!.dated.filter(i => i.id === 'sub-pp').map(i => i.periodDate);
    expect(dates).toContain('2026-05-20'); // Wed
    expect(dates).toContain('2026-05-25'); // Mon
    expect(dates).toContain('2026-05-27'); // Wed
    expect(dates).toContain('2026-06-01'); // Mon
  });

  it('carries daysOfWeek on each item', () => {
    const state = makeStateWithCustomSubAndPayStart();
    const fc = getPayPeriodForecast(state, 0, new Date('2026-05-23'));
    const item = fc!.dated.find(i => i.id === 'sub-pp');
    expect(item?.daysOfWeek).toEqual([1, 3]);
  });

  it('produces zero items when daysOfWeek is empty', () => {
    const state = makeStateWithCustomSubAndPayStart({ daysOfWeek: [] });
    const fc = getPayPeriodForecast(state, 0, new Date('2026-05-23'));
    expect(fc!.dated.filter(i => i.id === 'sub-pp')).toHaveLength(0);
  });
});

// ─── Sprint 19: getRenewalDatesBetween — biyearly ───────────────────────────

describe('getRenewalDatesBetween — biyearly (every 6 months)', () => {
  it('finds renewals every 6 months within a 2-year window', () => {
    const item = { date: '2026-01-15', frequency: 'biyearly' };
    const dates = getRenewalDatesBetween(item, new Date(2026, 0, 1), new Date(2027, 11, 31));
    expect(dates).toEqual(['2026-01-15', '2026-07-15', '2027-01-15', '2027-07-15']);
  });

  it('returns a single renewal when range spans less than 6 months', () => {
    const item = { date: '2026-03-01', frequency: 'biyearly' };
    const dates = getRenewalDatesBetween(item, new Date(2026, 2, 1), new Date(2026, 4, 31));
    expect(dates).toEqual(['2026-03-01']);
  });

  it('skips renewal that falls before range start', () => {
    const item = { date: '2026-01-01', frequency: 'biyearly' };
    const dates = getRenewalDatesBetween(item, new Date(2026, 5, 15), new Date(2026, 11, 31));
    expect(dates).toEqual(['2026-07-01']);
  });

  it('returns empty array when date is after range end', () => {
    const item = { date: '2027-01-01', frequency: 'biyearly' };
    const dates = getRenewalDatesBetween(item, new Date(2026, 0, 1), new Date(2026, 11, 31));
    expect(dates).toEqual([]);
  });
});

// ─── Hero period-over-period delta (v2.45.2) ─────────────────────
describe('getPreviousPeriodPaceSpend', () => {
  // payStart anchors bi-weekly periods on 2026-06-02. The period containing
  // 2026-06-20 starts 2026-06-16 (Jun 2 + 14). The PREVIOUS period started
  // Jun 2 and is archived below with dated items + a per-bucket spent snapshot.
  const PAY_START = '2026-06-02';

  function withPrev(overrides: Partial<BudgetState> = {}): BudgetState {
    return buildState({
      payStart: PAY_START,
      spendingHistory: [
        {
          id: 'H1',
          date: '2026-06-02',
          total: 400,
          items: [
            { name: 'A', amount: 120, category: 'x', date: '2026-06-03' }, // ≤ cutoff
            { name: 'B', amount: 80,  category: 'x', date: '2026-06-05' }, // ≤ cutoff
            { name: 'C', amount: 150, category: 'x', date: '2026-06-10' }, // after cutoff
            { name: 'D', amount: 50,  category: 'x' },                     // undated → excluded
          ],
          spent: { wants: 300, needs: 100 }, // ratio 0.75 / 0.25
        },
      ],
      ...overrides,
    });
  }

  it('returns null when there is no prior archived period', () => {
    const state = buildState({ payStart: PAY_START });
    expect(getPreviousPeriodPaceSpend(state, 'wants', new Date('2026-06-20T12:00:00'))).toBeNull();
  });

  it('returns null when payStart is unset', () => {
    const state = buildState({ spendingHistory: [{ id: 'H', date: '2026-06-02', total: 10, items: [] }] });
    expect(getPreviousPeriodPaceSpend(state, 'wants', new Date('2026-06-20T12:00:00'))).toBeNull();
  });

  it('pace-adjusts: counts last period spend THROUGH the same elapsed day, apportioned to wants', () => {
    // Day 4 of the current period (Jun 16 → Jun 20). Cutoff in prev period = Jun 6.
    // Through-cutoff spend = 120 + 80 = 200 (Jun 10 after cutoff, undated excluded).
    // wants share = 200 × (300/400) = 150.
    const v = getPreviousPeriodPaceSpend(withPrev(), 'wants', new Date('2026-06-20T12:00:00'));
    expect(v).toBeCloseTo(150, 5);
  });

  it('apportions to needs by the period ratio', () => {
    // needs share = 200 × (100/400) = 50.
    const v = getPreviousPeriodPaceSpend(withPrev(), 'needs', new Date('2026-06-20T12:00:00'));
    expect(v).toBeCloseTo(50, 5);
  });

  it('tracks the elapsed day — earlier in the period compares to a smaller slice', () => {
    // Day 1 (Jun 17). Cutoff = Jun 3 → only the Jun 3 item ($120) counts.
    // wants share = 120 × 0.75 = 90.
    const v = getPreviousPeriodPaceSpend(withPrev(), 'wants', new Date('2026-06-17T12:00:00'));
    expect(v).toBeCloseTo(90, 5);
  });

  it('falls back to the budgets ratio when there is no spent snapshot (legacy archive)', () => {
    const legacy = withPrev({
      spendingHistory: [
        {
          id: 'H1', date: '2026-06-02', total: 400,
          items: [
            { name: 'A', amount: 120, category: 'x', date: '2026-06-03' },
            { name: 'B', amount: 80,  category: 'x', date: '2026-06-05' },
          ],
          budgets: { needs: 100, wants: 300, savings: 50 }, // ratio 0.75 / 0.25 (savings ignored)
        },
      ],
    });
    expect(getPreviousPeriodPaceSpend(legacy, 'wants', new Date('2026-06-20T12:00:00'))).toBeCloseTo(150, 5);
  });

  it('returns 0 when the previous period had no spend', () => {
    const empty = withPrev({
      spendingHistory: [{ id: 'H1', date: '2026-06-02', total: 0, items: [], spent: { wants: 0, needs: 0 } }],
    });
    expect(getPreviousPeriodPaceSpend(empty, 'wants', new Date('2026-06-20T12:00:00'))).toBe(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   BUG-042 — getEnvelopeState
   ═══════════════════════════════════════════════════════════════════════════
   The reported bug was a Dashboard hero reading "$37.67 OVER" directly above a
   tile reading "$362.00 spent of $627.45". Both were correct — under two
   different definitions of "spent" that had drifted apart across six call
   sites. These pin the one definition down, using the real reported figures.
   ═══════════════════════════════════════════════════════════════════════════ */
describe('getEnvelopeState (BUG-042)', () => {
  const TODAY = new Date(2026, 8, 5);        // 2026-09-05, inside the period
  const PAY_START = '2026-08-26';            // period start from the report

  /** State seeded with the exact numbers from the reported screenshots. */
  function reportedState(overrides: Partial<BudgetState> = {}): BudgetState {
    return buildState({
      payStart: PAY_START,
      purchases: [
        { id: 'p1', name: 'Entertainment', amount: 216, category: 'Entertainment', budgetType: 'wants', date: '2026-09-01' },
        { id: 'p2', name: 'Food',          amount: 73,  category: 'Food & Drink',  budgetType: 'wants', date: '2026-09-02' },
        { id: 'p3', name: 'Groceries',     amount: 48,  category: 'Groceries',     budgetType: 'wants', date: '2026-09-03' },
        { id: 'p4', name: 'Other',         amount: 25,  category: 'Other',         budgetType: 'wants', date: '2026-09-04' },
      ],
      subscriptions: [
        { id: 's1', name: 'Streaming', amount: 66, frequency: 'monthly', date: '2026-09-01',
          category: 'Shopping', budgetType: 'wants', cardId: null },
      ],
      loans: [
        { id: 'l1', name: 'Car', remaining: 5000, original: 9000, paymentAmount: 237.12,
          frequency: 'monthly', date: '2026-09-01', budgetType: 'wants', cardId: null },
      ],
      ...overrides,
    } as Partial<BudgetState>);
  }

  it('reproduces the reported figures with one definition', () => {
    const env = getEnvelopeState(reportedState(), 627.45, 'wants', TODAY);
    expect(env.purchases).toBeCloseTo(362, 2);
    expect(env.deductions).toBeCloseTo(303.12, 2);
    expect(env.spent).toBeCloseTo(665.12, 2);     // the all-purchases table figure
    expect(env.remaining).toBeCloseTo(-37.67, 2); // the hero's OVER figure
  });

  it('keeps spent and remaining in agreement — the whole point', () => {
    const env = getEnvelopeState(reportedState(), 627.45, 'wants', TODAY);
    // The contradiction was remaining < 0 while spent < budget.
    expect(env.remaining).toBeCloseTo(env.budget - env.spent, 6);
    expect(env.remaining < 0).toBe(env.spent > env.budget);
  });

  it('reports over-budget percentages unclamped', () => {
    const env = getEnvelopeState(reportedState(), 627.45, 'wants', TODAY);
    expect(env.usedPct).toBeGreaterThan(100);
    expect(Math.round(env.usedPct)).toBe(106);
  });

  // The parallel bug the maintainer asked about: needs-flagged subs and loans
  // were invisible, so the needs envelope overstated available money.
  it('deducts needs-flagged subscriptions and loans from the needs envelope', () => {
    const state = reportedState({
      subscriptions: [
        { id: 's1', name: 'Insurance', amount: 80, frequency: 'monthly', date: '2026-09-01',
          category: 'Other', budgetType: 'needs', cardId: null },
      ],
      loans: [
        { id: 'l1', name: 'Mortgage', remaining: 1000, original: 2000, paymentAmount: 120,
          frequency: 'monthly', date: '2026-09-01', budgetType: 'needs', cardId: null },
      ],
    } as Partial<BudgetState>);

    const needs = getEnvelopeState(state, 1000, 'needs', TODAY);
    expect(needs.deductions).toBeCloseTo(200, 2);
    expect(needs.remaining).toBeCloseTo(800, 2);
  });

  it('keeps the two buckets independent', () => {
    // A wants subscription must not touch the needs envelope, and vice versa.
    const needs = getEnvelopeState(reportedState(), 1000, 'needs', TODAY);
    expect(needs.purchases).toBe(0);
    expect(needs.deductions).toBe(0);
    expect(needs.remaining).toBe(1000);
  });

  it('is a no-op for a user with no subscriptions or loans', () => {
    const state = reportedState({ subscriptions: [], loans: [] } as Partial<BudgetState>);
    const env = getEnvelopeState(state, 627.45, 'wants', TODAY);
    expect(env.deductions).toBe(0);
    expect(env.spent).toBeCloseTo(env.purchases, 6);
  });

  it('excludes purchases outside the current period window', () => {
    const state = reportedState({
      purchases: [
        { id: 'in',  name: 'in',  amount: 50, category: 'Other', budgetType: 'wants', date: '2026-09-01' },
        { id: 'out', name: 'out', amount: 99, category: 'Other', budgetType: 'wants', date: '2026-07-01' },
      ],
    } as Partial<BudgetState>);
    expect(getEnvelopeState(state, 500, 'wants', TODAY).purchases).toBe(50);
  });

  it('returns a zero percentage rather than dividing by a zero budget', () => {
    const env = getEnvelopeState(reportedState(), 0, 'wants', TODAY);
    expect(env.usedPct).toBe(0);
    expect(Number.isFinite(env.remaining)).toBe(true);
  });
});
