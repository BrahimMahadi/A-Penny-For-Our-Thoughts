/**
 * Module:   lib/db.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 23 — Supabase DB Integration)
 * Summary:  Thin typed adapter between the Supabase Postgres tables and the
 *           app's camelCase domain types.
 *
 *           Responsibilities:
 *             - camelCase ↔ snake_case mapping so no DB naming leaks into
 *               the component / store layer
 *             - fetchAllUserData(userId) — one parallelised call that loads
 *               all tables for a given user
 *             - Per-entity insert / update / delete / upsert helpers that
 *               always include user_id and return the mapped domain type
 *
 *           Error contract: every exported function throws on Supabase error
 *           so the store can catch, roll back its optimistic update, and toast.
 */

import { supabase } from './supabase';
import type {
  IncomeStream, ExpenseCard, ExpenseItem, Purchase,
  SpendingHistoryPeriod, Loan, CreditCard, Subscription,
  WishlistItem, SavingsAccount, Goal, Asset, NetWorthSnapshot,
  Rule, BudgetAlert, SpendingCategory, OneTimeIncome,
} from '@/types/budget';
import type { BudgetAllocation, BudgetDisplayModes } from '@/types/budget';
import type { BudgetState } from '@/types/state';
import type {
  Json,
  ProfileRow,
  IncomeStreamRow, ExpenseCardRow, ExpenseItemRow, PurchaseRow,
  SpendingHistoryPeriodRow, SpendingHistoryItemRow,
  LoanRow, CreditCardRow, SubscriptionRow, WishlistItemRow,
  SavingsAccountRow, GoalRow, AssetRow, NetWorthSnapshotRow,
  RuleRow, BudgetAlertRow, SpendingCategoryRow, OneTimeIncomeRow,
} from '@/types/database';

// ─── Throw helper ──────────────────────────────────────────────────

function assertNoError(error: { message: string } | null, ctx: string): void {
  if (error) throw new Error(`[db/${ctx}] ${error.message}`);
}

// ─── Row → domain type mappers ─────────────────────────────────────

function toIncomeStream(r: IncomeStreamRow): IncomeStream {
  return { id: r.id, name: r.name, amount: r.amount, biweekly: r.biweekly };
}

function toExpenseItem(r: ExpenseItemRow): ExpenseItem {
  return { id: r.id, name: r.name, amount: r.amount, biweekly: r.biweekly, dueDay: r.due_day ?? undefined };
}

function toExpenseCard(r: ExpenseCardRow, items: ExpenseItemRow[]): ExpenseCard {
  return {
    id: r.id,
    label: r.label,
    items: items.filter(i => i.expense_card_id === r.id).map(toExpenseItem),
  };
}

function toPurchase(r: PurchaseRow): Purchase {
  return {
    id: r.id,
    name: r.name,
    amount: r.amount,
    category: r.category,
    cardId: r.card_id,
    budgetType: r.budget_type as Purchase['budgetType'],
    date: r.date ?? undefined,
  };
}

function toSpendingHistoryPeriod(
  r: SpendingHistoryPeriodRow,
  items: SpendingHistoryItemRow[],
): SpendingHistoryPeriod {
  return {
    id: r.id,
    date: r.date,
    label: r.label ?? undefined,
    total: r.total,
    items: items
      .filter(i => i.period_id === r.id)
      .map(i => ({ id: i.id, name: i.name, amount: i.amount, category: i.category, date: i.date ?? undefined })),
    // RS-29: optional budgets / spent snapshots. JSONB → typed shape.
    // Spread only when set so legacy periods don't end up with explicit
    // `undefined` properties that would break downstream consumers.
    ...(r.budgets != null
      ? { budgets: r.budgets as unknown as SpendingHistoryPeriod['budgets'] }
      : {}),
    ...(r.spent != null
      ? { spent: r.spent as unknown as SpendingHistoryPeriod['spent'] }
      : {}),
  };
}

