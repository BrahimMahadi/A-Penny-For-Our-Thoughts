<!--
  Module:   components/pages/DashboardPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Summary:  Dashboard tab host. Section components plug in here
            during Sprint 4 (IncomeStreams, BudgetAllocation,
            WantsTracker, etc.).
-->

<script setup lang="ts">
import { computed } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import StatCard from '@/components/ui/StatCard.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import BudgetVsActualChart from '@/components/charts/BudgetVsActualChart.vue';
import NetWorthChart from '@/components/charts/NetWorthChart.vue';
import WantsDonut from '@/components/charts/WantsDonut.vue';
import CcBar from '@/components/charts/CcBar.vue';
import { useAnalytics } from '@/composables/useAnalytics';
import { useBudgetStore } from '@/stores/budget';
import { fmt } from '@/utils/format';
import { getCategorySpending } from '@/utils/calculations';

const {
  totalMonthlyIncome,
  currentMonthBudgeted,
  currentMonthActuals,
  netWorth,
} = useAnalytics();

const budget = useBudgetStore();

// Wants donut data from current purchases
const categorySpending = computed(() => getCategorySpending(budget.purchases));
const wantsBudget = computed(() =>
  (totalMonthlyIncome.value * budget.allocation.wants) / 100,
);
const wantsSpent = computed(() =>
  Object.values(categorySpending.value).reduce((s, v) => s + v, 0),
);
const wantsRemaining = computed(() =>
  Math.max(0, wantsBudget.value - wantsSpent.value),
);
const wantsUsedPct = computed(() =>
  wantsBudget.value > 0
    ? (wantsSpent.value / wantsBudget.value) * 100
    : 0,
);

// Net worth chart data
const nwHistory = computed(() => netWorth.value.history);

// Credit card data
const creditCards = computed(() => budget.creditCards);
</script>

<template>
  <div class="page-dashboard">
    <!-- Top stats row -->
    <div class="stats-row">
      <StatCard
        label="Monthly income"
        :value="fmt(totalMonthlyIncome)"
        variant="accent"
      />
      <StatCard
        label="Needs budget"
        :value="fmt(currentMonthBudgeted.needs)"
        :hint="`Spent: ${fmt(currentMonthActuals.needs)}`"
      />
      <StatCard
        label="Wants budget"
        :value="fmt(currentMonthBudgeted.wants)"
        :hint="`Spent: ${fmt(currentMonthActuals.wants)}`"
      />
      <StatCard
        label="Savings"
        :value="fmt(currentMonthBudgeted.savings)"
        :hint="`Actual: ${fmt(currentMonthActuals.savings)}`"
      />
    </div>

    <!-- Sprint 3 chart previews — real data, visual verification -->
    <div class="charts-row">
      <BaseCard title="Budget vs. Actual">
        <BudgetVsActualChart
          :budgeted="currentMonthBudgeted"
          :actuals="currentMonthActuals"
        />
      </BaseCard>

      <BaseCard title="Wants Spending">
        <WantsDonut
          :category-spending="categorySpending"
          :remaining="wantsRemaining"
          :used-pct="wantsUsedPct"
        />
      </BaseCard>
    </div>

    <BaseCard title="Net Worth History">
      <NetWorthChart :history="nwHistory" />
    </BaseCard>

    <BaseCard
      v-if="creditCards.length > 0"
      title="Credit Card Utilisation"
    >
      <CcBar :cards="creditCards" />
    </BaseCard>

    <!-- Placeholder sections — replaced in Sprint 4 -->
    <BaseCard title="Income Streams · Budget Allocation">
      <EmptyState
        icon="💵"
        title="Sections migrate in Sprint 4"
        hint="IncomeStreams.vue + BudgetAllocation.vue — CRUD + editable sliders."
      />
    </BaseCard>

    <BaseCard title="Expense Cards · Loans · Subscriptions">
      <EmptyState
        icon="🧾"
        title="Sections migrate in Sprint 4"
        hint="One Vue SFC per legacy section, all wired through the budget store."
      />
    </BaseCard>

    <BaseCard title="Savings · Goals · Analytics">
      <EmptyState
        icon="💰"
        title="Sections migrate in Sprint 4"
        hint="Goal progress bars, account balances, MoM trend, analytics panel."
      />
    </BaseCard>
  </div>
</template>

<style scoped>
.page-dashboard {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 700px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

@media (max-width: 900px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 540px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>
