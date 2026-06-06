/**
 * Module:   constants/budget.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (TECH-DEBT-1 Phase 1 — single source of truth)
 * Summary:  Core budgeting constants. Centralised so the bi-weekly period
 *           length and the default 50/30/20 allocation have ONE definition
 *           — eliminating the drift risk behind the BUG-023/024/026/032 family.
 */

import type { BudgetAllocation } from '@/types/budget';

/**
 * Length of one pay period, in days. The app is built around a bi-weekly
 * (14-day) cadence. Every period-window calculation must derive from this
 * rather than re-literalising `14`.
 */
export const PERIOD_DAYS = 14;

/** Pay period length in weeks (bi-weekly). */
export const PERIOD_WEEKS = 2;

/**
 * Default budget split as integer percentages summing to 100.
 * The canonical 50/30/20 (needs / wants / savings) rule.
 * Spread into a fresh object at each use site so callers never share a ref.
 */
export const DEFAULT_ALLOCATION: Readonly<BudgetAllocation> = Object.freeze({
  needs: 50,
  wants: 30,
  savings: 20,
});

// ─── Status thresholds (TECH-DEBT-1 Phase 2) ─────────────────────
// Behaviour-defining cutoffs for the on-track / caution / over status used by
// variance, the bi-weekly envelope forecast, and the subscription budget bar.
// Centralised so the boundaries have one definition instead of magic numbers.

/** calculateVariance: spend above this % of budget is "over". */
export const VARIANCE_OVER_PCT = 110;
/** calculateVariance: spend above this % (but ≤ OVER) is "caution". */
export const VARIANCE_CAUTION_PCT = 100;

/**
 * Envelope/period forecast: projected spend at or above this fraction of the
 * budget (but below 100%) is "caution"; at/above the budget itself is "over".
 */
export const ENVELOPE_CAUTION_RATIO = 0.9;

/** Subscriptions budget bar: wants-% above this is "over" (danger). */
export const SUB_BUDGET_OVER_PCT = 60;
/** Subscriptions budget bar: wants-% above this (but ≤ OVER) is "caution". */
export const SUB_BUDGET_CAUTION_PCT = 30;
