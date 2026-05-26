<!--
  Module:   components/sections/WantsTracker.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Summary:  Bi-weekly wants envelope. Shows the donut chart, period
            anchor, subscription deductions, category breakdown chips,
            and the purchase list with add/edit/delete.
            Mirrors renderWants() + renderPurchaseList().
-->

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useAnalytics } from '@/composables/useAnalytics';
import { useListFilter } from '@/composables/useListFilter';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import ProgressBar from '@/components/ui/ProgressBar.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import WantsDonut from '@/components/charts/WantsDonut.vue';
import { fmt } from '@/utils/format';
import type { Purchase } from '@/types/budget';
import {
  getCategorySpending,
  getCurrentPeriodStart,
  getSubsDeductedThisPeriod,
  getLoansDeductedThisPeriod,
  applyRulesToName,
  getTriggeredAlerts,
} from '@/utils/calculations';
import { CATEGORY_FALLBACK_COLOR } from '@/data/categories';

const budget = useBudgetStore();
const toast  = useToast();
const { totalMonthlyIncome, envelopeForecast } = useAnalytics();

const today = new Date();

// ─── Bi-weekly envelope ───────────────────────────────────────────
const biWeeklyWantsBudget = computed(() =>
  (totalMonthlyIncome.value * (budget.allocation.wants / 100)) / 2,
);

const periodStart = computed(() => getCurrentPeriodStart(budget.$state, today));

const periodStartLabel = computed(() => {
  if (!periodStart.value) return 'Set a pay start date in Settings';
  return new Date(periodStart.value + 'T00:00:00').toLocaleDateString('en-CA', {
    month: 'long',
    day:   'numeric',
    year:  'numeric',
  });
});

// ─── Subscription / loan deductions ──────────────────────────────
const subsDeducted = computed(() => getSubsDeductedThisPeriod(budget.$state, today));
const loansDeducted = computed(() => getLoansDeductedThisPeriod(budget.$state, today));

const subTotal = computed(() =>
  subsDeducted.value.reduce((s, sub) =>
    s + (+sub.amount || 0) * sub.renewalDates.length, 0),
);
const loanTotal = computed(() =>
  loansDeducted.value.reduce((s, loan) =>
    s + (+loan.paymentAmount || 0) * loan.renewalDates.length, 0),
);
const deductionTotal = computed(() => subTotal.value + loanTotal.value);

// ─── Category spending + totals ───────────────────────────────────
const categorySpending = computed(() => getCategorySpending(budget.purchases));

const totalSpent = computed(() =>
  budget.purchases
    .filter(p => (p.budgetType || 'wants') === 'wants')
    .reduce((s, p) => s + p.amount, 0),
);

const remaining = computed(() =>
  biWeeklyWantsBudget.value - totalSpent.value - deductionTotal.value,
);

const usedPct = computed(() => {
  if (biWeeklyWantsBudget.value <= 0) return 0;
  return ((totalSpent.value + deductionTotal.value) / biWeeklyWantsBudget.value) * 100;
});

const progressStatus = computed<'on-track' | 'caution' | 'over'>(() => {
  if (usedPct.value >= 100) return 'over';
  if (usedPct.value >= 80)  return 'caution';
  return 'on-track';
});

// ─── Triggered budget alerts ─────────────────────────────────────
const triggeredAlerts = computed(() => getTriggeredAlerts(budget.$state));

// ─── Category chips ───────────────────────────────────────────────
const categoryChips = computed(() =>
  Object.entries(categorySpending.value)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a),
);

// ─── Purchase CRUD ────────────────────────────────────────────────
const showPurchaseModal = ref(false);
const editingPurchaseId = ref<string | null>(null);

const purchaseForm = reactive({
  name:       '',
  amount:     0,
  category:   'Other' as string,
  budgetType: 'wants' as 'wants' | 'needs',
  cardId:     null as string | null,
});

// ─── Rules auto-categorisation ────────────────────────────────────
// When the user types a purchase name and rules exist, auto-fill the
// category — but only when adding (not editing) and only if a rule
// matches. Must be declared AFTER purchaseForm and editingPurchaseId
// to avoid a temporal dead zone error.
watch(
  () => purchaseForm.name,
  (name) => {
    if (editingPurchaseId.value) return;          // don't override edits
    const matched = applyRulesToName(budget.rules, name);
    if (matched) purchaseForm.category = matched;
  },
);

