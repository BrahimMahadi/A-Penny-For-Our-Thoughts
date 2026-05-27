<!--
  Module:   components/pages/SpendingPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 16)
  Summary:  Spending tab. Period-scoped view of all purchases with a
            pill-shaped search, category chip filters, sort dropdown,
            and an HTML table. Also shows a category donut and daily
            spend bar chart for the selected pay period.
-->

<script setup lang="ts">
import { computed, ref, reactive, watch } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useAnalytics } from '@/composables/useAnalytics';
import { useToast } from '@/composables/useToast';
import { getPayPeriodForecast, getCategorySpending, applyRulesToName } from '@/utils/calculations';
import { CATEGORY_FALLBACK_COLOR } from '@/data/categories';
import WantsDonut from '@/components/charts/WantsDonut.vue';
import StatCard from '@/components/ui/StatCard.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { fmt } from '@/utils/format';
import type { Purchase, ISODate } from '@/types/budget';

const budget = useBudgetStore();
const { totalMonthlyIncome } = useAnalytics();
const toast = useToast();

// ─── CSV export ───────────────────────────────────────────────────
function handleExport(): void {
  try {
    budget.exportCSV();
    toast.show('CSV exported.', 'success');
  } catch (err) {
    toast.show('Export failed: ' + (err instanceof Error ? err.message : String(err)), 'danger');
  }
}

// ─── Period navigation ────────────────────────────────────────────
const spendingOffset = ref(0);

const today = new Date();

const spendingPeriod = computed(() =>
  getPayPeriodForecast(budget.$state, spendingOffset.value),
);

function goPrev(): void { spendingOffset.value -= 1; }
function goNext(): void { spendingOffset.value += 1; }
function goCurrent(): void { spendingOffset.value = 0; }

const pageTitle = computed(() => {
  if (!spendingPeriod.value) return 'All Spending';
  return spendingPeriod.value.label;
});

// ─── Purchases in period ──────────────────────────────────────────
const allPurchases = computed<Purchase[]>(() => budget.$state.purchases);

const purchasesInPeriod = computed<Purchase[]>(() => {
  if (!spendingPeriod.value) return allPurchases.value;
  const { periodStart, periodEnd } = spendingPeriod.value;
  return allPurchases.value.filter(
    p => p.date && p.date >= periodStart && p.date <= periodEnd,
  );
});

/** Purchases without a date — shown at the bottom regardless of period. */
const undatedPurchases = computed<Purchase[]>(() =>
  allPurchases.value.filter(p => !p.date),
);

// ─── KPI tiles ────────────────────────────────────────────────────
const wantsPct = computed(() => (budget.$state.allocation.wants || 0) / 100);
const wantsBudgetPerPeriod = computed(() => totalMonthlyIncome.value * wantsPct.value / 2);

const totalSpentInPeriod = computed(() =>
  purchasesInPeriod.value.reduce((s, p) => s + p.amount, 0),
);

const daysElapsed = computed(() => {
  if (!spendingPeriod.value) return 1;
  const start = new Date(spendingPeriod.value.periodStart + 'T00:00:00');
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const elapsed = Math.max(1, Math.floor((todayMs - start.getTime()) / 86400000) + 1);
  return Math.min(elapsed, 14);
});

const dailyAvg = computed(() => totalSpentInPeriod.value / daysElapsed.value);

const daysLeft = computed(() => {
  if (!spendingPeriod.value) return 0;
  const end = new Date(spendingPeriod.value.periodEnd + 'T00:00:00');
  const todayMs = new Date().setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end.getTime() - todayMs) / 86400000));
});

/** Category name with the most spending this period. */
const topCategoryInfo = computed(() => {
  const spending = getCategorySpending(purchasesInPeriod.value);
  const total    = totalSpentInPeriod.value;
  const top      = Object.entries(spending).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  return {
    name: top[0],
    amount: top[1],
    pct: total > 0 ? Math.round((top[1] / total) * 100) : 0,
  };
});

// ─── Donut chart — switchable wants/needs (RS-16) ────────────────
/** Which type the donut card shows — independent from the table typeFilter. */
const donutTypeFilter = ref<'wants' | 'needs'>('wants');

const wantsPurchasesInPeriod = computed(() =>
  purchasesInPeriod.value.filter(p => (p.budgetType ?? 'wants') !== 'needs'),
);

const needsPurchasesInPeriod = computed(() =>
  purchasesInPeriod.value.filter(p => p.budgetType === 'needs'),
);

/** Purchases shown in the donut — changes with donutTypeFilter. */
const donutPurchases = computed(() =>
  donutTypeFilter.value === 'needs' ? needsPurchasesInPeriod.value : wantsPurchasesInPeriod.value,
);

/** Total spent for the active donut type. */
const wantsSpentInPeriod = computed(() => donutPurchases.value.reduce((s, p) => s + p.amount, 0));

