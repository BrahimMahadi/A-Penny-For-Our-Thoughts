/**
 * Module:   utils/calculations.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Summary:  All pure-ish financial calculations ported from legacy
 *           analytics.js. Functions that need application state take
 *           it as their FIRST argument — making them pure, testable,
 *           and free of module-global coupling.
 *
 *           The companion composable src/composables/useAnalytics.ts
 *           wraps these so components can call them without manually
 *           passing the store state.
 */

import { calculateMonthsBetween, monthlyAmount, toMonthKey } from './date';
import { ASSET_CATEGORIES } from '@/data/categories';
import { fmt } from './format';
import type {
  BudgetType,
  Frequency,
  Subscription,
  Loan,
  SavingsAccount,
  Goal,
  Asset,
  AssetCategoryMeta,
  Purchase,
  SpendingHistoryPeriod,
  Rule,
  RuleMatchType,
  BudgetAlert,
  ISODate,
  ISOMonth,
} from '@/types/budget';
import type { BudgetState, AnalyticsFilters } from '@/types/state';

// ─── Income & budget primitives ──────────────────────────────────

/** Sum all monthly income across all income streams (biweekly doubled). */
export function getTotalMonthlyIncome(state: Pick<BudgetState, 'incomeStreams'>): number {
  return state.incomeStreams.reduce((sum, s) => sum + (s.biweekly ? s.amount * 2 : s.amount), 0);
}

/** Allocation ratios as 0–1 decimals from the percentage allocation. */
export function getAlloc(state: Pick<BudgetState, 'allocation'>): {
  needs: number;
  wants: number;
  savings: number;
} {
  const a = state.allocation;
  return {
    needs:   (a.needs   || 0) / 100,
    wants:   (a.wants   || 0) / 100,
    savings: (a.savings || 0) / 100,
  };
}

/** Sum monthly expense-card item costs (biweekly doubled). */
export function grandTotal(state: Pick<BudgetState, 'expenseCards'>): number {
  return state.expenseCards.reduce((sum, card) => {
    return sum + card.items.reduce((s, i) => s + monthlyAmount(i), 0);
  }, 0);
}

// ─── Recurring date arithmetic (pure on the item shape) ──────────

/** Number of days in the given month (1-based month). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Item that has a `date` (ISO) anchor and a frequency cadence.
 * Both Subscription and Loan satisfy this shape.
 */
interface DatedRecurringItem {
  date?: ISODate | '';
  frequency?: Frequency | string;
}

/**
 * All dates that a sub/loan renews in [startDate, endDate] (inclusive).
 * Returns array of 'YYYY-MM-DD' strings.
 *
 * Pure: takes the item and both Date bounds; no global state.
 */
export function getRenewalDatesBetween(
  item: DatedRecurringItem,
  startDate: Date,
  endDate: Date,
): ISODate[] {
  const anchor = item.date;
  if (!anchor) return [];
  const baseDate = new Date(anchor.substring(0, 10) + 'T00:00:00');
  const frequency = item.frequency || 'monthly';
  const results: ISODate[] = [];

  const toKey = (d: Date): ISODate => d.toISOString().split('T')[0];

  if (frequency === 'monthly') {
    const renewalDay = baseDate.getDate();
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cur <= endDate) {
      const maxDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      const day = Math.min(renewalDay, maxDay);
      const candidate = new Date(cur.getFullYear(), cur.getMonth(), day);
      if (candidate >= startDate && candidate <= endDate) {
        results.push(toKey(candidate));
      }
      cur.setMonth(cur.getMonth() + 1);
    }
  } else if (frequency === 'yearly' || frequency === 'annual') {
    // Anniversary: same month+day each year. Accepts both 'yearly' (modern)
    // and 'annual' (legacy data) for backward compat.
    for (let y = startDate.getFullYear(); y <= endDate.getFullYear(); y++) {
      const candidate = new Date(y, baseDate.getMonth(), baseDate.getDate());
      if (candidate >= startDate && candidate <= endDate) {
        results.push(toKey(candidate));
      }
    }
  } else if (frequency === 'quarterly') {
    let candidate = new Date(baseDate);
    const monthsDiff =
      (startDate.getFullYear() - baseDate.getFullYear()) * 12 +
      (startDate.getMonth() - baseDate.getMonth());
    if (monthsDiff > 3) {
      const steps = Math.floor(monthsDiff / 3) - 1;
      candidate = new Date(baseDate.getFullYear(), baseDate.getMonth() + steps * 3, baseDate.getDate());
    }
    while (candidate <= endDate) {
      if (candidate >= startDate) results.push(toKey(candidate));
      const next = new Date(candidate.getFullYear(), candidate.getMonth() + 3, candidate.getDate());
      if (+next === +candidate) break;
      candidate = next;
    }
  } else if (frequency === 'bi-yearly') {
    let candidate = new Date(baseDate);
    const monthsDiff =
      (startDate.getFullYear() - baseDate.getFullYear()) * 12 +
      (startDate.getMonth() - baseDate.getMonth());
    if (monthsDiff > 6) {
      const steps = Math.floor(monthsDiff / 6) - 1;
      candidate = new Date(baseDate.getFullYear(), baseDate.getMonth() + steps * 6, baseDate.getDate());
    }
    while (candidate <= endDate) {
      if (candidate >= startDate) results.push(toKey(candidate));
      const next = new Date(candidate.getFullYear(), candidate.getMonth() + 6, candidate.getDate());
      if (+next === +candidate) break;
      candidate = next;
    }
  } else if (frequency === 'biweekly' || frequency === 'bi-weekly') {
    let candidate = new Date(baseDate);
    const daysDiff = Math.floor((startDate.getTime() - baseDate.getTime()) / 86400000);
    if (daysDiff > 14) {
      const steps = Math.floor(daysDiff / 14) - 1;
      candidate = new Date(baseDate.getTime() + steps * 14 * 86400000);
    }
    while (candidate <= endDate) {
      if (candidate >= startDate) results.push(toKey(candidate));
      const next = new Date(candidate.getTime() + 14 * 86400000);
      if (+next === +candidate) break;
      candidate = next;
    }
  } else if (frequency === 'weekly') {
    let candidate = new Date(baseDate);
    const daysDiff = Math.floor((startDate.getTime() - baseDate.getTime()) / 86400000);
    if (daysDiff > 7) {
      const steps = Math.floor(daysDiff / 7) - 1;
      candidate = new Date(baseDate.getTime() + steps * 7 * 86400000);
    }
    while (candidate <= endDate) {
      if (candidate >= startDate) results.push(toKey(candidate));
      const next = new Date(candidate.getTime() + 7 * 86400000);
      if (+next === +candidate) break;
      candidate = next;
    }
  }

  return results;
}

