/**
 * Module:   types/database.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 23 — Supabase DB Integration)
 * Summary:  TypeScript types for every Supabase Postgres table.
 *           Mirrors the schema in supabase/migrations/001_initial_schema.sql.
 *
 *           Convention:
 *             - Row   — what SELECT returns (all columns present)
 *             - Insert — what INSERT accepts (id + user_id required, rest optional)
 *             - Update — what UPDATE accepts (all columns optional)
 *
 *           The `Database` type is the root type passed to createClient<Database>().
 */

// ─── Row types ─────────────────────────────────────────────────────

export interface ProfileRow {
  id: string;
  allocation: { needs: number; wants: number; savings: number };
  budget_display_mode: { needs: string; wants: string; savings: string };
  pay_start: string | null;
  funds_remaining: number;
  funds_remaining_updated: string;
  has_onboarded: boolean;
  dismissed_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeStreamRow {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  biweekly: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCardRow {
  id: string;
  user_id: string;
  label: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseItemRow {
  id: string;
  user_id: string;
  expense_card_id: string;
  name: string;
  amount: number;
  biweekly: boolean;
  due_day: number | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRow {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  card_id: string | null;
  budget_type: string;
  date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpendingHistoryPeriodRow {
  id: string;
  user_id: string;
  date: string;
  label: string | null;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface SpendingHistoryItemRow {
  id: string;
  user_id: string;
  period_id: string;
  name: string;
  amount: number;
  category: string;
  date: string | null;
  created_at: string;
}

export interface LoanRow {
  id: string;
  user_id: string;
  name: string;
  remaining: number;
  original: number;
  payment_amount: number;
  frequency: string;
  date: string;
  budget_type: string;
  card_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCardRow {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  limit: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: string;
  date: string;
  category: string;
  budget_type: string;
  card_id: string | null;
  days_of_week: number[];
  created_at: string;
  updated_at: string;
}

export interface WishlistItemRow {
  id: string;
  user_id: string;
  icon: string;
  name: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface SavingsAccountRow {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  default_allocated: number;
  monthly_allocations: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface GoalRow {
  id: string;
  user_id: string;
  account_id: string;
  target_amount: number;
  target_date: string;
  created_at: string;
  updated_at: string;
}

export interface AssetRow {
  id: string;
  user_id: string;
  name: string;
  category: string;
  value: number;
  created_at: string;
  updated_at: string;
}

export interface NetWorthSnapshotRow {
  id: string;
  user_id: string;
  date: string;
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
  created_at: string;
  updated_at: string;
}

export interface RuleRow {
  id: string;
  user_id: string;
  pattern: string;
  match_type: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetAlertRow {
  id: string;
  user_id: string;
  category: string;
  threshold: number;
  created_at: string;
  updated_at: string;
}

export interface SpendingCategoryRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

// ─── Insert types (omit auto-set columns) ──────────────────────────

type AutoCols = 'created_at' | 'updated_at';

export type ProfileInsert   = Omit<ProfileRow, AutoCols>;
export type IncomeStreamInsert = Omit<IncomeStreamRow, AutoCols>;
export type ExpenseCardInsert  = Omit<ExpenseCardRow, AutoCols>;
export type ExpenseItemInsert  = Omit<ExpenseItemRow, AutoCols>;
export type PurchaseInsert     = Omit<PurchaseRow, AutoCols>;
export type SpendingHistoryPeriodInsert = Omit<SpendingHistoryPeriodRow, AutoCols>;
export type SpendingHistoryItemInsert   = Omit<SpendingHistoryItemRow, 'created_at'>;
export type LoanInsert            = Omit<LoanRow, AutoCols>;
export type CreditCardInsert      = Omit<CreditCardRow, AutoCols>;
export type SubscriptionInsert    = Omit<SubscriptionRow, AutoCols>;
export type WishlistItemInsert    = Omit<WishlistItemRow, AutoCols>;
export type SavingsAccountInsert  = Omit<SavingsAccountRow, AutoCols>;
export type GoalInsert            = Omit<GoalRow, AutoCols>;
export type AssetInsert           = Omit<AssetRow, AutoCols>;
export type NetWorthSnapshotInsert = Omit<NetWorthSnapshotRow, AutoCols>;
export type RuleInsert            = Omit<RuleRow, AutoCols>;
export type BudgetAlertInsert     = Omit<BudgetAlertRow, AutoCols>;
export type SpendingCategoryInsert = Omit<SpendingCategoryRow, AutoCols>;

// ─── Database root type (passed to createClient<Database>) ─────────

export interface Database {
  public: {
    Tables: {
      profiles:                  { Row: ProfileRow;                  Insert: ProfileInsert;                  Update: Partial<ProfileInsert> };
      income_streams:            { Row: IncomeStreamRow;             Insert: IncomeStreamInsert;             Update: Partial<IncomeStreamInsert> };
      expense_cards:             { Row: ExpenseCardRow;              Insert: ExpenseCardInsert;              Update: Partial<ExpenseCardInsert> };
      expense_items:             { Row: ExpenseItemRow;              Insert: ExpenseItemInsert;              Update: Partial<ExpenseItemInsert> };
      purchases:                 { Row: PurchaseRow;                 Insert: PurchaseInsert;                 Update: Partial<PurchaseInsert> };
      spending_history_periods:  { Row: SpendingHistoryPeriodRow;    Insert: SpendingHistoryPeriodInsert;    Update: Partial<SpendingHistoryPeriodInsert> };
      spending_history_items:    { Row: SpendingHistoryItemRow;      Insert: SpendingHistoryItemInsert;      Update: Partial<SpendingHistoryItemInsert> };
      loans:                     { Row: LoanRow;                     Insert: LoanInsert;                     Update: Partial<LoanInsert> };
      credit_cards:              { Row: CreditCardRow;               Insert: CreditCardInsert;               Update: Partial<CreditCardInsert> };
      subscriptions:             { Row: SubscriptionRow;             Insert: SubscriptionInsert;             Update: Partial<SubscriptionInsert> };
      wishlist_items:            { Row: WishlistItemRow;             Insert: WishlistItemInsert;             Update: Partial<WishlistItemInsert> };
      savings_accounts:          { Row: SavingsAccountRow;           Insert: SavingsAccountInsert;           Update: Partial<SavingsAccountInsert> };
      goals:                     { Row: GoalRow;                     Insert: GoalInsert;                     Update: Partial<GoalInsert> };
      assets:                    { Row: AssetRow;                    Insert: AssetInsert;                    Update: Partial<AssetInsert> };
      net_worth_snapshots:       { Row: NetWorthSnapshotRow;         Insert: NetWorthSnapshotInsert;         Update: Partial<NetWorthSnapshotInsert> };
      rules:                     { Row: RuleRow;                     Insert: RuleInsert;                     Update: Partial<RuleInsert> };
      budget_alerts:             { Row: BudgetAlertRow;              Insert: BudgetAlertInsert;              Update: Partial<BudgetAlertInsert> };
      spending_categories:       { Row: SpendingCategoryRow;         Insert: SpendingCategoryInsert;         Update: Partial<SpendingCategoryInsert> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
