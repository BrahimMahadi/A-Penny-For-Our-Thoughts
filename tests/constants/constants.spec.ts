/**
 * Module:   tests/constants/constants.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (TECH-DEBT-1 Phase 1)
 * Summary:  Guard tests for the newly centralised constants. These lock the
 *           canonical values AND assert the consumers derive from them, so the
 *           single-source-of-truth drift behind the BUG-023/024/026/032 family
 *           cannot silently return.
 */

import { describe, it, expect } from 'vitest';
import { PERIOD_DAYS, PERIOD_WEEKS, DEFAULT_ALLOCATION } from '@/constants/budget';
import { MONTHS_SHORT, DOW_FULL, DOW_SHORT, DOW_MINI } from '@/constants/datetime';
import { FALLBACK_CATEGORY_NAME, DEFAULT_SPENDING_CATEGORIES } from '@/data/categories';
import { makeDefaultState, makeBlankState } from '@/stores/budget';
import { getPayPeriodForecast } from '@/utils/calculations';
import type { BudgetState } from '@/types/state';

describe('constants/budget', () => {
  it('PERIOD_DAYS is 14 and PERIOD_WEEKS is 2 (bi-weekly cadence)', () => {
    expect(PERIOD_DAYS).toBe(14);
    expect(PERIOD_WEEKS).toBe(2);
    expect(PERIOD_DAYS).toBe(PERIOD_WEEKS * 7);
  });

  it('DEFAULT_ALLOCATION is the 50/30/20 split and sums to 100', () => {
    expect(DEFAULT_ALLOCATION).toEqual({ needs: 50, wants: 30, savings: 20 });
    const sum = DEFAULT_ALLOCATION.needs + DEFAULT_ALLOCATION.wants + DEFAULT_ALLOCATION.savings;
    expect(sum).toBe(100);
  });

  it('the store default state derives its allocation from DEFAULT_ALLOCATION', () => {
    expect(makeDefaultState().allocation).toEqual(DEFAULT_ALLOCATION);
    expect(makeBlankState().allocation).toEqual(DEFAULT_ALLOCATION);
  });

  it('getPayPeriodForecast produces a window exactly PERIOD_DAYS long', () => {
    const state = { ...makeDefaultState(), payStart: '2026-05-01' } as BudgetState;
    const fc = getPayPeriodForecast(state, 0, new Date('2026-05-05T12:00:00'));
    expect(fc).not.toBeNull();
    const start = new Date(fc!.periodStart + 'T00:00:00');
    const end   = new Date(fc!.periodEnd + 'T00:00:00');
    const inclusiveDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    expect(inclusiveDays).toBe(PERIOD_DAYS);
  });
});

describe('constants/datetime', () => {
  it('MONTHS_SHORT has 12 entries, Jan-first', () => {
    expect(MONTHS_SHORT).toHaveLength(12);
    expect(MONTHS_SHORT[0]).toBe('Jan');
    expect(MONTHS_SHORT[11]).toBe('Dec');
  });

  it('weekday arrays have 7 entries, Sunday-first, and align across granularities', () => {
    expect(DOW_FULL).toHaveLength(7);
    expect(DOW_SHORT).toHaveLength(7);
    expect(DOW_MINI).toHaveLength(7);
    expect(DOW_FULL[0]).toBe('Sunday');
    expect(DOW_SHORT[0]).toBe('Sun');
    expect(DOW_MINI[1]).toBe('M'); // Monday
    // Each short label is the prefix of its full name
    DOW_SHORT.forEach((s, i) => expect(DOW_FULL[i].startsWith(s)).toBe(true));
  });
});

describe('data/categories — fallback name', () => {
  it('FALLBACK_CATEGORY_NAME matches the built-in "other" category name', () => {
    const other = DEFAULT_SPENDING_CATEGORIES.find(c => c.id === 'other');
    expect(other).toBeDefined();
    expect(other!.name).toBe(FALLBACK_CATEGORY_NAME);
  });
});
