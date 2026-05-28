import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  useBudgetStore,
  makeDefaultState,
  makeBlankState,
  migrateState,
  saveStateToStorage,
  loadStateFromStorage,
} from '@/stores/budget';

describe('budget store — initialisation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('initialises with DEFAULT_STATE shape', () => {
    const store = useBudgetStore();
    expect(store.allocation).toEqual({ needs: 50, wants: 30, savings: 20 });
    expect(store.incomeStreams).toEqual([]);
    expect(store.purchases).toEqual([]);
    expect(store.loans.length).toBe(2);
    expect(store.creditCards.length).toBe(2);
    expect(store.subscriptions.length).toBe(1);
    expect(store.savingsAccounts.length).toBe(2);
  });

  it('default loans have payment-tracking fields', () => {
    const store = useBudgetStore();
    store.loans.forEach((loan) => {
      expect(loan.paymentAmount).toBe(0);
      expect(loan.frequency).toBe('monthly');
      expect(loan.budgetType).toBe('needs');
      expect(loan.cardId).toBe(null);
    });
  });

  it('makeDefaultState produces fresh IDs on each call', () => {
    const a = makeDefaultState();
    const b = makeDefaultState();
    expect(a.loans[0].id).not.toBe(b.loans[0].id);
  });

  it('makeBlankState produces empty collections', () => {
    const s = makeBlankState();
    expect(s.loans).toEqual([]);
    expect(s.creditCards).toEqual([]);
    expect(s.subscriptions).toEqual([]);
    expect(s.savingsAccounts).toEqual([]);
  });
});

describe('budget store — getters', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('totalMonthlyIncome sums monthly streams', () => {
    const store = useBudgetStore();
    store.addIncomeStream({ name: 'Salary', amount: 3000, biweekly: false });
    store.addIncomeStream({ name: 'Side gig', amount: 500, biweekly: false });
    expect(store.totalMonthlyIncome).toBe(3500);
  });

  it('totalMonthlyIncome doubles biweekly streams', () => {
    const store = useBudgetStore();
    store.addIncomeStream({ name: 'Paycheque', amount: 1500, biweekly: true });
    expect(store.totalMonthlyIncome).toBe(3000);
  });

  it('totalMonthlyIncome handles empty list', () => {
    const store = useBudgetStore();
    expect(store.totalMonthlyIncome).toBe(0);
  });

  it('allocationRatios converts percentages to decimals', () => {
    const store = useBudgetStore();
    expect(store.allocationRatios).toEqual({ needs: 0.5, wants: 0.3, savings: 0.2 });
  });

  it('grandTotalExpenses sums all card items with biweekly doubling', () => {
    const store = useBudgetStore();
    const card = store.addExpenseCard('TD Debit');
    store.addExpenseItem(card.id, { name: 'Rent', amount: 1000, biweekly: false });
    store.addExpenseItem(card.id, { name: 'Phone', amount: 50, biweekly: true });
    expect(store.grandTotalExpenses).toBe(1100);
  });
});

describe('budget store — income CRUD', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('addIncomeStream returns the new item with an ID', () => {
    const store = useBudgetStore();
    const stream = store.addIncomeStream({ name: 'Job', amount: 5000, biweekly: false });
    expect(stream.id).toBeTruthy();
    expect(store.incomeStreams).toContainEqual(stream);
  });

  it('updateIncomeStream patches fields', () => {
    const store = useBudgetStore();
    const stream = store.addIncomeStream({ name: 'Job', amount: 1000, biweekly: false });
    store.updateIncomeStream(stream.id, { amount: 1500 });
    expect(store.incomeStreams[0].amount).toBe(1500);
    expect(store.incomeStreams[0].name).toBe('Job'); // unchanged
  });

  it('updateIncomeStream on unknown ID is a no-op', () => {
    const store = useBudgetStore();
    expect(() => store.updateIncomeStream('nope', { amount: 99 })).not.toThrow();
  });

  it('deleteIncomeStream removes the item', () => {
    const store = useBudgetStore();
    const stream = store.addIncomeStream({ name: 'Job', amount: 1000, biweekly: false });
    store.deleteIncomeStream(stream.id);
    expect(store.incomeStreams.length).toBe(0);
  });
});

