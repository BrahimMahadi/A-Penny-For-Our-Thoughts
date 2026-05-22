/**
 * Tests: utils/csvImportExport.ts
 * Sprint 5 — CSV import/export
 *
 * Covers:
 *  - exportStateToCSV: section headers present, each entity serialised
 *  - parseCSVToState: all sections parsed, defaults applied for missing sections
 *  - round-trip: export → parse → compare (deep equality on all collections)
 *  - backward-compat: old 4-column loan export, old 3-column subscription export
 *  - edge cases: empty collections, special characters in names, JSON-encoded monthlyAllocations
 *  - triggerCSVDownload: creates a <a> element and removes it
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { exportStateToCSV, parseCSVToState, triggerCSVDownload } from '@/utils/csvImportExport';
import { makeBlankState } from '@/stores/budget';
import type { BudgetState } from '@/types/state';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal but populated state for round-trip testing. */
function buildSampleState(): BudgetState {
  const s = makeBlankState();
  s.allocation = { needs: 55, wants: 25, savings: 20 };
  s.budgetDisplayMode = { needs: 'biweekly', wants: 'monthly', savings: 'monthly' };
  s.payStart = '2026-01-01';

  s.incomeStreams = [
    { id: 'inc1', name: 'Job', amount: 3000, biweekly: false },
    { id: 'inc2', name: 'Side Hustle', amount: 500, biweekly: true },
  ];

  s.expenseCards = [
    {
      id: 'card1',
      label: 'Visa',
      items: [
        { id: 'item1', name: 'Rent', amount: 1200, biweekly: false, dueDay: 1 },
        { id: 'item2', name: 'Internet', amount: 80, biweekly: false, dueDay: null },
      ],
    },
    { id: 'card2', label: 'Debit', items: [] }, // empty card → stub row
  ];

  s.purchases = [
    { id: 'pur1', name: 'Coffee', amount: 5.5, category: 'Food', cardId: 'card1', budgetType: 'wants' },
  ];

  s.spendingHistory = [
    {
      id: 'hist1', date: '2026-04-28', label: 'Period 1', total: 200,
      items: [
        { id: 'ph1', name: 'Groceries', amount: 150, category: 'Food' },
        { id: 'ph2', name: 'Gas',       amount:  50, category: 'Transport' },
      ],
    },
    { id: 'hist2', date: '2026-05-12', label: 'Period 2', total: 0, items: [] },
  ];

  s.loans = [
    {
      id: 'loan1', name: 'Car Loan', remaining: 10000, original: 15000,
      paymentAmount: 350, frequency: 'monthly', date: '2024-06-01',
      budgetType: 'needs', cardId: null,
    },
  ];

  s.creditCards = [
    { id: 'cc1', name: 'Mastercard', balance: 500, limit: 3000 },
  ];

  s.subscriptions = [
    {
      id: 'sub1', name: 'Netflix', amount: 17, frequency: 'monthly',
      date: '2026-06-01', category: 'Entertainment', budgetType: 'wants', cardId: 'cc1',
    },
  ];

  s.wishlist = [
    { id: 'wish1', icon: '🎯', name: 'New Laptop', url: 'https://example.com' },
  ];

  s.savingsAccounts = [
    {
      id: 'sa1', name: 'Emergency Fund', balance: 5000, defaultAllocated: 300,
      monthlyAllocations: { '2026-04': 250, '2026-05': 350 },
    },
  ];

  s.goals = [
    { id: 'goal1', accountId: 'sa1', targetAmount: 15000, targetDate: '2027-12' },
  ];

  s.assets = [
    { id: 'asset1', name: 'Home', category: 'real_estate', value: 400000 },
  ];

  s.netWorthHistory = [
    { id: 'nw1', date: '2026-04', netWorth: 50000, totalAssets: 60000, totalLiabilities: 10000 },
  ];

  s.rules = [
    { id: 'rule1', pattern: 'Tim Hortons', matchType: 'contains', category: 'Food' },
  ];

  s.budgetAlerts = [
    { id: 'alert1', category: 'Food', threshold: 80 },
  ];

  return s;
}

// ─── Export tests ─────────────────────────────────────────────────────────────

