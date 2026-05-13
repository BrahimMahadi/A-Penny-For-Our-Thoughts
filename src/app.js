/* ═══════════════════════════════════════════════════════════════
   Module:   app.js
   Project:  A Penny For Our Thoughts
   Created:  May 2026
   Modified: May 2026 — income streams CRUD, dynamic expense cards CRUD,
             spending analytics dashboard with date range + name filters,
             CSV export/import, state migration from v1 (gov/expenses) to v2 schema
   Summary:  All application logic — state management, rendering,
             CRUD operations, theme switching, analytics charts,
             CSV I/O, and localStorage persistence.
   Functions:
     Theme:      initTheme, toggleTheme, applyTheme
     Storage:    loadFromStorage, saveToStorage
     Tabs:       switchTab
     Modal:      openModal, closeModal, handleOverlayClick, mField
     Income:     getTotalMonthlyIncome, renderIncome, toggleBudgetMode,
                 renderIncomeStreams, addIncomeStream,
                 openEditIncomeStream, deleteIncomeStream
     Wants:      renderWants, renderPurchaseList, renderWantsDonut,
                 addPurchase, removePurchase, resetWants
     Analytics:  toggleAnalyticsPanel, renderSpendingAnalytics,
                 getFilteredSpendingHistory, updateAnalyticsFilters,
                 resetAnalyticsFilters, renderAnalyticsLineChart,
                 renderAnalyticsBarChart, renderAnalyticsHistory,
                 getTopCategories, openEditHistoryPurchase,
                 deleteHistoryPurchase, deleteHistoryPeriod
     Expenses:   renderExpenseCards, addExpense, removeExpense,
                 openAddExpenseCard, openEditExpenseCard, deleteExpenseCard
     Loans:      renderLoans, openAddLoan, openEditLoan, deleteLoan
     CC:         renderCreditCards, renderCcBarChart,
                 openAddCreditCard, openEditCreditCard, deleteCreditCard
     Savings:    renderSavings, addSavingsAccount,
                 openEditSavingsAccount, deleteSavingsAccount
     Subs:       renderSubscriptions, addSubscription,
                 openEditSubscription, deleteSubscription
     Wishlist:   renderWishlist, addWishlistItem,
                 openEditWishlistItem, deleteWishlistItem
     Edit tab:   populateEditTab, updateAllocPreview, saveEdits
     CSV:        exportCsv, importCsv, parseCsv,
                 csvEscape, parseCSVRow
     Misc:       renderDate, genId, fmt, pct, daysUntil,
                 monthlyAmount, grandTotal, getAlloc, deepClone
   Variables:
     state              — single source of truth for all app data
     wantsChart         — Chart.js donut instance (wants tracker)
     ccChart            — Chart.js bar instance (credit cards)
     analyticsLineChart — Chart.js line instance (spending history)
     analyticsBarChart  — Chart.js bar instance (top categories)
     analyticsFilters   — filter state {startDate, endDate, search}
═══════════════════════════════════════════════════════════════ */

// ────────────────────────────────────────────────────────────────
// DEFAULT STATE
// ────────────────────────────────────────────────────────────────
const DEFAULT_STATE = {
  allocation:        { needs: 50, wants: 30, savings: 20 },
  budgetDisplayMode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },

  // New v2 arrays (empty by default — user adds their own)
  incomeStreams:   [],
  expenseCards:    [],
  purchases:       [],
  spendingHistory: [],

  loans: [
    { id: genId(), name: 'Car Loan',      remaining: 15172,  original: 23083   },
    { id: genId(), name: 'Student Loans', remaining: 9641,   original: 11338   },
    { id: genId(), name: 'Phone Loan',    remaining: 919.44, original: 1298.07 },
  ],

  creditCards: [
    { id: genId(), name: 'TD Small CC (9602)',    balance: 828.94, limit: 1000 },
    { id: genId(), name: 'TD Big CC (1252)',       balance: 817.60, limit: 2500 },
    { id: genId(), name: 'WealthSimple CC (1083)', balance: 231,   limit: 2000 },
  ],

  subscriptions: [
    { id: genId(), name: 'Usenet Provider', date: '2026-09-13' },
    { id: genId(), name: 'Real Debrid',     date: '2026-09-22' },
    { id: genId(), name: 'IPVanish',        date: '2027-04-17' },
  ],

  wishlist: [
    { id: genId(), icon: '💻', name: 'MacBook Pro 14" M5 Pro — Space Black, Nano-texture', url: 'https://www.apple.com/ca/shop/buy-mac/macbook-pro' },
    { id: genId(), icon: '🪑', name: 'Herman Miller Embody Gaming Chair', url: 'https://store.hermanmiller.com/gaming-chairs/embody-gaming-chair/100206608.html' },
    { id: genId(), icon: '🔊', name: 'Sennheiser AMBEO Soundbar + Subwoofer', url: 'https://www.amazon.ca/dp/B0B9CBWD95' },
    { id: genId(), icon: '🎬', name: 'Valencia Home Theatre Seating', url: 'https://ca.valenciatheaterseating.com/collections/home-theater-seating' },
    { id: genId(), icon: '📺', name: 'LG TV Extended Warranty', url: 'https://www.lgcanadaparts.com/extendedwarranties' },
  ],

  savingsAccounts: [
    { id: genId(), name: 'CC Payments',   balance: 500,   defaultAllocated: 135,   monthlyAllocations: {} },
    { id: genId(), name: 'Crypto',        balance: 2000,  defaultAllocated: 135,   monthlyAllocations: {} },
    { id: genId(), name: 'FHSA',          balance: 5000,  defaultAllocated: 135,   monthlyAllocations: {} },
    { id: genId(), name: 'TFSA',          balance: 25000, defaultAllocated: 135,   monthlyAllocations: {} },
    { id: genId(), name: 'USD Savings',   balance: 3000,  defaultAllocated: 67.50, monthlyAllocations: {} },
    { id: genId(), name: 'Life with B&S', balance: 1200,  defaultAllocated: 67.50, monthlyAllocations: {} },
  ],

  goals: [],
};

// ────────────────────────────────────────────────────────────────
// MODULE-LEVEL STATE
// ────────────────────────────────────────────────────────────────
let state              = {};
let wantsChart         = null;
let ccChart            = null;
let analyticsLineChart = null;
let analyticsBarChart  = null;

// Analytics filter state
let analyticsFilters = {
  startDate: '',
  endDate:   '',
  search:    '',
};

// ────────────────────────────────────────────────────────────────
// UTILITIES
// ────────────────────────────────────────────────────────────────

/** Generate a stable unique ID */
function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Format a number as Canadian dollar string */
function fmt(n) {
  return '$' + Number(n).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Return percentage of a relative to b, as a string */
function pct(a, b) {
  return b > 0 ? Math.min(100, (a / b) * 100).toFixed(1) : '0.0';
}

/** Return days until a YYYY-MM-DD date string (negative = past) */
function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr + 'T00:00:00') - now) / 86400000);
}

/** Return monthly cost for an expense item (bi-weekly items × 2) */
function monthlyAmount(item) {
  return item.biweekly ? item.amount * 2 : item.amount;
}

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

