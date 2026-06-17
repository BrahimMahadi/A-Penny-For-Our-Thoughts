/**
 * Tests for one-time income store state, getters, and actions.
 * Covers: addOneTimeIncome, updateOneTimeIncome, deleteOneTimeIncome,
 *         currentPeriodIncomes, currentPeriodExtraNeeds/Wants/Savings,
 *         currentPeriodWindfallTotal.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBudgetStore } from '@/stores/budget';

// ─── Helpers ─────────────────────────────────────────────────────

/** Anchor: 2026-06-02 (Monday) is our fake pay-period start. */
const PAY_START = '2026-06-02';
/** A date that falls inside the period starting 2026-06-02 */
const IN_PERIOD_DATE = '2026-06-05';
/** A date outside the period (previous period) */
const OUT_OF_PERIOD_DATE = '2026-05-15';

function setupStore(payStart = PAY_START) {
  const budget = useBudgetStore();
  budget.payStart = payStart;
  budget.incomeStreams = [{ id: 'i1', name: 'Job', amount: 2000, biweekly: true }];
  budget.allocation = { needs: 50, wants: 30, savings: 20 };
  return budget;
}

// ─── Tests ────────────────────────────────────────────────────────

describe('one-time income — store actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    // Set system time to a date within the 2026-06-02 period
    vi.setSystemTime(new Date('2026-06-06T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('addOneTimeIncome: adds entry with correct periodStart and generated id', () => {
    const budget = setupStore();
    const entry = budget.addOneTimeIncome({
      label: 'E-transfer from Dad',
      amount: 200,
      date: IN_PERIOD_DATE,
      type: 'gift',
      allocation: { needs: 50, wants: 30, savings: 20 },
    });

    expect(entry.id).toBeTruthy();
    expect(entry.label).toBe('E-transfer from Dad');
    expect(entry.amount).toBe(200);
    expect(entry.periodStart).toBe(PAY_START);
    expect(entry.createdAt).toBeTruthy();
    expect(budget.oneTimeIncomes).toHaveLength(1);
  });

  it('addOneTimeIncome: uses today as periodStart when payStart is null', () => {
    const budget = useBudgetStore();
    budget.payStart = null;
    const entry = budget.addOneTimeIncome({
      label: 'Refund',
      amount: 50,
      date: '2026-06-06',
      type: 'refund',
      allocation: { needs: 0, wants: 100, savings: 0 },
    });
    // When payStart is null, falls back to today's date
    expect(entry.periodStart).toBe('2026-06-06');
  });

  it('updateOneTimeIncome: patches fields on existing entry', () => {
    const budget = setupStore();
    const entry = budget.addOneTimeIncome({
      label: 'Old label',
      amount: 100,
      date: IN_PERIOD_DATE,
      type: 'other',
      allocation: { needs: 50, wants: 30, savings: 20 },
    });

    budget.updateOneTimeIncome(entry.id, { label: 'New label', amount: 150 });

    const updated = budget.oneTimeIncomes.find(i => i.id === entry.id);
    expect(updated?.label).toBe('New label');
    expect(updated?.amount).toBe(150);
    // Other fields are unchanged
    expect(updated?.type).toBe('other');
    expect(updated?.periodStart).toBe(PAY_START);
  });

  it('updateOneTimeIncome: no-op for unknown id', () => {
    const budget = setupStore();
    budget.addOneTimeIncome({
      label: 'Gift',
      amount: 100,
      date: IN_PERIOD_DATE,
      type: 'gift',
      allocation: { needs: 50, wants: 30, savings: 20 },
    });
    // Should not throw
    budget.updateOneTimeIncome('nonexistent-id', { amount: 999 });
    expect(budget.oneTimeIncomes[0].amount).toBe(100);
  });

  it('deleteOneTimeIncome: removes the entry by id', () => {
    const budget = setupStore();
    const e1 = budget.addOneTimeIncome({
      label: 'Bonus',
      amount: 500,
      date: IN_PERIOD_DATE,
      type: 'bonus',
      allocation: { needs: 50, wants: 30, savings: 20 },
    });
    const e2 = budget.addOneTimeIncome({
      label: 'Gift',
      amount: 100,
      date: IN_PERIOD_DATE,
      type: 'gift',
      allocation: { needs: 0, wants: 100, savings: 0 },
    });

    budget.deleteOneTimeIncome(e1.id);

    expect(budget.oneTimeIncomes).toHaveLength(1);
    expect(budget.oneTimeIncomes[0].id).toBe(e2.id);
  });

  it('deleteOneTimeIncome: no-op for unknown id', () => {
    const budget = setupStore();
    budget.addOneTimeIncome({
      label: 'Refund',
      amount: 75,
      date: IN_PERIOD_DATE,
      type: 'refund',
      allocation: { needs: 100, wants: 0, savings: 0 },
    });
    budget.deleteOneTimeIncome('not-a-real-id');
    expect(budget.oneTimeIncomes).toHaveLength(1);
  });
});

