/**
 * Module:   tests/lib/migrateLocalStorage.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 23 — Supabase DB Integration)
 * Summary:  Unit tests for the one-time localStorage → Supabase migration
 *           utility (src/lib/migrateLocalStorage.ts).
 *
 *           All Supabase calls are mocked so no network requests are made.
 *           localStorage is controlled via vitest's built-in fake environment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ─────────────────────────────────────────────────────────
// vi.mock is hoisted — use vi.hoisted() so variables are available
// inside the factory before the module executes.

const {
  mockUpsertProfile,
  mockInsertIncome,
  mockInsertPurchase,
  mockInsertCard,
  mockInsertSub,
  mockInsertCategory,
} = vi.hoisted(() => ({
  mockUpsertProfile:  vi.fn().mockResolvedValue(undefined),
  mockInsertIncome:   vi.fn().mockResolvedValue(undefined),
  mockInsertPurchase: vi.fn().mockResolvedValue(undefined),
  mockInsertCard:     vi.fn().mockResolvedValue(undefined),
  mockInsertSub:      vi.fn().mockResolvedValue(undefined),
  mockInsertCategory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/db', () => ({
  upsertProfile: mockUpsertProfile,
  db: {
    incomeStreams:       { insert: mockInsertIncome },
    expenseCards:       { insert: mockInsertCard },
    purchases:          { insert: mockInsertPurchase },
    spendingHistory:    { insertPeriod: vi.fn().mockResolvedValue(undefined) },
    loans:              { insert: vi.fn().mockResolvedValue(undefined) },
    creditCards:        { insert: vi.fn().mockResolvedValue(undefined) },
    subscriptions:      { insert: mockInsertSub },
    wishlist:           { insert: vi.fn().mockResolvedValue(undefined) },
    savingsAccounts:    { insert: vi.fn().mockResolvedValue(undefined) },
    goals:              { insert: vi.fn().mockResolvedValue(undefined) },
    assets:             { insert: vi.fn().mockResolvedValue(undefined) },
    netWorthHistory:    { insert: vi.fn().mockResolvedValue(undefined) },
    rules:              { insert: vi.fn().mockResolvedValue(undefined) },
    budgetAlerts:       { insert: vi.fn().mockResolvedValue(undefined) },
    spendingCategories: { insert: mockInsertCategory },
  },
}));

// Import AFTER mocks are registered
import { migrateIfNeeded, isMigrated } from '@/lib/migrateLocalStorage';
import { STORAGE_KEYS } from '@/types/state';

const MIGRATION_FLAG = 'penny_migrated_to_supabase';

// ─── Helpers ──────────────────────────────────────────────────────

function seedLocalStorage(partial: Record<string, unknown> = {}) {
  const state = {
    allocation: { needs: 50, wants: 30, savings: 20 },
    budgetDisplayMode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
    payStart: null,
    fundsRemaining: 0,
    fundsRemainingUpdated: '',
    hasOnboarded: true,
    dismissedVersion: '1.15.0',
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
    rules: [],
    budgetAlerts: [],
    spendingCategories: [],
    ...partial,
  };
  localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state));
}

// ─── Tests ────────────────────────────────────────────────────────

describe('migrateIfNeeded', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns false and skips when migration flag is already set', async () => {
    localStorage.setItem(MIGRATION_FLAG, 'true');
    seedLocalStorage();

    const result = await migrateIfNeeded('uid');

    expect(result).toBe(false);
    expect(mockUpsertProfile).not.toHaveBeenCalled();
  });

  it('returns false when no localStorage data exists (brand-new user)', async () => {
    // No penny_state_v2 in localStorage
    const result = await migrateIfNeeded('uid');
    expect(result).toBe(false);
    expect(mockUpsertProfile).not.toHaveBeenCalled();
  });

  it('returns false when localStorage data is unparseable JSON', async () => {
    localStorage.setItem(STORAGE_KEYS.STATE, '{broken json{{');
    const result = await migrateIfNeeded('uid');
    expect(result).toBe(false);
    expect(mockUpsertProfile).not.toHaveBeenCalled();
  });

  it('returns true and calls upsertProfile when valid state exists', async () => {
    seedLocalStorage();
    const result = await migrateIfNeeded('uid');
    expect(result).toBe(true);
    expect(mockUpsertProfile).toHaveBeenCalledOnce();
    expect(mockUpsertProfile.mock.calls[0][0]).toBe('uid');
  });

  it('sets the migration flag in localStorage after success', async () => {
    seedLocalStorage();
    await migrateIfNeeded('uid');
    expect(localStorage.getItem(MIGRATION_FLAG)).toBe('true');
  });

  it('migrates income streams', async () => {
    seedLocalStorage({
      incomeStreams: [
        { id: 'i1', name: 'Salary', amount: 5000, biweekly: false },
      ],
    });
    await migrateIfNeeded('uid');
    expect(mockInsertIncome).toHaveBeenCalledWith('uid', expect.objectContaining({ id: 'i1', name: 'Salary' }));
  });

  it('migrates purchases', async () => {
    seedLocalStorage({
      purchases: [
        { id: 'p1', name: 'Coffee', amount: 5, category: 'Food & Drink', cardId: null, budgetType: 'wants', date: '2026-05-20' },
      ],
    });
    await migrateIfNeeded('uid');
    expect(mockInsertPurchase).toHaveBeenCalledWith('uid', expect.objectContaining({ id: 'p1', name: 'Coffee' }));
  });

  it('migrates subscriptions', async () => {
    seedLocalStorage({
      subscriptions: [
        { id: 's1', name: 'Netflix', amount: 17.99, frequency: 'monthly', date: '2026-06-01', category: 'Entertainment', budgetType: 'wants', cardId: null, daysOfWeek: [] },
      ],
    });
    await migrateIfNeeded('uid');
    expect(mockInsertSub).toHaveBeenCalledWith('uid', expect.objectContaining({ id: 's1', name: 'Netflix' }));
  });

  it('migrates spending categories', async () => {
    seedLocalStorage({
      spendingCategories: [
        { id: 'cat1', name: 'Food & Drink', color: '#ff8c42' },
      ],
    });
    await migrateIfNeeded('uid');
    expect(mockInsertCategory).toHaveBeenCalledWith('uid', expect.objectContaining({ id: 'cat1', name: 'Food & Drink' }));
  });

  it('does NOT set the flag if migration throws', async () => {
    seedLocalStorage();
    mockUpsertProfile.mockRejectedValueOnce(new Error('DB unavailable'));

    const result = await migrateIfNeeded('uid');
    expect(result).toBe(false);
    expect(localStorage.getItem(MIGRATION_FLAG)).toBeNull();
  });

  it('passes profile scalars to upsertProfile', async () => {
    seedLocalStorage({
      hasOnboarded: true,
      dismissedVersion: '1.15.0',
      payStart: '2026-01-15',
      fundsRemaining: 850,
      displayName: 'Brahim',
    });
    await migrateIfNeeded('uid');

    const call = mockUpsertProfile.mock.calls[0];
    expect(call[1]).toMatchObject({
      hasOnboarded: true,
      dismissedVersion: '1.15.0',
      payStart: '2026-01-15',
      fundsRemaining: 850,
      displayName: 'Brahim',
    });
  });
});

// ─── isMigrated ───────────────────────────────────────────────────

describe('isMigrated', () => {
  beforeEach(() => { localStorage.clear(); });

  it('returns false when flag is not set', () => {
    expect(isMigrated()).toBe(false);
  });

  it('returns true when flag is "true"', () => {
    localStorage.setItem(MIGRATION_FLAG, 'true');
    expect(isMigrated()).toBe(true);
  });
});
