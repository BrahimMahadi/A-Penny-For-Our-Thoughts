<!--
  Module:   components/sections/SpendingAnalytics.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Summary:  Collapsible analytics panel. 4 stat cards, date/keyword
            filters, spending-over-time line chart, top-categories bar
            chart, MoM section with trend chart and insights, and a
            history list. Mirrors renderSpendingAnalytics() + renderMomSection().
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUiStore } from '@/stores/ui';
import { useAnalytics } from '@/composables/useAnalytics';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import AnalyticsLine from '@/components/charts/AnalyticsLine.vue';
import AnalyticsBar from '@/components/charts/AnalyticsBar.vue';
import MoMTrend from '@/components/charts/MoMTrend.vue';
import { fmt } from '@/utils/format';

const ui     = useUiStore();
const budget = useBudgetStore();
const toast  = useToast();

const {
  filteredSpendingHistory,
  topCategories,
  monthlyWantsHistory,
  momInsights,
  totalMonthlyIncome,
} = useAnalytics();

// ─── Filter state ─────────────────────────────────────────────────
const filterStart  = ref(ui.analyticsFilters.startDate);
const filterEnd    = ref(ui.analyticsFilters.endDate);
const filterSearch = ref(ui.analyticsFilters.search);

function applyFilters(): void {
  ui.setAnalyticsFilters({
    startDate: filterStart.value,
    endDate:   filterEnd.value,
    search:    filterSearch.value,
  });
}

function clearFilters(): void {
  filterStart.value  = '';
  filterEnd.value    = '';
  filterSearch.value = '';
  ui.clearAnalyticsFilters();
}

const hasActiveFilters = computed(() =>
  !!(ui.analyticsFilters.startDate || ui.analyticsFilters.endDate || ui.analyticsFilters.search),
);

// ─── Aggregate stats ──────────────────────────────────────────────
const allTimeTotal = computed(() =>
  filteredSpendingHistory.value.reduce((s, p) => s + p.total, 0),
);
const avgPerPeriod = computed(() =>
  filteredSpendingHistory.value.length > 0
    ? allTimeTotal.value / filteredSpendingHistory.value.length
    : 0,
);
const largestPurchase = computed(() => {
  let max = 0;
  for (const period of filteredSpendingHistory.value) {
    for (const item of period.items || []) {
      if (+item.amount > max) max = +item.amount;
    }
  }
  return max;
});

// ─── MoM stats ────────────────────────────────────────────────────
const wantsBudget = computed(() =>
  totalMonthlyIncome.value * (budget.allocation.wants / 100),
);

const momCurrent  = computed(() => monthlyWantsHistory.value[monthlyWantsHistory.value.length - 1]);
const momPrevious = computed(() => monthlyWantsHistory.value[monthlyWantsHistory.value.length - 2]);

const momDelta = computed(() => {
  if (!momPrevious.value || momPrevious.value.total === 0) return null;
  return momCurrent.value.total - momPrevious.value.total;
});

const momDeltaPct = computed(() => {
  if (momDelta.value === null || !momPrevious.value?.total) return null;
  return (momDelta.value / momPrevious.value.total) * 100;
});

// ─── History delete ───────────────────────────────────────────────
function deleteHistoryPeriod(id: string): void {
  if (!window.confirm('Delete this entire spending period?')) return;
  budget.spendingHistory = budget.spendingHistory.filter(p => p.id !== id);
  toast.show('Period deleted.', 'success');
}

// ─── Panel toggle ─────────────────────────────────────────────────
const panelOpen = computed(() => ui.analyticsPanelOpen);

function togglePanel(): void {
  ui.toggleAnalyticsPanel();
}

// ─── Insight icon map ─────────────────────────────────────────────
const iconMap: Record<string, string> = { good: '✅', warn: '⚠️', info: '📊' };
</script>

