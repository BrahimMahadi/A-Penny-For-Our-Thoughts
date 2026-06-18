<!--
  Module:   components/sections/BudgetVsActual.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Summary:  Three variance cards (Needs / Wants / Savings) + grouped bar
            chart + variance summary table. Mirrors renderBudgetVsActual().
-->

<script setup lang="ts">
import { computed } from 'vue';
import { useAnalytics } from '@/composables/useAnalytics';
import BudgetVsActualChart from '@/components/charts/BudgetVsActualChart.vue';
import { fmt } from '@/utils/format';

const { currentMonthBudgeted, currentMonthActuals, wantsCategoryActuals } = useAnalytics();

// ─── Category drilldown for Wants ─────────────────────────────────
/** Sorted list of [category, amount] pairs for the current month's wants. */
const wantsCategoryRows = computed(() =>
  Object.entries(wantsCategoryActuals.value)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a),
);

const wantsTotal = computed(() =>
  currentMonthActuals.value.wants,
);

interface VarianceResult {
  dollar:  number;
  percent: number;
  status:  'on-track' | 'caution' | 'over';
}

function calcVariance(budgeted: number, actual: number, key: string): VarianceResult {
  const dollar  = budgeted - actual;      // positive = under budget (good for needs/wants), negative = over
  const percent = budgeted > 0 ? (actual / budgeted) * 100 : 0;
  let status: 'on-track' | 'caution' | 'over';

  if (key === 'savings') {
    // For savings: on-track = actual >= budgeted, caution = 80-99%, over = < 80%
    if (percent >= 100)      status = 'on-track';
    else if (percent >= 80)  status = 'caution';
    else                     status = 'over';
  } else {
    // For needs/wants: on-track = ≤100%, caution = 100-120%, over = >120%
    if (percent <= 100)      status = 'on-track';
    else if (percent <= 120) status = 'caution';
    else                     status = 'over';
  }
  return { dollar, percent, status };
}

const categories = computed(() => [
  { key: 'needs',   label: 'Needs',   color: 'var(--accent-text, var(--accent))' },
  { key: 'wants',   label: 'Wants',   color: 'var(--accent2-text)' },
  { key: 'savings', label: 'Savings', color: 'var(--warn)' },
] as const);

function budgetedFor(key: string): number {
  return currentMonthBudgeted.value[key as keyof typeof currentMonthBudgeted.value] || 0;
}

function actualFor(key: string): number {
  return currentMonthActuals.value[key as keyof typeof currentMonthActuals.value] || 0;
}

function statusColor(status: string): string {
  if (status === 'on-track') return 'var(--accent2-text)';
  if (status === 'caution')  return 'var(--warn)';
  return 'var(--danger)';
}

function statusLabel(status: string): string {
  if (status === 'on-track') return 'On Track';
  if (status === 'caution')  return 'Caution';
  return 'Over';
}
</script>