function toLoan(r: LoanRow): Loan {
  return {
    id: r.id,
    name: r.name,
    remaining: r.remaining,
    original: r.original,
    paymentAmount: r.payment_amount,
    frequency: r.frequency as Loan['frequency'],
    date: r.date,
    budgetType: r.budget_type as Loan['budgetType'],
    cardId: r.card_id,
  };
}

function toCreditCard(r: CreditCardRow): CreditCard {
  return { id: r.id, name: r.name, balance: r.balance, limit: r.limit };
}

function toSubscription(r: SubscriptionRow): Subscription {
  return {
    id: r.id,
    name: r.name,
    amount: r.amount,
    frequency: r.frequency as Subscription['frequency'],
    date: r.date,
    category: r.category,
    budgetType: r.budget_type as Subscription['budgetType'],
    cardId: r.card_id,
    daysOfWeek: r.days_of_week,
  };
}

function toWishlistItem(r: WishlistItemRow): WishlistItem {
  return {
    id:   r.id,
    icon: r.icon,
    name: r.name,
    url:  r.url,
    ...(r.price != null ? { price: r.price } : {}),
    ...(r.saved != null ? { saved: r.saved } : {}),
    // RS-29: targetMonth is now a real column. Spread only when set so
    // unset items don't end up with an explicit `undefined` property.
    ...(r.target_month != null ? { targetMonth: r.target_month } : {}),
  };
}

function toSavingsAccount(r: SavingsAccountRow): SavingsAccount {
  return {
    id: r.id,
    name: r.name,
    balance: r.balance,
    defaultAllocated: r.default_allocated,
    monthlyAllocations: r.monthly_allocations as Record<string, number>,
  };
}

function toGoal(r: GoalRow): Goal {
  return { id: r.id, accountId: r.account_id, targetAmount: r.target_amount, targetDate: r.target_date };
}

function toAsset(r: AssetRow): Asset {
  return { id: r.id, name: r.name, category: r.category as Asset['category'], value: r.value };
}

function toNetWorthSnapshot(r: NetWorthSnapshotRow): NetWorthSnapshot {
  return {
    id: r.id,
    date: r.date,
    netWorth: r.net_worth,
    totalAssets: r.total_assets,
    totalLiabilities: r.total_liabilities,
  };
}

function toRule(r: RuleRow): Rule {
  return { id: r.id, pattern: r.pattern, matchType: r.match_type as Rule['matchType'], category: r.category };
}

function toBudgetAlert(r: BudgetAlertRow): BudgetAlert {
  return { id: r.id, category: r.category, threshold: r.threshold };
}

function toSpendingCategory(r: SpendingCategoryRow): SpendingCategory {
  return { id: r.id, name: r.name, color: r.color };
}

function toOneTimeIncome(r: OneTimeIncomeRow): OneTimeIncome {
  return {
    id:          r.id,
    label:       r.label,
    amount:      r.amount,
    date:        r.date,
    type:        r.type as OneTimeIncome['type'],
    allocation:  r.allocation as unknown as OneTimeIncome['allocation'],
    periodStart: r.period_start,
    createdAt:   r.created_at,
  };
}

// ─── Delete all user data ──────────────────────────────────────────

/**
 * Deletes every data row for `userId` across all tables in parallel.
 *
 * Parent tables have CASCADE DELETE configured in the schema, so child
 * rows are removed automatically:
 *   expense_cards   → expense_items
 *   spending_history_periods → spending_history_items
 *   savings_accounts → goals
 *
 * Used before a full re-import (CSV or JSON) so the new state completely
 * replaces the old one rather than merging.
 *
 * @throws If any individual delete query fails.
 */