<template>
  <div class="analytics-section">
    <!-- Toggle button -->
    <BaseButton
      variant="secondary"
      @click="togglePanel"
    >
      📊 {{ panelOpen ? 'Hide' : 'Show' }} Spending Analytics
    </BaseButton>

    <!-- Panel content -->
    <div
      v-if="panelOpen"
      class="analytics-panel"
    >
      <!-- Filters -->
      <div class="analytics-filters">
        <div class="filter-group">
          <label
            class="filter-label"
            for="af-start"
          >From</label>
          <input
            id="af-start"
            v-model="filterStart"
            class="filter-input"
            type="date"
            @change="applyFilters"
          >
        </div>
        <div class="filter-group">
          <label
            class="filter-label"
            for="af-end"
          >To</label>
          <input
            id="af-end"
            v-model="filterEnd"
            class="filter-input"
            type="date"
            @change="applyFilters"
          >
        </div>
        <div class="filter-group filter-search">
          <label
            class="filter-label"
            for="af-search"
          >Search</label>
          <input
            id="af-search"
            v-model="filterSearch"
            class="filter-input"
            type="text"
            placeholder="Filter by name…"
            @input="applyFilters"
          >
        </div>
        <BaseButton
          v-if="hasActiveFilters"
          size="sm"
          variant="secondary"
          class="filter-clear"
          @click="clearFilters"
        >
          Clear
        </BaseButton>
      </div>

      <!-- 4 stat cards -->
      <div class="analytics-stats">
        <div class="analytics-stat-card">
          <div class="analytics-stat-label">
            Periods Tracked
            <span
              v-if="hasActiveFilters"
              class="filter-indicator"
            >ℹ Filters Active</span>
          </div>
          <div class="analytics-stat-value">
            {{ filteredSpendingHistory.length }}
          </div>
        </div>
        <div class="analytics-stat-card">
          <div class="analytics-stat-label">
            Filtered Total
          </div>
          <div class="analytics-stat-value">
            {{ fmt(allTimeTotal) }}
          </div>
        </div>
        <div class="analytics-stat-card">
          <div class="analytics-stat-label">
            Avg / Period
          </div>
          <div class="analytics-stat-value">
            {{ fmt(avgPerPeriod) }}
          </div>
        </div>
        <div class="analytics-stat-card">
          <div class="analytics-stat-label">
            Largest Purchase
          </div>
          <div class="analytics-stat-value">
            {{ fmt(largestPurchase) }}
          </div>
        </div>
      </div>

      <!-- Spending over time line chart -->
      <div class="analytics-chart-section">
        <div class="analytics-chart-title">
          Spending Over Time
        </div>
        <AnalyticsLine :history="filteredSpendingHistory" />
        <EmptyState
          v-if="filteredSpendingHistory.length === 0"
          icon="📈"
          title="No history yet"
          hint="Close your first bi-weekly period to see spending trends."
        />
      </div>

      <!-- Top categories bar chart -->
      <div class="analytics-chart-section">
        <div class="analytics-chart-title">
          Top Categories
        </div>
        <AnalyticsBar :top-categories="topCategories" />
        <EmptyState
          v-if="topCategories.length === 0"
          icon="🏷"
          title="No category data"
          hint="Add categorized purchases to see your top spending areas."
        />
      </div>

      <!-- Month-over-Month section -->
      <div class="mom-section">
        <div class="mom-section__title">
          Month-over-Month Wants
        </div>

        <!-- MoM stat cards -->
        <div class="analytics-stats">
          <div class="analytics-stat-card">
            <div class="analytics-stat-label">
              This Month
            </div>
            <div class="analytics-stat-value">
              {{ momCurrent?.total > 0 ? fmt(momCurrent.total) : '—' }}
            </div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-label">
              Last Month
            </div>
            <div class="analytics-stat-value">
              {{ momPrevious?.total > 0 ? fmt(momPrevious.total) : '—' }}
            </div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-label">
              MoM Change
            </div>
            <div class="analytics-stat-value">
              <span
                v-if="momDelta !== null"
                :class="momDelta >= 0 ? 'mom-over' : 'mom-good'"
              >
                {{ momDelta >= 0 ? '▲' : '▼' }}
                {{ momDelta >= 0 ? '+' : '' }}{{ fmt(momDelta) }}
                ({{ momDeltaPct !== null ? momDeltaPct.toFixed(1) : '0.0' }}%)
              </span>
              <span
                v-else
                class="mom-muted"
              >No prior data</span>
            </div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-label">
              Wants Budget
            </div>
            <div class="analytics-stat-value">
              {{ fmt(wantsBudget) }}
            </div>
          </div>
        </div>

        <!-- MoM Trend chart -->
        <MoMTrend
          :monthly-data="monthlyWantsHistory"
          :wants-budget="wantsBudget"
        />

        <!-- Insights -->
        <div
          v-if="momInsights.length > 0"
          class="mom-insights"
        >
          <ul class="mom-insights__list">
            <li
              v-for="(insight, i) in momInsights"
              :key="i"
              class="mom-insight-item"
              :class="`mom-insight-item--${insight.type}`"
            >
              <span class="mom-insight-icon">{{ iconMap[insight.type] }}</span>
              <span class="mom-insight-text">{{ insight.text }}</span>
            </li>
          </ul>
        </div>
        <p
          v-else
          class="mom-no-data"
        >
          Track a few months of spending to see trend insights here.
        </p>
      </div>

      <!-- Spending history list -->
      <div class="analytics-history">
        <div class="analytics-history__title">
          Spending History
        </div>

        <div
          v-if="filteredSpendingHistory.length === 0"
          class="analytics-history__empty"
        >
          No periods match the current filters.
        </div>

        <div
          v-for="period in [...filteredSpendingHistory].reverse()"
          :key="period.id"
          class="period-item"
        >
          <div class="period-item__header">
            <div class="period-item__info">
              <span class="period-item__label">{{ period.date }}</span>
            </div>
            <div class="period-item__right">
              <span class="period-item__total">{{ fmt(period.total) }}</span>
              <BaseButton
                size="xs"
                variant="danger"
                @click="deleteHistoryPeriod(period.id)"
              >
                Delete Period
              </BaseButton>
            </div>
          </div>

          <div
            v-if="(period.items || []).length === 0"
            class="period-item__empty"
          >
            No purchases in this period.
          </div>
          <div
            v-else
            class="period-item__purchases"
          >
            <div
              v-for="(item, idx) in (period.items || [])"
              :key="idx"
              class="period-purchase-row"
            >
              <span class="period-purchase-name">{{ item.name }}</span>
              <span class="period-purchase-amt">{{ fmt(item.amount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analytics-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.analytics-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Filters */
.analytics-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-search {
  flex: 1;
  min-width: 140px;
}

.filter-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.filter-input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  color: var(--text);
  min-width: 120px;
}

.filter-input:focus {
  outline: none;
  border-color: var(--accent);
}

.filter-clear {
  align-self: flex-end;
}

/* Stats grid */
.analytics-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

@media (max-width: 600px) {
  .analytics-stats { grid-template-columns: 1fr 1fr; }
}

.analytics-stat-card {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
}

.analytics-stat-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.filter-indicator {
  font-size: 0.65rem;
  color: var(--accent);
}

.analytics-stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

/* Chart sections */
.analytics-chart-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.analytics-chart-title {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

/* MoM section */
.mom-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.mom-section__title {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.mom-over  { color: var(--danger); font-weight: 700; }
.mom-good  { color: var(--accent2); font-weight: 700; }
.mom-muted { color: var(--muted); }

/* Insights */
.mom-insights__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.mom-insight-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.82rem;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  background: var(--surface);
}

.mom-insight-item--good { border-left: 3px solid var(--accent2); }
.mom-insight-item--warn { border-left: 3px solid var(--warn); }
.mom-insight-item--info { border-left: 3px solid var(--muted); }

.mom-insight-icon { flex-shrink: 0; }
.mom-insight-text { line-height: 1.4; }

.mom-no-data {
  font-size: 0.8rem;
  color: var(--muted);
  margin: 0;
  font-style: italic;
}

/* History */
.analytics-history {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.analytics-history__title {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.analytics-history__empty {
  font-size: 0.82rem;
  color: var(--muted);
  text-align: center;
  padding: 1rem;
}

.period-item {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.period-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.period-item__label {
  font-weight: 700;
  font-size: 0.875rem;
}

.period-item__right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.period-item__total {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--accent2);
}

.period-item__empty {
  font-size: 0.78rem;
  color: var(--muted);
  padding: 0.5rem 0.75rem;
}

.period-item__purchases {
  padding: 0.4rem 0.75rem;
}

.period-purchase-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0;
  font-size: 0.8rem;
  border-bottom: 1px solid var(--border-light, rgba(42, 48, 65, 0.5));
}

.period-purchase-row:last-child {
  border-bottom: none;
}

.period-purchase-name {
  color: var(--text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.period-purchase-amt {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  margin-left: 0.5rem;
}
</style>
