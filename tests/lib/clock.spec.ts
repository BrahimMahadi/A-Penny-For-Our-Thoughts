/**
 * Module:   tests/lib/clock.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (v2.45.1 — BUG-035)
 * Summary:  Unit tests for the reactive day-clock that backs every
 *           date-scoped computed/getter. Verifies toISODay formatting,
 *           tickClock's change-only write semantics, and startClock/stopClock
 *           lifecycle.
 *
 *           NOTE: tests/setup.ts patches vi.setSystemTime to call tickClock,
 *           so here we drive tickClock directly with explicit Dates to test it
 *           in isolation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { currentDay, toISODay, tickClock, startClock, stopClock } from '@/lib/clock';

describe('lib/clock — toISODay', () => {
  it('formats a Date as a local YYYY-MM-DD string', () => {
    expect(toISODay(new Date(2026, 5, 17))).toBe('2026-06-17'); // month is 0-indexed (June)
  });

  it('zero-pads single-digit months and days', () => {
    expect(toISODay(new Date(2026, 0, 3))).toBe('2026-01-03');
  });
});

describe('lib/clock — tickClock', () => {
  beforeEach(() => {
    // Baseline the ref to a known day before each test.
    tickClock(new Date(2026, 0, 1, 12, 0, 0));
  });

  it('updates currentDay and returns true when the day changes', () => {
    const changed = tickClock(new Date(2026, 0, 2, 9, 0, 0));
    expect(changed).toBe(true);
    expect(currentDay.value).toBe('2026-01-02');
  });

  it('does not write and returns false when the day is unchanged', () => {
    tickClock(new Date(2026, 0, 2, 9, 0, 0));
    const before = currentDay.value;
    // Same calendar day, different time of day → no change.
    const changed = tickClock(new Date(2026, 0, 2, 23, 59, 0));
    expect(changed).toBe(false);
    expect(currentDay.value).toBe(before);
  });

  it('crosses a pay-period-sized gap correctly', () => {
    tickClock(new Date(2026, 5, 2));   // Jun 2
    expect(currentDay.value).toBe('2026-06-02');
    tickClock(new Date(2026, 5, 16));  // Jun 16 — next bi-weekly anchor
    expect(currentDay.value).toBe('2026-06-16');
  });
});

describe('lib/clock — startClock / stopClock lifecycle', () => {
  afterEach(() => {
    stopClock();
    vi.useRealTimers();
  });

  it('startClock is idempotent and syncs the day on first start', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 9, 8, 0, 0)); // Aug 9
    startClock();
    expect(currentDay.value).toBe('2026-08-09');
    // Calling again must not throw or double-register.
    expect(() => startClock()).not.toThrow();
  });

  it('ticks on the interval as wall-clock time advances past midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 9, 23, 59, 30));
    startClock();
    expect(currentDay.value).toBe('2026-08-09');
    // Advance the fake clock past midnight WITHOUT a second setSystemTime, so the
    // day change is detected by the polling interval (not the patched setter).
    vi.advanceTimersByTime(60_000);
    expect(currentDay.value).toBe('2026-08-10');
  });

  it('stopClock halts further interval ticks', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 9, 12, 0, 0));
    startClock();
    stopClock();
    // Advance two full days; with the interval cleared, nothing re-reads the clock.
    vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);
    expect(currentDay.value).toBe('2026-08-09');
  });
});