describe('one-time income — getters', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-06T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('currentPeriodIncomes: returns [] when payStart is null', () => {
    const budget = useBudgetStore();
    budget.payStart = null;
    expect(budget.currentPeriodIncomes).toHaveLength(0);
  });

  it('currentPeriodIncomes: returns only entries for the current period', () => {
    const budget = setupStore();

    // Current-period entry
    budget.oneTimeIncomes.push({
      id: 'a',
      label: 'In-period gift',
      amount: 100,
      date: IN_PERIOD_DATE,
      type: 'gift',
      allocation: { needs: 50, wants: 30, savings: 20 },
      periodStart: PAY_START,         // current period
      createdAt: new Date().toISOString(),
    });

    // Out-of-period entry
    budget.oneTimeIncomes.push({
      id: 'b',
      label: 'Old freelance',
      amount: 300,
      date: OUT_OF_PERIOD_DATE,
      type: 'freelance',
      allocation: { needs: 50, wants: 30, savings: 20 },
      periodStart: '2026-05-19',      // previous period
      createdAt: new Date().toISOString(),
    });

    expect(budget.currentPeriodIncomes).toHaveLength(1);
    expect(budget.currentPeriodIncomes[0].id).toBe('a');
  });

  it('currentPeriodExtraNeeds: sums needs allocation dollars for current period', () => {
    const budget = setupStore();
    budget.oneTimeIncomes.push({
      id: 'a',
      label: 'Bonus',
      amount: 400,
      date: IN_PERIOD_DATE,
      type: 'bonus',
      allocation: { needs: 50, wants: 30, savings: 20 }, // $200 needs
      periodStart: PAY_START,
      createdAt: new Date().toISOString(),
    });
    budget.oneTimeIncomes.push({
      id: 'b',
      label: 'Old bonus',
      amount: 400,
      date: OUT_OF_PERIOD_DATE,
      type: 'bonus',
      allocation: { needs: 50, wants: 30, savings: 20 },
      periodStart: '2026-05-19',       // previous period — excluded
      createdAt: new Date().toISOString(),
    });

    // Only entry 'a' is in current period: 400 × 50% = 200
    expect(budget.currentPeriodExtraNeeds).toBeCloseTo(200);
  });

  it('currentPeriodExtraWants: sums wants allocation dollars for current period', () => {
    const budget = setupStore();
    budget.oneTimeIncomes.push({
      id: 'a',
      label: 'Gift',
      amount: 200,
      date: IN_PERIOD_DATE,
      type: 'gift',
      allocation: { needs: 0, wants: 100, savings: 0 }, // $200 wants
      periodStart: PAY_START,
      createdAt: new Date().toISOString(),
    });
    expect(budget.currentPeriodExtraWants).toBeCloseTo(200);
  });

  it('currentPeriodExtraSavings: sums savings allocation dollars for current period', () => {
    const budget = setupStore();
    budget.oneTimeIncomes.push({
      id: 'a',
      label: 'Refund',
      amount: 100,
      date: IN_PERIOD_DATE,
      type: 'refund',
      allocation: { needs: 0, wants: 0, savings: 100 }, // $100 savings
      periodStart: PAY_START,
      createdAt: new Date().toISOString(),
    });
    expect(budget.currentPeriodExtraSavings).toBeCloseTo(100);
  });

  it('currentPeriodWindfallTotal: sums all entry amounts for current period', () => {
    const budget = setupStore();
    budget.oneTimeIncomes.push({
      id: 'a', label: 'Gift',     amount: 150, date: IN_PERIOD_DATE, type: 'gift',
      allocation: { needs: 50, wants: 30, savings: 20 }, periodStart: PAY_START,
      createdAt: new Date().toISOString(),
    });
    budget.oneTimeIncomes.push({
      id: 'b', label: 'Bonus',    amount: 350, date: IN_PERIOD_DATE, type: 'bonus',
      allocation: { needs: 50, wants: 30, savings: 20 }, periodStart: PAY_START,
      createdAt: new Date().toISOString(),
    });
    budget.oneTimeIncomes.push({
      id: 'c', label: 'Old sale', amount: 999, date: OUT_OF_PERIOD_DATE, type: 'sale',
      allocation: { needs: 50, wants: 30, savings: 20 }, periodStart: '2026-05-19',
      createdAt: new Date().toISOString(),
    });

    // 150 + 350 = 500 (entry c is from a previous period)
    expect(budget.currentPeriodWindfallTotal).toBeCloseTo(500);
  });

  it('currentPeriodWindfallTotal: returns 0 when no entries', () => {
    const budget = setupStore();
    expect(budget.currentPeriodWindfallTotal).toBe(0);
  });

  it('getters return 0 when payStart is null', () => {
    const budget = useBudgetStore();
    budget.payStart = null;
    budget.oneTimeIncomes.push({
      id: 'a', label: 'Gift', amount: 100, date: '2026-06-06', type: 'gift',
      allocation: { needs: 50, wants: 30, savings: 20 }, periodStart: '2026-06-02',
      createdAt: new Date().toISOString(),
    });
    expect(budget.currentPeriodIncomes).toHaveLength(0);
    expect(budget.currentPeriodExtraNeeds).toBe(0);
    expect(budget.currentPeriodExtraWants).toBe(0);
    expect(budget.currentPeriodExtraSavings).toBe(0);
    expect(budget.currentPeriodWindfallTotal).toBe(0);
  });
});

