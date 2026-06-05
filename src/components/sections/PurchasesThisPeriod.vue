<!--
  Module:   components/sections/PurchasesThisPeriod.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (RS-12)
  Updated:  May 2026 (RS-16) — typeFilter prop; shows wants OR needs
            breakdown driven by the dashboard shared toggle.
            Also fixed categorySpending to use type-filtered purchases
            (was incorrectly using all purchases regardless of type).
  Summary:  Read-only dashboard widget showing the bi-weekly envelope
            as a donut chart (left) with a per-category breakdown list
            (right). The parent (DashboardPage) passes typeFilter to
            switch between wants and needs views.
-->

<script setup lang="ts">
import { computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useAnalytics } from '@/composables/useAnalytics';
import WantsDonut from '@/components/charts/WantsDonut.vue';
import { fmt } from '@/utils/format';
import {
  getCategorySpending,
  getSubsInWindow,
  getLoansInWindow,
  getPayPeriodForecast,
} from '@/utils/calculations';
import { CATEGORY_FALLBACK_COLOR } from '@/data/categories';

// ─── Props ────────────────────────────────────────────────────────
interface Props {
  /** Which envelope to display. Driven by the dashboard shared toggle. */
  typeFilter?: 'wants' | 'needs';
}
const props = withDefaults(defineProps<Props>(), { typeFilter: 'wants' });

const budget = useBudgetStore();
const { totalMonthlyIncome } = useAnalytics();

const today = new Date();

// ─── Bi-weekly budgets ────────────────────────────────────────────
const biWeeklyWantsBudget = computed(() =>
  (totalMonthlyIncome.value * (budget.allocation.wants / 100)) / 2,
);

const biWeeklyNeedsBudget = computed(() =>
  (totalMonthlyIncome.value * (budget.allocation.needs / 100)) / 2,
);

const biWeeklyBudget = computed(() =>
  props.typeFilter === 'needs' ? biWeeklyNeedsBudget.value : biWeeklyWantsBudget.value,
);

// ─── Deductions — split by subs vs loans, support both budget types ──
// Window end = today so we only show items that have already occurred this
// period (not future renewals within the 14-day window).
const periodWindow = computed(() => {
  if (!currentPeriod.value) return null;
  const start = new Date(currentPeriod.value.periodStart + 'T00:00:00');
  const end   = new Date(today);
  end.setHours(0, 0, 0, 0);
  return { start, end };
});

const subsDeductedFiltered = computed(() => {
  if (!periodWindow.value) return [];
  return getSubsInWindow(budget.$state, periodWindow.value.start, periodWindow.value.end, props.typeFilter);
});

const loansDeductedFiltered = computed(() => {
  if (!periodWindow.value) return [];
  return getLoansInWindow(budget.$state, periodWindow.value.start, periodWindow.value.end, props.typeFilter);
});

const subsDeductionTotal = computed(() =>
  subsDeductedFiltered.value.reduce((s, sub) => s + (+sub.amount || 0) * sub.renewalDates.length, 0),
);

const loansDeductionTotal = computed(() =>
  loansDeductedFiltered.value.reduce((s, loan) => s + (+loan.paymentAmount || 0) * loan.renewalDates.length, 0),
);

const deductionTotal = computed(() => subsDeductionTotal.value + loansDeductionTotal.value);

// ─── Current period window ────────────────────────────────────────
// BUG-024: scope to the current bi-weekly window so stale purchases
// that survived a rollover (BUG-023 DB sync gap) don't inflate totals.
const currentPeriod = computed(() => getPayPeriodForecast(budget.$state, 0, today));

const periodPurchases = computed(() => {
  if (!currentPeriod.value) return budget.purchases;
  const { periodStart, periodEnd } = currentPeriod.value;
  return budget.purchases.filter(
    p => p.date && p.date >= periodStart && p.date <= periodEnd,
  );
});

// ─── Filtered purchases (type + period) ──────────────────────────
const filteredPurchases = computed(() =>
  props.typeFilter === 'needs'
    ? periodPurchases.value.filter(p => p.budgetType === 'needs')
    : periodPurchases.value.filter(p => (p.budgetType || 'wants') === 'wants'),
);

// ─── Category spending (type-filtered) ───────────────────────────
const categorySpending = computed(() => getCategorySpending(filteredPurchases.value));

const totalSpent = computed(() =>
  filteredPurchases.value.reduce((s, p) => s + p.amount, 0),
);

const remaining = computed(() =>
  Math.max(0, biWeeklyBudget.value - totalSpent.value - deductionTotal.value),
);

const usedPct = computed(() => {
  if (biWeeklyBudget.value <= 0) return 0;
  // Purchases only — deductions are shown as a separate "Auto-deducted" row
  // so the donut % matches the caption and the Spending tab figure.
  return (totalSpent.value / biWeeklyBudget.value) * 100;
});

// ─── Category color map ────────────────────────────────────────────
const categoryColorMap = computed(() => {
  const map: Record<string, string> = {};
  budget.spendingCategories.forEach(c => { map[c.name] = c.color; });
  return map;
});

