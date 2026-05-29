/**
 * Module:   tests/stores/pushUpOptionalFields.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint RS-29 — DB column refresh)
 * Summary:  Unit tests for the one-shot push-up migration that promotes
 *           localStorage-only values for the four optional fields added
 *           in RS-23 / RS-24 / RS-28 up to their newly-minted Supabase
 *           columns when `initStore` first runs after the migration ships.
 *
 *           The helper is exported from src/stores/budget.ts solely so
 *           this spec can exercise the migration paths directly.
 *
 *           Strategy:
 *             • Mock the Supabase client (same pattern as db.spec.ts) so
 *               db.ts function calls flow through controllable spies
 *             • Call `pushUpOptionalFields(userId, localState, data)` with
 *               crafted (localState, data) pairs to exercise each branch
 *             • Assert mutations to `data` (so the subsequent Object.assign
 *               carries the value forward) AND assert the upsert/update
 *               mocks were called with the expected payload
 *
 *           Branches covered (one test per branch + idempotency):
 *             • lastArchivedPeriodStart: local set + remote null  → push up
 *             • lastArchivedPeriodStart: both null                → no-op
 *             • lastArchivedPeriodStart: remote set + local null  → no-op
 *             • lastArchivedPeriodStart: both set                 → no-op (idempotent)
 *             • SpendingHistoryPeriod.budgets:   local-only       → push up
 *             • SpendingHistoryPeriod.spent:     local-only       → push up
 *             • SpendingHistoryPeriod: orphan local period (no match) → ignored
 *             • WishlistItem.targetMonth:        local-only       → push up
 *             • WishlistItem.targetMonth: remote already set       → no-op
 *             • Empty userId / Supabase not configured             → early return
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeBlankState } from '@/stores/budget';
import type { BudgetState } from '@/types/state';

// ─── Mock supabase client (same pattern as tests/lib/db.spec.ts) ────
const { mockFrom, mockIsConfigured } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockIsConfigured: vi.fn(() => true),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
  DEV_USER_ID: 'test-user-uuid',
  isSupabaseConfigured: mockIsConfigured,
}));

// Import AFTER the mock is registered so the test subject sees the spy
import { pushUpOptionalFields } from '@/stores/budget';

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Build a fresh "blank" local state we can selectively populate.
 * `makeBlankState` gives us a real BudgetState with empty collections.
 */
function localState(patch: Partial<BudgetState> = {}): BudgetState {
  return { ...makeBlankState(), ...patch };
}

/**
 * Build a profile-upsert mock that captures the payload.
 * Returns { upsertSpy, attach }: attach() wires it onto mockFrom.
 */
function captureUpsert() {
  const spy = vi.fn().mockResolvedValue({ error: null });
  return {
    spy,
    attach() { mockFrom.mockReturnValue({ upsert: spy }); },
  };
}

/**
 * Build an update-chain mock for the wishlist_items / spending_history_periods
 * paths. Captures the patch payload AND the .eq()-bound id/userId arguments.
 */
function captureUpdate() {
  const updatePayloads: unknown[] = [];
  const eqCalls: Array<[string, string]> = [];
  // Vitest's chainable mock: update().eq().eq() returns a thenable {error:null}
  interface QueryChain {
    eq: (col: string, val: string) => QueryChain;
    then: (resolve: (v: unknown) => void) => void;
  }
  const updateSpy = vi.fn().mockImplementation((patch: unknown) => {
    updatePayloads.push(patch);
    // Two-step construction so `chain.eq` can reference `chain` itself
    // without tripping ts(7022).
    const chain = {} as QueryChain;
    chain.eq = vi.fn((col: string, val: string) => {
      eqCalls.push([col, val]);
      return chain;
    });
    chain.then = (resolve: (v: unknown) => void) => resolve({ error: null });
    return chain;
  });
  return {
    updateSpy,
    payloads: updatePayloads,
    eqCalls,
    attach() { mockFrom.mockReturnValue({ update: updateSpy }); },
  };
}

beforeEach(() => {
  mockFrom.mockReset();
  mockIsConfigured.mockReturnValue(true);
});

