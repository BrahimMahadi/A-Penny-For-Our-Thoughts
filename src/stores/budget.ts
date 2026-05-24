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
      { id: genId(), name: 'Netflix', amount: 0, frequency: 'monthly', date: '2026-06-01', category: 'Entertainment', budgetType: 'wants', cardId: null },
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
    // ─── Persistence ───────────────────────────────────────────

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

    // ─── Income streams ───────────────────────────────────────

    addIncomeStream(stream: Omit<IncomeStream, 'id'>): IncomeStream {
      const item: IncomeStream = { ...stream, id: genId() };
      this.incomeStreams.push(item);
      return item;
    },

    updateIncomeStream(id: string, patch: Partial<IncomeStream>): void {
      const target = this.incomeStreams.find((s) => s.id === id);
      if (target) Object.assign(target, patch);
    },

    deleteIncomeStream(id: string): void {
      this.incomeStreams = this.incomeStreams.filter((s) => s.id !== id);
    },

    // ─── Budget allocation ────────────────────────────────────

    setAllocation(allocation: BudgetAllocation): void {
      this.allocation = allocation;
    },

    setBudgetDisplayMode(modes: Partial<BudgetDisplayModes>): void {
      this.budgetDisplayMode = { ...this.budgetDisplayMode, ...modes };
    },

    // ─── Expense cards (+ nested items) ───────────────────────

    addExpenseCard(label: string): ExpenseCard {
      const card: ExpenseCard = { id: genId(), label, items: [] };
      this.expenseCards.push(card);
      return card;
    },

    renameExpenseCard(id: string, label: string): void {
      const target = this.expenseCards.find((c) => c.id === id);
      if (target) target.label = label;
    },

    deleteExpenseCard(id: string): void {
      this.expenseCards = this.expenseCards.filter((c) => c.id !== id);
    },

    addExpenseItem(cardId: string, item: Omit<ExpenseItem, 'id'>): ExpenseItem | null {
      const card = this.expenseCards.find((c) => c.id === cardId);
      if (!card) return null;
      const newItem: ExpenseItem = { ...item, id: genId() };
      card.items.push(newItem);
      return newItem;
    },

    updateExpenseItem(cardId: string, itemId: string, patch: Partial<ExpenseItem>): void {
      const card = this.expenseCards.find((c) => c.id === cardId);
      const item = card?.items.find((i) => i.id === itemId);
      if (item) Object.assign(item, patch);
    },

    deleteExpenseItem(cardId: string, itemId: string): void {
      const card = this.expenseCards.find((c) => c.id === cardId);
      if (card) card.items = card.items.filter((i) => i.id !== itemId);
    },

    // ─── Purchases ────────────────────────────────────────────

    addPurchase(purchase: Omit<Purchase, 'id'>): Purchase {
      const item: Purchase = { ...purchase, id: genId() };
      this.purchases.push(item);
      return item;
    },

    updatePurchase(id: string, patch: Partial<Purchase>): void {
      const target = this.purchases.find((p) => p.id === id);
      if (target) Object.assign(target, patch);
    },

    deletePurchase(id: string): void {
      this.purchases = this.purchases.filter((p) => p.id !== id);
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

    /** Close the current period: snapshot purchases → history, then clear. */
    closeCurrentPeriod(periodDate: ISODate): SpendingHistoryPeriod {
      const total = this.purchases.reduce((s, p) => s + p.amount, 0);
      const period: SpendingHistoryPeriod = {
        id: genId(),
        date: periodDate,
        total,
        items: this.purchases.map((p) => ({
          name: p.name,
          amount: p.amount,
          category: p.category,
          date: p.date,
        })),
      };
      this.spendingHistory.push(period);
      this.purchases = [];
      return period;
    },

    // ─── Loans ────────────────────────────────────────────────

    addLoan(loan: Omit<Loan, 'id'>): Loan {
      const item: Loan = { ...loan, id: genId() };
      this.loans.push(item);
      return item;
    },

    updateLoan(id: string, patch: Partial<Loan>): void {
      const target = this.loans.find((l) => l.id === id);
      if (target) Object.assign(target, patch);
    },

    deleteLoan(id: string): void {
      this.loans = this.loans.filter((l) => l.id !== id);
    },

    // ─── Credit cards ─────────────────────────────────────────

    addCreditCard(card: Omit<CreditCard, 'id'>): CreditCard {
      const item: CreditCard = { ...card, id: genId() };
      this.creditCards.push(item);
      return item;
    },

    updateCreditCard(id: string, patch: Partial<CreditCard>): void {
      const target = this.creditCards.find((c) => c.id === id);
      if (target) Object.assign(target, patch);
    },

    deleteCreditCard(id: string): void {
      this.creditCards = this.creditCards.filter((c) => c.id !== id);
    },

    // ─── Subscriptions ────────────────────────────────────────

    addSubscription(sub: Omit<Subscription, 'id'>): Subscription {
      const item: Subscription = { ...sub, id: genId() };
      this.subscriptions.push(item);
      return item;
    },

    updateSubscription(id: string, patch: Partial<Subscription>): void {
      const target = this.subscriptions.find((s) => s.id === id);
      if (target) Object.assign(target, patch);
    },

    deleteSubscription(id: string): void {
      this.subscriptions = this.subscriptions.filter((s) => s.id !== id);
    },

    // ─── Wishlist ─────────────────────────────────────────────

    addWishlistItem(item: Omit<WishlistItem, 'id'>): WishlistItem {
      const newItem: WishlistItem = { ...item, id: genId() };
      this.wishlist.push(newItem);
      return newItem;
    },

    updateWishlistItem(id: string, patch: Partial<WishlistItem>): void {
      const target = this.wishlist.find((w) => w.id === id);
      if (target) Object.assign(target, patch);
    },

    deleteWishlistItem(id: string): void {
      this.wishlist = this.wishlist.filter((w) => w.id !== id);
    },

    // ─── Savings accounts ─────────────────────────────────────

    addSavingsAccount(acct: Omit<SavingsAccount, 'id'>): SavingsAccount {
      const item: SavingsAccount = { ...acct, id: genId() };
      this.savingsAccounts.push(item);
      return item;
    },

    updateSavingsAccount(id: string, patch: Partial<SavingsAccount>): void {
      const target = this.savingsAccounts.find((a) => a.id === id);
      if (target) Object.assign(target, patch);
    },

    deleteSavingsAccount(id: string): void {
      this.savingsAccounts = this.savingsAccounts.filter((a) => a.id !== id);
      // Cascade: remove any goals tied to this account
      this.goals = this.goals.filter((g) => g.accountId !== id);
    },

    /** Set the per-month override for an account's allocation. */
    setSavingsAccountAllocation(accountId: string, month: ISOMonth, amount: number): void {
      const target = this.savingsAccounts.find((a) => a.id === accountId);
      if (target) target.monthlyAllocations = { ...target.monthlyAllocations, [month]: amount };
    },

    // ─── Goals ────────────────────────────────────────────────

    addGoal(goal: Omit<Goal, 'id'>): Goal {
      const item: Goal = { ...goal, id: genId() };
      this.goals.push(item);
      return item;
    },

    updateGoal(id: string, patch: Partial<Goal>): void {
      const target = this.goals.find((g) => g.id === id);
      if (target) Object.assign(target, patch);
    },

    deleteGoal(id: string): void {
      this.goals = this.goals.filter((g) => g.id !== id);
    },

    // ─── Assets (net worth manual entries) ────────────────────

    addAsset(asset: Omit<Asset, 'id'>): Asset {
      const item: Asset = { ...asset, id: genId() };
      this.assets.push(item);
      return item;
    },

    updateAsset(id: string, patch: Partial<Asset>): void {
      const target = this.assets.find((a) => a.id === id);
      if (target) Object.assign(target, patch);
    },

    deleteAsset(id: string): void {
      this.assets = this.assets.filter((a) => a.id !== id);
    },

    // ─── Net worth history ────────────────────────────────────

    /** Insert or replace a snapshot for the given 'YYYY-MM' month. */
    upsertNetWorthSnapshot(snapshot: Omit<NetWorthSnapshot, 'id'>): NetWorthSnapshot {
      const existing = this.netWorthHistory.find((h) => h.date === snapshot.date);
      if (existing) {
        Object.assign(existing, snapshot);
        return existing;
      }
      const item: NetWorthSnapshot = { ...snapshot, id: genId() };
      this.netWorthHistory.push(item);
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
      return item;
    },

    updateRule(id: string, patch: Partial<Rule>): void {
      const target = this.rules.find((r) => r.id === id);
      if (target) Object.assign(target, patch);
    },

    deleteRule(id: string): void {
      this.rules = this.rules.filter((r) => r.id !== id);
    },

    // ─── Budget alerts ────────────────────────────────────────

    addBudgetAlert(alert: Omit<BudgetAlert, 'id'>): BudgetAlert {
      const item: BudgetAlert = { ...alert, id: genId() };
      this.budgetAlerts.push(item);
      return item;
    },

    updateBudgetAlert(id: string, patch: Partial<BudgetAlert>): void {
      const target = this.budgetAlerts.find((a) => a.id === id);
      if (target) Object.assign(target, patch);
    },

    deleteBudgetAlert(id: string): void {
      this.budgetAlerts = this.budgetAlerts.filter((a) => a.id !== id);
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
      // Migrate purchases that used the old name
      if (oldName !== trimmed) {
        this.purchases.forEach((p) => {
          if (p.category === oldName) p.category = trimmed;
        });
        this.spendingHistory.forEach((period) => {
          period.items.forEach((item) => {
            if (item.category === oldName) item.category = trimmed;
          });
        });
        this.subscriptions.forEach((sub) => {
          if (sub.category === oldName) sub.category = trimmed;
        });
        this.rules.forEach((rule) => {
          if (rule.category === oldName) rule.category = trimmed;
        });
        this.budgetAlerts.forEach((alert) => {
          if (alert.category === oldName) alert.category = trimmed;
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
    },

    // ─── Misc fields ──────────────────────────────────────────

    setPayStart(date: ISODate | null): void {
      this.payStart = date;
    },

    setFundsRemaining(amount: number, asOf: ISODate | '' = ''): void {
      this.fundsRemaining = amount;
      this.fundsRemainingUpdated = asOf;
    },

    // ─── Onboarding & version ─────────────────────────────────

    /**
     * Mark the user as having completed (or dismissed) onboarding.
     * Called by OnboardingModal on finish or skip-all.
     */
    completeOnboarding(): void {
      this.hasOnboarded = true;
    },

    /**
     * Dismiss the "What's New" banner for the given version string.
     * The banner will not re-appear until a higher version is released.
     */
    dismissWhatsNew(version: string): void {
      this.dismissedVersion = version;
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
     * @param text  Raw CSV text from the imported file.
     * @throws      If the text cannot be parsed.
     */
    importCSV(text: string): void {
      const newState = parseCSVToState(text);
      this.$state = newState;
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
     * @param text  Raw JSON text from the imported file.
     * @throws      If the text cannot be parsed or the version is unsupported.
     */
    importJSON(text: string): void {
      const newState = parseJSONToState(text);
      this.$state = newState;
    },
  },
});

// Re-export the budget type re-aliased so consumers don't double-import
export type { BudgetType };