describe('one-time income — allocation math', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-06T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('100% to wants: needs and savings boosts are 0', () => {
    const budget = setupStore();
    budget.oneTimeIncomes.push({
      id: 'a', label: 'Gift', amount: 300, date: IN_PERIOD_DATE, type: 'gift',
      allocation: { needs: 0, wants: 100, savings: 0 }, periodStart: PAY_START,
      createdAt: new Date().toISOString(),
    });
    expect(budget.currentPeriodExtraNeeds).toBeCloseTo(0);
    expect(budget.currentPeriodExtraWants).toBeCloseTo(300);
    expect(budget.currentPeriodExtraSavings).toBeCloseTo(0);
  });

  it('proportional split: 50/30/20 on $200 gives $100/$60/$40', () => {
    const budget = setupStore();
    budget.oneTimeIncomes.push({
      id: 'a', label: 'Bonus', amount: 200, date: IN_PERIOD_DATE, type: 'bonus',
      allocation: { needs: 50, wants: 30, savings: 20 }, periodStart: PAY_START,
      createdAt: new Date().toISOString(),
    });
    expect(budget.currentPeriodExtraNeeds).toBeCloseTo(100);
    expect(budget.currentPeriodExtraWants).toBeCloseTo(60);
    expect(budget.currentPeriodExtraSavings).toBeCloseTo(40);
  });

  it('multiple entries: boosts accumulate across all current-period entries', () => {
    const budget = setupStore();
    budget.oneTimeIncomes.push(
      { id: 'a', label: 'Gift',     amount: 100, date: IN_PERIOD_DATE, type: 'gift',
        allocation: { needs: 0, wants: 100, savings: 0 }, periodStart: PAY_START,
        createdAt: new Date().toISOString() },
      { id: 'b', label: 'Freelance', amount: 500, date: IN_PERIOD_DATE, type: 'freelance',
        allocation: { needs: 100, wants: 0, savings: 0 }, periodStart: PAY_START,
        createdAt: new Date().toISOString() },
    );
    // wants boost: 100 × 100% = 100; needs boost: 500 × 100% = 500
    expect(budget.currentPeriodExtraNeeds).toBeCloseTo(500);
    expect(budget.currentPeriodExtraWants).toBeCloseTo(100);
    expect(budget.currentPeriodExtraSavings).toBeCloseTo(0);
  });
});

