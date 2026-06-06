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

import { genId, deepClone } from './utils.js';

// ────────────────────────────────────────────────────────────────
// THEME CALLBACK REGISTRY
// Resolves the circular dependency: state.js needs to call
// resetAllCharts() and renderAll() on theme change, but those
// live in charts.js and render.js which both import state.js.
// main.js registers the callbacks after all modules are loaded.
// ────────────────────────────────────────────────────────────────
let _themeResetFn  = null;
let _themeRenderFn = null;

/**
 * Register callbacks that applyTheme() will invoke on theme change.
 * Called once from main.js after all modules are imported.
 *
 * @param {Function} resetFn  - resetAllCharts()
 * @param {Function} renderFn - renderAll()
 */
export function setThemeCallbacks(resetFn, renderFn) {
  _themeResetFn  = resetFn;
  _themeRenderFn = renderFn;
}

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
    { id: genId(), name: 'Car Loan',     remaining: 0, original: 0, paymentAmount: 0, frequency: 'monthly', date: '', budgetType: 'needs', cardId: null },
    { id: genId(), name: 'Student Loan', remaining: 0, original: 0, paymentAmount: 0, frequency: 'monthly', date: '', budgetType: 'needs', cardId: null },
  ],

  creditCards: [
    { id: genId(), name: 'Visa',       balance: 0, limit: 1000 },
    { id: genId(), name: 'Mastercard', balance: 0, limit: 1000 },
  ],

  subscriptions: [
    { id: genId(), name: 'Netflix', amount: 0, frequency: 'monthly', date: '2026-06-01', category: 'Entertainment', budgetType: 'wants', cardId: null },
  ],

  wishlist: [
    { id: genId(), icon: '🎯', name: 'My first wishlist item', url: '' },
  ],

  savingsAccounts: [
    { id: genId(), name: 'Emergency Fund', balance: 0, defaultAllocated: 0, monthlyAllocations: {} },
    { id: genId(), name: 'Investments',    balance: 0, defaultAllocated: 0, monthlyAllocations: {} },
  ],

  goals:          [],
  assets:         [], // [{ id, name, category, value }]
  netWorthHistory: [], // [{ id, date: 'YYYY-MM', netWorth, totalAssets, totalLiabilities }]

  payStart: null, // YYYY-MM-DD anchor date for bi-weekly period calculation; null = not configured

  rules:        [], // [{ id, pattern, matchType: 'contains'|'startsWith'|'exact', category }]
  budgetAlerts: [], // [{ id, category, threshold }]

  fundsRemaining:        0,   // user-set available balance (e.g. chequing account)
  fundsRemainingUpdated: '',  // ISO date 'YYYY-MM-DD' of last manual update
};

/**
 * Truly empty state used by clearAllData().
 * Same shape as DEFAULT_STATE but every collection is an empty array
 * and numeric fields are zeroed. Keeps the 50/30/20 allocation as a
 * sensible starting point so the dashboard is usable immediately.
 */
export const BLANK_STATE = {
  allocation:        { needs: 50, wants: 30, savings: 20 },
  budgetDisplayMode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
  incomeStreams:    [],
  expenseCards:     [],
  purchases:        [],
  spendingHistory:  [],
  loans:            [],
  creditCards:      [],
  subscriptions:    [],
  wishlist:         [],
  savingsAccounts:  [],
  goals:            [],
  assets:           [],
  netWorthHistory:  [],
  payStart:         null,
  rules:            [],
  budgetAlerts:     [],
  fundsRemaining:        0,
  fundsRemainingUpdated: '',
};

// ────────────────────────────────────────────────────────────────
// MODULE-LEVEL STATE
// ────────────────────────────────────────────────────────────────
export let state = {};

/**
 * Replace the entire state object. Use this instead of direct
 * assignment (`state = X`) from other modules, because ES module
 * imported bindings are read-only — only this module can reassign
 * its own exported `let`.
 *
 * @param {object} newState - The new state object to use.
 * @returns {void}
 */
export function setState(newState) {
  state = newState;
}

