/* ═══════════════════════════════════════════════════════════════
   Module:   analytics.js
   Project:  A Penny For Our Thoughts
   Created:  May 2026
   Summary:  All financial calculations — income totals, budget
             allocations, budget vs. actual variance, savings goal
             progress, net worth computation, and spending history
             filtering. No DOM manipulation.
   Functions: getTotalMonthlyIncome, grandTotal, getAlloc,
              getMonthActuals, calculateActualNeeds,
              calculateActualWants, calculateActualSavings,
              getMonthBudgeted, calculateVariance,
              getAllocationForMonth, calculateMonthsBetween,
              getGoalProgress, ASSET_CATEGORIES, getNetWorthData,
              recordNetWorthSnapshot, getFilteredSpendingHistory,
              getTopCategories
   Depends on: utils.js, state.js
═══════════════════════════════════════════════════════════════ */

import { state, saveToStorage } from './state.js';
import { genId, fmt, monthlyAmount, daysUntil, deepClone, cssVar } from './utils.js';
import { uiState } from './uistate.js';

// ────────────────────────────────────────────────────────────────
// TRANSACTION RULES ENGINE — CONSTANTS
// ────────────────────────────────────────────────────────────────

/** Fixed category list used by the TRE and UI dropdowns */
export const WANT_CATEGORIES = [
  'Food & Drink',
  'Groceries',
  'Entertainment',
  'Shopping',
  'Health & Fitness',
  'Transportation',
  'Other',
];

/** Per-category display colour (hex) */
export const CATEGORY_COLOURS = {
  'Food & Drink':    '#ff8c42',
  'Groceries':       '#00d4aa',
  'Entertainment':   '#a78bfa',
  'Shopping':        '#60a5fa',
  'Health & Fitness':'#34d399',
  'Transportation':  '#fbbf24',
  'Other':           '#8b95ad',
};

// ────────────────────────────────────────────────────────────────
// INCOME & BUDGET
// ────────────────────────────────────────────────────────────────

/** Sum all monthly income across all income streams */
export function getTotalMonthlyIncome() {
  return (state.incomeStreams || []).reduce((sum, s) => {
    return sum + (s.biweekly ? s.amount * 2 : +s.amount);
  }, 0);
}

/** Sum monthly amounts across all dynamic expense cards */
export function grandTotal() {
  return (state.expenseCards || []).reduce((sum, card) => {
    return sum + (card.items || []).reduce((s, i) => s + monthlyAmount(i), 0);
  }, 0);
}

/** Return allocation ratios as decimals */
export function getAlloc() {
  const a = state.allocation || { needs: 50, wants: 30, savings: 20 };
  return {
    needs:   (a.needs   || 0) / 100,
    wants:   (a.wants   || 0) / 100,
    savings: (a.savings || 0) / 100,
  };
}

// ────────────────────────────────────────────────────────────────
// BUDGET VS. ACTUAL
// ────────────────────────────────────────────────────────────────

/** Calculate actual spending for a given month */
export function getMonthActuals(year, month) {
  return {
    needs:   calculateActualNeeds(year, month),
    wants:   calculateActualWants(year, month),
    savings: calculateActualSavings(year, month),
  };
}

/** Sum all actual needs (fixed expenses + Needs subs renewed this month) for a month */
function calculateActualNeeds(year, month) {
  const expenseTotal = (state.expenseCards || []).reduce((sum, card) => {
    return sum + (card.items || []).reduce((s, i) => s + monthlyAmount(i), 0);
  }, 0);
  // Only augment with Needs sub/loan deductions for the current calendar month
  const today = new Date();
  if (year === today.getFullYear() && month === today.getMonth() + 1) {
    const needsSubTotal = getSubsDeductedThisMonth()
      .reduce((sum, sub) => sum + (+sub.amount || 0) * sub.renewalDates.length, 0);
    const needsLoanTotal = getLoansDeductedThisMonth()
      .reduce((sum, l) => sum + (+l.paymentAmount || 0) * l.renewalDates.length, 0);
    // Purchases explicitly tagged as Needs count against the Needs budget
    const needsPurchaseTotal = (state.purchases || [])
      .filter(p => p.budgetType === 'needs')
      .reduce((sum, p) => sum + (+p.amount || 0), 0);
    return expenseTotal + needsSubTotal + needsLoanTotal + needsPurchaseTotal;
  }
  return expenseTotal;
}

