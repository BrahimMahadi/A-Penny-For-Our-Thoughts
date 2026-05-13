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

/** Sum all actual needs (fixed expenses + Needs subs renewed this month) for a month */
function calculateActualNeeds(year, month) {
  const expenseTotal = (state.expenseCards || []).reduce((sum, card) => {
    return sum + (card.items || []).reduce((s, i) => s + monthlyAmount(i), 0);
  }, 0);
  // Only augment with Needs sub deductions for the current calendar month
  const today = new Date();
  if (year === today.getFullYear() && month === today.getMonth() + 1) {
    const needsSubTotal = getSubsDeductedThisMonth()
      .reduce((sum, sub) => sum + (+sub.amount || 0) * sub.renewalDates.length, 0);
    return expenseTotal + needsSubTotal;
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
    total += (state.purchases || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    // Add Wants subs deducted during the current bi-weekly period
    total += getSubsDeductedThisPeriod()
      .reduce((sum, sub) => sum + (+sub.amount || 0) * sub.renewalDates.length, 0);
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
// SUBSCRIPTION TRACKING
// ────────────────────────────────────────────────────────────────

/**
 * Get all dates a subscription renews between startDate and endDate (inclusive).
 * Both params are Date objects with time set to local midnight.
 * Returns array of YYYY-MM-DD strings.
 */
function getRenewalDatesBetween(sub, startDate, endDate) {
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
  }

  return results;
}

/**
 * Calculate the current bi-weekly period start from state.payStart.
 * Returns YYYY-MM-DD string, or null if payStart is not configured.
 */
function getCurrentPeriodStart() {
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
function getSubsDeductedThisPeriod() {
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
function getSubsDeductedThisMonth() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return (state.subscriptions || [])
    .filter(sub => sub.budgetType === 'needs')
    .map(sub => ({ ...sub, renewalDates: getRenewalDatesBetween(sub, firstOfMonth, today) }))
    .filter(sub => sub.renewalDates.length > 0);
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
