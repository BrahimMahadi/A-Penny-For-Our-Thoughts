/**
 * Module:   lib/migrateLocalStorage.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 23 — Supabase DB Integration)
 * Summary:  One-time migration of a user's existing localStorage data
 *           (penny_state_v2) into Supabase.
 *
 *           Flow:
 *             1. Read penny_state_v2 from localStorage
 *             2. Check if the user already has data in Supabase (profiles row)
 *             3. If not, batch-insert every entity into the correct table
 *             4. Set penny_migrated_to_supabase = 'true' in localStorage
 *                so we never attempt the migration twice
 *
 *           The caller (budget store initStore) calls
 *           `migrateIfNeeded(userId)` after the initial Supabase fetch
 *           returns null (no profile row found).
 *
 *           If localStorage has no data either, this is a brand-new user
 *           and we skip silently.
 */

import { db, upsertProfile } from './db';
import { STORAGE_KEYS } from '@/types/state';
import type { BudgetState } from '@/types/state';

const MIGRATION_FLAG = 'penny_migrated_to_supabase';

// ─── Public API ────────────────────────────────────────────────────

/**
 * Attempts to migrate localStorage data to Supabase for `userId`.
 * Safe to call on every app start — does nothing if already migrated
 * or if there is no localStorage data.
 *
 * @returns `true` if migration ran, `false` if skipped.
 */
export async function migrateIfNeeded(userId: string): Promise<boolean> {
  // Already migrated — skip
  if (localStorage.getItem(MIGRATION_FLAG) === 'true') return false;

  // Read raw state
  const raw = localStorage.getItem(STORAGE_KEYS.STATE);
  if (!raw) return false;   // Brand-new user, nothing to migrate

  let state: BudgetState;
  try {
    state = JSON.parse(raw) as BudgetState;
  } catch {
    console.warn('[penny] migrateLocalStorage: could not parse localStorage state — skipping migration');
    return false;
  }

  try {
    await runMigration(userId, state);
    localStorage.setItem(MIGRATION_FLAG, 'true');
    console.info('[penny] migrateLocalStorage: migration complete ✓');
    return true;
  } catch (err) {
    console.error('[penny] migrateLocalStorage: migration failed —', err);
    // Don't set the flag — allow retry on next load
    return false;
  }
}

/** Returns true if this user has already been migrated. */
export function isMigrated(): boolean {
  return localStorage.getItem(MIGRATION_FLAG) === 'true';
}

// ─── Migration runner ──────────────────────────────────────────────

/**
 * Insert all entities from `state` into Supabase for `userId`.
 *
 * Exported so the budget store can call it after a CSV/JSON import
 * (preceded by deleteAllUserData) to push the entire imported state
 * to the cloud in one shot.
 *
 * @throws If any individual insert fails.
 */
export async function runMigration(userId: string, state: BudgetState): Promise<void> {
  // 1. Profile (scalar fields)
  await upsertProfile(userId, {
    allocation:              state.allocation,
    budgetDisplayMode:       state.budgetDisplayMode,
    payStart:                state.payStart,
    fundsRemaining:          state.fundsRemaining ?? 0,
    fundsRemainingUpdated:   state.fundsRemainingUpdated ?? '',
    hasOnboarded:            state.hasOnboarded ?? false,
    dismissedVersion:        state.dismissedVersion ?? null,
  });

  // 2. Income streams
  for (const s of state.incomeStreams ?? []) {
    await db.incomeStreams.insert(userId, s);
  }

  // 3. Expense cards (each card inserts its own items)
  for (const card of state.expenseCards ?? []) {
    await db.expenseCards.insert(userId, card);
  }

  // 4. Purchases
  for (const p of state.purchases ?? []) {
    await db.purchases.insert(userId, p);
  }

  // 5. Spending history periods (each period inserts its own items)
  for (const period of state.spendingHistory ?? []) {
    await db.spendingHistory.insertPeriod(userId, period);
  }

  // 6. Loans
  for (const l of state.loans ?? []) {
    await db.loans.insert(userId, l);
  }

  // 7. Credit cards
  for (const c of state.creditCards ?? []) {
    await db.creditCards.insert(userId, c);
  }

  // 8. Subscriptions
  for (const s of state.subscriptions ?? []) {
    await db.subscriptions.insert(userId, s);
  }

  // 9. Wishlist
  for (const w of state.wishlist ?? []) {
    await db.wishlist.insert(userId, w);
  }

  // 10. Savings accounts (must come before goals — FK dependency)
  for (const a of state.savingsAccounts ?? []) {
    await db.savingsAccounts.insert(userId, a);
  }

  // 11. Goals (depend on savings_accounts)
  for (const g of state.goals ?? []) {
    await db.goals.insert(userId, g);
  }

  // 12. Assets
  for (const a of state.assets ?? []) {
    await db.assets.insert(userId, a);
  }

  // 13. Net worth history
  for (const s of state.netWorthHistory ?? []) {
    await db.netWorthHistory.insert(userId, s);
  }

  // 14. Rules
  for (const r of state.rules ?? []) {
    await db.rules.insert(userId, r);
  }

  // 15. Budget alerts
  for (const a of state.budgetAlerts ?? []) {
    await db.budgetAlerts.insert(userId, a);
  }

  // 16. Spending categories
  for (const c of state.spendingCategories ?? []) {
    await db.spendingCategories.insert(userId, c);
  }

  // 17. One-time (windfall) incomes
  for (const i of state.oneTimeIncomes ?? []) {
    await db.oneTimeIncomes.insert(userId, i);
  }
}
