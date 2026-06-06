/**
 * Module:   constants/frequency.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (TECH-DEBT-1 Phase 2 — domain consolidation)
 * Summary:  Recurring-frequency rate maps and display labels. Previously these
 *           lived inline in Subscriptions.vue (with Loans.vue keeping its own
 *           partial copy of the display labels), risking drift. Centralised so
 *           any view that renders or costs a recurring item shares one source.
 */

import type { Frequency } from '@/types/budget';

/**
 * Multiplier to convert one charge at the given frequency into a MONTHLY cost.
 * `custom-days` is variable (depends on how many weekdays are selected) so it
 * carries a per-occurrence sentinel of 1 — real cost is derived via the
 * weekday-average helpers below.
 */
export const MO_RATE: Record<Frequency, number> = {
  weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 1 / 3, biyearly: 1 / 6, yearly: 1 / 12, 'custom-days': 1,
};

/** Multiplier to convert one charge at the given frequency into an ANNUAL cost. */
export const YR_RATE: Record<Frequency, number> = {
  weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, biyearly: 2, yearly: 1, 'custom-days': 1,
};

/** Compact suffix shown after an amount, e.g. "$18.00/mo". */
export const FREQ_LABEL: Record<Frequency, string> = {
  weekly: '/wk', biweekly: '/2wk', monthly: '/mo', quarterly: '/qtr', biyearly: '/6mo', yearly: '/yr', 'custom-days': '/day',
};

/** Human-readable frequency name for dropdowns. */
export const FREQ_DISPLAY: Record<Frequency, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', biyearly: 'Every 6 months', yearly: 'Yearly',
  biweekly: 'Bi-weekly', weekly: 'Weekly', 'custom-days': 'Custom days',
};

/** Average days in a year (accounts for leap years). */
export const DAYS_PER_YEAR = 365.25;

/**
 * Average number of times a single weekday (e.g. "every Monday") occurs in a
 * month: 365.25 / 12 / 7 ≈ 4.348. Used to cost `custom-days` subscriptions.
 */
export const AVG_WEEKDAY_OCCURRENCES_PER_MONTH = DAYS_PER_YEAR / 12 / 7;

/**
 * Average number of times a single weekday occurs in a year: 365.25 / 7 ≈ 52.18.
 */
export const AVG_WEEKDAY_OCCURRENCES_PER_YEAR = DAYS_PER_YEAR / 7;