export async function deleteAllUserData(userId: string): Promise<void> {
  const tables = [
    'income_streams',
    'expense_cards',            // cascade → expense_items
    'purchases',
    'spending_history_periods', // cascade → spending_history_items
    'loans',
    'credit_cards',
    'subscriptions',
    'wishlist_items',
    'savings_accounts',         // cascade → goals
    'assets',
    'net_worth_snapshots',
    'rules',
    'budget_alerts',
    'spending_categories',
    'one_time_incomes',
  ] as const;

  await Promise.all(
    tables.map(async (table) => {
      const { error } = await sb.from(table).delete().eq('user_id', userId);
      assertNoError(error, `deleteAll:${table}`);
    }),
  );
}

// ─── Fetch all user data ───────────────────────────────────────────

/**
 * Shape returned by the `fetch_user_data(uid)` Postgres RPC
 * (see supabase/migrations/006_fetch_user_data_rpc.sql).
 *
 * The SQL function uses `to_jsonb(t)` over each table row, which preserves
 * snake_case column names — that's exactly what the existing `to*` row
 * adapters above already expect, so the mapping layer is unchanged.
 *
 * The `profile` key is the only nullable one (first-time user, no row yet).
 * Every array key is guaranteed non-null because the SQL wraps each
 * `jsonb_agg` in `coalesce(..., '[]'::jsonb)`.
 */
interface FetchUserDataPayload {
  profile: ProfileRow | null;
  incomeStreams: IncomeStreamRow[];
  expenseCards: ExpenseCardRow[];
  expenseItems: ExpenseItemRow[];
  purchases: PurchaseRow[];
  spendingHistoryPeriods: SpendingHistoryPeriodRow[];
  spendingHistoryItems: SpendingHistoryItemRow[];
  loans: LoanRow[];
  creditCards: CreditCardRow[];
  subscriptions: SubscriptionRow[];
  wishlistItems: WishlistItemRow[];
  savingsAccounts: SavingsAccountRow[];
  goals: GoalRow[];
  assets: AssetRow[];
  netWorthSnapshots: NetWorthSnapshotRow[];
  rules: RuleRow[];
  budgetAlerts: BudgetAlertRow[];
  spendingCategories: SpendingCategoryRow[];
  oneTimeIncomes: OneTimeIncomeRow[];
}

/**
 * Fetches every table for `userId` in a single Postgres RPC call and
 * assembles a partial BudgetState. Returns `null` if no profile row
 * exists yet (first-time user).
 *
 * RS-31 (Level 2 fetch reliability): this used to fire 18 parallel
 * `from(table).select('*')` queries. On Supabase free tier that
 * occasionally tripped PgBouncer pool saturation and surfaced as a
 * 57014 statement-timeout on a random subset of the 18 queries.
 * Collapsing the burst into one RPC eliminates the pool-pressure
 * window structurally.
 */
