/**
 * Module:   types/budget.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Summary:  Type definitions for all financial entities in the app.
 *           Mirrors the localStorage `penny_state_v2` shape exactly,
 *           so existing user data loads without transformation.
 */

// ─── Common scalars ──────────────────────────────────────────────

/** ISO date string in 'YYYY-MM-DD' format */
export type ISODate = string;

/** Year-month string in 'YYYY-MM' format */
export type ISOMonth = string;

/** Theme variants supported by the app */
export type ThemeMode = 'light' | 'dark';

/** Budget category for a transaction or recurring item */
export type BudgetType = 'needs' | 'wants' | 'savings';

/**
 * Payment frequency for recurring items (subscriptions, loans).
 * `'custom-days'` selects specific days of the week via the `daysOfWeek` field
 * on the owning entity (Subscription only — Loan uses the other variants).
 * `'biyearly'` means every 6 months (semi-annual).
 */
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biyearly' | 'yearly' | 'custom-days';

/** Display granularity for the budget allocation cards */
export type BudgetDisplayMode = 'biweekly' | 'monthly';

/** Net-worth asset categories */
export type AssetCategoryKey = 'investment' | 'real_estate' | 'vehicle' | 'other';

/** Rule-engine match strategies */
export type RuleMatchType = 'contains' | 'startsWith' | 'exact';

// ─── Income & budget ─────────────────────────────────────────────

/**
 * Income stream — recurring paycheque or other source.
 * `biweekly: true` means paid every 2 weeks; otherwise interpreted as monthly.
 */
export interface IncomeStream {
  id: string;
  name: string;
  amount: number;
  biweekly: boolean;
}

/**
 * Budget split as integer percentages summing to 100.
 * Default: 50/30/20 (needs/wants/savings).
 */
export interface BudgetAllocation {
  needs: number;
  wants: number;
  savings: number;
}

/** Per-category display granularity for the budget cards */
export interface BudgetDisplayModes {
  needs: BudgetDisplayMode;
  wants: BudgetDisplayMode;
  savings: BudgetDisplayMode;
}

// ─── Expense cards (containers) ──────────────────────────────────

/**
 * A single line item inside an expense card.
 * `biweekly: true` doubles its monthly contribution to grand total.
 * `dueDay` is the day-of-month the bill is due (1–31), or null if undated.
 */
export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  biweekly: boolean;
  /** Day-of-month the bill is due (1–31). Null when no due date is set. */
  dueDay?: number | null;
}

/**
 * Expense card — container for related recurring expenses
 * (e.g. "TD Debit", "WS Credit Card").
 */
export interface ExpenseCard {
  id: string;
  label: string;
  items: ExpenseItem[];
}

// ─── Purchases & spending history ────────────────────────────────

/**
 * One purchase entry tracked against the wants budget envelope.
 * `cardId` links to an expense-card label for grouping in analytics.
 */
export interface Purchase {
  id: string;
  name: string;
  amount: number;
  category: string;
  cardId: string | null;
  budgetType: BudgetType;
  /** Optional ISO date — present on purchases created after the cardId migration */
  date?: ISODate;
}

/** Snapshot of one completed bi-weekly spending period */
export interface SpendingHistoryPeriod {
  id: string;
  /** ISO date when the period was closed */
  date: ISODate;
  /** Human-readable period label, e.g. "May 1 – May 14" */
  label?: string;
  /** Sum of all items in this period */
  total: number;
  items: Array<{
    /** Optional ID — present on periods imported from CSV or legacy exports */
    id?: string;
    name: string;
    amount: number;
    category: string;
    date?: ISODate;
  }>;
}

// ─── Loans ───────────────────────────────────────────────────────

/**
 * Loan with remaining balance and a recurring payment.
 * `cardId` links to a credit card if the payment is made via that card.
 */
export interface Loan {
  id: string;
  name: string;
  remaining: number;
  original: number;
  paymentAmount: number;
  frequency: Frequency;
  /** Next payment date (ISO 'YYYY-MM-DD'); empty string when undated */
  date: ISODate | '';
  budgetType: BudgetType;
  cardId: string | null;
}

// ─── Credit cards ────────────────────────────────────────────────

export interface CreditCard {
  id: string;
  name: string;
  balance: number;
  limit: number;
}

// ─── Subscriptions ───────────────────────────────────────────────

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  /**
   * Next renewal date 'YYYY-MM-DD'.
   * For `custom-days` subscriptions this is the effective-from date (the
   * pattern starts on or after this date); the time-picker is hidden in the
   * UI and this is defaulted to today when the subscription is created.
   */
  date: ISODate;
  category: string;
  budgetType: BudgetType;
  cardId: string | null;
  /**
   * Day-of-week indices for `custom-days` subscriptions.
   * 0 = Sunday, 1 = Monday, …, 6 = Saturday.
   * Empty / undefined for all other frequency variants.
   */
  daysOfWeek?: number[];
}

// ─── Wishlist ────────────────────────────────────────────────────

export interface WishlistItem {
  id: string;
  /** Emoji or short symbol */
  icon: string;
  name: string;
  /** Optional product URL */
  url: string;
  /** Optional target price — drives affordability chip, progress bar, and total-value KPI */
  price?: number;
  /** Amount already saved toward this item — tracked independently via "Add savings" */
  saved?: number;
}

// ─── Savings accounts & goals ────────────────────────────────────

/**
 * Savings account with current balance and an allocation amount.
 * `monthlyAllocations` overrides `defaultAllocated` for specific months,
 * keyed by 'YYYY-MM'.
 */
export interface SavingsAccount {
  id: string;
  name: string;
  balance: number;
  defaultAllocated: number;
  monthlyAllocations: Record<ISOMonth, number>;
}

/**
 * Savings goal tied to a single account.
 * Progress is auto-derived from the linked account's balance.
 */
export interface Goal {
  id: string;
  accountId: string;
  targetAmount: number;
  /** Target completion month 'YYYY-MM' */
  targetDate: ISOMonth;
}

// ─── Net worth ───────────────────────────────────────────────────

/** Manually tracked asset for net worth calculation */
export interface Asset {
  id: string;
  name: string;
  category: AssetCategoryKey;
  value: number;
}

/** Monthly snapshot recorded for net worth history charting */
export interface NetWorthSnapshot {
  id: string;
  /** Month the snapshot covers — 'YYYY-MM' */
  date: ISOMonth;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

// ─── Rules engine ────────────────────────────────────────────────

/**
 * Transaction-categorisation rule.
 * Pattern is matched against purchase name using `matchType`.
 */
export interface Rule {
  id: string;
  pattern: string;
  matchType: RuleMatchType;
  category: string;
}

// ─── Budget alerts ───────────────────────────────────────────────

/** Alert threshold per category (% of budget) */
export interface BudgetAlert {
  id: string;
  category: string;
  threshold: number;
}

// ─── Asset category metadata ─────────────────────────────────────

export interface AssetCategoryMeta {
  key: AssetCategoryKey;
  label: string;
  icon: string;
}

// ─── Spending categories ─────────────────────────────────────────

/**
 * A user-defined spending category for purchases and subscriptions.
 * `id === 'other'` is the built-in fallback and cannot be deleted.
 */
export interface SpendingCategory {
  /** Unique slug — `'other'` is reserved for the system fallback */
  id: string;
  name: string;
  /** Hex colour string, e.g. '#ff8c42' */
  color: string;
}
