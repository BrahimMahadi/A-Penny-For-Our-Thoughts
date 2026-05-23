<!--
  Module:   components/pages/DashboardPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Updated:  May 2026 (Sprint 4 — all 13 section SFCs wired)
  Summary:  Dashboard tab host. Houses all financial section components.
-->

<script setup lang="ts">
import { computed } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import StatCard from '@/components/ui/StatCard.vue';

// Section components
import IncomeStreams      from '@/components/sections/IncomeStreams.vue';
import BudgetAllocation  from '@/components/sections/BudgetAllocation.vue';
import WantsTracker      from '@/components/sections/WantsTracker.vue';
import ExpenseCards      from '@/components/sections/ExpenseCards.vue';
import Loans             from '@/components/sections/Loans.vue';
import CreditCards       from '@/components/sections/CreditCards.vue';
import Subscriptions     from '@/components/sections/Subscriptions.vue';
import Savings           from '@/components/sections/Savings.vue';
import SavingsGoals      from '@/components/sections/SavingsGoals.vue';
import GoalsTimeline     from '@/components/sections/GoalsTimeline.vue';
import NetWorth          from '@/components/sections/NetWorth.vue';
import BudgetVsActual    from '@/components/sections/BudgetVsActual.vue';
import SpendingAnalytics from '@/components/sections/SpendingAnalytics.vue';
import Wishlist          from '@/components/sections/Wishlist.vue';

// Chart components
import SpendingTrendChart from '@/components/charts/SpendingTrendChart.vue';

import { useAnalytics } from '@/composables/useAnalytics';
import { fmt } from '@/utils/format';

const {
  totalMonthlyIncome,
  currentMonthBudgeted,
  currentMonthActuals,
  prevMonthActuals,
  spendingTrend,
  netWorth,
} = useAnalytics();

/**
 * MoM delta helpers — positive delta on spending = spent more (bad),
 * so we pass `invertDelta` to the StatCard to flip the colour logic.
 * Net worth delta is the opposite: positive = wealth grew (good), no invert.
 */
const needsDelta = computed(() =>
  prevMonthActuals.value.needs > 0
    ? currentMonthActuals.value.needs - prevMonthActuals.value.needs
    : null,
);
const wantsDelta = computed(() =>
  prevMonthActuals.value.wants > 0
    ? currentMonthActuals.value.wants - prevMonthActuals.value.wants
    : null,
);
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
        :delta="needsDelta"
        delta-prefix="$"
        :invert-delta="true"
      />
      <StatCard
        label="Wants budget"
        :value="fmt(currentMonthBudgeted.wants)"
        :hint="`Spent: ${fmt(currentMonthActuals.wants)}`"
        :delta="wantsDelta"
        delta-prefix="$"
        :invert-delta="true"
      />
      <StatCard
        label="Net worth"
        :value="fmt(netWorth.netWorth)"
        :hint="`Assets: ${fmt(netWorth.totalAssets)} · Liabilities: ${fmt(netWorth.totalLiabilities)}`"
        :delta="netWorth.momChange"
        delta-prefix="$"
      />
    </div>

    <!-- 6-month spending trend chart -->
    <BaseCard title="6-Month Spending Trend">
      <SpendingTrendChart :rows="spendingTrend" />
    </BaseCard>

    <!-- Income & Budget Allocation -->
    <div class="two-col-grid">
      <BaseCard title="Income Streams">
        <IncomeStreams />
      </BaseCard>

      <BaseCard title="Budget Allocation (50/30/20)">
        <BudgetAllocation />
      </BaseCard>
    </div>

    <!-- Wants Tracker -->
    <BaseCard title="Wants Tracker">
      <WantsTracker />
    </BaseCard>

    <!-- Budget vs. Actual -->
    <BaseCard title="Budget vs. Actual">
      <BudgetVsActual />
    </BaseCard>

    <!-- Expense Cards -->
    <BaseCard title="Expense Cards">
      <ExpenseCards />
    </BaseCard>

    <!-- Loans & Credit Cards -->
    <div class="two-col-grid">
      <BaseCard title="Loans">
        <Loans />
      </BaseCard>

      <BaseCard title="Credit Cards">
        <CreditCards />
      </BaseCard>
    </div>

    <!-- Subscriptions -->
    <BaseCard title="Subscriptions">
      <Subscriptions />
    </BaseCard>

    <!-- Savings & Goals -->
    <div class="two-col-grid">
      <BaseCard title="Savings Accounts">
        <Savings />
      </BaseCard>

      <BaseCard title="Savings Goals">
        <SavingsGoals />
      </BaseCard>
    </div>

    <!-- Goals Timeline -->
    <BaseCard title="Goals Timeline">
      <GoalsTimeline />
    </BaseCard>

    <!-- Net Worth -->
    <BaseCard title="Net Worth">
      <NetWorth />
    </BaseCard>

    <!-- Spending Analytics (collapsible) -->
    <BaseCard title="Spending Analytics">
      <SpendingAnalytics />
    </BaseCard>

    <!-- Wishlist -->
    <BaseCard title="Wishlist">
      <Wishlist />
    </BaseCard>
  </div>
</template>

<style scoped>
.page-dashboard {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.two-col-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 700px) {
  .two-col-grid {
    grid-template-columns: 1fr;
  }
}
</style>
