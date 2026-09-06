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
import { ASSET_CATEGORIES, FALLBACK_CATEGORY_NAME } from '@/data/categories';
import { PERIOD_DAYS, VARIANCE_OVER_PCT, VARIANCE_CAUTION_PCT, ENVELOPE_CAUTION_RATIO } from '@/constants/budget';
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
  /** Only used when frequency === 'custom-days' */
  daysOfWeek?: number[];
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
  } else if (frequency === 'biyearly' || frequency === 'bi-yearly') {
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
    if (daysDiff > PERIOD_DAYS) {
      const steps = Math.floor(daysDiff / PERIOD_DAYS) - 1;
      candidate = new Date(baseDate.getTime() + steps * PERIOD_DAYS * 86400000);
    }
    while (candidate <= endDate) {
      if (candidate >= startDate) results.push(toKey(candidate));
      const next = new Date(candidate.getTime() + PERIOD_DAYS * 86400000);
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
  } else if (frequency === 'custom-days') {
    // Walk every calendar day in [max(startDate, anchor), endDate] and collect
    // those whose day-of-week is in the subscription's daysOfWeek set.
    const days = new Set(item.daysOfWeek ?? []);
    if (days.size > 0) {
      // Clamp start to the effective-from anchor date.
      const clampedStart = baseDate > startDate ? baseDate : startDate;
      const cur = new Date(clampedStart);
      cur.setHours(0, 0, 0, 0);
      while (cur <= endDate) {
        if (days.has(cur.getDay())) results.push(toKey(cur));
        cur.setDate(cur.getDate() + 1);
      }
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
  const periodsElapsed = Math.floor(daysDiff / PERIOD_DAYS);
  const result = new Date(payStart);
  result.setDate(result.getDate() + periodsElapsed * PERIOD_DAYS);
  return result.toISOString().split('T')[0];
}

/**
 * Enumerate every bi-weekly period START ISO date in the inclusive-exclusive
 * window `[fromInclusive, toExclusive)`, stepping by 14 days.
 *
 * Both inputs must be valid ISO 'YYYY-MM-DD' strings. Both boundaries are
 * expected to be valid period-start anchors (i.e. each is a multiple of 14
 * days from a common `payStart`), but the function does not enforce that —
 * it simply steps by 14 days from `fromInclusive` until it reaches or passes
 * `toExclusive`.
 *
 * Returns an empty array when `fromInclusive >= toExclusive`.
 *
 * Used by the RS-23 auto-rollover to derive the list of missed periods
 * between `lastArchivedPeriodStart` (inclusive) and `currentPeriodStart`
 * (exclusive — the current period is NOT archived; it's still in progress).
 */
export function getPeriodStartsBetween(
  fromInclusive: ISODate,
  toExclusive: ISODate,
): ISODate[] {
  const from = new Date(fromInclusive + 'T00:00:00');
  const to   = new Date(toExclusive   + 'T00:00:00');
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];
  if (from.getTime() >= to.getTime()) return [];

  const out: ISODate[] = [];
  const cursor = new Date(from);
  while (cursor.getTime() < to.getTime()) {
    out.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() + PERIOD_DAYS);
  }
  return out;
}

// ─── Deductions (subs + loans) ───────────────────────────────────

export interface SubscriptionWithRenewals extends Subscription {
  renewalDates: ISODate[];
}

export interface LoanWithRenewals extends Loan {
  renewalDates: ISODate[];
}

/**
 * Subs that renewed in the current bi-weekly period, for one envelope.
 *
 * BUG-042: `budgetType` was hardcoded to 'wants' here, so a subscription the
 * user had flagged as a **need** was invisible to every needs figure — the
 * needs envelope silently overstated available money by that amount. The
 * bucket is a parameter now; it defaults to 'wants' so existing call sites
 * keep their behaviour.
 */
export function getSubsDeductedThisPeriod(
  state: Pick<BudgetState, 'subscriptions' | 'payStart'>,
  today: Date = new Date(),
  budgetType: BudgetType = 'wants',
): SubscriptionWithRenewals[] {
  const periodStart = getCurrentPeriodStart(state, today);
  if (!periodStart) return [];
  const start = new Date(periodStart + 'T00:00:00');
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  return state.subscriptions
    .filter((s) => (s.budgetType || 'wants') === budgetType)
    .map((s) => ({ ...s, renewalDates: getRenewalDatesBetween(s, start, end) }))
    .filter((s) => s.renewalDates.length > 0);
}

/**
 * Loans whose payment fell in the current bi-weekly period, for one envelope.
 * See getSubsDeductedThisPeriod for why the bucket is a parameter (BUG-042).
 */
