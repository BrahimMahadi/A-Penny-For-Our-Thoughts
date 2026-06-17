/**
 * Module:   composables/useToday.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (v2.45.1 — BUG-035: reactive "today")
 * Summary:  Component-facing wrapper around the reactive `currentDay` clock
 *           (see lib/clock.ts). Returns the current day as both an ISO string
 *           and a `ComputedRef<Date>`, and ensures the global day-ticker is
 *           running.
 *
 *           Replaces the `const today = new Date()` anti-pattern in components.
 *           Because the returned `today` is reactive, every computed that reads
 *           `today.value` recomputes automatically when the calendar day rolls
 *           over — the hero pay-period window, "due in 7 days", month actuals,
 *           etc. all self-heal across a boundary without a reload (BUG-035).
 *
 * Usage:
 *   const { today, currentDay } = useToday();
 *   const window = computed(() => getPayPeriodForecast(state, 0, today.value));
 */

import { computed, type ComputedRef, type Ref } from 'vue';
import { currentDay, startClock } from '@/lib/clock';
import type { ISODate } from '@/types/budget';

export interface UseToday {
  /** Reactive current calendar day, 'YYYY-MM-DD' (local). */
  currentDay: Ref<ISODate>;
  /** Reactive `Date` at local midnight of the current day. */
  today: ComputedRef<Date>;
}

export function useToday(): UseToday {
  // Idempotent — safe to call from every consumer; the clock starts once.
  startClock();

  const today = computed(() => new Date(currentDay.value + 'T00:00:00'));

  return { currentDay, today };
}
