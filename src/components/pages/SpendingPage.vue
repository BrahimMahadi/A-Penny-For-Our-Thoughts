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
import { computed, ref } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useAnalytics } from '@/composables/useAnalytics';
import { getPayPeriodForecast, getCategorySpending } from '@/utils/calculations';
import { CATEGORY_FALLBACK_COLOR } from '@/data/categories';
import WantsDonut from '@/components/charts/WantsDonut.vue';
import StatCard from '@/components/ui/StatCard.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import { fmt } from '@/utils/format';
import type { Purchase, ISODate } from '@/types/budget';

const budget = useBudgetStore();
const { totalMonthlyIncome } = useAnalytics();

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

// ─── Donut chart ─────────────────────────────────────────────────
const categorySpending = computed(() => getCategorySpending(purchasesInPeriod.value));

const categoryColorMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  budget.$state.spendingCategories.forEach(c => { map[c.name] = c.color; });
  return map;
});

const remainingBudget = computed(() =>
  wantsBudgetPerPeriod.value - totalSpentInPeriod.value,
);

const usedPct = computed(() => {
  if (wantsBudgetPerPeriod.value <= 0) return 0;
  return (totalSpentInPeriod.value / wantsBudgetPerPeriod.value) * 100;
});

// ─── Daily spend bars ─────────────────────────────────────────────
interface DailyBar {
  label: string;
  total: number;
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
    const total = purchasesInPeriod.value
      .filter(p => p.date === iso)
      .reduce((s, p) => s + p.amount, 0);
    bars.push({ label: `${dow} ${day}`, total });
  }
  return bars;
});

const dailyMax = computed(() => Math.max(...dailyBars.value.map(b => b.total), 1));

// ─── Search / filter / sort ───────────────────────────────────────
const searchQuery  = ref('');
const catFilter    = ref('');
const sortKey      = ref<'newest' | 'oldest' | 'amtHigh' | 'amtLow' | 'nameAZ'>('newest');

/** All categories that appear in current period purchases (sorted by amount). */
const activeCategories = computed(() =>
  Object.entries(categorySpending.value)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([name]) => name),
);

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

/** Dated period purchases after all filters + sort applied. */
const filteredPurchases = computed(() => {
  let items = purchasesInPeriod.value;
  if (catFilter.value) items = items.filter(p => p.category === catFilter.value);
  items = applySearch(items);
  return applySort(items);
});

/** Undated purchases after search + cat filter + sort applied. */
const filteredUndated = computed(() => {
  let items = undatedPurchases.value;
  if (catFilter.value) items = items.filter(p => p.category === catFilter.value);
  items = applySearch(items);
  return applySort(items);
});

const totalFiltered = computed(() =>
  filteredPurchases.value.length + filteredUndated.value.length,
);
const totalAll = computed(() =>
  purchasesInPeriod.value.length + undatedPurchases.value.length,
);
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
      </div>
    </div>

    <!-- ── KPI tiles ───────────────────────────────────────────── -->
    <div class="spend-kpi-row">
      <StatCard
        label="Spent this period"
        :value="fmt(totalSpentInPeriod)"
        :hint="wantsBudgetPerPeriod > 0 ? `of ${fmt(wantsBudgetPerPeriod)} wants budget` : ''"
      />
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
      <!-- Category donut -->
      <BaseCard class="spend-donut-card">
        <div class="spend-section-eyebrow">
          By category
        </div>
        <div class="spend-donut-total">
          {{ fmt(totalSpentInPeriod) }}
        </div>
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
            <div class="spend-bar-track">
              <div
                class="spend-bar-fill"
                :style="{
                  height: bar.total > 0
                    ? `${Math.max((bar.total / dailyMax) * 100, 4)}%`
                    : '4%',
                  background: bar.total > 0 ? 'var(--accent)' : 'var(--border)',
                }"
              />
            </div>
            <div class="spend-bar-label">
              {{ bar.label }}
            </div>
          </div>
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
          </div>
        </div>

        <div class="purchases-controls">
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
              <th>Card</th>
              <th class="col-amt">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Dated period purchases -->
            <tr
              v-for="p in filteredPurchases"
              :key="p.id"
              class="purchase-row"
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
                  colspan="5"
                  class="undated-divider-label"
                >
                  No date
                </td>
              </tr>
              <tr
                v-for="p in filteredUndated"
                :key="`ud-${p.id}`"
                class="purchase-row purchase-row--undated"
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
                colspan="5"
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
  background: rgba(74, 222, 128, 0.08);
  border-color: rgba(74, 222, 128, 0.3);
  color: var(--accent);
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
  margin-bottom: 0.75rem;
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

.spend-bar-track {
  width: 100%;
  max-width: 22px;
  height: 90px;
  display: flex;
  align-items: flex-end;
}

.spend-bar-fill {
  width: 100%;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
}

.spend-bar-label {
  position: absolute;
  bottom: -20px;
  font-size: 0.55rem;
  color: var(--muted);
  font-weight: 600;
  white-space: nowrap;
  text-align: center;
}

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
</style>