// ─────────────────────────────────────────────────────────────────
//  income stream ordering (v2.41.0)
// ─────────────────────────────────────────────────────────────────

describe('income stream ordering', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  // ─── orderedIncomeStreams getter ─────────────────────────────────

  it('orderedIncomeStreams: returns insertion order when incomeStreamOrder is empty', () => {
    const budget = useBudgetStore();
    budget.incomeStreams = [
      { id: 'a', name: 'Job A', amount: 1000, biweekly: false },
      { id: 'b', name: 'Job B', amount: 2000, biweekly: true },
      { id: 'c', name: 'Job C', amount: 500,  biweekly: false },
    ];
    budget.incomeStreamOrder = [];
    expect(budget.orderedIncomeStreams.map(s => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('orderedIncomeStreams: sorts by incomeStreamOrder when set', () => {
    const budget = useBudgetStore();
    budget.incomeStreams = [
      { id: 'a', name: 'Job A', amount: 1000, biweekly: false },
      { id: 'b', name: 'Job B', amount: 2000, biweekly: true },
      { id: 'c', name: 'Job C', amount: 500,  biweekly: false },
    ];
    budget.incomeStreamOrder = ['c', 'a', 'b'];
    expect(budget.orderedIncomeStreams.map(s => s.id)).toEqual(['c', 'a', 'b']);
  });

  it('orderedIncomeStreams: items not in order array sort to the end', () => {
    const budget = useBudgetStore();
    budget.incomeStreams = [
      { id: 'a', name: 'Job A', amount: 1000, biweekly: false },
      { id: 'b', name: 'Job B', amount: 2000, biweekly: true },
      { id: 'c', name: 'Job C', amount: 500,  biweekly: false },
    ];
    // 'b' is missing from order — it should sort after 'a' and 'c'
    budget.incomeStreamOrder = ['c', 'a'];
    const ids = budget.orderedIncomeStreams.map(s => s.id);
    expect(ids[0]).toBe('c');
    expect(ids[1]).toBe('a');
    expect(ids[2]).toBe('b');
  });

  it('orderedIncomeStreams: does not mutate incomeStreams source array', () => {
    const budget = useBudgetStore();
    budget.incomeStreams = [
      { id: 'a', name: 'Job A', amount: 1000, biweekly: false },
      { id: 'b', name: 'Job B', amount: 2000, biweekly: true },
    ];
    budget.incomeStreamOrder = ['b', 'a'];
    // consume the getter (triggers the sort on a copy)
    const _result = budget.orderedIncomeStreams;
    // original array must remain in insertion order
    expect(budget.incomeStreams.map(s => s.id)).toEqual(['a', 'b']);
  });

  // ─── reorderIncomeStreams action ─────────────────────────────────

  it('reorderIncomeStreams: updates incomeStreamOrder in the store', () => {
    const budget = useBudgetStore();
    budget.incomeStreams = [
      { id: 'x', name: 'X', amount: 100, biweekly: false },
      { id: 'y', name: 'Y', amount: 200, biweekly: false },
      { id: 'z', name: 'Z', amount: 300, biweekly: false },
    ];
    budget.reorderIncomeStreams(['z', 'x', 'y']);
    expect(budget.incomeStreamOrder).toEqual(['z', 'x', 'y']);
  });

  it('reorderIncomeStreams: immediately reflected in orderedIncomeStreams getter', () => {
    const budget = useBudgetStore();
    budget.incomeStreams = [
      { id: 'x', name: 'X', amount: 100, biweekly: false },
      { id: 'y', name: 'Y', amount: 200, biweekly: false },
    ];
    budget.reorderIncomeStreams(['y', 'x']);
    expect(budget.orderedIncomeStreams.map(s => s.id)).toEqual(['y', 'x']);
  });

  // ─── deleteIncomeStream cleans up order array ────────────────────

  it('deleteIncomeStream: removes deleted id from incomeStreamOrder', () => {
    const budget = useBudgetStore();
    budget.incomeStreams = [
      { id: 'a', name: 'A', amount: 100, biweekly: false },
      { id: 'b', name: 'B', amount: 200, biweekly: false },
      { id: 'c', name: 'C', amount: 300, biweekly: false },
    ];
    budget.incomeStreamOrder = ['b', 'a', 'c'];
    budget.deleteIncomeStream('a');
    expect(budget.incomeStreamOrder).not.toContain('a');
    expect(budget.incomeStreamOrder).toEqual(['b', 'c']);
  });
});

// ─────────────────────────────────────────────────────────────────
//  BUG-035 — windfall list resets when the pay period rolls over
// ─────────────────────────────────────────────────────────────────
// This is the regression test that would have caught the reported bug:
// `currentPeriodIncomes` must recompute when the calendar crosses a period
// boundary. Before the reactive-clock fix it read a bare `new Date()` inside a
// cached getter and stayed stranded on the previous period's windfalls until
// some unrelated store mutation happened to invalidate the cache.
describe('BUG-035 — currentPeriodIncomes self-heals across a period boundary', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('drops a previous-period windfall once the clock advances to the next period', () => {
    // Period A starts 2026-06-02; today is inside it.
    vi.setSystemTime(new Date('2026-06-06T10:00:00')); // patched in setup.ts → ticks the clock
    const budget = setupStore();

    const entry = budget.addOneTimeIncome({
      label: 'Quebec Stimmy', amount: 100, type: 'other',
      date: '2026-06-10',
      allocation: { needs: 0, wants: 100, savings: 0 },
    });
    expect(entry.periodStart).toBe('2026-06-02');
    expect(budget.currentPeriodIncomes).toHaveLength(1);
    expect(budget.currentPeriodWindfallTotal).toBe(100);

    // Advance the wall clock into Period B (starts 2026-06-16). No store mutation.
    vi.setSystemTime(new Date('2026-06-17T10:00:00'));

    // The getter must now reflect the NEW period — the Period-A windfall is gone.
    expect(budget.currentPeriodIncomes).toHaveLength(0);
    expect(budget.currentPeriodWindfallTotal).toBe(0);
    expect(budget.currentPeriodExtraWants).toBe(0);

    // The entry still exists in state — it's filtered out, not deleted.
    expect(budget.oneTimeIncomes).toHaveLength(1);
  });

  it('a windfall logged in the new period shows after the boundary', () => {
    vi.setSystemTime(new Date('2026-06-06T10:00:00'));
    const budget = setupStore();
    budget.addOneTimeIncome({
      label: 'Period A gift', amount: 50, type: 'gift',
      date: '2026-06-07', allocation: { needs: 0, wants: 100, savings: 0 },
    });

    // Cross into Period B and log a fresh windfall there.
    vi.setSystemTime(new Date('2026-06-17T10:00:00'));
    const refund = budget.addOneTimeIncome({
      label: 'Refund', amount: 30, type: 'refund',
      date: '2026-06-18', allocation: { needs: 0, wants: 100, savings: 0 },
    });
    expect(refund.periodStart).toBe('2026-06-16');

    const ids = budget.currentPeriodIncomes.map(i => i.label);
    expect(ids).toEqual(['Refund']);          // only the Period B entry
    expect(budget.currentPeriodWindfallTotal).toBe(30);
  });
});