describe('budget store — expense card + items CRUD', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('addExpenseCard creates an empty card', () => {
    const store = useBudgetStore();
    const card = store.addExpenseCard('Visa');
    expect(card.label).toBe('Visa');
    expect(card.items).toEqual([]);
  });

  it('addExpenseItem returns null for unknown card', () => {
    const store = useBudgetStore();
    expect(store.addExpenseItem('nope', { name: 'X', amount: 1, biweekly: false })).toBe(null);
  });

  it('addExpenseItem appends to existing card', () => {
    const store = useBudgetStore();
    const card = store.addExpenseCard('TD');
    store.addExpenseItem(card.id, { name: 'Rent', amount: 1000, biweekly: false });
    expect(store.expenseCards.find((c) => c.id === card.id)?.items.length).toBe(1);
  });

  it('updateExpenseItem patches a nested item', () => {
    const store = useBudgetStore();
    const card = store.addExpenseCard('TD');
    const item = store.addExpenseItem(card.id, { name: 'Rent', amount: 1000, biweekly: false });
    store.updateExpenseItem(card.id, item!.id, { amount: 1200 });
    expect(store.expenseCards[0].items[0].amount).toBe(1200);
  });

  it('deleteExpenseItem removes nested item', () => {
    const store = useBudgetStore();
    const card = store.addExpenseCard('TD');
    const item = store.addExpenseItem(card.id, { name: 'Rent', amount: 1000, biweekly: false });
    store.deleteExpenseItem(card.id, item!.id);
    expect(store.expenseCards[0].items).toEqual([]);
  });

  it('deleteExpenseCard removes the whole card', () => {
    const store = useBudgetStore();
    const card = store.addExpenseCard('TD');
    store.deleteExpenseCard(card.id);
    expect(store.expenseCards).toEqual([]);
  });
});

describe('budget store — savings + goals cascade', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('deleteSavingsAccount cascades to delete linked goals', () => {
    const store = useBudgetStore();
    const acct = store.addSavingsAccount({
      name: 'TFSA',
      balance: 1000,
      defaultAllocated: 100,
      monthlyAllocations: {},
    });
    store.addGoal({ accountId: acct.id, targetAmount: 10000, targetDate: '2027-12' });
    expect(store.goals.length).toBe(1);

    store.deleteSavingsAccount(acct.id);
    expect(store.savingsAccounts.find((a) => a.id === acct.id)).toBeUndefined();
    expect(store.goals.length).toBe(0); // cascade deleted
  });

  it('setSavingsAccountAllocation writes monthly override', () => {
    const store = useBudgetStore();
    const acct = store.addSavingsAccount({
      name: 'TFSA',
      balance: 0,
      defaultAllocated: 100,
      monthlyAllocations: {},
    });
    store.setSavingsAccountAllocation(acct.id, '2026-05', 250);
    expect(store.savingsAccounts.find((a) => a.id === acct.id)?.monthlyAllocations['2026-05']).toBe(250);
  });
});

describe('budget store — purchases & period close', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('closeCurrentPeriod moves purchases to history and clears the queue', () => {
    const store = useBudgetStore();
    store.addPurchase({ name: 'Coffee', amount: 5, category: 'Food & Drink', cardId: null, budgetType: 'wants' });
    store.addPurchase({ name: 'Lunch', amount: 15, category: 'Food & Drink', cardId: null, budgetType: 'wants' });

    const period = store.closeCurrentPeriod('2026-05-21');
    expect(period.total).toBe(20);
    expect(period.items.length).toBe(2);
    expect(store.purchases).toEqual([]);
    expect(store.spendingHistory.length).toBe(1);
  });
});

describe('budget store — net worth upsert', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('upsertNetWorthSnapshot inserts a new month', () => {
    const store = useBudgetStore();
    store.upsertNetWorthSnapshot({ date: '2026-05', netWorth: 10000, totalAssets: 15000, totalLiabilities: 5000 });
    expect(store.netWorthHistory.length).toBe(1);
  });

  it('upsertNetWorthSnapshot replaces an existing month', () => {
    const store = useBudgetStore();
    store.upsertNetWorthSnapshot({ date: '2026-05', netWorth: 10000, totalAssets: 15000, totalLiabilities: 5000 });
    store.upsertNetWorthSnapshot({ date: '2026-05', netWorth: 12000, totalAssets: 17000, totalLiabilities: 5000 });
    expect(store.netWorthHistory.length).toBe(1);
    expect(store.netWorthHistory[0].netWorth).toBe(12000);
  });
});

