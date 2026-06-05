/**
 * Module:   stores/budget.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Summary:  Pinia store — single source of truth for all financial
 *           state. Mirrors the legacy state.js shape so existing
 *           localStorage data loads transparently.
 *
 *           Auto-persists on every mutation via $subscribe in main.ts.
 *           Includes v1→v2 schema migrations for legacy users.
 */

import { defineStore } from 'pinia';
import { genId, deepClone } from '@/utils/id';
import { exportStateToCSV, parseCSVToState, triggerCSVDownload } from '@/utils/csvImportExport';
import { exportStateToJSON, parseJSONToState, triggerJSONDownload } from '@/utils/jsonBackup';
import { isSupabaseConfigured } from '@/lib/supabase';
import { db, fetchAllUserData, upsertProfile, deleteAllUserData } from '@/lib/db';
import { getCurrentPeriodStart, getPeriodStartsBetween, getTotalMonthlyIncome } from '@/utils/calculations';
import { useToast } from '@/composables/useToast';
import { migrateIfNeeded, runMigration } from '@/lib/migrateLocalStorage';
import type {
  IncomeStream,
  ExpenseCard,
  ExpenseItem,
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
  BudgetAllocation,
  BudgetDisplayModes,
  BudgetType,
  SpendingCategory,
  ISODate,
  ISOMonth,
} from '@/types/budget';
import type { BudgetState } from '@/types/state';
import { STORAGE_KEYS } from '@/types/state';
import { DEFAULT_SPENDING_CATEGORIES } from '@/data/categories';

// ─── Factory: DEFAULT_STATE (matches legacy state.js exactly) ───

/**
 * Build a fresh DEFAULT_STATE with example placeholder entities.
 * Each call generates new IDs — never share the object across uses.
 */
export function makeDefaultState(): BudgetState {
  return {
    allocation: { needs: 50, wants: 30, savings: 20 },
    budgetDisplayMode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },

    incomeStreams: [],
    expenseCards: [],
    purchases: [],
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
      // Use a rolling "first of the month, 2 months from now" date so this
      // sample subscription never drifts into the 7-day renewal alert window.
      { id: genId(), name: 'Netflix', amount: 0, frequency: 'monthly', date: (() => { const d = new Date(); d.setMonth(d.getMonth() + 2); d.setDate(1); return d.toISOString().split('T')[0]; })(), category: 'Entertainment', budgetType: 'wants', cardId: null },
    ],

    wishlist: [
      { id: genId(), icon: '🎯', name: 'My first wishlist item', url: '' },
    ],

    savingsAccounts: [
      { id: genId(), name: 'Emergency Fund', balance: 0, defaultAllocated: 0, monthlyAllocations: {} },
      { id: genId(), name: 'Investments',    balance: 0, defaultAllocated: 0, monthlyAllocations: {} },
    ],

    goals: [],
    assets: [],
    netWorthHistory: [],

    payStart: null,
    lastArchivedPeriodStart: null,
    rules: [],
    budgetAlerts: [],
    fundsRemaining: 0,
    fundsRemainingUpdated: '',
    hasOnboarded: false,
    dismissedVersion: null,
    spendingCategories: DEFAULT_SPENDING_CATEGORIES.map(c => ({ ...c })),
  };
}

/**
 * Build a fresh BLANK_STATE used by clearAllData().
 * Same shape as DEFAULT_STATE but every collection is empty and
 * numeric fields are zeroed. Keeps the 50/30/20 allocation so the
 * dashboard is usable immediately after a reset.
 */
export function makeBlankState(): BudgetState {
  return {
    allocation: { needs: 50, wants: 30, savings: 20 },
    budgetDisplayMode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
    incomeStreams: [],
    expenseCards: [],
    purchases: [],
    spendingHistory: [],
    loans: [],
    creditCards: [],
    subscriptions: [],
    wishlist: [],
    savingsAccounts: [],
    goals: [],
    assets: [],
    netWorthHistory: [],
    payStart: null,
    lastArchivedPeriodStart: null,
    rules: [],
    budgetAlerts: [],
    fundsRemaining: 0,
    fundsRemainingUpdated: '',
    hasOnboarded: false,
    dismissedVersion: null,
    spendingCategories: DEFAULT_SPENDING_CATEGORIES.map(c => ({ ...c })),
  };
}

// ─── Migration: legacy v1 (pre-vite, pre-modular) → v2 ──────────

/**
 * Apply schema migrations to a parsed localStorage payload, then
 * ensure every forward-compat key exists with a sensible default.
 *
 * Safe to call on:
 *   - Fresh DEFAULT_STATE (no-op)
 *   - Legacy v1 payload (e.g. `state.gov`, `state.expenses` keyed object)
 *   - Partial state from corrupt or pre-Phase-2D storage
 *
 * Exported so tests can call it on synthetic payloads.
 *
 * @param raw Any parsed JSON value from localStorage.
 * @returns A fully populated BudgetState.
 */
export function migrateState(raw: unknown): BudgetState {
  // Start from a deep clone of whatever we got, falling back to DEFAULT_STATE
  // for non-object inputs.
  const isObject = typeof raw === 'object' && raw !== null && !Array.isArray(raw);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = isObject ? deepClone(raw) : makeDefaultState();

  // ── Migration: old state.gov → incomeStreams array ──
  if (s.gov !== undefined && !s.incomeStreams) {
    s.incomeStreams = [{ id: genId(), name: 'Government', amount: +s.gov, biweekly: true }];
    delete s.gov;
  }

  // ── Migration: old state.expenses (keyed object) → expenseCards array ──
  if (s.expenses && !s.expenseCards) {
    const labelMap: Record<string, string> = {
      'td-debit': 'TD Debit',
      'ws-debit': 'WS Debit',
      'ws-credit': 'WS Credit Card',
    };
    s.expenseCards = Object.entries(s.expenses).map(([key, items]) => ({
      id: genId(),
      label: labelMap[key] || key,
      items: (items as ExpenseItem[]) || [],
    }));
    delete s.expenses;
  }

  // ── Migration: payment-tracking fields on existing loans ──
  if (Array.isArray(s.loans)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    s.loans.forEach((loan: any) => {
      if (loan.paymentAmount === undefined) loan.paymentAmount = 0;
      if (!loan.frequency) loan.frequency = 'monthly';
      if (loan.date === undefined) loan.date = '';
      if (!loan.budgetType) loan.budgetType = 'needs';
      if (loan.cardId === undefined) loan.cardId = null;
    });
  }

  // ── Migration: subscription new fields ──
  if (Array.isArray(s.subscriptions)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    s.subscriptions.forEach((sub: any) => {
      if (sub.amount === undefined) sub.amount = 0;
      if (!sub.frequency) sub.frequency = 'monthly';
      if (!sub.category) sub.category = 'Other';
      if (!sub.budgetType) sub.budgetType = 'wants';
      if (sub.cardId === undefined) sub.cardId = null;
      // Sprint 17: custom-days support
      if (!Array.isArray(sub.daysOfWeek)) sub.daysOfWeek = [];
    });
  }

  // ── Migration: savings accounts (allocated → defaultAllocated) ──
  if (Array.isArray(s.savingsAccounts)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    s.savingsAccounts.forEach((acct: any) => {
      if (acct.balance === undefined) acct.balance = 0;
      if (acct.defaultAllocated === undefined) {
        acct.defaultAllocated = acct.allocated || 0;
        delete acct.allocated;
      }
      if (!acct.monthlyAllocations) acct.monthlyAllocations = {};
    });
  }

  // ── Forward-compat: ensure all keys exist ──
  if (!s.allocation) s.allocation = { needs: 50, wants: 30, savings: 20 };
  if (!s.budgetDisplayMode) s.budgetDisplayMode = { needs: 'monthly', wants: 'monthly', savings: 'monthly' };
  if (!s.incomeStreams) s.incomeStreams = [];
  if (!s.expenseCards) s.expenseCards = [];
  if (!s.purchases) s.purchases = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s.purchases.forEach((p: any) => {
    if (p.cardId === undefined) p.cardId = null;
    if (p.budgetType === undefined) p.budgetType = 'wants';
  });
  if (!s.spendingHistory) s.spendingHistory = [];
  if (!s.loans) s.loans = [];
  if (!s.creditCards) s.creditCards = [];
  if (!s.wishlist) s.wishlist = [];
  if (!s.savingsAccounts) s.savingsAccounts = [];
  if (!s.subscriptions) s.subscriptions = [];
  if (!s.goals) s.goals = [];
  if (!s.assets) s.assets = [];
  if (!s.netWorthHistory) s.netWorthHistory = [];
  if (s.payStart === undefined) s.payStart = null;
  // RS-23: lastArchivedPeriodStart bookkeeping field for auto-rollover.
  // Legacy states without it start at null; the first rollover check after
  // upgrade will initialise it to the current period start without archiving
  // any retro periods.
  if (s.lastArchivedPeriodStart === undefined) s.lastArchivedPeriodStart = null;
  if (!s.rules) s.rules = [];
  if (!s.budgetAlerts) s.budgetAlerts = [];
  if (s.fundsRemaining === undefined) s.fundsRemaining = 0;
  if (s.fundsRemainingUpdated === undefined) s.fundsRemainingUpdated = '';
  if (s.hasOnboarded === undefined) s.hasOnboarded = false;
  if (s.dismissedVersion === undefined) s.dismissedVersion = null;

  // ── Sprint 19: user-editable spending categories ──
  if (!Array.isArray(s.spendingCategories) || s.spendingCategories.length === 0) {
    s.spendingCategories = DEFAULT_SPENDING_CATEGORIES.map((c: SpendingCategory) => ({ ...c }));
  } else {
    // Ensure the protected 'other' entry always exists
    const hasOther = s.spendingCategories.some((c: SpendingCategory) => c.id === 'other');
    if (!hasOther) {
      const seed = DEFAULT_SPENDING_CATEGORIES.find(c => c.id === 'other')!;
      s.spendingCategories.push({ ...seed });
    }
    // Ensure every entry has all required fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    s.spendingCategories = s.spendingCategories.map((c: any) => ({
      id:    c.id    || genId(),
      name:  c.name  || 'Other',
      color: c.color || '#8b95ad',
    }));
  }

  return s as BudgetState;
}

