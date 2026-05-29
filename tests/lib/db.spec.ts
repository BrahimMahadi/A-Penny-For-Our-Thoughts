/**
 * Module:   tests/lib/db.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 23 — Supabase DB Integration)
 * Summary:  Unit tests for the DB adapter layer (src/lib/db.ts).
 *
 *           Strategy:
 *             - Mock the Supabase client so no real network calls are made.
 *             - Test the camelCase ↔ snake_case mapper functions via the
 *               fetchAllUserData path.
 *             - Test that insert/update/delete helpers call the correct
 *               Supabase table with the correct payload.
 *             - Test the assertNoError throw behaviour.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock supabase client ──────────────────────────────────────────
// vi.mock is hoisted to the top of the file, so variables must be
// declared with vi.hoisted() to be available inside the factory.

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
  DEV_USER_ID: 'test-user-uuid',
  isSupabaseConfigured: () => true,
}));

// Import after mock is registered
import { fetchAllUserData, db, upsertProfile } from '@/lib/db';

// ─── Helpers ──────────────────────────────────────────────────────

/** Build a chainable Supabase query mock that resolves with { data, error }. */
function makeQuery(data: unknown = [], error: null | { message: string } = null) {
  const q: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'maybeSingle', 'insert', 'update', 'delete', 'upsert'];
  methods.forEach(m => { q[m] = vi.fn().mockReturnValue(q); });
  // The final awaited value
  q['then'] = (resolve: (v: unknown) => void) => resolve({ data, error });
  return q;
}

/** Patch mockFrom so every table returns the given data. */
function allTablesReturn(data: unknown = []) {
  mockFrom.mockReturnValue(makeQuery(data));
}

// ─── fetchAllUserData ──────────────────────────────────────────────