/** Needs bi-weekly budget = income × needs% ÷ 2. */
const needsBudgetPerPeriod = computed(() =>
  (totalMonthlyIncome.value * ((budget.$state.allocation.needs || 0) / 100)) / 2,
);

/** Budget for the active donut type. */
const donutBudget = computed(() =>
  donutTypeFilter.value === 'needs' ? needsBudgetPerPeriod.value : wantsBudgetPerPeriod.value,
);

const categorySpending = computed(() => getCategorySpending(donutPurchases.value));

const categoryColorMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  budget.$state.spendingCategories.forEach(c => { map[c.name] = c.color; });
  return map;
});

const remainingBudget = computed(() => donutBudget.value - wantsSpentInPeriod.value);

const usedPct = computed(() => {
  if (donutBudget.value <= 0) return 0;
  return (wantsSpentInPeriod.value / donutBudget.value) * 100;
});

// ─── Daily spend bars — split by want / need (RS-15) ─────────────
interface DailyBar {
  label: string;
  total: number;
  wants: number;
  needs: number;
}

const dailyBars = computed<DailyBar[]>(() => {
  if (!spendingPeriod.value) return [];
  const startDate = new Date(spendingPeriod.value.periodStart + 'T00:00:00');
  const bars: DailyBar[] = [];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 14; i++) {
    const d    = new Date(startDate.getTime() + i * 86400000);
    const iso  = d.toISOString().split('T')[0] as ISODate;
    const dow  = DOW[d.getDay()];
    const day  = d.getDate();
    const dayPurchases = purchasesInPeriod.value.filter(p => p.date === iso);
    const wants = dayPurchases
      .filter(p => (p.budgetType ?? 'wants') !== 'needs')
      .reduce((s, p) => s + p.amount, 0);
    const needs = dayPurchases
      .filter(p => p.budgetType === 'needs')
      .reduce((s, p) => s + p.amount, 0);
    bars.push({ label: `${dow} ${day}`, total: wants + needs, wants, needs });
  }
  return bars;
});

const dailyMax = computed(() => Math.max(...dailyBars.value.map(b => b.total), 1));

// ─── Search / filter / sort ───────────────────────────────────────
const searchQuery  = ref('');
const catFilter    = ref('');
const typeFilter   = ref<'' | 'wants' | 'needs'>('');
const sortKey      = ref<'newest' | 'oldest' | 'amtHigh' | 'amtLow' | 'nameAZ'>('newest');

/** All categories present in the period — ALL purchase types, independent of the
 *  donut toggle. These drive the filter chips in the "All purchases" table, which
 *  always shows everything and must not change when the Wants/Needs toggle flips. */
const activeCategories = computed(() => {
  const spending = getCategorySpending(purchasesInPeriod.value);
  return Object.entries(spending)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([name]) => name);
});

function cardLabel(cardId: string | null): string {
  if (!cardId) return '';
  return budget.$state.expenseCards.find(c => c.id === cardId)?.label ?? '';
}

function catColor(name: string): string {
  return budget.$state.spendingCategories.find(c => c.name === name)?.color
    ?? CATEGORY_FALLBACK_COLOR;
}

function formatDate(iso: ISODate | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleString('en-CA', { month: 'short', day: 'numeric' });
}

function applySearch(items: Purchase[]): Purchase[] {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return items;
  return items.filter(p => {
    const card = cardLabel(p.cardId).toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      card.includes(q)
    );
  });
}

function applySort(items: Purchase[]): Purchase[] {
  const arr = [...items];
  switch (sortKey.value) {
    case 'newest':
      return arr.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      });
    case 'oldest':
      return arr.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return -1;
        if (!b.date) return 1;
        return a.date.localeCompare(b.date);
      });
    case 'amtHigh': return arr.sort((a, b) => b.amount - a.amount);
    case 'amtLow':  return arr.sort((a, b) => a.amount - b.amount);
    case 'nameAZ':  return arr.sort((a, b) => a.name.localeCompare(b.name));
    default: return arr;
  }
}

function applyTypeFilter(items: Purchase[]): Purchase[] {
  if (!typeFilter.value) return items;
  if (typeFilter.value === 'needs') return items.filter(p => p.budgetType === 'needs');
  return items.filter(p => (p.budgetType ?? 'wants') !== 'needs');
}

/** Dated period purchases after all filters + sort applied. */
const filteredPurchases = computed(() => {
  let items = purchasesInPeriod.value;
  if (catFilter.value)  items = items.filter(p => p.category === catFilter.value);
  items = applyTypeFilter(items);
  items = applySearch(items);
  return applySort(items);
});

/** Undated purchases after search + cat filter + sort applied. */
const filteredUndated = computed(() => {
  let items = undatedPurchases.value;
  if (catFilter.value)  items = items.filter(p => p.category === catFilter.value);
  items = applyTypeFilter(items);
  items = applySearch(items);
  return applySort(items);
});

const totalFiltered = computed(() =>
  filteredPurchases.value.length + filteredUndated.value.length,
);
const totalAll = computed(() =>
  purchasesInPeriod.value.length + undatedPurchases.value.length,
);

