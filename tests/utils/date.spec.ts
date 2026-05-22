import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  daysUntil,
  monthlyAmount,
  calculateMonthsBetween,
  toMonthKey,
  toDateKey,
} from '@/utils/date';

describe('daysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-21T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for today', () => {
    expect(daysUntil('2026-05-21')).toBe(0);
  });

  it('returns positive for future dates', () => {
    expect(daysUntil('2026-05-28')).toBe(7);
  });

  it('returns negative for past dates', () => {
    expect(daysUntil('2026-05-14')).toBe(-7);
  });

  it('handles month boundaries', () => {
    expect(daysUntil('2026-06-21')).toBe(31);
  });
});

describe('monthlyAmount', () => {
  it('doubles biweekly items', () => {
    expect(monthlyAmount({ amount: 100, biweekly: true })).toBe(200);
  });

  it('passes monthly items through unchanged', () => {
    expect(monthlyAmount({ amount: 100, biweekly: false })).toBe(100);
  });

  it('treats missing biweekly flag as monthly', () => {
    expect(monthlyAmount({ amount: 100 })).toBe(100);
  });

  it('handles zero amounts', () => {
    expect(monthlyAmount({ amount: 0, biweekly: true })).toBe(0);
  });
});

describe('calculateMonthsBetween', () => {
  it('returns 0 for same month', () => {
    expect(calculateMonthsBetween('2026-05', '2026-05')).toBe(0);
  });

  it('returns positive for end after start', () => {
    expect(calculateMonthsBetween('2026-01', '2026-05')).toBe(4);
  });

  it('returns negative for end before start', () => {
    expect(calculateMonthsBetween('2026-12', '2026-05')).toBe(-7);
  });

  it('handles year boundaries', () => {
    expect(calculateMonthsBetween('2025-10', '2026-03')).toBe(5);
  });

  it('handles multi-year spans', () => {
    expect(calculateMonthsBetween('2025-01', '2027-06')).toBe(29);
  });
});

describe('toMonthKey', () => {
  it('formats YYYY-MM with zero-padded month', () => {
    expect(toMonthKey(new Date(2026, 0, 1))).toBe('2026-01');
    expect(toMonthKey(new Date(2026, 11, 31))).toBe('2026-12');
  });
});

describe('toDateKey', () => {
  it('formats YYYY-MM-DD with zero padding', () => {
    expect(toDateKey(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});
