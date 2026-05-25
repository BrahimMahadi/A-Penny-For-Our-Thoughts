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
    expect((p as Record<string, unknown>)['card_id']).toBeUndefined();
    expect((p as Record<string, unknown>)['budget_type']).toBeUndefined();
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
    expect((sub as Record<string, unknown>)['days_of_week']).toBeUndefined();
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
});