/** Sum of amounts for all currently-visible rows (respects all active filters). */
const filteredAmountTotal = computed(() =>
  [...filteredPurchases.value, ...filteredUndated.value]
    .reduce((s, p) => s + p.amount, 0),
);

// ─── Purchase CRUD ─────────────────────────────────────────────────
const showPurchaseModal = ref(false);
const editingPurchaseId = ref<string | null>(null);

const purchaseForm = reactive({
  name:       '',
  amount:     0,
  date:       '' as string,
  category:   'Other' as string,
  budgetType: 'wants' as 'wants' | 'needs',
  cardId:     null as string | null,
});

/** Auto-categorise by rules when name changes (add mode only). */
watch(
  () => purchaseForm.name,
  (name) => {
    if (editingPurchaseId.value) return;
    const matched = applyRulesToName(budget.rules, name);
    if (matched) purchaseForm.category = matched;
  },
);

const categoryOptions = computed(() => budget.spendingCategories.map(c => c.name));

const purchaseFormError = computed<string>(() => {
  if (!purchaseForm.name.trim()) return 'Name is required.';
  if (purchaseForm.amount <= 0)  return 'Amount must be greater than zero.';
  return '';
});

function resetPurchaseForm(): void {
  purchaseForm.name       = '';
  purchaseForm.amount     = 0;
  purchaseForm.date       = today.toISOString().split('T')[0];
  purchaseForm.category   = categoryOptions.value[0] ?? 'Other';
  purchaseForm.budgetType = 'wants';
  purchaseForm.cardId     = null;
  editingPurchaseId.value = null;
}

function openAddPurchase(): void {
  resetPurchaseForm();
  showPurchaseModal.value = true;
}

function openEditPurchase(id: string): void {
  const p = budget.purchases.find(x => x.id === id);
  if (!p) return;
  purchaseForm.name       = p.name;
  purchaseForm.amount     = p.amount;
  purchaseForm.date       = p.date ?? '';
  purchaseForm.category   = p.category || 'Other';
  purchaseForm.budgetType = (p.budgetType as 'wants' | 'needs') || 'wants';
  purchaseForm.cardId     = p.cardId;
  editingPurchaseId.value = id;
  showPurchaseModal.value = true;
}

function savePurchase(): void {
  if (purchaseFormError.value) return;
  const payload = {
    name:       purchaseForm.name.trim(),
    amount:     purchaseForm.amount,
    date:       (purchaseForm.date || undefined) as ISODate | undefined,
    category:   purchaseForm.category,
    budgetType: purchaseForm.budgetType,
    cardId:     purchaseForm.cardId,
  };
  if (editingPurchaseId.value) {
    budget.updatePurchase(editingPurchaseId.value, payload);
    toast.show('Purchase updated.', 'success');
  } else {
    budget.addPurchase(payload);
    toast.show('Purchase added.', 'success');
  }
  showPurchaseModal.value = false;
  resetPurchaseForm();
}

function deletePurchase(id: string): void {
  const p = budget.purchases.find(x => x.id === id);
  if (!p) return;
  if (!window.confirm(`Delete "${p.name}"?`)) return;
  budget.deletePurchase(id);
  toast.show('Purchase deleted.', 'success');
  // Close the modal if delete was triggered from inside it
  showPurchaseModal.value = false;
  resetPurchaseForm();
}
</script>