export async function fetchAllUserData(userId: string): Promise<Partial<BudgetState> | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('fetch_user_data', { uid: userId });
  assertNoError(error, 'fetchUserDataRpc');

  // RPC returns jsonb — Supabase JS parses it to a plain object. Cast through
  // unknown so future schema drift surfaces at the boundary, not deep inside.
  const payload = (data ?? null) as FetchUserDataPayload | null;

  // The function always returns a jsonb object, but defend against the
  // function being absent / dropped / failed-to-deploy — fall through to
  // "first-time user" rather than crashing.
  if (!payload || !payload.profile) return null;

  const profile = payload.profile;
  const expenseItems = payload.expenseItems ?? [];
  const histItems = payload.spendingHistoryItems ?? [];

  return {
    allocation:          profile.allocation as unknown as BudgetAllocation,
    budgetDisplayMode:   profile.budget_display_mode as unknown as BudgetDisplayModes,
    payStart:            profile.pay_start ?? null,
    // RS-29: real column now. Falls back to null for legacy rows (pre-005
    // migration) and is set to currentPeriodStart by the auto-rollover
    // first-run-init branch.
    lastArchivedPeriodStart: profile.last_archived_period_start ?? null,
    fundsRemaining:      profile.funds_remaining,
    fundsRemainingUpdated: profile.funds_remaining_updated as string,
    hasOnboarded:        profile.has_onboarded,
    dismissedVersion:    profile.dismissed_version,

    incomeStreams:       (payload.incomeStreams ?? []).map(toIncomeStream),
    expenseCards:        (payload.expenseCards ?? []).map(r => toExpenseCard(r, expenseItems)),
    purchases:           (payload.purchases ?? []).map(toPurchase),
    spendingHistory:     (payload.spendingHistoryPeriods ?? []).map(r => toSpendingHistoryPeriod(r, histItems)),
    loans:               (payload.loans ?? []).map(toLoan),
    creditCards:         (payload.creditCards ?? []).map(toCreditCard),
    subscriptions:       (payload.subscriptions ?? []).map(toSubscription),
    wishlist:            (payload.wishlistItems ?? []).map(toWishlistItem),
    savingsAccounts:     (payload.savingsAccounts ?? []).map(toSavingsAccount),
    goals:               (payload.goals ?? []).map(toGoal),
    assets:              (payload.assets ?? []).map(toAsset),
    netWorthHistory:     (payload.netWorthSnapshots ?? []).map(toNetWorthSnapshot),
    rules:               (payload.rules ?? []).map(toRule),
    budgetAlerts:        (payload.budgetAlerts ?? []).map(toBudgetAlert),
    spendingCategories:  (payload.spendingCategories ?? []).map(toSpendingCategory),
    oneTimeIncomes:      (payload.oneTimeIncomes ?? []).map(toOneTimeIncome),
  };
}

// ─── Profile upsert ────────────────────────────────────────────────

export async function upsertProfile(userId: string, data: {
  allocation?: BudgetAllocation;
  budgetDisplayMode?: BudgetDisplayModes;
  payStart?: string | null;
  /** RS-29 — auto-rollover idempotency anchor (ISO 'YYYY-MM-DD'). */
  lastArchivedPeriodStart?: string | null;
  fundsRemaining?: number;
  fundsRemainingUpdated?: string;
  hasOnboarded?: boolean;
  dismissedVersion?: string | null;
}): Promise<void> {
  const { error } = await sb.from('profiles').upsert({
    id: userId,
    ...(data.allocation !== undefined        && { allocation: data.allocation }),
    ...(data.budgetDisplayMode !== undefined && { budget_display_mode: data.budgetDisplayMode }),
    ...(data.payStart !== undefined          && { pay_start: data.payStart }),
    ...(data.lastArchivedPeriodStart !== undefined && { last_archived_period_start: data.lastArchivedPeriodStart }),
    ...(data.fundsRemaining !== undefined    && { funds_remaining: data.fundsRemaining }),
    ...(data.fundsRemainingUpdated !== undefined && { funds_remaining_updated: data.fundsRemainingUpdated }),
    ...(data.hasOnboarded !== undefined      && { has_onboarded: data.hasOnboarded }),
    ...(data.dismissedVersion !== undefined  && { dismissed_version: data.dismissedVersion }),
  });
  assertNoError(error, 'upsertProfile');
}

// ─── Generic CRUD helpers ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

/** Insert a single row. */
async function insertRow(table: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await sb.from(table).insert(row);
  assertNoError(error, `insert:${table}`);
}

/** Update columns on a row matched by id + user_id. */
async function updateRow(
  table: string,
  id: string,
  userId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await sb.from(table).update(patch).eq('id', id).eq('user_id', userId);
  assertNoError(error, `update:${table}`);
}

/** Delete a row by id + user_id. */
async function deleteRow(table: string, id: string, userId: string): Promise<void> {
  const { error } = await sb.from(table).delete().eq('id', id).eq('user_id', userId);
  assertNoError(error, `delete:${table}`);
}

// ─── Income streams ────────────────────────────────────────────────