<template>
  <div class="bva-section">
    <!-- Variance cards -->
    <div class="bva-cards">
      <div
        v-for="cat in categories"
        :key="cat.key"
        class="bva-card"
        :style="{ borderLeft: `4px solid ${statusColor(calcVariance(budgetedFor(cat.key), actualFor(cat.key), cat.key).status)}` }"
      >
        <div class="bva-card__top">
          <span
            class="bva-card__label"
            :style="{ color: cat.color }"
          >{{ cat.label }}</span>
          <span
            class="bva-card__status-chip"
            :style="{
              background: statusColor(calcVariance(budgetedFor(cat.key), actualFor(cat.key), cat.key).status) + '20',
              color: statusColor(calcVariance(budgetedFor(cat.key), actualFor(cat.key), cat.key).status),
            }"
          >
            {{ statusLabel(calcVariance(budgetedFor(cat.key), actualFor(cat.key), cat.key).status) }}
          </span>
        </div>

        <div class="bva-card__row">
          <span class="bva-card__row-label">Budgeted</span>
          <span class="bva-card__row-value">{{ fmt(budgetedFor(cat.key)) }}</span>
        </div>
        <div class="bva-card__row">
          <span class="bva-card__row-label">Actual</span>
          <span class="bva-card__row-value">{{ fmt(actualFor(cat.key)) }}</span>
        </div>
        <div
          class="bva-card__pct"
          :style="{ color: statusColor(calcVariance(budgetedFor(cat.key), actualFor(cat.key), cat.key).status) }"
        >
          {{ calcVariance(budgetedFor(cat.key), actualFor(cat.key), cat.key).percent.toFixed(1) }}% of budget
        </div>
      </div>
    </div>

    <!-- Chart -->
    <BudgetVsActualChart
      :budgeted="currentMonthBudgeted"
      :actuals="currentMonthActuals"
    />

    <!-- Variance summary table -->
    <div class="bva-table-wrap">
      <table class="bva-table">
        <thead>
          <tr class="bva-table__head-row">
            <th class="bva-table__th">
              Category
            </th>
            <th class="bva-table__th bva-table__th--right">
              Budgeted
            </th>
            <th class="bva-table__th bva-table__th--right">
              Actual
            </th>
            <th class="bva-table__th bva-table__th--right">
              Variance
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="cat in categories"
            :key="cat.key"
            class="bva-table__row"
          >
            <td class="bva-table__td">
              {{ cat.label }}
            </td>
            <td class="bva-table__td bva-table__td--right">
              {{ fmt(budgetedFor(cat.key)) }}
            </td>
            <td class="bva-table__td bva-table__td--right bva-table__td--strong">
              {{ fmt(actualFor(cat.key)) }}
            </td>
            <td
              class="bva-table__td bva-table__td--right bva-table__td--strong"
              :style="{ color: statusColor(calcVariance(budgetedFor(cat.key), actualFor(cat.key), cat.key).status) }"
            >
              {{ calcVariance(budgetedFor(cat.key), actualFor(cat.key), cat.key).dollar >= 0 ? '+' : '' }}{{ fmt(calcVariance(budgetedFor(cat.key), actualFor(cat.key), cat.key).dollar) }}
              ({{ calcVariance(budgetedFor(cat.key), actualFor(cat.key), cat.key).percent.toFixed(1) }}%)
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Wants category drilldown (A3) -->
    <div
      v-if="wantsCategoryRows.length > 0"
      class="bva-category-drilldown"
    >
      <div class="bva-drilldown__title">
        Wants by Category
      </div>
      <div class="bva-drilldown__rows">
        <div
          v-for="[cat, amt] in wantsCategoryRows"
          :key="cat"
          class="bva-drilldown__row"
        >
          <span class="bva-drilldown__cat">{{ cat }}</span>
          <div class="bva-drilldown__bar-wrap">
            <div
              class="bva-drilldown__bar"
              :style="{
                width: wantsTotal > 0 ? `${Math.min((amt / wantsTotal) * 100, 100)}%` : '0%',
              }"
            />
          </div>
          <span class="bva-drilldown__amt">{{ fmt(amt) }}</span>
          <span class="bva-drilldown__pct">
            {{ wantsTotal > 0 ? ((amt / wantsTotal) * 100).toFixed(0) : 0 }}%
          </span>
        </div>
      </div>
    </div>

    <!-- Footnote -->
    <p class="bva-note">
      <strong>Note:</strong> Actual values include current period spending and archived spending history for this month.
    </p>
  </div>
</template>

<style scoped>
.bva-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bva-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

@media (max-width: 480px) {
  .bva-cards { grid-template-columns: 1fr; }
}

.bva-card {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.bva-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.bva-card__label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.bva-card__status-chip {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
}

.bva-card__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.bva-card__row-label {
  color: var(--muted);
}

.bva-card__row-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-size: 0.95rem;
}

.bva-card__pct {
  font-size: 0.72rem;
  font-weight: 600;
  margin-top: 2px;
}

/* Table */
.bva-table-wrap {
  overflow-x: auto;
  font-size: 0.8rem;
}

.bva-table {
  width: 100%;
  border-collapse: collapse;
}

.bva-table__head-row {
  border-bottom: 1px solid var(--border);
}

.bva-table__th {
  padding: 6px 0;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-align: left;
}

.bva-table__th--right {
  text-align: right;
}

.bva-table__row {
  border-bottom: 1px solid var(--border-light, var(--border));
}

.bva-table__row:last-child {
  border-bottom: none;
}

.bva-table__td {
  padding: 7px 0;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.bva-table__td--right {
  text-align: right;
}

.bva-table__td--strong {
  font-weight: 700;
}

.bva-note {
  font-size: 0.75rem;
  color: var(--muted);
  padding: 0.5rem 0.75rem;
  background: rgba(139, 149, 173, 0.05);
  border-left: 3px solid var(--border);
  border-radius: 4px;
  margin: 0;
  line-height: 1.5;
}

/* ─── Category drilldown ─────────────────────────────────────── */
.bva-category-drilldown {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.bva-drilldown__title {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid var(--border);
}

.bva-drilldown__rows {
  padding: 0.25rem 0.75rem;
}

.bva-drilldown__row {
  display: grid;
  grid-template-columns: 10rem 1fr auto auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0;
  font-size: 0.8rem;
  border-bottom: 1px solid rgba(42, 48, 65, 0.4);
}

.bva-drilldown__row:last-child {
  border-bottom: none;
}

.bva-drilldown__cat {
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bva-drilldown__bar-wrap {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.bva-drilldown__bar {
  height: 100%;
  background: var(--accent2, #facc15);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.bva-drilldown__amt {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--accent2, #facc15);
  text-align: right;
  white-space: nowrap;
}

.bva-drilldown__pct {
  font-size: 0.72rem;
  color: var(--muted);
  text-align: right;
  width: 2.5rem;
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .bva-drilldown__row {
    grid-template-columns: 1fr auto auto;
  }
  .bva-drilldown__bar-wrap { display: none; }
}
</style>
