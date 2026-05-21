<!--
  Module:   components/pages/DashboardPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Summary:  Dashboard tab host. Section components plug in here
            during Sprint 4 (IncomeStreams, BudgetAllocation,
            WantsTracker, etc.).
-->

<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue';
import StatCard from '@/components/ui/StatCard.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { useAnalytics } from '@/composables/useAnalytics';
import { fmt } from '@/utils/format';

const { totalMonthlyIncome, currentMonthBudgeted, currentMonthActuals } = useAnalytics();
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

    <!-- Placeholder sections — replaced in Sprint 4 -->
    <BaseCard title="Income Streams">
      <EmptyState
        icon="💵"
        title="Section migrates in Sprint 4"
        hint="IncomeStreams.vue — the simplest CRUD section, ported first."
      />
    </BaseCard>

    <BaseCard title="Budget Allocation">
      <EmptyState
        icon="📊"
        title="Section migrates in Sprint 4"
        hint="50 / 30 / 20 editable sliders."
      />
    </BaseCard>

    <BaseCard title="Wants Tracker">
      <EmptyState
        icon="🎯"
        title="Section migrates in Sprint 4"
        hint="Wants donut + bi-weekly envelope + purchase list."
      />
    </BaseCard>

    <BaseCard title="Expense Cards · Loans · Credit Cards · Subscriptions">
      <EmptyState
        icon="🧾"
        title="Sections migrate in Sprint 4"
        hint="One Vue SFC per legacy section, all wired through the budget store."
      />
    </BaseCard>

    <BaseCard title="Savings · Goals · Net Worth">
      <EmptyState
        icon="💰"
        title="Sections migrate in Sprint 4"
        hint="Goal progress bars, account balances, net worth chart."
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