// ─── BUDGET VS. ACTUAL CALCULATIONS ───
/** Calculate actual spending for a given month */
function getMonthActuals(year, month) {
  return {
    needs:  calculateActualNeeds(year, month),
    wants:  calculateActualWants(year, month),
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

  // Add current period purchases (if in current month)
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  if (monthStr === currentMonth) {
    total += (state.purchases || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  }

  // Add historical spending from spendingHistory
  (state.spendingHistory || []).forEach(period => {
    if (period.date) {
      const periodMonth = period.date.substring(0, 7); // Extract YYYY-MM
      if (periodMonth === monthStr) {
        total += period.total || 0;
      }
    }
  });

  return total;
}

/** Calculate actual savings as Income - Needs - Wants */
function calculateActualSavings(year, month) {
  const income = getTotalMonthlyIncome();
  const needs = calculateActualNeeds(year, month);
  const wants = calculateActualWants(year, month);
  return Math.max(0, income - needs - wants);
}

/** Get budgeted amounts for a month based on allocation percentages */
function getMonthBudgeted(year, month) {
  const income = getTotalMonthlyIncome();
  const alloc = getAlloc();
  return {
    needs:  income * alloc.needs,
    wants:  income * alloc.wants,
    savings: income * alloc.savings,
  };
}

/** Calculate variance data for a category */
function calculateVariance(budgeted, actual, category) {
  const dollar = budgeted - actual;
  const percent = budgeted > 0 ? (actual / budgeted) * 100 : 0;

  let status = 'on-track';
  if (percent > 110) status = 'over';
  else if (percent > 100) status = 'caution';

  return { dollar, percent, status };
}

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

// ─── SAVINGS ACCOUNTS CALCULATIONS ───
/** Get the allocation for a given month, checking for overrides */
function getAllocationForMonth(account, year, month) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  return account.monthlyAllocations && account.monthlyAllocations[monthKey] !== undefined
    ? account.monthlyAllocations[monthKey]
    : account.defaultAllocated || 0;
}

// ─── SAVINGS GOALS CALCULATIONS ───
/** Calculate months between two YYYY-MM date strings */
function calculateMonthsBetween(startDate, endDate) {
  const [startYear, startMonth] = startDate.split('-').map(Number);
  const [endYear, endMonth] = endDate.split('-').map(Number);
  return (endYear - startYear) * 12 + (endMonth - startMonth);
}

/** Get progress data for a single goal */
function getGoalProgress(goal) {
  const account = (state.savingsAccounts || []).find(a => a.id === goal.accountId);
  if (!account) return null;

  const currentAmount = account.balance || 0;
  const targetAmount = goal.targetAmount || 0;
  const targetDate = goal.targetDate;

  // Get today's date in YYYY-MM format
  const today = new Date();
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // Calculate months remaining
  const monthsRemaining = calculateMonthsBetween(currentYearMonth, targetDate);

  // Calculate monthly savings needed (handle division by zero)
  const shortfall = Math.max(0, targetAmount - currentAmount);
  const monthlySavingsNeeded = monthsRemaining > 0 ? shortfall / monthsRemaining : 0;

  // Calculate progress percentage
  const progressPercent = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

  // Determine if on track (for now, simple: have we allocated the right amount?)
  // More sophisticated: check if current >= requiredAmount at this point in timeline
  let status = 'on-track';
  if (monthsRemaining <= 0) {
    // Goal date passed
    status = currentAmount >= targetAmount ? 'complete' : 'missed';
  } else {
    // Goal in future: are we ahead, on-track, or behind?
    const requiredAmount = targetAmount * ((Date.now() - new Date(goal.targetDate.split('-')[0], goal.targetDate.split('-')[1] - 1, 1)) /
      ((new Date(goal.targetDate.split('-')[0], goal.targetDate.split('-')[1], 0) - new Date(goal.targetDate.split('-')[0], goal.targetDate.split('-')[1] - 1, 1)) / 1000 / 60 / 60 / 24));

    // Simpler approach: if we're on pace, we're on track
    // Just check if current >= what we should have by this point in the year
    if (progressPercent >= 100) {
      status = 'on-track';
    } else if (progressPercent >= 80) {
      status = 'caution';
    } else {
      status = 'off-track';
    }
  }

  return {
    accountId: goal.accountId,
    accountName: account.name,
    currentAmount,
    targetAmount,
    targetDate,
    progressPercent: Math.min(100, progressPercent),
    monthsRemaining: Math.max(0, monthsRemaining),
    monthlySavingsNeeded: Math.max(0, monthlySavingsNeeded),
    isOnTrack: status === 'on-track',
    status,
  };
}

// ────────────────────────────────────────────────────────────────
// THEME
// ────────────────────────────────────────────────────────────────
const THEME_KEY     = 'penny_theme';
const TOGGLE_BTN_ID = 'theme-toggle';

/** Apply theme on load from localStorage preference */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

/** Switch between dark and light and persist the choice */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/** Set data-theme on <html> and update the toggle button icon */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById(TOGGLE_BTN_ID);
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

// ────────────────────────────────────────────────────────────────
// STORAGE
// ────────────────────────────────────────────────────────────────
function loadFromStorage() {
  const saved = localStorage.getItem('penny_state_v2');
  try {
    state = saved ? JSON.parse(saved) : deepClone(DEFAULT_STATE);
  } catch {
    state = deepClone(DEFAULT_STATE);
  }

  // ── Migration: old state.gov (single number) → incomeStreams array ──
  if (state.gov !== undefined && !state.incomeStreams) {
    state.incomeStreams = [{
      id: genId(), name: 'Government', amount: +state.gov, biweekly: true,
    }];
    delete state.gov;
  }

  // ── Migration: old state.expenses (keyed object) → expenseCards array ──
  if (state.expenses && !state.expenseCards) {
    const labelMap = {
      'td-debit':  'TD Debit',
      'ws-debit':  'WS Debit',
      'ws-credit': 'WS Credit Card',
    };
    state.expenseCards = Object.entries(state.expenses).map(([key, items]) => ({
      id: genId(), label: labelMap[key] || key, items: items || [],
    }));
    delete state.expenses;
  }

  // ── Migration: old savings accounts (allocated only) → new structure (balance + defaultAllocated + monthlyAllocations) ──
  if (state.savingsAccounts) {
    state.savingsAccounts.forEach(acct => {
      if (acct.balance === undefined) acct.balance = 0; // Default to $0 if not present
      if (acct.defaultAllocated === undefined) {
        // Migrate old "allocated" field to "defaultAllocated"
        acct.defaultAllocated = acct.allocated || 0;
        delete acct.allocated; // Remove old field
      }
      if (!acct.monthlyAllocations) acct.monthlyAllocations = {};
    });
  }

  // ── Forward-compatibility: ensure all keys exist ──
  if (!state.allocation)        state.allocation        = { needs: 50, wants: 30, savings: 20 };
  if (!state.budgetDisplayMode) state.budgetDisplayMode = { needs: 'monthly', wants: 'monthly', savings: 'monthly' };
  if (!state.incomeStreams)     state.incomeStreams      = [];
  if (!state.expenseCards)      state.expenseCards       = [];
  if (!state.purchases)         state.purchases          = [];
  if (!state.spendingHistory)   state.spendingHistory    = [];
  if (!state.loans)             state.loans              = [];
  if (!state.creditCards)       state.creditCards        = [];
  if (!state.wishlist)          state.wishlist           = [];
  if (!state.savingsAccounts)   state.savingsAccounts    = [];
  if (!state.subscriptions)     state.subscriptions      = [];
  if (!state.goals)             state.goals              = [];
}

function saveToStorage() {
  localStorage.setItem('penny_state_v2', JSON.stringify(state));
}

// ────────────────────────────────────────────────────────────────
// TABS
// ────────────────────────────────────────────────────────────────
function switchTab(tab) {
  // Single tab dashboard — no-op for now
  // Kept for compatibility with modal close handlers
}

// ────────────────────────────────────────────────────────────────
// MODAL
// ────────────────────────────────────────────────────────────────
function openModal(title, bodyHTML, onSave) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML    = bodyHTML;
  document.getElementById('modal-save-btn').onclick  = onSave;
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

/** Build a labelled modal input field as an HTML string */
function mField(label, id, type, value, placeholder, extraAttrs) {
  return `
    <div class="modal-field">
      <label>${label}</label>
      <input type="${type}" id="${id}"
             value="${value !== undefined ? value : ''}"
             placeholder="${placeholder || ''}"
             ${extraAttrs || ''} />
    </div>`;
}

/** Open modal to edit budget allocation percentages */
function openEditAllocation() {
  const a = state.allocation || { needs: 50, wants: 30, savings: 20 };
  const bodyHTML = `
    ${mField('Needs %', 'alloc-needs', 'number', a.needs, '50', 'min="0" max="100" step="1" oninput="updateAllocValidation()"')}
    ${mField('Wants %', 'alloc-wants', 'number', a.wants, '30', 'min="0" max="100" step="1" oninput="updateAllocValidation()"')}
    ${mField('Savings %', 'alloc-savings', 'number', a.savings, '20', 'min="0" max="100" step="1" oninput="updateAllocValidation()"')}
    <div id="alloc-validation" style="margin-top:12px;padding:8px;border-radius:4px;font-size:13px;font-weight:600;background:#3a4456;color:#8b95ad">
      Total: <span id="alloc-total">100</span>%
    </div>
  `;

  openModal(
    'Edit Budget Allocation',
    bodyHTML,
    () => {
      const n = parseFloat(document.getElementById('alloc-needs').value)   || 0;
      const w = parseFloat(document.getElementById('alloc-wants').value)   || 0;
      const s = parseFloat(document.getElementById('alloc-savings').value) || 0;

      if (Math.round(n + w + s) !== 100) {
        alert(`Budget allocation must sum to 100%. Currently: ${n + w + s}%`);
        return;
      }

      state.allocation = { needs: n, wants: w, savings: s };
      saveToStorage();
      renderAll();
      closeModal();
    }
  );

  // Initial validation
  updateAllocValidation();
}

/** Update validation display for allocation editing */
function updateAllocValidation() {
  const n = parseFloat(document.getElementById('alloc-needs').value)   || 0;
  const w = parseFloat(document.getElementById('alloc-wants').value)   || 0;
  const s = parseFloat(document.getElementById('alloc-savings').value) || 0;
  const total = n + w + s;
  const isValid = Math.round(total) === 100;

  const display = document.getElementById('alloc-validation');
  const totalSpan = document.getElementById('alloc-total');

  totalSpan.textContent = total;
  display.style.color = isValid ? '#00d4aa' : total > 100 ? '#ff4d6d' : '#ffa63d';
  display.style.fontWeight = isValid ? '600' : '700';
}

// ────────────────────────────────────────────────────────────────
// RENDER — INCOME OVERVIEW
// ────────────────────────────────────────────────────────────────

/** Toggle monthly/bi-weekly display for a budget category */
function toggleBudgetMode(category) {
  if (!state.budgetDisplayMode) {
    state.budgetDisplayMode = { needs: 'monthly', wants: 'monthly', savings: 'monthly' };
  }
  state.budgetDisplayMode[category] =
    state.budgetDisplayMode[category] === 'monthly' ? 'biweekly' : 'monthly';
  saveToStorage();
  renderIncome();
}

function renderIncome() {
  const inc   = getTotalMonthlyIncome();
  const alloc = getAlloc();

  const needs   = inc * alloc.needs;
  const wants   = inc * alloc.wants;
  const savings = inc * alloc.savings;
  const biWants   = wants   / 2;
  const biSavings = savings / 2;

  const nPct = state.allocation.needs;
  const wPct = state.allocation.wants;
  const sPct = state.allocation.savings;

  const displayMode = state.budgetDisplayMode || { needs: 'monthly', wants: 'monthly', savings: 'monthly' };

  const needsDisplay   = displayMode.needs   === 'biweekly' ? needs   / 2 : needs;
  const wantsDisplay   = displayMode.wants   === 'biweekly' ? wants   / 2 : wants;
  const savingsDisplay = displayMode.savings === 'biweekly' ? savings / 2 : savings;

  // Total income card
  const streamCount = (state.incomeStreams || []).length;
  document.getElementById('disp-income-sub').textContent =
    streamCount === 0 ? 'no income streams added' :
    streamCount === 1 ? 'from 1 stream' :
    `from ${streamCount} streams`;

  document.getElementById('disp-income').textContent            = fmt(inc);
  document.getElementById('disp-needs').textContent             = fmt(needsDisplay);
  document.getElementById('disp-wants').textContent             = fmt(wantsDisplay);
  document.getElementById('disp-savings-income').textContent    = fmt(savingsDisplay);
  document.getElementById('disp-biwants').textContent           = fmt(biWants);
  document.getElementById('disp-savings-biweekly').textContent  = fmt(biSavings);

  // Toggle button labels
  document.getElementById('needs-toggle-label').textContent   = displayMode.needs   === 'biweekly' ? 'Bi-Weekly' : 'Monthly';
  document.getElementById('wants-toggle-label').textContent   = displayMode.wants   === 'biweekly' ? 'Bi-Weekly' : 'Monthly';
  document.getElementById('savings-toggle-label').textContent = displayMode.savings === 'biweekly' ? 'Bi-Weekly' : 'Monthly';

  // Sub-labels
  document.getElementById('disp-needs-pct-label').textContent   = `${nPct}% of income`;
  document.getElementById('disp-wants-pct-label').textContent   = `${wPct}% of income`;
  document.getElementById('disp-savings-pct-label').textContent = `${sPct}% of income`;

  // Allocation bar
  document.getElementById('bar-needs-pct').textContent   = nPct;
  document.getElementById('bar-wants-pct').textContent   = wPct;
  document.getElementById('bar-savings-pct').textContent = sPct;
  document.getElementById('bar-needs').textContent       = fmt(needs);
  document.getElementById('bar-wants').textContent       = fmt(wants);
  document.getElementById('bar-savings').textContent     = fmt(savings);

  document.getElementById('seg-needs').style.width   = nPct + '%';
  document.getElementById('seg-wants').style.width   = wPct + '%';
  document.getElementById('seg-savings').style.width = sPct + '%';

  // Sync savings section target display
  document.getElementById('disp-savings').textContent = fmt(savings);
}

// ────────────────────────────────────────────────────────────────
// INCOME STREAMS — CRUD
// ────────────────────────────────────────────────────────────────
function renderIncomeStreams() {
  const streams = state.incomeStreams || [];
  const ul      = document.getElementById('income-stream-list');
  const empty   = document.getElementById('income-empty-state');
  const counter = document.getElementById('income-stream-count');

  counter.textContent = `${streams.length} stream${streams.length !== 1 ? 's' : ''}`;
  ul.innerHTML        = '';

  if (!streams.length) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  streams.forEach(stream => {
    const monthly = stream.biweekly ? stream.amount * 2 : +stream.amount;
    const li = document.createElement('li');
    li.className = 'income-stream-item';
    li.innerHTML = `
      <span class="stream-name">${stream.name}</span>
      ${stream.biweekly
        ? '<span class="chip purple" style="font-size:10px;padding:2px 7px">bi-wk</span>'
        : ''}
      <span class="stream-raw">${fmt(stream.amount)}${stream.biweekly ? '/pay' : '/mo'}</span>
      <span class="stream-monthly">${fmt(monthly)}/mo</span>
      <button class="btn icon-btn" onclick="openEditIncomeStream('${stream.id}')" title="Edit">✎</button>
      <button class="btn icon-btn del" onclick="deleteIncomeStream('${stream.id}')" title="Delete">×</button>`;
    ul.appendChild(li);
  });
}

function addIncomeStream() {
  const name     = document.getElementById('new-stream-name').value.trim();
  const amount   = parseFloat(document.getElementById('new-stream-amount').value);
  const biweekly = document.getElementById('new-stream-biweekly').checked;
  if (!name || isNaN(amount) || amount <= 0) return;

  state.incomeStreams.push({ id: genId(), name, amount, biweekly });
  document.getElementById('new-stream-name').value   = '';
  document.getElementById('new-stream-amount').value = '';
  document.getElementById('new-stream-biweekly').checked = false;
  saveToStorage();
  renderAll();
}

function openEditIncomeStream(id) {
  const stream = (state.incomeStreams || []).find(s => s.id === id);
  if (!stream) return;
  openModal(
    'Edit Income Stream',
    mField('Stream Name', 'mis-name', 'text', stream.name, '') +
    mField('Amount ($)', 'mis-amount', 'number', stream.amount, '0.00', 'min="0" step="0.01"') +
    `<div class="modal-field">
      <label>Frequency</label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="mis-biweekly" ${stream.biweekly ? 'checked' : ''} />
        Bi-weekly (paid every 2 weeks)
      </label>
    </div>`,
    () => {
      const name     = document.getElementById('mis-name').value.trim();
      const amount   = parseFloat(document.getElementById('mis-amount').value);
      const biweekly = document.getElementById('mis-biweekly').checked;
      if (!name || isNaN(amount)) return;
      Object.assign(stream, { name, amount, biweekly });
      saveToStorage();
      renderAll();
      closeModal();
    }
  );
}

function deleteIncomeStream(id) {
  if (!confirm('Remove this income stream?')) return;
  state.incomeStreams = state.incomeStreams.filter(s => s.id !== id);
  saveToStorage();
  renderAll();
}

// ────────────────────────────────────────────────────────────────
// RENDER — WANTS TRACKER
// ────────────────────────────────────────────────────────────────
function renderWants() {
  const inc     = getTotalMonthlyIncome();
  const biWants = inc * getAlloc().wants / 2;
  const spent   = (state.purchases || []).reduce((s, p) => s + +p.amount, 0);
  const remaining = biWants - spent;
  const usedPct   = biWants > 0 ? Math.min(100, (spent / biWants) * 100) : 0;

  document.getElementById('disp-biwants2').textContent             = fmt(biWants);
  document.getElementById('disp-wants-spent').textContent          = fmt(spent);
  document.getElementById('disp-wants-remaining-amt').textContent  = fmt(Math.max(0, remaining));
  document.getElementById('disp-wants-remaining-label').textContent = remaining >= 0 ? 'remaining' : 'over by';
  document.getElementById('donut-pct').textContent                  = usedPct.toFixed(0) + '%';

  document.getElementById('wants-status-chip').innerHTML = remaining >= 0
    ? `<span class="chip green">✓ On Track</span>`
    : `<span class="chip red">⚠ Over by ${fmt(Math.abs(remaining))}</span>`;

  renderPurchaseList();
  renderWantsDonut(spent, remaining, usedPct);
}

function renderPurchaseList() {
  const ul = document.getElementById('purchase-list');
  ul.innerHTML = '';

  if (!(state.purchases || []).length) {
    ul.innerHTML = '<li style="color:var(--muted);font-size:12px;padding:4px 0">No purchases yet this period.</li>';
    return;
  }

  state.purchases.forEach(p => {
    const li = document.createElement('li');
    li.className = 'purchase-item';
    li.innerHTML = `
      <span class="name">${p.name}</span>
      <span class="amount">${fmt(p.amount)}</span>
      <button class="btn icon-btn del" onclick="removePurchase('${p.id}')">×</button>`;
    ul.appendChild(li);
  });
}

function renderWantsDonut(spent, remaining, usedPct) {
  const fillColour = usedPct >= 100 ? '#ff4d6d' : usedPct >= 80 ? '#ffa63d' : '#6c63ff';
  if (wantsChart) wantsChart.destroy();
  wantsChart = new Chart(document.getElementById('wantsDonut'), {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [Math.min(spent, spent + Math.max(0, remaining)), Math.max(0, remaining)],
        backgroundColor: [fillColour, '#3a4456'],
        borderColor: ['transparent', 'transparent'],
        borderWidth: 0,
        borderRadius: 4,
      }],
    },
    options: {
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(26, 35, 50, 0.95)',
          titleColor: '#e8eaf0',
          bodyColor: '#e8eaf0',
          borderColor: '#3a4456',
          borderWidth: 1,
          padding: 10,
          titleFont: { size: 12, weight: '700' },
          bodyFont: { size: 11 },
          callbacks: { label: ctx => ' ' + fmt(ctx.parsed) },
        },
      },
      animation: { duration: 600, easing: 'easeInOutQuart' },
    },
  });
}

