/**
 * Module:   tests/utils/wishlistTarget.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint RS-28 — Wishlist target month)
 * Summary:  Pure-function tests for the RS-28 helpers added to
 *           src/utils/calculations.ts:
 *             • monthsUntilTarget
 *             • requiredMonthlyRate
 *             • wishlistTargetStatus
 *             • formatTargetMonthLabel
 *
 *           These tests deliberately avoid Vue / DOM / Pinia — they only
 *           verify the date / status arithmetic. The Wishlist.vue component
 *           tests cover the integration behaviour.
 */

import { describe, it, expect } from 'vitest';
import {
  monthsUntilTarget,
  requiredMonthlyRate,
  wishlistTargetStatus,
  formatTargetMonthLabel,
} from '@/utils/calculations';

// Anchor "today" for deterministic month math.
const TODAY = new Date('2026-05-15T12:00:00');

// ─────────────────────────────────────────────────────────────────────────────
//  monthsUntilTarget
// ─────────────────────────────────────────────────────────────────────────────
describe('monthsUntilTarget', () => {
  it('returns null for an empty target', () => {
    expect(monthsUntilTarget('', TODAY)).toBeNull();
  });

  it('returns null for null target', () => {
    expect(monthsUntilTarget(null, TODAY)).toBeNull();
  });

  it('returns null for undefined target', () => {
    expect(monthsUntilTarget(undefined, TODAY)).toBeNull();
  });

  it('returns null for a malformed string', () => {
    expect(monthsUntilTarget('not-a-month', TODAY)).toBeNull();
    expect(monthsUntilTarget('2026', TODAY)).toBeNull();
    expect(monthsUntilTarget('2026-13', TODAY)).toBeNull();
    expect(monthsUntilTarget('2026-00', TODAY)).toBeNull();
  });

  it('returns 0 when target is the same month as today', () => {
    expect(monthsUntilTarget('2026-05', TODAY)).toBe(0);
  });

  it('returns 1 when target is next month', () => {
    expect(monthsUntilTarget('2026-06', TODAY)).toBe(1);
  });

  it('returns 12 when target is exactly one year away', () => {
    expect(monthsUntilTarget('2027-05', TODAY)).toBe(12);
  });

  it('returns a negative number for past targets', () => {
    expect(monthsUntilTarget('2026-04', TODAY)).toBe(-1);
    expect(monthsUntilTarget('2025-05', TODAY)).toBe(-12);
  });

  it('handles year-boundary crossings', () => {
    expect(monthsUntilTarget('2027-01', TODAY)).toBe(8);
    expect(monthsUntilTarget('2025-12', TODAY)).toBe(-5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  requiredMonthlyRate
// ─────────────────────────────────────────────────────────────────────────────
describe('requiredMonthlyRate', () => {
  it('returns null when there is nothing left to save', () => {
    expect(requiredMonthlyRate(0, '2026-12', TODAY)).toBeNull();
    expect(requiredMonthlyRate(-100, '2026-12', TODAY)).toBeNull();
  });

  it('returns null when target is null', () => {
    expect(requiredMonthlyRate(100, null, TODAY)).toBeNull();
  });

  it('returns null when target is in the past', () => {
    expect(requiredMonthlyRate(100, '2026-04', TODAY)).toBeNull();
  });

  it('returns null when target equals current month', () => {
    expect(requiredMonthlyRate(100, '2026-05', TODAY)).toBeNull();
  });

  it('computes the rate for a clean split', () => {
    // 100 over 10 months = 10/mo
    expect(requiredMonthlyRate(100, '2027-03', TODAY)).toBe(10);
  });

  it('rounds UP to the nearest cent to ensure sufficiency', () => {
    // 10 over 3 months = 3.333... → 3.34/mo (rounded up, not banker's)
    expect(requiredMonthlyRate(10, '2026-08', TODAY)).toBe(3.34);
  });

  it('handles 1-month-away targets', () => {
    expect(requiredMonthlyRate(50, '2026-06', TODAY)).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  wishlistTargetStatus
// ─────────────────────────────────────────────────────────────────────────────
describe('wishlistTargetStatus', () => {
  it('returns "complete" when saved >= price', () => {
    expect(wishlistTargetStatus(100, 100, '2027-03', 50, TODAY)).toBe('complete');
    expect(wishlistTargetStatus(100, 150, '2027-03', 50, TODAY)).toBe('complete');
  });

  it('returns "complete" even when no target is set (price is the only signal)', () => {
    expect(wishlistTargetStatus(100, 100, undefined, 50, TODAY)).toBe('complete');
  });

  it('returns "no-target" when there is no price', () => {
    expect(wishlistTargetStatus(undefined, 50, '2027-03', 50, TODAY)).toBe('no-target');
    expect(wishlistTargetStatus(0, 0, '2027-03', 50, TODAY)).toBe('no-target');
  });

  it('returns "no-target" when target month is missing (caller renders default badge)', () => {
    expect(wishlistTargetStatus(100, 10, undefined, 50, TODAY)).toBe('no-target');
    expect(wishlistTargetStatus(100, 10, '', 50, TODAY)).toBe('no-target');
  });

  it('returns "on-track" when current rate beats the deadline', () => {
    // 100 remaining, 10 months until target, 20/mo rate → 5 months to complete < 10 ✓
    expect(wishlistTargetStatus(100, 0, '2027-03', 20, TODAY)).toBe('on-track');
  });

  it('returns "on-track" when monthsAtRate exactly equals monthsUntilTarget', () => {
    // 100 remaining, 10 months away, 10/mo → exactly on pace
    expect(wishlistTargetStatus(100, 0, '2027-03', 10, TODAY)).toBe('on-track');
  });

  it('returns "behind" when current rate misses the deadline', () => {
    // 100 remaining, 10 months away, 5/mo → 20 months to complete > 10
    expect(wishlistTargetStatus(100, 0, '2027-03', 5, TODAY)).toBe('behind');
  });

  it('returns "behind" when monthly savings rate is zero (and not complete)', () => {
    expect(wishlistTargetStatus(100, 50, '2027-03', 0, TODAY)).toBe('behind');
  });

  it('returns "behind" when target is in the past with money still owed', () => {
    expect(wishlistTargetStatus(100, 50, '2026-04', 100, TODAY)).toBe('behind');
  });

  it('returns "behind" when target equals current month with money still owed', () => {
    expect(wishlistTargetStatus(100, 50, '2026-05', 100, TODAY)).toBe('behind');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  formatTargetMonthLabel
// ─────────────────────────────────────────────────────────────────────────────
describe('formatTargetMonthLabel', () => {
  it('returns null for empty / null / undefined input', () => {
    expect(formatTargetMonthLabel('')).toBeNull();
    expect(formatTargetMonthLabel(null)).toBeNull();
    expect(formatTargetMonthLabel(undefined)).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(formatTargetMonthLabel('not-a-month')).toBeNull();
    expect(formatTargetMonthLabel('2026-13')).toBeNull();
    expect(formatTargetMonthLabel('2026-00')).toBeNull();
  });

  it('formats a valid YYYY-MM as "Mon YYYY"', () => {
    // Locale: 'en-CA' is configured inside the helper. Both formats below
    // are commonly observed depending on the runtime — we just check that
    // the month abbreviation and year are present.
    const label = formatTargetMonthLabel('2027-03')!;
    expect(label).toMatch(/Mar/);
    expect(label).toMatch(/2027/);
  });
});