// ────────────────────────────────────────────────────────────────
// PERSISTENCE
// ────────────────────────────────────────────────────────────────
/**
 * Load application state from localStorage, applying any schema migrations
 * needed to bring old state up to the current shape, and ensuring all
 * forward-compatibility keys are present.  Falls back to DEFAULT_STATE if
 * nothing is stored or the stored JSON is corrupt.
 *
 * Also calls `recordNetWorthSnapshot()` so that every page load captures
 * the current month's net worth if it hasn't been recorded yet.
 *
 * Side effect: mutates the module-level `state` variable and calls
 * `recordNetWorthSnapshot()` (which may call `state.netWorthHistory.push`).
 *
 * @returns {void}
 */
export function loadFromStorage() {
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

  // ── Migration: add payment-tracking fields to existing loans ──
  if (state.loans) {
    state.loans.forEach(loan => {
      if (loan.paymentAmount === undefined) loan.paymentAmount = 0;
      if (!loan.frequency)                  loan.frequency     = 'monthly';
      if (loan.date         === undefined)  loan.date          = '';
      if (!loan.budgetType)                 loan.budgetType    = 'needs';
      if (loan.cardId       === undefined)  loan.cardId        = null;
    });
  }

  // ── Migration: old subscriptions → add amount, frequency, category, budgetType ──
  if (state.subscriptions) {
    state.subscriptions.forEach(sub => {
      if (sub.amount    === undefined) sub.amount    = 0;
      if (!sub.frequency)              sub.frequency  = 'monthly';
      if (!sub.category)               sub.category   = 'Other';
      if (!sub.budgetType)             sub.budgetType = 'wants';
      if (sub.cardId    === undefined) sub.cardId     = null;
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
  // ── Migration: add cardId + budgetType to existing purchases ──
  state.purchases.forEach(p => {
    if (p.cardId    === undefined) p.cardId    = null;
    if (p.budgetType === undefined) p.budgetType = 'wants';
  });
  if (!state.spendingHistory)   state.spendingHistory    = [];
  if (!state.loans)             state.loans              = [];
  if (!state.creditCards)       state.creditCards        = [];
  if (!state.wishlist)          state.wishlist           = [];
  if (!state.savingsAccounts)   state.savingsAccounts    = [];
  if (!state.subscriptions)     state.subscriptions      = [];
  if (!state.goals)             state.goals              = [];
  if (!state.assets)            state.assets             = [];
  if (!state.netWorthHistory)   state.netWorthHistory    = [];
  if (state.payStart    === undefined) state.payStart    = null;
  if (!state.rules)                    state.rules        = [];
  if (!state.budgetAlerts)             state.budgetAlerts = [];
  if (state.fundsRemaining        === undefined) state.fundsRemaining        = 0;
  if (state.fundsRemainingUpdated === undefined) state.fundsRemainingUpdated = '';

  // NOTE: recordNetWorthSnapshot() is called by main.js after loadFromStorage()
  // to avoid a circular dependency (analytics.js → state.js → analytics.js).
}

/**
 * Persist the current `state` object to localStorage under the `penny_state_v2` key.
 * Must be called after every mutation that should survive a page reload.
 *
 * @returns {void}
 */
export function saveToStorage() {
  localStorage.setItem('penny_state_v2', JSON.stringify(state));
}

// ────────────────────────────────────────────────────────────────
// THEME
// ────────────────────────────────────────────────────────────────
const THEME_KEY     = 'penny_theme';
const TOGGLE_BTN_ID = 'theme-toggle';

/**
 * Read the persisted theme preference from localStorage and apply it.
 * Defaults to `'dark'` when no preference has been saved.
 *
 * @returns {void}
 */
export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

/**
 * Toggle between `'dark'` and `'light'` theme and persist the choice.
 *
 * @returns {void}
 */
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/**
 * Apply the specified theme by updating the `data-theme` attribute on
 * `<html>`, saving the preference to localStorage, and updating the
 * theme-toggle button emoji.
 *
 * @param {'dark'|'light'} theme - Theme name to activate.
 * @returns {void}
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById(TOGGLE_BTN_ID);
  if (btn) {
    btn.textContent = theme === 'dark' ? '🌙' : '☀️';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  // Only reset charts and re-render when state is already loaded.
  // applyTheme is also called by initTheme() before loadFromStorage(), so we
  // guard against the empty-state case by checking for state.allocation.
  if (state && state.allocation) {
    if (_themeResetFn)  _themeResetFn();
    if (_themeRenderFn) _themeRenderFn();
  }
}