// ─────────────────────────────────────────────────────────────────
//  Early-return guards
// ─────────────────────────────────────────────────────────────────
describe('pushUpOptionalFields — guards', () => {
  it('returns immediately when userId is empty (no DB calls)', async () => {
    const local = localState({ lastArchivedPeriodStart: '2026-05-15' });
    const data: Partial<BudgetState> = { lastArchivedPeriodStart: null };

    await pushUpOptionalFields('', local, data);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(data.lastArchivedPeriodStart).toBeNull();
  });

  it('returns immediately when Supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    const local = localState({ lastArchivedPeriodStart: '2026-05-15' });
    const data: Partial<BudgetState> = { lastArchivedPeriodStart: null };

    await pushUpOptionalFields('uid', local, data);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(data.lastArchivedPeriodStart).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────
//  lastArchivedPeriodStart
// ─────────────────────────────────────────────────────────────────
describe('pushUpOptionalFields — lastArchivedPeriodStart', () => {
  it('pushes local value up when DB returns null', async () => {
    const u = captureUpsert();
    u.attach();
    const local = localState({ lastArchivedPeriodStart: '2026-05-15' });
    const data: Partial<BudgetState> = { lastArchivedPeriodStart: null };

    await pushUpOptionalFields('uid', local, data);

    expect(u.spy).toHaveBeenCalledTimes(1);
    const payload = u.spy.mock.calls[0][0];
    expect(payload.last_archived_period_start).toBe('2026-05-15');
    // Also mutates the in-place `data` so the subsequent Object.assign
    // doesn't clobber the value with null.
    expect(data.lastArchivedPeriodStart).toBe('2026-05-15');
  });

  it('is a no-op when both local and DB are null', async () => {
    const u = captureUpsert();
    u.attach();
    const local = localState({ lastArchivedPeriodStart: null });
    const data: Partial<BudgetState> = { lastArchivedPeriodStart: null };

    await pushUpOptionalFields('uid', local, data);

    expect(u.spy).not.toHaveBeenCalled();
    expect(data.lastArchivedPeriodStart).toBeNull();
  });

  it('is a no-op when DB has a value but local is null', async () => {
    const u = captureUpsert();
    u.attach();
    const local = localState({ lastArchivedPeriodStart: null });
    const data: Partial<BudgetState> = { lastArchivedPeriodStart: '2026-05-15' };

    await pushUpOptionalFields('uid', local, data);

    expect(u.spy).not.toHaveBeenCalled();
    // The DB value passes through unmodified — Object.assign will carry it.
    expect(data.lastArchivedPeriodStart).toBe('2026-05-15');
  });

  it('is idempotent — no push when both local and DB are set', async () => {
    const u = captureUpsert();
    u.attach();
    const local = localState({ lastArchivedPeriodStart: '2026-05-15' });
    const data: Partial<BudgetState> = { lastArchivedPeriodStart: '2026-05-29' };

    await pushUpOptionalFields('uid', local, data);

    expect(u.spy).not.toHaveBeenCalled();
    // DB wins (Object.assign behaviour); the local value is silently dropped.
    expect(data.lastArchivedPeriodStart).toBe('2026-05-29');
  });
});

// ─────────────────────────────────────────────────────────────────
//  SpendingHistoryPeriod.budgets / .spent
// ─────────────────────────────────────────────────────────────────
describe('pushUpOptionalFields — SpendingHistoryPeriod.budgets / spent', () => {
  it('pushes local budgets up when remote is null', async () => {
    const upd = captureUpdate();
    upd.attach();

    const local = localState({
      spendingHistory: [{
        id: 'p1', date: '2026-05-01', total: 100, items: [],
        budgets: { needs: 1000, wants: 600, savings: 400 },
      }],
    });
    const data: Partial<BudgetState> = {
      spendingHistory: [{
        id: 'p1', date: '2026-05-01', total: 100, items: [],
      }],
    };

    await pushUpOptionalFields('uid', local, data);

    expect(upd.updateSpy).toHaveBeenCalledTimes(1);
    expect(upd.payloads[0]).toMatchObject({
      budgets: { needs: 1000, wants: 600, savings: 400 },
    });
    expect('spent' in (upd.payloads[0] as object)).toBe(false);
    // Mutates fetched data so it carries forward
    expect(data.spendingHistory![0].budgets).toEqual({ needs: 1000, wants: 600, savings: 400 });
  });

  it('pushes local spent up when remote is null', async () => {
    const upd = captureUpdate();
    upd.attach();

    const local = localState({
      spendingHistory: [{
        id: 'p1', date: '2026-05-01', total: 100, items: [],
        spent: { needs: 25, wants: 75 },
      }],
    });
    const data: Partial<BudgetState> = {
      spendingHistory: [{
        id: 'p1', date: '2026-05-01', total: 100, items: [],
      }],
    };

    await pushUpOptionalFields('uid', local, data);

    expect(upd.updateSpy).toHaveBeenCalledTimes(1);
    expect(upd.payloads[0]).toMatchObject({ spent: { needs: 25, wants: 75 } });
    expect('budgets' in (upd.payloads[0] as object)).toBe(false);
    expect(data.spendingHistory![0].spent).toEqual({ needs: 25, wants: 75 });
  });

  it('pushes both budgets AND spent up in a single update when both missing remotely', async () => {
    const upd = captureUpdate();
    upd.attach();

    const local = localState({
      spendingHistory: [{
        id: 'p1', date: '2026-05-01', total: 100, items: [],
        budgets: { needs: 1000, wants: 600, savings: 400 },
        spent:   { needs: 25, wants: 75 },
      }],
    });
    const data: Partial<BudgetState> = {
      spendingHistory: [{
        id: 'p1', date: '2026-05-01', total: 100, items: [],
      }],
    };

    await pushUpOptionalFields('uid', local, data);

    expect(upd.updateSpy).toHaveBeenCalledTimes(1);
    expect(upd.payloads[0]).toMatchObject({
      budgets: { needs: 1000, wants: 600, savings: 400 },
      spent:   { needs: 25, wants: 75 },
    });
  });

  it('ignores orphan local periods (no matching id in fetched data)', async () => {
    const upd = captureUpdate();
    upd.attach();

    const local = localState({
      spendingHistory: [{
        id: 'orphan', date: '2026-04-01', total: 0, items: [],
        budgets: { needs: 1000, wants: 600, savings: 400 },
      }],
    });
    const data: Partial<BudgetState> = { spendingHistory: [] };

    await pushUpOptionalFields('uid', local, data);

    expect(upd.updateSpy).not.toHaveBeenCalled();
  });

  it('is idempotent — no push when remote already has both snapshots', async () => {
    const upd = captureUpdate();
    upd.attach();

    const local = localState({
      spendingHistory: [{
        id: 'p1', date: '2026-05-01', total: 100, items: [],
        budgets: { needs: 1000, wants: 600, savings: 400 },
        spent:   { needs: 25, wants: 75 },
      }],
    });
    const data: Partial<BudgetState> = {
      spendingHistory: [{
        id: 'p1', date: '2026-05-01', total: 100, items: [],
        budgets: { needs: 1234, wants: 567, savings: 89 },   // different value, intentional
        spent:   { needs: 999, wants: 1 },
      }],
    };

    await pushUpOptionalFields('uid', local, data);

    expect(upd.updateSpy).not.toHaveBeenCalled();
    // Remote values are preserved (would win on Object.assign too)
    expect(data.spendingHistory![0].budgets).toEqual({ needs: 1234, wants: 567, savings: 89 });
  });
});

// ─────────────────────────────────────────────────────────────────
//  WishlistItem.targetMonth
// ─────────────────────────────────────────────────────────────────
describe('pushUpOptionalFields — WishlistItem.targetMonth', () => {
  it('pushes local targetMonth up when remote is null', async () => {
    const upd = captureUpdate();
    upd.attach();

    const local = localState({
      wishlist: [{
        id: 'w1', icon: '📷', name: 'Camera', url: '',
        price: 1600, saved: 100, targetMonth: '2027-03',
      }],
    });
    const data: Partial<BudgetState> = {
      wishlist: [{
        id: 'w1', icon: '📷', name: 'Camera', url: '',
        price: 1600, saved: 100,
      }],
    };

    await pushUpOptionalFields('uid', local, data);

    expect(upd.updateSpy).toHaveBeenCalledTimes(1);
    expect(upd.payloads[0]).toMatchObject({ target_month: '2027-03' });
    expect(data.wishlist![0].targetMonth).toBe('2027-03');
  });

  it('is a no-op when local has no targetMonth', async () => {
    const upd = captureUpdate();
    upd.attach();

    const local = localState({
      wishlist: [{ id: 'w1', icon: '📚', name: 'Book', url: '' }],
    });
    const data: Partial<BudgetState> = {
      wishlist: [{ id: 'w1', icon: '📚', name: 'Book', url: '' }],
    };

    await pushUpOptionalFields('uid', local, data);

    expect(upd.updateSpy).not.toHaveBeenCalled();
  });

  it('is a no-op when remote already has targetMonth (idempotent)', async () => {
    const upd = captureUpdate();
    upd.attach();

    const local = localState({
      wishlist: [{
        id: 'w1', icon: '📷', name: 'Camera', url: '',
        targetMonth: '2027-03',
      }],
    });
    const data: Partial<BudgetState> = {
      wishlist: [{
        id: 'w1', icon: '📷', name: 'Camera', url: '',
        targetMonth: '2027-09', // remote wins, no push
      }],
    };

    await pushUpOptionalFields('uid', local, data);

    expect(upd.updateSpy).not.toHaveBeenCalled();
    expect(data.wishlist![0].targetMonth).toBe('2027-09');
  });

  it('ignores orphan local items (no matching id in fetched data)', async () => {
    const upd = captureUpdate();
    upd.attach();

    const local = localState({
      wishlist: [{
        id: 'orphan', icon: '📷', name: 'Camera', url: '',
        targetMonth: '2027-03',
      }],
    });
    const data: Partial<BudgetState> = { wishlist: [] };

    await pushUpOptionalFields('uid', local, data);

    expect(upd.updateSpy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────
//  Resilience: a single failed write doesn't abort the whole pass
// ─────────────────────────────────────────────────────────────────
describe('pushUpOptionalFields — resilience', () => {
  it('continues with other fields when one DB write fails', async () => {
    // First call (upsertProfile for lastArchivedPeriodStart) rejects.
    // Subsequent calls (wishlist update) should still happen.
    const upsertSpy = vi.fn().mockResolvedValue({ error: { message: 'simulated RLS error' } });
    const wishUpdates: unknown[] = [];
    interface QueryChain {
      eq: (col: string, val: string) => QueryChain;
      then: (resolve: (v: unknown) => void) => void;
    }
    const wishUpdateSpy = vi.fn().mockImplementation((patch: unknown) => {
      wishUpdates.push(patch);
      // Two-step construction so `chain.eq` can reference `chain` without
      // tripping ts(7022) — referenced directly or indirectly in own initializer.
      const chain = {} as QueryChain;
      chain.eq = vi.fn(() => chain);
      chain.then = (resolve: (v: unknown) => void) => resolve({ error: null });
      return chain;
    });

    // Route by table — profiles vs wishlist_items
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles')        return { upsert: upsertSpy };
      if (table === 'wishlist_items')  return { update: wishUpdateSpy };
      return {};
    });

    const local = localState({
      lastArchivedPeriodStart: '2026-05-15',
      wishlist: [{
        id: 'w1', icon: '📷', name: 'Camera', url: '',
        targetMonth: '2027-03',
      }],
    });
    const data: Partial<BudgetState> = {
      lastArchivedPeriodStart: null,
      wishlist: [{ id: 'w1', icon: '📷', name: 'Camera', url: '' }],
    };

    await pushUpOptionalFields('uid', local, data);

    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(wishUpdateSpy).toHaveBeenCalledTimes(1);
    // Even though the upsert failed, the wishlist update still ran.
    expect(wishUpdates[0]).toMatchObject({ target_month: '2027-03' });
  });
});