/** Sum all actual wants (purchases + Wants subs this period + spending history) for a month */
function calculateActualWants(year, month) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  let total = 0;

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  if (monthStr === currentMonth) {
    // Only Wants-tagged purchases count toward the Wants actual (Needs-tagged go to calculateActualNeeds)
    total += (state.purchases || [])
      .filter(p => (p.budgetType || 'wants') !== 'needs')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    // Add Wants subs deducted during the current bi-weekly period
    total += getSubsDeductedThisPeriod()
      .reduce((sum, sub) => sum + (+sub.amount || 0) * sub.renewalDates.length, 0);
    // Add Wants loan payments due during the current bi-weekly period
    total += getLoansDeductedThisPeriod()
      .reduce((sum, l) => sum + (+l.paymentAmount || 0) * l.renewalDates.length, 0);
  }

  (state.spendingHistory || []).forEach(period => {
    if (period.date && period.date.substring(0, 7) === monthStr) {
      total += period.total || 0;
    }
  });

  return total;
}

/** Calculate actual savings as Income - Needs - Wants */
function calculateActualSavings(year, month) {
  const income = getTotalMonthlyIncome();
  const needs  = calculateActualNeeds(year, month);
  const wants  = calculateActualWants(year, month);
  return Math.max(0, income - needs - wants);
}

/** Get budgeted amounts for a month based on allocation percentages */
export function getMonthBudgeted(year, month) {
  const income = getTotalMonthlyIncome();
  const alloc  = getAlloc();
  return {
    needs:   income * alloc.needs,
    wants:   income * alloc.wants,
    savings: income * alloc.savings,
  };
}

/** Calculate variance data for a category */
export function calculateVariance(budgeted, actual, category) {
  const dollar  = budgeted - actual;
  const percent = budgeted > 0 ? (actual / budgeted) * 100 : 0;
  let status = 'on-track';
  if (percent > 110) status = 'over';
  else if (percent > 100) status = 'caution';
  return { dollar, percent, status };
}

// ────────────────────────────────────────────────────────────────
// SAVINGS ACCOUNTS
// ────────────────────────────────────────────────────────────────

/** Get the effective allocation for a given month, respecting overrides */
export function getAllocationForMonth(account, year, month) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  return account.monthlyAllocations && account.monthlyAllocations[monthKey] !== undefined
    ? account.monthlyAllocations[monthKey]
    : account.defaultAllocated || 0;
}

// ────────────────────────────────────────────────────────────────
// SUBSCRIPTION TRACKING
// ────────────────────────────────────────────────────────────────

/**
 * Get all dates a subscription renews between startDate and endDate (inclusive).
 * Both params are Date objects with time set to local midnight.
 * Returns array of YYYY-MM-DD strings.
 */
