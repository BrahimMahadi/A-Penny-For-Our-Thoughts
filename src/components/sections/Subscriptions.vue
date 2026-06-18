<!--
  Module:   components/sections/Subscriptions.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Summary:  Subscription list with stats header, budget impact bar,
            renewal alert banner, and CRUD. Mirrors renderSubscriptions().
-->

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useFormValidation, rules } from '@/composables/useFormValidation';
import { useAnalytics } from '@/composables/useAnalytics';
import { useListFilter } from '@/composables/useListFilter';
import { useListTransition } from '@/composables/useListTransition';
import type { Subscription } from '@/types/budget';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import ProgressBar from '@/components/ui/ProgressBar.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { fmt } from '@/utils/format';
import { daysUntil } from '@/utils/date';
import { getNextRenewal } from '@/utils/calculations';
import { MONTHS_SHORT as MONTHS, DOW_FULL, DOW_SHORT, DOW_MINI } from '@/constants/datetime';
import { FALLBACK_CATEGORY_NAME } from '@/data/categories';
import {
  MO_RATE, YR_RATE, FREQ_LABEL, FREQ_DISPLAY,
  AVG_WEEKDAY_OCCURRENCES_PER_MONTH as AVG_PER_WEEKDAY,
  AVG_WEEKDAY_OCCURRENCES_PER_YEAR,
} from '@/constants/frequency';
import { SUB_BUDGET_OVER_PCT, SUB_BUDGET_CAUTION_PCT } from '@/constants/budget';
import type { Frequency } from '@/types/budget';

const budget = useBudgetStore();
const toast  = useToast();
const { totalMonthlyIncome } = useAnalytics();
const { onItemEnter, onItemLeave } = useListTransition({ enterY: 12, enterDuration: 0.25 });

// Frequency rate maps (MO_RATE/YR_RATE/FREQ_LABEL/FREQ_DISPLAY), AVG_PER_WEEKDAY,
// MONTHS and DOW_* are all imported from @/constants (TECH-DEBT-1).

function dayPatternLabel(days: number[]): string {
  if (!days || days.length === 0) return '—';
  return [...days].sort((a, b) => a - b).map(d => DOW_SHORT[d]).join(' · ');
}

/** Monthly cost for any subscription, accounting for custom-days variable rate. */
function subMonthlyAmount(sub: { amount: number; frequency: Frequency; daysOfWeek?: number[] }): number {
  if (sub.frequency === 'custom-days') {
    return (+sub.amount || 0) * (sub.daysOfWeek?.length ?? 0) * AVG_PER_WEEKDAY;
  }
  return (+sub.amount || 0) * (MO_RATE[sub.frequency ?? 'monthly'] ?? 1);
}

/** Annual cost for any subscription. */
function subAnnualAmount(sub: { amount: number; frequency: Frequency; daysOfWeek?: number[] }): number {
  if (sub.frequency === 'custom-days') {
    return (+sub.amount || 0) * (sub.daysOfWeek?.length ?? 0) * AVG_WEEKDAY_OCCURRENCES_PER_YEAR;
  }
  return (+sub.amount || 0) * (YR_RATE[sub.frequency ?? 'monthly'] ?? 12);
}

/**
 * BUG-032: the NEXT renewal date for display & status.
 *
 * `sub.date` is the stored anchor. Once it passes, the card used to read it
 * raw — showing "Expired" and a stale past date forever. We instead derive the
 * next occurrence ≥ today from the anchor + frequency via `getNextRenewal`,
 * so the date always rolls forward. The anchor itself is never mutated (all
 * budget/forecast maths recompute occurrences from it independently).
 *
 * Returns '' when there is no future occurrence (should not happen for a
 * recurring sub within the 2-year lookahead). `custom-days` subs have no
 * single renewal date — callers handle those separately.
 */
function nextRenewalDate(sub: { date?: string; frequency: Frequency; daysOfWeek?: number[] }): string {
  if (sub.frequency === 'custom-days') return sub.date || '';
  return getNextRenewal(sub) ?? '';
}

// ─── Aggregate stats ──────────────────────────────────────────────
const subs = computed(() => budget.subscriptions);