/**
 * Return the next renewal date for an item on or after today (2-year lookahead).
 * Returns null if none found.
 */
export function getNextRenewal(item: DatedRecurringItem, today: Date = new Date()): ISODate | null {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const lookAhead = new Date(start.getFullYear() + 2, start.getMonth(), start.getDate());
  const dates = getRenewalDatesBetween(item, start, lookAhead);
  return dates[0] || null;
}

// ─── Pay periods ─────────────────────────────────────────────────

/**
 * Current bi-weekly period start date, anchored on `state.payStart`.
 * Returns ISO date string, or null if payStart is not configured.
 */
export function getCurrentPeriodStart(
  state: Pick<BudgetState, 'payStart'>,
  today: Date = new Date(),
): ISODate | null {
  if (!state.payStart) return null;
  const payStart = new Date(state.payStart + 'T00:00:00');
  const cmp = new Date(today);
  cmp.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((cmp.getTime() - payStart.getTime()) / 86400000);
  if (daysDiff < 0) return state.payStart;
  const periodsElapsed = Math.floor(daysDiff / 14);
  const result = new Date(payStart);
  result.setDate(result.getDate() + periodsElapsed * 14);
  return result.toISOString().split('T')[0];
}

// ─── Deductions (subs + loans) ───────────────────────────────────

export interface SubscriptionWithRenewals extends Subscription {
  renewalDates: ISODate[];
}

export interface LoanWithRenewals extends Loan {
  renewalDates: ISODate[];
}

/** Wants subs that renewed in the current bi-weekly period. */
export function getSubsDeductedThisPeriod(
  state: Pick<BudgetState, 'subscriptions' | 'payStart'>,
  today: Date = new Date(),
): SubscriptionWithRenewals[] {
  const periodStart = getCurrentPeriodStart(state, today);
  if (!periodStart) return [];
  const start = new Date(periodStart + 'T00:00:00');
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  return state.subscriptions
    .filter((s) => (s.budgetType || 'wants') === 'wants')
    .map((s) => ({ ...s, renewalDates: getRenewalDatesBetween(s, start, end) }))
    .filter((s) => s.renewalDates.length > 0);
}

/** Needs subs that renewed so far this calendar month. */
export function getSubsDeductedThisMonth(
  state: Pick<BudgetState, 'subscriptions'>,
  today: Date = new Date(),
): SubscriptionWithRenewals[] {
  const cmp = new Date(today);
  cmp.setHours(0, 0, 0, 0);
  const firstOfMonth = new Date(cmp.getFullYear(), cmp.getMonth(), 1);
  return state.subscriptions
    .filter((s) => s.budgetType === 'needs')
    .map((s) => ({ ...s, renewalDates: getRenewalDatesBetween(s, firstOfMonth, cmp) }))
    .filter((s) => s.renewalDates.length > 0);
}

/** Needs loans whose payment fell this calendar month (payment > 0, has date). */
export function getLoansDeductedThisMonth(
  state: Pick<BudgetState, 'loans'>,
  today: Date = new Date(),
): LoanWithRenewals[] {
  const cmp = new Date(today);
  cmp.setHours(0, 0, 0, 0);
  const firstOfMonth = new Date(cmp.getFullYear(), cmp.getMonth(), 1);
  return state.loans
    .filter((l) => l.budgetType === 'needs' && l.paymentAmount > 0 && l.date)
    .map((l) => ({ ...l, renewalDates: getRenewalDatesBetween(l, firstOfMonth, cmp) }))
    .filter((l) => l.renewalDates.length > 0);
}

/** Wants loans whose payment fell in the current bi-weekly period. */
export function getLoansDeductedThisPeriod(
  state: Pick<BudgetState, 'loans' | 'payStart'>,
  today: Date = new Date(),
): LoanWithRenewals[] {
  const periodStart = getCurrentPeriodStart(state, today);
  if (!periodStart) return [];
  const start = new Date(periodStart + 'T00:00:00');
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  return state.loans
    .filter((l) => l.budgetType === 'wants' && l.paymentAmount > 0 && l.date)
    .map((l) => ({ ...l, renewalDates: getRenewalDatesBetween(l, start, end) }))
    .filter((l) => l.renewalDates.length > 0);
}