describe('budget store — persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('saveToStorage + loadFromStorage round-trip preserves data', () => {
    const store = useBudgetStore();
    store.addIncomeStream({ name: 'Salary', amount: 5000, biweekly: false });
    store.saveToStorage();

    setActivePinia(createPinia());
    const store2 = useBudgetStore();
    store2.loadFromStorage();
    expect(store2.incomeStreams.length).toBe(1);
    expect(store2.incomeStreams[0].name).toBe('Salary');
  });

  it('loadFromStorage with no data uses DEFAULT_STATE', () => {
    const store = useBudgetStore();
    store.loadFromStorage();
    expect(store.allocation).toEqual({ needs: 50, wants: 30, savings: 20 });
    expect(store.loans.length).toBe(2); // default sample loans
  });

  it('loadFromStorage with corrupt JSON falls back to DEFAULT_STATE', () => {
    localStorage.setItem('penny_state_v2', '{not valid json');
    const store = useBudgetStore();
    store.loadFromStorage();
    expect(store.allocation).toEqual({ needs: 50, wants: 30, savings: 20 });
  });

  it('clearAll resets to BLANK_STATE', () => {
    const store = useBudgetStore();
    store.addIncomeStream({ name: 'Job', amount: 1000, biweekly: false });
    store.clearAll();
    expect(store.incomeStreams).toEqual([]);
    expect(store.loans).toEqual([]);
    expect(store.allocation).toEqual({ needs: 50, wants: 30, savings: 20 });
  });
});

describe('migrateState — v1 schema migrations', () => {
  it('migrates legacy state.gov → incomeStreams', () => {
    const raw = { gov: 1200 };
    const migrated = migrateState(raw);
    expect(migrated.incomeStreams.length).toBe(1);
    expect(migrated.incomeStreams[0].name).toBe('Government');
    expect(migrated.incomeStreams[0].amount).toBe(1200);
    expect(migrated.incomeStreams[0].biweekly).toBe(true);
  });

  it('migrates legacy keyed expenses object → expenseCards array', () => {
    const raw = {
      expenses: {
        'td-debit': [{ id: 'x1', name: 'Rent', amount: 1000, biweekly: false }],
        'ws-credit': [{ id: 'x2', name: 'Netflix', amount: 18, biweekly: false }],
      },
    };
    const migrated = migrateState(raw);
    expect(migrated.expenseCards.length).toBe(2);
    expect(migrated.expenseCards.find((c) => c.label === 'TD Debit')).toBeTruthy();
    expect(migrated.expenseCards.find((c) => c.label === 'WS Credit Card')).toBeTruthy();
  });

  it('fills in missing payment fields on legacy loans', () => {
    const raw = {
      loans: [{ id: 'L1', name: 'Car', remaining: 5000, original: 10000 }],
    };
    const migrated = migrateState(raw);
    expect(migrated.loans[0].paymentAmount).toBe(0);
    expect(migrated.loans[0].frequency).toBe('monthly');
    expect(migrated.loans[0].budgetType).toBe('needs');
    expect(migrated.loans[0].cardId).toBe(null);
  });

  it('renames savingsAccounts.allocated → defaultAllocated', () => {
    const raw = {
      savingsAccounts: [{ id: 'A1', name: 'TFSA', allocated: 200 }],
    };
    const migrated = migrateState(raw);
    expect(migrated.savingsAccounts[0].defaultAllocated).toBe(200);
    expect(migrated.savingsAccounts[0].monthlyAllocations).toEqual({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((migrated.savingsAccounts[0] as any).allocated).toBeUndefined();
  });

  it('returns DEFAULT_STATE for non-object inputs', () => {
    const m1 = migrateState(null);
    const m2 = migrateState('string');
    const m3 = migrateState(undefined);
    expect(m1.allocation).toEqual({ needs: 50, wants: 30, savings: 20 });
    expect(m2.allocation).toEqual({ needs: 50, wants: 30, savings: 20 });
    expect(m3.allocation).toEqual({ needs: 50, wants: 30, savings: 20 });
  });

  it('ensures all forward-compat keys exist on partial state', () => {
    const raw = { allocation: { needs: 60, wants: 30, savings: 10 } };
    const migrated = migrateState(raw);
    expect(migrated.purchases).toEqual([]);
    expect(migrated.creditCards).toEqual([]);
    expect(migrated.goals).toEqual([]);
    expect(migrated.netWorthHistory).toEqual([]);
    expect(migrated.fundsRemaining).toBe(0);
    expect(migrated.payStart).toBe(null);
  });
});

// ─────────────────────────────────────────────────────────────────
//  Storage error handling
// ─────────────────────────────────────────────────────────────────
describe('saveStateToStorage — error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns true on successful write', () => {
    const state = makeDefaultState();
    expect(saveStateToStorage(state)).toBe(true);
    expect(localStorage.getItem('penny_state_v2')).not.toBeNull();
  });

  it('returns false when localStorage.setItem throws (quota exceeded)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const state = makeDefaultState();
    expect(saveStateToStorage(state)).toBe(false);
  });

  it('does not throw when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    expect(() => saveStateToStorage(makeDefaultState())).not.toThrow();
  });

  it('store.saveToStorage() returns false on quota exceeded', () => {
    setActivePinia(createPinia());
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const store = useBudgetStore();
    expect(store.saveToStorage()).toBe(false);
  });

  it('store.saveToStorage() returns true on success', () => {
    setActivePinia(createPinia());
    const store = useBudgetStore();
    expect(store.saveToStorage()).toBe(true);
  });
});