const totalMo = computed(() =>
  subs.value.reduce((s, sub) => s + subMonthlyAmount(sub), 0),
);
const totalYr = computed(() =>
  subs.value.reduce((s, sub) => s + subAnnualAmount(sub), 0),
);
const wantsMo = computed(() =>
  subs.value
    .filter(s => (s.budgetType || 'wants') !== 'needs')
    .reduce((s, sub) => s + subMonthlyAmount(sub), 0),
);
const wantsBudget = computed(() => totalMonthlyIncome.value * (budget.allocation.wants / 100));
const wantsPct    = computed(() =>
  wantsBudget.value > 0 ? Math.min(100, (wantsMo.value / wantsBudget.value) * 100) : 0,
);

const budgetBarStatus = computed<'on-track' | 'caution' | 'over'>(() => {
  if (wantsPct.value > SUB_BUDGET_OVER_PCT) return 'over';
  if (wantsPct.value > SUB_BUDGET_CAUTION_PCT) return 'caution';
  return 'on-track';
});

const budgetBarLabel = computed(() => {
  if (!subs.value.length) return 'No subscriptions tracked yet';
  if (wantsBudget.value > 0) {
    return `${fmt(wantsMo.value)}/mo in subscriptions · ${wantsPct.value.toFixed(1)}% of ${fmt(wantsBudget.value)} Wants budget`;
  }
  return 'Add income streams to see budget impact';
});

// ─── Renewal alerts (≤ 7 days) ───────────────────────────────────
// BUG-032: countdown is based on the derived next renewal date, not the
// stored anchor, so a passed anchor rolls forward instead of disappearing.
const upcomingRenewals = computed(() =>
  [...subs.value]
    .filter(s => {
      if (s.frequency === 'custom-days') return false; // recurring daily pattern — no countdown
      const next = nextRenewalDate(s);
      if (!next) return false;
      const d = daysUntil(next);
      return d >= 0 && d <= 7;
    })
    .sort((a, b) => new Date(nextRenewalDate(a)).getTime() - new Date(nextRenewalDate(b)).getTime()),
);

function renewalDateLabel(dateStr: string): string {
  if (!dateStr) return '—';
  const days = daysUntil(dateStr);
  if (days === 0) return 'today';
  const [, sm, sd] = dateStr.split('-');
  return `${MONTHS[+sm - 1]} ${+sd}`;
}

// ─── Search / Sort / Filter (Option B — expandable drawer) ───────
const {
  search:            sSearch,
  catFilter:         sCatFilter,
  typeFilter:        sTypeFilter,
  cardFilter:        sCardFilter,
  sortKey:           sSortKey,
  drawerOpen:        sDrawerOpen,
  activeFilterCount: sActiveFilterCount,
  isFiltered:        sIsFiltered,
  clearFilters:      sClearFilters,
  toggleDrawer:      sToggleDrawer,
  applyFilters:      sApplyFilters,
} = useListFilter('renewal');

function sortSubs(items: Subscription[]): Subscription[] {
  const arr = [...items];
  switch (sSortKey.value) {
    case 'renewal':
      // BUG-032: sort by the derived next renewal so the list orders by the
      // actual upcoming dates, not stale anchors. custom-days subs (no single
      // date) sort last.
      return arr.sort((a, b) => {
        const na = nextRenewalDate(a);
        const nb = nextRenewalDate(b);
        const da = na ? new Date(na).getTime() : Infinity;
        const db = nb ? new Date(nb).getTime() : Infinity;
        return da - db;
      });
    case 'moCostHigh':
      return arr.sort((a, b) => subMonthlyAmount(b) - subMonthlyAmount(a));
    case 'amtHigh':
      return arr.sort((a, b) => b.amount - a.amount);
    case 'nameAZ':
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return arr;
  }
}

const filteredSubs = computed(() =>
  sortSubs(sApplyFilters(subs.value)),
);

/** Category names present on actual subscriptions, for the filter dropdown. */
const subCategoryOptions = computed(() =>
  budget.spendingCategories.map(c => c.name),
);

function chipClass(sub: { date: string; frequency: Frequency; daysOfWeek?: number[] }): string {
  if (sub.frequency === 'custom-days') return 'chip-custom';
  // BUG-032: status from the derived next renewal — recurring subs never expire.
  const next = nextRenewalDate(sub);
  if (!next) return 'chip-red'; // no future occurrence (shouldn't happen for recurring)
  const d = daysUntil(next);
  if (d < 60) return 'chip-warn';
  return 'chip-green';
}