describe('exportStateToCSV', () => {
  it('produces all 17 SECTION: markers', () => {
    const csv = exportStateToCSV(buildSampleState());
    const sections = [
      'meta', 'allocation', 'budgetDisplayMode', 'incomeStreams', 'expenseCards',
      'purchases', 'spendingHistory', 'loans', 'creditCards', 'subscriptions',
      'wishlist', 'savingsAccounts', 'goals', 'assets', 'netWorthHistory',
      'rules', 'budgetAlerts',
    ];
    for (const section of sections) {
      expect(csv).toContain(`SECTION:${section}`);
    }
  });

  it('encodes payStart in the meta section', () => {
    const s = makeBlankState();
    s.payStart = '2026-01-15';
    expect(exportStateToCSV(s)).toContain('payStart,2026-01-15');
  });

  it('serialises allocation percentages correctly', () => {
    const s = makeBlankState();
    s.allocation = { needs: 55, wants: 25, savings: 20 };
    expect(exportStateToCSV(s)).toContain('55,25,20');
  });

  it('flattens expense cards with items into one row per item', () => {
    const csv = exportStateToCSV(buildSampleState());
    expect(csv).toContain('card1,Visa,item1,Rent,1200,false,1');
    expect(csv).toContain('card1,Visa,item2,Internet,80,false,');
  });

  it('emits a stub row for empty expense cards', () => {
    const csv = exportStateToCSV(buildSampleState());
    expect(csv).toContain('card2,Debit,,,,');
  });

  it('flattens spending history periods with items', () => {
    const csv = exportStateToCSV(buildSampleState());
    expect(csv).toContain('hist1,2026-04-28,Period 1,200,ph1,Groceries,150,Food');
    expect(csv).toContain('hist1,2026-04-28,Period 1,200,ph2,Gas,50,Transport');
  });

  it('emits a stub row for empty spending history periods', () => {
    const csv = exportStateToCSV(buildSampleState());
    expect(csv).toContain('hist2,2026-05-12,Period 2,0,,,,');
  });

  it('JSON-encodes monthlyAllocations for savings accounts', () => {
    const csv = exportStateToCSV(buildSampleState());
    expect(csv).toContain('sa1,Emergency Fund,5000,300,"{""2026-04"":250,""2026-05"":350}"');
  });

  it('escapes commas and quotes in names', () => {
    const s = makeBlankState();
    s.incomeStreams = [{ id: 'i1', name: 'A, Special "Job"', amount: 1000, biweekly: false }];
    const csv = exportStateToCSV(s);
    expect(csv).toContain('"A, Special ""Job"""');
  });

  it('handles empty collections without crashing', () => {
    const s = makeBlankState();
    expect(() => exportStateToCSV(s)).not.toThrow();
  });
});

// ─── Parse tests ──────────────────────────────────────────────────────────────

