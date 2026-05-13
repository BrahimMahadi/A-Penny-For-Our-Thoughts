/* ═══════════════════════════════════════════════════════════════
   Module:   state.js
   Project:  A Penny For Our Thoughts
   Created:  May 2026
   Summary:  Single source of truth. Defines DEFAULT_STATE, handles
             localStorage persistence, schema migrations, and
             theme management.
   Functions: loadFromStorage, saveToStorage,
              initTheme, toggleTheme, applyTheme
   Depends on: utils.js (genId, deepClone)
═══════════════════════════════════════════════════════════════ */

// ────────────────────────────────────────────────────────────────
// DEFAULT STATE
// ────────────────────────────────────────────────────────────────
const DEFAULT_STATE = {
  allocation:        { needs: 50, wants: 30, savings: 20 },
  budgetDisplayMode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },

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
    { id: genId(), name: 'Usenet Provider', amount: 13.99, frequency: 'monthly',  date: '2026-09-13', category: 'Utilities',    budgetType: 'wants' },
    { id: genId(), name: 'Real Debrid',     amount: 4.99,  frequency: 'monthly',  date: '2026-09-22', category: 'Entertainment', budgetType: 'wants' },
    { id: genId(), name: 'IPVanish',        amount: 89.99, frequency: 'annual',   date: '2027-04-17', category: 'Productivity',  budgetType: 'wants' },
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

  goals:          [],
  assets:         [], // [{ id, name, category, value }]
  netWorthHistory: [], // [{ id, date: 'YYYY-MM', netWorth, totalAssets, totalLiabilities }]

  payStart: null, // YYYY-MM-DD anchor date for bi-weekly period calculation; null = not configured
};

// ────────────────────────────────────────────────────────────────
// MODULE-LEVEL STATE
// ────────────────────────────────────────────────────────────────
let state = {};

// ────────────────────────────────────────────────────────────────
// PERSISTENCE
// ────────────────────────────────────────────────────────────────
function loadFromStorage() {
  const saved = localStorage.getItem('penny_state_v2');
  try {
    state = saved ? JSON.parse(saved) : deepClone(DEFAULT_STATE);
  } catch {
    state = deepClone(DEFAULT_STATE);
  }

  // ── Migration: old state.gov → incomeStreams array ──
  if (state.gov !== undefined && !state.incomeStreams) {
    state.incomeStreams = [{ id: genId(), name: 'Government', amount: +state.gov, biweekly: true }];
    delete state.gov;
  }

  // ── Migration: old state.expenses (keyed object) → expenseCards array ──
  if (state.expenses && !state.expenseCards) {
    const labelMap = { 'td-debit': 'TD Debit', 'ws-debit': 'WS Debit', 'ws-credit': 'WS Credit Card' };
    state.expenseCards = Object.entries(state.expenses).map(([key, items]) => ({
      id: genId(), label: labelMap[key] || key, items: items || [],
    }));
    delete state.expenses;
  }

  // ── Migration: old subscriptions → add amount, frequency, category, budgetType ──
  if (state.subscriptions) {
    state.subscriptions.forEach(sub => {
      if (sub.amount    === undefined) sub.amount    = 0;
      if (!sub.frequency)              sub.frequency  = 'monthly';
      if (!sub.category)               sub.category   = 'Other';
      if (!sub.budgetType)             sub.budgetType = 'wants';
    });
  }

  // ── Migration: old savings accounts (allocated only) → new structure ──
  if (state.savingsAccounts) {
    state.savingsAccounts.forEach(acct => {
      if (acct.balance === undefined) acct.balance = 0;
      if (acct.defaultAllocated === undefined) {
        acct.defaultAllocated = acct.allocated || 0;
        delete acct.allocated;
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
  if (!state.assets)            state.assets             = [];
  if (!state.netWorthHistory)   state.netWorthHistory    = [];
  if (state.payStart === undefined) state.payStart       = null;

  recordNetWorthSnapshot();
}

function saveToStorage() {
  localStorage.setItem('penny_state_v2', JSON.stringify(state));
}

// ────────────────────────────────────────────────────────────────
// THEME
// ────────────────────────────────────────────────────────────────
const THEME_KEY     = 'penny_theme';
const TOGGLE_BTN_ID = 'theme-toggle';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById(TOGGLE_BTN_ID);
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}