function chipText(sub: { date: string; frequency: Frequency; daysOfWeek?: number[] }): string {
  if (sub.frequency === 'custom-days') {
    const n = sub.daysOfWeek?.length ?? 0;
    return n ? sub.daysOfWeek!.map(d => DOW_MINI[d]).join('') : '—';
  }
  // BUG-032: countdown from the next renewal — "Today" on the day, never "Expired".
  const next = nextRenewalDate(sub);
  if (!next) return '—';
  const d = daysUntil(next);
  if (d === 0) return 'Today';
  return `${d}d`;
}

function annualNote(sub: { amount: number; frequency: Frequency; daysOfWeek?: number[] }): string {
  if (!sub.amount || sub.frequency === 'yearly') return '';
  const yr = subAnnualAmount(sub);
  return `· ${fmt(yr)}/yr`;
}

function displayDate(sub: { date: string; frequency: Frequency; daysOfWeek?: number[] }): string {
  if (sub.frequency === 'custom-days') {
    return `Every ${dayPatternLabel(sub.daysOfWeek ?? [])}`;
  }
  // BUG-032: show the next renewal date, not the (possibly stale) stored anchor.
  const next = nextRenewalDate(sub);
  if (!next) return '—';
  const [sy, sm, sd] = next.split('-');
  return `${MONTHS[+sm - 1]} ${+sd}, ${sy}`;
}

/** Row-3 renewal line: "Every Mon · Tue" (custom-days), "Due today", or "Renews {date}". */
function renewalLineText(sub: { date: string; frequency: Frequency; daysOfWeek?: number[] }): string {
  if (sub.frequency === 'custom-days') return displayDate(sub);
  const next = nextRenewalDate(sub);
  if (next && daysUntil(next) === 0) return 'Due today';
  return `Renews ${displayDate(sub)}`;
}

function cardLabel(cardId: string | null | undefined): string | null {
  if (!cardId) return null;
  return budget.expenseCards.find(c => c.id === cardId)?.label ?? null;
}

// ─── Modal state ─────────────────────────────────────────────────
const showModal = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  name:       '',
  amount:     0,
  frequency:  'monthly' as Frequency,
  date:       '',
  category:   FALLBACK_CATEGORY_NAME,
  budgetType: 'wants',
  cardId:     null as string | null,
  daysOfWeek: [] as number[],
});

const FREQUENCIES_SUB: Frequency[] = ['monthly', 'quarterly', 'biyearly', 'yearly', 'biweekly', 'weekly', 'custom-days'];
// FREQ_DISPLAY imported from @/constants/frequency (TECH-DEBT-1)

/** Estimated monthly cost for the current form values. */
const formMonthlyCost = computed(() => {
  if (form.frequency === 'custom-days') {
    return form.amount * (form.daysOfWeek.length) * AVG_PER_WEEKDAY;
  }
  return form.amount * (MO_RATE[form.frequency] ?? 1);
});

function toggleDay(dow: number): void {
  const idx = form.daysOfWeek.indexOf(dow);
  if (idx === -1) form.daysOfWeek.push(dow);
  else form.daysOfWeek.splice(idx, 1);
}

function resetForm(): void {
  form.name       = '';
  form.amount     = 0;
  form.frequency  = 'monthly';
  form.date       = '';
  form.category   = FALLBACK_CATEGORY_NAME;
  form.budgetType = 'wants';
  form.cardId     = null;
  form.daysOfWeek = [];
  editingId.value = null;
}

function openAdd(): void {
  resetForm();
  showModal.value = true;
}

function openEdit(id: string): void {
  const sub = budget.subscriptions.find(s => s.id === id);
  if (!sub) return;
  form.name       = sub.name;
  form.amount     = +sub.amount || 0;
  form.frequency  = sub.frequency || 'monthly';
  // BUG-032: pre-fill the NEXT renewal date so the modal shows the upcoming
  // date rather than a stale past anchor. custom-days keeps its effective-from
  // date (the date field is hidden for that frequency).
  form.date       = sub.frequency === 'custom-days'
    ? (sub.date || '')
    : (nextRenewalDate(sub) || sub.date || '');
  form.category   = sub.category || FALLBACK_CATEGORY_NAME;
  form.budgetType = sub.budgetType || 'wants';
  form.cardId     = sub.cardId ?? null;
  form.daysOfWeek = [...(sub.daysOfWeek ?? [])];
  editingId.value = id;
  showModal.value = true;
}