// ─── Storage helpers (pure functions; testable) ─────────────────

/**
 * Read + migrate the persisted state.
 * Returns DEFAULT_STATE on any failure — missing data, corrupt JSON,
 * or storage unavailable (e.g. Safari private-mode quota = 0).
 */
export function loadStateFromStorage(): BudgetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATE);
    if (!raw) return makeDefaultState();
    return migrateState(JSON.parse(raw));
  } catch (e) {
    console.error('[penny] Could not read state from localStorage — starting with defaults:', e);
    return makeDefaultState();
  }
}

/**
 * Persist a state object to localStorage as JSON.
 *
 * @returns `true` on success, `false` if the write failed (e.g. quota exceeded).
 *          Callers should surface a warning to the user on `false`.
 */
export function saveStateToStorage(state: BudgetState): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state));
    return true;
  } catch (e) {
    // DOMException: QuotaExceededError is the most common failure
    console.error('[penny] Failed to persist state to localStorage:', e);
    return false;
  }
}

// ─── Pinia store definition ─────────────────────────────────────

// ─── Module-level DB helpers ─────────────────────────────────────
// _userId is set by initStore() after auth resolves (auth.uid()).
// Empty string = Supabase not in use; syncDb() is a no-op in that case.

let _userId = '';

/**
 * Guards against concurrent executions of initStore().
 *
 * onAuthStateChange can fire multiple times per page load (INITIAL_SESSION,
 * TOKEN_REFRESHED, SIGNED_IN — often within milliseconds of each other when
 * the user has both a magic-link and a Google OAuth account linked to the same
 * email).  Each invocation would launch ~18 parallel Supabase queries,
 * saturating the free-tier PgBouncer pool (60 connections) and causing the
 * later calls' queries to time out.
 *
 * With the event-filter in auth.ts (only INITIAL_SESSION / SIGNED_IN trigger
 * initStore) this guard should rarely fire.  It stays here as a belt-and-
 * suspenders safety net for any edge case we haven't anticipated.
 */
let _syncInProgress = false;

/**
 * Fire-and-forget Supabase write. Logs errors but never throws — the local
 * state is already updated optimistically so the user sees no interruption.
 */
function syncDb(op: () => Promise<void>, ctx: string): void {
  if (!isSupabaseConfigured()) return;
  op().catch(err => console.error(`[penny] db sync (${ctx}):`, err));
}

// ─── RS-24: helpers for per-period budget / spent snapshots ──────
// These are extracted so closeCurrentPeriod, closeCurrentPeriodManually, and
// autoArchiveMissedPeriods all populate SpendingHistoryPeriod.budgets and
// .spent in exactly the same way. Both helpers are pure.

/** Add `n` days to an ISO date string ('YYYY-MM-DD'), returning ISO. */
function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/** Bi-weekly dollar envelopes derived from current allocation + income. */
function buildBudgetsSnapshot(state: BudgetState): {
  needs: number;
  wants: number;
  savings: number;
} {
  const monthly = getTotalMonthlyIncome(state);
  const alloc = state.allocation;
  return {
    needs:   (monthly * (alloc.needs   ?? 0) / 100) / 2,
    wants:   (monthly * (alloc.wants   ?? 0) / 100) / 2,
    savings: (monthly * (alloc.savings ?? 0) / 100) / 2,
  };
}

/** Actual spend totals (purchases only, deductions excluded). */
function buildSpentSnapshot(items: Array<{ amount: number; budgetType?: string }>): {
  needs: number;
  wants: number;
} {
  let needs = 0, wants = 0;
  for (const p of items) {
    if (p.budgetType === 'needs') needs += p.amount;
    else wants += p.amount;
  }
  return { needs, wants };
}

/**
 * Replace all Supabase data for the current user with the contents of `state`.
 *
 * Called fire-and-forget after a CSV or JSON import replaces the local store.
 * The UI stays responsive while the cloud push runs in the background.
 * If the push fails, the user sees a toast and can reload to retry.
 *
 * Flow: deleteAllUserData (parallel deletes) → runMigration (sequential inserts).
 * Child rows (expense_items, spending_history_items, goals) are removed
 * automatically via CASCADE DELETE when their parent rows are deleted.
 */
async function pushImportedState(state: BudgetState): Promise<void> {
  if (!_userId || !isSupabaseConfigured()) return;

  try {
    await deleteAllUserData(_userId);
    await runMigration(_userId, state);
    console.info('[penny] import: Supabase sync complete ✓');
  } catch (err) {
    console.error('[penny] import: Supabase sync failed —', err);
    useToast().show(
      '⚠ Import saved locally but cloud sync failed. Refresh to retry.',
      'warning',
      7_000,
    );
  }
}

