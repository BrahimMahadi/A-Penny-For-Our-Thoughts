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