const validation = useFormValidation(() => ({
  name: rules.required(form.name, 'Name'),
  // date is required only for non-custom-days frequencies; null = no error
  date: form.frequency !== 'custom-days' ? rules.required(form.date, 'Renewal date') : null,
  // custom-days requires at least one day selected; null = no error
  daysOfWeek: form.frequency === 'custom-days' && form.daysOfWeek.length === 0
    ? 'Select at least one day'
    : null,
}));

function save(): void {
  validation.touchAll();
  if (!validation.isValid.value) return;

  // For custom-days, default the effective-from date to today if not set
  const date = (form.frequency === 'custom-days' && !form.date)
    ? new Date().toISOString().split('T')[0]
    : form.date;

  const payload = {
    name:       form.name.trim(),
    amount:     form.amount,
    frequency:  form.frequency,
    date,
    category:   form.category,
    budgetType: form.budgetType as 'needs' | 'wants',
    cardId:     form.cardId,
    daysOfWeek: form.frequency === 'custom-days' ? [...form.daysOfWeek].sort((a, b) => a - b) : [],
  };
  if (editingId.value) {
    budget.updateSubscription(editingId.value, payload);
    toast.show('Subscription updated.', 'success');
  } else {
    budget.addSubscription(payload);
    toast.show('Subscription added.', 'success');
  }
  showModal.value = false;
  resetForm();
  validation.reset();
}

function remove(id: string): void {
  const sub = budget.subscriptions.find(s => s.id === id);
  if (!sub) return;
  if (!window.confirm(`Delete "${sub.name}"?`)) return;
  budget.deleteSubscription(id);
  toast.show('Subscription removed.', 'success');
}
</script>