// ─── Budget vs. actual ───────────────────────────────────────────

/** Sum actual needs for the month — fixed expenses + needs subs/loans + needs purchases. */
export function calculateActualNeeds(
  state: BudgetState,
  year: number,
  month: number,
  today: Date = new Date(),
): number {
  const expenseTotal = state.expenseCards.reduce((sum, card) => {
    return sum + card.items.reduce((s, i) => s + monthlyAmount(i), 0);
  }, 0);
  if (year === today.getFullYear() && month === today.getMonth() + 1) {
    const needsSubTotal = getSubsDeductedThisMonth(state, today).reduce(
      (sum, sub) => sum + sub.amount * sub.renewalDates.length,
      0,
    );
    const needsLoanTotal = getLoansDeductedThisMonth(state, today).reduce(
      (sum, l) => sum + l.paymentAmount * l.renewalDates.length,
      0,
    );
    const needsPurchaseTotal = state.purchases
      .filter((p) => p.budgetType === 'needs')
      .reduce((sum, p) => sum + p.amount, 0);
    return expenseTotal + needsSubTotal + needsLoanTotal + needsPurchaseTotal;
  }
  return expenseTotal;
}

/** Sum actual wants — purchases + wants subs/loans this period + closed periods this month. */
export function calculateActualWants(
  state: BudgetState,
  year: number,
  month: number,
  today: Date = new Date(),
): number {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  let total = 0;
  const cmp = new Date(today);
  const currentMonth = `${cmp.getFullYear()}-${String(cmp.getMonth() + 1).padStart(2, '0')}`;

  if (monthStr === currentMonth) {
    total += state.purchases
      .filter((p) => (p.budgetType || 'wants') !== 'needs')
      .reduce((sum, p) => sum + p.amount, 0);
    total += getSubsDeductedThisPeriod(state, today).reduce(
      (sum, sub) => sum + sub.amount * sub.renewalDates.length,
      0,
    );
    total += getLoansDeductedThisPeriod(state, today).reduce(
      (sum, l) => sum + l.paymentAmount * l.renewalDates.length,
      0,
    );
  }

  state.spendingHistory.forEach((period) => {
    if (period.date && period.date.substring(0, 7) === monthStr) {
      total += period.total;
    }
  });

  return total;
}

/** Actual savings = Income − Needs − Wants (floored at 0). */
export function calculateActualSavings(
  state: BudgetState,
  year: number,
  month: number,
  today: Date = new Date(),
): number {
  const income = getTotalMonthlyIncome(state);
  const needs = calculateActualNeeds(state, year, month, today);
  const wants = calculateActualWants(state, year, month, today);
  return Math.max(0, income - needs - wants);
}

/** Bundle the three actuals into one result. */
export function getMonthActuals(
  state: BudgetState,
  year: number,
  month: number,
  today: Date = new Date(),
): { needs: number; wants: number; savings: number } {
  return {
    needs:   calculateActualNeeds(state, year, month, today),
    wants:   calculateActualWants(state, year, month, today),
    savings: calculateActualSavings(state, year, month, today),
  };
}

/**
 * Per-category actual wants spending for the current calendar month.
 * Aggregates purchases from the live list and from archived history periods.
 * Returns a map of { category → total }.
 */
export function getWantsCategoryActuals(
  state: BudgetState,
  today: Date = new Date(),
): Record<string, number> {
  const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const map: Record<string, number> = {};

  // Live period purchases (wants only)
  state.purchases
    .filter((p) => (p.budgetType || 'wants') !== 'needs')
    .forEach((p) => {
      const cat = p.category || 'Other';
      map[cat] = (map[cat] || 0) + p.amount;
    });

  // Archived history items for this calendar month
  state.spendingHistory
    .filter((period) => period.date && period.date.substring(0, 7) === monthStr)
    .forEach((period) => {
      period.items.forEach((item) => {
        const cat = item.category || 'Other';
        map[cat] = (map[cat] || 0) + item.amount;
      });
    });

  return map;
}

/** Budgeted amounts based on allocation percentages. */
export function getMonthBudgeted(
  state: Pick<BudgetState, 'incomeStreams' | 'allocation'>,
): { needs: number; wants: number; savings: number } {
  const income = getTotalMonthlyIncome(state);
  const alloc = getAlloc(state);
  return {
    needs:   income * alloc.needs,
    wants:   income * alloc.wants,
    savings: income * alloc.savings,
  };
}

export type VarianceStatus = 'on-track' | 'caution' | 'over';
export interface VarianceResult {
  dollar: number;
  percent: number;
  status: VarianceStatus;
}

/** Variance for a category: dollar gap, percent of budget consumed, status flag. */
export function calculateVariance(budgeted: number, actual: number): VarianceResult {
  const dollar = budgeted - actual;
  const percent = budgeted > 0 ? (actual / budgeted) * 100 : 0;
  let status: VarianceStatus = 'on-track';
  if (percent > 110) status = 'over';
  else if (percent > 100) status = 'caution';
  return { dollar, percent, status };
}

// ─── Savings accounts & goals ────────────────────────────────────