// ─── RS-29: one-shot push-up migration ───────────────────────────
//
// Three prior sprints (RS-23, RS-24, RS-28) added optional fields to the
// TypeScript layer but skipped the corresponding Supabase migrations:
//   • BudgetState.lastArchivedPeriodStart   (RS-23)
//   • SpendingHistoryPeriod.budgets / .spent (RS-24)
//   • WishlistItem.targetMonth              (RS-28)
//
// The localStorage-only approach worked because Object.assign(state, data)
// only copies properties present on `data`. Once RS-29 promotes these to
// real columns, the fetched `data` WILL include the fields (set to null
// for legacy rows that haven't been written since the migration ran),
// which would clobber any locally-set values on the next reload.
//
// This helper runs BETWEEN fetchAllUserData and Object.assign. For each
// field, if the local state has a value but the fetched data is still null
// (i.e. the DB hasn't been written since the migration), it:
//   1. Mutates the in-place `data` object so Object.assign carries the
//      local value forward into the new authoritative state
//   2. Fires a `syncDb` write so the cloud catches up
//
// After the first run completes, DB and local agree → all branches no-op.
// Failures are logged but never throw — the local data is already showing
// and the user can refresh to retry later (same fire-and-forget posture as
// the existing per-action syncDb calls).

/**
 * NOTE: exported solely so the test suite can exercise the migration paths
 * directly (see tests/stores/pushUpOptionalFields.spec.ts). Not part of the
 * public store API — production callers always reach it via `initStore`.
 */
export async function pushUpOptionalFields(
  userId: string,
  localState: BudgetState,
  data: Partial<BudgetState>,
): Promise<void> {
  if (!userId || !isSupabaseConfigured()) return;

  // ── lastArchivedPeriodStart (profiles table) ────────────────────
  if (data.lastArchivedPeriodStart == null && localState.lastArchivedPeriodStart != null) {
    const value = localState.lastArchivedPeriodStart;
    data.lastArchivedPeriodStart = value; // preserve locally on the assign that follows
    try {
      await upsertProfile(userId, { lastArchivedPeriodStart: value });
      console.info('[penny] RS-29 push-up: lastArchivedPeriodStart →', value);
    } catch (err) {
      console.warn('[penny] RS-29 push-up failed (lastArchivedPeriodStart):', err);
    }
  }

  // ── SpendingHistoryPeriod.budgets / .spent ──────────────────────
  // We walk the fetched periods (cloud is the index of truth for which
  // periods exist) and patch any whose local counterpart has snapshots
  // the cloud row is missing. Matching by `id` is reliable — periods
  // never change id after creation.
  if (data.spendingHistory) {
    const localPeriodsById = new Map(localState.spendingHistory.map((p) => [p.id, p]));
    for (const fetched of data.spendingHistory) {
      const local = localPeriodsById.get(fetched.id);
      if (!local) continue;
      const patch: { budgets?: typeof fetched.budgets; spent?: typeof fetched.spent } = {};
      if (fetched.budgets == null && local.budgets != null) {
        fetched.budgets = local.budgets;
        patch.budgets = local.budgets;
      }
      if (fetched.spent == null && local.spent != null) {
        fetched.spent = local.spent;
        patch.spent = local.spent;
      }
      if (Object.keys(patch).length > 0) {
        try {
          await db.spendingHistory.updatePeriodSnapshots(userId, fetched.id, patch);
          console.info('[penny] RS-29 push-up: period', fetched.id, '→', Object.keys(patch).join(' + '));
        } catch (err) {
          console.warn('[penny] RS-29 push-up failed (period', fetched.id, '):', err);
        }
      }
    }
  }

  // ── WishlistItem.targetMonth ────────────────────────────────────
  if (data.wishlist) {
    const localWishById = new Map(localState.wishlist.map((w) => [w.id, w]));
    for (const fetched of data.wishlist) {
      const local = localWishById.get(fetched.id);
      if (!local) continue;
      if (fetched.targetMonth == null && local.targetMonth != null) {
        const value = local.targetMonth;
        fetched.targetMonth = value;
        try {
          // wishlist.update writes ALL persistable wishlist columns. Use the
          // merged object so we don't accidentally null out fields the cloud
          // already has (price, saved, etc) that local might not match.
          await db.wishlist.update(userId, fetched);
          console.info('[penny] RS-29 push-up: wishlist', fetched.id, '→ targetMonth', value);
        } catch (err) {
          console.warn('[penny] RS-29 push-up failed (wishlist', fetched.id, '):', err);
        }
      }
    }
  }
}

// ─── RS-30: Supabase fetch reliability (Level 1) ─────────────────
//
// The previous architecture wrapped `fetchAllUserData` in a 20-second
// `Promise.race` deadline and surfaced any failure as a "sync failed,
// using localStorage" toast. In practice on Supabase free tier we see
// occasional timeouts that follow a specific signature:
//
//   • Probe (single tiny `select=id&limit=0`) succeeds with HTTP 200
//     in under a second
//   • Full fetch (18 parallel `select=*` queries via Promise.all)
//     times out at 20s
//
// That fingerprint points at PgBouncer pool pressure on the free
// tier — most queries return fast but the long tail of a few queued
// behind the pool exhaust the deadline. Free-tier pools clear quickly
// once the initial burst completes, so a single delayed retry usually
// succeeds.
//
// RS-30 (Level 1 mitigation):
//   1. Bump default timeout 20s → 30s. Covers the long tail of
//      pool-queued queries without forcing the user to wait absurdly
//      long when the project is genuinely unreachable.
//   2. ONE automatic retry, 2s after the first timeout, with the same
//      deadline. Non-timeout errors (RLS, schema mismatch, 4xx, 5xx)
//      throw immediately — those are persistent failures that retry
//      won't help.
//
// RS-31 (planned Level 2): collapse the 18 parallel queries into a
// single Supabase RPC call so pool pressure becomes structurally
// impossible. Bigger refactor; this Level 1 work buys headroom to
// do that on a comfortable schedule.

/** RS-30: default timeout for Supabase fetches. Bumped from 20s in v2.20. */
const SUPABASE_FETCH_TIMEOUT_MS = 30_000;

/** RS-30: delay between the first attempt timing out and the retry firing. */
const SUPABASE_RETRY_DELAY_MS = 2_000;

/** Recognises timeout errors raised by `withTimeout` so we know when to retry. */
const TIMEOUT_ERROR_MARKER = '[penny] DB fetch timed out';

/**
 * Race a promise against a synthetic deadline. `fetch()` has no built-in
 * timeout, so without this, a stalled Supabase request would block sync
 * indefinitely. The rejected error carries `TIMEOUT_ERROR_MARKER` so
 * downstream callers can distinguish "deadline exceeded" from "server
 * returned an error" — only the former is worth retrying.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number = SUPABASE_FETCH_TIMEOUT_MS,
): Promise<T> {
  const deadline = new Promise<T>((_, reject) =>
    setTimeout(
      () => reject(new Error(`${TIMEOUT_ERROR_MARKER} after ${ms} ms`)),
      ms,
    ),
  );
  return Promise.race([promise, deadline]);
}

/** True for timeout errors raised by `withTimeout`; false for everything else. */
function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith(TIMEOUT_ERROR_MARKER);
}

/**
 * RS-30: Fetch all user data with a single automatic retry on timeout.
 *
 * Behaviour:
 *   • First attempt: standard `withTimeout(fetchAllUserData(userId))`
 *   • If the first attempt resolves (data or null) → return immediately
 *   • If the first attempt rejects with a TIMEOUT error → wait
 *     SUPABASE_RETRY_DELAY_MS, then try once more with the same deadline
 *   • If the first attempt rejects with anything ELSE (RLS, HTTP 4xx/5xx,
 *     network refused, etc.) → re-throw immediately. Those are persistent
 *     failures; retry won't help and would only delay the user.
 *   • If the retry also fails → re-throw whatever error it produced
 *
 * Exported so the test suite can exercise the retry path directly without
 * mounting the full Pinia store.
 */