describe('loadStateFromStorage — error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns DEFAULT_STATE when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    const result = loadStateFromStorage();
    expect(result.allocation).toEqual({ needs: 50, wants: 30, savings: 20 });
  });

  it('does not throw when localStorage is entirely unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    expect(() => loadStateFromStorage()).not.toThrow();
  });

  it('returns DEFAULT_STATE for corrupt JSON (regression)', () => {
    localStorage.setItem('penny_state_v2', '{{broken}}');
    expect(loadStateFromStorage().allocation).toEqual({ needs: 50, wants: 30, savings: 20 });
  });

  it('returns migrated state when valid JSON is present', () => {
    const state = makeDefaultState();
    state.allocation = { needs: 40, wants: 40, savings: 20 };
    localStorage.setItem('penny_state_v2', JSON.stringify(state));
    expect(loadStateFromStorage().allocation).toEqual({ needs: 40, wants: 40, savings: 20 });
  });
});

// ─── Sprint 19: Spending Category CRUD ──────────────────────────────────────

describe('budget store — spendingCategories (Sprint 19)', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('initialises with DEFAULT_SPENDING_CATEGORIES (7 entries including "other")', () => {
    const store = useBudgetStore();
    expect(store.spendingCategories.length).toBeGreaterThanOrEqual(7);
    expect(store.spendingCategories.some(c => c.id === 'other')).toBe(true);
  });

  it('addCategory adds a new category and returns it', () => {
    const store = useBudgetStore();
    const initial = store.spendingCategories.length;
    const result = store.addCategory('Hobbies', '#ff0000');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Hobbies');
    expect(result!.color).toBe('#ff0000');
    expect(store.spendingCategories.length).toBe(initial + 1);
  });

  it('addCategory rejects duplicate name (case-insensitive)', () => {
    const store = useBudgetStore();
    store.addCategory('Hobbies', '#ff0000');
    const result = store.addCategory('hobbies', '#00ff00');
    expect(result).toBeNull();
  });

  it('addCategory rejects empty/whitespace name', () => {
    const store = useBudgetStore();
    const result = store.addCategory('   ', '#ff0000');
    expect(result).toBeNull();
  });

  it('updateCategory changes name and color', () => {
    const store = useBudgetStore();
    const cat = store.addCategory('Fitness', '#123456')!;
    store.updateCategory(cat.id, 'Health & Fitness', '#abcdef');
    const updated = store.spendingCategories.find(c => c.id === cat.id)!;
    expect(updated.name).toBe('Health & Fitness');
    expect(updated.color).toBe('#abcdef');
  });

  it('updateCategory migrates category name in purchases', () => {
    const store = useBudgetStore();
    const cat = store.addCategory('OldCat', '#111111')!;
    store.purchases.push({ id: 'p1', name: 'Coffee', amount: 5, category: 'OldCat', cardId: null, budgetType: 'wants' });
    store.updateCategory(cat.id, 'NewCat', '#111111');
    expect(store.purchases[0].category).toBe('NewCat');
  });

  it('updateCategory migrates category name in subscriptions', () => {
    const store = useBudgetStore();
    const cat = store.addCategory('OldSub', '#222222')!;
    store.subscriptions.push({
      id: 's1', name: 'Netflix', amount: 17, frequency: 'monthly',
      date: '2026-01-01', category: 'OldSub', budgetType: 'wants', cardId: null,
    });
    store.updateCategory(cat.id, 'NewSub', '#222222');
    expect(store.subscriptions[store.subscriptions.length - 1].category).toBe('NewSub');
  });

  it('updateCategory migrates category name in budgetAlerts', () => {
    const store = useBudgetStore();
    const cat = store.addCategory('OldAlert', '#333333')!;
    store.budgetAlerts.push({ id: 'ba1', category: 'OldAlert', threshold: 50 });
    store.updateCategory(cat.id, 'NewAlert', '#333333');
    expect(store.budgetAlerts[store.budgetAlerts.length - 1].category).toBe('NewAlert');
  });

  it('deleteCategory removes a user-defined category', () => {
    const store = useBudgetStore();
    const cat = store.addCategory('Temp', '#ff0000')!;
    const initial = store.spendingCategories.length;
    store.deleteCategory(cat.id);
    expect(store.spendingCategories.length).toBe(initial - 1);
    expect(store.spendingCategories.find(c => c.id === cat.id)).toBeUndefined();
  });

  it('deleteCategory is a no-op for the protected "other" category', () => {
    const store = useBudgetStore();
    const initial = store.spendingCategories.length;
    store.deleteCategory('other');
    expect(store.spendingCategories.length).toBe(initial);
    expect(store.spendingCategories.some(c => c.id === 'other')).toBe(true);
  });

  it('deleteCategory leaves orphaned purchases intact (orphan strategy)', () => {
    const store = useBudgetStore();
    const cat = store.addCategory('Orphan', '#deadbe')!;
    store.purchases.push({ id: 'p2', name: 'Gadget', amount: 99, category: 'Orphan', cardId: null, budgetType: 'wants' });
    store.deleteCategory(cat.id);
    expect(store.purchases.find(p => p.id === 'p2')!.category).toBe('Orphan');
  });
});