<template>
  <div class="subs-section">
    <!-- Stats header -->
    <div class="subs-stats">
      <div class="subs-stat">
        <div class="subs-stat__label">
          Monthly total
        </div>
        <div class="subs-stat__value">
          {{ subs.length ? fmt(totalMo) + '/mo' : '—' }}
        </div>
      </div>
      <div class="subs-stat">
        <div class="subs-stat__label">
          Annual total
        </div>
        <div class="subs-stat__value">
          {{ subs.length ? fmt(totalYr) + '/yr' : '—' }}
        </div>
      </div>
      <div class="subs-stat">
        <div class="subs-stat__label">
          % of Wants budget
        </div>
        <div
          class="subs-stat__value"
          :class="{
            'text-danger': wantsPct > SUB_BUDGET_OVER_PCT,
            'text-warn': wantsPct > SUB_BUDGET_CAUTION_PCT && wantsPct <= SUB_BUDGET_OVER_PCT,
          }"
        >
          {{ subs.length && wantsBudget > 0 ? wantsPct.toFixed(1) + '%' : '—' }}
        </div>
      </div>
    </div>

    <!-- Budget impact bar -->
    <div class="subs-budget-bar">
      <ProgressBar
        :percent="wantsPct"
        :status="budgetBarStatus"
        size="sm"
        aria-label="Subscription budget impact"
      />
      <p class="subs-budget-bar__label">
        {{ budgetBarLabel }}
      </p>
    </div>

    <!-- Renewal alert -->
    <div
      v-if="upcomingRenewals.length > 0"
      class="subs-renewal-alert"
    >
      ⚠&nbsp; Renewing within 7 days —
      <span
        v-for="(sub, i) in upcomingRenewals"
        :key="sub.id"
      >
        <strong>{{ sub.name }}</strong>
        <span class="renewal-date">{{ renewalDateLabel(nextRenewalDate(sub)) }}</span>
        <span v-if="i < upcomingRenewals.length - 1"> · </span>
      </span>
    </div>

    <!-- List header + add button -->
    <div class="subs-section__header">
      <span class="subs-section__count">
        {{ subs.length }} subscription{{ subs.length !== 1 ? 's' : '' }}
      </span>
      <BaseButton
        size="sm"
        @click="openAdd"
      >
        + Add Subscription
      </BaseButton>
    </div>

    <!-- Search / Sort / Filter toolbar (Option B — expandable drawer) -->
    <div
      v-if="subs.length > 0"
      class="filter-toolbar"
      data-testid="sub-filter-toolbar"
    >
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
            id="sub-search"
            v-model="sSearch"
            class="filter-toolbar__search"
            type="text"
            placeholder="Search subscriptions…"
            autocomplete="off"
            aria-label="Search subscriptions"
          >
        </div>
        <button
          class="filter-toolbar__filter-btn"
          :class="{ 'filter-toolbar__filter-btn--active': sDrawerOpen || sActiveFilterCount > 0 }"
          :aria-expanded="sDrawerOpen"
          aria-controls="sub-filter-drawer"
          @click="sToggleDrawer"
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
            v-if="sActiveFilterCount > 0"
            class="filter-toolbar__badge"
          >{{ sActiveFilterCount }}</span>
        </button>
        <select
          id="sub-sort"
          v-model="sSortKey"
          class="filter-toolbar__sort"
          aria-label="Sort subscriptions"
        >
          <option value="renewal">
            Renewal date
          </option>
          <option value="moCostHigh">
            Monthly cost ↓
          </option>
          <option value="amtHigh">
            Amount ↓
          </option>
          <option value="nameAZ">
            Name A–Z
          </option>
        </select>
      </div>

      <div
        id="sub-filter-drawer"
        class="filter-toolbar__drawer-wrap"
        :class="{ 'filter-toolbar__drawer-wrap--open': sDrawerOpen }"
      >
        <div class="filter-toolbar__drawer-inner">
          <div class="filter-toolbar__drawer">
            <div class="filter-toolbar__filter-group">
              <label
                class="filter-toolbar__filter-label"
                for="sub-filter-cat"
              >
                <span
                  v-if="sCatFilter"
                  class="filter-active-dot"
                />
                Category
              </label>
              <select
                id="sub-filter-cat"
                v-model="sCatFilter"
                class="filter-toolbar__filter-select"
                :class="{ 'filter-toolbar__filter-select--active': sCatFilter }"
              >
                <option value="">
                  All categories
                </option>
                <option
                  v-for="cat in subCategoryOptions"
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
                for="sub-filter-type"
              >
                <span
                  v-if="sTypeFilter"
                  class="filter-active-dot"
                />
                Budget type
              </label>
              <select
                id="sub-filter-type"
                v-model="sTypeFilter"
                class="filter-toolbar__filter-select"
                :class="{ 'filter-toolbar__filter-select--active': sTypeFilter }"
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
                for="sub-filter-card"
              >
                <span
                  v-if="sCardFilter"
                  class="filter-active-dot"
                />
                Card
              </label>
              <select
                id="sub-filter-card"
                v-model="sCardFilter"
                class="filter-toolbar__filter-select"
                :class="{ 'filter-toolbar__filter-select--active': sCardFilter }"
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

      <div
        v-if="sIsFiltered"
        class="filter-toolbar__count"
        data-testid="sub-filter-count"
        aria-live="polite"
      >
        Showing <strong>{{ filteredSubs.length }}</strong> of {{ subs.length }}
        <button
          class="filter-toolbar__clear"
          @click="sClearFilters"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-if="subs.length === 0"
      icon="📺"
      title="No subscriptions tracked"
      hint="Add recurring services like Netflix or Spotify to monitor your monthly costs."
    />

    <!-- Filtered empty state -->
    <EmptyState
      v-else-if="filteredSubs.length === 0"
      icon="🔍"
      title="No subscriptions match your filters"
      hint="Try adjusting your search or filters."
      data-testid="sub-no-results"
    >
      <BaseButton
        size="sm"
        variant="secondary"
        @click="sClearFilters"
      >
        Clear filters
      </BaseButton>
    </EmptyState>

    <!-- Subscription list — GSAP JS hooks handle enter/leave -->
    <TransitionGroup
      v-else
      tag="ul"
      class="subs-list"
      :css="false"
      @enter="onItemEnter"
      @leave="onItemLeave"
    >
      <li
        v-for="sub in filteredSubs"
        :key="sub.id"
        class="sub-item"
        :aria-label="`${sub.name} subscription`"
      >
        <div class="sub-row-1">
          <span class="sub-name">{{ sub.name }}</span>
          <span
            class="sub-chip"
            :class="chipClass(sub)"
            :title="sub.frequency === 'custom-days' ? dayPatternLabel(sub.daysOfWeek ?? []) : undefined"
          >
            {{ chipText(sub) }}
          </span>
        </div>
        <div class="sub-row-2">
          <span
            class="sub-budget-badge"
            :class="sub.budgetType === 'needs' ? 'badge-needs' : 'badge-wants'"
          >
            {{ sub.budgetType === 'needs' ? 'Needs' : 'Wants' }}
          </span>
          <span
            v-if="cardLabel(sub.cardId)"
            class="sub-card-chip"
          >
            💳 {{ cardLabel(sub.cardId) }}
          </span>
          <span
            v-else
            class="sub-no-card-chip"
          >⚠ No card</span>
          <span class="sub-amount">
            {{ sub.amount > 0 ? fmt(+sub.amount) + (FREQ_LABEL[sub.frequency || 'monthly'] || '/mo') : '—' }}
            <span class="sub-annual-note">{{ annualNote(sub) }}</span>
          </span>
        </div>
        <div class="sub-row-3">
          <span class="sub-date">{{ renewalLineText(sub) }}</span>
          <div class="sub-actions">
            <BaseButton
              size="xs"
              variant="secondary"
              @click="openEdit(sub.id)"
            >
              Edit
            </BaseButton>
            <BaseButton
              size="xs"
              variant="danger"
              @click="remove(sub.id)"
            >
              Delete
            </BaseButton>
          </div>
        </div>
      </li>
    </TransitionGroup>

    <!-- Add / Edit modal -->
    <BaseModal
      v-model:open="showModal"
      :title="editingId ? 'Edit Subscription' : 'Add Subscription'"
    >
      <div class="modal-form">
        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="sub-name"
            >Name</label>
            <input
              id="sub-name"
              v-model="form.name"
              class="form-input"
              :class="{ 'form-input--error': validation.errors.value.name }"
              type="text"
              placeholder="e.g. Netflix"
              @blur="validation.touch('name')"
            >
            <p
              v-if="validation.errors.value.name"
              class="field-error"
            >
              {{ validation.errors.value.name }}
            </p>
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="sub-amount"
            >Amount ($)</label>
            <input
              id="sub-amount"
              v-model.number="form.amount"
              class="form-input"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
            >
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="sub-freq"
            >Frequency</label>
            <select
              id="sub-freq"
              v-model="form.frequency"
              class="form-input"
            >
              <option
                v-for="f in FREQUENCIES_SUB"
                :key="f"
                :value="f"
              >
                {{ FREQ_DISPLAY[f] }}
              </option>
            </select>
          </div>
          <!-- Date picker: hidden for custom-days (uses day-of-week instead) -->
          <div
            v-if="form.frequency !== 'custom-days'"
            class="form-group"
          >
            <label
              class="form-label"
              for="sub-date"
            >Next renewal date</label>
            <input
              id="sub-date"
              v-model="form.date"
              class="form-input"
              :class="{ 'form-input--error': validation.errors.value.date }"
              type="date"
              @blur="validation.touch('date')"
            >
            <p
              v-if="validation.errors.value.date"
              class="field-error"
            >
              {{ validation.errors.value.date }}
            </p>
          </div>
        </div>

        <!-- Day-of-week picker (custom-days only) -->
        <div
          v-if="form.frequency === 'custom-days'"
          class="form-group"
        >
          <label class="form-label">Repeats on</label>
          <div class="dow-picker">
            <button
              v-for="(label, idx) in DOW_FULL"
              :key="idx"
              type="button"
              class="dow-btn"
              :class="{ 'dow-btn--active': form.daysOfWeek.includes(idx) }"
              :title="label"
              @click="toggleDay(idx)"
            >
              {{ DOW_MINI[idx] }}
            </button>
          </div>
          <p
            v-if="validation.errors.value.daysOfWeek"
            class="field-error"
          >
            {{ validation.errors.value.daysOfWeek }}
          </p>
          <p
            v-if="form.daysOfWeek.length > 0"
            class="form-hint"
          >
            ≈ {{ fmt(formMonthlyCost) }}/mo ({{ (form.daysOfWeek.length * AVG_PER_WEEKDAY).toFixed(1) }} days avg)
          </p>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="sub-category"
            >Category</label>
            <select
              id="sub-category"
              v-model="form.category"
              class="form-input"
            >
              <option
                v-for="cat in budget.spendingCategories"
                :key="cat.id"
                :value="cat.name"
              >
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="sub-budget-type"
            >Budget type</label>
            <select
              id="sub-budget-type"
              v-model="form.budgetType"
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
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="sub-card"
            >Payment card</label>
            <select
              id="sub-card"
              v-model="form.cardId"
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
      </div>

      <template #footer>
        <BaseButton
          variant="secondary"
          @click="showModal = false; resetForm(); validation.reset()"
        >
          Cancel
        </BaseButton>
        <BaseButton
          @click="save"
        >
          {{ editingId ? 'Update' : 'Add' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.subs-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.subs-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

@media (max-width: 480px) {
  .subs-stats { grid-template-columns: 1fr 1fr; }
}

.subs-stat {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  text-align: center;
}

.subs-stat__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.subs-stat__value {
  font-size: 1rem;
  font-weight: 700;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

.text-danger { color: var(--danger); }
.text-warn   { color: var(--warn); }

.subs-budget-bar {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.subs-budget-bar__label {
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0;
}

.subs-renewal-alert {
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.25);
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  font-size: 0.8rem;
  color: var(--warn);
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: baseline;
}

.renewal-date {
  opacity: 0.75;
  margin-left: 0.25rem;
}

.subs-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.subs-section__count {
  font-size: 0.8rem;
  color: var(--muted);
}

.subs-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative; /* required: leaving items are pinned absolute so new items render in place */
}

.sub-item {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sub-row-1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.sub-name {
  font-weight: 700;
  font-size: 0.9rem;
}

.sub-chip {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
}

.chip-green  { background: rgba(74, 222, 128, 0.12);  color: var(--accent2-text); }
.chip-warn   { background: rgba(251, 191, 36, 0.12);  color: var(--warn); }
.chip-red    { background: rgba(248, 113, 113, 0.12); color: var(--danger); }
.chip-custom { background: rgba(167, 139, 250, 0.12); color: #a78bfa; letter-spacing: 0.02em; }

.sub-row-2 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.sub-budget-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
}

.badge-needs { background: rgba(74, 222, 128, 0.12); color: var(--accent); }
.badge-wants { background: rgba(96, 165, 250, 0.12); color: var(--accent2-text); }

.sub-card-chip {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(167, 139, 250, 0.12);
  color: #a78bfa;
}

.sub-no-card-chip {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(251, 191, 36, 0.12);
  color: var(--warn);
}

.sub-amount {
  margin-left: auto;
  font-weight: 700;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.sub-annual-note {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 400;
}

.sub-row-3 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.sub-date {
  font-size: 0.75rem;
  color: var(--muted);
}

.sub-actions {
  display: flex;
  gap: 0.35rem;
}

/* ─── Filter toolbar (Option B — shared pattern) ────────────────── */
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

.filter-toolbar__drawer-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.22s ease;
  overflow: hidden;
}

.filter-toolbar__drawer-wrap--open { grid-template-rows: 1fr; }

.filter-toolbar__drawer-inner { min-height: 0; overflow: hidden; }

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
.filter-toolbar__filter-select--active { border-color: var(--accent2-text); color: var(--accent2-text); }

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

@media (max-width: 480px) {
  .filter-toolbar__search-wrap { flex: 0 0 100%; }
  .filter-toolbar__filter-group { min-width: 100%; }
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

@media (max-width: 480px) {
  .form-row-2 { grid-template-columns: 1fr; }
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

.form-input--error {
  border-color: var(--danger);
}

.form-input--error:focus {
  border-color: var(--danger);
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
}

.field-error {
  font-size: 0.78rem;
  color: var(--danger);
  margin: 0.15rem 0 0;
}

/* Day-of-week picker */
.dow-picker {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.dow-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.dow-btn:hover {
  border-color: #a78bfa;
  color: #a78bfa;
}

.dow-btn--active {
  background: rgba(167, 139, 250, 0.18);
  border-color: #a78bfa;
  color: #a78bfa;
}

.form-hint {
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0.25rem 0 0;
}
</style>