function addPurchase() {
  const name   = document.getElementById('purchase-name').value.trim();
  const amount = parseFloat(document.getElementById('purchase-amount').value);
  if (!name || isNaN(amount) || amount <= 0) return;

  state.purchases.push({ id: genId(), name, amount });
  document.getElementById('purchase-name').value   = '';
  document.getElementById('purchase-amount').value = '';
  saveToStorage();
  renderAll();
}

function removePurchase(id) {
  state.purchases = state.purchases.filter(p => p.id !== id);
  saveToStorage();
  renderAll();
}

/**
 * Reset the current bi-weekly period.
 * Archives purchases to spendingHistory before clearing.
 */
function resetWants() {
  if (!confirm('Reset all purchases for this bi-weekly period?')) return;

  if ((state.purchases || []).length > 0) {
    const total = state.purchases.reduce((s, p) => s + +p.amount, 0);
    state.spendingHistory.push({
      id:    genId(),
      date:  new Date().toISOString().split('T')[0],
      label: `Period ending ${new Date().toLocaleDateString('en-CA')}`,
      total,
      items: deepClone(state.purchases),
    });
  }

  state.purchases = [];
  saveToStorage();
  renderAll();

  // Refresh analytics panel if it is currently visible
  const panel = document.getElementById('analytics-panel');
  if (panel && panel.style.display !== 'none') renderSpendingAnalytics();
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

  // Filter by date range
  if (analyticsFilters.startDate || analyticsFilters.endDate) {
    history = history.filter(period => {
      if (analyticsFilters.startDate && period.date < analyticsFilters.startDate) return false;
      if (analyticsFilters.endDate && period.date > analyticsFilters.endDate) return false;
      return true;
    });
  }

  // Filter by purchase name (case-insensitive partial match)
  if (analyticsFilters.search.trim()) {
    const searchTerm = analyticsFilters.search.trim().toLowerCase();
    history = history.map(period => ({
      ...period,
      items: (period.items || []).filter(p =>
        p.name.toLowerCase().includes(searchTerm)
      ),
    })).filter(period => (period.items || []).length > 0 || !analyticsFilters.search.trim());
  }

  return history;
}

/** Update filter values from UI and re-render analytics */
function updateAnalyticsFilters() {
  analyticsFilters.startDate = document.getElementById('analytics-filter-start').value;
  analyticsFilters.endDate = document.getElementById('analytics-filter-end').value;
  analyticsFilters.search = document.getElementById('analytics-filter-search').value;
  renderSpendingAnalytics();
}

/** Reset all filters and re-render */
function resetAnalyticsFilters() {
  analyticsFilters.startDate = '';
  analyticsFilters.endDate = '';
  analyticsFilters.search = '';

  document.getElementById('analytics-filter-start').value = '';
  document.getElementById('analytics-filter-end').value = '';
  document.getElementById('analytics-filter-search').value = '';

  renderSpendingAnalytics();
}

// ─── BUDGET VS. ACTUAL RENDERING ───
/** Main render function for Budget vs. Actual Dashboard */
function renderBudgetVsActual() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const actuals = getMonthActuals(year, month);
  const budgeted = getMonthBudgeted(year, month);
  const income = getTotalMonthlyIncome();

  // Debug: Log actual calculation values
  console.log('Budget vs. Actual Debug:', {
    income,
    needs_budgeted: budgeted.needs,
    needs_actual: actuals.needs,
    wants_budgeted: budgeted.wants,
    wants_actual: actuals.wants,
    savings_budgeted: budgeted.savings,
    savings_actual: actuals.savings,
    purchases_count: (state.purchases || []).length,
    purchases_total: (state.purchases || []).reduce((sum, p) => sum + (p.amount || 0), 0),
    spending_history_count: (state.spendingHistory || []).length,
  });

  renderBudgetVarianceCards(budgeted, actuals);
  renderBudgetVsActualChart(budgeted, actuals);
  renderVarianceSummary(budgeted, actuals, income);
}