describe('fetchAllUserData', () => {
  beforeEach(() => { mockFrom.mockReset(); });

  it('returns null when the profile row does not exist (new user)', async () => {
    // profiles returns null (maybeSingle with no row), all other tables return []
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === 'profiles') {
        return makeQuery(null); // no profile
      }
      return makeQuery([]);
    });

    const result = await fetchAllUserData('test-user-uuid');
    expect(result).toBeNull();
  });

  it('maps profile scalars correctly', async () => {
    const profileRow = {
      id: 'uid',
      allocation: { needs: 50, wants: 30, savings: 20 },
      budget_display_mode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
      pay_start: '2026-01-01',
      funds_remaining: 1200,
      funds_remaining_updated: '2026-05-01',
      has_onboarded: true,
      dismissed_version: '1.15.0',
      created_at: '',
      updated_at: '',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return makeQuery(profileRow);
      return makeQuery([]);
    });

    const result = await fetchAllUserData('uid');
    expect(result).not.toBeNull();
    expect(result!.allocation).toEqual({ needs: 50, wants: 30, savings: 20 });
    expect(result!.payStart).toBe('2026-01-01');
    expect(result!.fundsRemaining).toBe(1200);
    expect(result!.hasOnboarded).toBe(true);
    expect(result!.dismissedVersion).toBe('1.15.0');
  });

  it('maps purchase rows to camelCase Purchase objects', async () => {
    const profileRow = {
      id: 'uid', allocation: { needs: 50, wants: 30, savings: 20 },
      budget_display_mode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
      pay_start: null, funds_remaining: 0, funds_remaining_updated: '',
      has_onboarded: false, dismissed_version: null, created_at: '', updated_at: '',
    };
    const purchaseRow = {
      id: 'p1', user_id: 'uid', name: 'Coffee', amount: 5.50,
      category: 'Food & Drink', card_id: null, budget_type: 'wants',
      date: '2026-05-20', created_at: '', updated_at: '',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return makeQuery(profileRow);
      if (table === 'purchases') return makeQuery([purchaseRow]);
      return makeQuery([]);
    });

    const result = await fetchAllUserData('uid');
    expect(result!.purchases).toHaveLength(1);
    const p = result!.purchases![0];
    expect(p.id).toBe('p1');
    expect(p.name).toBe('Coffee');
    expect(p.amount).toBe(5.50);
    expect(p.category).toBe('Food & Drink');
    expect(p.cardId).toBeNull();
    expect(p.budgetType).toBe('wants');
    expect(p.date).toBe('2026-05-20');
    // No snake_case keys leaked
    expect((p as unknown as Record<string, unknown>)['card_id']).toBeUndefined();
    expect((p as unknown as Record<string, unknown>)['budget_type']).toBeUndefined();
  });

  it('maps subscription rows including days_of_week → daysOfWeek', async () => {
    const profileRow = {
      id: 'uid', allocation: { needs: 50, wants: 30, savings: 20 },
      budget_display_mode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
      pay_start: null, funds_remaining: 0, funds_remaining_updated: '',
      has_onboarded: false, dismissed_version: null, created_at: '', updated_at: '',
    };
    const subRow = {
      id: 's1', user_id: 'uid', name: 'Netflix', amount: 17.99,
      frequency: 'monthly', date: '2026-06-01', category: 'Entertainment',
      budget_type: 'wants', card_id: 'card-1', days_of_week: [1, 3],
      created_at: '', updated_at: '',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return makeQuery(profileRow);
      if (table === 'subscriptions') return makeQuery([subRow]);
      return makeQuery([]);
    });

    const result = await fetchAllUserData('uid');
    const sub = result!.subscriptions![0];
    expect(sub.name).toBe('Netflix');
    expect(sub.daysOfWeek).toEqual([1, 3]);
    expect(sub.cardId).toBe('card-1');
    expect((sub as unknown as Record<string, unknown>)['days_of_week']).toBeUndefined();
  });

  it('assembles expense cards with their nested items', async () => {
    const profileRow = {
      id: 'uid', allocation: { needs: 50, wants: 30, savings: 20 },
      budget_display_mode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
      pay_start: null, funds_remaining: 0, funds_remaining_updated: '',
      has_onboarded: false, dismissed_version: null, created_at: '', updated_at: '',
    };
    const cardRow = { id: 'card-1', user_id: 'uid', label: 'TD Visa', created_at: '', updated_at: '' };
    const itemRow = {
      id: 'item-1', user_id: 'uid', expense_card_id: 'card-1',
      name: 'Rent', amount: 1500, biweekly: false, due_day: 1,
      created_at: '', updated_at: '',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return makeQuery(profileRow);
      if (table === 'expense_cards') return makeQuery([cardRow]);
      if (table === 'expense_items') return makeQuery([itemRow]);
      return makeQuery([]);
    });

    const result = await fetchAllUserData('uid');
    expect(result!.expenseCards).toHaveLength(1);
    const card = result!.expenseCards![0];
    expect(card.label).toBe('TD Visa');
    expect(card.items).toHaveLength(1);
    expect(card.items[0].name).toBe('Rent');
    expect(card.items[0].dueDay).toBe(1);
  });

  it('throws when a Supabase query returns an error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return makeQuery({ id: 'uid' });
      if (table === 'purchases') return makeQuery(null, { message: 'permission denied' });
      return makeQuery([]);
    });

    await expect(fetchAllUserData('uid')).rejects.toThrow('permission denied');
  });
});

// ─── db.purchases helpers ──────────────────────────────────────────

describe('db.purchases', () => {
  beforeEach(() => { mockFrom.mockReset(); });

  it('insert calls from(purchases).insert with snake_case payload', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const purchase = {
      id: 'p1', name: 'Lunch', amount: 22.80, category: 'Food & Drink',
      cardId: null, budgetType: 'wants' as const, date: '2026-05-22',
    };
    await db.purchases.insert('uid', purchase);

    expect(mockFrom).toHaveBeenCalledWith('purchases');
    const payload = insertMock.mock.calls[0][0];
    expect(payload.id).toBe('p1');
    expect(payload.name).toBe('Lunch');
    expect(payload.card_id).toBeNull();
    expect(payload.budget_type).toBe('wants');
    expect(payload.date).toBe('2026-05-22');
    // No camelCase keys in the DB payload
    expect(payload.cardId).toBeUndefined();
    expect(payload.budgetType).toBeUndefined();
  });

  it('update calls from(purchases).update(...).eq(id).eq(user_id)', async () => {
    const eqMock = vi.fn().mockReturnThis();
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock, then: (r: (v: unknown) => void) => r({ error: null }) });
    mockFrom.mockReturnValue({ update: updateMock });

    const purchase = {
      id: 'p1', name: 'Updated', amount: 30, category: 'Food & Drink',
      cardId: null, budgetType: 'wants' as const,
    };
    await db.purchases.update('uid', purchase);

    expect(updateMock).toHaveBeenCalled();
    const payload = updateMock.mock.calls[0][0];
    expect(payload.name).toBe('Updated');
    expect(payload.budget_type).toBe('wants');
  });

  it('delete calls from(purchases).delete().eq(id).eq(user_id)', async () => {
    const eqMock = vi.fn().mockReturnThis();
    eqMock.mockReturnValue({ eq: eqMock, then: (r: (v: unknown) => void) => r({ error: null }) });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockFrom.mockReturnValue({ delete: deleteMock });

    await db.purchases.delete('uid', 'p1');
    expect(mockFrom).toHaveBeenCalledWith('purchases');
    expect(deleteMock).toHaveBeenCalled();
  });
});