/** Effective allocation for a given month, respecting per-month overrides. */
export function getAllocationForMonth(account: SavingsAccount, year: number, month: number): number {
  const monthKey: ISOMonth = `${year}-${String(month).padStart(2, '0')}`;
  return account.monthlyAllocations && account.monthlyAllocations[monthKey] !== undefined
    ? account.monthlyAllocations[monthKey]
    : account.defaultAllocated || 0;
}

export type GoalStatus = 'on-track' | 'caution' | 'off-track' | 'complete' | 'missed';

export interface GoalProgress {
  accountId: string;
  accountName: string;
  currentAmount: number;
  targetAmount: number;
  targetDate: ISOMonth;
  progressPercent: number;
  monthsRemaining: number;
  monthlySavingsNeeded: number;
  /** How much is currently allocated to this account per month. */
  monthlyAllocation: number;
  /**
   * How many months it will take to hit the target at the current
   * allocation rate. Null when goal is already met or allocation is 0.
   */
  monthsAtCurrentRate: number | null;
  isOnTrack: boolean;
  status: GoalStatus;
}

/** Full progress info for a single goal. Returns null if account is missing. */
export function getGoalProgress(
  state: Pick<BudgetState, 'savingsAccounts'>,
  goal: Goal,
  today: Date = new Date(),
): GoalProgress | null {
  const account = state.savingsAccounts.find((a) => a.id === goal.accountId);
  if (!account) return null;

  const currentAmount = account.balance || 0;
  const targetAmount = goal.targetAmount || 0;
  const targetDate = goal.targetDate;

  const currentYearMonth = toMonthKey(today);
  const monthsRemaining = calculateMonthsBetween(currentYearMonth, targetDate);

  const shortfall = Math.max(0, targetAmount - currentAmount);
  const monthlySavingsNeeded = monthsRemaining > 0 ? shortfall / monthsRemaining : 0;
  const progressPercent = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const monthlyAllocation = getAllocationForMonth(account, today.getFullYear(), today.getMonth() + 1);

  let status: GoalStatus = 'on-track';
  if (monthsRemaining <= 0) {
    status = currentAmount >= targetAmount ? 'complete' : 'missed';
  } else if (currentAmount >= targetAmount) {
    status = 'on-track';
  } else if (monthlyAllocation >= monthlySavingsNeeded) {
    status = 'on-track';
  } else if (monthlyAllocation >= monthlySavingsNeeded * 0.8) {
    status = 'caution';
  } else {
    status = 'off-track';
  }

  // How long until goal is hit at the current allocation rate
  const monthsAtCurrentRate: number | null =
    currentAmount >= targetAmount
      ? 0                                                // already met
      : monthlyAllocation > 0
        ? Math.ceil(shortfall / monthlyAllocation)       // optimistic ceiling
        : null;                                          // no allocation → unknown

  return {
    accountId: goal.accountId,
    accountName: account.name,
    currentAmount,
    targetAmount,
    targetDate,
    progressPercent: Math.min(100, progressPercent),
    monthsRemaining: Math.max(0, monthsRemaining),
    monthlySavingsNeeded: Math.max(0, monthlySavingsNeeded),
    monthlyAllocation,
    monthsAtCurrentRate,
    isOnTrack: status === 'on-track',
    status,
  };
}

// ─── Net worth ───────────────────────────────────────────────────

export interface NetWorthByCategory extends AssetCategoryMeta {
  items: Asset[];
  total: number;
}

export interface NetWorthData {
  liquidAssets: number;
  manualAssets: number;
  totalAssets: number;
  totalLoans: number;
  totalCC: number;
  totalLiabilities: number;
  netWorth: number;
  momChange: number | null;
  byCategory: NetWorthByCategory[];
  history: BudgetState['netWorthHistory'];
}

/** Compute a full net worth snapshot from current state. */
export function getNetWorthData(
  state: Pick<BudgetState, 'savingsAccounts' | 'assets' | 'loans' | 'creditCards' | 'netWorthHistory'>,
  today: Date = new Date(),
): NetWorthData {
  const liquidAssets = state.savingsAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const manualAssets = state.assets.reduce((s, a) => s + (a.value || 0), 0);
  const totalAssets = liquidAssets + manualAssets;

  const totalLoans = state.loans.reduce((s, l) => s + (l.remaining || 0), 0);
  const totalCC = state.creditCards.reduce((s, c) => s + (c.balance || 0), 0);
  const totalLiabilities = totalLoans + totalCC;

  const netWorth = totalAssets - totalLiabilities;

  const history = state.netWorthHistory.slice().sort((a, b) => a.date.localeCompare(b.date));
  const currentKey = toMonthKey(today);
  const prevSnaps = history.filter((h) => h.date < currentKey);
  const prevSnap = prevSnaps.length ? prevSnaps[prevSnaps.length - 1] : null;
  const momChange = prevSnap !== null ? netWorth - prevSnap.netWorth : null;

  const byCategory: NetWorthByCategory[] = ASSET_CATEGORIES.map((cat) => {
    const items = state.assets.filter((a) => a.category === cat.key);
    return { ...cat, items, total: items.reduce((s, a) => s + (a.value || 0), 0) };
  });

  return {
    liquidAssets,
    manualAssets,
    totalAssets,
    totalLoans,
    totalCC,
    totalLiabilities,
    netWorth,
    momChange,
    byCategory,
    history,
  };
}

// ─── Recurring calendar / forecast ───────────────────────────────