describe('parseCSVToState', () => {
  it('parses allocation correctly', () => {
    const csv = 'SECTION:allocation\nneeds,wants,savings\n55,25,20\n';
    const state = parseCSVToState(csv);
    expect(state.allocation).toEqual({ needs: 55, wants: 25, savings: 20 });
  });

  it('falls back to 50/30/20 when allocation section is absent', () => {
    const state = parseCSVToState('');
    expect(state.allocation).toEqual({ needs: 50, wants: 30, savings: 20 });
  });

  it('parses incomeStreams (biweekly boolean)', () => {
    const csv = 'SECTION:incomeStreams\nid,name,amount,biweekly\ni1,Job,3000,false\ni2,Hustle,500,true\n';
    const state = parseCSVToState(csv);
    expect(state.incomeStreams).toHaveLength(2);
    expect(state.incomeStreams[0]).toMatchObject({ id: 'i1', name: 'Job', amount: 3000, biweekly: false });
    expect(state.incomeStreams[1]).toMatchObject({ id: 'i2', amount: 500, biweekly: true });
  });

  it('assembles expense cards from flattened rows', () => {
    const csv = [
      'SECTION:expenseCards',
      'cardId,cardLabel,itemId,itemName,itemAmount,itemBiweekly,itemDueDay',
      'card1,Visa,item1,Rent,1200,false,1',
      'card1,Visa,item2,Internet,80,false,',
      'card2,Debit,,,,,',
    ].join('\n');
    const state = parseCSVToState(csv);
    expect(state.expenseCards).toHaveLength(2);
    expect(state.expenseCards[0].items).toHaveLength(2);
    expect(state.expenseCards[0].items[0]).toMatchObject({ name: 'Rent', amount: 1200, dueDay: 1 });
    expect(state.expenseCards[0].items[1]).toMatchObject({ name: 'Internet', dueDay: null });
    expect(state.expenseCards[1].items).toHaveLength(0); // stub row → no items
  });

  it('assembles spendingHistory periods from flattened rows', () => {
    const csv = [
      'SECTION:spendingHistory',
      'periodId,periodDate,periodLabel,periodTotal,purchaseId,purchaseName,purchaseAmount,purchaseCategory',
      'h1,2026-04-01,Period A,100,p1,Coffee,5,Food',
      'h1,2026-04-01,Period A,100,p2,Bread,3,Food',
      'h2,2026-04-15,Period B,0,,,,',
    ].join('\n');
    const state = parseCSVToState(csv);
    expect(state.spendingHistory).toHaveLength(2);
    expect(state.spendingHistory[0].items).toHaveLength(2);
    expect(state.spendingHistory[1].items).toHaveLength(0);
  });

  it('parses loans with all 9 columns', () => {
    const csv = [
      'SECTION:loans',
      'id,name,remaining,original,paymentAmount,frequency,date,budgetType,cardId',
      'l1,Car Loan,10000,15000,350,monthly,2024-06-01,needs,',
    ].join('\n');
    const state = parseCSVToState(csv);
    expect(state.loans[0]).toMatchObject({
      id: 'l1', name: 'Car Loan', remaining: 10000, original: 15000,
      paymentAmount: 350, frequency: 'monthly', budgetType: 'needs', cardId: null,
    });
  });

  it('handles backward-compat 4-column loan export (no payment fields)', () => {
    const csv = [
      'SECTION:loans',
      'id,name,remaining,original',
      'l1,Old Loan,5000,8000',
    ].join('\n');
    const state = parseCSVToState(csv);
    expect(state.loans[0]).toMatchObject({
      id: 'l1', name: 'Old Loan', remaining: 5000, original: 8000,
      paymentAmount: 0, frequency: 'monthly',
    });
  });

  it('handles backward-compat 3-column subscription (old format)', () => {
    const csv = [
      'SECTION:subscriptions',
      'id,name,date',
      's1,Netflix,2026-01-01',
    ].join('\n');
    const state = parseCSVToState(csv);
    expect(state.subscriptions[0]).toMatchObject({
      id: 's1', name: 'Netflix', amount: 0, frequency: 'monthly', category: 'Other',
    });
  });

  it('parses savings accounts with JSON monthlyAllocations', () => {
    const csv = [
      'SECTION:savingsAccounts',
      'id,name,balance,defaultAllocated,monthlyAllocations',
      'sa1,Emergency Fund,5000,300,"{""2026-04"":250}"',
    ].join('\n');
    const state = parseCSVToState(csv);
    expect(state.savingsAccounts[0].monthlyAllocations).toEqual({ '2026-04': 250 });
  });

  it('parses savings accounts without monthlyAllocations column (old format)', () => {
    const csv = [
      'SECTION:savingsAccounts',
      'id,name,balance,defaultAllocated',
      'sa1,Emergency Fund,5000,300',
    ].join('\n');
    const state = parseCSVToState(csv);
    expect(state.savingsAccounts[0].monthlyAllocations).toEqual({});
  });

  it('ignores unknown sections', () => {
    const csv = 'SECTION:unknownFutureThing\nfoo,bar\n1,2\n';
    expect(() => parseCSVToState(csv)).not.toThrow();
  });

  it('applies blank defaults for every missing collection', () => {
    const state = parseCSVToState('SECTION:allocation\nneeds,wants,savings\n50,30,20\n');
    expect(state.loans).toEqual([]);
    expect(state.creditCards).toEqual([]);
    expect(state.subscriptions).toEqual([]);
    expect(state.wishlist).toEqual([]);
    expect(state.goals).toEqual([]);
    expect(state.assets).toEqual([]);
    expect(state.netWorthHistory).toEqual([]);
    expect(state.rules).toEqual([]);
    expect(state.budgetAlerts).toEqual([]);
    expect(state.payStart).toBeNull();
  });
});

// ─── Round-trip tests ─────────────────────────────────────────────────────────