export function getRenewalDatesBetween(sub, startDate, endDate) {
  const baseDate  = new Date(sub.date.substring(0, 10) + 'T00:00:00');
  const frequency = sub.frequency || 'monthly';
  const results   = [];

  if (frequency === 'monthly') {
    // Renewal day is the day-of-month from the stored date (e.g. 13th of each month)
    const renewalDay = baseDate.getDate();
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cur <= endDate) {
      const maxDay    = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      const day       = Math.min(renewalDay, maxDay);
      const candidate = new Date(cur.getFullYear(), cur.getMonth(), day);
      if (candidate >= startDate && candidate <= endDate) {
        results.push(candidate.toISOString().split('T')[0]);
      }
      cur.setMonth(cur.getMonth() + 1);
    }

  } else if (frequency === 'annual') {
    // Annual anniversary: same month+day each year
    for (let y = startDate.getFullYear(); y <= endDate.getFullYear(); y++) {
      const candidate = new Date(y, baseDate.getMonth(), baseDate.getDate());
      if (candidate >= startDate && candidate <= endDate) {
        results.push(candidate.toISOString().split('T')[0]);
      }
    }

  } else if (frequency === 'quarterly') {
    // Every 3 months from baseDate
    let candidate = new Date(baseDate);
    // Fast-forward to vicinity of startDate to avoid needless iterations
    const monthsDiff = (startDate.getFullYear() - baseDate.getFullYear()) * 12
                     + (startDate.getMonth() - baseDate.getMonth());
    if (monthsDiff > 3) {
      const steps = Math.floor(monthsDiff / 3) - 1;
      candidate   = new Date(baseDate.getFullYear(), baseDate.getMonth() + steps * 3, baseDate.getDate());
    }
    while (candidate <= endDate) {
      if (candidate >= startDate) {
        results.push(candidate.toISOString().split('T')[0]);
      }
      const next = new Date(candidate.getFullYear(), candidate.getMonth() + 3, candidate.getDate());
      if (+next === +candidate) break; // safety break against infinite loop
      candidate = next;
    }

  } else if (frequency === 'bi-yearly') {
    // Every 6 months from baseDate
    let candidate = new Date(baseDate);
    // Fast-forward to vicinity of startDate to avoid needless iterations
    const monthsDiff = (startDate.getFullYear() - baseDate.getFullYear()) * 12
                     + (startDate.getMonth() - baseDate.getMonth());
    if (monthsDiff > 6) {
      const steps = Math.floor(monthsDiff / 6) - 1;
      candidate   = new Date(baseDate.getFullYear(), baseDate.getMonth() + steps * 6, baseDate.getDate());
    }
    while (candidate <= endDate) {
      if (candidate >= startDate) {
        results.push(candidate.toISOString().split('T')[0]);
      }
      const next = new Date(candidate.getFullYear(), candidate.getMonth() + 6, candidate.getDate());
      if (+next === +candidate) break; // safety break against infinite loop
      candidate = next;
    }

  } else if (frequency === 'bi-weekly') {
    // Every 14 days from baseDate
    let candidate = new Date(baseDate);
    // Fast-forward past the bulk of dates before startDate to avoid needless iterations
    const daysDiff = Math.floor((startDate - baseDate) / 86400000);
    if (daysDiff > 14) {
      const steps = Math.floor(daysDiff / 14) - 1;
      candidate   = new Date(baseDate.getTime() + steps * 14 * 86400000);
    }
    while (candidate <= endDate) {
      if (candidate >= startDate) {
        results.push(candidate.toISOString().split('T')[0]);
      }
      const next = new Date(candidate.getTime() + 14 * 86400000);
      if (+next === +candidate) break; // safety break against infinite loop
      candidate = next;
    }
  }

  return results;
}

/**
 * Return the next renewal date (YYYY-MM-DD) for a subscription on or after today.
 * Looks up to 2 years ahead. Returns null if none found (e.g. base date is far future).
 *
 * @param {object} sub - Subscription object with `date` and `frequency` fields.
 * @returns {string|null}
 */
export function getNextRenewal(sub) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lookAhead = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate());
  const dates = getRenewalDatesBetween(sub, today, lookAhead);
  return dates[0] || null;
}

/**
 * Calculate the current bi-weekly period start from state.payStart.
 * Returns YYYY-MM-DD string, or null if payStart is not configured.
 */
export function getCurrentPeriodStart() {
  if (!state.payStart) return null;
  const payStart = new Date(state.payStart + 'T00:00:00');
  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((today - payStart) / 86400000);
  if (daysDiff < 0) return state.payStart; // payStart is in the future
  const periodsElapsed = Math.floor(daysDiff / 14);
  const result = new Date(payStart);
  result.setDate(result.getDate() + periodsElapsed * 14);
  return result.toISOString().split('T')[0];
}