// ─── db.subscriptions helpers ──────────────────────────────────────

describe('db.subscriptions', () => {
  beforeEach(() => { mockFrom.mockReset(); });

  it('insert maps daysOfWeek → days_of_week', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const sub = {
      id: 's1', name: 'Gym', amount: 55, frequency: 'monthly' as const,
      date: '2026-06-15', category: 'Health & Fitness',
      budgetType: 'wants' as const, cardId: null, daysOfWeek: [1, 3, 5],
    };
    await db.subscriptions.insert('uid', sub);

    const payload = insertMock.mock.calls[0][0];
    expect(payload.days_of_week).toEqual([1, 3, 5]);
    expect(payload.daysOfWeek).toBeUndefined();
    expect(payload.budget_type).toBe('wants');
  });
});

// ─── db.loans helpers ─────────────────────────────────────────────

describe('db.loans', () => {
  beforeEach(() => { mockFrom.mockReset(); });

  it('insert maps paymentAmount → payment_amount', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const loan = {
      id: 'l1', name: 'Car', remaining: 8000, original: 10000,
      paymentAmount: 350, frequency: 'monthly' as const,
      date: '2026-06-01', budgetType: 'needs' as const, cardId: null,
    };
    await db.loans.insert('uid', loan);

    const payload = insertMock.mock.calls[0][0];
    expect(payload.payment_amount).toBe(350);
    expect(payload.paymentAmount).toBeUndefined();
  });
});

// ─── db.wishlist helpers ───────────────────────────────────────────
// BUG-023: RS-14 added price/saved to the domain type but the migration
// to add those columns to wishlist_items was missing. These tests pin the
// expected DB payload so a missing column regression is caught immediately.

describe('db.wishlist', () => {
  beforeEach(() => { mockFrom.mockReset(); });

  it('insert sends price and saved as snake_case null-coalesced values', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const item = { id: 'w1', icon: '🎸', name: 'Guitar', url: 'https://example.com', price: 499, saved: 120 };
    await db.wishlist.insert('uid', item);

    expect(mockFrom).toHaveBeenCalledWith('wishlist_items');
    const payload = insertMock.mock.calls[0][0];
    expect(payload.id).toBe('w1');
    expect(payload.icon).toBe('🎸');
    expect(payload.name).toBe('Guitar');
    expect(payload.url).toBe('https://example.com');
    expect(payload.price).toBe(499);
    expect(payload.saved).toBe(120);
    expect(payload.user_id).toBe('uid');
  });

  it('insert sends price: null and saved: null when fields are undefined', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const item = { id: 'w2', icon: '📚', name: 'Book', url: '' };
    await db.wishlist.insert('uid', item);

    const payload = insertMock.mock.calls[0][0];
    expect(payload.price).toBeNull();
    expect(payload.saved).toBeNull();
  });

  it('update sends price and saved in the patch object', async () => {
    const eqMock = vi.fn().mockReturnThis();
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock, then: (r: (v: unknown) => void) => r({ error: null }) });
    mockFrom.mockReturnValue({ update: updateMock });

    const item = { id: 'w1', icon: '🎸', name: 'Guitar', url: '', price: 599, saved: 200 };
    await db.wishlist.update('uid', item);

    const patch = updateMock.mock.calls[0][0];
    expect(patch.price).toBe(599);
    expect(patch.saved).toBe(200);
    expect(patch.name).toBe('Guitar');
  });

  it('update sends price: null when field is undefined (clears the column)', async () => {
    const eqMock = vi.fn().mockReturnThis();
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock, then: (r: (v: unknown) => void) => r({ error: null }) });
    mockFrom.mockReturnValue({ update: updateMock });

    const item = { id: 'w1', icon: '📚', name: 'Book', url: '' }; // no price/saved
    await db.wishlist.update('uid', item);

    const patch = updateMock.mock.calls[0][0];
    expect(patch.price).toBeNull();
    expect(patch.saved).toBeNull();
  });
});