export async function fetchUserDataWithRetry(
  userId: string,
  options: {
    timeoutMs?: number;
    retryDelayMs?: number;
  } = {},
): Promise<Partial<BudgetState> | null> {
  const timeoutMs    = options.timeoutMs    ?? SUPABASE_FETCH_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? SUPABASE_RETRY_DELAY_MS;

  try {
    return await withTimeout(fetchAllUserData(userId), timeoutMs);
  } catch (firstErr) {
    if (!isTimeoutError(firstErr)) {
      // Persistent failure — don't waste the user's time retrying.
      throw firstErr;
    }
    console.info(
      `[penny] DB fetch timed out — waiting ${retryDelayMs}ms and retrying once (RS-30)`,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, retryDelayMs));
    return await withTimeout(fetchAllUserData(userId), timeoutMs);
  }
}

// ─────────────────────────────────────────────────────────────────

export const useBudgetStore = defineStore('budget', {
  state: (): BudgetState => makeDefaultState(),

  getters: {
    /** Sum monthly income across all streams; biweekly entries doubled. */
    totalMonthlyIncome(state): number {
      return state.incomeStreams.reduce((sum, s) => {
        return sum + (s.biweekly ? s.amount * 2 : s.amount);
      }, 0);
    },

    /** Allocation ratios as 0–1 decimals (from percentage state). */
    allocationRatios(state): { needs: number; wants: number; savings: number } {
      const a = state.allocation;
      return {
        needs: (a.needs || 0) / 100,
        wants: (a.wants || 0) / 100,
        savings: (a.savings || 0) / 100,
      };
    },

    /**
     * True when the user has never completed onboarding AND has not yet
     * added any income streams.  Used to conditionally show the welcome
     * stepper modal and the nudge empty-state variants.
     */
    isFirstRun(state): boolean {
      return !state.hasOnboarded && state.incomeStreams.length === 0;
    },

    /** Sum of monthly expense-card item costs (biweekly items doubled). */
    grandTotalExpenses(state): number {
      return state.expenseCards.reduce((sum, card) => {
        return sum + card.items.reduce((s, i) => s + (i.biweekly ? i.amount * 2 : i.amount), 0);
      }, 0);
    },
  },

  actions: {
    // ─── Persistence & init ────────────────────────────────────

    /**
     * Primary init — called once on app boot (replaces raw loadFromStorage).
     * When Supabase is configured, fetches from the DB and migrates any
     * existing localStorage data for first-time cloud users.
     * Falls back to localStorage silently when Supabase is not configured or
     * the network call fails.
     *
     * @param userId  auth.uid() from the Supabase session. Empty string in
     *                localStorage-only mode (Supabase not configured).
     */
    async initStore(userId = ''): Promise<void> {
      _userId = userId;

      if (!isSupabaseConfigured()) {
        this.loadFromStorage();
        return;
      }

      // Belt-and-suspenders concurrency guard (primary defence is the event
      // filter in auth.ts — see the _syncInProgress declaration for context).
      if (_syncInProgress) {
        console.info('[penny] initStore: sync already in progress — skipping duplicate call');
        return;
      }
      _syncInProgress = true;

      try {
      // Show locally-cached data immediately so the user sees something
      // real while the Supabase round-trip resolves (or times out).
      this.loadFromStorage();

      // ── Connectivity probe ───────────────────────────────────────────
      // Before firing all 18 queries, hit the REST root with a 5-second
      // AbortSignal timeout.  This gives us the real HTTP status code or
      // CORS error rather than our synthetic timeout message, and fails
      // fast so we don't wait 20 s when the project is clearly unreachable.
      try {
        const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;
        const probeUrl = `${VITE_SUPABASE_URL}/rest/v1/profiles?select=id&limit=0`;
        const signal = AbortSignal.timeout ? AbortSignal.timeout(5_000) : undefined;
        const probe = await fetch(probeUrl, {
          headers: {
            apikey:        VITE_SUPABASE_ANON_KEY ?? '',
            Authorization: `Bearer ${VITE_SUPABASE_ANON_KEY ?? ''}`,
          },
          signal,
        });
        console.info(`[penny] Supabase probe → HTTP ${probe.status}`);
        if (!probe.ok) {
          const body = await probe.text().catch(() => '');
          console.warn('[penny] Supabase probe error body:', body);
        }
      } catch (probeErr) {
        console.warn('[penny] Supabase probe failed (network/CORS):', probeErr);
        useToast().show(
          '⚠ Cannot reach Supabase — showing local backup. ' +
          'Check console for details (likely CORS or wrong project URL).',
          'warning',
          7_000,
        );
        return; // skip full fetch — it will just timeout anyway
      }

      // RS-30: fetch with one automatic retry on timeout. The helper handles
      // the 30 s deadline, the 2 s backoff, and the "retry only on timeout"
      // rule (non-timeout errors throw immediately so we don't waste the
      // user's time retrying persistent failures like RLS or HTTP 4xx).
      try {
        const data = await fetchUserDataWithRetry(userId);

        if (data) {
          // RS-29 push-up migration: BEFORE we overwrite local state with
          // the fetched data, walk the optional fields that just gained DB
          // columns and push any locally-set values up to the cloud if the
          // remote copy is still null. This is a one-shot — after the first
          // run, DB and local agree and the helper is a no-op.
          //
          // Why: localStorage hydrated state already contains values like
          // `wishlist[i].targetMonth` (RS-28) and `lastArchivedPeriodStart`
          // (RS-23). Object.assign(this.$state, data) below would clobber
          // those with null because the fields were only just promoted to
          // real columns. Pushing them up first preserves the data.
          await pushUpOptionalFields(userId, this.$state, data);

          // Supabase has data — use it as source of truth
          Object.assign(this.$state, data);
        } else {
          // No profile row yet — try one-time localStorage → Supabase migration
          const migrated = await migrateIfNeeded(userId);
          if (migrated) {
            const refreshed = await fetchUserDataWithRetry(userId);
            if (refreshed) Object.assign(this.$state, refreshed);
          } else {
            // Brand-new user — keep default state (already loaded above)
          }
        }
      } catch (err) {
        // Local data is already showing (loaded above).  Warn visibly so
        // the user knows the cloud sync failed and can take action.
        console.warn('[penny] Supabase sync failed, using localStorage:', err);

        // _userId is '' when the user signed out mid-sync (resetStore was
        // called optimistically).  In that case the network failure is
        // expected (the session was revoked); showing a toast would be
        // confusing and alarm the user unnecessarily.
        if (_userId) {
          // RS-30: tweak the message so the user understands a retry was
          // already attempted — "showing local backup" is more reassuring
          // than the previous "check your project status" alarm bell.
          const msg = isTimeoutError(err)
            ? '⚠ Cloud sync slow — tried twice, showing local backup. Your changes are safe and will sync on the next successful refresh.'
            : '⚠ Cloud sync failed — showing local backup. Check your Supabase project status and refresh to retry.';
          useToast().show(msg, 'warning', 7_000);
        }
      }

      } finally {
        _syncInProgress = false;
      }
    },

    /** Replace entire state from localStorage (with migrations). */
    loadFromStorage(): void {
      this.$state = loadStateFromStorage();
    },

    /** Force a persist (the $subscribe plugin also persists on every mutation).
     *  Returns true on success, false if storage is unavailable/full. */
    saveToStorage(): boolean {
      return saveStateToStorage(this.$state);
    },

    /** Reset to BLANK_STATE (used by Settings → Clear All Data). */
    clearAll(): void {
      this.$state = makeBlankState();
    },

    /**
     * Called on sign-out. Clears the user ID, resets store to default
     * state, and removes the localStorage snapshot so stale data can't
     * leak to the next session.
     */
    resetStore(): void {
      _userId = '';
      this.$state = makeDefaultState();
      try { localStorage.removeItem(STORAGE_KEYS.STATE); } catch { /* ignore */ }
    },

    // ─── Income streams ───────────────────────────────────────

    addIncomeStream(stream: Omit<IncomeStream, 'id'>): IncomeStream {
      const item: IncomeStream = { ...stream, id: genId() };
      this.incomeStreams.push(item);
      syncDb(() => db.incomeStreams.insert(_userId, item), 'addIncomeStream');
      return item;
    },

    updateIncomeStream(id: string, patch: Partial<IncomeStream>): void {
      const target = this.incomeStreams.find((s) => s.id === id);
      if (target) {
        Object.assign(target, patch);
        syncDb(() => db.incomeStreams.update(_userId, target), 'updateIncomeStream');
      }
    },

    deleteIncomeStream(id: string): void {
      this.incomeStreams = this.incomeStreams.filter((s) => s.id !== id);
      syncDb(() => db.incomeStreams.delete(_userId, id), 'deleteIncomeStream');
    },

    // ─── Budget allocation ────────────────────────────────────

    setAllocation(allocation: BudgetAllocation): void {
      this.allocation = allocation;
      syncDb(() => upsertProfile(_userId, { allocation }), 'setAllocation');
    },

    setBudgetDisplayMode(modes: Partial<BudgetDisplayModes>): void {
      this.budgetDisplayMode = { ...this.budgetDisplayMode, ...modes };
      syncDb(() => upsertProfile(_userId, { budgetDisplayMode: this.budgetDisplayMode }), 'setBudgetDisplayMode');
    },

    // ─── Expense cards (+ nested items) ───────────────────────

    addExpenseCard(label: string): ExpenseCard {
      const card: ExpenseCard = { id: genId(), label, items: [] };
      this.expenseCards.push(card);
      syncDb(() => db.expenseCards.insert(_userId, card), 'addExpenseCard');
      return card;
    },

    renameExpenseCard(id: string, label: string): void {
      const target = this.expenseCards.find((c) => c.id === id);
      if (target) {
        target.label = label;
        syncDb(() => db.expenseCards.update(_userId, target), 'renameExpenseCard');
      }
    },

    deleteExpenseCard(id: string): void {
      this.expenseCards = this.expenseCards.filter((c) => c.id !== id);
      syncDb(() => db.expenseCards.delete(_userId, id), 'deleteExpenseCard');
    },

    addExpenseItem(cardId: string, item: Omit<ExpenseItem, 'id'>): ExpenseItem | null {
      const card = this.expenseCards.find((c) => c.id === cardId);
      if (!card) return null;
      const newItem: ExpenseItem = { ...item, id: genId() };
      card.items.push(newItem);
      syncDb(() => db.expenseItems.insert(_userId, cardId, newItem), 'addExpenseItem');
      return newItem;
    },

    updateExpenseItem(cardId: string, itemId: string, patch: Partial<ExpenseItem>): void {
      const card = this.expenseCards.find((c) => c.id === cardId);
      const item = card?.items.find((i) => i.id === itemId);
      if (item) {
        Object.assign(item, patch);
        syncDb(() => db.expenseItems.update(_userId, item), 'updateExpenseItem');
      }
    },

    deleteExpenseItem(cardId: string, itemId: string): void {
      const card = this.expenseCards.find((c) => c.id === cardId);
      if (card) {
        card.items = card.items.filter((i) => i.id !== itemId);
        syncDb(() => db.expenseItems.delete(_userId, itemId), 'deleteExpenseItem');
      }
    },

    // ─── Purchases ────────────────────────────────────────────

    addPurchase(purchase: Omit<Purchase, 'id'>): Purchase {
      const item: Purchase = { ...purchase, id: genId() };
      this.purchases.push(item);
      syncDb(() => db.purchases.insert(_userId, item), 'addPurchase');
      return item;
    },

    updatePurchase(id: string, patch: Partial<Purchase>): void {
      const target = this.purchases.find((p) => p.id === id);
      if (target) {
        Object.assign(target, patch);
        syncDb(() => db.purchases.update(_userId, target), 'updatePurchase');
      }
    },

    deletePurchase(id: string): void {
      this.purchases = this.purchases.filter((p) => p.id !== id);
      syncDb(() => db.purchases.delete(_userId, id), 'deletePurchase');
    },

    /**
     * Update the spending-category tag on a single item inside an archived
     * period. Addressed by [periodId, itemIndex] since history items lack
     * guaranteed IDs. No-op when the period or index is not found.
     */
    updateHistoryItemCategory(periodId: string, itemIndex: number, newCategory: string): void {
      const period = this.spendingHistory.find((p) => p.id === periodId);
      if (!period) return;
      const item = period.items[itemIndex];
      if (!item) return;
      item.category = newCategory;
    },

    /**
     * Close the current period: snapshot purchases → history, then clear.
     *
     * RS-24: now also captures `budgets` + `spent` snapshots so Spending
     * Analytics can show per-period surplus/overage. Both fields are derived
     * from current state at archive time (allocation %, total monthly income,
     * and the purchases being archived).
     */
    closeCurrentPeriod(periodDate: ISODate): SpendingHistoryPeriod {
      const itemsToArchive = [...this.purchases];
      const total = itemsToArchive.reduce((s, p) => s + p.amount, 0);
      const period: SpendingHistoryPeriod = {
        id: genId(),
        date: periodDate,
        total,
        items: itemsToArchive.map((p) => ({
          name: p.name,
          amount: p.amount,
          category: p.category,
          date: p.date,
        })),
        budgets: buildBudgetsSnapshot(this.$state),
        spent: buildSpentSnapshot(itemsToArchive),
      };
      this.spendingHistory.push(period);
      this.purchases = [];
      syncDb(() => db.spendingHistory.insertPeriod(_userId, period), 'closeCurrentPeriod');
      // BUG-023: the archived purchases must also be deleted from the
      // `purchases` Supabase table. Without this, a second device loading
      // from the DB would see all the old purchases in `budget.purchases`,
      // and the rollover guard (lastArchivedPeriodStart already advanced)
      // would silently skip re-archiving them.
      for (const p of itemsToArchive) {
        syncDb(() => db.purchases.delete(_userId, p.id), 'closeCurrentPeriod:deletePurchase');
      }
      return period;
    },

    /**
     * RS-24 — Manually close the current pay period. Power-user affordance
     * for force-ending a period before its natural 14-day boundary.
     *
     * Behaviour:
     *   • Archives `purchases` with date = `currentPeriodStart` (matches the
     *     auto-rollover semantic from RS-23).
     *   • Captures `budgets` + `spent` snapshots like `closeCurrentPeriod`.
     *   • Sets `lastArchivedPeriodStart` to the NEXT period start so the
     *     natural auto-rollover doesn't double-archive when it eventually
     *     fires. Any purchases the user makes between now and that next
     *     natural rollover will be archived as part of that next period.
     *   • Returns null when there's nothing meaningful to do — either
     *     payStart is unconfigured, OR the period is already archived
     *     (lastArchivedPeriodStart is already past the current period).
     *     Callers (UI) should disable their trigger when purchases is
     *     empty, but this guard belongs in the action too.
     *
     * @returns The archived period, or null when nothing was archived.
     */
    closeCurrentPeriodManually(today: Date = new Date()): SpendingHistoryPeriod | null {
      if (!this.payStart) return null;
      const currentStart = getCurrentPeriodStart(this.$state, today);
      if (!currentStart) return null;

      // Already advanced past this period — manual close would create a
      // future-dated archive, which is wrong. Bail.
      if (this.lastArchivedPeriodStart && this.lastArchivedPeriodStart > currentStart) {
        return null;
      }

      const itemsToArchive = [...this.purchases];
      const total = itemsToArchive.reduce((s, p) => s + p.amount, 0);
      const period: SpendingHistoryPeriod = {
        id: genId(),
        date: currentStart,
        total,
        items: itemsToArchive.map((p) => ({
          name: p.name,
          amount: p.amount,
          category: p.category,
          date: p.date,
        })),
        budgets: buildBudgetsSnapshot(this.$state),
        spent: buildSpentSnapshot(itemsToArchive),
      };

      this.spendingHistory.push(period);
      this.purchases = [];
      // Advance the rollover anchor to the NEXT period start so the natural
      // auto-rollover skips this window (it's already archived).
      this.lastArchivedPeriodStart = addDaysISO(currentStart, 14);

      syncDb(() => db.spendingHistory.insertPeriod(_userId, period), 'closeCurrentPeriodManually');
      // RS-29: lastArchivedPeriodStart is now a real DB column; sync it.
      syncDb(
        () => upsertProfile(_userId, { lastArchivedPeriodStart: this.lastArchivedPeriodStart }),
        'closeCurrentPeriodManually:lastArchivedPeriodStart',
      );
      // BUG-023: delete archived purchases from the DB so a second device
      // does not re-load them as live current-period purchases.
      for (const p of itemsToArchive) {
        syncDb(() => db.purchases.delete(_userId, p.id), 'closeCurrentPeriodManually:deletePurchase');
      }
      return period;
    },

    /**
     * RS-23 — Auto-archive every bi-weekly pay period that has elapsed since
     * `lastArchivedPeriodStart`. Idempotent: calling it twice in the same
     * period is a no-op. Safe to call from app load and visibility-change
     * handlers without coordination.
     *
     * Behaviour:
     *   • Returns 0 (and does nothing) when `payStart` is unconfigured.
     *   • On first run after upgrade — when `lastArchivedPeriodStart` is null
     *     and `payStart` is set — anchors `lastArchivedPeriodStart` to the
     *     current period start without archiving anything. The current
     *     window's purchases remain in place.
     *   • When the current period equals (or precedes) `lastArchivedPeriodStart`,
     *     returns 0 — nothing to archive yet.
     *   • Otherwise, archives every missed period [last, current) as its own
     *     `SpendingHistoryPeriod` row (empty periods included — keeps the
     *     timeline contiguous). Each row's `date` is the PERIOD START.
     *
     * Purchase bucketing:
     *   • A purchase with `p.date` in `[periodStart, periodStart+14)` falls
     *     into that period.
     *   • Undated purchases (`p.date` falsy) go into the MOST RECENT missed
     *     period (the one immediately before the current period).
     *   • Backdated purchases older than `lastArchivedPeriodStart` go into
     *     the OLDEST missed period (so no purchase is ever lost).
     *   • Purchases with `p.date >= currentPeriodStart` are preserved in the
     *     live `purchases` array — they belong to the in-progress period.
     *
     * Sync: each new SpendingHistoryPeriod is also pushed to the database
     * via `db.spendingHistory.insertPeriod`. `lastArchivedPeriodStart` is
     * NOT synced to the profile (intentional — see types/state.ts doc).
     *
     * @returns The number of archived periods (0 means no rollover occurred).
     */
    autoArchiveMissedPeriods(today: Date = new Date()): number {
      if (!this.payStart) return 0;
      const currentStart = getCurrentPeriodStart(this.$state, today);
      if (!currentStart) return 0;

      // First-run init: anchor without archiving any retro periods.
      if (!this.lastArchivedPeriodStart) {
        this.lastArchivedPeriodStart = currentStart;
        // RS-29: persist the anchor so it's available on other devices.
        syncDb(
          () => upsertProfile(_userId, { lastArchivedPeriodStart: this.lastArchivedPeriodStart }),
          'autoArchiveMissedPeriods:firstRunInit',
        );
        return 0;
      }

      // Already up to date.
      if (currentStart <= this.lastArchivedPeriodStart) return 0;

      const missedStarts = getPeriodStartsBetween(this.lastArchivedPeriodStart, currentStart);
      if (missedStarts.length === 0) {
        // Defensive: shouldn't happen given the prior guard, but bail safely.
        this.lastArchivedPeriodStart = currentStart;
        syncDb(
          () => upsertProfile(_userId, { lastArchivedPeriodStart: this.lastArchivedPeriodStart }),
          'autoArchiveMissedPeriods:defensiveAdvance',
        );
        return 0;
      }

      const oldestMissed = missedStarts[0];
      const newestMissed = missedStarts[missedStarts.length - 1];

      // Bucket purchases by date. Purchases with date >= currentStart stay live.
      const live: typeof this.purchases = [];
      const buckets: Record<string, typeof this.purchases> = {};
      for (const start of missedStarts) buckets[start] = [];

      for (const p of this.purchases) {
        // Live (in-progress) period — keep in purchases array
        if (p.date && p.date >= currentStart) {
          live.push(p);
          continue;
        }
        // Backdated (older than the earliest archived) → oldest missed bucket
        if (p.date && p.date < oldestMissed) {
          buckets[oldestMissed].push(p);
          continue;
        }
        // Undated → most recent missed bucket
        if (!p.date) {
          buckets[newestMissed].push(p);
          continue;
        }
        // In-range: find the period that contains p.date.
        // missedStarts is sorted ascending; pick the highest start <= p.date.
        let target = oldestMissed;
        for (let i = 0; i < missedStarts.length; i++) {
          if (missedStarts[i] <= p.date) target = missedStarts[i];
          else break;
        }
        buckets[target].push(p);
      }

      // Emit one SpendingHistoryPeriod per missed period (empty rows included).
      // RS-24: each period also gets its own budgets + spent snapshot. The
      // budgets snapshot is the SAME for every missed period — we use the
      // current allocation × income because the app has no allocation history.
      // The `spent` snapshot is per-period, derived from the bucketed items.
      const budgetsSnapshot = buildBudgetsSnapshot(this.$state);
      const newPeriods: SpendingHistoryPeriod[] = missedStarts.map((start) => {
        const items = buckets[start];
        const total = items.reduce((s, p) => s + p.amount, 0);
        return {
          id: genId(),
          date: start,
          total,
          items: items.map((p) => ({
            name: p.name,
            amount: p.amount,
            category: p.category,
            date: p.date,
          })),
          budgets: budgetsSnapshot,
          spent: buildSpentSnapshot(items),
        };
      });

      // Collect all purchases that were bucketed (archived) — needed for the
      // DB delete below. Compute before committing so `this.purchases` is
      // still the original full array at the point we read the IDs.
      const liveIds = new Set(live.map((p) => p.id));
      const archivedPurchases = this.purchases.filter((p) => !liveIds.has(p.id));

      // Commit
      this.spendingHistory = [...this.spendingHistory, ...newPeriods];
      this.purchases = live;
      this.lastArchivedPeriodStart = currentStart;

      // RS-29: persist the new anchor alongside the period inserts.
      syncDb(
        () => upsertProfile(_userId, { lastArchivedPeriodStart: this.lastArchivedPeriodStart }),
        'autoArchiveMissedPeriods:advanceAnchor',
      );

      // Sync each new period to the database (fire-and-forget per existing pattern).
      for (const period of newPeriods) {
        syncDb(
          () => db.spendingHistory.insertPeriod(_userId, period),
          'autoArchiveMissedPeriods',
        );
      }

      // BUG-023: delete archived purchases from the Supabase `purchases`
      // table. Without this, the DB still contains the pre-rollover rows.
      // A second device loading from the DB would re-hydrate them into
      // `budget.purchases`, and the lastArchivedPeriodStart guard would
      // prevent re-archiving — leaving stale purchases in the live array
      // indefinitely (the discrepancy seen between devices after a reset).
      for (const p of archivedPurchases) {
        syncDb(() => db.purchases.delete(_userId, p.id), 'autoArchiveMissedPeriods:deletePurchase');
      }

      return newPeriods.length;
    },

    // ─── Loans ────────────────────────────────────────────────

    addLoan(loan: Omit<Loan, 'id'>): Loan {
      const item: Loan = { ...loan, id: genId() };
      this.loans.push(item);
      syncDb(() => db.loans.insert(_userId, item), 'addLoan');
      return item;
    },

    updateLoan(id: string, patch: Partial<Loan>): void {
      const target = this.loans.find((l) => l.id === id);
      if (target) {
        Object.assign(target, patch);
        syncDb(() => db.loans.update(_userId, target), 'updateLoan');
      }
    },

    deleteLoan(id: string): void {
      this.loans = this.loans.filter((l) => l.id !== id);
      syncDb(() => db.loans.delete(_userId, id), 'deleteLoan');
    },

    // ─── Credit cards ─────────────────────────────────────────

    addCreditCard(card: Omit<CreditCard, 'id'>): CreditCard {
      const item: CreditCard = { ...card, id: genId() };
      this.creditCards.push(item);
      syncDb(() => db.creditCards.insert(_userId, item), 'addCreditCard');
      return item;
    },

    updateCreditCard(id: string, patch: Partial<CreditCard>): void {
      const target = this.creditCards.find((c) => c.id === id);
      if (target) {
        Object.assign(target, patch);
        syncDb(() => db.creditCards.update(_userId, target), 'updateCreditCard');
      }
    },

    deleteCreditCard(id: string): void {
      this.creditCards = this.creditCards.filter((c) => c.id !== id);
      syncDb(() => db.creditCards.delete(_userId, id), 'deleteCreditCard');
    },

    // ─── Subscriptions ────────────────────────────────────────

    addSubscription(sub: Omit<Subscription, 'id'>): Subscription {
      const item: Subscription = { ...sub, id: genId() };
      this.subscriptions.push(item);
      syncDb(() => db.subscriptions.insert(_userId, item), 'addSubscription');
      return item;
    },

    updateSubscription(id: string, patch: Partial<Subscription>): void {
      const target = this.subscriptions.find((s) => s.id === id);
      if (target) {
        Object.assign(target, patch);
        syncDb(() => db.subscriptions.update(_userId, target), 'updateSubscription');
      }
    },

    deleteSubscription(id: string): void {
      this.subscriptions = this.subscriptions.filter((s) => s.id !== id);
      syncDb(() => db.subscriptions.delete(_userId, id), 'deleteSubscription');
    },

    // ─── Wishlist ─────────────────────────────────────────────

    addWishlistItem(item: Omit<WishlistItem, 'id'>): WishlistItem {
      const newItem: WishlistItem = { ...item, id: genId() };
      this.wishlist.push(newItem);
      syncDb(() => db.wishlist.insert(_userId, newItem), 'addWishlistItem');
      return newItem;
    },

    updateWishlistItem(id: string, patch: Partial<WishlistItem>): void {
      const target = this.wishlist.find((w) => w.id === id);
      if (target) {
        Object.assign(target, patch);
        syncDb(() => db.wishlist.update(_userId, target), 'updateWishlistItem');
      }
    },

    deleteWishlistItem(id: string): void {
      this.wishlist = this.wishlist.filter((w) => w.id !== id);
      syncDb(() => db.wishlist.delete(_userId, id), 'deleteWishlistItem');
    },

    // ─── Savings accounts ─────────────────────────────────────

    addSavingsAccount(acct: Omit<SavingsAccount, 'id'>): SavingsAccount {
      const item: SavingsAccount = { ...acct, id: genId() };
      this.savingsAccounts.push(item);
      syncDb(() => db.savingsAccounts.insert(_userId, item), 'addSavingsAccount');
      return item;
    },

    updateSavingsAccount(id: string, patch: Partial<SavingsAccount>): void {
      const target = this.savingsAccounts.find((a) => a.id === id);
      if (target) {
        Object.assign(target, patch);
        syncDb(() => db.savingsAccounts.update(_userId, target), 'updateSavingsAccount');
      }
    },

    deleteSavingsAccount(id: string): void {
      this.savingsAccounts = this.savingsAccounts.filter((a) => a.id !== id);
      // Cascade: remove any goals tied to this account
      this.goals = this.goals.filter((g) => g.accountId !== id);
      syncDb(() => db.savingsAccounts.delete(_userId, id), 'deleteSavingsAccount');
    },

    /** Set the per-month override for an account's allocation. */
    setSavingsAccountAllocation(accountId: string, month: ISOMonth, amount: number): void {
      const target = this.savingsAccounts.find((a) => a.id === accountId);
      if (target) {
        target.monthlyAllocations = { ...target.monthlyAllocations, [month]: amount };
        syncDb(() => db.savingsAccounts.update(_userId, target), 'setSavingsAccountAllocation');
      }
    },

    // ─── Goals ────────────────────────────────────────────────

    addGoal(goal: Omit<Goal, 'id'>): Goal {
      const item: Goal = { ...goal, id: genId() };
      this.goals.push(item);
      syncDb(() => db.goals.insert(_userId, item), 'addGoal');
      return item;
    },

    updateGoal(id: string, patch: Partial<Goal>): void {
      const target = this.goals.find((g) => g.id === id);
      if (target) {
        Object.assign(target, patch);
        syncDb(() => db.goals.update(_userId, target), 'updateGoal');
      }
    },

    deleteGoal(id: string): void {
      this.goals = this.goals.filter((g) => g.id !== id);
      syncDb(() => db.goals.delete(_userId, id), 'deleteGoal');
    },

    // ─── Assets (net worth manual entries) ────────────────────

    addAsset(asset: Omit<Asset, 'id'>): Asset {
      const item: Asset = { ...asset, id: genId() };
      this.assets.push(item);
      syncDb(() => db.assets.insert(_userId, item), 'addAsset');
      return item;
    },

    updateAsset(id: string, patch: Partial<Asset>): void {
      const target = this.assets.find((a) => a.id === id);
      if (target) {
        Object.assign(target, patch);
        syncDb(() => db.assets.update(_userId, target), 'updateAsset');
      }
    },

    deleteAsset(id: string): void {
      this.assets = this.assets.filter((a) => a.id !== id);
      syncDb(() => db.assets.delete(_userId, id), 'deleteAsset');
    },

    // ─── Net worth history ────────────────────────────────────

    /** Insert or replace a snapshot for the given 'YYYY-MM' month. */
    upsertNetWorthSnapshot(snapshot: Omit<NetWorthSnapshot, 'id'>): NetWorthSnapshot {
      const existing = this.netWorthHistory.find((h) => h.date === snapshot.date);
      if (existing) {
        Object.assign(existing, snapshot);
        syncDb(() => db.netWorthHistory.insert(_userId, existing), 'upsertNetWorthSnapshot:update');
        return existing;
      }
      const item: NetWorthSnapshot = { ...snapshot, id: genId() };
      this.netWorthHistory.push(item);
      syncDb(() => db.netWorthHistory.insert(_userId, item), 'upsertNetWorthSnapshot:insert');
      return item;
    },

    /**
     * Record a snapshot for the current month if one doesn't already exist.
     * Keeps only the most-recent 24 months to prevent unbounded growth.
     * Ported from legacy analytics.js#recordNetWorthSnapshot.
     */
    recordNetWorthSnapshot(today: Date = new Date()): void {
      const monthKey: ISOMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      if (this.netWorthHistory.some((h) => h.date === monthKey)) return;

      const totalAssets =
        this.savingsAccounts.reduce((s, a) => s + (a.balance || 0), 0) +
        this.assets.reduce((s, a) => s + (a.value || 0), 0);
      const totalLiabilities =
        this.loans.reduce((s, l) => s + (l.remaining || 0), 0) +
        this.creditCards.reduce((s, c) => s + (c.balance || 0), 0);

      this.netWorthHistory.push({
        id: genId(),
        date: monthKey,
        netWorth: totalAssets - totalLiabilities,
        totalAssets,
        totalLiabilities,
      });
      this.netWorthHistory.sort((a, b) => a.date.localeCompare(b.date));
      if (this.netWorthHistory.length > 24) {
        this.netWorthHistory = this.netWorthHistory.slice(-24);
      }
    },

    // ─── Rules ────────────────────────────────────────────────

    addRule(rule: Omit<Rule, 'id'>): Rule {
      const item: Rule = { ...rule, id: genId() };
      this.rules.push(item);
      syncDb(() => db.rules.insert(_userId, item), 'addRule');
      return item;
    },

    updateRule(id: string, patch: Partial<Rule>): void {
      const target = this.rules.find((r) => r.id === id);
      if (target) {
        Object.assign(target, patch);
        syncDb(() => db.rules.update(_userId, target), 'updateRule');
      }
    },

    deleteRule(id: string): void {
      this.rules = this.rules.filter((r) => r.id !== id);
      syncDb(() => db.rules.delete(_userId, id), 'deleteRule');
    },

    // ─── Budget alerts ────────────────────────────────────────

    addBudgetAlert(alert: Omit<BudgetAlert, 'id'>): BudgetAlert {
      const item: BudgetAlert = { ...alert, id: genId() };
      this.budgetAlerts.push(item);
      syncDb(() => db.budgetAlerts.insert(_userId, item), 'addBudgetAlert');
      return item;
    },

    updateBudgetAlert(id: string, patch: Partial<BudgetAlert>): void {
      const target = this.budgetAlerts.find((a) => a.id === id);
      if (target) {
        Object.assign(target, patch);
        syncDb(() => db.budgetAlerts.update(_userId, target), 'updateBudgetAlert');
      }
    },

    deleteBudgetAlert(id: string): void {
      this.budgetAlerts = this.budgetAlerts.filter((a) => a.id !== id);
      syncDb(() => db.budgetAlerts.delete(_userId, id), 'deleteBudgetAlert');
    },

    // ─── Spending categories ──────────────────────────────────

    /**
     * Add a new user-defined spending category.
     * The name is trimmed; duplicate names are rejected (returns null).
     */
    addCategory(name: string, color: string): SpendingCategory | null {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const exists = this.spendingCategories.some(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (exists) return null;
      const item: SpendingCategory = { id: genId(), name: trimmed, color };
      this.spendingCategories.push(item);
      syncDb(() => db.spendingCategories.insert(_userId, item), 'addCategory');
      return item;
    },

    /**
     * Update a category's name and/or color.
     * When the name changes, all existing purchases and subscriptions that
     * used the old name are migrated to the new name automatically.
     */
    updateCategory(id: string, name: string, color: string): void {
      const target = this.spendingCategories.find((c) => c.id === id);
      if (!target) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const oldName = target.name;
      target.name  = trimmed;
      target.color = color;
      // Sync the category row itself
      syncDb(() => db.spendingCategories.update(_userId, target), 'updateCategory');

      // Migrate purchases that used the old name
      if (oldName !== trimmed) {
        this.purchases.forEach((p) => {
          if (p.category === oldName) {
            p.category = trimmed;
            syncDb(() => db.purchases.update(_userId, p), 'updateCategory:purchase');
          }
        });
        this.spendingHistory.forEach((period) => {
          period.items.forEach((item) => {
            if (item.category === oldName) item.category = trimmed;
          });
        });
        this.subscriptions.forEach((sub) => {
          if (sub.category === oldName) {
            sub.category = trimmed;
            syncDb(() => db.subscriptions.update(_userId, sub), 'updateCategory:subscription');
          }
        });
        this.rules.forEach((rule) => {
          if (rule.category === oldName) {
            rule.category = trimmed;
            syncDb(() => db.rules.update(_userId, rule), 'updateCategory:rule');
          }
        });
        this.budgetAlerts.forEach((alert) => {
          if (alert.category === oldName) {
            alert.category = trimmed;
            syncDb(() => db.budgetAlerts.update(_userId, alert), 'updateCategory:alert');
          }
        });
      }
    },

    /**
     * Delete a spending category by id.
     * The built-in 'other' category is protected and cannot be deleted.
     * Existing purchases keep their category name (orphan strategy).
     */
    deleteCategory(id: string): void {
      if (id === 'other') return; // protected
      this.spendingCategories = this.spendingCategories.filter((c) => c.id !== id);
      syncDb(() => db.spendingCategories.delete(_userId, id), 'deleteCategory');
    },

    // ─── Misc fields ──────────────────────────────────────────

    setPayStart(date: ISODate | null): void {
      this.payStart = date;
      syncDb(() => upsertProfile(_userId, { payStart: date }), 'setPayStart');
    },

    setFundsRemaining(amount: number, asOf: ISODate | '' = ''): void {
      this.fundsRemaining = amount;
      this.fundsRemainingUpdated = asOf;
      syncDb(() => upsertProfile(_userId, { fundsRemaining: amount, fundsRemainingUpdated: asOf }), 'setFundsRemaining');
    },

    // ─── Onboarding & version ─────────────────────────────────

    /**
     * Mark the user as having completed (or dismissed) onboarding.
     * Called by OnboardingModal on finish or skip-all.
     */
    completeOnboarding(): void {
      this.hasOnboarded = true;
      syncDb(() => upsertProfile(_userId, { hasOnboarded: true }), 'completeOnboarding');
    },

    /**
     * Dismiss the "What's New" banner for the given version string.
     * The banner will not re-appear until a higher version is released.
     */
    dismissWhatsNew(version: string): void {
      this.dismissedVersion = version;
      syncDb(() => upsertProfile(_userId, { dismissedVersion: version }), 'dismissWhatsNew');
    },

    // ─── CSV import / export ──────────────────────────────────

    /**
     * Serialise the entire state to CSV and trigger a browser download.
     * File is named `penny-export-YYYY-MM-DD.csv`.
     */
    exportCSV(): void {
      const csv = exportStateToCSV(this.$state);
      triggerCSVDownload(csv);
    },

    /**
     * Parse a raw CSV string (produced by exportCSV) and replace the entire
     * store state with the parsed result.
     *
     * After updating local state the full imported dataset is pushed to
     * Supabase (delete-all + re-insert) fire-and-forget so the cloud stays
     * in sync with the import.
     *
     * @param text  Raw CSV text from the imported file.
     * @throws      If the text cannot be parsed.
     */
    importCSV(text: string): void {
      const newState = parseCSVToState(text);
      this.$state = newState;
      void pushImportedState(newState);
    },

    /**
     * Serialise the entire state to a lossless JSON backup and trigger
     * a browser download. File is named `penny-backup-YYYY-MM-DD.json`.
     */
    exportJSON(): void {
      const json = exportStateToJSON(this.$state);
      triggerJSONDownload(json);
    },

    /**
     * Parse a JSON backup string (produced by exportJSON) and replace
     * the entire store state with the parsed result.
     *
     * After updating local state the full imported dataset is pushed to
     * Supabase (delete-all + re-insert) fire-and-forget so the cloud stays
     * in sync with the import.
     *
     * @param text  Raw JSON text from the imported file.
     * @throws      If the text cannot be parsed or the version is unsupported.
     */
    importJSON(text: string): void {
      const newState = parseJSONToState(text);
      this.$state = newState;
      void pushImportedState(newState);
    },
  },
});

// Re-export the budget type re-aliased so consumers don't double-import
export type { BudgetType };