export type ForecastSource = 'expense' | 'subscription';

export interface ForecastItem {
  id: string;
  name: string;
  amount: number;
  dueDay: number | null;
  source: ForecastSource;
  cardLabel: string;
  occurrences: number;
  totalForMonth: number;
  biweekly: boolean;
  budgetType?: BudgetType;
  category?: string;
  frequency?: string;
}

export interface MonthForecast {
  dated: ForecastItem[];
  undated: ForecastItem[];
  total: number;
  budgeted: number;
  variance: number;
}

/** Build full recurring forecast for a single month. */
export function getMonthForecast(
  state: BudgetState,
  year: number,
  month: number,
): MonthForecast {
  const items: ForecastItem[] = [];
  const maxDay = daysInMonth(year, month);

  // Expense card items
  state.expenseCards.forEach((card) => {
    card.items.forEach((item) => {
      const occurrences = item.biweekly ? 2 : 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dueDayRaw = (item as any).dueDay;
      const dueDay =
        dueDayRaw != null && Number(dueDayRaw) >= 1 ? Math.min(Number(dueDayRaw), maxDay) : null;

      items.push({
        id: item.id,
        name: item.name,
        amount: item.amount,
        dueDay,
        source: 'expense',
        cardLabel: card.label,
        occurrences,
        totalForMonth: item.amount * occurrences,
        biweekly: item.biweekly,
      });
    });
  });

  // Subscriptions
  state.subscriptions.forEach((sub) => {
    const frequency = sub.frequency || 'monthly';
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month - 1, maxDay);
    startOfMonth.setHours(0, 0, 0, 0);
    endOfMonth.setHours(0, 0, 0, 0);

    const renewalDates =
      frequency !== 'monthly' ? getRenewalDatesBetween(sub, startOfMonth, endOfMonth) : [];
    if (frequency !== 'monthly' && renewalDates.length === 0) return;

    let dueDay: number | null = null;
    if (renewalDates.length > 0) {
      dueDay = Math.min(parseInt(renewalDates[0].split('-')[2], 10), maxDay);
    } else if (sub.date) {
      const parts = sub.date.split('-');
      const parsedDay = parts.length >= 3 ? parseInt(parts[2], 10) : parseInt(sub.date, 10);
      if (!isNaN(parsedDay) && parsedDay >= 1) {
        dueDay = Math.min(parsedDay, maxDay);
      }
    }

    const occurrences = renewalDates.length || 1;
    items.push({
      id: sub.id,
      name: sub.name,
      amount: sub.amount,
      dueDay,
      source: 'subscription',
      cardLabel: 'Subscriptions',
      occurrences,
      totalForMonth: sub.amount * occurrences,
      biweekly: false,
      budgetType: sub.budgetType,
      category: sub.category,
      frequency: sub.frequency,
    });
  });

  const dated = items
    .filter((i) => i.dueDay !== null)
    .sort((a, b) => (a.dueDay as number) - (b.dueDay as number));
  const undated = items.filter((i) => i.dueDay === null);

  const total = items.reduce((s, i) => s + i.totalForMonth, 0);
  const budgeted = getTotalMonthlyIncome(state) * getAlloc(state).needs;
  const variance = budgeted - total;

  return { dated, undated, total, budgeted, variance };
}

/** Build a Map<dayNumber, items[]> for the calendar grid. */
export function getCalendarDayMap(
  state: BudgetState,
  year: number,
  month: number,
): Map<number, ForecastItem[]> {
  const { dated } = getMonthForecast(state, year, month);
  const map = new Map<number, ForecastItem[]>();
  dated.forEach((item) => {
    const day = item.dueDay as number;
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(item);
  });
  return map;
}

export interface SixMonthForecastRow {
  year: number;
  month: number;
  label: string;
  total: number;
  budgeted: number;
  variance: number;
  /** Total number of bills (dated + undated) in this month's forecast. */
  billCount: number;
}

