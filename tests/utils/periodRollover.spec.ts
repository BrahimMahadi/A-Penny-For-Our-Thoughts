/**
 * Module:   tests/utils/periodRollover.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint RS-23 — Automatic Pay Period Rollover)
 * Summary:  Pure-function tests for the helpers that drive period rollover:
 *           getCurrentPeriodStart() and getPeriodStartsBetween() from
 *           src/utils/calculations.ts.
 *
 *           These tests deliberately avoid Pinia / Vue / DOM — they only
 *           verify the date arithmetic. The store + composable specs cover
 *           the integration behaviour.
 */

import { describe, it, expect } from 'vitest';
import {
  getCurrentPeriodStart,
  getPeriodStartsBetween,
} from '@/utils/calculations';
import type { BudgetState } from '@/types/state';

/** Build the minimal state slice the period helpers actually read. */
function withPayStart(payStart: string | null): Pick<BudgetState, 'payStart'> {
  return { payStart };
}

// ─────────────────────────────────────────────────────────────────────────────
//  getCurrentPeriodStart
// ─────────────────────────────────────────────────────────────────────────────
describe('getCurrentPeriodStart', () => {
  it('returns null when payStart is null', () => {
    expect(getCurrentPeriodStart(withPayStart(null), new Date('2026-05-15T12:00:00'))).toBeNull();
  });

  it('returns payStart itself when today is the anchor day', () => {
    expect(
      getCurrentPeriodStart(withPayStart('2026-05-01'), new Date('2026-05-01T12:00:00')),
    ).toBe('2026-05-01');
  });

  it('returns payStart when today is before payStart (pre-configured anchor)', () => {
    expect(
      getCurrentPeriodStart(withPayStart('2026-06-01'), new Date('2026-05-15T12:00:00')),
    ).toBe('2026-06-01');
  });

  it('returns payStart when today is within the first period (day 13)', () => {
    expect(
      getCurrentPeriodStart(withPayStart('2026-05-01'), new Date('2026-05-14T12:00:00')),
    ).toBe('2026-05-01');
  });

  it('advances exactly one period at day 14', () => {
    expect(
      getCurrentPeriodStart(withPayStart('2026-05-01'), new Date('2026-05-15T12:00:00')),
    ).toBe('2026-05-15');
  });

  it('advances three periods at day 42 (3 × 14)', () => {
    expect(
      getCurrentPeriodStart(withPayStart('2026-05-01'), new Date('2026-06-12T12:00:00')),
    ).toBe('2026-06-12');
  });

  it('time-of-day in `today` does not affect the result (boundary check at midnight)', () => {
    const a = getCurrentPeriodStart(withPayStart('2026-05-01'), new Date('2026-05-15T00:00:00'));
    const b = getCurrentPeriodStart(withPayStart('2026-05-01'), new Date('2026-05-15T23:59:59'));
    expect(a).toBe(b);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  getPeriodStartsBetween
// ─────────────────────────────────────────────────────────────────────────────
describe('getPeriodStartsBetween', () => {
  it('returns [] when from === to', () => {
    expect(getPeriodStartsBetween('2026-05-01', '2026-05-01')).toEqual([]);
  });

  it('returns [] when from > to', () => {
    expect(getPeriodStartsBetween('2026-05-15', '2026-05-01')).toEqual([]);
  });

  it('returns one start when the window is exactly one period (14 days)', () => {
    expect(getPeriodStartsBetween('2026-05-01', '2026-05-15')).toEqual(['2026-05-01']);
  });

  it('returns two starts when the window spans two periods (28 days)', () => {
    expect(getPeriodStartsBetween('2026-05-01', '2026-05-29')).toEqual([
      '2026-05-01',
      '2026-05-15',
    ]);
  });

  it('returns three starts when the window spans three periods (42 days)', () => {
    expect(getPeriodStartsBetween('2026-05-01', '2026-06-12')).toEqual([
      '2026-05-01',
      '2026-05-15',
      '2026-05-29',
    ]);
  });

  it('handles month-boundary crossings (April → May)', () => {
    expect(getPeriodStartsBetween('2026-04-17', '2026-05-15')).toEqual([
      '2026-04-17',
      '2026-05-01',
    ]);
  });

  it('handles year-boundary crossings (Dec → Jan)', () => {
    expect(getPeriodStartsBetween('2025-12-22', '2026-01-19')).toEqual([
      '2025-12-22',
      '2026-01-05',
    ]);
  });

  it('returns [] on invalid date input', () => {
    expect(getPeriodStartsBetween('not-a-date', '2026-05-15')).toEqual([]);
    expect(getPeriodStartsBetween('2026-05-01', 'not-a-date')).toEqual([]);
  });
});