export function getLoansDeductedThisPeriod(
  state: Pick<BudgetState, 'loans' | 'payStart'>,
  today: Date = new Date(),
  budgetType: BudgetType = 'wants',
): LoanWithRenewals[] {
  const periodStart = getCurrentPeriodStart(state, today);
  if (!periodStart) return [];
  const start = new Date(periodStart + 'T00:00:00');
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  return state.loans
    .filter((l) => (l.budgetType || 'wants') === budgetType && l.paymentAmount > 0 && l.date)
    .map((l) => ({ ...l, renewalDates: getRenewalDatesBetween(l, start, end) }))
    .filter((l) => l.renewalDates.length > 0);
}

/**
 * Needs subs that renewed so far this calendar month.
 *
 * Kept deliberately: `calculateActualNeeds` uses this (with the loans twin
 * below) to build the MONTHLY needs actual, alongside expenseCards. That is a
 * different question from the bi-weekly needs envelope, which is what BUG-042
 * fixed — do not merge the two. A month of bills must not be subtracted from a
 * fortnight of budget.
 */
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

/** Needs loans whose payment fell this calendar month (payment > 0, has date).
 *  Monthly counterpart to the above — see that doc comment. */
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

/* ═══════════════════════════════════════════════════════════════════════════
   Envelope state — the single answer to "how much of this envelope is gone?"
   ═══════════════════════════════════════════════════════════════════════════ */

/** Everything a card needs to describe one bi-weekly envelope. */
export interface EnvelopeState {
  /** Bi-weekly budget for the bucket, including any windfall boost. */
  budget: number;
  /** Purchases logged in the current period for this bucket. */
  purchases: number;
  /** Subscription + loan amounts that fell in this period for this bucket. */
  deductions: number;
  /** What has consumed the envelope: purchases + deductions. */
  spent: number;
  /** budget − spent. Negative means over budget. */
  remaining: number;
  /** spent / budget as a percentage. NOT clamped — may exceed 100. */
  usedPct: number;
}

/**
 * Compute one envelope's state.
 *
 * BUG-042 exists because this was previously re-derived ad hoc in six places
 * with three different rules: some subtracted deductions, some did not, and
 * the "spent" captions disagreed with the "remaining" figures on the same
 * card — a hero reading "$37.67 OVER" above a tile reading "$362.00 spent of
 * $627.45". BUG-021 had already fixed one direction of that inconsistency in
 * May 2026 and reintroduced the other. Every surface now reads from here so
 * they cannot drift apart again.
 *
 * `spent` deliberately includes subscription and loan deductions: they consume
 * the envelope exactly as a purchase does, which is why `remaining` always
 * subtracted them even when the captions did not.
 *
 * Bucket-generic. Deductions apply to whichever bucket the subscription or
 * loan is flagged as — a need-flagged subscription was previously invisible to
 * every needs figure, so the needs envelope overstated available money.
 *
 * @param budget  Bi-weekly budget for the bucket (income share + windfall
 *                boost). Passed in rather than derived, because the caller
 *                already holds the income/allocation getters.
 */
export function getEnvelopeState(
  state: BudgetState,
  budget: number,
  bucket: BudgetType,
  today: Date = new Date(),
): EnvelopeState {
  // Same window both tabs already use, so this helper cannot disagree with the
  // purchase lists they render (the BUG-026 filter).
  const period = getPayPeriodForecast(state, 0, today);

  const purchases = state.purchases
    .filter((p) => (p.budgetType || 'wants') === bucket)
    // No pay-start configured yet: count everything, matching the pre-existing
    // "no period" fallback in DashboardPage and SpendingPage.
    .filter((p) => !period || (!!p.date && p.date >= period.periodStart && p.date <= period.periodEnd))
    .reduce((sum, p) => sum + p.amount, 0);

  const subsTotal = getSubsDeductedThisPeriod(state, today, bucket)
    .reduce((sum, sub) => sum + (+sub.amount || 0) * sub.renewalDates.length, 0);
  const loansTotal = getLoansDeductedThisPeriod(state, today, bucket)
    .reduce((sum, loan) => sum + (+loan.paymentAmount || 0) * loan.renewalDates.length, 0);

  const deductions = subsTotal + loansTotal;
  const spent = purchases + deductions;

  return {
    budget,
    purchases,
    deductions,
    spent,
    remaining: budget - spent,
    // Unclamped on purpose: 106% tells the user they are over, 100% hides it.
    usedPct: budget > 0 ? (spent / budget) * 100 : 0,
  };
}

export function getSubsInWindow(
  state: Pick<BudgetState, 'subscriptions'>,
  windowStart: Date,
  windowEnd: Date,
  budgetType: 'wants' | 'needs' = 'wants',
): SubscriptionWithRenewals[] {
  return state.subscriptions
    .filter((s) => (s.budgetType || 'wants') === budgetType)
    .map((s) => ({ ...s, renewalDates: getRenewalDatesBetween(s, windowStart, windowEnd) }))
    .filter((s) => s.renewalDates.length > 0);
}