<template>
  <div class="page-spending">

    <!-- ── Page header ─────────────────────────────────────────── -->
    <div class="spend-header">
      <div>
        <div class="spend-eyebrow">Spending</div>
        <h1 class="spend-title">
          {{ pageTitle }}
        </h1>
      </div>

      <div class="spend-header-actions">
        <template v-if="spendingPeriod">
          <button
            class="period-nav-btn"
            @click="goPrev"
          >
            ‹ Prev period
          </button>
          <button
            class="period-nav-btn period-nav-btn--current"
            @click="goCurrent"
          >
            Current
          </button>
          <button
            class="period-nav-btn"
            :disabled="spendingOffset >= 0"
            @click="goNext"
          >
            Next period ›
          </button>
        </template>
        <button
          class="period-nav-btn period-nav-btn--export"
          @click="handleExport"
        >
          Export CSV
        </button>
      </div>
    </div>

    <!-- ── KPI tiles ───────────────────────────────────────────── -->
    <div class="spend-kpi-row">
      <!-- "Spent this period" — inline so it can host the Wants/Needs toggle -->
      <div class="spend-stat-typed">
        <div class="spend-stat-typed__header">
          <span class="spend-stat-typed__label">Spent this period</span>
          <div class="donut-type-toggle">
            <button
              class="dtt-btn"
              :class="{ 'dtt-btn--active': donutTypeFilter === 'wants' }"
              @click="donutTypeFilter = 'wants'"
            >
              🛍 Wants
            </button>
            <button
              class="dtt-btn"
              :class="{ 'dtt-btn--active': donutTypeFilter === 'needs' }"
              @click="donutTypeFilter = 'needs'"
            >
              🏠 Needs
            </button>
          </div>
        </div>
        <div class="spend-stat-typed__value">
          {{ fmt(wantsSpentInPeriod) }}
        </div>
        <div
          v-if="donutBudget > 0"
          class="spend-stat-typed__hint"
        >
          of {{ fmt(donutBudget) }} {{ donutTypeFilter }} budget
        </div>
      </div>
      <StatCard
        label="Daily average"
        :value="fmt(dailyAvg)"
        :hint="`over ${daysElapsed} day${daysElapsed !== 1 ? 's' : ''}`"
      />
      <StatCard
        :label="topCategoryInfo ? 'Top category' : 'Top category'"
        :value="topCategoryInfo?.name ?? '—'"
        :hint="topCategoryInfo ? `${fmt(topCategoryInfo.amount)} · ${topCategoryInfo.pct}%` : 'No purchases yet'"
      />
      <StatCard
        label="Days left"
        :value="String(daysLeft)"
        hint="until period ends"
      />
    </div>

    <!-- ── Donut + daily bars ──────────────────────────────────── -->
    <div
      v-if="spendingPeriod && purchasesInPeriod.length > 0"
      class="spend-charts-row"
    >
      <!-- Category donut — type driven by the "Spent this period" toggle above -->
      <BaseCard class="spend-donut-card">
        <div class="spend-section-eyebrow">
          By category
        </div>
        <div class="spend-donut-total">
          {{ fmt(wantsSpentInPeriod) }}
        </div>
        <p class="spend-donut-hint">
          {{ donutTypeFilter === 'needs' ? 'Needs purchases only' : 'Wants purchases only' }}
        </p>
        <WantsDonut
          :category-spending="categorySpending"
          :remaining="Math.max(0, remainingBudget)"
          :used-pct="usedPct"
          :category-colors="categoryColorMap"
        />
      </BaseCard>

      <!-- Daily spend bars -->
      <BaseCard class="spend-bars-card">
        <div class="spend-bars-header">
          <div>
            <div class="spend-section-eyebrow">
              Daily spend
            </div>
            <div class="spend-bars-subtitle">
              This period
            </div>
          </div>
          <div class="spend-bars-max">
            MAX {{ fmt(dailyMax) }}
          </div>
        </div>

        <div class="spend-bars">
          <div
            v-for="(bar, i) in dailyBars"
            :key="i"
            class="spend-bar-col"
          >
            <div class="spend-bar-amt">
              <template v-if="bar.total > 0">{{ fmt(bar.total) }}</template>
            </div>
            <!-- Stacked bar: wants (bottom, accent) + needs (top, danger) -->
            <div class="spend-bar-track">
              <template v-if="bar.total > 0">
                <div
                  v-if="bar.wants > 0"
                  class="spend-bar-fill spend-bar-fill--wants"
                  :style="{ height: `${(bar.wants / dailyMax) * 100}%` }"
                />
                <div
                  v-if="bar.needs > 0"
                  class="spend-bar-fill spend-bar-fill--needs"
                  :style="{ height: `${(bar.needs / dailyMax) * 100}%` }"
                />
              </template>
              <div
                v-else
                class="spend-bar-fill spend-bar-fill--empty"
              />
            </div>
            <div class="spend-bar-label">
              {{ bar.label }}
            </div>
          </div>
        </div>

        <!-- Bar chart legend -->
        <div class="spend-bars-legend">
          <span class="spend-bars-legend__item">
            <span class="spend-bars-legend__dot spend-bars-legend__dot--wants" />
            Wants
          </span>
          <span class="spend-bars-legend__item">
            <span class="spend-bars-legend__dot spend-bars-legend__dot--needs" />
            Needs
          </span>
        </div>
      </BaseCard>
    </div>

    <!-- ── All purchases table ─────────────────────────────────── -->
    <BaseCard>
      <!-- Card header -->
      <div class="purchases-card-header">
        <div>
          <div class="spend-section-eyebrow">
            All purchases
          </div>
          <div class="purchases-count">
            {{ totalFiltered }} of {{ totalAll }}
            <span class="purchases-count__total">· {{ fmt(filteredAmountTotal) }}</span>
          </div>
        </div>

        <div class="purchases-controls">
          <!-- Add purchase button -->
          <BaseButton
            size="sm"
            @click="openAddPurchase"
          >
            + Add
          </BaseButton>

          <!-- Pill search -->
          <div
            class="search-pill"
            :class="{ 'search-pill--active': searchQuery.length > 0 }"
          >
            <svg
              class="search-icon"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              :stroke="searchQuery ? 'var(--accent)' : 'var(--muted)'"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle
                cx="11"
                cy="11"
                r="8"
              />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              v-model="searchQuery"
              class="search-input"
              placeholder="Search purchases…"
              aria-label="Search purchases"
            >
            <button
              v-if="searchQuery"
              class="search-clear"
              aria-label="Clear search"
              @click="searchQuery = ''"
            >
              ×
            </button>
          </div>

          <!-- Sort dropdown -->
          <select
            v-model="sortKey"
            class="sort-select"
            aria-label="Sort purchases"
          >
            <option value="newest">
              Newest first
            </option>
            <option value="oldest">
              Oldest first
            </option>
            <option value="amtHigh">
              Amount: high → low
            </option>
            <option value="amtLow">
              Amount: low → high
            </option>
            <option value="nameAZ">
              Name A–Z
            </option>
          </select>
        </div>
      </div>

      <!-- Type filter chips (All / Wants / Needs) -->
      <div class="cat-chips cat-chips--type">
        <button
          class="cat-chip"
          :class="{ 'cat-chip--active': typeFilter === '' }"
          @click="typeFilter = ''"
        >
          All
        </button>
        <button
          class="cat-chip"
          :class="{ 'cat-chip--active': typeFilter === 'wants' }"
          :style="typeFilter === 'wants' ? { background: 'var(--accent)22', borderColor: 'var(--accent)', color: 'var(--accent)' } : {}"
          @click="typeFilter = typeFilter === 'wants' ? '' : 'wants'"
        >
          🛍 Wants
        </button>
        <button
          class="cat-chip"
          :class="{ 'cat-chip--active': typeFilter === 'needs' }"
          :style="typeFilter === 'needs' ? { background: 'var(--danger, #f87171)22', borderColor: 'var(--danger, #f87171)', color: 'var(--danger, #f87171)' } : {}"
          @click="typeFilter = typeFilter === 'needs' ? '' : 'needs'"
        >
          🏠 Needs
        </button>
      </div>

      <!-- Category chips -->
      <div
        v-if="activeCategories.length > 0"
        class="cat-chips"
      >
        <button
          class="cat-chip"
          :class="{ 'cat-chip--active': catFilter === '' }"
          @click="catFilter = ''"
        >
          All
        </button>
        <button
          v-for="cat in activeCategories"
          :key="cat"
          class="cat-chip"
          :class="{ 'cat-chip--active': catFilter === cat }"
          :style="catFilter === cat ? { background: catColor(cat) + '22', borderColor: catColor(cat), color: catColor(cat) } : {}"
          @click="catFilter = catFilter === cat ? '' : cat"
        >
          <span
            class="cat-chip-dot"
            :style="{ background: catColor(cat) }"
          />
          {{ cat }}
        </button>
      </div>

      <!-- Purchases table -->
      <div class="purchases-table-wrap">
        <table class="purchases-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Category</th>
              <th>Type</th>
              <th>Card</th>
              <th class="col-amt">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Dated period purchases (click row to edit) -->
            <tr
              v-for="p in filteredPurchases"
              :key="p.id"
              class="purchase-row purchase-row--clickable"
              tabindex="0"
              role="button"
              :aria-label="`Edit purchase: ${p.name}`"
              @click="openEditPurchase(p.id)"
              @keydown.enter.prevent="openEditPurchase(p.id)"
              @keydown.space.prevent="openEditPurchase(p.id)"
            >
              <td class="col-date">
                {{ formatDate(p.date) }}
              </td>
              <td class="col-name">
                {{ p.name }}
              </td>
              <td class="col-cat">
                <span
                  class="cat-badge"
                  :style="{
                    background: catColor(p.category) + '22',
                    color: catColor(p.category),
                  }"
                >
                  <span
                    class="cat-badge-dot"
                    :style="{ background: catColor(p.category) }"
                  />
                  {{ p.category || 'Other' }}
                </span>
              </td>
              <td class="col-type">
                <span
                  class="type-badge"
                  :class="p.budgetType === 'needs' ? 'type-badge--needs' : 'type-badge--wants'"
                >
                  {{ p.budgetType === 'needs' ? 'Need' : 'Want' }}
                </span>
              </td>
              <td class="col-card">
                <span
                  v-if="cardLabel(p.cardId)"
                  class="card-label"
                >{{ cardLabel(p.cardId) }}</span>
                <span
                  v-else
                  class="col-muted"
                >—</span>
              </td>
              <td class="col-amt">
                {{ fmt(p.amount) }}
              </td>
            </tr>

            <!-- Undated purchases (always shown at bottom) -->
            <template v-if="filteredUndated.length > 0">
              <tr class="undated-divider-row">
                <td
                  colspan="6"
                  class="undated-divider-label"
                >
                  No date
                </td>
              </tr>
              <tr
                v-for="p in filteredUndated"
                :key="`ud-${p.id}`"
                class="purchase-row purchase-row--undated purchase-row--clickable"
                tabindex="0"
                role="button"
                :aria-label="`Edit purchase: ${p.name}`"
                @click="openEditPurchase(p.id)"
                @keydown.enter.prevent="openEditPurchase(p.id)"
                @keydown.space.prevent="openEditPurchase(p.id)"
              >
                <td class="col-date col-muted">
                  —
                </td>
                <td class="col-name">
                  {{ p.name }}
                </td>
                <td class="col-cat">
                  <span
                    class="cat-badge"
                    :style="{
                      background: catColor(p.category) + '22',
                      color: catColor(p.category),
                    }"
                  >
                    <span
                      class="cat-badge-dot"
                      :style="{ background: catColor(p.category) }"
                    />
                    {{ p.category || 'Other' }}
                  </span>
                </td>
                <td class="col-type">
                  <span
                    class="type-badge"
                    :class="p.budgetType === 'needs' ? 'type-badge--needs' : 'type-badge--wants'"
                  >
                    {{ p.budgetType === 'needs' ? 'Need' : 'Want' }}
                  </span>
                </td>
                <td class="col-card">
                  <span
                    v-if="cardLabel(p.cardId)"
                    class="card-label"
                  >{{ cardLabel(p.cardId) }}</span>
                  <span
                    v-else
                    class="col-muted"
                  >—</span>
                </td>
                <td class="col-amt">
                  {{ fmt(p.amount) }}
                </td>
              </tr>
            </template>

            <!-- Empty state row -->
            <tr v-if="filteredPurchases.length === 0 && filteredUndated.length === 0">
              <td
                colspan="6"
                class="empty-row"
              >
                <template v-if="searchQuery || catFilter">
                  No purchases match your filters.
                </template>
                <template v-else>
                  No purchases recorded for this period yet.
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- ── Add / Edit purchase modal ──────────────────────────── -->
    <BaseModal
      v-model:open="showPurchaseModal"
      :title="editingPurchaseId ? 'Edit Purchase' : 'Add Purchase'"
      size="sm"
    >
      <div class="modal-form">
        <!-- Name + Amount -->
        <div class="mf-row-2">
          <div class="mf-group">
            <label
              class="mf-label"
              for="sp-name"
            >Item name</label>
            <input
              id="sp-name"
              v-model="purchaseForm.name"
              class="mf-input"
              type="text"
              placeholder="e.g. Coffee"
            >
          </div>
          <div class="mf-group">
            <label
              class="mf-label"
              for="sp-amount"
            >Amount ($)</label>
            <input
              id="sp-amount"
              v-model.number="purchaseForm.amount"
              class="mf-input"
              type="number"
              inputmode="decimal"
              min="0.01"
              step="0.01"
            >
          </div>
        </div>

        <!-- Date + Category -->
        <div class="mf-row-2">
          <div class="mf-group">
            <label
              class="mf-label"
              for="sp-date"
            >Date</label>
            <input
              id="sp-date"
              v-model="purchaseForm.date"
              class="mf-input"
              type="date"
            >
          </div>
          <div class="mf-group">
            <label
              class="mf-label"
              for="sp-cat"
            >Category</label>
            <select
              id="sp-cat"
              v-model="purchaseForm.category"
              class="mf-input"
            >
              <option
                v-for="cat in categoryOptions"
                :key="cat"
                :value="cat"
              >
                {{ cat }}
              </option>
            </select>
          </div>
        </div>

        <!-- Type toggle -->
        <div class="mf-group">
          <label class="mf-label">Purchase type</label>
          <div class="mf-type-row">
            <button
              class="mf-type-btn"
              :class="{ 'mf-type-btn--wants': purchaseForm.budgetType === 'wants' }"
              type="button"
              @click="purchaseForm.budgetType = 'wants'"
            >
              🛍 Want
            </button>
            <button
              class="mf-type-btn"
              :class="{ 'mf-type-btn--needs': purchaseForm.budgetType === 'needs' }"
              type="button"
              @click="purchaseForm.budgetType = 'needs'"
            >
              🏠 Need
            </button>
          </div>
        </div>

        <!-- Card -->
        <div class="mf-group">
          <label
            class="mf-label"
            for="sp-card"
          >Card</label>
          <select
            id="sp-card"
            v-model="purchaseForm.cardId"
            class="mf-input"
          >
            <option :value="null">
              No card
            </option>
            <option
              v-for="card in budget.expenseCards"
              :key="card.id"
              :value="card.id"
            >
              {{ card.label }}
            </option>
          </select>
        </div>

        <p
          v-if="purchaseFormError"
          class="mf-error"
        >
          {{ purchaseFormError }}
        </p>
      </div>

      <template #footer>
        <!-- Delete button — only visible when editing an existing purchase -->
        <BaseButton
          v-if="editingPurchaseId"
          variant="danger"
          class="mf-footer-delete"
          @click="deletePurchase(editingPurchaseId)"
        >
          Delete
        </BaseButton>
        <div class="mf-footer-spacer" />
        <BaseButton
          variant="secondary"
          @click="showPurchaseModal = false; resetPurchaseForm()"
        >
          Cancel
        </BaseButton>
        <BaseButton
          :disabled="!!purchaseFormError"
          @click="savePurchase"
        >
          {{ editingPurchaseId ? 'Update' : 'Add' }}
        </BaseButton>
      </template>
    </BaseModal>

  </div>
