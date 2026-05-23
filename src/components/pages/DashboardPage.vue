<!--
  Module:   components/pages/DashboardPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Updated:  May 2026 (Sprint 4 — all 13 section SFCs wired)
            May 2026 (Sprint 13 — section IDs, group labels, collapsible)
  Summary:  Dashboard tab host. Houses all financial section components,
            organised into five logical groups with collapsible cards.
            Each BaseCard carries a `sectionId` for SectionPicker jump-to.
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

    <!-- ══ Income & Budget ═══════════════════════════════════════════ -->
    <p class="section-group-label">
      Income &amp; Budget
    </p>

    <BaseCard
      title="6-Month Spending Trend"
      section-id="spending-trend"
      :collapsible="true"
    >
      <SpendingTrendChart :rows="spendingTrend" />
    </BaseCard>

    <div class="two-col-grid">
      <BaseCard
        title="Income Streams"
        section-id="income-streams"
      >
        <IncomeStreams />
      </BaseCard>

      <BaseCard
        title="Budget Allocation (50/30/20)"
        section-id="budget-allocation"
      >
        <BudgetAllocation />
      </BaseCard>
    </div>

    <!-- ══ Spending ══════════════════════════════════════════════════ -->
    <p class="section-group-label">
      Spending
    </p>

    <BaseCard
      title="Wants Tracker"
      section-id="wants-tracker"
    >
      <WantsTracker />
    </BaseCard>

    <BaseCard
      title="Budget vs. Actual"
      section-id="budget-vs-actual"
    >
      <BudgetVsActual />
    </BaseCard>

    <BaseCard
      title="Expense Cards"
      section-id="expense-cards"
    >
      <ExpenseCards />
    </BaseCard>

    <BaseCard
      title="Subscriptions"
      section-id="subscriptions"
    >
      <Subscriptions />
    </BaseCard>

    <!-- ══ Debt & Credit ═════════════════════════════════════════════ -->
    <p class="section-group-label">
      Debt &amp; Credit
    </p>

    <div class="two-col-grid">
      <BaseCard
        title="Loans"
        section-id="loans"
      >
        <Loans />
      </BaseCard>

      <BaseCard
        title="Credit Cards"
        section-id="credit-cards"
      >
        <CreditCards />
      </BaseCard>
    </div>

    <!-- ══ Savings & Goals ═══════════════════════════════════════════ -->
    <p class="section-group-label">
      Savings &amp; Goals
    </p>

    <div class="two-col-grid">
      <BaseCard
        title="Savings Accounts"
        section-id="savings-accounts"
      >
        <Savings />
      </BaseCard>

      <BaseCard
        title="Savings Goals"
        section-id="savings-goals"
      >
        <SavingsGoals />
      </BaseCard>
    </div>

    <BaseCard
      title="Goals Timeline"
      section-id="goals-timeline"
      :collapsible="true"
    >
      <GoalsTimeline />
    </BaseCard>

    <!-- ══ Wealth & History ══════════════════════════════════════════ -->
    <p class="section-group-label">
      Wealth &amp; History
    </p>

    <BaseCard
      title="Net Worth"
      section-id="net-worth"
      :collapsible="true"
    >
      <NetWorth />
    </BaseCard>

    <BaseCard
      title="Spending Analytics"
      section-id="spending-analytics"
      :collapsible="true"
    >
      <SpendingAnalytics />
    </BaseCard>

    <BaseCard
      title="Wishlist"
      section-id="wishlist"
      :collapsible="true"
    >
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

/* ─── Group label dividers ─────────────────────────────────────── */
.section-group-label {
  margin: 0.5rem 0 -0.25rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted, #5a7a63);
}

/* ─── Stats row ────────────────────────────────────────────────── */
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

/* ─── Two-column grid ──────────────────────────────────────────── */
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
