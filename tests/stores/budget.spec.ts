import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  useBudgetStore,
  makeDefaultState,
  makeBlankState,
  migrateState,
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
