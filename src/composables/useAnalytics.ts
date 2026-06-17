/**
 * Module:   composables/useAnalytics.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Summary:  Vue composable that wraps the pure calculation helpers
 *           so components don't need to manually pass store state.
 *           Returns reactive computed refs that auto-update when
 *           the budget store changes.
 */

import { computed, type ComputedRef } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useUiStore } from '@/stores/ui';
import { currentDay } from '@/lib/clock';
import {
  getTotalMonthlyIncome,
  getAlloc,
  grandTotal,
  getMonthActuals,
  getMonthBudgeted,
  getNetWorthData,
  getMonthForecast,
  getCalendarDayMap,
  getSixMonthForecast,
  getFilteredSpendingHistory,
  getTopCategories,
  getMonthlyWantsHistory,
  getMomInsights,
  getTriggeredAlerts,
  getGoalProgress,
  getPrevMonthActuals,
  getEnvelopeForecast,
  getSpendingTrend,
  getGoalsTimeline,
  getWantsCategoryActuals,
  getPayPeriodForecast,
  getPayPeriodDayMap,
  type GoalProgress,
  type NetWorthData,
  type MonthForecast,
  type ForecastItem,
  type PayPeriodForecast,
  type PayPeriodForecastItem,
  type SixMonthForecastRow,
  type MonthlyWantsRow,
  type MomInsight,
  type TriggeredAlert,
  type EnvelopeForecast,
  type SpendingTrendRow,
  type GoalTimelineItem,
} from '@/utils/calculations';
import type { Goal, SpendingHistoryPeriod, ISODate } from '@/types/budget';

/**
 * One-stop reactive analytics hook.
 * All values are `computed` refs that auto-update when the budget
 * or UI store mutates.
 */
export function useAnalytics() {
  const budget = useBudgetStore();
  const ui = useUiStore();

  // BUG-035: reactive "today" so every month/period-scoped computed below
  // recomputes when the calendar day rolls over (no reload needed). Reading
  // `currentDay.value` inside a computed registers the reactive dependency.
  const todayDate = computed(() => new Date(currentDay.value + 'T00:00:00'));

  // ─── Income & allocation ─────────────────────────────────────
  const totalMonthlyIncome: ComputedRef<number> = computed(() => getTotalMonthlyIncome(budget.$state));
  const allocationRatios = computed(() => getAlloc(budget.$state));
  const grandTotalExpenses: ComputedRef<number> = computed(() => grandTotal(budget.$state));

  // ─── Budget vs. actual (for current calendar month) ──────────
  const currentMonthActuals = computed(() => {
    const today = todayDate.value;
    return getMonthActuals(budget.$state, today.getFullYear(), today.getMonth() + 1, today);
  });

  const currentMonthBudgeted = computed(() => getMonthBudgeted(budget.$state));

  // ─── Net worth ───────────────────────────────────────────────
  const netWorth: ComputedRef<NetWorthData> = computed(() => getNetWorthData(budget.$state));

  // ─── Recurring forecast — uses UI store's selected month ─────
  const monthForecast: ComputedRef<MonthForecast> = computed(() =>
    getMonthForecast(budget.$state, ui.scheduleViewYear, ui.scheduleViewMonth),
  );

  const calendarDayMap: ComputedRef<Map<number, ForecastItem[]>> = computed(() =>
    getCalendarDayMap(budget.$state, ui.scheduleViewYear, ui.scheduleViewMonth),
  );

  const sixMonthForecast: ComputedRef<SixMonthForecastRow[]> = computed(() =>
    getSixMonthForecast(budget.$state, ui.scheduleViewYear, ui.scheduleViewMonth, 6),
  );

  // ─── Analytics panel (filtered) ──────────────────────────────
  const filteredSpendingHistory: ComputedRef<SpendingHistoryPeriod[]> = computed(() =>
    getFilteredSpendingHistory(budget.$state, ui.analyticsFilters),
  );

  const topCategories: ComputedRef<Array<[string, number]>> = computed(() =>
    getTopCategories(filteredSpendingHistory.value),
  );

  // ─── Month-over-month wants ──────────────────────────────────
  const monthlyWantsHistory: ComputedRef<MonthlyWantsRow[]> = computed(() =>
    getMonthlyWantsHistory(budget.$state, 6),
  );

  const momInsights: ComputedRef<MomInsight[]> = computed(() =>
    getMomInsights(monthlyWantsHistory.value),
  );

  // ─── Budget alerts ───────────────────────────────────────────
  const triggeredAlerts: ComputedRef<TriggeredAlert[]> = computed(() =>
    getTriggeredAlerts(budget.$state),
  );

  // ─── Per-category wants actuals (for BvA drilldown) ─────────
  const wantsCategoryActuals = computed(() => getWantsCategoryActuals(budget.$state, todayDate.value));

  // ─── MoM stat deltas ─────────────────────────────────────────
  const prevMonthActuals = computed(() => getPrevMonthActuals(budget.$state, todayDate.value));

  // ─── Envelope forecast ───────────────────────────────────────
  const envelopeForecast: ComputedRef<EnvelopeForecast> = computed(() =>
    getEnvelopeForecast(budget.$state, todayDate.value),
  );

  // ─── 6-month spending trend ──────────────────────────────────
  const spendingTrend: ComputedRef<SpendingTrendRow[]> = computed(() =>
    getSpendingTrend(budget.$state),
  );

  // ─── Goals timeline ──────────────────────────────────────────
  const goalsTimeline: ComputedRef<GoalTimelineItem[]> = computed(() =>
    getGoalsTimeline(budget.$state),
  );

  // ─── Pay-period forecast ─────────────────────────────────────
  const payPeriodForecast: ComputedRef<PayPeriodForecast | null> = computed(() =>
    getPayPeriodForecast(budget.$state, ui.schedulePayPeriodOffset, todayDate.value),
  );

  const payPeriodDayMap: ComputedRef<Map<ISODate, PayPeriodForecastItem[]>> = computed(() =>
    getPayPeriodDayMap(budget.$state, ui.schedulePayPeriodOffset),
  );

  // ─── Goal progress lookup ────────────────────────────────────
  /** Get progress data for a specific goal (returns null if account missing). */
  function progressForGoal(goal: Goal): GoalProgress | null {
    return getGoalProgress(budget.$state, goal);
  }

  return {
    totalMonthlyIncome,
    allocationRatios,
    grandTotalExpenses,
    currentMonthActuals,
    currentMonthBudgeted,
    wantsCategoryActuals,
    prevMonthActuals,
    envelopeForecast,
    spendingTrend,
    goalsTimeline,
    netWorth,
    monthForecast,
    calendarDayMap,
    sixMonthForecast,
    filteredSpendingHistory,
    topCategories,
    monthlyWantsHistory,
    momInsights,
    triggeredAlerts,
    payPeriodForecast,
    payPeriodDayMap,
    progressForGoal,
  };
}
