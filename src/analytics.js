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

// ────────────────────────────────────────────────────────────────
// INCOME & BUDGET
// ────────────────────────────────────────────────────────────────

/** Sum all monthly income across all income streams */
function getTotalMonthlyIncome() {
  return (state.incomeStreams || []).reduce((sum, s) => {
    return sum + (s.biweekly ? s.amount * 2 : +s.amount);
  }, 0);
}

/** Sum monthly amounts across all dynamic expense cards */
function grandTotal() {
  return (state.expenseCards || []).reduce((sum, card) => {
    return sum + (card.items || []).reduce((s, i) => s + monthlyAmount(i), 0);
  }, 0);
}

/** Return allocation ratios as decimals */
function getAlloc() {
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
function getMonthActuals(year, month) {
  return {
    needs:   calculateActualNeeds(year, month),
    wants:   calculateActualWants(year, month),
    savings: calculateActualSavings(year, month),
  };
}

/** Sum all actual needs (fixed monthly expenses) for a month */
function calculateActualNeeds(year, month) {
  return (state.expenseCards || []).reduce((sum, card) => {
    return sum + (card.items || []).reduce((s, i) => s + monthlyAmount(i), 0);
  }, 0);
}

/** Sum all actual wants (purchases + spending history) for a month */
function calculateActualWants(year, month) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  let total = 0;

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  if (monthStr === currentMonth) {
    total += (state.purchases || []).reduce((sum, p) => sum + (p.amount || 0), 0);
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
function getMonthBudgeted(year, month) {
  const income = getTotalMonthlyIncome();
  const alloc  = getAlloc();
  return {
    needs:   income * alloc.needs,
    wants:   income * alloc.wants,
    savings: income * alloc.savings,
  };
}

/** Calculate variance data for a category */
function calculateVariance(budgeted, actual, category) {
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
function getAllocationForMonth(account, year, month) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  return account.monthlyAllocations && account.monthlyAllocations[monthKey] !== undefined
    ? account.monthlyAllocations[monthKey]
    : account.defaultAllocated || 0;
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
function getGoalProgress(goal) {
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

const ASSET_CATEGORIES = [
  { key: 'investment', label: 'Investments', icon: '💰' },
  { key: 'real_estate', label: 'Real Estate', icon: '🏠' },
  { key: 'vehicle',    label: 'Vehicles',    icon: '🚗' },
  { key: 'other',      label: 'Other',       icon: '📦' },
];

/** Compute a full net worth snapshot from current state */
function getNetWorthData() {
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
function recordNetWorthSnapshot() {
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
function getMonthForecast(year, month) {
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
    // Extract the day-of-month from the stored date string (YYYY-MM-DD or similar)
    let dueDay = null;
    if (sub.date) {
      const parts = sub.date.split('-');
      // parts[2] is the day if the format is YYYY-MM-DD
      // For a plain day number stored as string, fall back gracefully
      const parsedDay = parts.length >= 3 ? parseInt(parts[2], 10) : parseInt(sub.date, 10);
      if (!isNaN(parsedDay) && parsedDay >= 1) {
        dueDay = Math.min(parsedDay, maxDay);
      }
    }

    items.push({
      id:            sub.id,
      name:          sub.name,
      amount:        +sub.amount || 0,
      dueDay,
      source:        'subscription',
      cardLabel:     'Subscriptions',
      occurrences:   1,
      totalForMonth: +sub.amount || 0,
      biweekly:      false,
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

// ────────────────────────────────────────────────────────────────
// SPENDING ANALYTICS
// ────────────────────────────────────────────────────────────────

/**
 * Filter spending history by date range and purchase name.
 * Returns filtered history periods with only matching purchases.
 */
function getFilteredSpendingHistory() {
  let history = state.spendingHistory || [];

  if (analyticsFilters.startDate || analyticsFilters.endDate) {
    history = history.filter(period => {
      if (analyticsFilters.startDate && period.date < analyticsFilters.startDate) return false;
      if (analyticsFilters.endDate   && period.date > analyticsFilters.endDate)   return false;
      return true;
    });
  }

  if (analyticsFilters.search.trim()) {
    const searchTerm = analyticsFilters.search.trim().toLowerCase();
    history = history
      .map(period => ({ ...period, items: (period.items || []).filter(p => p.name.toLowerCase().includes(searchTerm)) }))
      .filter(period => (period.items || []).length > 0 || !analyticsFilters.search.trim());
  }

  return history;
}

/**
 * Aggregate spending by purchase name across filtered history.
 * Returns top 10 sorted by total descending.
 */
function getTopCategories(filteredHistory) {
  const catMap = {};
  (filteredHistory || []).forEach(period => {
    (period.items || []).forEach(p => { catMap[p.name] = (catMap[p.name] || 0) + +p.amount; });
  });
  return Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
}