// ─── History item tag editing ────────────────────────────────────────────────

describe('budget store — updateHistoryItemCategory', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('updates the category of an item in an archived period', () => {
    const store = useBudgetStore();
    store.addPurchase({ name: 'Coffee', amount: 5, category: 'Food & Drink', cardId: null, budgetType: 'wants' });
    store.closeCurrentPeriod('2026-05-01');
    const period = store.spendingHistory[0];
    store.updateHistoryItemCategory(period.id, 0, 'Entertainment');
    expect(store.spendingHistory[0].items[0].category).toBe('Entertainment');
  });

  it('is a no-op for an unknown period ID (does not throw)', () => {
    const store = useBudgetStore();
    expect(() => store.updateHistoryItemCategory('nonexistent-id', 0, 'Entertainment')).not.toThrow();
  });

  it('is a no-op for an out-of-bounds item index (does not throw)', () => {
    const store = useBudgetStore();
    store.addPurchase({ name: 'Coffee', amount: 5, category: 'Food & Drink', cardId: null, budgetType: 'wants' });
    store.closeCurrentPeriod('2026-05-01');
    const period = store.spendingHistory[0];
    expect(() => store.updateHistoryItemCategory(period.id, 99, 'Entertainment')).not.toThrow();
    expect(store.spendingHistory[0].items[0].category).toBe('Food & Drink');
  });

  it('does not affect other items in the same period', () => {
    const store = useBudgetStore();
    store.addPurchase({ name: 'Coffee', amount: 5, category: 'Food & Drink', cardId: null, budgetType: 'wants' });
    store.addPurchase({ name: 'Movie', amount: 15, category: 'Entertainment', cardId: null, budgetType: 'wants' });
    store.closeCurrentPeriod('2026-05-01');
    const period = store.spendingHistory[0];
    store.updateHistoryItemCategory(period.id, 0, 'Other');
    expect(store.spendingHistory[0].items[0].category).toBe('Other');
    expect(store.spendingHistory[0].items[1].category).toBe('Entertainment');
  });

  it('does not affect items in other archived periods', () => {
    const store = useBudgetStore();
    store.addPurchase({ name: 'Coffee', amount: 5, category: 'Food & Drink', cardId: null, budgetType: 'wants' });
    store.closeCurrentPeriod('2026-05-01');
    store.addPurchase({ name: 'Movie', amount: 15, category: 'Entertainment', cardId: null, budgetType: 'wants' });
    store.closeCurrentPeriod('2026-05-15');
    const period1 = store.spendingHistory[0];
    store.updateHistoryItemCategory(period1.id, 0, 'Other');
    expect(store.spendingHistory[0].items[0].category).toBe('Other');
    expect(store.spendingHistory[1].items[0].category).toBe('Entertainment');
  });
});