describe('round-trip: exportStateToCSV → parseCSVToState', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('preserves allocation', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.allocation).toEqual(state.allocation);
  });

  it('preserves budgetDisplayMode', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.budgetDisplayMode).toEqual(state.budgetDisplayMode);
  });

  it('preserves payStart', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.payStart).toBe(state.payStart);
  });

  it('preserves all income streams', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.incomeStreams).toHaveLength(state.incomeStreams.length);
    state.incomeStreams.forEach((s, i) => {
      expect(parsed.incomeStreams[i]).toMatchObject({ id: s.id, name: s.name, amount: s.amount, biweekly: s.biweekly });
    });
  });

  it('preserves expense cards and their items', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.expenseCards).toHaveLength(state.expenseCards.length);
    const origCard = state.expenseCards[0];
    const parsedCard = parsed.expenseCards.find((c) => c.id === origCard.id)!;
    expect(parsedCard.label).toBe(origCard.label);
    expect(parsedCard.items).toHaveLength(origCard.items.length);
    expect(parsedCard.items[0]).toMatchObject({ id: origCard.items[0].id, amount: origCard.items[0].amount, dueDay: 1 });
  });

  it('preserves purchases', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.purchases).toHaveLength(state.purchases.length);
    expect(parsed.purchases[0]).toMatchObject({ id: 'pur1', name: 'Coffee', amount: 5.5 });
  });

  it('preserves spending history with nested items', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.spendingHistory).toHaveLength(2);
    const h1 = parsed.spendingHistory.find((h) => h.id === 'hist1')!;
    expect(h1.items).toHaveLength(2);
    expect(h1.items[0]).toMatchObject({ name: 'Groceries', amount: 150 });
  });

  it('preserves loans', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.loans[0]).toMatchObject({
      id: 'loan1', remaining: 10000, paymentAmount: 350, frequency: 'monthly',
    });
  });

  it('preserves credit cards', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.creditCards[0]).toMatchObject({ id: 'cc1', balance: 500, limit: 3000 });
  });

  it('preserves subscriptions', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.subscriptions[0]).toMatchObject({
      id: 'sub1', name: 'Netflix', amount: 17, frequency: 'monthly', cardId: 'cc1',
    });
  });

  it('preserves wishlist items', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.wishlist[0]).toMatchObject({ id: 'wish1', icon: '🎯', name: 'New Laptop', url: 'https://example.com' });
  });

  it('preserves savings accounts with monthlyAllocations', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.savingsAccounts[0]).toMatchObject({ id: 'sa1', balance: 5000, defaultAllocated: 300 });
    expect(parsed.savingsAccounts[0].monthlyAllocations).toEqual({ '2026-04': 250, '2026-05': 350 });
  });

  it('preserves goals', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.goals[0]).toMatchObject({ id: 'goal1', accountId: 'sa1', targetAmount: 15000, targetDate: '2027-12' });
  });

  it('preserves assets', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.assets[0]).toMatchObject({ id: 'asset1', category: 'real_estate', value: 400000 });
  });

  it('preserves netWorthHistory', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.netWorthHistory[0]).toMatchObject({
      id: 'nw1', date: '2026-04', netWorth: 50000, totalAssets: 60000, totalLiabilities: 10000,
    });
  });

  it('preserves rules', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.rules[0]).toMatchObject({ id: 'rule1', pattern: 'Tim Hortons', matchType: 'contains' });
  });

  it('preserves budgetAlerts', () => {
    const state = buildSampleState();
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.budgetAlerts[0]).toMatchObject({ id: 'alert1', category: 'Food', threshold: 80 });
  });

  it('preserves special characters (commas and quotes) in entity names', () => {
    const state = makeBlankState();
    state.incomeStreams = [{ id: 'i1', name: 'Say "Hello", World', amount: 100, biweekly: false }];
    const parsed = parseCSVToState(exportStateToCSV(state));
    expect(parsed.incomeStreams[0].name).toBe('Say "Hello", World');
  });
});

// ─── triggerCSVDownload tests ─────────────────────────────────────────────────

describe('triggerCSVDownload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and removes an <a> element from the DOM', () => {
    // Stub URL APIs (not available in jsdom)
    const createURL = vi.fn().mockReturnValue('blob:test');
    const revokeURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: createURL, revokeObjectURL: revokeURL });

    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    triggerCSVDownload('col1,col2\nval1,val2\n', 'test.csv');

    expect(createURL).toHaveBeenCalledOnce();
    expect(revokeURL).toHaveBeenCalledWith('blob:test');
    expect(appendSpy).toHaveBeenCalledOnce();
    expect(removeSpy).toHaveBeenCalledOnce();

    // Confirm the appended element was an anchor with the correct download attr
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.tagName).toBe('A');
    expect(anchor.download).toBe('test.csv');
  });

  it('defaults filename to penny-export-YYYY-MM-DD.csv', () => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:x'), revokeObjectURL: vi.fn() });
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    triggerCSVDownload('a,b\n1,2\n');

    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toMatch(/^penny-export-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
