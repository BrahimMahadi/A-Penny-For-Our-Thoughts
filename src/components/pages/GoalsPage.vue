<!--
  Module:   components/pages/GoalsPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Redesign Sprint 2) — stub
  Rewritten: May 2026 (Redesign Sprint 5) — full implementation
  Updated:  May 2026 (Redesign Sprint 9) — analytics grid: 2-col BvA+NetWorth, full-width trend+analytics
  Summary:  Goals tab. Three-zone layout:
            1. Page header — eyebrow + h1 + "New savings goal" / "Add wishlist item" CTAs
            2. Summary KPI row — total saved, goals count, overall %, wishlist count
            3. Primary sections — Savings Goals + Wishlist (each in a BaseCard)
            4. Folded analytics — 4 analytics sections behind a toggle (matches
               AdvancedPage content; accessible here for users who never hit key 7)

  Section components are self-contained; this page wires the header CTAs to their
  openAdd() methods via template refs + defineExpose.
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useAnalytics } from '@/composables/useAnalytics';
import BaseCard from '@/components/ui/BaseCard.vue';
import StatCard from '@/components/ui/StatCard.vue';
import SavingsGoals from '@/components/sections/SavingsGoals.vue';
import Wishlist from '@/components/sections/Wishlist.vue';
import SpendingTrendSection from '@/components/sections/SpendingTrendSection.vue';
import SpendingAnalytics    from '@/components/sections/SpendingAnalytics.vue';
import BudgetVsActual       from '@/components/sections/BudgetVsActual.vue';
import NetWorth             from '@/components/sections/NetWorth.vue';
import { fmt } from '@/utils/format';

const budget = useBudgetStore();
const { netWorth } = useAnalytics();

// ─── Section refs — to trigger modals from the page-level CTAs ───────
const savingsGoalsRef = ref<InstanceType<typeof SavingsGoals> | null>(null);
const wishlistRef     = ref<InstanceType<typeof Wishlist>     | null>(null);

// ─── Analytics group toggle ───────────────────────────────────────────
const analyticsOpen = ref(false);

// ─── Summary KPIs ────────────────────────────────────────────────────

/** Goals cross-referenced with their savings account (orphan goals excluded). */
const goalsWithAccounts = computed(() =>
  budget.goals
    .map(g => ({ goal: g, account: budget.savingsAccounts.find(a => a.id === g.accountId) }))
    .filter((x): x is { goal: typeof x.goal; account: NonNullable<typeof x.account> } =>
      x.account !== undefined,
    ),
);

const totalSaved = computed(() =>
  goalsWithAccounts.value.reduce((s, { account }) => s + account.balance, 0),
);

const totalTarget = computed(() =>
  goalsWithAccounts.value.reduce((s, { goal }) => s + goal.targetAmount, 0),
);

const overallPct = computed(() =>
  totalTarget.value > 0
    ? Math.round(Math.min(100, (totalSaved.value / totalTarget.value) * 100))
    : 0,
);

const netWorthValue = computed(() => netWorth.value.netWorth);
</script>