/**
 * Get all Wants subscriptions that renewed during the current bi-weekly period.
 * Each returned item is augmented with a `renewalDates` string array.
 * Returns [] if payStart is not configured.
 */
export function getSubsDeductedThisPeriod() {
  const periodStart = getCurrentPeriodStart();
  if (!periodStart) return [];

  const start = new Date(periodStart + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (state.subscriptions || [])
    .filter(sub => (sub.budgetType || 'wants') === 'wants')
    .map(sub => ({ ...sub, renewalDates: getRenewalDatesBetween(sub, start, today) }))
    .filter(sub => sub.renewalDates.length > 0);
}

/**
 * Get all Needs subscriptions that renewed so far this calendar month.
 * Each returned item is augmented with a `renewalDates` string array.
 */
export function getSubsDeductedThisMonth() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return (state.subscriptions || [])
    .filter(sub => sub.budgetType === 'needs')
    .map(sub => ({ ...sub, renewalDates: getRenewalDatesBetween(sub, firstOfMonth, today) }))
    .filter(sub => sub.renewalDates.length > 0);
}

/**
 * Return loans whose payment falls in the current calendar month AND whose
 * budgetType is 'needs'. Each returned item is augmented with `renewalDates`.
 * Only loans with a paymentAmount > 0 and a valid anchor date are included.
 */
function getLoansDeductedThisMonth() {
  const today        = new Date();
  today.setHours(0, 0, 0, 0);
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return (state.loans || [])
    .filter(l => l.budgetType === 'needs' && l.paymentAmount > 0 && l.date)
    .map(l => ({ ...l, renewalDates: getRenewalDatesBetween(l, firstOfMonth, today) }))
    .filter(l => l.renewalDates.length > 0);
}

/**
 * Return loans whose payment falls in the current bi-weekly period AND whose
 * budgetType is 'wants'. Each returned item is augmented with `renewalDates`.
 * Returns [] if payStart is not configured.
 */