/** Forecast totals for N months starting from (year, month). */
export function getSixMonthForecast(
  state: BudgetState,
  year: number,
  month: number,
  count = 6,
): SixMonthForecastRow[] {
  const results: SixMonthForecastRow[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(year, month - 1 + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const fc = getMonthForecast(state, y, m);
    results.push({
      year: y,
      month: m,
      label: d.toLocaleString('en-CA', { month: 'short', year: '2-digit' }),
      total: fc.total,
      budgeted: fc.budgeted,
      variance: fc.variance,
      billCount: fc.dated.length + fc.undated.length,
    });
  }
  return results;
}

// ─── Spending history & analytics ────────────────────────────────

/** Filter spending history by date range and search term. */
export function getFilteredSpendingHistory(
  state: Pick<BudgetState, 'spendingHistory'>,
  filters: AnalyticsFilters,
): SpendingHistoryPeriod[] {
  let history = state.spendingHistory;

  if (filters.startDate || filters.endDate) {
    history = history.filter((period) => {
      if (filters.startDate && period.date < filters.startDate) return false;
      if (filters.endDate && period.date > filters.endDate) return false;
      return true;
    });
  }

  if (filters.search.trim()) {
    const searchTerm = filters.search.trim().toLowerCase();
    history = history
      .map((period) => ({
        ...period,
        items: period.items.filter((p) => p.name.toLowerCase().includes(searchTerm)),
      }))
      .filter((period) => period.items.length > 0);
  }

  return history;
}

/** Top 10 categories by total spend across filtered history. */
export function getTopCategories(
  filteredHistory: SpendingHistoryPeriod[],
): Array<[string, number]> {
  const catMap: Record<string, number> = {};
  filteredHistory.forEach((period) => {
    period.items.forEach((p) => {
      const key = p.category || p.name;
      catMap[key] = (catMap[key] || 0) + p.amount;
    });
  });
  return Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
}

// ─── Category colour palette ─────────────────────────────────────
/**
 * Per-category chart colours used by the Wants Donut and Analytics Bar charts.
 * Matches the palette defined in legacy analytics.js CATEGORY_COLOURS.
 */
export const CATEGORY_COLOURS: Record<string, string> = {
  'Food & Drink':    '#ff8c42',
  'Groceries':       '#00d4aa',
  'Entertainment':   '#a78bfa',
  'Shopping':        '#60a5fa',
  'Health & Fitness':'#34d399',
  'Transportation':  '#fbbf24',
  'Other':           '#8b95ad',
};

/** Aggregate spending by category for a set of purchases. */
export function getCategorySpending(purchases: Purchase[]): Record<string, number> {
  const map: Record<string, number> = {};
  purchases.forEach((p) => {
    const cat = p.category || 'Other';
    map[cat] = (map[cat] || 0) + p.amount;
  });
  return map;
}

// ─── Month-over-month wants analysis ─────────────────────────────

export interface MonthlyWantsRow {
  year: number;
  month: number;
  monthKey: ISOMonth;
  label: string;
  total: number;
  categories: Record<string, number>;
  isCurrent: boolean;
}

/** Aggregate wants spending per month for the last N months. */
export function getMonthlyWantsHistory(
  state: Pick<BudgetState, 'purchases' | 'spendingHistory'>,
  count = 6,
  today: Date = new Date(),
): MonthlyWantsRow[] {
  const results: MonthlyWantsRow[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthKey: ISOMonth = `${year}-${String(month).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const isCurrent = i === 0;

    let total = 0;
    const categories: Record<string, number> = {};

    if (isCurrent) {
      state.purchases
        .filter((p) => (p.budgetType || 'wants') !== 'needs')
        .forEach((p) => {
          total += p.amount;
          const cat = p.category || 'Other';
          categories[cat] = (categories[cat] || 0) + p.amount;
        });
    }

    state.spendingHistory.forEach((period) => {
      if ((period.date || '').substring(0, 7) !== monthKey) return;
      total += period.total;
      period.items.forEach((item) => {
        const cat = item.category || 'Other';
        categories[cat] = (categories[cat] || 0) + item.amount;
      });
    });

    results.push({ year, month, monthKey, label, total, categories, isCurrent });
  }
  return results;
}

export type MomInsightType = 'good' | 'warn' | 'info';
export interface MomInsight {
  type: MomInsightType;
  text: string;
}

/** Generate text insights from monthly wants history. */
export function getMomInsights(monthlyData: MonthlyWantsRow[]): MomInsight[] {
  const insights: MomInsight[] = [];
  if (!monthlyData || monthlyData.length < 2) return insights;

  const current = monthlyData[monthlyData.length - 1];
  const previous = monthlyData[monthlyData.length - 2];

  if (previous.total > 0) {
    const delta = current.total - previous.total;
    const p = (delta / previous.total) * 100;
    if (p > 20)
      insights.push({ type: 'warn', text: `Spending up ${p.toFixed(0)}% vs. last month (+${fmt(delta)})` });
    else if (p < -10)
      insights.push({ type: 'good', text: `Spending down ${Math.abs(p).toFixed(0)}% vs. last month (${fmt(delta)})` });
    else
      insights.push({ type: 'info', text: `Spending roughly flat vs. last month (${delta >= 0 ? '+' : ''}${fmt(delta)})` });
  } else if (current.total > 0) {
    insights.push({ type: 'info', text: 'First month with recorded spending' });
  }

  const totals = monthlyData.map((m) => m.total);
  const maxTotal = Math.max(...totals);
  const positiveTotals = totals.filter((t) => t > 0);
  const minTotal = positiveTotals.length ? Math.min(...positiveTotals) : 0;
  if (maxTotal > 0 && current.total === maxTotal && monthlyData.length > 2)
    insights.push({ type: 'warn', text: `Highest spending month in ${monthlyData.length} months` });
  else if (minTotal > 0 && current.total === minTotal && current.total > 0 && monthlyData.length > 2)
    insights.push({ type: 'good', text: `Lowest spending month in ${monthlyData.length} months` });

  const catEntries = Object.entries(current.categories).sort((a, b) => b[1] - a[1]);
  if (catEntries.length > 0) {
    const [topCat, topAmt] = catEntries[0];
    const pctOfTotal = current.total > 0 ? (topAmt / current.total) * 100 : 0;
    insights.push({ type: 'info', text: `Top category: ${topCat} — ${fmt(topAmt)} (${pctOfTotal.toFixed(0)}% of spending)` });
  }

  return insights;
}

// ─── 6-month spending trend ──────────────────────────────────────

export interface SpendingTrendRow {
  year: number;
  month: number;
  monthKey: ISOMonth;
  /** Short label for chart x-axis: 'Jan 26'. */
  label: string;
  income: number;
  needs: number;
  wants: number;
  savings: number;
  isCurrent: boolean;
}

/**
 * Aggregates actual Needs / Wants / Savings for each of the last `count`
 * calendar months (oldest first). Needs and savings are derived from
 * the existing `calculateActual*` helpers so the numbers are consistent
 * with the Budget vs. Actual section.
 */
export function getSpendingTrend(
  state: BudgetState,
  count = 6,
  today: Date = new Date(),
): SpendingTrendRow[] {
  const income = getTotalMonthlyIncome(state);
  const rows: SpendingTrendRow[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthKey: ISOMonth = `${year}-${String(month).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const isCurrent = i === 0;

    const needs   = calculateActualNeeds(state, year, month, today);
    const wants   = calculateActualWants(state, year, month, today);
    const savings = calculateActualSavings(state, year, month, today);

    rows.push({ year, month, monthKey, label, income, needs, wants, savings, isCurrent });
  }

  return rows;
}

// ─── Goals timeline ──────────────────────────────────────────────

export interface GoalTimelineItem {
  id: string;
  accountName: string;
  targetAmount: number;
  targetDate: ISOMonth;
  currentAmount: number;
  progressPercent: number;
  /** Monthly allocation set for this account (may be 0 if unset). */
  monthlyAllocation: number;
  /**
   * Estimated months until goal is reached at the current monthly
   * allocation rate. Null when the goal is already complete.
   */
  monthsToComplete: number | null;
  /**
   * ISO month string (YYYY-MM) of the projected completion.
   * Null when goal is already complete.
   */
  projectedDate: ISOMonth | null;
  /**
   * Months late vs. the target date. Negative = will finish early,
   * positive = will finish late. 0 = exactly on time.
   * Null when goal is already complete.
   */
  monthsLate: number | null;
  status: GoalStatus;
}

/**
 * Returns all goals enriched with timeline projections, sorted by
 * urgency (soonest target date first; complete goals last).
 */
export function getGoalsTimeline(
  state: Pick<BudgetState, 'goals' | 'savingsAccounts'>,
  today: Date = new Date(),
): GoalTimelineItem[] {
  const currentYearMonth = toMonthKey(today);
  const items: GoalTimelineItem[] = [];

  for (const goal of state.goals) {
    const account = state.savingsAccounts.find((a) => a.id === goal.accountId);
    if (!account) continue;

    const currentAmount   = account.balance || 0;
    const targetAmount    = goal.targetAmount || 0;
    const monthlyAlloc    = getAllocationForMonth(account, today.getFullYear(), today.getMonth() + 1);
    const monthsToTarget  = calculateMonthsBetween(currentYearMonth, goal.targetDate);
    const progressPercent = targetAmount > 0
      ? Math.min(100, (currentAmount / targetAmount) * 100)
      : 0;

    // Base fields shared across all branches
    const base = {
      id: goal.id,
      accountName: account.name,
      targetAmount,
      targetDate: goal.targetDate,
      currentAmount,
      progressPercent,
      monthlyAllocation: monthlyAlloc,
    };

    // Already complete
    if (currentAmount >= targetAmount) {
      items.push({ ...base, monthsToComplete: null, projectedDate: null, monthsLate: null, status: 'complete' });
      continue;
    }

    // Missed (past target date, not yet complete)
    if (monthsToTarget <= 0) {
      items.push({ ...base, monthsToComplete: null, projectedDate: null, monthsLate: null, status: 'missed' });
      continue;
    }

    // Project completion date at current monthly allocation
    const shortfall = targetAmount - currentAmount;
    let monthsToComplete: number | null = null;
    let projectedDate: ISOMonth | null = null;
    let monthsLate: number | null = null;

    if (monthlyAlloc > 0) {
      monthsToComplete = Math.ceil(shortfall / monthlyAlloc);
      const projEnd = new Date(today.getFullYear(), today.getMonth() + monthsToComplete, 1);
      projectedDate = `${projEnd.getFullYear()}-${String(projEnd.getMonth() + 1).padStart(2, '0')}` as ISOMonth;
      monthsLate = monthsToComplete - monthsToTarget;
    }

    // Status
    let status: GoalStatus = 'off-track';
    if (monthlyAlloc > 0) {
      if (monthsLate !== null && monthsLate <= 0) {
        status = 'on-track';
      } else if (monthlyAlloc >= (shortfall / monthsToTarget) * 0.8) {
        status = 'caution';
      }
    }

    items.push({ ...base, monthsToComplete, projectedDate, monthsLate, status });
  }

  // Sort: active goals by target date (soonest first), complete, then missed
  return items.sort((a, b) => {
    const rank = (s: GoalStatus) => (s === 'complete' ? 2 : s === 'missed' ? 3 : 0);
    const ra = rank(a.status);
    const rb = rank(b.status);
    if (ra !== rb) return ra - rb;
    return a.targetDate.localeCompare(b.targetDate);
  });
}

// ─── MoM stat deltas ────────────────────────────────────────────

/**
 * Actual needs + wants + savings for the calendar month immediately
 * preceding `today`. Useful for month-over-month delta indicators
 * on the dashboard stat cards.
 */
export function getPrevMonthActuals(
  state: BudgetState,
  today: Date = new Date(),
): { needs: number; wants: number; savings: number } {
  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return getMonthActuals(state, prev.getFullYear(), prev.getMonth() + 1, today);
}

// ─── Envelope forecast ───────────────────────────────────────────

export type ForecastStatus = 'on-track' | 'caution' | 'over';

export interface EnvelopeForecast {
  /** Days elapsed since the period start (0 if no pay start set). */
  daysElapsed: number;
  /** Total days in the period (14 for bi-weekly). */
  daysTotal: number;
  /** Days remaining in the period. */
  daysRemaining: number;
  /** Average spend per elapsed day (0 when daysElapsed === 0). */
  dailyRate: number;
  /** Projected total spend by end of period at the current daily rate. */
  projectedTotal: number;
  /** projectedTotal minus the envelope budget (negative = under budget). */
  projectedOverage: number;
  /** Green / amber / red status based on projected vs. budget. */
  status: ForecastStatus;
  /**
   * True when there is enough data for a meaningful projection
   * (payStart set AND at least 1 day elapsed AND at least 1 purchase).
   */
  hasData: boolean;
}

/**
 * Linear envelope forecast: extrapolates the current spend rate to
 * the end of the active bi-weekly wants period.
 *
 * Mirrors the same `totalSpent + deductionTotal` logic used in
 * WantsTracker so the numbers are always consistent.
 */
export function getEnvelopeForecast(
  state: Pick<
    BudgetState,
    'purchases' | 'payStart' | 'incomeStreams' | 'allocation' | 'subscriptions' | 'loans'
  >,
  today: Date = new Date(),
): EnvelopeForecast {
  const PERIOD_DAYS = 14;

  const income = getTotalMonthlyIncome(state);
  const wantsRatio = (state.allocation.wants || 0) / 100;
  const budget = (income * wantsRatio) / 2;

  const periodStartStr = getCurrentPeriodStart(state, today);

  if (!periodStartStr || budget <= 0) {
    return {
      daysElapsed: 0,
      daysTotal: PERIOD_DAYS,
      daysRemaining: PERIOD_DAYS,
      dailyRate: 0,
      projectedTotal: 0,
      projectedOverage: -budget,
      status: 'on-track',
      hasData: false,
    };
  }

  const periodStart = new Date(periodStartStr + 'T00:00:00');
  const todayNorm = new Date(today);
  todayNorm.setHours(0, 0, 0, 0);

  const daysElapsed = Math.max(
    0,
    Math.floor((todayNorm.getTime() - periodStart.getTime()) / 86_400_000),
  );
  const daysRemaining = Math.max(0, PERIOD_DAYS - daysElapsed);

  // Purchases (wants only)
  const totalSpent = state.purchases
    .filter((p) => (p.budgetType || 'wants') === 'wants')
    .reduce((s, p) => s + p.amount, 0);

  // Subscriptions + loans deducted this period
  const subTotal = getSubsDeductedThisPeriod(state, today).reduce(
    (s, sub) => s + (+sub.amount || 0) * sub.renewalDates.length,
    0,
  );
  const loanTotal = getLoansDeductedThisPeriod(state, today).reduce(
    (s, loan) => s + (+loan.paymentAmount || 0) * loan.renewalDates.length,
    0,
  );
  const totalSoFar = totalSpent + subTotal + loanTotal;

  // Need ≥1 day elapsed AND some purchase activity for a useful projection
  const hasData = daysElapsed > 0 && totalSpent > 0;

  if (!hasData) {
    const rawStatus: ForecastStatus =
      totalSoFar >= budget ? 'over' : totalSoFar >= budget * 0.9 ? 'caution' : 'on-track';
    return {
      daysElapsed,
      daysTotal: PERIOD_DAYS,
      daysRemaining,
      dailyRate: 0,
      projectedTotal: totalSoFar,
      projectedOverage: totalSoFar - budget,
      status: rawStatus,
      hasData: false,
    };
  }

  const dailyRate = totalSoFar / daysElapsed;
  const projectedTotal = dailyRate * PERIOD_DAYS;
  const projectedOverage = projectedTotal - budget;

  const status: ForecastStatus =
    projectedTotal >= budget ? 'over' : projectedTotal >= budget * 0.9 ? 'caution' : 'on-track';

  return {
    daysElapsed,
    daysTotal: PERIOD_DAYS,
    daysRemaining,
    dailyRate,
    projectedTotal,
    projectedOverage,
    status,
    hasData: true,
  };
}

// ─── Rules engine & alerts ───────────────────────────────────────

/** Match a purchase name against rules; returns category or null. */
export function applyRulesToName(rules: Rule[], name: string): string | null {
  const lower = (name || '').toLowerCase().trim();
  for (const rule of rules) {
    const pattern = (rule.pattern || '').toLowerCase();
    if (!pattern) continue;
    let match = false;
    const matchType: RuleMatchType = rule.matchType || 'contains';
    if (matchType === 'exact') match = lower === pattern;
    else if (matchType === 'startsWith') match = lower.startsWith(pattern);
    else match = lower.includes(pattern);
    if (match) return rule.category;
  }
  return null;
}

export interface TriggeredAlert extends BudgetAlert {
  spent: number;
}

/** Alerts whose spent amount exceeds the threshold (current-period purchases). */
export function getTriggeredAlerts(
  state: Pick<BudgetState, 'purchases' | 'budgetAlerts'>,
): TriggeredAlert[] {
  const spending = getCategorySpending(state.purchases);
  return state.budgetAlerts
    .map((alert) => ({ ...alert, spent: spending[alert.category] || 0 }))
    .filter((a) => a.spent > a.threshold);
}