/** Render three variance cards (Needs, Wants, Savings) */
function renderBudgetVarianceCards(budgeted, actuals) {
  const container = document.getElementById('budget-variance-cards');
  container.innerHTML = '';

  const categories = [
    { key: 'needs', label: 'Needs', color: '#6c63ff' },
    { key: 'wants', label: 'Wants', color: '#00d4aa' },
    { key: 'savings', label: 'Savings', color: '#ffa63d' },
  ];

  categories.forEach(cat => {
    const bud = budgeted[cat.key];
    const act = actuals[cat.key];
    const variance = calculateVariance(bud, act, cat.key);

    const statusColor = variance.status === 'on-track' ? '#00d4aa' : variance.status === 'caution' ? '#ffa63d' : '#ff4d6d';
    const statusLabel = variance.status === 'on-track' ? 'On Track' : variance.status === 'caution' ? 'Caution' : 'Over';

    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderLeft = `4px solid ${statusColor}`;
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <span style="font-size:12px;font-weight:700;color:${cat.color}">${cat.label}</span>
        <span style="font-size:11px;font-weight:600;padding:2px 6px;border-radius:3px;background:${statusColor}20;color:${statusColor}">${statusLabel}</span>
      </div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:4px">Budgeted</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:12px">${fmt(bud)}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:4px">Actual</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:12px">${fmt(act)}</div>
      <div style="font-size:12px;color:${statusColor};font-weight:600">
        ${variance.percent.toFixed(1)}% of budget
      </div>
    `;
    container.appendChild(card);
  });
}

/** Render Chart.js bar chart comparing budgeted vs actual */
function renderBudgetVsActualChart(budgeted, actuals) {
  const ctx = document.getElementById('budgetVsActualChart').getContext('2d');
  const labels = ['Needs', 'Wants', 'Savings'];
  const budgetedData = [budgeted.needs, budgeted.wants, budgeted.savings];
  const actualData = [actuals.needs, actuals.wants, actuals.savings];

  // Destroy existing chart if it exists
  if (window.budgetVsActualChartInstance) {
    window.budgetVsActualChartInstance.destroy();
  }

  window.budgetVsActualChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Budgeted',
          data: budgetedData,
          backgroundColor: '#6c63ff',
          borderColor: 'rgba(108, 99, 255, 0.3)',
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: 'Actual',
          data: actualData,
          backgroundColor: '#00d4aa',
          borderColor: 'rgba(0, 212, 170, 0.3)',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: '#8b95ad',
            font: { size: 12, weight: '600' },
            usePointStyle: true,
            pointStyle: 'rect',
          },
        },
        tooltip: {
          backgroundColor: 'rgba(26, 35, 50, 0.95)',
          borderColor: '#3a4456',
          borderWidth: 1,
          callbacks: {
            label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.parsed.y),
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => fmt(v),
            color: '#8b95ad',
            font: { size: 11 },
          },
          grid: { color: '#3a4456', drawBorder: false },
        },
        x: {
          ticks: { color: '#8b95ad', font: { size: 11 } },
          grid: { display: false },
        },
      },
    },
  });
}

/** Render variance summary table */
function renderVarianceSummary(budgeted, actuals, income) {
  const container = document.getElementById('budget-variance-summary');
  container.innerHTML = '';

  const categories = [
    { key: 'needs', label: 'Needs' },
    { key: 'wants', label: 'Wants' },
    { key: 'savings', label: 'Savings' },
  ];

  let html = `
    <div style="font-size:12px;overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--border-light)">
            <th style="text-align:left;padding:8px 0;color:var(--muted);font-weight:600">Category</th>
            <th style="text-align:right;padding:8px 0;color:var(--muted);font-weight:600">Budgeted</th>
            <th style="text-align:right;padding:8px 0;color:var(--muted);font-weight:600">Actual</th>
            <th style="text-align:right;padding:8px 0;color:var(--muted);font-weight:600">Variance</th>
          </tr>
        </thead>
        <tbody>
  `;

  categories.forEach(cat => {
    const bud = budgeted[cat.key];
    const act = actuals[cat.key];
    const variance = calculateVariance(bud, act, cat.key);
    const varColor = variance.status === 'on-track' ? '#00d4aa' : variance.status === 'caution' ? '#ffa63d' : '#ff4d6d';

    html += `
      <tr style="border-bottom:1px solid var(--border-light)">
        <td style="padding:8px 0;color:var(--text)">${cat.label}</td>
        <td style="text-align:right;padding:8px 0;color:var(--muted)">${fmt(bud)}</td>
        <td style="text-align:right;padding:8px 0;color:var(--text);font-weight:600">${fmt(act)}</td>
        <td style="text-align:right;padding:8px 0;color:${varColor};font-weight:600">${variance.dollar >= 0 ? '+' : ''}${fmt(variance.dollar)} (${variance.percent.toFixed(1)}%)</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
    <div style="margin-top:16px;padding:12px;background:rgba(139, 149, 173, 0.05);border-left:3px solid #8b95ad;border-radius:4px;font-size:12px;color:var(--muted);line-height:1.5">
      <strong style="color:var(--text)">Note:</strong> Actual values include both current period spending and archived spending history from this month.
    </div>
  `;

  container.innerHTML = html;
}

function toggleAnalyticsPanel() {
  const panel   = document.getElementById('analytics-panel');
  const btn     = document.getElementById('analytics-toggle-btn');
  const visible = panel.style.display !== 'none';

  if (visible) {
    // Closing panel: reset filters
    resetAnalyticsFilters();
  }

  panel.style.display = visible ? 'none' : 'block';
  btn.textContent     = visible ? '📊 Show Spending Analytics' : '📊 Hide Spending Analytics';

  if (!visible) renderSpendingAnalytics();
}

function renderSpendingAnalytics() {
  const history = getFilteredSpendingHistory();

  // ── Summary stats (calculated from filtered data) ──
  const allTimeTotal  = history.reduce((s, p) => s + p.total, 0);
  const avgPerPeriod  = history.length > 0 ? allTimeTotal / history.length : 0;
  const allPurchases  = history.flatMap(p => p.items || []);
  const largestPurch  = allPurchases.reduce((max, p) => +p.amount > max ? +p.amount : max, 0);

  // Show filter indicator if any filter is active
  const hasActiveFilters = analyticsFilters.startDate || analyticsFilters.endDate || analyticsFilters.search;
  const filterHint = hasActiveFilters
    ? ` <span style="font-size:10px;color:var(--accent)">ℹ Filters Active</span>`
    : '';

  document.getElementById('analytics-stats').innerHTML = `
    <div class="analytics-stat-card">
      <div class="analytics-stat-label">Periods Tracked${filterHint}</div>
      <div class="analytics-stat-value">${history.length}</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-label">Filtered Total</div>
      <div class="analytics-stat-value">${fmt(allTimeTotal)}</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-label">Avg / Period</div>
      <div class="analytics-stat-value">${fmt(avgPerPeriod)}</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-label">Largest Purchase</div>
      <div class="analytics-stat-value">${fmt(largestPurch)}</div>
    </div>`;

  renderAnalyticsLineChart(history);
  renderAnalyticsBarChart(history);
  renderAnalyticsHistory(history);
}

function renderAnalyticsLineChart(history) {
  if (analyticsLineChart) { analyticsLineChart.destroy(); analyticsLineChart = null; }
  if (!history.length) return;

  analyticsLineChart = new Chart(document.getElementById('analyticsLine'), {
    type: 'line',
    data: {
      labels: history.map(p => p.label || p.date),
      datasets: [{
        label: 'Spending Over Time',
        data: history.map(p => p.total),
        borderColor: '#6c63ff',
        backgroundColor: 'rgba(108,99,255,.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#6c63ff',
        pointBorderColor: '#1a2332',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#8b95ad',
            font: { size: 12, weight: '600', family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: 'rgba(26, 35, 50, 0.95)',
          titleColor: '#e8eaf0',
          bodyColor: '#e8eaf0',
          borderColor: '#3a4456',
          borderWidth: 1,
          padding: 12,
          titleFont: { size: 13, weight: '700' },
          bodyFont: { size: 12 },
          callbacks: {
            label: ctx => ' Spent: ' + fmt(ctx.parsed.y),
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#8b95ad',
            font: { size: 11, family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
            maxRotation: 45,
          },
          grid: { color: '#3a4456', drawBorder: false },
        },
        y: {
          ticks: {
            color: '#8b95ad',
            font: { size: 11, family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
            callback: v => '$' + v.toLocaleString(),
          },
          grid: { color: '#3a4456', drawBorder: false },
        },
      },
    },
  });
}

function renderAnalyticsBarChart(filteredHistory) {
  if (analyticsBarChart) { analyticsBarChart.destroy(); analyticsBarChart = null; }

  const topCats = getTopCategories(filteredHistory);
  if (!topCats.length) return;

  analyticsBarChart = new Chart(document.getElementById('analyticsBar'), {
    type: 'bar',
    data: {
      labels: topCats.map(([name]) => name),
      datasets: [{
        label: 'Top Categories',
        data: topCats.map(([, amt]) => amt),
        backgroundColor: '#00d4aa',
        borderColor: 'rgba(0, 212, 170, 0.3)',
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#8b95ad',
            font: { size: 12, weight: '600', family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'rect',
          },
        },
        tooltip: {
          backgroundColor: 'rgba(26, 35, 50, 0.95)',
          titleColor: '#e8eaf0',
          bodyColor: '#e8eaf0',
          borderColor: '#3a4456',
          borderWidth: 1,
          padding: 12,
          titleFont: { size: 13, weight: '700' },
          bodyFont: { size: 12 },
          callbacks: {
            label: ctx => ' Total: ' + fmt(ctx.parsed.x),
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#8b95ad',
            font: { size: 11, family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
            callback: v => '$' + v.toLocaleString(),
          },
          grid: { color: '#3a4456', drawBorder: false },
        },
        y: {
          ticks: {
            color: '#8b95ad',
            font: { size: 11, family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
          },
          grid: { color: '#3a4456', drawBorder: false },
        },
      },
    },
  });
}

/**
 * Aggregate spending by purchase name across filtered history periods.
 * Sorted descending, top 10. Only aggregates from the filtered history.
 */
function getTopCategories(filteredHistory) {
  const catMap = {};

  // Aggregate from filtered history only (does not include current period)
  (filteredHistory || []).forEach(period => {
    (period.items || []).forEach(p => {
      catMap[p.name] = (catMap[p.name] || 0) + +p.amount;
    });
  });

  return Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
}

function renderAnalyticsHistory(filteredHistory) {
  const container = document.getElementById('analytics-history');
  const history   = filteredHistory || [];

  if (!history.length) {
    container.innerHTML = `
      <div style="color:var(--muted);font-size:13px;text-align:center;padding:16px">
        No periods match the current filters.
      </div>`;
    return;
  }

  // Most recent first
  container.innerHTML = [...history].reverse().map(period => `
    <div class="period-history-item" id="period-${period.id}">
      <div class="period-header">
        <div>
          <span class="period-label">${period.label}</span>
          <span style="font-size:11px;color:var(--muted);margin-left:8px">${period.date}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span style="font-weight:700;color:var(--accent2)">${fmt(period.total)}</span>
          <button class="btn xs danger" onclick="deleteHistoryPeriod('${period.id}')">Delete Period</button>
        </div>
      </div>
      <div class="period-purchases">
        ${(period.items || []).length === 0
          ? '<div style="color:var(--muted);font-size:12px;padding:4px 0">No purchases in this period.</div>'
          : (period.items || []).map(p => `
            <div class="period-purchase-row">
              <span class="period-purchase-name">${p.name}</span>
              <span class="period-purchase-amt">${fmt(p.amount)}</span>
              <button class="btn xs secondary" onclick="openEditHistoryPurchase('${period.id}','${p.id}')">Edit</button>
              <button class="btn xs danger"    onclick="deleteHistoryPurchase('${period.id}','${p.id}')">×</button>
            </div>`).join('')
        }
      </div>
    </div>`).join('');
}

function openEditHistoryPurchase(periodId, purchaseId) {
  const period   = (state.spendingHistory || []).find(p => p.id === periodId);
  if (!period) return;
  const purchase = (period.items || []).find(p => p.id === purchaseId);
  if (!purchase) return;

  openModal(
    'Edit Purchase',
    mField('Item Name', 'mhp-name', 'text', purchase.name, '') +
    mField('Amount ($)', 'mhp-amount', 'number', purchase.amount, '0.00', 'min="0" step="0.01"'),
    () => {
      const name   = document.getElementById('mhp-name').value.trim();
      const amount = parseFloat(document.getElementById('mhp-amount').value);
      if (!name || isNaN(amount)) return;
      Object.assign(purchase, { name, amount });
      // Recalculate period total after edit
      period.total = period.items.reduce((s, p) => s + +p.amount, 0);
      saveToStorage();
      renderAnalyticsHistory();
      closeModal();
    }
  );
}

function deleteHistoryPurchase(periodId, purchaseId) {
  const period = (state.spendingHistory || []).find(p => p.id === periodId);
  if (!period || !confirm('Remove this purchase from history?')) return;
  period.items = period.items.filter(p => p.id !== purchaseId);
  period.total = period.items.reduce((s, p) => s + +p.amount, 0);
  saveToStorage();
  renderSpendingAnalytics();
}

function deleteHistoryPeriod(periodId) {
  if (!confirm('Delete this entire spending period from history?')) return;
  state.spendingHistory = state.spendingHistory.filter(p => p.id !== periodId);
  saveToStorage();
  renderSpendingAnalytics();
}

// ────────────────────────────────────────────────────────────────
// RENDER — EXPENSE CARDS (dynamic)
// ────────────────────────────────────────────────────────────────
function renderExpenseCards() {
  const cards = state.expenseCards || [];
  const grid  = document.getElementById('expense-cards-grid');
  const empty = document.getElementById('expense-empty-state');
  const count = document.getElementById('disp-card-count');

  grid.innerHTML = '';

  const hasCards = cards.length > 0;
  empty.style.display = hasCards ? 'none' : 'block';
  count.textContent   = hasCards
    ? `across ${cards.length} payment card${cards.length !== 1 ? 's' : ''}`
    : 'no payment cards added';

  cards.forEach(card => {
    const cardTotal = (card.items || []).reduce((s, i) => s + monthlyAmount(i), 0);
    const div = document.createElement('div');
    div.className = 'card';
    div.id        = 'ecard-' + card.id;

    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="card-title">${card.label}</div>
        <div style="display:flex;gap:4px">
          <button class="btn icon-btn" onclick="openEditExpenseCard('${card.id}')" title="Rename card">✎</button>
          <button class="btn icon-btn del" onclick="deleteExpenseCard('${card.id}')" title="Delete card">×</button>
        </div>
      </div>
      <ul class="expense-list" id="list-${card.id}"></ul>
      <div style="display:flex;justify-content:space-between;align-items:center;
                  padding:8px 0;border-top:1px solid var(--border);margin-top:4px">
        <span style="font-size:11px;font-weight:700;letter-spacing:.6px;color:var(--muted)">TOTAL</span>
        <span style="font-weight:700" id="total-${card.id}">${fmt(cardTotal)}</span>
      </div>
      <div class="add-row" style="margin-top:8px">
        <input id="new-name-${card.id}"   placeholder="Expense name" style="flex:2;min-width:80px" />
        <input id="new-amount-${card.id}" type="number" placeholder="$0.00"
               min="0" step="0.01" style="max-width:80px" />
        <label style="display:flex;align-items:center;gap:3px;font-size:11px;
                       color:var(--muted);white-space:nowrap;cursor:pointer">
          <input type="checkbox" id="new-bw-${card.id}" /> Bi-wk
        </label>
        <button class="btn sm" onclick="addExpense('${card.id}')">Add</button>
      </div>`;

    grid.appendChild(div);

    // Populate expense items list
    const ul = div.querySelector('#list-' + card.id);
    (card.items || []).forEach(item => {
      const li = document.createElement('li');
      li.className = 'expense-item';
      li.innerHTML = `
        <span class="e-name">${item.name}</span>
        ${item.biweekly ? '<span class="e-biweekly">bi-wk ×2</span>' : ''}
        <span class="e-amount">${fmt(monthlyAmount(item))}</span>
        <button class="btn icon-btn del"
                onclick="removeExpense('${card.id}','${item.id}')">×</button>`;
      ul.appendChild(li);
    });
  });

  // Update summary totals
  const grand       = grandTotal();
  const needsBudget = getTotalMonthlyIncome() * getAlloc().needs;
  const remaining   = needsBudget - grand;

  document.getElementById('disp-grand-total').textContent     = fmt(grand);
  document.getElementById('disp-needs-remaining').textContent = fmt(remaining);
  document.getElementById('disp-needs-used-pct').textContent  = remaining >= 0
    ? `${pct(grand, needsBudget)}% of needs budget used`
    : `Over needs budget by ${fmt(Math.abs(remaining))}`;

  const statusCard = document.getElementById('needs-status-card');
  statusCard.className = 'card ' + (remaining >= 0 ? '' : 'danger');
  document.getElementById('disp-needs-remaining').style.color =
    remaining >= 0 ? 'var(--accent2)' : 'var(--danger)';
}