function resetPurchaseForm(): void {
  purchaseForm.name       = '';
  purchaseForm.amount     = 0;
  purchaseForm.category   = 'Other';
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
  purchaseForm.category   = p.category || 'Other';
  purchaseForm.budgetType = (p.budgetType as 'wants' | 'needs') || 'wants';
  purchaseForm.cardId     = p.cardId;
  editingPurchaseId.value = id;
  showPurchaseModal.value = true;
}

const purchaseFormError = computed<string>(() => {
  if (!purchaseForm.name.trim()) return 'Name is required.';
  if (purchaseForm.amount <= 0)  return 'Amount must be greater than zero.';
  return '';
});

function savePurchase(): void {
  if (purchaseFormError.value) return;
  const payload = {
    name:       purchaseForm.name.trim(),
    amount:     purchaseForm.amount,
    category:   purchaseForm.category,
    budgetType: purchaseForm.budgetType,
    cardId:     purchaseForm.cardId,
    date:       today.toISOString().split('T')[0],
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

function removePurchase(id: string): void {
  const p = budget.purchases.find(x => x.id === id);
  if (!p) return;
  if (!window.confirm(`Delete "${p.name}"?`)) return;
  budget.deletePurchase(id);
  toast.show('Purchase removed.', 'success');
}

// ─── Close period ─────────────────────────────────────────────────
function closePeriod(): void {
  if (!periodStart.value) {
    toast.show('Set a pay start date before closing a period.', 'danger');
    return;
  }
  if (!window.confirm('Close this period? All purchases will be archived to spending history.')) return;
  budget.closeCurrentPeriod(today.toISOString().split('T')[0]);
  toast.show('Period closed and archived.', 'success');
}

// ─── Category colour helper ───────────────────────────────────────
/** Look up the color for a category name from the user-defined list. */
function catColour(cat: string): string {
  return budget.spendingCategories.find(c => c.name === cat)?.color ?? CATEGORY_FALLBACK_COLOR;
}

/**
 * Reactive map of category name → color, passed to WantsDonut so the chart
 * always reflects any user-defined recolours / renames from Category Manager.
 */
const categoryColorMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  budget.spendingCategories.forEach(c => { map[c.name] = c.color; });
  return map;
});

/** Ordered list of category names for dropdowns, with 'Other' always last. */
const categoryOptions = computed(() => budget.spendingCategories.map(c => c.name));

function cardLabel(cardId: string | null): string | null {
  if (!cardId) return null;
  return budget.expenseCards.find(c => c.id === cardId)?.label ?? null;
}

// ─── Search / Sort / Filter (Option B — expandable drawer) ───────
const {
  search:         pSearch,
  catFilter:      pCatFilter,
  typeFilter:     pTypeFilter,
  cardFilter:     pCardFilter,
  sortKey:        pSortKey,
  drawerOpen:     pDrawerOpen,
  activeFilterCount: pActiveFilterCount,
  isFiltered:     pIsFiltered,
  clearFilters:   pClearFilters,
  toggleDrawer:   pToggleDrawer,
  applyFilters:   pApplyFilters,
} = useListFilter('newest');

function sortPurchases(items: Purchase[]): Purchase[] {
  const arr = [...items];
  switch (pSortKey.value) {
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
    case 'amtHigh':
      return arr.sort((a, b) => b.amount - a.amount);
    case 'amtLow':
      return arr.sort((a, b) => a.amount - b.amount);
    case 'nameAZ':
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return arr;
  }
}

const filteredPurchases = computed(() =>
  sortPurchases(pApplyFilters(budget.purchases)),
);

const filteredTotal = computed(() =>
  filteredPurchases.value.reduce((s, p) => s + p.amount, 0),
);
</script>