describe('fetchAllUserData — wishlist mapping', () => {
  beforeEach(() => { mockFrom.mockReset(); });

  it('maps wishlist rows including price and saved', async () => {
    const profileRow = {
      id: 'uid', allocation: { needs: 50, wants: 30, savings: 20 },
      budget_display_mode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
      pay_start: null, funds_remaining: 0, funds_remaining_updated: '',
      has_onboarded: false, dismissed_version: null, created_at: '', updated_at: '',
    };
    const wishRow = {
      id: 'w1', user_id: 'uid', icon: '🎸', name: 'Guitar',
      url: 'https://example.com', price: 499, saved: 120,
      created_at: '', updated_at: '',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return makeQuery(profileRow);
      if (table === 'wishlist_items') return makeQuery([wishRow]);
      return makeQuery([]);
    });

    const result = await fetchAllUserData('uid');
    expect(result!.wishlist).toHaveLength(1);
    const item = result!.wishlist![0];
    expect(item.name).toBe('Guitar');
    expect(item.price).toBe(499);
    expect(item.saved).toBe(120);
  });

  it('omits price and saved from domain object when DB columns are null', async () => {
    const profileRow = {
      id: 'uid', allocation: { needs: 50, wants: 30, savings: 20 },
      budget_display_mode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
      pay_start: null, funds_remaining: 0, funds_remaining_updated: '',
      has_onboarded: false, dismissed_version: null, created_at: '', updated_at: '',
    };
    const wishRow = {
      id: 'w2', user_id: 'uid', icon: '📚', name: 'Book', url: '',
      price: null, saved: null, created_at: '', updated_at: '',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return makeQuery(profileRow);
      if (table === 'wishlist_items') return makeQuery([wishRow]);
      return makeQuery([]);
    });

    const result = await fetchAllUserData('uid');
    const item = result!.wishlist![0];
    expect(item.price).toBeUndefined();
    expect(item.saved).toBeUndefined();
  });
});

// ─── upsertProfile ─────────────────────────────────────────────────

describe('upsertProfile', () => {
  beforeEach(() => { mockFrom.mockReset(); });

  it('calls from(profiles).upsert with id and snake_case fields', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: upsertMock });

    await upsertProfile('uid', {
      allocation: { needs: 50, wants: 30, savings: 20 },
      hasOnboarded: true,
      dismissedVersion: '1.15.0',
    });

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    const payload = upsertMock.mock.calls[0][0];
    expect(payload.id).toBe('uid');
    expect(payload.allocation).toEqual({ needs: 50, wants: 30, savings: 20 });
    expect(payload.has_onboarded).toBe(true);
    expect(payload.dismissed_version).toBe('1.15.0');
    // camelCase must not leak into DB
    expect(payload.hasOnboarded).toBeUndefined();
    expect(payload.dismissedVersion).toBeUndefined();
  });

  it('throws when upsert returns an error', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: { message: 'RLS violation' } });
    mockFrom.mockReturnValue({ upsert: upsertMock });

    await expect(upsertProfile('uid', { hasOnboarded: true })).rejects.toThrow('RLS violation');
  });

  // ── RS-29: lastArchivedPeriodStart round-trip ─────────────────
  it('RS-29: upsert maps lastArchivedPeriodStart → last_archived_period_start', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: upsertMock });

    await upsertProfile('uid', { lastArchivedPeriodStart: '2026-05-15' });

    const payload = upsertMock.mock.calls[0][0];
    expect(payload.last_archived_period_start).toBe('2026-05-15');
    expect(payload.lastArchivedPeriodStart).toBeUndefined();
  });

  it('RS-29: upsert can clear lastArchivedPeriodStart with null', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: upsertMock });

    await upsertProfile('uid', { lastArchivedPeriodStart: null });

    const payload = upsertMock.mock.calls[0][0];
    expect(payload.last_archived_period_start).toBeNull();
  });

  it('RS-29: upsert omits last_archived_period_start when not provided', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: upsertMock });

    await upsertProfile('uid', { hasOnboarded: true });

    const payload = upsertMock.mock.calls[0][0];
    expect('last_archived_period_start' in payload).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