function addExpense(cardId) {
  const card = (state.expenseCards || []).find(c => c.id === cardId);
  if (!card) return;

  const name     = document.getElementById('new-name-'   + cardId).value.trim();
  const amount   = parseFloat(document.getElementById('new-amount-' + cardId).value);
  const biweekly = document.getElementById('new-bw-'     + cardId).checked;
  if (!name || isNaN(amount) || amount <= 0) return;

  card.items.push({ id: genId(), name, amount, biweekly });
  document.getElementById('new-name-'   + cardId).value   = '';
  document.getElementById('new-amount-' + cardId).value   = '';
  document.getElementById('new-bw-'     + cardId).checked = false;
  saveToStorage();
  renderAll();
}

function removeExpense(cardId, itemId) {
  const card = (state.expenseCards || []).find(c => c.id === cardId);
  if (!card) return;
  card.items = card.items.filter(i => i.id !== itemId);
  saveToStorage();
  renderAll();
}

function openAddExpenseCard() {
  openModal(
    'Add Payment Card',
    mField('Card Label', 'mec-label', 'text', '', 'e.g. TD Debit'),
    () => {
      const label = document.getElementById('mec-label').value.trim();
      if (!label) return;
      state.expenseCards.push({ id: genId(), label, items: [] });
      saveToStorage();
      renderAll();
      closeModal();
    }
  );
}

function openEditExpenseCard(id) {
  const card = (state.expenseCards || []).find(c => c.id === id);
  if (!card) return;
  openModal(
    'Rename Payment Card',
    mField('Card Label', 'mec-label', 'text', card.label, ''),
    () => {
      const label = document.getElementById('mec-label').value.trim();
      if (!label) return;
      card.label = label;
      saveToStorage();
      renderAll();
      closeModal();
    }
  );
}

function deleteExpenseCard(id) {
  if (!confirm('Delete this payment card and all its expenses?')) return;
  state.expenseCards = state.expenseCards.filter(c => c.id !== id);
  saveToStorage();
  renderAll();
}

// ────────────────────────────────────────────────────────────────
// RENDER — LOANS (full CRUD)
// ────────────────────────────────────────────────────────────────
function renderLoans() {
  const grid = document.getElementById('loans-grid');
  grid.innerHTML = '';

  (state.loans || []).forEach(loan => {
    const pctUsed = (+loan.remaining / +loan.original) * 100;
    const colour  = pctUsed > 70 ? '#ff4d6d' : pctUsed > 40 ? '#ffa63d' : '#00d4aa';
    const div = document.createElement('div');
    div.className = 'card loan-card';
    div.innerHTML = `
      <div class="loan-name">${loan.name}</div>
      <div class="loan-amounts">
        <span>${fmt(loan.remaining)} remaining</span>
        <span>${pct(loan.remaining, loan.original)}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill"
             style="width:${Math.min(100, pctUsed).toFixed(1)}%;background:${colour}"></div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">of ${fmt(loan.original)} original</div>
      <div class="loan-actions">
        <button class="btn xs secondary" onclick="openEditLoan('${loan.id}')">Edit</button>
        <button class="btn xs danger"    onclick="deleteLoan('${loan.id}')">Delete</button>
      </div>`;
    grid.appendChild(div);
  });
}

function openAddLoan() {
  openModal(
    'Add Loan',
    mField('Loan Name', 'ml-name', 'text', '', 'e.g. Car Loan') +
    '<div class="modal-row">' +
    mField('Remaining Balance ($)', 'ml-rem',  'number', '', '0.00', 'min="0" step="0.01"') +
    mField('Original Balance ($)',  'ml-orig', 'number', '', '0.00', 'min="0" step="0.01"') +
    '</div>',
    () => {
      const name = document.getElementById('ml-name').value.trim();
      const rem  = parseFloat(document.getElementById('ml-rem').value);
      const orig = parseFloat(document.getElementById('ml-orig').value);
      if (!name || isNaN(rem) || isNaN(orig)) return;
      state.loans.push({ id: genId(), name, remaining: rem, original: orig });
      saveToStorage(); renderLoans(); closeModal();
    }
  );
}

function openEditLoan(id) {
  const loan = state.loans.find(l => l.id === id);
  if (!loan) return;
  openModal(
    'Edit Loan',
    mField('Loan Name', 'ml-name', 'text', loan.name, '') +
    '<div class="modal-row">' +
    mField('Remaining Balance ($)', 'ml-rem',  'number', loan.remaining, '0.00', 'min="0" step="0.01"') +
    mField('Original Balance ($)',  'ml-orig', 'number', loan.original,  '0.00', 'min="0" step="0.01"') +
    '</div>',
    () => {
      const name = document.getElementById('ml-name').value.trim();
      const rem  = parseFloat(document.getElementById('ml-rem').value);
      const orig = parseFloat(document.getElementById('ml-orig').value);
      if (!name || isNaN(rem) || isNaN(orig)) return;
      Object.assign(loan, { name, remaining: rem, original: orig });
      saveToStorage(); renderLoans(); closeModal();
    }
  );
}

function deleteLoan(id) {
  if (!confirm('Delete this loan?')) return;
  state.loans = state.loans.filter(l => l.id !== id);
  saveToStorage(); renderLoans();
}

// ────────────────────────────────────────────────────────────────
// RENDER — CREDIT CARDS (full CRUD)
// ────────────────────────────────────────────────────────────────
function renderCreditCards() {
  const cards     = state.creditCards || [];
  const container = document.getElementById('cc-bars-container');
  container.innerHTML = '';

  let totalBal = 0;
  let totalLim = 0;

  cards.forEach(cc => {
    totalBal += +cc.balance;
    totalLim += +cc.limit;

    const usePct  = (+cc.balance / +cc.limit) * 100;
    const colour  = usePct > 50 ? '#ff4d6d' : usePct > 30 ? '#ffa63d' : '#00d4aa';
    const chipCls = usePct > 30 ? 'red' : 'green';

    const div = document.createElement('div');
    div.className = 'cc-bar-wrap';
    div.innerHTML = `
      <div class="cc-bar-header">
        <span style="font-weight:600">${cc.name}</span>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <span>
            ${fmt(cc.balance)} / ${fmt(cc.limit)}
            <span class="chip ${chipCls}">${usePct.toFixed(0)}%</span>
          </span>
          <button class="btn icon-btn" onclick="openEditCreditCard('${cc.id}')" title="Edit">✎</button>
          <button class="btn icon-btn del" onclick="deleteCreditCard('${cc.id}')" title="Delete">×</button>
        </div>
      </div>
      <div class="cc-bar-track">
        <div class="cc-bar-fill"
             style="width:${Math.min(100, usePct).toFixed(1)}%;background:${colour}"></div>
        <div class="cc-bar-threshold" style="left:30%"></div>
      </div>`;
    container.appendChild(div);
  });

  const totalPct = totalLim > 0 ? (totalBal / totalLim) * 100 : 0;
  document.getElementById('cc-total-balance').textContent = fmt(totalBal);
  document.getElementById('cc-total-limit').textContent   = fmt(totalLim);
  document.getElementById('cc-total-chip').innerHTML =
    `<span class="chip ${totalPct > 30 ? 'red' : 'green'}">${totalPct.toFixed(1)}% total</span>`;

  renderCcBarChart(cards);
}