<template>
  <div class="wants-tracker">
    <!-- Budget alert banners -->
    <div
      v-if="triggeredAlerts.length"
      class="wants-tracker__alerts"
      role="alert"
      aria-live="polite"
    >
      <div
        v-for="alert in triggeredAlerts"
        :key="alert.id"
        class="wants-tracker__alert-item"
      >
        ⚠ <strong>{{ alert.category }}</strong>
        spending exceeded threshold — {{ fmt(alert.spent) }} spent
        (limit: {{ fmt(alert.threshold) }})
      </div>
    </div>

    <!-- Envelope header row -->
    <div class="wants-tracker__header">
      <div class="wants-tracker__period">
        <span class="wants-tracker__period-label">Period from</span>
        <span class="wants-tracker__period-date">{{ periodStartLabel }}</span>
      </div>
      <BaseButton
        size="sm"
        variant="secondary"
        @click="closePeriod"
      >
        Close Period
      </BaseButton>
    </div>

    <!-- Main content: donut + stats -->
    <div class="wants-tracker__content">
      <!-- Donut chart -->
      <div class="wants-tracker__donut">
        <WantsDonut
          :category-spending="categorySpending"
          :remaining="Math.max(0, remaining)"
          :used-pct="usedPct"
          :category-colors="categoryColorMap"
        />
      </div>

      <!-- Stats column -->
      <div class="wants-tracker__stats">
        <!-- Envelope budget -->
        <div class="wants-stat-row">
          <span class="wants-stat-label">Bi-weekly budget</span>
          <span class="wants-stat-value accent">{{ fmt(biWeeklyWantsBudget) }}</span>
        </div>

        <!-- Subscription deductions -->
        <div
          v-if="deductionTotal > 0"
          class="wants-stat-row"
        >
          <span class="wants-stat-label">— Subscriptions / Loans</span>
          <span class="wants-stat-value text-muted">-{{ fmt(deductionTotal) }}</span>
        </div>

        <!-- Purchases total -->
        <div class="wants-stat-row">
          <span class="wants-stat-label">— Purchases</span>
          <span class="wants-stat-value">-{{ fmt(totalSpent) }}</span>
        </div>

        <div class="wants-stat-divider" />

        <!-- Remaining -->
        <div class="wants-stat-row">
          <span class="wants-stat-label">Remaining</span>
          <span
            class="wants-stat-value wants-stat-remaining"
            :class="{ 'text-danger': remaining < 0 }"
          >
            {{ fmt(remaining) }}
          </span>
        </div>

        <!-- Progress bar -->
        <ProgressBar
          :percent="usedPct"
          :status="progressStatus"
          size="sm"
          :aria-label="`Wants budget ${usedPct.toFixed(0)}% used`"
        />
        <p class="wants-pct-label">
          {{ usedPct.toFixed(0) }}% of bi-weekly budget used
        </p>

        <!-- Envelope forecast (B1) -->
        <div
          v-if="envelopeForecast.hasData"
          class="envelope-forecast"
          :class="`envelope-forecast--${envelopeForecast.status}`"
        >
          <span class="envelope-forecast__label">At this pace</span>
          <span class="envelope-forecast__value">
            {{ fmt(envelopeForecast.projectedTotal) }} by end of period
          </span>
          <span class="envelope-forecast__detail">
            {{ envelopeForecast.daysRemaining }} day{{ envelopeForecast.daysRemaining !== 1 ? 's' : '' }} left ·
            {{ fmt(envelopeForecast.dailyRate) }}/day
          </span>
        </div>
      </div>
    </div>

    <!-- Category chips -->
    <div
      v-if="categoryChips.length > 0"
      class="category-chips"
    >
      <div
        v-for="[cat, amount] in categoryChips"
        :key="cat"
        class="category-chip"
        :style="{
          background: catColour(cat) + '20',
          color: catColour(cat),
        }"
      >
        {{ cat }}: {{ fmt(amount) }}
      </div>
    </div>

    <!-- Subscription deduction rows -->
    <div
      v-if="subsDeducted.length > 0"
      class="sub-deductions"
    >
      <div class="sub-deductions__title">
        Deducted this period
      </div>
      <div
        v-for="sub in subsDeducted"
        :key="sub.id"
        class="sub-deduction-row"
      >
        <span class="sub-deduction-icon">↻</span>
        <span class="sub-deduction-name">{{ sub.name }}</span>
        <span class="sub-deduction-freq">{{ sub.frequency }}</span>
        <span class="sub-deduction-amt">{{ fmt(+sub.amount * sub.renewalDates.length) }}</span>
      </div>
    </div>

    <!-- Purchase list header -->
    <div class="purchase-list-header">
      <span class="purchase-list-title">Purchases this period</span>
      <BaseButton
        size="sm"
        @click="openAddPurchase"
      >
        + Add Purchase
      </BaseButton>
    </div>

    <!-- Search / Sort / Filter toolbar (Option B — expandable drawer) -->
    <div
      v-if="budget.purchases.length > 0"
      class="filter-toolbar"
      data-testid="purchase-filter-toolbar"
    >
      <!-- Top row: search · Filters button · Sort -->
      <div class="filter-toolbar__top">
        <div class="filter-toolbar__search-wrap">
          <svg
            class="filter-toolbar__search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"
          ><circle
            cx="11"
            cy="11"
            r="8"
          /><path d="m21 21-4.35-4.35" /></svg>
          <input
            id="p-search"
            v-model="pSearch"
            class="filter-toolbar__search"
            type="text"
            placeholder="Search purchases…"
            autocomplete="off"
            aria-label="Search purchases"
          >
        </div>
        <button
          class="filter-toolbar__filter-btn"
          :class="{ 'filter-toolbar__filter-btn--active': pDrawerOpen || pActiveFilterCount > 0 }"
          :aria-expanded="pDrawerOpen"
          aria-controls="p-filter-drawer"
          @click="pToggleDrawer"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"
          ><path d="M3 6h18M7 12h10M11 18h2" /></svg>
          Filters
          <span
            v-if="pActiveFilterCount > 0"
            class="filter-toolbar__badge"
            aria-label="`${pActiveFilterCount} filters active`"
          >{{ pActiveFilterCount }}</span>
        </button>
        <select
          id="p-sort"
          v-model="pSortKey"
          class="filter-toolbar__sort"
          aria-label="Sort purchases"
        >
          <option value="newest">
            Newest first
          </option>
          <option value="oldest">
            Oldest first
          </option>
          <option value="amtHigh">
            Amount ↓
          </option>
          <option value="amtLow">
            Amount ↑
          </option>
          <option value="nameAZ">
            Name A–Z
          </option>
        </select>
      </div>

      <!-- Expandable filter drawer -->
      <div
        id="p-filter-drawer"
        class="filter-toolbar__drawer-wrap"
        :class="{ 'filter-toolbar__drawer-wrap--open': pDrawerOpen }"
      >
        <div class="filter-toolbar__drawer-inner">
          <div class="filter-toolbar__drawer">
            <div class="filter-toolbar__filter-group">
              <label
                class="filter-toolbar__filter-label"
                for="p-filter-cat"
              >
                <span
                  v-if="pCatFilter"
                  class="filter-active-dot"
                />
                Category
              </label>
              <select
                id="p-filter-cat"
                v-model="pCatFilter"
                class="filter-toolbar__filter-select"
                :class="{ 'filter-toolbar__filter-select--active': pCatFilter }"
              >
                <option value="">
                  All categories
                </option>
                <option
                  v-for="cat in categoryOptions"
                  :key="cat"
                  :value="cat"
                >
                  {{ cat }}
                </option>
              </select>
            </div>
            <div class="filter-toolbar__filter-group">
              <label
                class="filter-toolbar__filter-label"
                for="p-filter-type"
              >
                <span
                  v-if="pTypeFilter"
                  class="filter-active-dot"
                />
                Budget type
              </label>
              <select
                id="p-filter-type"
                v-model="pTypeFilter"
                class="filter-toolbar__filter-select"
                :class="{ 'filter-toolbar__filter-select--active': pTypeFilter }"
              >
                <option value="">
                  All types
                </option>
                <option value="wants">
                  Wants
                </option>
                <option value="needs">
                  Needs
                </option>
              </select>
            </div>
            <div class="filter-toolbar__filter-group">
              <label
                class="filter-toolbar__filter-label"
                for="p-filter-card"
              >
                <span
                  v-if="pCardFilter"
                  class="filter-active-dot"
                />
                Card
              </label>
              <select
                id="p-filter-card"
                v-model="pCardFilter"
                class="filter-toolbar__filter-select"
                :class="{ 'filter-toolbar__filter-select--active': pCardFilter }"
              >
                <option value="">
                  All cards
                </option>
                <option
                  v-for="card in budget.expenseCards"
                  :key="card.id"
                  :value="card.label"
                >
                  {{ card.label }}
                </option>
                <option value="none">
                  No card
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Result count -->
      <div
        v-if="pIsFiltered"
        class="filter-toolbar__count"
        data-testid="purchase-filter-count"
        aria-live="polite"
      >
        Showing <strong>{{ filteredPurchases.length }}</strong> of {{ budget.purchases.length }}
        · <strong>{{ fmt(filteredTotal) }}</strong> filtered total
        <button
          class="filter-toolbar__clear"
          @click="pClearFilters"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Empty state for purchases (nudge variant for first-run) -->
    <EmptyState
      v-if="budget.purchases.length === 0"
      icon="🧾"
      title="Nothing spent yet"
      :hint="budget.hasOnboarded
        ? 'Add your first purchase for this bi-weekly period above.'
        : 'Log what you spend here — the donut chart fills as you go, so you always know how much of your bi-weekly Wants budget remains.'"
    >
      <BaseButton
        v-if="!budget.hasOnboarded"
        size="sm"
        @click="openAddPurchase"
      >
        Log your first purchase
      </BaseButton>
    </EmptyState>

    <!-- Filtered empty state -->
    <EmptyState
      v-else-if="filteredPurchases.length === 0"
      icon="🔍"
      title="No purchases match your filters"
      hint="Try adjusting your search or filters."
      data-testid="purchase-no-results"
    >
      <BaseButton
        size="sm"
        variant="secondary"
        @click="pClearFilters"
      >
        Clear filters
      </BaseButton>
    </EmptyState>

    <!-- Purchase list -->
    <ul
      v-else
      class="purchase-list"
    >
      <li
        v-for="p in filteredPurchases"
        :key="p.id"
        class="purchase-item"
      >
        <div class="purchase-item__left">
          <span class="purchase-item__name">{{ p.name }}</span>
          <div class="purchase-item__chips">
            <span
              class="purchase-cat-badge"
              :style="{
                background: catColour(p.category || 'Other') + '20',
                color: catColour(p.category || 'Other'),
              }"
            >
              {{ p.category || 'Other' }}
            </span>
            <span
              class="purchase-budget-chip"
              :class="p.budgetType === 'needs' ? 'chip-needs' : 'chip-wants'"
            >
              {{ p.budgetType === 'needs' ? 'Needs' : 'Wants' }}
            </span>
            <span
              v-if="cardLabel(p.cardId)"
              class="purchase-card-chip"
            >
              ≡ {{ cardLabel(p.cardId) }}
            </span>
          </div>
        </div>
        <div class="purchase-item__right">
          <span class="purchase-item__amount">{{ fmt(p.amount) }}</span>
          <div class="purchase-item__actions">
            <BaseButton
              size="xs"
              variant="secondary"
              @click="openEditPurchase(p.id)"
            >
              Edit
            </BaseButton>
            <BaseButton
              size="xs"
              variant="danger"
              @click="removePurchase(p.id)"
            >
              Delete
            </BaseButton>
          </div>
        </div>
      </li>
    </ul>

    <!-- Add / Edit purchase modal -->
    <BaseModal
      v-model:open="showPurchaseModal"
      :title="editingPurchaseId ? 'Edit Purchase' : 'Add Purchase'"
      size="sm"
    >
      <div class="modal-form">
        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="p-name"
            >Item name</label>
            <input
              id="p-name"
              v-model="purchaseForm.name"
              class="form-input"
              type="text"
              placeholder="e.g. Coffee"
            >
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="p-amount"
            >Amount ($)</label>
            <input
              id="p-amount"
              v-model.number="purchaseForm.amount"
              class="form-input"
              type="number"
              inputmode="decimal"
              min="0.01"
              step="0.01"
            >
          </div>
        </div>

        <div class="form-row-3">
          <div class="form-group">
            <label
              class="form-label"
              for="p-cat"
            >Category</label>
            <select
              id="p-cat"
              v-model="purchaseForm.category"
              class="form-input"
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
          <div class="form-group">
            <label
              class="form-label"
              for="p-budget-type"
            >Budget type</label>
            <select
              id="p-budget-type"
              v-model="purchaseForm.budgetType"
              class="form-input"
            >
              <option value="wants">
                Wants
              </option>
              <option value="needs">
                Needs
              </option>
            </select>
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="p-card"
            >Card</label>
            <select
              id="p-card"
              v-model="purchaseForm.cardId"
              class="form-input"
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
        </div>

        <p
          v-if="purchaseFormError"
          class="form-error"
        >
          {{ purchaseFormError }}
        </p>
      </div>

      <template #footer>
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
.wants-tracker {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ─── Alert banners ──────────────────────────────────────────────── */
.wants-tracker__alerts {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.wants-tracker__alert-item {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.82rem;
  color: var(--warn, #f59e0b);
  line-height: 1.4;
}

.wants-tracker__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.wants-tracker__period {
  display: flex;
  flex-direction: column;
}

.wants-tracker__period-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.wants-tracker__period-date {
  font-size: 0.875rem;
  font-weight: 600;
}

/* Main content: donut + stats side by side */
.wants-tracker__content {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 540px) {
  .wants-tracker__content {
    grid-template-columns: 1fr;
  }
}

.wants-tracker__donut {
  max-width: 200px;
}

.wants-tracker__stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.wants-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.wants-stat-label {
  color: var(--muted);
}

.wants-stat-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.wants-stat-remaining {
  font-size: 1.1rem;
  color: var(--accent2-text);
}

.accent     { color: var(--accent); }
.text-muted { color: var(--muted); }
.text-danger { color: var(--danger); }

.wants-stat-divider {
  height: 1px;
  background: var(--border);
  margin: 0.2rem 0;
}

.wants-pct-label {
  font-size: 0.72rem;
  color: var(--muted);
  margin: 0;
}

/* Envelope forecast (B1) */
.envelope-forecast {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.5rem 0.65rem;
  border-radius: 6px;
  border-left: 3px solid var(--border);
  background: rgba(255, 255, 255, 0.03);
  margin-top: 0.25rem;
}

.envelope-forecast--on-track {
  border-left-color: var(--accent2-text);
  background: rgba(52, 211, 153, 0.06);
}
.envelope-forecast--caution {
  border-left-color: var(--warn);
  background: rgba(251, 191, 36, 0.07);
}
.envelope-forecast--over {
  border-left-color: var(--danger);
  background: rgba(248, 113, 113, 0.07);
}

.envelope-forecast__label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.envelope-forecast__value {
  font-size: 0.88rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.envelope-forecast--on-track .envelope-forecast__value { color: var(--accent2-text); }
.envelope-forecast--caution  .envelope-forecast__value { color: var(--warn); }
.envelope-forecast--over     .envelope-forecast__value { color: var(--danger); }

.envelope-forecast__detail {
  font-size: 0.7rem;
  color: var(--muted);
}

/* Category chips */
.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.category-chip {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 4px;
}

/* Subscription deductions */
.sub-deductions {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.sub-deductions__title {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.sub-deduction-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
}

.sub-deduction-icon {
  color: var(--accent);
  font-size: 1rem;
  flex-shrink: 0;
}

.sub-deduction-name {
  font-weight: 600;
  flex: 1;
}

.sub-deduction-freq {
  font-size: 0.7rem;
  color: var(--muted);
  background: var(--surface);
  padding: 1px 5px;
  border-radius: 3px;
}

.sub-deduction-amt {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--danger);
  margin-left: auto;
}

/* ─── Filter toolbar (Option B — expandable drawer) ────────────── */
.filter-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.filter-toolbar__top {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.filter-toolbar__search-wrap {
  position: relative;
  flex: 1;
  min-width: 140px;
}

.filter-toolbar__search-icon {
  position: absolute;
  left: 0.55rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  pointer-events: none;
}

.filter-toolbar__search {
  width: 100%;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-family: inherit;
  font-size: 0.82rem;
  padding: 0.4rem 0.65rem 0.4rem 1.9rem;
  outline: none;
  transition: border-color 0.15s;
}

.filter-toolbar__search::placeholder { color: var(--muted); }
.filter-toolbar__search:focus { border-color: var(--accent2-text); }

.filter-toolbar__filter-btn {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--muted);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 0.7rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
  flex-shrink: 0;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.filter-toolbar__filter-btn:hover,
.filter-toolbar__filter-btn--active {
  border-color: var(--accent2-text);
  color: var(--accent2-text);
  background: rgba(96, 165, 250, 0.08);
}

.filter-toolbar__badge {
  background: var(--accent2);
  color: #0a0f1a;
  font-size: 0.6rem;
  font-weight: 700;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.filter-toolbar__sort {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-family: inherit;
  font-size: 0.8rem;
  padding: 0.4rem 1.8rem 0.4rem 0.65rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7a99'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.6rem center;
  flex-shrink: 0;
  transition: border-color 0.15s;
}

.filter-toolbar__sort:focus { outline: none; border-color: var(--accent2-text); }

/* Drawer: grid-template-rows transition for smooth height animation */
.filter-toolbar__drawer-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.22s ease;
  overflow: hidden;
}

.filter-toolbar__drawer-wrap--open {
  grid-template-rows: 1fr;
}

.filter-toolbar__drawer-inner {
  min-height: 0;
  overflow: hidden;
}

.filter-toolbar__drawer {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem;
  background: var(--surface);
  margin-top: 0.45rem;
}

.filter-toolbar__filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
  min-width: 120px;
}

.filter-toolbar__filter-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.filter-active-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent2);
  flex-shrink: 0;
}

.filter-toolbar__filter-select {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-family: inherit;
  font-size: 0.8rem;
  padding: 0.38rem 1.8rem 0.38rem 0.65rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7a99'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.6rem center;
  width: 100%;
  transition: border-color 0.15s;
}

.filter-toolbar__filter-select:focus { outline: none; border-color: var(--accent2-text); }

.filter-toolbar__filter-select--active {
  border-color: var(--accent2-text);
  color: var(--accent2-text);
}

/* Result count + inline clear link */
.filter-toolbar__count {
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: 0.35rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-toolbar__count strong { color: var(--text); }

.filter-toolbar__clear {
  background: none;
  border: none;
  color: var(--danger);
  font-family: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  opacity: 0.75;
  transition: opacity 0.12s;
}

.filter-toolbar__clear:hover { opacity: 1; }

/* Mobile: search takes full width on its own row */
@media (max-width: 480px) {
  .filter-toolbar__search-wrap { flex: 0 0 100%; }
  .filter-toolbar__filter-group { min-width: 100%; }
}

/* Purchase list */
.purchase-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.purchase-list-title {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.purchase-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.purchase-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  flex-wrap: wrap;
}

.purchase-item__left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.purchase-item__name {
  font-weight: 600;
  font-size: 0.875rem;
}

.purchase-item__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.purchase-cat-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 3px;
}

.purchase-budget-chip {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 3px;
}

.chip-needs { background: rgba(74, 222, 128, 0.12); color: var(--accent); }
.chip-wants { background: rgba(96, 165, 250, 0.12); color: var(--accent2-text); }

.purchase-card-chip {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 3px;
  background: rgba(139, 149, 173, 0.12);
  color: var(--muted);
}

.purchase-item__right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.purchase-item__amount {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.purchase-item__actions {
  display: flex;
  gap: 0.35rem;
}

/* Modal */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-row-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 480px) {
  .form-row-2,
  .form-row-3 { grid-template-columns: 1fr; }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.form-input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.45rem 0.65rem;
  font-size: 0.9rem;
  color: var(--text);
  width: 100%;
  transition: border-color 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.form-error {
  font-size: 0.8rem;
  color: var(--danger);
  margin: 0;
}
</style>