// ─── Sprint 19: migrateState — spendingCategories seeding ───────────────────

describe('migrateState — spendingCategories migration (Sprint 19)', () => {
  it('seeds DEFAULT_SPENDING_CATEGORIES when field is missing', () => {
    const raw = makeDefaultState() as unknown as Record<string, unknown>;
    delete raw.spendingCategories;
    const migrated = migrateState(raw as Parameters<typeof migrateState>[0]);
    expect(Array.isArray(migrated.spendingCategories)).toBe(true);
    expect((migrated.spendingCategories as unknown[]).length).toBeGreaterThan(0);
  });

  it('seeds DEFAULT_SPENDING_CATEGORIES when field is empty array', () => {
    const raw = { ...makeDefaultState(), spendingCategories: [] };
    const migrated = migrateState(raw);
    expect((migrated.spendingCategories as unknown[]).length).toBeGreaterThan(0);
  });

  it('ensures "other" is always present after migration', () => {
    const raw = {
      ...makeDefaultState(),
      spendingCategories: [{ id: 'custom1', name: 'Custom', color: '#fff' }],
    };
    const migrated = migrateState(raw);
    expect((migrated.spendingCategories as Array<{id:string}>).some(c => c.id === 'other')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  RS-23 — autoArchiveMissedPeriods
//
//  Tests cover the full decision matrix:
//    • no payStart                              → no-op
//    • first-run init (lastArchived was null)   → set anchor, archive 0
//    • already up to date                       → 0
//    • 1 period missed                          → 1 archive
//    • 3 periods missed                         → 3 archives (empty included)
//    • undated purchases                        → newest missed bucket
//    • backdated purchases                      → oldest missed bucket
//    • current-period purchases                 → preserved in live array
//    • date bucketing into the right period     → exact bucket assignment
//    • lastArchivedPeriodStart bumped forward   → idempotent on re-run
// ─────────────────────────────────────────────────────────────────────────────

describe('budget store — autoArchiveMissedPeriods (RS-23)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  // Helper: build a purchase with sensible defaults so tests stay focused.
  // (Includes a fake id since we push directly onto the array, bypassing the
  // addPurchase action which would otherwise assign one.)
  let _pId = 0;
  function P(name: string, amount: number, date: string | undefined, budgetType: 'wants' | 'needs' = 'wants') {
    return { id: `p${++_pId}`, name, amount, category: 'Other', date, budgetType, cardId: null };
  }

  it('returns 0 and changes nothing when payStart is null', () => {
    const store = useBudgetStore();
    expect(store.payStart).toBeNull();
    const result = store.autoArchiveMissedPeriods(new Date('2026-05-15T12:00:00'));
    expect(result).toBe(0);
    expect(store.lastArchivedPeriodStart).toBeNull();
    expect(store.spendingHistory.length).toBe(0);
  });

  it('first-run init: anchors lastArchivedPeriodStart without archiving anything', () => {
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    store.purchases.push(P('Coffee', 5, '2026-05-02'));

    const result = store.autoArchiveMissedPeriods(new Date('2026-05-10T12:00:00'));

    expect(result).toBe(0);
    expect(store.lastArchivedPeriodStart).toBe('2026-05-01');
    expect(store.purchases.length).toBe(1);          // not cleared
    expect(store.spendingHistory.length).toBe(0);    // no archive
  });

  it('no-op when currentStart == lastArchivedPeriodStart', () => {
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    store.autoArchiveMissedPeriods(new Date('2026-05-10T12:00:00')); // init → 2026-05-01
    store.purchases.push(P('Coffee', 5, '2026-05-02'));

    const result = store.autoArchiveMissedPeriods(new Date('2026-05-10T12:00:00'));

    expect(result).toBe(0);
    expect(store.lastArchivedPeriodStart).toBe('2026-05-01');
    expect(store.purchases.length).toBe(1);
    expect(store.spendingHistory.length).toBe(0);
  });

  it('archives exactly 1 period when the user opens the app at day 14', () => {
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    store.autoArchiveMissedPeriods(new Date('2026-05-10T12:00:00')); // init
    store.purchases.push(P('Coffee',   5, '2026-05-02'));
    store.purchases.push(P('Lunch',   15, '2026-05-10'));

    const result = store.autoArchiveMissedPeriods(new Date('2026-05-15T12:00:00'));

    expect(result).toBe(1);
    expect(store.lastArchivedPeriodStart).toBe('2026-05-15');
    expect(store.spendingHistory).toHaveLength(1);

    const archived = store.spendingHistory[0];
    expect(archived.date).toBe('2026-05-01');     // PERIOD START
    expect(archived.total).toBe(20);
    expect(archived.items).toHaveLength(2);
    expect(store.purchases).toEqual([]);          // all cleared
  });

  it('archives 3 periods when the user returns after 42 days (empty periods included)', () => {
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    store.autoArchiveMissedPeriods(new Date('2026-05-10T12:00:00')); // init

    // Spread purchases across only some of the missed periods
    store.purchases.push(P('A',  10, '2026-05-02'));  // period 1 (2026-05-01)
    store.purchases.push(P('B',  20, '2026-05-30'));  // period 3 (2026-05-29)
    // No purchases land in period 2 (2026-05-15) → empty archive expected

    const result = store.autoArchiveMissedPeriods(new Date('2026-06-12T12:00:00'));

    expect(result).toBe(3);
    expect(store.lastArchivedPeriodStart).toBe('2026-06-12');
    expect(store.spendingHistory).toHaveLength(3);

    const [p1, p2, p3] = store.spendingHistory;
    expect(p1.date).toBe('2026-05-01'); expect(p1.total).toBe(10); expect(p1.items).toHaveLength(1);
    expect(p2.date).toBe('2026-05-15'); expect(p2.total).toBe(0);  expect(p2.items).toHaveLength(0);
    expect(p3.date).toBe('2026-05-29'); expect(p3.total).toBe(20); expect(p3.items).toHaveLength(1);

    expect(store.purchases).toEqual([]);
  });

  it('undated purchases land in the MOST RECENT missed period', () => {
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    store.autoArchiveMissedPeriods(new Date('2026-05-10T12:00:00')); // init

    store.purchases.push(P('UndatedPurchase', 30, undefined));

    const result = store.autoArchiveMissedPeriods(new Date('2026-06-12T12:00:00'));

    expect(result).toBe(3);
    const newest = store.spendingHistory[store.spendingHistory.length - 1];
    expect(newest.date).toBe('2026-05-29');
    expect(newest.items).toHaveLength(1);
    expect(newest.items[0].name).toBe('UndatedPurchase');
  });

  it('backdated purchases (older than lastArchived) land in the OLDEST missed period', () => {
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    store.autoArchiveMissedPeriods(new Date('2026-05-20T12:00:00')); // init → 2026-05-15

    // Backdated to before 2026-05-15
    store.purchases.push(P('Backdated', 42, '2026-04-20'));

    const result = store.autoArchiveMissedPeriods(new Date('2026-06-12T12:00:00'));

    expect(result).toBeGreaterThanOrEqual(1);
    const oldest = store.spendingHistory[0];
    expect(oldest.date).toBe('2026-05-15');     // oldest missed period
    expect(oldest.items.find(it => it.name === 'Backdated')).toBeDefined();
  });

  it('current-period purchases (date >= currentStart) are preserved in the live array', () => {
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    store.autoArchiveMissedPeriods(new Date('2026-05-10T12:00:00')); // init

    store.purchases.push(P('OldOne', 10, '2026-05-02'));       // missed
    store.purchases.push(P('CurrentOne', 25, '2026-05-16'));   // current period

    store.autoArchiveMissedPeriods(new Date('2026-05-20T12:00:00')); // currentStart = 2026-05-15

    expect(store.lastArchivedPeriodStart).toBe('2026-05-15');
    expect(store.spendingHistory).toHaveLength(1);
    expect(store.spendingHistory[0].total).toBe(10);
    expect(store.purchases).toHaveLength(1);
    expect(store.purchases[0].name).toBe('CurrentOne');
  });

  it('bucket assignment is exact (purchase on the seam goes to the new period)', () => {
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    store.autoArchiveMissedPeriods(new Date('2026-05-10T12:00:00')); // init

    // 2026-05-15 IS the start of the NEXT period — not part of [2026-05-01, 2026-05-15).
    store.purchases.push(P('OnSeam', 7, '2026-05-15'));

    // Roll over far enough that 2026-05-15 is itself archived.
    store.autoArchiveMissedPeriods(new Date('2026-05-29T12:00:00'));

    // Two missed periods archived: 2026-05-01 (empty) and 2026-05-15 (holds OnSeam)
    const [p1, p2] = store.spendingHistory;
    expect(p1.date).toBe('2026-05-01'); expect(p1.items).toHaveLength(0);
    expect(p2.date).toBe('2026-05-15'); expect(p2.items.map(i => i.name)).toEqual(['OnSeam']);
  });

  it('is idempotent: calling twice in the same period archives only once', () => {
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    store.autoArchiveMissedPeriods(new Date('2026-05-10T12:00:00')); // init
    store.purchases.push(P('A', 10, '2026-05-02'));

    const r1 = store.autoArchiveMissedPeriods(new Date('2026-05-20T12:00:00'));
    const r2 = store.autoArchiveMissedPeriods(new Date('2026-05-20T12:00:00'));

    expect(r1).toBe(1);
    expect(r2).toBe(0);
    expect(store.spendingHistory).toHaveLength(1);
  });

  it('preserves Purchase metadata (category) when archiving', () => {
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    store.autoArchiveMissedPeriods(new Date('2026-05-10T12:00:00'));

    store.purchases.push({
      id: 'concert-1',
      name: 'Concert', amount: 80, category: 'Entertainment',
      date: '2026-05-03', budgetType: 'wants', cardId: null,
    });

    store.autoArchiveMissedPeriods(new Date('2026-05-20T12:00:00'));

    const item = store.spendingHistory[0].items[0];
    expect(item.name).toBe('Concert');
    expect(item.amount).toBe(80);
    expect(item.category).toBe('Entertainment');
    expect(item.date).toBe('2026-05-03');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  RS-23 — lastArchivedPeriodStart field & migration
// ─────────────────────────────────────────────────────────────────────────────
describe('budget store — lastArchivedPeriodStart field (RS-23)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('makeDefaultState includes lastArchivedPeriodStart = null', () => {
    expect(makeDefaultState().lastArchivedPeriodStart).toBeNull();
  });

  it('makeBlankState includes lastArchivedPeriodStart = null', () => {
    expect(makeBlankState().lastArchivedPeriodStart).toBeNull();
  });

  it('migrateState adds lastArchivedPeriodStart = null for legacy state without it', () => {
    const legacy = { allocation: { needs: 50, wants: 30, savings: 20 } };
    const migrated = migrateState(legacy);
    expect(migrated.lastArchivedPeriodStart).toBeNull();
  });

  it('migrateState preserves an existing lastArchivedPeriodStart value', () => {
    const s = { ...makeDefaultState(), lastArchivedPeriodStart: '2026-05-15' };
    expect(migrateState(s).lastArchivedPeriodStart).toBe('2026-05-15');
  });
});