/**
 * Loans of a given budget type whose payment dates fall within [windowStart, windowEnd].
 *
 * Generic, window-based variant of `getLoansDeductedThisPeriod`.
 * Used by PurchasesThisPeriod and SpendingPage.
 */
export function getLoansInWindow(
  state: Pick<BudgetState, 'loans'>,
  windowStart: Date,
  windowEnd: Date,
  budgetType: 'wants' | 'needs' = 'wants',
): LoanWithRenewals[] {
  return state.loans
    .filter((l) => (l.budgetType || 'wants') === budgetType && l.paymentAmount > 0 && l.date)
    .map((l) => ({ ...l, renewalDates: getRenewalDatesBetween(l, windowStart, windowEnd) }))
    .filter((l) => l.renewalDates.length > 0);
}

// ─── Budget vs. actual ───────────────────────────────────────────

/**
 * BUG-036 — the per-bucket spend of an archived period.
 *
 * An archived `SpendingHistoryPeriod.total` is the WHOLE-period spend
 * (wants + needs combined). Folding `period.total` into a single bucket — as
 * `calculateActualWants` used to — dumped a period's needs into the wants
 * actual (and left needs under-counted). This helper returns just the
 * requested bucket's share:
 *
 *   • RS-24+ archives carry an authoritative per-bucket `spent` snapshot —
 *     use it directly.
 *   • Legacy (pre-RS-24) archives have no `spent` split, and their `items`
 *     don't record `budgetType`, so the split can't be reconstructed. We
 *     apportion `period.total` by the period's own `budgets` snapshot when
 *     present, else by the current allocation ratio (the agreed fallback).
 */
function archivedPeriodSpend(
  period: SpendingHistoryPeriod,
  bucket: 'wants' | 'needs',
  state: Pick<BudgetState, 'allocation'>,
): number {
  if (period.spent && typeof period.spent[bucket] === 'number') {
    return period.spent[bucket];
  }
  const wantsWeight = period.budgets ? period.budgets.wants : state.allocation.wants;
  const needsWeight = period.budgets ? period.budgets.needs : state.allocation.needs;
  const denom = wantsWeight + needsWeight;
  // Degenerate split (no wants/needs weight) — attribute to wants so no money
  // is silently lost, matching the pre-fix behaviour for that edge case.
  if (denom <= 0) return bucket === 'wants' ? period.total : 0;
  const weight = bucket === 'wants' ? wantsWeight : needsWeight;
  return period.total * (weight / denom);
}

/** Sum actual needs for the month — fixed expenses + needs subs/loans + needs purchases + archived needs. */
export function calculateActualNeeds(
  state: BudgetState,
  year: number,
  month: number,
  today: Date = new Date(),
): number {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const expenseTotal = state.expenseCards.reduce((sum, card) => {
    return sum + card.items.reduce((s, i) => s + monthlyAmount(i), 0);
  }, 0);

  // BUG-036: fold in the NEEDS portion of any archived period in this month.
  // Previously archived needs were dropped entirely (only wants folded in
  // archived history), under-counting needs after a mid-month rollover.
  let historyNeeds = 0;
  state.spendingHistory.forEach((period) => {
    if (period.date && period.date.substring(0, 7) === monthStr) {
      historyNeeds += archivedPeriodSpend(period, 'needs', state);
    }
  });

  if (year === today.getFullYear() && month === today.getMonth() + 1) {
    const needsSubTotal = getSubsDeductedThisMonth(state, today).reduce(
      (sum, sub) => sum + sub.amount * sub.renewalDates.length,
      0,
    );
    const needsLoanTotal = getLoansDeductedThisMonth(state, today).reduce(
      (sum, l) => sum + l.paymentAmount * l.renewalDates.length,
      0,
    );
    // BUG-026: filter to the current calendar month so stale cross-period
    // rows from a previous month don't inflate this month's actual.
    const needsPurchaseTotal = state.purchases
      .filter((p) => p.budgetType === 'needs' && p.date?.startsWith(monthStr))
      .reduce((sum, p) => sum + p.amount, 0);
    return expenseTotal + needsSubTotal + needsLoanTotal + needsPurchaseTotal + historyNeeds;
  }
  return expenseTotal + historyNeeds;
}