export const db = {

  incomeStreams: {
    insert: (userId: string, s: IncomeStream) =>
      insertRow('income_streams', { id: s.id, user_id: userId, name: s.name, amount: s.amount, biweekly: s.biweekly }),
    update: (userId: string, s: IncomeStream) =>
      updateRow('income_streams', s.id, userId, { name: s.name, amount: s.amount, biweekly: s.biweekly }),
    delete: (userId: string, id: string) => deleteRow('income_streams', id, userId),
  },

  // ─── Expense cards + items ────────────────────────────────────

  expenseCards: {
    insert: async (userId: string, card: ExpenseCard) => {
      await insertRow('expense_cards', { id: card.id, user_id: userId, label: card.label });
      for (const item of card.items) {
        await db.expenseItems.insert(userId, card.id, item);
      }
    },
    update: (userId: string, card: ExpenseCard) =>
      updateRow('expense_cards', card.id, userId, { label: card.label }),
    delete: async (userId: string, id: string) => {
      // expense_items cascade-delete via FK
      await deleteRow('expense_cards', id, userId);
    },
  },

  expenseItems: {
    insert: (userId: string, cardId: string, item: ExpenseItem) =>
      insertRow('expense_items', {
        id: item.id, user_id: userId, expense_card_id: cardId,
        name: item.name, amount: item.amount, biweekly: item.biweekly,
        due_day: item.dueDay ?? null,
      }),
    update: (userId: string, item: ExpenseItem) =>
      updateRow('expense_items', item.id, userId, {
        name: item.name, amount: item.amount, biweekly: item.biweekly,
        due_day: item.dueDay ?? null,
      }),
    delete: (userId: string, id: string) => deleteRow('expense_items', id, userId),
  },

  // ─── Purchases ─────────────────────────────────────────────────

  purchases: {
    insert: (userId: string, p: Purchase) =>
      insertRow('purchases', {
        id: p.id, user_id: userId, name: p.name, amount: p.amount,
        category: p.category, card_id: p.cardId, budget_type: p.budgetType,
        date: p.date ?? null,
      }),
    update: (userId: string, p: Purchase) =>
      updateRow('purchases', p.id, userId, {
        name: p.name, amount: p.amount, category: p.category,
        card_id: p.cardId, budget_type: p.budgetType, date: p.date ?? null,
      }),
    delete: (userId: string, id: string) => deleteRow('purchases', id, userId),
  },

  // ─── Spending history ──────────────────────────────────────────

  spendingHistory: {
    insertPeriod: async (userId: string, period: SpendingHistoryPeriod) => {
      await insertRow('spending_history_periods', {
        id: period.id, user_id: userId, date: period.date,
        label: period.label ?? null, total: period.total,
        // RS-29: persist budgets / spent snapshots as JSONB.
        budgets: (period.budgets ?? null) as unknown as Json,
        spent:   (period.spent   ?? null) as unknown as Json,
      });
      for (const item of period.items) {
        await insertRow('spending_history_items', {
          id: item.id ?? period.id + '_' + Math.random().toString(36).slice(2),
          user_id: userId, period_id: period.id,
          name: item.name, amount: item.amount, category: item.category,
          date: item.date ?? null,
        });
      }
    },
    /**
     * RS-29: in-place update of an existing period's budgets / spent
     * snapshots. Used by the one-time push-up migration in initStore to
     * promote localStorage-only values up to the new DB columns.
     * Items are NOT touched — they were already synced on the original
     * insert. Only the period-level columns change.
     */
    updatePeriodSnapshots: async (
      userId: string,
      periodId: string,
      patch: { budgets?: SpendingHistoryPeriod['budgets']; spent?: SpendingHistoryPeriod['spent'] },
    ) => {
      const updates: Record<string, unknown> = {};
      if (patch.budgets !== undefined) updates.budgets = patch.budgets;
      if (patch.spent   !== undefined) updates.spent   = patch.spent;
      if (Object.keys(updates).length === 0) return;
      await updateRow('spending_history_periods', periodId, userId, updates);
    },
    deletePeriod: (userId: string, id: string) =>
      deleteRow('spending_history_periods', id, userId),
  },

  // ─── Loans ────────────────────────────────────────────────────

  loans: {
    insert: (userId: string, l: Loan) =>
      insertRow('loans', {
        id: l.id, user_id: userId, name: l.name, remaining: l.remaining,
        original: l.original, payment_amount: l.paymentAmount,
        frequency: l.frequency, date: l.date, budget_type: l.budgetType,
        card_id: l.cardId,
      }),
    update: (userId: string, l: Loan) =>
      updateRow('loans', l.id, userId, {
        name: l.name, remaining: l.remaining, original: l.original,
        payment_amount: l.paymentAmount, frequency: l.frequency,
        date: l.date, budget_type: l.budgetType, card_id: l.cardId,
      }),
    delete: (userId: string, id: string) => deleteRow('loans', id, userId),
  },

  // ─── Credit cards ──────────────────────────────────────────────

  creditCards: {
    insert: (userId: string, c: CreditCard) =>
      insertRow('credit_cards', { id: c.id, user_id: userId, name: c.name, balance: c.balance, limit: c.limit }),
    update: (userId: string, c: CreditCard) =>
      updateRow('credit_cards', c.id, userId, { name: c.name, balance: c.balance, limit: c.limit }),
    delete: (userId: string, id: string) => deleteRow('credit_cards', id, userId),
  },

  // ─── Subscriptions ─────────────────────────────────────────────

  subscriptions: {
    insert: (userId: string, s: Subscription) =>
      insertRow('subscriptions', {
        id: s.id, user_id: userId, name: s.name, amount: s.amount,
        frequency: s.frequency, date: s.date, category: s.category,
        budget_type: s.budgetType, card_id: s.cardId,
        days_of_week: s.daysOfWeek ?? [],
      }),
    update: (userId: string, s: Subscription) =>
      updateRow('subscriptions', s.id, userId, {
        name: s.name, amount: s.amount, frequency: s.frequency,
        date: s.date, category: s.category, budget_type: s.budgetType,
        card_id: s.cardId, days_of_week: s.daysOfWeek ?? [],
      }),
    delete: (userId: string, id: string) => deleteRow('subscriptions', id, userId),
  },

  // ─── Wishlist ──────────────────────────────────────────────────

  wishlist: {
    insert: (userId: string, w: WishlistItem) =>
      insertRow('wishlist_items', {
        id: w.id, user_id: userId, icon: w.icon, name: w.name, url: w.url,
        price: w.price ?? null,
        saved: w.saved ?? null,
        target_month: w.targetMonth ?? null,   // RS-29
      }),
    update: (userId: string, w: WishlistItem) =>
      updateRow('wishlist_items', w.id, userId, {
        icon: w.icon, name: w.name, url: w.url,
        price: w.price ?? null,
        saved: w.saved ?? null,
        target_month: w.targetMonth ?? null,   // RS-29
      }),
    delete: (userId: string, id: string) => deleteRow('wishlist_items', id, userId),
  },

  // ─── Savings accounts ──────────────────────────────────────────

  savingsAccounts: {
    insert: (userId: string, a: SavingsAccount) =>
      insertRow('savings_accounts', {
        id: a.id, user_id: userId, name: a.name, balance: a.balance,
        default_allocated: a.defaultAllocated,
        monthly_allocations: a.monthlyAllocations,
      }),
    update: (userId: string, a: SavingsAccount) =>
      updateRow('savings_accounts', a.id, userId, {
        name: a.name, balance: a.balance,
        default_allocated: a.defaultAllocated,
        monthly_allocations: a.monthlyAllocations,
      }),
    delete: (userId: string, id: string) => deleteRow('savings_accounts', id, userId),
  },

  // ─── Goals ────────────────────────────────────────────────────

  goals: {
    insert: (userId: string, g: Goal) =>
      insertRow('goals', {
        id: g.id, user_id: userId, account_id: g.accountId,
        target_amount: g.targetAmount, target_date: g.targetDate,
      }),
    update: (userId: string, g: Goal) =>
      updateRow('goals', g.id, userId, { target_amount: g.targetAmount, target_date: g.targetDate }),
    delete: (userId: string, id: string) => deleteRow('goals', id, userId),
  },

  // ─── Assets ───────────────────────────────────────────────────

  assets: {
    insert: (userId: string, a: Asset) =>
      insertRow('assets', { id: a.id, user_id: userId, name: a.name, category: a.category, value: a.value }),
    update: (userId: string, a: Asset) =>
      updateRow('assets', a.id, userId, { name: a.name, category: a.category, value: a.value }),
    delete: (userId: string, id: string) => deleteRow('assets', id, userId),
  },

  // ─── Net worth snapshots ───────────────────────────────────────

  netWorthHistory: {
    insert: (userId: string, s: NetWorthSnapshot) =>
      insertRow('net_worth_snapshots', {
        id: s.id, user_id: userId, date: s.date,
        net_worth: s.netWorth, total_assets: s.totalAssets,
        total_liabilities: s.totalLiabilities,
      }),
    delete: (userId: string, id: string) => deleteRow('net_worth_snapshots', id, userId),
  },

  // ─── Rules ────────────────────────────────────────────────────

  rules: {
    insert: (userId: string, r: Rule) =>
      insertRow('rules', { id: r.id, user_id: userId, pattern: r.pattern, match_type: r.matchType, category: r.category }),
    update: (userId: string, r: Rule) =>
      updateRow('rules', r.id, userId, { pattern: r.pattern, match_type: r.matchType, category: r.category }),
    delete: (userId: string, id: string) => deleteRow('rules', id, userId),
  },

  // ─── Budget alerts ─────────────────────────────────────────────

  budgetAlerts: {
    insert: (userId: string, a: BudgetAlert) =>
      insertRow('budget_alerts', { id: a.id, user_id: userId, category: a.category, threshold: a.threshold }),
    update: (userId: string, a: BudgetAlert) =>
      updateRow('budget_alerts', a.id, userId, { category: a.category, threshold: a.threshold }),
    delete: (userId: string, id: string) => deleteRow('budget_alerts', id, userId),
  },

  // ─── Spending categories ───────────────────────────────────────

  spendingCategories: {
    insert: (userId: string, c: SpendingCategory) =>
      insertRow('spending_categories', { id: c.id, user_id: userId, name: c.name, color: c.color }),
    update: (userId: string, c: SpendingCategory) =>
      updateRow('spending_categories', c.id, userId, { name: c.name, color: c.color }),
    delete: (userId: string, id: string) => deleteRow('spending_categories', id, userId),
  },

  // ─── One-time (windfall) incomes ───────────────────────────────

  oneTimeIncomes: {
    insert: (userId: string, i: OneTimeIncome) =>
      insertRow('one_time_incomes', {
        id:           i.id,
        user_id:      userId,
        label:        i.label,
        amount:       i.amount,
        date:         i.date,
        type:         i.type,
        allocation:   i.allocation as unknown as Json,
        period_start: i.periodStart,
        created_at:   i.createdAt,
      }),
    update: (userId: string, i: OneTimeIncome) =>
      updateRow('one_time_incomes', i.id, userId, {
        label:        i.label,
        amount:       i.amount,
        date:         i.date,
        type:         i.type,
        allocation:   i.allocation as unknown as Json,
        period_start: i.periodStart,
      }),
    delete: (userId: string, id: string) => deleteRow('one_time_incomes', id, userId),
  },

} as const;
