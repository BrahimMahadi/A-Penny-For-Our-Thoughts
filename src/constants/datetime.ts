/**
 * Module:   constants/datetime.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (TECH-DEBT-1 Phase 1 — single source of truth)
 * Summary:  Shared calendar label arrays. Previously duplicated across
 *           Subscriptions.vue, RecurringCalendar.vue, and SpendingPage.vue,
 *           which risked formatting drift between views.
 *
 *           Index convention matches JS `Date`: 0 = January / Sunday.
 */

/** Abbreviated month names, indexed 0 (Jan) – 11 (Dec). */
export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Full weekday names, indexed 0 (Sunday) – 6 (Saturday). */
export const DOW_FULL = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;

/** Abbreviated weekday names, indexed 0 (Sun) – 6 (Sat). */
export const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Single-letter weekday labels, indexed 0 (S) – 6 (S). */
export const DOW_MINI = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