function getLoansDeductedThisPeriod() {
  const periodStart = getCurrentPeriodStart();
  if (!periodStart) return [];

  const start = new Date(periodStart + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (state.loans || [])
    .filter(l => l.budgetType === 'wants' && l.paymentAmount > 0 && l.date)
    .map(l => ({ ...l, renewalDates: getRenewalDatesBetween(l, start, today) }))
    .filter(l => l.renewalDates.length > 0);
}

// ────────────────────────────────────────────────────────────────
// SAVINGS GOALS
// ────────────────────────────────────────────────────────────────

/** Calculate months between two YYYY-MM date strings */
function calculateMonthsBetween(startDate, endDate) {
  const [startYear, startMonth] = startDate.split('-').map(Number);
  const [endYear,   endMonth]   = endDate.split('-').map(Number);
  return (endYear - startYear) * 12 + (endMonth - startMonth);
}

/** Get full progress data for a single goal */
export function getGoalProgress(goal) {
  const account = (state.savingsAccounts || []).find(a => a.id === goal.accountId);
  if (!account) return null;

  const currentAmount = account.balance || 0;
  const targetAmount  = goal.targetAmount || 0;
  const targetDate    = goal.targetDate;

  const today            = new Date();
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const monthsRemaining  = calculateMonthsBetween(currentYearMonth, targetDate);

  const shortfall           = Math.max(0, targetAmount - currentAmount);
  const monthlySavingsNeeded = monthsRemaining > 0 ? shortfall / monthsRemaining : 0;
  const progressPercent      = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const monthlyAllocation    = getAllocationForMonth(account, today.getFullYear(), today.getMonth() + 1);

  let status = 'on-track';
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

  return {
    accountId: goal.accountId,
    accountName: account.name,
    currentAmount,
    targetAmount,
    targetDate,
    progressPercent:      Math.min(100, progressPercent),
    monthsRemaining:      Math.max(0, monthsRemaining),
    monthlySavingsNeeded: Math.max(0, monthlySavingsNeeded),
    isOnTrack: status === 'on-track',
    status,
  };
}

// ────────────────────────────────────────────────────────────────
// NET WORTH
// ────────────────────────────────────────────────────────────────

export const ASSET_CATEGORIES = [
  { key: 'investment', label: 'Investments', icon: '💰' },
  { key: 'real_estate', label: 'Real Estate', icon: '🏠' },
  { key: 'vehicle',    label: 'Vehicles',    icon: '🚗' },
  { key: 'other',      label: 'Other',       icon: '📦' },
];

/** Compute a full net worth snapshot from current state */
export function getNetWorthData() {
  const liquidAssets   = (state.savingsAccounts || []).reduce((s, a) => s + (a.balance || 0), 0);
  const manualAssets   = (state.assets          || []).reduce((s, a) => s + (a.value   || 0), 0);
  const totalAssets    = liquidAssets + manualAssets;

  const totalLoans       = (state.loans      || []).reduce((s, l) => s + (l.remaining || 0), 0);
  const totalCC          = (state.creditCards || []).reduce((s, c) => s + (c.balance   || 0), 0);
  const totalLiabilities = totalLoans + totalCC;

  const netWorth = totalAssets - totalLiabilities;

  const history     = (state.netWorthHistory || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const today       = new Date();
  const currentKey  = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const prevSnaps   = history.filter(h => h.date < currentKey);
  const prevSnap    = prevSnaps.length ? prevSnaps[prevSnaps.length - 1] : null;
  const momChange   = prevSnap !== null ? netWorth - prevSnap.netWorth : null;

  const byCategory = ASSET_CATEGORIES.map(cat => ({
    ...cat,
    items: (state.assets || []).filter(a => a.category === cat.key),
    total: (state.assets || []).filter(a => a.category === cat.key).reduce((s, a) => s + (a.value || 0), 0),
  }));

  return { liquidAssets, manualAssets, totalAssets, totalLoans, totalCC, totalLiabilities, netWorth, momChange, byCategory, history };
}

/** Record a net worth snapshot for the current month if one doesn't exist yet */
export function recordNetWorthSnapshot() {
  if (!state.netWorthHistory) state.netWorthHistory = [];
  const today    = new Date();
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  if (state.netWorthHistory.some(h => h.date === monthKey)) return;

  const totalAssets      = (state.savingsAccounts || []).reduce((s, a) => s + (a.balance || 0), 0)
                         + (state.assets           || []).reduce((s, a) => s + (a.value   || 0), 0);
  const totalLiabilities = (state.loans       || []).reduce((s, l) => s + (l.remaining || 0), 0)
                         + (state.creditCards  || []).reduce((s, c) => s + (c.balance   || 0), 0);

  state.netWorthHistory.push({ id: genId(), date: monthKey, netWorth: totalAssets - totalLiabilities, totalAssets, totalLiabilities });
  state.netWorthHistory.sort((a, b) => a.date.localeCompare(b.date));
  if (state.netWorthHistory.length > 24) state.netWorthHistory = state.netWorthHistory.slice(-24);
}

// ────────────────────────────────────────────────────────────────
// EXPENSE SCHEDULE / RECURRING CALENDAR
// ────────────────────────────────────────────────────────────────

/**
 * Returns the number of days in a given month.
 * @param {number} year
 * @param {number} month - 1-based (1 = Jan)
 */
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Build the full recurring bill forecast for a single month.
 *
 * Each entry in the returned arrays has the shape:
 *   { id, name, amount, dueDay, source, occurrences, totalForMonth }
 *
 * - source: 'expense' | 'subscription'
 * - occurrences: 1 (monthly) or 2 (bi-weekly items)
 * - dueDay: null means "any time this month" (undated)
 * - totalForMonth: amount * occurrences
 *
 * @param {number} year
 * @param {number} month - 1-based
 * @returns {{ dated: Array, undated: Array, total: number, budgeted: number, variance: number }}
 */
export function getMonthForecast(year, month) {
  const items = [];
  const maxDay = daysInMonth(year, month);

  // ── Expense card items ────────────────────────────────────────
  (state.expenseCards || []).forEach(card => {
    (card.items || []).forEach(item => {
      const occurrences = item.biweekly ? 2 : 1;
      const rawAmt      = +item.amount;
      // dueDay: clamp to valid range for this month; null stays null
      const dueDay = (item.dueDay != null && item.dueDay >= 1)
        ? Math.min(+item.dueDay, maxDay)
        : null;

      items.push({
        id:            item.id,
        name:          item.name,
        amount:        rawAmt,
        dueDay,
        source:        'expense',
        cardLabel:     card.label,
        occurrences,
        totalForMonth: rawAmt * occurrences,
        biweekly:      !!item.biweekly,
      });
    });
  });

  // ── Subscriptions ─────────────────────────────────────────────
  (state.subscriptions || []).forEach(sub => {
    const frequency     = sub.frequency || 'monthly';
    const startOfMonth  = new Date(year, month - 1, 1);
    const endOfMonth    = new Date(year, month - 1, maxDay);
    startOfMonth.setHours(0, 0, 0, 0);
    endOfMonth.setHours(0, 0, 0, 0);

    // For annual/quarterly: only include if a renewal occurs this month
    const renewalDates = frequency !== 'monthly'
      ? getRenewalDatesBetween(sub, startOfMonth, endOfMonth)
      : [];
    if (frequency !== 'monthly' && renewalDates.length === 0) return;

    // Determine the due day for this month
    let dueDay = null;
    if (renewalDates.length > 0) {
      // Use the actual renewal date for this specific month
      dueDay = Math.min(parseInt(renewalDates[0].split('-')[2], 10), maxDay);
    } else if (sub.date) {
      // Monthly: use the day-of-month from the stored next-renewal date
      const parts = sub.date.split('-');
      const parsedDay = parts.length >= 3 ? parseInt(parts[2], 10) : parseInt(sub.date, 10);
      if (!isNaN(parsedDay) && parsedDay >= 1) {
        dueDay = Math.min(parsedDay, maxDay);
      }
    }

    const occurrences = renewalDates.length || 1;
    items.push({
      id:            sub.id,
      name:          sub.name,
      amount:        +sub.amount || 0,
      dueDay,
      source:        'subscription',
      cardLabel:     'Subscriptions',
      occurrences,
      totalForMonth: (+sub.amount || 0) * occurrences,
      biweekly:      false,
      budgetType:    sub.budgetType || 'wants',
      category:      sub.category   || 'Other',
      frequency,
    });
  });

  // ── Split into dated / undated lists ─────────────────────────
  const dated   = items.filter(i => i.dueDay !== null).sort((a, b) => a.dueDay - b.dueDay);
  const undated = items.filter(i => i.dueDay === null);

  // ── Totals ────────────────────────────────────────────────────
  const total    = items.reduce((s, i) => s + i.totalForMonth, 0);
  const budgeted = getTotalMonthlyIncome() * getAlloc().needs;
  const variance = budgeted - total;        // positive = under budget

  return { dated, undated, total, budgeted, variance };
}

/**
 * Build a Map<dayNumber, item[]> from a month's forecast so the
 * calendar grid can look up bills by date in O(1).
 *
 * Undated items (dueDay === null) are excluded — they appear in the
 * list view's "Any time this month" group instead.
 *
 * @param {number} year
 * @param {number} month - 1-based
 * @returns {Map<number, Array>}
 */
export function getCalendarDayMap(year, month) {
  const { dated } = getMonthForecast(year, month);
  const map = new Map();
  dated.forEach(item => {
    if (!map.has(item.dueDay)) map.set(item.dueDay, []);
    map.get(item.dueDay).push(item);
  });
  return map;
}

/**
 * Build forecast totals for the next N months starting from (year, month).
 * Used by the 6-month bar chart.
 *
 * @param {number} year
 * @param {number} month - 1-based starting month
 * @param {number} [count=6]
 * @returns {Array<{ year, month, label, total, budgeted, variance }>}
 */
export function getSixMonthForecast(year, month, count = 6) {
  const results = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(year, month - 1 + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const fc = getMonthForecast(y, m);
    results.push({
      year: y,
      month: m,
      label: d.toLocaleString('en-CA', { month: 'short', year: '2-digit' }),
      total: fc.total,
      budgeted: fc.budgeted,
      variance: fc.variance,
    });
  }
  return results;
}

// ────────────────────────────────────────────────────────────────
// SPENDING ANALYTICS
// ────────────────────────────────────────────────────────────────

/**
 * Filter spending history by date range and purchase name.
 * Returns filtered history periods with only matching purchases.
 */
export function getFilteredSpendingHistory() {
  let history = state.spendingHistory || [];

  const filters = uiState.analyticsFilters;
  if (filters.startDate || filters.endDate) {
    history = history.filter(period => {
      if (filters.startDate && period.date < filters.startDate) return false;
      if (filters.endDate   && period.date > filters.endDate)   return false;
      return true;
    });
  }

  if (filters.search.trim()) {
    const searchTerm = filters.search.trim().toLowerCase();
    history = history
      .map(period => ({ ...period, items: (period.items || []).filter(p => p.name.toLowerCase().includes(searchTerm)) }))
      .filter(period => (period.items || []).length > 0 || !filters.search.trim());
  }

  return history;
}

/**
 * Aggregate spending by category across filtered history.
 * Falls back to purchase name for items without a category.
 * Returns top 10 sorted by total descending.
 */
export function getTopCategories(filteredHistory) {
  const catMap = {};
  (filteredHistory || []).forEach(period => {
    (period.items || []).forEach(p => {
      const key = p.category || p.name;
      catMap[key] = (catMap[key] || 0) + +p.amount;
    });
  });
  return Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
}

// ────────────────────────────────────────────────────────────────
// MONTH-OVER-MONTH ANALYTICS
// ────────────────────────────────────────────────────────────────

/**
 * Aggregate wants spending by calendar month for the last `count` months.
 * For the current month: sums live purchases + any closed periods this month.
 * For past months: sums closed spendingHistory periods whose date falls in that month.
 *
 * Returns an array (oldest → newest) of:
 *   { year, month, monthKey, label, total, categories, isCurrentMonth }
 * where `categories` is { [categoryName]: amount }.
 */
export function getMonthlyWantsHistory(count = 6) {
  const today   = new Date();
  const results = [];

  for (let i = count - 1; i >= 0; i--) {
    const d        = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year     = d.getFullYear();
    const month    = d.getMonth() + 1; // 1-based
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const label    = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const isCurrent = (i === 0);

    let total = 0;
    const categories = {};

    // Current month: include live (unsaved) purchases
    if (isCurrent) {
      (state.purchases || [])
        .filter(p => (p.budgetType || 'wants') !== 'needs')
        .forEach(p => {
          total += +p.amount || 0;
          const cat = p.category || 'Other';
          categories[cat] = (categories[cat] || 0) + (+p.amount || 0);
        });
    }

    // Add all closed periods whose date falls in this calendar month
    (state.spendingHistory || []).forEach(period => {
      if ((period.date || '').substring(0, 7) !== monthKey) return;
      total += period.total || 0;
      (period.items || []).forEach(item => {
        const cat = item.category || 'Other';
        categories[cat] = (categories[cat] || 0) + (+item.amount || 0);
      });
    });

    results.push({ year, month, monthKey, label, total, categories, isCurrent });
  }

  return results;
}

/**
 * Generate auto-text insights from monthly wants history.
 * Returns an array of { type: 'good'|'warn'|'info', text: string }.
 */
export function getMomInsights(monthlyData) {
  const insights = [];
  if (!monthlyData || monthlyData.length < 2) return insights;

  const current  = monthlyData[monthlyData.length - 1];
  const previous = monthlyData[monthlyData.length - 2];

  // MoM change insight
  if (previous.total > 0) {
    const delta = current.total - previous.total;
    const pct   = (delta / previous.total) * 100;
    if (pct > 20)
      insights.push({ type: 'warn', text: `Spending up ${pct.toFixed(0)}% vs. last month (+${fmt(delta)})` });
    else if (pct < -10)
      insights.push({ type: 'good', text: `Spending down ${Math.abs(pct).toFixed(0)}% vs. last month (${fmt(delta)})` });
    else
      insights.push({ type: 'info', text: `Spending roughly flat vs. last month (${delta >= 0 ? '+' : ''}${fmt(delta)})` });
  } else if (current.total > 0) {
    insights.push({ type: 'info', text: 'First month with recorded spending' });
  }

  // Best / worst month (only meaningful when there is at least some history)
  const totals    = monthlyData.map(m => m.total);
  const maxTotal  = Math.max(...totals);
  const positiveTotals = totals.filter(t => t > 0);
  const minTotal  = positiveTotals.length ? Math.min(...positiveTotals) : 0;
  if (maxTotal > 0 && current.total === maxTotal && monthlyData.length > 2)
    insights.push({ type: 'warn', text: `Highest spending month in ${monthlyData.length} months` });
  else if (minTotal > 0 && current.total === minTotal && current.total > 0 && monthlyData.length > 2)
    insights.push({ type: 'good', text: `Lowest spending month in ${monthlyData.length} months` });

  // Top category this month
  const catEntries = Object.entries(current.categories).sort((a, b) => b[1] - a[1]);
  if (catEntries.length > 0) {
    const [topCat, topAmt] = catEntries[0];
    const pctOfTotal = current.total > 0 ? (topAmt / current.total) * 100 : 0;
    insights.push({ type: 'info', text: `Top category: ${topCat} — ${fmt(topAmt)} (${pctOfTotal.toFixed(0)}% of spending)` });
  }

  return insights;
}

// ────────────────────────────────────────────────────────────────
// TRANSACTION RULES ENGINE — LOGIC
// ────────────────────────────────────────────────────────────────

/**
 * Match a purchase name against the rules list.
 * Returns the category of the first matching rule, or null if none match.
 */
export function applyRulesToName(name) {
  const lower = (name || '').toLowerCase().trim();
  for (const rule of (state.rules || [])) {
    const pattern = (rule.pattern || '').toLowerCase();
    if (!pattern) continue;
    let match = false;
    if      (rule.matchType === 'exact')      match = lower === pattern;
    else if (rule.matchType === 'startsWith') match = lower.startsWith(pattern);
    else                                      match = lower.includes(pattern); // 'contains' (default)
    if (match) return rule.category;
  }
  return null;
}

/**
 * Aggregate spending by category for a set of purchases.
 * Returns a plain object: { 'Food & Drink': 45.50, ... }
 */
export function getCategorySpending(purchases) {
  const map = {};
  (purchases || []).forEach(p => {
    const cat = p.category || 'Other';
    map[cat] = (map[cat] || 0) + +p.amount;
  });
  return map;
}

/**
 * Return all budget alerts that have been exceeded in the current period.
 * Each returned item is the alert object augmented with `spent`.
 */
export function getTriggeredAlerts() {
  const spending = getCategorySpending(state.purchases || []);
  return (state.budgetAlerts || [])
    .map(alert => ({ ...alert, spent: spending[alert.category] || 0 }))
    .filter(a => a.spent > a.threshold);
}