/** Sum actual wants — purchases + wants subs/loans this period + archived wants this month. */
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
    // BUG-026: filter to the current calendar month so cross-month stale
    // purchases don't inflate this month's wants actual.
    total += state.purchases
      .filter((p) => (p.budgetType || 'wants') !== 'needs' && p.date?.startsWith(monthStr))
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

  // BUG-036: fold in only the WANTS portion of archived periods — not the
  // whole period.total (which also included that period's needs spend).
  state.spendingHistory.forEach((period) => {
    if (period.date && period.date.substring(0, 7) === monthStr) {
      total += archivedPeriodSpend(period, 'wants', state);
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
 * Pace-adjusted previous-period spend for one bucket (v2.45.2).
 *
 * Returns how much was spent in the IMMEDIATELY-PRECEDING archived pay period
 * *through the same elapsed day* the current period has reached — so the hero's
 * period-over-period delta compares like-for-like instead of pitting an
 * in-progress period against a completed one (which would look flattering early
 * and alarming late).
 *
 * Returns `null` when there is no prior archived period to compare against
 * (first period ever, or `payStart` unset) — the caller hides the delta.
 *
 * Bucket attribution caveat: archived purchase items carry no `budgetType`, so
 * we can't read last-period wants/needs directly from the dated items. We sum
 * the period's spend *through the cutoff day* (all buckets) from the dated
 * items, then apportion it to the requested bucket by that period's overall
 * wants/needs ratio (from its per-bucket `spent` snapshot, or the legacy split
 * via `archivedPeriodSpend`). Undated items can't be placed in time and are
 * excluded from the through-day total.
 */
export function getPreviousPeriodPaceSpend(
  state: BudgetState,
  bucket: 'wants' | 'needs',
  today: Date = new Date(),
): number | null {
  const currentStart = getCurrentPeriodStart(state, today);
  if (!currentStart) return null;

  // Most recent archived period strictly before the current one.
  const prev = state.spendingHistory
    .filter((p) => p.date && p.date < currentStart)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0];
  if (!prev || !prev.date) return null;

  // Elapsed days into the current period (0 on its first day).
  const startD = new Date(currentStart + 'T00:00:00');
  const cmp = new Date(today);
  cmp.setHours(0, 0, 0, 0);
  const elapsedDays = Math.max(0, Math.floor((cmp.getTime() - startD.getTime()) / 86_400_000));

  // Same elapsed offset inside the previous period → the cutoff date.
  const cutoff = new Date(prev.date + 'T00:00:00');
  cutoff.setDate(cutoff.getDate() + elapsedDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  // Spend through the cutoff (all buckets — items lack budgetType; undated excluded).
  const throughCutoff = prev.items.reduce(
    (sum, it) => sum + (it.date && it.date <= cutoffStr ? it.amount : 0),
    0,
  );

  // Apportion to the requested bucket by the period's overall wants/needs ratio.
  const wantsFull = archivedPeriodSpend(prev, 'wants', state);
  const needsFull = archivedPeriodSpend(prev, 'needs', state);
  const denom = wantsFull + needsFull;
  if (denom <= 0) return 0; // previous period had no spend → pace is 0
  const ratio = (bucket === 'wants' ? wantsFull : needsFull) / denom;
  return throughCutoff * ratio;
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

  // Live period purchases (wants only, current month only).
  // BUG-026: add month filter so stale cross-period purchases don't
  // show up in the category analytics for the current month.
  state.purchases
    .filter((p) => (p.budgetType || 'wants') !== 'needs' && p.date?.startsWith(monthStr))
    .forEach((p) => {
      const cat = p.category || FALLBACK_CATEGORY_NAME;
      map[cat] = (map[cat] || 0) + p.amount;
    });

  // Archived history items for this calendar month
  state.spendingHistory
    .filter((period) => period.date && period.date.substring(0, 7) === monthStr)
    .forEach((period) => {
      period.items.forEach((item) => {
        const cat = item.category || FALLBACK_CATEGORY_NAME;
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
  if (percent > VARIANCE_OVER_PCT) status = 'over';
  else if (percent > VARIANCE_CAUTION_PCT) status = 'caution';
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

export type ForecastSource = 'expense' | 'subscription' | 'loan';

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
  /**
   * Set only for `custom-days` subscription items. Contains the day-of-week
   * pattern (0=Sun…6=Sat) so the list view can render a day-pattern badge and
   * collapse multiple per-day items into a single summarised row.
   */
  daysOfWeek?: number[];
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

    // Resolve linked card label (same pattern as loans). Falls back to '' so
    // the day-panel hides the badge instead of showing a redundant "Subscriptions".
    const subLinkedCard = sub.cardId
      ? state.expenseCards.find((c) => c.id === sub.cardId)
      : null;
    const subCardLabel = subLinkedCard ? subLinkedCard.label : '';

    if (frequency === 'custom-days') {
      // One ForecastItem per occurrence day so each calendar cell gets its badge.
      // The list view collapses items sharing the same id into a single row.
      const renewalDates = getRenewalDatesBetween(sub, startOfMonth, endOfMonth);
      renewalDates.forEach((dateStr) => {
        const day = Math.min(parseInt(dateStr.split('-')[2], 10), maxDay);
        items.push({
          id:           sub.id,
          name:         sub.name,
          amount:       sub.amount,
          dueDay:       day,
          source:       'subscription',
          cardLabel:    subCardLabel,
          occurrences:  1,
          totalForMonth: sub.amount,
          biweekly:     false,
          budgetType:   sub.budgetType,
          category:     sub.category,
          frequency:    sub.frequency,
          daysOfWeek:   sub.daysOfWeek,
        });
      });
      return; // handled — do not fall through to the generic branch
    }

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
      cardLabel: subCardLabel,
      occurrences,
      totalForMonth: sub.amount * occurrences,
      biweekly: false,
      budgetType: sub.budgetType,
      category: sub.category,
      frequency: sub.frequency,
    });
  });

  // Loans
  state.loans.forEach((loan) => {
    if (loan.paymentAmount <= 0) return; // skip paid-off loans

    // Resolve the linked expense card label (shown as context badge in the UI).
    const linkedCard = loan.cardId
      ? state.expenseCards.find((c) => c.id === loan.cardId)
      : null;
    const cardLabel = linkedCard ? linkedCard.label : 'Loan';

    // Loan with no date → undated
    if (!loan.date) {
      items.push({
        id:           loan.id,
        name:         loan.name,
        amount:       loan.paymentAmount,
        dueDay:       null,
        source:       'loan',
        cardLabel,
        occurrences:  1,
        totalForMonth: loan.paymentAmount,
        biweekly:     false,
        budgetType:   loan.budgetType,
        frequency:    loan.frequency,
      });
      return;
    }

    const frequency = loan.frequency || 'monthly';
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth   = new Date(year, month - 1, maxDay);
    startOfMonth.setHours(0, 0, 0, 0);
    endOfMonth.setHours(0, 0, 0, 0);

    if (frequency !== 'monthly') {
      // Non-monthly: one item per renewal date in the month
      const renewalDates = getRenewalDatesBetween(loan, startOfMonth, endOfMonth);
      if (renewalDates.length === 0) return; // no payments this month
      renewalDates.forEach((dateStr) => {
        const day = Math.min(parseInt(dateStr.split('-')[2], 10), maxDay);
        items.push({
          id:           loan.id,
          name:         loan.name,
          amount:       loan.paymentAmount,
          dueDay:       day,
          source:       'loan',
          cardLabel,
          occurrences:  1,
          totalForMonth: loan.paymentAmount,
          biweekly:     false,
          budgetType:   loan.budgetType,
          frequency:    loan.frequency,
        });
      });
    } else {
      // Monthly loan — extract day from date string
      const parts = loan.date.split('-');
      const parsedDay = parts.length >= 3 ? parseInt(parts[2], 10) : parseInt(loan.date, 10);
      const dueDay = (!isNaN(parsedDay) && parsedDay >= 1) ? Math.min(parsedDay, maxDay) : null;
      items.push({
        id:           loan.id,
        name:         loan.name,
        amount:       loan.paymentAmount,
        dueDay,
        source:       'loan',
        cardLabel,
        occurrences:  1,
        totalForMonth: loan.paymentAmount,
        biweekly:     false,
        budgetType:   loan.budgetType,
        frequency:    loan.frequency,
      });
    }
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

// ─── Pay-period forecast ──────────────────────────────────────────

/** A ForecastItem with a known absolute date within the pay period. */
export interface PayPeriodForecastItem extends ForecastItem {
  /** ISO date string 'YYYY-MM-DD' for the day this item falls on in the period. */
  periodDate: ISODate;
}

export interface PayPeriodForecast {
  periodStart: ISODate;
  periodEnd: ISODate;
  /** Human-readable range, e.g. "May 19 – Jun 1" */
  label: string;
  /** Items with a known date within the 14-day window, sorted chronologically. */
  dated: PayPeriodForecastItem[];
  /** Expense-card items without a dueDay — cannot be placed on the grid. */
  undated: ForecastItem[];
  /** Sum of all dated items for this period. */
  total: number;
  /** Bi-weekly Needs budget (monthly Needs ÷ 2). */
  budgeted: number;
  /** budgeted − total (positive = under, negative = over). */
  variance: number;
}

/**
 * Build a 14-day pay-period forecast anchored on `state.payStart + offset * 14`.
 *
 * Returns null when `state.payStart` is not configured.
 *
 * - Expense card items with a `dueDay`: appear if that day falls within the
 *   14-day window (may be 0 or 1 times per period — never 2).
 * - Expense card items without a `dueDay`: placed in `undated`.
 * - Subscriptions: uses `getRenewalDatesBetween` to find exact renewal dates
 *   within the window; skipped entirely if none fall in the period.
 */
export function getPayPeriodForecast(
  state: BudgetState,
  offset = 0,
  today: Date = new Date(),
): PayPeriodForecast | null {
  const currentStart = getCurrentPeriodStart(state, today);
  if (!currentStart) return null;

  // Compute exact start / end dates for this pay period.
  const startDate = new Date(currentStart + 'T00:00:00');
  startDate.setDate(startDate.getDate() + offset * PERIOD_DAYS);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (PERIOD_DAYS - 1)); // inclusive end

  const periodStart = startDate.toISOString().split('T')[0] as ISODate;
  const periodEnd   = endDate.toISOString().split('T')[0] as ISODate;

  const dateFmtShort = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' });
  const label = `${dateFmtShort.format(startDate)} – ${dateFmtShort.format(endDate)}`;

  const dated: PayPeriodForecastItem[] = [];
  const undated: ForecastItem[] = [];

  // ── Expense card items ──────────────────────────────────────────
  state.expenseCards.forEach((card) => {
    card.items.forEach((item) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dueDayRaw = (item as any).dueDay;

      if (dueDayRaw != null && Number(dueDayRaw) >= 1) {
        const dueDay = Number(dueDayRaw);
        // Walk the period window and collect every day whose date matches dueDay.
        const matchingDates: ISODate[] = [];
        for (let i = 0; i < PERIOD_DAYS; i++) {
          const d = new Date(startDate.getTime() + i * 86400000);
          if (d.getDate() === dueDay) {
            matchingDates.push(d.toISOString().split('T')[0] as ISODate);
          }
        }
        if (matchingDates.length === 0) return; // not due in this period

        dated.push({
          id: item.id,
          name: item.name,
          amount: item.amount,
          dueDay,
          source: 'expense',
          cardLabel: card.label,
          occurrences: matchingDates.length,
          totalForMonth: item.amount * matchingDates.length,
          biweekly: item.biweekly,
          periodDate: matchingDates[0],
        });
      } else {
        // No fixed date — include in undated section.
        // Biweekly items occur once per period; monthly items are split over ~2 periods.
        const perPeriodAmount = item.biweekly ? item.amount : item.amount / 2;
        undated.push({
          id: item.id,
          name: item.name,
          amount: item.amount,
          dueDay: null,
          source: 'expense',
          cardLabel: card.label,
          occurrences: 1,
          totalForMonth: perPeriodAmount,
          biweekly: item.biweekly,
        });
      }
    });
  });

  // ── Subscriptions ───────────────────────────────────────────────
  state.subscriptions.forEach((sub) => {
    const renewalDates = getRenewalDatesBetween(sub, startDate, endDate);
    if (renewalDates.length === 0) return; // not renewing in this period

    // Resolve linked card label. Falls back to '' so the day-panel hides the
    // badge instead of showing a redundant "SUBSCRIPTIONS" next to "SUBSCRIPTION".
    const subLinkedCard = sub.cardId
      ? state.expenseCards.find((c) => c.id === sub.cardId)
      : null;
    const subCardLabel = subLinkedCard ? subLinkedCard.label : '';

    if ((sub.frequency || 'monthly') === 'custom-days') {
      // One item per occurrence day so every matching day gets its grid badge.
      renewalDates.forEach((dateStr) => {
        const dueDay = parseInt(dateStr.split('-')[2], 10);
        dated.push({
          id:           sub.id,
          name:         sub.name,
          amount:       sub.amount,
          dueDay,
          source:       'subscription',
          cardLabel:    subCardLabel,
          occurrences:  1,
          totalForMonth: sub.amount,
          biweekly:     false,
          budgetType:   sub.budgetType,
          category:     sub.category,
          frequency:    sub.frequency,
          daysOfWeek:   sub.daysOfWeek,
          periodDate:   dateStr as ISODate,
        });
      });
      return;
    }

    const dueDay = parseInt(renewalDates[0].split('-')[2], 10);
    dated.push({
      id: sub.id,
      name: sub.name,
      amount: sub.amount,
      dueDay,
      source: 'subscription',
      cardLabel: subCardLabel,
      occurrences: renewalDates.length,
      totalForMonth: sub.amount * renewalDates.length,
      biweekly: false,
      budgetType: sub.budgetType,
      category: sub.category,
      frequency: sub.frequency,
      periodDate: renewalDates[0] as ISODate,
    });
  });

  // ── Loans ────────────────────────────────────────────────────────
  state.loans.forEach((loan) => {
    if (!loan.date || loan.paymentAmount <= 0) return; // skip undated or paid-off

    const renewalDates = getRenewalDatesBetween(loan, startDate, endDate);
    if (renewalDates.length === 0) return; // no payment in this pay period

    const dueDay = parseInt(renewalDates[0].split('-')[2], 10);
    const linkedCard = loan.cardId
      ? state.expenseCards.find((c) => c.id === loan.cardId)
      : null;
    const cardLabel = linkedCard ? linkedCard.label : 'Loan';

    dated.push({
      id:           loan.id,
      name:         loan.name,
      amount:       loan.paymentAmount,
      dueDay,
      source:       'loan',
      cardLabel,
      occurrences:  renewalDates.length,
      totalForMonth: loan.paymentAmount * renewalDates.length,
      biweekly:     false,
      budgetType:   loan.budgetType,
      frequency:    loan.frequency,
      periodDate:   renewalDates[0] as ISODate,
    });
  });

  // Sort by actual date within the period.
  dated.sort((a, b) => a.periodDate.localeCompare(b.periodDate));

  const total = dated.reduce((s, i) => s + i.totalForMonth, 0);
  // Bi-weekly Needs budget = monthly Needs ÷ 2
  const budgeted = (getTotalMonthlyIncome(state) * getAlloc(state).needs) / 2;
  const variance = budgeted - total;

  return { periodStart, periodEnd, label, dated, undated, total, budgeted, variance };
}

/**
 * Build a Map<ISODate, PayPeriodForecastItem[]> for the 14-day grid.
 * Each key is an ISO date string; values are the items due on that date.
 * Returns an empty Map when payStart is not configured.
 */
export function getPayPeriodDayMap(
  state: BudgetState,
  offset = 0,
  today: Date = new Date(),
): Map<ISODate, PayPeriodForecastItem[]> {
  const fc = getPayPeriodForecast(state, offset, today);
  if (!fc) return new Map();
  const map = new Map<ISODate, PayPeriodForecastItem[]>();
  fc.dated.forEach((item) => {
    if (!map.has(item.periodDate)) map.set(item.periodDate, []);
    map.get(item.periodDate)!.push(item);
  });
  return map;
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
      // BUG-026: filter by monthKey so stale cross-month purchases don't
      // inflate the current month's total in the 6-month trend chart.
      state.purchases
        .filter((p) => (p.budgetType || 'wants') !== 'needs' && p.date?.startsWith(monthKey))
        .forEach((p) => {
          total += p.amount;
          const cat = p.category || FALLBACK_CATEGORY_NAME;
          categories[cat] = (categories[cat] || 0) + p.amount;
        });
    }

    state.spendingHistory.forEach((period) => {
      if ((period.date || '').substring(0, 7) !== monthKey) return;
      total += period.total;
      period.items.forEach((item) => {
        const cat = item.category || FALLBACK_CATEGORY_NAME;
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
 * Mirrors the same `totalSpent + deductionTotal` logic used in the
 * PurchasesThisPeriod dashboard widget (and the Dashboard hero KPI) so
 * the numbers are always consistent.
 */
export function getEnvelopeForecast(
  state: Pick<
    BudgetState,
    'purchases' | 'payStart' | 'incomeStreams' | 'allocation' | 'subscriptions' | 'loans' | 'oneTimeIncomes'
  >,
  today: Date = new Date(),
): EnvelopeForecast {
  // PERIOD_DAYS imported from @/constants/budget (TECH-DEBT-1)
  const income = getTotalMonthlyIncome(state);
  const wantsRatio = (state.allocation.wants || 0) / 100;

  const periodStartStr = getCurrentPeriodStart(state, today);

  // BUG-033: include the windfall (one-time income) wants boost, exactly like
  // the Dashboard hero KPI and the donut — the forecast is for the current
  // period, where any logged windfall always applies.
  const extraWants = (state.oneTimeIncomes ?? [])
    .filter(i => i.periodStart === periodStartStr)
    .reduce((sum, i) => sum + i.amount * (i.allocation.wants / 100), 0);

  const budget = (income * wantsRatio) / 2 + extraWants;

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

  // Purchases (wants only) — BUG-026: filter to current period so stale
  // cross-period rows don't inflate the forecast's "spent" total.
  const periodEndDate = new Date(periodStart.getTime() + PERIOD_DAYS * 86_400_000);
  const periodEndStr  = periodEndDate.toISOString().split('T')[0] as ISODate;
  const totalSpent = state.purchases
    .filter((p) =>
      (p.budgetType || 'wants') === 'wants' &&
      p.date != null &&
      p.date >= periodStartStr &&
      p.date <= periodEndStr,
    )
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
      totalSoFar >= budget ? 'over' : totalSoFar >= budget * ENVELOPE_CAUTION_RATIO ? 'caution' : 'on-track';
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
    projectedTotal >= budget ? 'over' : projectedTotal >= budget * ENVELOPE_CAUTION_RATIO ? 'caution' : 'on-track';

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

/** Alerts whose spent amount exceeds the threshold (current-period purchases).
 *
 * BUG-026: now filters purchases to the current bi-weekly period so
 * out-of-period / stale rows don't cause phantom alert firings.
 */
export function getTriggeredAlerts(
  state: Pick<BudgetState, 'purchases' | 'budgetAlerts' | 'payStart'>,
  today: Date = new Date(),
): TriggeredAlert[] {
  const periodStart = getCurrentPeriodStart(state, today);
  const periodPurchases = periodStart
    ? state.purchases.filter(p => p.date != null && p.date >= periodStart)
    : state.purchases;
  const spending = getCategorySpending(periodPurchases);
  return state.budgetAlerts
    .map((alert) => ({ ...alert, spent: spending[alert.category] || 0 }))
    .filter((a) => a.spent > a.threshold);
}

// ─── RS-28: Wishlist target-month helpers ────────────────────────
//
// These helpers compare a user-set target month against the savings rate
// to drive the card's "On track / Behind / Complete" status chip and the
// required-rate hint that appears when the user is behind.
//
// Conventions:
//   • targetMonth is 'YYYY-MM' (matches `Goal.targetDate` storage convention)
//   • All counts are integer months
//   • Status reasoning is intentionally identical to the existing
//     monthsToGoal() badge: it assumes the entire monthly savings envelope
//     could be applied to this one item, which is a simplification but
//     keeps the wishlist and goals tabs consistent.

/**
 * Whole-month count from `today` to the START of `targetMonth`.
 *
 *   • Returns null when `targetMonth` is falsy, malformed, or unparseable.
 *   • Returns 0 when today is in the same month as the target (the user
 *     wants this item "by the end of this month").
 *   • Returns a NEGATIVE number when the target month is in the past — the
 *     caller (e.g. `wishlistTargetStatus`) treats negative-or-zero with
 *     `complete` priority, so the value is informational.
 */
export function monthsUntilTarget(
  targetMonth: string | undefined | null,
  today: Date = new Date(),
): number | null {
  if (!targetMonth) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(targetMonth);
  if (!m) return null;
  const year = Number(m[1]);
  const mon  = Number(m[2]);
  if (mon < 1 || mon > 12) return null;
  return (year - today.getFullYear()) * 12 + (mon - 1 - today.getMonth());
}

/**
 * Monthly savings rate the user would need to put aside (starting from now)
 * to hit a `targetMonth` exactly with `remaining` dollars still to save.
 *
 *   • Returns null when targetMonth is null/invalid, when remaining ≤ 0
 *     (nothing left to save), or when monthsUntilTarget ≤ 0 (the target
 *     is now or in the past — required rate is undefined).
 *   • Rounds UP to the nearest cent so the displayed rate is sufficient.
 */
export function requiredMonthlyRate(
  remaining: number,
  targetMonth: string | undefined | null,
  today: Date = new Date(),
): number | null {
  if (remaining <= 0) return null;
  const months = monthsUntilTarget(targetMonth, today);
  if (months === null || months <= 0) return null;
  return Math.ceil((remaining / months) * 100) / 100;
}

/** Wishlist status — drives the on-card chip when `targetMonth` is set. */
export type WishlistStatus = 'complete' | 'on-track' | 'behind' | 'no-target';

/**
 * Status verdict for a single wishlist item:
 *
 *   complete   → saved >= price (regardless of target)
 *   no-target  → targetMonth is null/invalid (caller renders default badge)
 *   behind     → at current savings rate, the user will reach `price`
 *                AFTER the target month
 *   on-track   → at current savings rate, the user will reach `price`
 *                on or before the target month (includes "no progress
 *                possible" cases like rate = 0 with a past target —
 *                callers should not surface those edge cases as success;
 *                see explicit guard below)
 *
 * Edge cases:
 *   • `price` ≤ 0 or undefined → 'no-target' (we can't compute progress
 *     without a price; let the caller fall through to the default)
 *   • `monthlySavingsRate` ≤ 0 → if not complete, returns 'behind'
 *     (no rate means you're not progressing; if you need any money, you're
 *     behind by definition)
 *   • Target in the past with money still owed → 'behind'
 *   • Target equals current month and remaining > 0 → 'behind'
 */
export function wishlistTargetStatus(
  price: number | undefined,
  saved: number | undefined,
  targetMonth: string | undefined | null,
  monthlySavingsRate: number,
  today: Date = new Date(),
): WishlistStatus {
  const p = price ?? 0;
  const s = saved ?? 0;
  if (p > 0 && s >= p) return 'complete';
  if (!p || p <= 0) return 'no-target';
  const remaining = p - s;
  const months = monthsUntilTarget(targetMonth, today);
  if (months === null) return 'no-target';
  // Past / current-month target with money still owed → behind.
  if (months <= 0) return 'behind';
  if (monthlySavingsRate <= 0) return 'behind';
  const monthsAtRate = remaining / monthlySavingsRate;
  return monthsAtRate <= months ? 'on-track' : 'behind';
}

/** Human-readable month label, e.g. "Mar 2027". Falsy/invalid input → null. */
export function formatTargetMonthLabel(targetMonth: string | undefined | null): string | null {
  if (!targetMonth) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(targetMonth);
  if (!m) return null;
  const year = Number(m[1]);
  const monIdx = Number(m[2]) - 1;
  if (monIdx < 0 || monIdx > 11) return null;
  // Use a synthetic date on the 1st of the month to format locale-aware.
  const d = new Date(year, monIdx, 1);
  return d.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
}