function renderCcBarChart(cards) {
  if (ccChart) ccChart.destroy();
  ccChart = new Chart(document.getElementById('ccBar'), {
    type: 'bar',
    data: {
      labels: cards.map(c => c.name.split(' ').slice(0, 2).join(' ')),
      datasets: [
        {
          label: 'Balance',
          data: cards.map(c => +c.balance),
          backgroundColor: cards.map(c => {
            const p = (+c.balance / +c.limit) * 100;
            return p > 50 ? '#ff4d6d' : p > 30 ? '#ffa63d' : '#00d4aa';
          }),
          borderColor: 'transparent',
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Available',
          data: cards.map(c => Math.max(0, +c.limit - +c.balance)),
          backgroundColor: '#3a4456',
          borderColor: 'transparent',
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      stacked: true,
      plugins: {
        legend: {
          labels: {
            color: '#8b95ad',
            font: { size: 12, weight: '600', family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
            padding: 14,
            usePointStyle: true,
            pointStyle: 'rect',
          },
        },
        tooltip: {
          backgroundColor: 'rgba(26, 35, 50, 0.95)',
          titleColor: '#e8eaf0',
          bodyColor: '#e8eaf0',
          borderColor: '#3a4456',
          borderWidth: 1,
          padding: 12,
          titleFont: { size: 13, weight: '700' },
          bodyFont: { size: 12 },
          callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.parsed.y) },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#8b95ad',
            font: { size: 11, family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
          },
          grid: { color: '#3a4456', drawBorder: false },
        },
        y: {
          ticks: {
            color: '#8b95ad',
            font: { size: 11, family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
            callback: v => '$' + v.toLocaleString(),
          },
          grid: { color: '#3a4456', drawBorder: false },
        },
      },
    },
  });
}

function openAddCreditCard() {
  openModal(
    'Add Credit Card',
    mField('Card Name', 'cc-name', 'text', '', 'e.g. TD Small CC (9602)') +
    '<div class="modal-row">' +
    mField('Balance ($)', 'cc-balance', 'number', '', '0.00', 'min="0" step="0.01"') +
    mField('Limit ($)',   'cc-limit',   'number', '', '0.00', 'min="0" step="0.01"') +
    '</div>',
    () => {
      const name    = document.getElementById('cc-name').value.trim();
      const balance = parseFloat(document.getElementById('cc-balance').value);
      const limit   = parseFloat(document.getElementById('cc-limit').value);
      if (!name || isNaN(balance) || isNaN(limit)) return;
      state.creditCards.push({ id: genId(), name, balance, limit });
      saveToStorage(); renderCreditCards(); closeModal();
    }
  );
}

function openEditCreditCard(id) {
  const cc = state.creditCards.find(c => c.id === id);
  if (!cc) return;
  openModal(
    'Edit Credit Card',
    mField('Card Name', 'cc-name', 'text', cc.name, '') +
    '<div class="modal-row">' +
    mField('Balance ($)', 'cc-balance', 'number', cc.balance, '0.00', 'min="0" step="0.01"') +
    mField('Limit ($)',   'cc-limit',   'number', cc.limit,   '0.00', 'min="0" step="0.01"') +
    '</div>',
    () => {
      const name    = document.getElementById('cc-name').value.trim();
      const balance = parseFloat(document.getElementById('cc-balance').value);
      const limit   = parseFloat(document.getElementById('cc-limit').value);
      if (!name || isNaN(balance) || isNaN(limit)) return;
      Object.assign(cc, { name, balance, limit });
      saveToStorage(); renderCreditCards(); closeModal();
    }
  );
}

function deleteCreditCard(id) {
  if (!confirm('Delete this credit card?')) return;
  state.creditCards = state.creditCards.filter(c => c.id !== id);
  saveToStorage(); renderCreditCards();
}

// ────────────────────────────────────────────────────────────────
// RENDER — SAVINGS (full CRUD with per-account allocation)
// ────────────────────────────────────────────────────────────────
function renderSavings() {
  const today     = new Date();
  const year      = today.getFullYear();
  const month     = today.getMonth() + 1;
  const budget    = getTotalMonthlyIncome() * getAlloc().savings;
  const accounts  = state.savingsAccounts || [];
  const allocated   = accounts.reduce((s, a) => s + getAllocationForMonth(a, year, month), 0);
  const unallocated = budget - allocated;
  const allocPct    = budget > 0 ? Math.min(100, (allocated / budget) * 100) : 0;

  document.getElementById('disp-savings').textContent             = fmt(budget);
  document.getElementById('disp-savings-allocated').textContent   = fmt(allocated);
  document.getElementById('disp-savings-unallocated').textContent = fmt(unallocated);
  document.getElementById('disp-savings-unallocated').style.color =
    unallocated >= 0 ? 'var(--text)' : 'var(--danger)';

  document.getElementById('savings-alloc-pct').textContent      = allocPct.toFixed(0) + '%';
  document.getElementById('savings-alloc-bar').style.width      = allocPct.toFixed(1) + '%';
  document.getElementById('savings-alloc-bar').style.background =
    allocPct > 100 ? 'var(--danger)' : allocPct >= 90 ? 'var(--warn)' : 'var(--accent2)';

  const ul = document.getElementById('savings-accounts-list');
  ul.innerHTML = '';
  accounts.forEach(acct => {
    const monthlyAlloc = getAllocationForMonth(acct, year, month);
    const li = document.createElement('li');
    li.className = 'savings-acct-item';
    li.innerHTML = `
      <span class="dot"></span>
      <span class="acct-name">${acct.name}</span>
      <div class="acct-details">
        <span class="acct-balance">Balance: ${fmt(acct.balance || 0)}</span>
        <span class="acct-monthly">Monthly: ${fmt(monthlyAlloc)}</span>
      </div>
      <button class="btn icon-btn" onclick="openEditSavingsAccount('${acct.id}')" title="Edit">✎</button>
      <button class="btn icon-btn del" onclick="deleteSavingsAccount('${acct.id}')" title="Delete">×</button>`;
    ul.appendChild(li);
  });
}

function addSavingsAccount() {
  const name               = document.getElementById('new-savings-name').value.trim();
  const defaultAllocated   = parseFloat(document.getElementById('new-savings-amount').value) || 0;
  if (!name) return;
  state.savingsAccounts.push({
    id: genId(),
    name,
    balance: 0,
    defaultAllocated,
    monthlyAllocations: {}
  });
  document.getElementById('new-savings-name').value   = '';
  document.getElementById('new-savings-amount').value = '';
  saveToStorage(); renderSavings();
}

function openEditSavingsAccount(id) {
  const acct = (state.savingsAccounts || []).find(a => a.id === id);
  if (!acct) return;
  openModal(
    'Edit Savings Account',
    mField('Account Name', 'msa-name', 'text', acct.name, '') +
    '<div class="modal-row">' +
    mField('Current Balance ($)', 'msa-balance', 'number', acct.balance || 0, '0.00', 'min="0" step="0.01"') +
    mField('Monthly Allocation ($)', 'msa-default-alloc', 'number', acct.defaultAllocated || 0, '0.00', 'min="0" step="0.01"') +
    '</div>',
    () => {
      const name               = document.getElementById('msa-name').value.trim();
      const balance            = parseFloat(document.getElementById('msa-balance').value);
      const defaultAllocated   = parseFloat(document.getElementById('msa-default-alloc').value);
      if (!name || isNaN(balance) || isNaN(defaultAllocated)) return;
      Object.assign(acct, { name, balance, defaultAllocated });
      saveToStorage(); renderSavings(); closeModal();
    }
  );
}

function deleteSavingsAccount(id) {
  if (!confirm('Remove this savings account?')) return;
  state.savingsAccounts = state.savingsAccounts.filter(a => a.id !== id);
  saveToStorage(); renderSavings();
}

function openAllocateSavingsModal() {
  const today      = new Date();
  const year       = today.getFullYear();
  const month      = today.getMonth() + 1;
  const monthStr   = `${year}-${String(month).padStart(2, '0')}`;
  const monthName  = today.toLocaleString('en-CA', { month: 'long', year: 'numeric' });

  const budget     = getTotalMonthlyIncome() * getAlloc().savings;
  const accounts   = state.savingsAccounts || [];

  // Build modal body with allocation inputs
  let bodyHTML = `
    <div style="margin-bottom: 16px; padding: 12px; background: var(--surface); border-radius: 8px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-size: 13px;">
        <div>
          <div style="color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Monthly Savings Budget</div>
          <div style="font-size: 18px; font-weight: 700; margin-top: 4px;">${fmt(budget)}</div>
        </div>
        <div>
          <div style="color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Currently Allocated</div>
          <div style="font-size: 18px; font-weight: 700; margin-top: 4px;" id="alloc-current">—</div>
        </div>
        <div>
          <div style="color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Remaining</div>
          <div style="font-size: 18px; font-weight: 700; margin-top: 4px;" id="alloc-remaining">—</div>
        </div>
      </div>
    </div>

    <div style="font-size: 12px; color: var(--muted); margin-bottom: 12px;">Allocating for: <strong>${monthName}</strong></div>

    <div id="allocation-fields" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
  `;

  accounts.forEach(acct => {
    const currentMonthAlloc = getAllocationForMonth(acct, year, month);
    bodyHTML += `
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; align-items: center; padding: 8px; background: var(--surface); border-radius: 6px;">
        <span style="font-weight: 600; font-size: 13px;">${acct.name}</span>
        <input type="number" class="alloc-input" id="alloc-${acct.id}" value="${currentMonthAlloc}" min="0" step="0.01" style="font-size: 13px; padding: 6px;">
      </div>
    `;
  });

  bodyHTML += `
    </div>
    <div style="font-size: 12px; color: var(--muted); padding: 10px; background: var(--surface); border-radius: 6px; border-left: 3px solid var(--accent2);">
      💡 Adjust amounts per account. Total must not exceed budget. Changes apply to <strong>${monthName}</strong> only.
    </div>
  `;

  openModal(
    'Allocate Monthly Savings Budget',
    bodyHTML,
    () => {
      // Validate and update allocations
      let totalAllocated = 0;
      const updates = {};

      accounts.forEach(acct => {
        const input = document.getElementById(`alloc-${acct.id}`);
        const value = parseFloat(input.value) || 0;
        totalAllocated += value;
        updates[acct.id] = value;
      });

      if (totalAllocated > budget) {
        alert(`❌ Total allocation ($${totalAllocated.toFixed(2)}) exceeds budget ($${budget.toFixed(2)})`);
        return;
      }

      // Save allocations to monthlyAllocations
      accounts.forEach(acct => {
        if (!acct.monthlyAllocations) acct.monthlyAllocations = {};
        const newValue = updates[acct.id];
        const defaultValue = acct.defaultAllocated;

        // Only store override if different from default
        if (newValue !== defaultValue) {
          acct.monthlyAllocations[monthStr] = newValue;
        } else {
          delete acct.monthlyAllocations[monthStr];
        }
      });

      saveToStorage();
      renderSavings();
      renderBudgetVsActual();
      closeModal();
      alert('✓ Allocation updated for ' + monthName);
    }
  );

  // Real-time validation
  const updateValidation = () => {
    let total = 0;
    accounts.forEach(acct => {
      const input = document.getElementById(`alloc-${acct.id}`);
      total += parseFloat(input.value) || 0;
    });

    const remaining = budget - total;
    const color = remaining < 0 ? 'var(--danger)' : 'var(--text)';

    document.getElementById('alloc-current').textContent = fmt(total);
    document.getElementById('alloc-remaining').textContent = fmt(remaining);
    document.getElementById('alloc-remaining').style.color = color;
  };

  // Attach event listeners after modal is rendered
  setTimeout(() => {
    document.querySelectorAll('.alloc-input').forEach(input => {
      input.addEventListener('input', updateValidation);
    });
    updateValidation();
  }, 0);
}

// ────────────────────────────────────────────────────────────────
// RENDER — SAVINGS GOALS (full CRUD)
// ────────────────────────────────────────────────────────────────
function renderGoals() {
  const container = document.getElementById('goals-list');
  if (!container) return; // Section not in DOM yet

  const goals = state.goals || [];

  if (goals.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); padding: 16px 0;">No savings goals yet. Add one to get started!</p>';
    return;
  }

  container.innerHTML = '';
  goals.forEach(goal => {
    const progress = getGoalProgress(goal);
    if (!progress) return; // Account not found

    const li = document.createElement('div');
    li.className = `goal-item goal-status-${progress.status}`;
    li.innerHTML = `
      <div class="goal-header">
        <span class="goal-account-name">${progress.accountName}</span>
        <span class="goal-target">${fmt(progress.targetAmount)} by ${progress.targetDate}</span>
        <div style="margin-left: auto; display: flex; gap: 8px;">
          <button class="btn icon-btn" onclick="openEditGoal('${goal.id}')" title="Edit">✎</button>
          <button class="btn icon-btn del" onclick="deleteGoal('${goal.id}')" title="Delete">×</button>
        </div>
      </div>

      <div class="goal-progress-container">
        <div class="progress-bar" style="width: ${progress.progressPercent.toFixed(1)}%;">
          <span class="progress-label">${fmt(progress.currentAmount)} / ${fmt(progress.targetAmount)}</span>
        </div>
      </div>

      <div class="goal-stats">
        <div class="stat">
          <span class="stat-label">Monthly Needed</span>
          <span class="stat-value">${fmt(progress.monthlySavingsNeeded)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Time Remaining</span>
          <span class="stat-value">${progress.monthsRemaining} month${progress.monthsRemaining !== 1 ? 's' : ''}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Status</span>
          <span class="status-badge status-${progress.status}">
            ${progress.status === 'on-track' ? '✓ On Track' : progress.status === 'caution' ? '⚠ Caution' : progress.status === 'complete' ? '✓ Complete' : '✗ Off Track'}
          </span>
        </div>
      </div>
    `;
    container.appendChild(li);
  });
}

function openAddGoal() {
  const accounts = state.savingsAccounts || [];
  if (accounts.length === 0) {
    alert('Please add a savings account first');
    return;
  }

  let accountDropdown = '<select id="goal-account-id" required><option value="">Select Account</option>';
  accounts.forEach(acct => {
    accountDropdown += `<option value="${acct.id}">${acct.name}</option>`;
  });
  accountDropdown += '</select>';

  openModal(
    'Add Savings Goal',
    accountDropdown +
    mField('Target Amount ($)', 'goal-target-amount', 'number', '', '0.00', 'min="0" step="0.01" required') +
    mField('Target Date (YYYY-MM)', 'goal-target-date', 'month', '', ''),
    () => {
      const accountId = document.getElementById('goal-account-id').value;
      const targetAmount = parseFloat(document.getElementById('goal-target-amount').value);
      const targetDate = document.getElementById('goal-target-date').value;

      if (!accountId || isNaN(targetAmount) || !targetDate) {
        alert('Please fill in all fields');
        return;
      }

      state.goals.push({ id: genId(), accountId, targetAmount, targetDate });
      saveToStorage(); renderGoals(); closeModal();
    }
  );
}

function openEditGoal(id) {
  const goal = (state.goals || []).find(g => g.id === id);
  if (!goal) return;

  const accounts = state.savingsAccounts || [];
  let accountDropdown = '<select id="goal-account-id" required><option value="">Select Account</option>';
  accounts.forEach(acct => {
    const selected = acct.id === goal.accountId ? 'selected' : '';
    accountDropdown += `<option value="${acct.id}" ${selected}>${acct.name}</option>`;
  });
  accountDropdown += '</select>';

  openModal(
    'Edit Savings Goal',
    accountDropdown +
    mField('Target Amount ($)', 'goal-target-amount', 'number', goal.targetAmount, '0.00', 'min="0" step="0.01"') +
    mField('Target Date (YYYY-MM)', 'goal-target-date', 'month', goal.targetDate, ''),
    () => {
      const accountId = document.getElementById('goal-account-id').value;
      const targetAmount = parseFloat(document.getElementById('goal-target-amount').value);
      const targetDate = document.getElementById('goal-target-date').value;

      if (!accountId || isNaN(targetAmount) || !targetDate) {
        alert('Please fill in all fields');
        return;
      }

      Object.assign(goal, { accountId, targetAmount, targetDate });
      saveToStorage(); renderGoals(); closeModal();
    }
  );
}

function deleteGoal(id) {
  if (!confirm('Delete this savings goal?')) return;
  state.goals = (state.goals || []).filter(g => g.id !== id);
  saveToStorage(); renderGoals();
}

// ────────────────────────────────────────────────────────────────
// RENDER — SUBSCRIPTIONS (full CRUD)
// ────────────────────────────────────────────────────────────────
function renderSubscriptions() {
  const ul     = document.getElementById('sub-list');
  ul.innerHTML = '';

  const sorted = [...(state.subscriptions || [])].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  sorted.forEach(sub => {
    const days    = daysUntil(sub.date);
    const chipCls = days < 0 ? 'red' : days < 60 ? 'warn' : 'green';
    const chipTxt = days < 0 ? 'Expired' : days === 0 ? 'Today!' : `${days}d`;
    const li = document.createElement('li');
    li.className = 'sub-item';
    li.innerHTML = `
      <span class="sub-name">${sub.name}</span>
      <span class="sub-date">${sub.date}</span>
      <span class="chip ${chipCls}">${chipTxt}</span>
      <button class="btn icon-btn" onclick="openEditSubscription('${sub.id}')" title="Edit">✎</button>
      <button class="btn icon-btn del" onclick="deleteSubscription('${sub.id}')" title="Delete">×</button>`;
    ul.appendChild(li);
  });
}

function addSubscription() {
  const name = document.getElementById('new-sub-name').value.trim();
  const date = document.getElementById('new-sub-date').value;
  if (!name || !date) return;
  state.subscriptions.push({ id: genId(), name, date });
  document.getElementById('new-sub-name').value = '';
  document.getElementById('new-sub-date').value = '';
  saveToStorage(); renderSubscriptions();
}

function openEditSubscription(id) {
  const sub = (state.subscriptions || []).find(s => s.id === id);
  if (!sub) return;
  openModal(
    'Edit Subscription',
    mField('Service Name', 'ms-name', 'text', sub.name, '') +
    mField('Renewal Date', 'ms-date', 'date', sub.date, ''),
    () => {
      const name = document.getElementById('ms-name').value.trim();
      const date = document.getElementById('ms-date').value;
      if (!name || !date) return;
      Object.assign(sub, { name, date });
      saveToStorage(); renderSubscriptions(); closeModal();
    }
  );
}

function deleteSubscription(id) {
  if (!confirm('Remove this subscription?')) return;
  state.subscriptions = state.subscriptions.filter(s => s.id !== id);
  saveToStorage(); renderSubscriptions();
}

// ────────────────────────────────────────────────────────────────
// RENDER — WISHLIST (full CRUD)
// ────────────────────────────────────────────────────────────────
function renderWishlist() {
  const ul     = document.getElementById('wishlist');
  ul.innerHTML = '';

  (state.wishlist || []).forEach(item => {
    const li = document.createElement('li');
    li.className = 'wish-item';
    li.innerHTML = `
      <span class="wish-icon">${item.icon || '🛒'}</span>
      <span class="wish-name">${item.name}</span>
      ${item.url
        ? `<a class="wish-link" href="${item.url}" target="_blank" rel="noopener">Link ↗</a>`
        : ''}
      <div class="wish-actions">
        <button class="btn icon-btn" onclick="openEditWishlistItem('${item.id}')" title="Edit">✎</button>
        <button class="btn icon-btn del" onclick="deleteWishlistItem('${item.id}')" title="Delete">×</button>
      </div>`;
    ul.appendChild(li);
  });
}

function addWishlistItem() {
  const icon = document.getElementById('new-wish-icon').value.trim() || '🛒';
  const name = document.getElementById('new-wish-name').value.trim();
  const url  = document.getElementById('new-wish-url').value.trim();
  if (!name) return;
  state.wishlist.push({ id: genId(), icon, name, url });
  document.getElementById('new-wish-icon').value = '';
  document.getElementById('new-wish-name').value = '';
  document.getElementById('new-wish-url').value  = '';
  saveToStorage(); renderWishlist();
}

function openEditWishlistItem(id) {
  const item = (state.wishlist || []).find(w => w.id === id);
  if (!item) return;
  openModal(
    'Edit Wishlist Item',
    mField('Icon / Emoji',   'mw-icon', 'text', item.icon || '', '🛒') +
    mField('Item Name',      'mw-name', 'text', item.name, '') +
    mField('URL (optional)', 'mw-url',  'text', item.url  || '', 'https://...'),
    () => {
      const icon = document.getElementById('mw-icon').value.trim() || '🛒';
      const name = document.getElementById('mw-name').value.trim();
      const url  = document.getElementById('mw-url').value.trim();
      if (!name) return;
      Object.assign(item, { icon, name, url });
      saveToStorage(); renderWishlist(); closeModal();
    }
  );
}

function deleteWishlistItem(id) {
  if (!confirm('Remove this item from the wishlist?')) return;
  state.wishlist = state.wishlist.filter(w => w.id !== id);
  saveToStorage(); renderWishlist();
}

// ────────────────────────────────────────────────────────────────
// CSV EXPORT / IMPORT
// ────────────────────────────────────────────────────────────────

/** Escape a value for safe CSV embedding (RFC 4180) */
function csvEscape(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Parse a single CSV row into an array of field strings */
function parseCSVRow(row) {
  const fields = [];
  let cur = '', inQ = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQ && row[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      fields.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

/**
 * Export the entire state as a structured multi-section CSV file.
 * Triggers a download in the browser.
 */
function exportCsv() {
  const rows  = [];
  const e     = csvEscape;
  const today = new Date().toISOString().split('T')[0];

  // ── Meta ──
  rows.push('SECTION:meta', 'key,value', `exported,${today}`, '');

  // ── Allocation ──
  rows.push('SECTION:allocation', 'needs,wants,savings',
    `${state.allocation.needs},${state.allocation.wants},${state.allocation.savings}`, '');

  // ── Budget display mode ──
  rows.push('SECTION:budgetDisplayMode', 'needs,wants,savings',
    `${state.budgetDisplayMode.needs || 'monthly'},${state.budgetDisplayMode.wants || 'monthly'},${state.budgetDisplayMode.savings || 'monthly'}`, '');

  // ── Savings available ──

  // ── Income streams ──
  rows.push('SECTION:incomeStreams', 'id,name,amount,biweekly');
  (state.incomeStreams || []).forEach(s =>
    rows.push(`${e(s.id)},${e(s.name)},${s.amount},${s.biweekly}`)
  );
  rows.push('');

  // ── Expense cards (flattened: one row per item, card metadata repeated) ──
  rows.push('SECTION:expenseCards', 'cardId,cardLabel,itemId,itemName,itemAmount,itemBiweekly');
  (state.expenseCards || []).forEach(card => {
    if (!(card.items || []).length) {
      // Card with no items — emit one row so the card itself is preserved
      rows.push(`${e(card.id)},${e(card.label)},,,, `);
    } else {
      card.items.forEach(item =>
        rows.push(`${e(card.id)},${e(card.label)},${e(item.id)},${e(item.name)},${item.amount},${item.biweekly}`)
      );
    }
  });
  rows.push('');

  // ── Current-period purchases ──
  rows.push('SECTION:purchases', 'id,name,amount');
  (state.purchases || []).forEach(p => rows.push(`${e(p.id)},${e(p.name)},${p.amount}`));
  rows.push('');

  // ── Spending history (flattened: one row per purchase, period metadata repeated) ──
  rows.push('SECTION:spendingHistory',
    'periodId,periodDate,periodLabel,periodTotal,purchaseId,purchaseName,purchaseAmount');
  (state.spendingHistory || []).forEach(period => {
    if (!(period.items || []).length) {
      rows.push(`${e(period.id)},${e(period.date)},${e(period.label)},${period.total},,,`);
    } else {
      period.items.forEach(p =>
        rows.push(`${e(period.id)},${e(period.date)},${e(period.label)},${period.total},${e(p.id)},${e(p.name)},${p.amount}`)
      );
    }
  });
  rows.push('');

  // ── Loans ──
  rows.push('SECTION:loans', 'id,name,remaining,original');
  (state.loans || []).forEach(l =>
    rows.push(`${e(l.id)},${e(l.name)},${l.remaining},${l.original}`)
  );
  rows.push('');

  // ── Credit cards ──
  rows.push('SECTION:creditCards', 'id,name,balance,limit');
  (state.creditCards || []).forEach(c =>
    rows.push(`${e(c.id)},${e(c.name)},${c.balance},${c.limit}`)
  );
  rows.push('');

  // ── Subscriptions ──
  rows.push('SECTION:subscriptions', 'id,name,date');
  (state.subscriptions || []).forEach(s => rows.push(`${e(s.id)},${e(s.name)},${s.date}`));
  rows.push('');

  // ── Wishlist ──
  rows.push('SECTION:wishlist', 'id,icon,name,url');
  (state.wishlist || []).forEach(w =>
    rows.push(`${e(w.id)},${e(w.icon || '')},${e(w.name)},${e(w.url || '')}`)
  );
  rows.push('');

  // ── Savings accounts ──
  rows.push('SECTION:savingsAccounts', 'id,name,balance,defaultAllocated,monthlyAllocations');
  (state.savingsAccounts || []).forEach(a =>
    rows.push(`${e(a.id)},${e(a.name)},${a.balance || 0},${a.defaultAllocated || 0},${e(JSON.stringify(a.monthlyAllocations || {}))}`)
  );
  rows.push('');

  // ── Savings goals ──
  rows.push('SECTION:goals', 'id,accountId,targetAmount,targetDate');
  (state.goals || []).forEach(g =>
    rows.push(`${e(g.id)},${e(g.accountId)},${g.targetAmount},${g.targetDate}`)
  );
  rows.push('');

  // ── Trigger download ──
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), {
    href: url, download: `penny-export-${today}.csv`,
  });
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Read a CSV file selected by the user and restore state from it.
 * Prompts for confirmation before replacing current data.
 */
function importCsv(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const newState = parseCsv(e.target.result);
      if (!confirm('Import this CSV? This will replace all current data.')) {
        event.target.value = '';
        return;
      }
      state = newState;
      saveToStorage();
      renderAll();
      switchTab('dashboard');
    } catch (err) {
      alert('Failed to import CSV: ' + err.message);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

/**
 * Clear all dashboard data and reset to default state.
 * Shows a confirmation dialog to prevent accidental deletion.
 */
function clearAllData() {
  const confirmed = confirm(
    '⚠️  WARNING: This will delete ALL your data and reset to a blank dashboard.\n\n' +
    'This action cannot be undone. Are you sure you want to continue?'
  );

  if (!confirmed) return;

  // Double-check for destructive action
  const doubleCheck = confirm(
    'This will permanently delete all your data. Type "CLEAR" to confirm:\n\n' +
    'You will lose:\n' +
    '• All income streams\n' +
    '• All expenses and purchase history\n' +
    '• All loans, credit cards, and accounts\n' +
    '• All subscriptions and wishlist items\n\n' +
    'Click OK and type "CLEAR" in the prompt below to confirm.'
  );

  if (!doubleCheck) return;

  // Final confirmation with text entry
  const textConfirm = prompt('Type CLEAR to confirm deletion of all data:');
  if (textConfirm !== 'CLEAR') {
    alert('Clear cancelled. Your data is safe.');
    return;
  }

  // Reset to default state
  state = deepClone(DEFAULT_STATE);
  saveToStorage();
  renderAll();

  alert('✓ All data has been cleared. Starting fresh!');
}

/**
 * Parse a multi-section CSV string produced by exportCsv()
 * into a valid state object.
 */
function parseCsv(text) {
  const parsed = {};
  let currentSection = null;
  let headers        = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('SECTION:')) {
      currentSection = line.slice(8);
      headers        = null;
      continue;
    }

    if (!headers) {
      headers = parseCSVRow(line);
      continue;
    }

    const vals = parseCSVRow(line);

    switch (currentSection) {
      case 'meta': break; // No-op — meta is informational only

      case 'allocation':
        parsed.allocation = { needs: +vals[0] || 50, wants: +vals[1] || 30, savings: +vals[2] || 20 };
        break;

      case 'budgetDisplayMode':
        parsed.budgetDisplayMode = {
          needs:   vals[0] || 'monthly',
          wants:   vals[1] || 'monthly',
          savings: vals[2] || 'monthly',
        };
        break;

      case 'incomeStreams':
        if (!parsed.incomeStreams) parsed.incomeStreams = [];
        parsed.incomeStreams.push({
          id: vals[0], name: vals[1], amount: +vals[2], biweekly: vals[3] === 'true',
        });
        break;

      case 'expenseCards': {
        if (!parsed.expenseCards) parsed.expenseCards = [];
        const [cardId, cardLabel, itemId, itemName, itemAmount, itemBiweekly] = vals;
        let card = parsed.expenseCards.find(c => c.id === cardId);
        if (!card) {
          card = { id: cardId, label: cardLabel, items: [] };
          parsed.expenseCards.push(card);
        }
        if (itemId && itemName) {
          card.items.push({
            id: itemId, name: itemName,
            amount: +itemAmount, biweekly: itemBiweekly === 'true',
          });
        }
        break;
      }

      case 'purchases':
        if (!parsed.purchases) parsed.purchases = [];
        parsed.purchases.push({ id: vals[0], name: vals[1], amount: +vals[2] });
        break;

      case 'spendingHistory': {
        if (!parsed.spendingHistory) parsed.spendingHistory = [];
        const [pId, pDate, pLabel, pTotal, purchId, purchName, purchAmt] = vals;
        let period = parsed.spendingHistory.find(p => p.id === pId);
        if (!period) {
          period = { id: pId, date: pDate, label: pLabel, total: +pTotal, items: [] };
          parsed.spendingHistory.push(period);
        }
        if (purchId && purchName) {
          period.items.push({ id: purchId, name: purchName, amount: +purchAmt });
        }
        break;
      }

      case 'loans':
        if (!parsed.loans) parsed.loans = [];
        parsed.loans.push({
          id: vals[0], name: vals[1], remaining: +vals[2], original: +vals[3],
        });
        break;

      case 'creditCards':
        if (!parsed.creditCards) parsed.creditCards = [];
        parsed.creditCards.push({
          id: vals[0], name: vals[1], balance: +vals[2], limit: +vals[3],
        });
        break;

      case 'subscriptions':
        if (!parsed.subscriptions) parsed.subscriptions = [];
        parsed.subscriptions.push({ id: vals[0], name: vals[1], date: vals[2] });
        break;

      case 'wishlist':
        if (!parsed.wishlist) parsed.wishlist = [];
        parsed.wishlist.push({
          id: vals[0], icon: vals[1], name: vals[2], url: vals[3] || '',
        });
        break;

      case 'savingsAccounts':
        if (!parsed.savingsAccounts) parsed.savingsAccounts = [];
        // Handle both old format (id, name, allocated) and new format (id, name, balance, defaultAllocated, monthlyAllocations)
        if (vals.length >= 5) {
          // New format
          parsed.savingsAccounts.push({
            id: vals[0],
            name: vals[1],
            balance: +vals[2],
            defaultAllocated: +vals[3],
            monthlyAllocations: vals[4] ? JSON.parse(vals[4]) : {}
          });
        } else {
          // Old format - migrate allocated to defaultAllocated
          parsed.savingsAccounts.push({
            id: vals[0],
            name: vals[1],
            balance: 0,
            defaultAllocated: +vals[2],
            monthlyAllocations: {}
          });
        }
        break;

      case 'goals':
        if (!parsed.goals) parsed.goals = [];
        parsed.goals.push({
          id: vals[0], accountId: vals[1], targetAmount: +vals[2], targetDate: vals[3],
        });
        break;
    }
  }

  // Ensure all required keys are present even if CSV was missing a section
  if (!parsed.allocation)        parsed.allocation        = { needs: 50, wants: 30, savings: 20 };
  if (!parsed.budgetDisplayMode) parsed.budgetDisplayMode = { needs: 'monthly', wants: 'monthly', savings: 'monthly' };
  if (!parsed.incomeStreams)     parsed.incomeStreams      = [];
  if (!parsed.expenseCards)      parsed.expenseCards       = [];
  if (!parsed.purchases)         parsed.purchases          = [];
  if (!parsed.spendingHistory)   parsed.spendingHistory    = [];
  if (!parsed.loans)             parsed.loans              = [];
  if (!parsed.creditCards)       parsed.creditCards        = [];
  if (!parsed.subscriptions)     parsed.subscriptions      = [];
  if (!parsed.wishlist)          parsed.wishlist           = [];
  if (!parsed.savingsAccounts)   parsed.savingsAccounts    = [];
  if (!parsed.goals)             parsed.goals              = [];

  return parsed;
}

// ────────────────────────────────────────────────────────────────
// HEADER DATE
// ────────────────────────────────────────────────────────────────
function renderDate() {
  const el = document.getElementById('header-date');
  if (el) {
    el.textContent = new Date().toLocaleDateString('en-CA', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }
}

// ────────────────────────────────────────────────────────────────
// RENDER ALL
// ────────────────────────────────────────────────────────────────
function renderAll() {
  renderIncome();
  renderIncomeStreams();
  renderWants();
  renderBudgetVsActual();
  renderExpenseCards();
  renderLoans();
  renderCreditCards();
  renderSavings();
  renderGoals();
  renderSubscriptions();
  renderWishlist();
}

// ────────────────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ────────────────────────────────────────────────────────────────
document.getElementById('purchase-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('purchase-amount').focus();
});
document.getElementById('purchase-amount').addEventListener('keydown', e => {
  if (e.key === 'Enter') addPurchase();
});

// ────────────────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────────────────
initTheme();
loadFromStorage();
renderDate();
renderAll();