</template>

<style scoped>
.page-spending {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Page header ───────────────────────────────────────────────── */
.spend-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.spend-eyebrow {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 600;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}

.spend-title {
  margin: 0;
  font-size: clamp(1.4rem, 4vw, 1.75rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.spend-header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.period-nav-btn {
  padding: 7px 13px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.8rem;
  color: var(--text);
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
  transition: background 0.12s, border-color 0.12s;
  white-space: nowrap;
}

.period-nav-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.period-nav-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.period-nav-btn--current {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.period-nav-btn--export {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 700;
}

.period-nav-btn--export:hover {
  background: var(--accent-btn, #4a2fd4);
  border-color: var(--accent-btn, #4a2fd4);
  color: #fff;
}

/* ── KPI row ─────────────────────────────────────────────────── */
.spend-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

@media (max-width: 700px) {
  .spend-kpi-row { grid-template-columns: repeat(2, 1fr); }
}

/* ── Charts row ──────────────────────────────────────────────── */
.spend-charts-row {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 0.75rem;
  align-items: start;
}

@media (max-width: 700px) {
  .spend-charts-row { grid-template-columns: 1fr; }
}

.spend-donut-card,
.spend-bars-card {
  min-width: 0;
}

.spend-section-eyebrow {
  font-size: 0.72rem;
  color: var(--muted);
  font-weight: 600;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}

.spend-donut-total {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 0.2rem;
}

.spend-donut-hint {
  font-size: 0.68rem;
  color: var(--muted);
  margin: 0 0 0.75rem;
  font-style: italic;
}

/* ── Daily bars ──────────────────────────────────────────────── */
.spend-bars-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 1rem;
}

.spend-bars-subtitle {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.spend-bars-max {
  font-size: 0.68rem;
  color: var(--muted);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.spend-bars {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 140px;
  padding-bottom: 24px;
  position: relative;
}

.spend-bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.spend-bar-amt {
  font-size: 0.58rem;
  color: var(--muted);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-bottom: 3px;
  min-height: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
}

/* Stacked bar track — column-reverse puts wants at bottom, needs on top */
.spend-bar-track {
  width: 100%;
  max-width: 22px;
  height: 90px;
  display: flex;
  flex-direction: column-reverse;
  align-items: stretch;
  overflow: hidden;
  border-radius: 4px 4px 0 0;
}

.spend-bar-fill {
  width: 100%;
  transition: height 0.3s ease;
  flex-shrink: 0;
}

.spend-bar-fill--wants { background: var(--accent); }
.spend-bar-fill--needs { background: var(--danger, #f87171); }
.spend-bar-fill--empty { height: 4%; background: var(--border); }

.spend-bar-label {
  position: absolute;
  bottom: -20px;
  font-size: 0.55rem;
  color: var(--muted);
  font-weight: 600;
  white-space: nowrap;
  text-align: center;
}

/* Bar chart legend */
.spend-bars-legend {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.spend-bars-legend__item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: var(--muted);
  font-weight: 600;
}

.spend-bars-legend__dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.spend-bars-legend__dot--wants { background: var(--accent); }
.spend-bars-legend__dot--needs { background: var(--danger, #f87171); }

/* ── Purchases card ──────────────────────────────────────────── */
.purchases-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.purchases-count {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.purchases-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

/* ── Pill search ─────────────────────────────────────────────── */
.search-pill {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 5px 10px 5px 28px;
  position: relative;
  min-width: 200px;
  transition: border-color 0.15s;
}

.search-pill--active {
  border-color: var(--accent);
}

.search-icon {
  position: absolute;
  left: 9px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 0.8rem;
  font-family: inherit;
  padding: 0;
  min-width: 0;
}

.search-input::placeholder {
  color: var(--muted);
}

.search-clear {
  background: transparent;
  border: none;
  font-size: 1rem;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  padding: 0 2px;
  border-radius: 3px;
  transition: color 0.1s;
  flex-shrink: 0;
}

.search-clear:hover {
  color: var(--text);
}

/* ── Sort dropdown ───────────────────────────────────────────── */
.sort-select {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text);
  font-size: 0.8rem;
  font-family: inherit;
  padding: 5px 10px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.12s;
}

.sort-select:focus {
  border-color: var(--accent);
}

/* ── Category chips ──────────────────────────────────────────── */
.cat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 0.75rem;
}

.cat-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.cat-chip--active {
  background: var(--border);
  color: var(--text);
  border-color: var(--border);
}

.cat-chip:hover:not(.cat-chip--active) {
  border-color: var(--text);
  color: var(--text);
}

.cat-chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Purchases table ─────────────────────────────────────────── */
.purchases-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 -0.1rem;
}

.purchases-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  min-width: 480px;
}

.purchases-table thead th {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0.4rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.purchase-row td {
  padding: 0.5rem 0.5rem;
  border-bottom: 1px solid var(--border-light, rgba(42, 48, 65, 0.3));
  vertical-align: middle;
}

.purchase-row:last-child td {
  border-bottom: none;
}

.purchase-row--undated td {
  opacity: 0.8;
}

.purchase-row:hover td {
  background: rgba(255, 255, 255, 0.02);
}

.purchase-row--clickable {
  cursor: pointer;
}

.purchase-row--clickable:hover td {
  background: color-mix(in srgb, var(--accent, #5b3df5) 6%, transparent);
}

.purchase-row--clickable:hover td:first-child {
  box-shadow: inset 3px 0 0 var(--accent, #5b3df5);
}

.purchase-row--clickable:focus-visible td {
  background: color-mix(in srgb, var(--accent, #5b3df5) 10%, transparent);
}

.purchase-row--clickable:focus-visible td:first-child {
  box-shadow: inset 3px 0 0 var(--accent, #5b3df5);
}

.purchase-row--clickable:focus-visible {
  outline: none;
}

/* Table column widths */
.col-date  { white-space: nowrap; font-size: 0.75rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.col-name  { font-weight: 600; }
.col-cat   { white-space: nowrap; }
.col-card  { white-space: nowrap; font-size: 0.75rem; }
.col-amt   { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.col-muted { color: var(--muted); }

/* ── Category badge in table ─────────────────────────────────── */
.cat-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
}

.cat-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Type badge in table ─────────────────────────────────────────── */
.col-type { white-space: nowrap; }

.type-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
}

.type-badge--wants {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
}

.type-badge--needs {
  background: color-mix(in srgb, var(--danger, #f87171) 14%, transparent);
  color: var(--danger, #f87171);
}

/* ── Type filter chips separator ────────────────────────────────── */
.cat-chips--type {
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.35rem;
}

.card-label {
  font-size: 0.7rem;
  color: var(--muted);
  background: var(--surface2);
  padding: 1px 6px;
  border-radius: 3px;
}

/* ── Undated divider row ─────────────────────────────────────── */
.undated-divider-row td {
  padding: 0;
}

.undated-divider-label {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0.6rem 0.5rem 0.25rem !important;
  border-bottom: 1px solid var(--border);
}

/* ── Empty state row ─────────────────────────────────────────── */
.empty-row {
  text-align: center;
  color: var(--muted);
  font-size: 0.82rem;
  padding: 2rem !important;
}

/* ── Filtered total in header ────────────────────────────────────── */
.purchases-count__total {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--muted);
  margin-left: 0.15rem;
}

/* ── "Spent this period" stat card with inline toggle ────────────── */
.spend-stat-typed {
  background: var(--surface, #16161e);
  border: 1px solid var(--border, #2a3041);
  border-radius: 8px;
  padding: 0.85rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.spend-stat-typed__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.spend-stat-typed__label {
  font-size: clamp(0.65rem, 1.8vw, 0.7rem);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted, #8b8b95);
  font-weight: 600;
}

.spend-stat-typed__value {
  font-size: clamp(1.2rem, 4.5vw, 1.45rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text, #e3e6ee);
  font-variant-numeric: tabular-nums;
}

.spend-stat-typed__hint {
  font-size: 0.78rem;
  color: var(--muted, #8b8b95);
}

.donut-type-toggle {
  display: flex;
  gap: 3px;
}

.dtt-btn {
  padding: 3px 9px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  white-space: nowrap;
}

.dtt-btn--active {
  background: color-mix(in srgb, var(--accent, #5b3df5) 12%, transparent);
  border-color: var(--accent, #5b3df5);
  color: var(--accent, #5b3df5);
}

.dtt-btn:not(.dtt-btn--active):hover {
  background: var(--surface2);
  color: var(--text);
}

/* ── Modal footer layout (delete left, cancel+save right) ─────────── */
.mf-footer-delete {
  margin-right: auto;
}

.mf-footer-spacer {
  flex: 1;
}

/* ── Add/Edit modal form ─────────────────────────────────────────── */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mf-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 480px) {
  .mf-row-2 { grid-template-columns: 1fr; }
}

.mf-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.mf-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.mf-input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.45rem 0.65rem;
  font-size: 0.9rem;
  color: var(--text);
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.mf-input:focus {
  outline: none;
  border-color: var(--accent);
}

.mf-type-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.mf-type-btn {
  padding: 0.5rem 0;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--muted);
  font-family: inherit;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.mf-type-btn:hover:not(.mf-type-btn--wants):not(.mf-type-btn--needs) {
  border-color: var(--text);
  color: var(--text);
}

.mf-type-btn--wants {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}

.mf-type-btn--needs {
  background: color-mix(in srgb, var(--danger, #f87171) 12%, transparent);
  border-color: var(--danger, #f87171);
  color: var(--danger, #f87171);
}

.mf-error {
  font-size: 0.8rem;
  color: var(--danger, #f87171);
  margin: 0;
}
</style>