//  RS-29 — wishlist target_month round-trip
// ─────────────────────────────────────────────────────────────────
describe('db.wishlist — RS-29 target_month', () => {
  beforeEach(() => { mockFrom.mockReset(); });

  it('insert sends target_month when set', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const item = {
      id: 'w1', icon: '📷', name: 'Camera', url: '',
      price: 1600, saved: 0, targetMonth: '2027-03',
    };
    await db.wishlist.insert('uid', item);

    const payload = insertMock.mock.calls[0][0];
    expect(payload.target_month).toBe('2027-03');
    expect(payload.targetMonth).toBeUndefined();
  });

  it('insert sends target_month: null when undefined', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const item = { id: 'w2', icon: '📚', name: 'Book', url: '' };
    await db.wishlist.insert('uid', item);

    const payload = insertMock.mock.calls[0][0];
    expect(payload.target_month).toBeNull();
  });

  it('update sends target_month in the patch object', async () => {
    const eqMock = vi.fn().mockReturnThis();
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock, then: (r: (v: unknown) => void) => r({ error: null }) });
    mockFrom.mockReturnValue({ update: updateMock });

    const item = {
      id: 'w1', icon: '📷', name: 'Camera', url: '',
      price: 1600, saved: 100, targetMonth: '2027-06',
    };
    await db.wishlist.update('uid', item);

    const patch = updateMock.mock.calls[0][0];
    expect(patch.target_month).toBe('2027-06');
  });

  it('fetchAllUserData maps target_month → targetMonth', async () => {
    const profileRow = {
      id: 'uid', allocation: { needs: 50, wants: 30, savings: 20 },
      budget_display_mode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
      pay_start: null, last_archived_period_start: null,
      funds_remaining: 0, funds_remaining_updated: '',
      has_onboarded: false, dismissed_version: null, created_at: '', updated_at: '',
    };
    const wishRow = {
      id: 'w1', user_id: 'uid', icon: '📷', name: 'Camera', url: '',
      price: 1600, saved: 0, target_month: '2027-03',
      created_at: '', updated_at: '',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return makeQuery(profileRow);
      if (table === 'wishlist_items') return makeQuery([wishRow]);
      return makeQuery([]);
    });

    const result = await fetchAllUserData('uid');
    expect(result!.wishlist![0].targetMonth).toBe('2027-03');
  });

  it('fetchAllUserData omits targetMonth when DB column is null', async () => {
    const profileRow = {
      id: 'uid', allocation: { needs: 50, wants: 30, savings: 20 },
      budget_display_mode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
      pay_start: null, last_archived_period_start: null,
      funds_remaining: 0, funds_remaining_updated: '',
      has_onboarded: false, dismissed_version: null, created_at: '', updated_at: '',
    };
    const wishRow = {
      id: 'w2', user_id: 'uid', icon: '📚', name: 'Book', url: '',
      price: null, saved: null, target_month: null,
      created_at: '', updated_at: '',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return makeQuery(profileRow);
      if (table === 'wishlist_items') return makeQuery([wishRow]);
      return makeQuery([]);
    });

    const result = await fetchAllUserData('uid');
    expect(result!.wishlist![0].targetMonth).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────
//  RS-29 — spending_history_periods budgets / spent round-trip
// ─────────────────────────────────────────────────────────────────
describe('db.spendingHistory — RS-29 budgets / spent', () => {
  beforeEach(() => { mockFrom.mockReset(); });

  it('insertPeriod writes budgets and spent JSONB when set', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await db.spendingHistory.insertPeriod('uid', {
      id: 'p1', date: '2026-05-01', total: 100, items: [],
      budgets: { needs: 1000, wants: 600, savings: 400 },
      spent:   { needs: 50, wants: 50 },
    });

    // First call: the period itself
    const periodPayload = insertMock.mock.calls[0][0];
    expect(periodPayload.budgets).toEqual({ needs: 1000, wants: 600, savings: 400 });
    expect(periodPayload.spent).toEqual({ needs: 50, wants: 50 });
  });

  it('insertPeriod writes budgets: null and spent: null when fields are undefined', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await db.spendingHistory.insertPeriod('uid', {
      id: 'p2', date: '2026-05-01', total: 0, items: [],
    });

    const periodPayload = insertMock.mock.calls[0][0];
    expect(periodPayload.budgets).toBeNull();
    expect(periodPayload.spent).toBeNull();
  });

  it('updatePeriodSnapshots writes only the keys in the patch', async () => {
    const eqMock = vi.fn().mockReturnThis();
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock, then: (r: (v: unknown) => void) => r({ error: null }) });
    mockFrom.mockReturnValue({ update: updateMock });

    await db.spendingHistory.updatePeriodSnapshots('uid', 'p1', {
      budgets: { needs: 1000, wants: 600, savings: 400 },
    });

    const patch = updateMock.mock.calls[0][0];
    expect(patch.budgets).toEqual({ needs: 1000, wants: 600, savings: 400 });
    expect('spent' in patch).toBe(false);
  });

  it('updatePeriodSnapshots is a no-op when patch is empty', async () => {
    const updateMock = vi.fn();
    mockFrom.mockReturnValue({ update: updateMock });

    await db.spendingHistory.updatePeriodSnapshots('uid', 'p1', {});

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('fetchAllUserData maps budgets / spent JSONB → typed shape', async () => {
    const profileRow = {
      id: 'uid', allocation: { needs: 50, wants: 30, savings: 20 },
      budget_display_mode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
      pay_start: null, last_archived_period_start: null,
      funds_remaining: 0, funds_remaining_updated: '',
      has_onboarded: false, dismissed_version: null, created_at: '', updated_at: '',
    };
    const periodRow = {
      id: 'p1', user_id: 'uid', date: '2026-05-01', label: null, total: 100,
      budgets: { needs: 1000, wants: 600, savings: 400 },
      spent:   { needs: 50, wants: 50 },
      created_at: '', updated_at: '',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return makeQuery(profileRow);
      if (table === 'spending_history_periods') return makeQuery([periodRow]);
      return makeQuery([]);
    });

    const result = await fetchAllUserData('uid');
    const period = result!.spendingHistory![0];
    expect(period.budgets).toEqual({ needs: 1000, wants: 600, savings: 400 });
    expect(period.spent).toEqual({ needs: 50, wants: 50 });
  });

  it('fetchAllUserData omits budgets / spent when DB columns are null', async () => {
    const profileRow = {
      id: 'uid', allocation: { needs: 50, wants: 30, savings: 20 },
      budget_display_mode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
      pay_start: null, last_archived_period_start: null,
      funds_remaining: 0, funds_remaining_updated: '',
      has_onboarded: false, dismissed_version: null, created_at: '', updated_at: '',
    };
    const periodRow = {
      id: 'p2', user_id: 'uid', date: '2026-04-01', label: null, total: 0,
      budgets: null, spent: null,
      created_at: '', updated_at: '',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return makeQuery(profileRow);
      if (table === 'spending_history_periods') return makeQuery([periodRow]);
      return makeQuery([]);
    });

    const result = await fetchAllUserData('uid');
    const period = result!.spendingHistory![0];
    expect(period.budgets).toBeUndefined();
    expect(period.spent).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────
//  RS-29 — fetchAllUserData maps last_archived_period_start
// ─────────────────────────────────────────────────────────────────
describe('fetchAllUserData — RS-29 profiles.last_archived_period_start', () => {
  beforeEach(() => { mockFrom.mockReset(); });

  it('maps last_archived_period_start → lastArchivedPeriodStart when set', async () => {
    const profileRow = {
      id: 'uid', allocation: { needs: 50, wants: 30, savings: 20 },
      budget_display_mode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
      pay_start: '2026-05-01', last_archived_period_start: '2026-05-15',
      funds_remaining: 0, funds_remaining_updated: '',
      has_onboarded: true, dismissed_version: null, created_at: '', updated_at: '',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return makeQuery(profileRow);
      return makeQuery([]);
    });

    const result = await fetchAllUserData('uid');
    expect(result!.lastArchivedPeriodStart).toBe('2026-05-15');
  });

  it('maps null last_archived_period_start → null (not undefined)', async () => {
    const profileRow = {
      id: 'uid', allocation: { needs: 50, wants: 30, savings: 20 },
      budget_display_mode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
      pay_start: null, last_archived_period_start: null,
      funds_remaining: 0, funds_remaining_updated: '',
      has_onboarded: false, dismissed_version: null, created_at: '', updated_at: '',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return makeQuery(profileRow);
      return makeQuery([]);
    });

    const result = await fetchAllUserData('uid');
    expect(result!.lastArchivedPeriodStart).toBeNull();
  });
});
