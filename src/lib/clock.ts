/**
 * Module:   lib/clock.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (v2.45.1 — BUG-035: reactive "today")
 * Summary:  A single reactive source of truth for the current CALENDAR DAY.
 *
 *           Why this exists
 *           ───────────────
 *           `new Date()` is invisible to Vue's reactivity system. Any computed
 *           or Pinia getter that scopes data to "the current pay period" or
 *           "this month" by calling `new Date()` directly will NOT recompute
 *           when the calendar simply rolls over a boundary — its tracked
 *           reactive deps (store slices) haven't changed, so the cached value
 *           persists with yesterday's date. That left long-lived open tabs
 *           showing the previous period's windfall list and an un-advanced
 *           hero window (BUG-035).
 *
 *           The fix: one module-level reactive `currentDay` ref. Every
 *           date-scoped computed reads it (directly in store getters, or via
 *           the `useToday()` composable in components) and therefore recomputes
 *           the instant the day changes.
 *
 *           The ref is updated by `tickClock()`, fired from:
 *             • a coarse interval (catches midnight while the tab stays open),
 *             • `visibilitychange` → visible (returning to a backgrounded tab),
 *             • `focus` (window regains focus).
 *           `tickClock()` only writes when the day string actually changes, so
 *           dependents don't recompute every interval — only on a real rollover.
 *
 *           Day is computed in LOCAL time to match `getCurrentPeriodStart`,
 *           which compares against local midnight.
 *
 * Usage:
 *   // In a component:
 *   const { today, currentDay } = useToday();   // today: ComputedRef<Date>
 *   // In a store getter / pure module:
 *   import { currentDay } from '@/lib/clock';
 *   const d = new Date(currentDay.value + 'T00:00:00');
 */

import { ref } from 'vue';
import type { ISODate } from '@/types/budget';

/** Local calendar day as 'YYYY-MM-DD' (matches getCurrentPeriodStart's local-midnight basis). */
export function toISODay(d: Date = new Date()): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * The single reactive "today". Read it from any date-scoped computed/getter.
 * Construct a Date when one is needed: `new Date(currentDay.value + 'T00:00:00')`.
 */
export const currentDay = ref<ISODate>(toISODay());

/**
 * Recompute the current day and update `currentDay` ONLY if it changed.
 * Returns true when the day actually rolled over (useful for tests/callers).
 */
export function tickClock(now: Date = new Date()): boolean {
  const day = toISODay(now);
  if (day !== currentDay.value) {
    currentDay.value = day;
    return true;
  }
  return false;
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

/** Coarse poll — 30 s is well under any period/month boundary and cheap. */
const TICK_INTERVAL_MS = 30_000;

let started = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

function onVisibility(): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') tickClock();
}
function onFocus(): void { tickClock(); }

/**
 * Begin keeping `currentDay` in sync with the wall clock. Idempotent — calling
 * it more than once is a no-op, so every `useToday()` consumer can call it
 * freely. The clock runs for the app's lifetime; there is no per-component
 * teardown (a singleton day-ticker has no reason to stop).
 */
export function startClock(): void {
  if (started) return;
  started = true;
  tickClock(); // align immediately on first start
  if (typeof window !== 'undefined') {
    intervalId = setInterval(tickClock, TICK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
  }
}

/**
 * Tear down the clock. Primarily for tests — production never calls this.
 */
export function stopClock(): void {
  if (!started) return;
  started = false;
  if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
  if (typeof window !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', onFocus);
  }
}
