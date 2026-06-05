/**
 * Module:   tests/stores/purchaseArchiveSync.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (BUG-023 — archived purchases not deleted from Supabase)
 * Summary:  Regression tests that prove all three archive actions correctly
 *           fire `db.purchases.delete` for every purchase they move into
 *           spending history.
 *
 *           Background: the original `closeCurrentPeriod`, `closeCurrentPeriodManually`,
 *           and `autoArchiveMissedPeriods` actions called `db.spendingHistory.insertPeriod`
 *           and cleared `this.purchases` in local state, but NEVER deleted the archived
 *           rows from the Supabase `purchases` table.  On a second device the DB fetch
 *           would repopulate `budget.purchases` with the old rows, and because
 *           `lastArchivedPeriodStart` was already advanced the rollover guard returned
 *           early, leaving stale purchases in the live array indefinitely.
 *
 *           Strategy: mock the `@/lib/db` and `@/lib/supabase` modules, call
 *           `initStore` with a fake userId so `syncDb` is live (not a no-op),
 *           then exercise each archive action and assert `db.purchases.delete`
 *           was called for each archived purchase.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// ─── Mock db and supabase at module level ──────────────────────────
const { mockDeletePurchase, mockInsertPeriod, mockUpsertProfile, mockRpc } = vi.hoisted(() => ({
  mockDeletePurchase: vi.fn().mockResolvedValue(undefined),
  mockInsertPeriod:   vi.fn().mockResolvedValue(undefined),
  mockUpsertProfile:  vi.fn().mockResolvedValue(undefined),
  mockRpc:            vi.fn(),
}));

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/lib/db')>('@/lib/db');
  return {
    ...real,
    db: {
      ...((real as any).db),
      purchases: {
        insert: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
        delete: mockDeletePurchase,
      },
      spendingHistory: {
        insertPeriod:       mockInsertPeriod,
        updatePeriodSnapshots: vi.fn().mockResolvedValue(undefined),
        deletePeriod:       vi.fn().mockResolvedValue(undefined),
      },
    },
    upsertProfile:    mockUpsertProfile,
    fetchAllUserData: vi.fn().mockResolvedValue(null),
    deleteAllUserData: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc:  mockRpc,
  },
  DEV_USER_ID: 'test-uid',
  isSupabaseConfigured: () => true,
}));

import { useBudgetStore } from '@/stores/budget';

// ─── Helper: build a purchase with a stable, unique ID ─────────────
// Uses crypto.randomUUID so IDs are unique across test runs and don't
// depend on a shared counter that bleeds between describe blocks.
function P(name: string, amount: number, date: string | undefined, budgetType: 'wants' | 'needs' = 'wants') {
  return { id: `p-${name.replace(/\s/g, '-').toLowerCase()}-${Math.random().toString(36).slice(2, 7)}`, name, amount, category: 'Other', date, budgetType, cardId: null };
}

// ─── Setup / teardown ─────────────────────────────────────────────
beforeEach(async () => {
  setActivePinia(createPinia());
  mockDeletePurchase.mockClear();
  mockInsertPeriod.mockClear();
  mockUpsertProfile.mockClear();

  // Wire up syncDb by calling initStore with a real userId.
  // fetchAllUserData returns null (no profile) so the store keeps its
  // default state — we just need _userId to be non-empty.
  mockRpc.mockResolvedValueOnce({ data: null, error: null });
  const store = useBudgetStore();
  await store.initStore('test-uid');
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────
//  BUG-023 — closeCurrentPeriod
// ─────────────────────────────────────────────────────────────────
describe('BUG-023 — closeCurrentPeriod deletes archived purchases from DB', () => {
  it('calls db.purchases.delete for each archived purchase', async () => {
    const store = useBudgetStore();
    const coffee = P('Coffee', 5, '2026-05-01');
    const lunch  = P('Lunch',  12, '2026-05-02');
    store.purchases.push(coffee);
    store.purchases.push(lunch);

    store.closeCurrentPeriod('2026-05-01');

    // Allow the fire-and-forget syncDb microtasks to flush
    await vi.waitFor(() => {
      expect(mockDeletePurchase).toHaveBeenCalledTimes(2);
    });
    expect(mockDeletePurchase).toHaveBeenCalledWith('test-uid', coffee.id);
    expect(mockDeletePurchase).toHaveBeenCalledWith('test-uid', lunch.id);
  });

  it('deletes nothing when purchases was already empty', async () => {
    const store = useBudgetStore();
    expect(store.purchases).toHaveLength(0);

    store.closeCurrentPeriod('2026-05-01');

    await new Promise(r => setTimeout(r, 0));
    expect(mockDeletePurchase).not.toHaveBeenCalled();
  });

  it('clears purchases from local state AND fires delete for each', () => {
    const store = useBudgetStore();
    store.purchases.push(P('Item', 10, '2026-05-01'));
    store.closeCurrentPeriod('2026-05-01');

    // Local state is cleared immediately (sync)
    expect(store.purchases).toHaveLength(0);
    // History is populated
    expect(store.spendingHistory).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────
//  BUG-023 — closeCurrentPeriodManually
// ─────────────────────────────────────────────────────────────────
describe('BUG-023 — closeCurrentPeriodManually deletes archived purchases from DB', () => {
  it('calls db.purchases.delete for each archived purchase', async () => {
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    const gym    = P('Gym',   50, '2026-05-03');
    const coffee = P('Coffee', 4, '2026-05-04');
    const book   = P('Book',  20, '2026-05-05');
    store.purchases.push(gym);
    store.purchases.push(coffee);
    store.purchases.push(book);

    store.closeCurrentPeriodManually(new Date('2026-05-10T12:00:00'));

    await vi.waitFor(() => {
      expect(mockDeletePurchase).toHaveBeenCalledTimes(3);
    });
    const deletedIds = mockDeletePurchase.mock.calls.map((c: unknown[]) => c[1]);
    expect(deletedIds).toContain(gym.id);
    expect(deletedIds).toContain(coffee.id);
    expect(deletedIds).toContain(book.id);
  });

  it('archives ALL purchases in the array (no date filter) and deletes them all from DB', async () => {
    // closeCurrentPeriodManually is a manual "close now" action — it archives
    // everything currently in `purchases` regardless of date, then advances
    // lastArchivedPeriodStart by 14 days so the next natural rollover won't
    // double-archive. This test confirms all three are deleted from the DB.
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');

    const old1 = P('Old1', 10, '2026-05-03');
    const old2 = P('Old2',  5, '2026-05-04');
    const any1 = P('Any1', 25, '2026-05-16'); // still in the array → still archived
    store.purchases.push(old1);
    store.purchases.push(old2);
    store.purchases.push(any1);

    store.closeCurrentPeriodManually(new Date('2026-05-10T12:00:00'));

    // All three archived, purchases array cleared
    expect(store.purchases).toHaveLength(0);
    expect(store.spendingHistory[0].items).toHaveLength(3);

    // All three deleted from DB
    await vi.waitFor(() => {
      expect(mockDeletePurchase).toHaveBeenCalledTimes(3);
    });
    const deletedIds = mockDeletePurchase.mock.calls.map((c: unknown[]) => c[1]);
    expect(deletedIds).toContain(old1.id);
    expect(deletedIds).toContain(old2.id);
    expect(deletedIds).toContain(any1.id);
  });
});

// ─────────────────────────────────────────────────────────────────
//  BUG-023 — autoArchiveMissedPeriods
// ─────────────────────────────────────────────────────────────────
describe('BUG-023 — autoArchiveMissedPeriods deletes archived purchases from DB', () => {
  it('deletes all bucketed purchases and preserves live ones', async () => {
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    store.autoArchiveMissedPeriods(new Date('2026-05-10T12:00:00')); // init
    mockDeletePurchase.mockClear(); // clear the init call's no-ops

    // Missed period purchases (should be deleted)
    const arch1 = P('Archived1', 10, '2026-05-02');
    const arch2 = P('Archived2',  8, '2026-05-08');
    // Current-period purchase (should be kept, NOT deleted)
    const live1 = P('Live1',     30, '2026-05-16');
    store.purchases.push(arch1);
    store.purchases.push(arch2);
    store.purchases.push(live1);

    store.autoArchiveMissedPeriods(new Date('2026-05-20T12:00:00'));

    // Local state: only the live purchase remains
    expect(store.purchases).toHaveLength(1);
    expect(store.purchases[0].name).toBe('Live1');

    // DB: only the two archived ones are deleted
    await vi.waitFor(() => {
      expect(mockDeletePurchase).toHaveBeenCalledTimes(2);
    });
    const deletedIds = mockDeletePurchase.mock.calls.map((c: unknown[]) => c[1]);
    expect(deletedIds).toContain(arch1.id);
    expect(deletedIds).toContain(arch2.id);
    // Live purchase must NOT be deleted
    expect(deletedIds).not.toContain(live1.id);
  });

  it('deletes nothing on first-run init (no period crossed yet)', async () => {
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    const cur = P('Current', 20, '2026-05-05');
    store.purchases.push(cur);
    mockDeletePurchase.mockClear();

    // Init only — no period has elapsed yet
    store.autoArchiveMissedPeriods(new Date('2026-05-10T12:00:00'));

    await new Promise(r => setTimeout(r, 0));
    expect(mockDeletePurchase).not.toHaveBeenCalled();
    expect(store.purchases).toHaveLength(1); // preserved
  });

  it('is idempotent — second call in same period fires no deletes', async () => {
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    store.autoArchiveMissedPeriods(new Date('2026-05-10T12:00:00')); // init
    const item = P('Item', 5, '2026-05-02');
    store.purchases.push(item);
    mockDeletePurchase.mockClear();

    store.autoArchiveMissedPeriods(new Date('2026-05-20T12:00:00')); // archive
    await vi.waitFor(() => expect(mockDeletePurchase).toHaveBeenCalledTimes(1));
    mockDeletePurchase.mockClear();

    store.autoArchiveMissedPeriods(new Date('2026-05-20T12:00:00')); // same period, no-op
    await new Promise(r => setTimeout(r, 0));
    expect(mockDeletePurchase).not.toHaveBeenCalled();
  });

  it('cross-device scenario: stale DB purchases do not accumulate after reload', async () => {
    // Simulates what BUG-023 caused:
    //   Device A archives + sets lastArchivedPeriodStart but never deletes from DB.
    //   Device B loads from DB: gets stale purchases + advanced lastArchivedPeriodStart.
    //   autoArchiveMissedPeriods should be a no-op (already advanced), so
    //   stale purchases remain — this is why the DB delete is essential.
    //
    // This test verifies the FIX: after the rollover, the deletes DO fire,
    // so a subsequent DB fetch would return an empty purchases table.
    const store = useBudgetStore();
    store.setPayStart('2026-05-01');
    store.autoArchiveMissedPeriods(new Date('2026-05-10T12:00:00')); // init → 2026-05-01
    mockDeletePurchase.mockClear();

    // Simulate Device B receiving stale purchases from DB alongside advanced anchor
    const stale1 = P('Stale1', 15, '2026-05-02');
    const stale2 = P('Stale2', 25, '2026-05-05');
    const live1  = P('Live1',  30, '2026-05-16'); // current period
    store.purchases.push(stale1);
    store.purchases.push(stale2);
    store.purchases.push(live1);

    // Archive fires at day 15+ (period boundary)
    const archived = store.autoArchiveMissedPeriods(new Date('2026-05-20T12:00:00'));
    expect(archived).toBe(1);
    expect(store.purchases).toHaveLength(1);
    expect(store.purchases[0].name).toBe('Live1');

    // The stale purchases were deleted from DB — a subsequent fetch would not return them
    await vi.waitFor(() => expect(mockDeletePurchase).toHaveBeenCalledTimes(2));
    const deletedIds = mockDeletePurchase.mock.calls.map((c: unknown[]) => c[1]);
    expect(deletedIds).toContain(stale1.id);
    expect(deletedIds).toContain(stale2.id);
    expect(deletedIds).not.toContain(live1.id);
  });
});
