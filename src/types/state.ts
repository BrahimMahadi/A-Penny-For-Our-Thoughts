/**
 * Module:   types/state.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Summary:  Top-level application state shapes. `BudgetState` mirrors
 *           the `penny_state_v2` localStorage payload exactly so
 *           existing user data loads without transformation.
 */

import type {
  IncomeStream,
  BudgetAllocation,
  BudgetDisplayModes,
  ExpenseCard,
  Purchase,
  SpendingHistoryPeriod,
  Loan,
  CreditCard,
  Subscription,
  WishlistItem,
  SavingsAccount,
  Goal,
  Asset,
  NetWorthSnapshot,
  Rule,
  BudgetAlert,
  SpendingCategory,
  ISODate,
} from './budget';

// ─── Full persisted budget state ─────────────────────────────────

/**
 * The complete persisted application state.
 * Stored under localStorage key `penny_state_v2` as JSON.
 *
 * IMPORTANT: This shape must stay backward-compatible with existing
 * user data. Add new keys with forward-compat defaults rather than
 * renaming/removing fields.
 */
export interface BudgetState {
  // Budget allocation
  allocation: BudgetAllocation;
  budgetDisplayMode: BudgetDisplayModes;

  // Income
  incomeStreams: IncomeStream[];

  // Expenses
  expenseCards: ExpenseCard[];
  purchases: Purchase[];
  spendingHistory: SpendingHistoryPeriod[];

  // Debts
  loans: Loan[];
  creditCards: CreditCard[];

  // Recurring
  subscriptions: Subscription[];

  // Wishlist & savings
  wishlist: WishlistItem[];
  savingsAccounts: SavingsAccount[];
  goals: Goal[];

  // Net worth
  assets: Asset[];
  netWorthHistory: NetWorthSnapshot[];

  // Pay period anchor (bi-weekly cycle)
  /** ISO date 'YYYY-MM-DD' or null when unconfigured */
  payStart: ISODate | null;

  // Rules + alerts
  rules: Rule[];
  budgetAlerts: BudgetAlert[];

  // Manual chequing-balance tracking
  fundsRemaining: number;
  /** ISO date 'YYYY-MM-DD' or empty string when never updated */
  fundsRemainingUpdated: ISODate | '';

  // Onboarding & version flags
  /** True once the user completes or dismisses the first-run onboarding stepper. */
  hasOnboarded: boolean;
  /**
   * The last app version string for which the user dismissed the "What's New"
   * banner. Null means the banner has never been dismissed.
   */
  dismissedVersion: string | null;

  /**
   * User-defined spending categories for wants purchases and subscriptions.
   * Seeded from WANT_CATEGORIES defaults on first run.
   * The `'other'` id is always present and cannot be deleted.
   */
  spendingCategories: SpendingCategory[];
}

// ─── UI-only state (transient, not persisted) ────────────────────

/**
 * Spending Analytics panel filter values.
 * Empty string means "no filter applied".
 */
export interface AnalyticsFilters {
  startDate: ISODate | '';
  endDate: ISODate | '';
  search: string;
}

/** Schedule tab view mode */
export type ScheduleView = 'list' | 'calendar' | 'payperiod';

/** Main app tabs */
export type TabId = 'dashboard' | 'schedule' | 'spending' | 'docs' | 'settings' | 'advanced';

/**
 * Volatile UI state — panel visibility, filter inputs, current month.
 * NOT persisted to localStorage; resets to defaults on page load.
 *
 * Exception: `collapsedSections` is persisted under STORAGE_KEYS.UI_PREFS
 * so the user's collapse preferences survive a page reload.
 */
export interface UiState {
  activeTab: TabId;
  /** Whether the Spending Analytics panel is open inside the Dashboard tab */
  analyticsPanelOpen: boolean;
  analyticsFilters: AnalyticsFilters;
  /** Calendar month displayed in Schedule tab (1-based 1–12) */
  scheduleViewYear: number;
  scheduleViewMonth: number;
  scheduleView: ScheduleView;
  /**
   * Pay-period offset from the current period (0 = current, +1 = next, -1 = previous).
   * Only used when scheduleView === 'payperiod'.
   */
  schedulePayPeriodOffset: number;
  /**
   * Set of dashboard section IDs that the user has collapsed.
   * Persisted to `penny_ui_prefs` in localStorage.
   */
  collapsedSections: string[];
  /**
   * Ordered list of dashboard section IDs — controls the display order
   * on the dashboard. Persisted to `penny_ui_prefs` in localStorage.
   * Defaults to the canonical order from dashboardSections.ts.
   */
  sectionOrder: string[];
  /**
   * Ordered list of advanced section IDs — controls the display order
   * on the Advanced tab. Persisted to `penny_ui_prefs` in localStorage.
   * Defaults to the canonical order from dashboardSections.ts (ADVANCED_SECTIONS).
   */
  advancedSectionOrder: string[];
}

// ─── Storage keys (single source of truth) ───────────────────────

export const STORAGE_KEYS = {
  STATE:    'penny_state_v2',
  THEME:    'penny_theme',
  UI_PREFS: 'penny_ui_prefs',
} as const;