// ─── Category rows (sorted by amount desc) ─────────────────────────
const categoryList = computed(() =>
  Object.entries(categorySpending.value)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([name, amount]) => ({
      name,
      amount,
      pct: totalSpent.value > 0 ? (amount / totalSpent.value) * 100 : 0,
      color: name === 'Subscriptions'
        ? 'var(--accent)'
        : (categoryColorMap.value[name] ?? CATEGORY_FALLBACK_COLOR),
    })),
);

const isEmpty = computed(() =>
  categoryList.value.length === 0 && deductionTotal.value === 0,
);

/** Caption label below the donut. */
const captionLabel = computed(() =>
  props.typeFilter === 'needs' ? 'Bi-weekly needs' : 'Bi-weekly wants',
);
</script>

<template>
  <div class="ptp">
    <!-- Empty state ────────────────────────────────────────────── -->
    <div
      v-if="isEmpty"
      class="ptp__empty"
    >
      <span class="ptp__empty-icon">{{ typeFilter === 'needs' ? '🏠' : '🛍️' }}</span>
      <p class="ptp__empty-text">
        No {{ typeFilter }} purchases this period yet.
      </p>
      <p class="ptp__empty-hint">
        Use Quick Add or the Spending tab.
      </p>
    </div>

    <!-- Main layout: donut (left) + categories (right) ──────────── -->
    <div
      v-else
      class="ptp__body"
    >
      <!-- Donut -->
      <div class="ptp__donut-wrap">
        <WantsDonut
          :category-spending="categorySpending"
          :remaining="remaining"
          :used-pct="usedPct"
          :category-colors="categoryColorMap"
        />
        <p class="ptp__donut-caption">
          {{ fmt(totalSpent) }} / {{ fmt(biWeeklyBudget) }}
        </p>
        <p class="ptp__donut-type-hint">
          {{ captionLabel }}
        </p>
      </div>

      <!-- Category list -->
      <div class="ptp__categories">
        <div
          v-for="cat in categoryList"
          :key="cat.name"
          class="ptp__cat-row"
        >
          <span
            class="ptp__cat-dot"
            :style="{ background: cat.color }"
          />
          <span class="ptp__cat-name">{{ cat.name }}</span>
          <span class="ptp__cat-amount">{{ fmt(cat.amount) }}</span>
          <span class="ptp__cat-pct">{{ cat.pct.toFixed(0) }}%</span>
        </div>

        <!-- Subscriptions row (wants or needs, whichever type is active) -->
        <div
          v-if="subsDeductionTotal > 0"
          class="ptp__cat-row ptp__cat-row--deductions"
        >
          <span
            class="ptp__cat-dot"
            style="background: var(--accent)"
          />
          <span class="ptp__cat-name">Subscriptions</span>
          <span class="ptp__cat-amount">{{ fmt(subsDeductionTotal) }}</span>
          <span class="ptp__cat-pct">—</span>
        </div>

        <!-- Loans row -->
        <div
          v-if="loansDeductionTotal > 0"
          class="ptp__cat-row ptp__cat-row--deductions"
        >
          <span
            class="ptp__cat-dot"
            style="background: #fbbf24"
          />
          <span class="ptp__cat-name">Loans</span>
          <span class="ptp__cat-amount">{{ fmt(loansDeductionTotal) }}</span>
          <span class="ptp__cat-pct">—</span>
        </div>
      </div>
    </div>

    <!-- Footer ───────────────────────────────────────────────────── -->
    <p class="ptp__footer">
      For full detail, see the Spending tab.
    </p>
  </div>
</template>

<style scoped>
.ptp {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ─── Empty state ─────────────────────────────────────────────── */
.ptp__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 0;
  gap: 0.3rem;
  text-align: center;
}

.ptp__empty-icon {
  font-size: 2rem;
}

.ptp__empty-text {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
}

.ptp__empty-hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--muted);
}

/* ─── Main layout ─────────────────────────────────────────────── */
.ptp__body {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 1rem;
  align-items: start;
}

@media (max-width: 480px) {
  .ptp__body {
    grid-template-columns: 1fr;
  }
}

/* ─── Donut ───────────────────────────────────────────────────── */
.ptp__donut-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.ptp__donut-caption {
  margin: 0;
  font-size: 0.7rem;
  color: var(--muted);
  font-family: var(--font-mono);
  text-align: center;
  white-space: nowrap;
}

.ptp__donut-type-hint {
  margin: 0;
  font-size: 0.65rem;
  color: var(--muted);
  text-align: center;
  opacity: 0.7;
  white-space: nowrap;
}

/* ─── Category list ───────────────────────────────────────────── */
.ptp__categories {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-top: 0.25rem;
}

.ptp__cat-row {
  display: grid;
  grid-template-columns: 10px 1fr auto 2.5rem;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.8rem;
}

.ptp__cat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ptp__cat-name {
  color: var(--text);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ptp__cat-amount {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text);
  font-weight: 600;
  text-align: right;
}

.ptp__cat-pct {
  font-size: 0.72rem;
  color: var(--muted);
  text-align: right;
}

.ptp__cat-row--deductions {
  opacity: 0.65;
  border-top: 1px dashed var(--border);
  padding-top: 0.3rem;
  margin-top: 0.1rem;
}

/* ─── Footer ──────────────────────────────────────────────────── */
.ptp__footer {
  margin: 0;
  font-size: 0.72rem;
  color: var(--muted);
  border-top: 1px solid var(--border);
  padding-top: 0.6rem;
}
</style>