<template>
  <div class="page-goals">

    <!-- ── Page header ─────────────────────────────────────────── -->
    <div class="goals-header">
      <div class="goals-header__left">
        <div class="goals-eyebrow">Goals</div>
        <h1 class="goals-title">What you're working toward</h1>
      </div>
      <div class="goals-header__right">
        <button
          class="goals-btn goals-btn--secondary"
          @click="wishlistRef?.openAdd()"
        >
          + Add wishlist item
        </button>
        <button
          class="goals-btn goals-btn--primary"
          @click="savingsGoalsRef?.openAdd()"
        >
          + New savings goal
        </button>
      </div>
    </div>

    <!-- ── Summary KPI row ────────────────────────────────────── -->
    <div class="goals-kpi-row">
      <StatCard
        label="Total saved"
        :value="fmt(totalSaved)"
        :hint="totalTarget > 0 ? `of ${fmt(totalTarget)} target` : 'No targets set'"
        variant="success"
      />
      <StatCard
        label="Overall progress"
        :value="`${overallPct}%`"
        :hint="goalsWithAccounts.length > 0 ? `across ${goalsWithAccounts.length} goal${goalsWithAccounts.length !== 1 ? 's' : ''}` : 'No goals yet'"
      />
      <StatCard
        label="Net worth"
        :value="fmt(netWorthValue)"
        hint="assets − liabilities"
        :variant="netWorthValue >= 0 ? 'default' : 'danger'"
      />
      <StatCard
        label="Wishlist items"
        :value="String(budget.wishlist.length)"
        :hint="budget.wishlist.length > 0 ? `${budget.wishlist.length} item${budget.wishlist.length !== 1 ? 's' : ''} tracked` : 'None added yet'"
      />
    </div>

    <!-- ── Savings Goals section ──────────────────────────────── -->
    <BaseCard
      title="Savings Goals"
      section-id="savings-goals"
      :collapsible="true"
    >
      <SavingsGoals ref="savingsGoalsRef" />
    </BaseCard>

    <!-- ── Wishlist section ───────────────────────────────────── -->
    <BaseCard
      title="Wishlist"
      section-id="wishlist"
      :collapsible="true"
    >
      <Wishlist ref="wishlistRef" />
    </BaseCard>

    <!-- ── Analytics section group (folded in from Advanced tab) ─ -->
    <div class="analytics-group">
      <button
        class="analytics-toggle"
        :aria-expanded="analyticsOpen"
        @click="analyticsOpen = !analyticsOpen"
      >
        <span class="analytics-toggle__icon" aria-hidden="true">📊</span>
        <span class="analytics-toggle__label">Analytics</span>
        <span
          class="analytics-toggle__chevron"
          :class="{ 'analytics-toggle__chevron--open': analyticsOpen }"
          aria-hidden="true"
        >›</span>
      </button>

      <template v-if="analyticsOpen">
        <!-- Full-width: chart needs horizontal room -->
        <BaseCard
          title="6-Month Spending Trend"
          section-id="goals-spending-trend"
          :collapsible="true"
          class="analytics-full"
        >
          <SpendingTrendSection />
        </BaseCard>

        <!-- Two-column row: summary cards sit nicely side-by-side -->
        <div class="analytics-2col">
          <BaseCard
            title="Budget vs. Actual"
            section-id="goals-budget-vs-actual"
            :collapsible="true"
          >
            <BudgetVsActual />
          </BaseCard>

          <BaseCard
            title="Net Worth"
            section-id="goals-net-worth"
            :collapsible="true"
          >
            <NetWorth />
          </BaseCard>
        </div>

        <!-- Full-width: filter toolbar + history list + charts need room -->
        <BaseCard
          title="Spending Analytics"
          section-id="goals-spending-analytics"
          :collapsible="true"
          class="analytics-full"
        >
          <SpendingAnalytics />
        </BaseCard>
      </template>
    </div>

  </div>
</template>

<style scoped>
.page-goals {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Page header ───────────────────────────────────────────────── */
.goals-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.goals-eyebrow {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 600;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}

.goals-title {
  margin: 0;
  font-size: clamp(1.4rem, 4vw, 1.75rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.goals-header__right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
}

/* ── Header action buttons ─────────────────────────────────────── */
.goals-btn {
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background var(--transition-fast), color var(--transition-fast),
    border-color var(--transition-fast);
  white-space: nowrap;
}

.goals-btn--secondary {
  background: var(--surface2);
  border-color: var(--border);
  color: var(--text);
}

.goals-btn--secondary:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.goals-btn--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.goals-btn--primary:hover {
  background: var(--accent-btn, #4a2fd4);
  border-color: var(--accent-btn, #4a2fd4);
}

.goals-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ── KPI row ─────────────────────────────────────────────────── */
.goals-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

@media (max-width: 700px) {
  .goals-kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ── Analytics group ─────────────────────────────────────────── */
.analytics-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
}

/* Side-by-side pair: Budget vs. Actual + Net Worth */
.analytics-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}

/* Ensure full-width cards don't accidentally shrink inside the group */
.analytics-full {
  width: 100%;
}

@media (max-width: 860px) {
  .analytics-2col {
    grid-template-columns: 1fr;
  }
}

.analytics-toggle {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--muted);
  text-align: left;
  width: 100%;
  transition: background var(--transition-fast), color var(--transition-fast),
    border-color var(--transition-fast);
}

.analytics-toggle:hover {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.analytics-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.analytics-toggle__icon {
  font-size: 1rem;
  line-height: 1;
  flex-shrink: 0;
}

.analytics-toggle__label {
  flex: 1;
}

.analytics-toggle__chevron {
  font-size: 1rem;
  color: var(--muted);
  transition: transform var(--transition-fast);
  display: inline-block;
}

.analytics-toggle__chevron--open {
  transform: rotate(90deg);
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 540px) {
  .goals-header {
    flex-direction: column;
  }

  .goals-header__right {
    width: 100%;
  }

  .goals-btn {
    flex: 1;
    text-align: center;
  }
}
</style>
