/* ═══════════════════════════════════════════════════════════════
   Module:   main.js
   Project:  A Penny For Our Thoughts
   Created:  May 2026
   Summary:  Vite entry point. Imports all modules in dependency
             order, wires up callbacks to resolve circular deps,
             exposes all onclick-called functions to window so
             existing HTML event handlers keep working without
             any markup changes, then initialises the app.
═══════════════════════════════════════════════════════════════ */

// ── CSS — must be first so Tailwind's @import "tailwindcss" runs ─
import './styles.css';

// ── Import in dependency order ────────────────────────────────────
import './utils.js';       // no side-effects; exports used by others
import {
  state, loadFromStorage, initTheme, toggleTheme,
  applyTheme, setThemeCallbacks,
} from './state.js';

import {
  getTotalMonthlyIncome, getAlloc, grandTotal,
  getSubsDeductedThisPeriod, getSubsDeductedThisMonth,
  getLoansDeductedThisMonth, getTriggeredAlerts,
  getCurrentPeriodStart, getCategorySpending,
  WANT_CATEGORIES, CATEGORY_COLOURS, ASSET_CATEGORIES,
  getMonthActuals, getMonthBudgeted, calculateVariance,
  getFilteredSpendingHistory, getNextRenewal,
  getAllocationForMonth, getGoalProgress,
  getNetWorthData, getMonthForecast,
  applyRulesToName, recordNetWorthSnapshot,
} from './analytics.js';

import { resetAllCharts } from './charts.js';

import { renderAll, renderDate, renderSchedule, toggleAnalyticsPanel } from './render.js';

// app.js must come last — it imports render.js, charts.js, analytics.js
import {
  // Tab / nav
  switchTab, switchDocsSection, toggleDocsDropdown,
  toggleOverflowMenu, toggleInfoTip, toggleShortcutsPanel,
  // Schedule
  prevScheduleMonth, nextScheduleMonth,
  // Allocation / income
  openEditAllocation, updateAllocValidation, toggleBudgetMode,
  addIncomeStream, openEditFundsRemaining,
  openEditIncomeStream, deleteIncomeStream,
  // Purchases
  addPurchase, quickAddPurchase, removePurchase,
  openEditHistoryPurchase, deleteHistoryPurchase, deleteHistoryPeriod,
  resetWants, setPurchaseCategory, setPurchaseCard, setPurchaseBudgetType,
  // Analytics
  updateAnalyticsFilters, resetAnalyticsFilters,
  // Expense cards
  openAddExpenseCard, openEditExpenseCard, deleteExpenseCard,
  addExpense, openEditExpenseItem, removeExpense,
  // Loans
  openAddLoan, openEditLoan, deleteLoan, openSetPayStart,
  // Credit cards
  openAddCreditCard, openEditCreditCard, deleteCreditCard,
  // Savings
  addSavingsAccount, openEditSavingsAccount, deleteSavingsAccount,
  openAllocateSavingsModal,
  // Goals
  openAddGoal, openEditGoal, deleteGoal,
  // Net worth / assets
  openAddAsset, openEditAsset, deleteAsset,
  // Subscriptions
  openAddSubscription, openEditSubscription, deleteSubscription,
  // Wishlist
  addWishlistItem, openEditWishlistItem, deleteWishlistItem,
  // Rules
  openAddRule, openEditRule, deleteRule,
  // Alerts
  openAddAlert, openEditAlert, deleteAlert,
  // Modal
  openModal, closeModal, handleOverlayClick,
  // CSV
  exportCsv, importCsv,
  // Data management
  clearAllData,
} from './app.js';

// ── Wire callbacks BEFORE initialising ──────────────────────────
// Resolves the circular dep: state.js needs resetAllCharts + renderAll,
// but those modules import state.js.  Register them now that everything
// is loaded.
setThemeCallbacks(resetAllCharts, renderAll);

// ── Expose all onclick-called functions to window ────────────────
// ES modules are scoped — HTML onclick="fn()" looks up window.fn.
// Map every function needed by the HTML (static or dynamic) here.
Object.assign(window, {
  // Tab / nav
  switchTab, switchDocsSection, toggleDocsDropdown,
  toggleOverflowMenu, toggleInfoTip, toggleShortcutsPanel,
  toggleAnalyticsPanel,
  // Theme
  toggleTheme,
  // Schedule
  prevScheduleMonth, nextScheduleMonth,
  // Allocation / income
  openEditAllocation, updateAllocValidation, toggleBudgetMode,
  addIncomeStream, openEditFundsRemaining,
  openEditIncomeStream, deleteIncomeStream,
  // Purchases
  addPurchase, quickAddPurchase, removePurchase,
  openEditHistoryPurchase, deleteHistoryPurchase, deleteHistoryPeriod,
  resetWants, setPurchaseCategory, setPurchaseCard, setPurchaseBudgetType,
  // Analytics
  updateAnalyticsFilters, resetAnalyticsFilters,
  // Expense cards
  openAddExpenseCard, openEditExpenseCard, deleteExpenseCard,
  addExpense, openEditExpenseItem, removeExpense,
  // Loans
  openAddLoan, openEditLoan, deleteLoan, openSetPayStart,
  // Credit cards
  openAddCreditCard, openEditCreditCard, deleteCreditCard,
  // Savings
  addSavingsAccount, openEditSavingsAccount, deleteSavingsAccount,
  openAllocateSavingsModal,
  // Goals
  openAddGoal, openEditGoal, deleteGoal,
  // Net worth / assets
  openAddAsset, openEditAsset, deleteAsset,
  // Subscriptions
  openAddSubscription, openEditSubscription, deleteSubscription,
  // Wishlist
  addWishlistItem, openEditWishlistItem, deleteWishlistItem,
  // Rules
  openAddRule, openEditRule, deleteRule,
  // Alerts
  openAddAlert, openEditAlert, deleteAlert,
  // Modal
  openModal, closeModal, handleOverlayClick,
  // CSV
  exportCsv, importCsv,
  // Data management
  clearAllData,
});

// ── App initialisation ───────────────────────────────────────────
initTheme();            // apply saved theme before first render
loadFromStorage();      // hydrate state from localStorage
recordNetWorthSnapshot(); // record this month's net worth if needed
renderDate();           // fill header date
renderAll();            // initial full render
