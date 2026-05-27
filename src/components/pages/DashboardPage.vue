<!--
  Module:   components/pages/DashboardPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Updated:  May 2026 (Sprint 4)  — all section SFCs wired
            May 2026 (Sprint 13) — section IDs, group labels, collapsible
            May 2026 (Sprint 18) — dynamic ordering + drag-and-drop reorder
            May 2026 (Sprint 25) — removed analytics sections (→ AdvancedPage),
                                   budget-allocation (→ Settings), goals-timeline (deleted)
            May 2026 (RS-3)      — Vivid Modern redesign: hero KPI row, page header,
                                   quick-add wants modal
            May 2026 (RS-11)     — Fixed-grid layout: removed income-streams, wants-tracker
                                   (→ RS-12), savings-goals (→ Goals tab); removed
                                   drag-and-drop and "Manage widgets"; sections now live
                                   in a responsive fixed grid matching the new mockup.
            May 2026 (RS-12)     — Charts row added between KPI and widget rows:
                                   Purchases This Period (donut) + Money Flow (12-month).
                                   RecurringSpend replaces ExpenseCards :readonly on dash.
  Summary:  Dashboard tab host. Fixed-grid layout:
              Row 0 — page header (greeting + quick-add CTA)
              Row 1 — 4-col KPI hero row (wants envelope, due-in-7, needs, net worth)
              Row 2 — 2-col charts row   (Purchases This Period | Money Flow)
              Row 3 — 3-col widget row   (Recurring Spend | Loan Payoff | Savings Accounts)
              Row 4 — 2-col row          (Chequing Balance | Subscriptions)
              Row 5 — full-width         (Credit Cards)
              Row 6 — full-width         (Wishlist)
-->

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import BaseCard    from '@/components/ui/BaseCard.vue';
import BaseModal   from '@/components/ui/BaseModal.vue';
import ProgressBar from '@/components/ui/ProgressBar.vue';
import { useUiStore }    from '@/stores/ui';
import { useBudgetStore } from '@/stores/budget';
import { useAnalytics }  from '@/composables/useAnalytics';
import { useToast }      from '@/composables/useToast';
import { fmt }           from '@/utils/format';
import {
  getSubsDeductedThisPeriod,
  getLoansDeductedThisPeriod,
} from '@/utils/calculations';
import type { Purchase } from '@/types/budget';

// ─── Section components ───────────────────────────────────────────
import PurchasesThisPeriod from '@/components/sections/PurchasesThisPeriod.vue';
import MoneyFlow           from '@/components/sections/MoneyFlow.vue';
import RecurringSpend      from '@/components/sections/RecurringSpend.vue';
import Loans               from '@/components/sections/Loans.vue';
import CreditCards         from '@/components/sections/CreditCards.vue';
import Subscriptions       from '@/components/sections/Subscriptions.vue';
import Savings             from '@/components/sections/Savings.vue';
import Wishlist            from '@/components/sections/Wishlist.vue';
import ChequingBalance     from '@/components/sections/ChequingBalance.vue';

// ─── Stores & composables ──────────────────────────────────────────
const ui     = useUiStore();
const budget = useBudgetStore();
const toast  = useToast();
const {
  totalMonthlyIncome,
  currentMonthBudgeted,
  currentMonthActuals,
  prevMonthActuals,
  netWorth,
  payPeriodForecast,
} = useAnalytics();

// ─── Page header ───────────────────────────────────────────────────
const today = new Date();
const monthLabel = computed(() =>
  today.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }),
);

// ─── Hero KPI: bi-weekly wants envelope ───────────────────────────
const biWeeklyBudget = computed(() =>
  (totalMonthlyIncome.value * (budget.allocation.wants / 100)) / 2,
);

const biWeeklySpent = computed(() =>
  budget.purchases
    .filter(p => (p.budgetType || 'wants') === 'wants')
    .reduce((s, p) => s + p.amount, 0),
);

/** Subscription + loan amounts deducted from this bi-weekly envelope. */
const biWeeklyDeductions = computed(() => {
  const subsDeducted  = getSubsDeductedThisPeriod(budget.$state, today);
  const loansDeducted = getLoansDeductedThisPeriod(budget.$state, today);
  const subTotal  = subsDeducted.reduce((s, sub) => s + (+sub.amount || 0) * sub.renewalDates.length, 0);
  const loanTotal = loansDeducted.reduce((s, loan) => s + (+loan.paymentAmount || 0) * loan.renewalDates.length, 0);
  return subTotal + loanTotal;
});

const biWeeklyRemaining = computed(() =>
  biWeeklyBudget.value - biWeeklySpent.value - biWeeklyDeductions.value,
);

const biWeeklyUsedPct = computed(() => {
  if (biWeeklyBudget.value <= 0) return 0;
  return Math.min(100, ((biWeeklySpent.value + biWeeklyDeductions.value) / biWeeklyBudget.value) * 100);
});

/** "until May 24" label from the current pay period's end date. */
const periodEndLabel = computed(() => {
  const end = payPeriodForecast.value?.periodEnd;
  if (!end) return null;
  return new Date(end + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
});

// ─── Due in 7 days ────────────────────────────────────────────────
const todayStr     = today.toISOString().split('T')[0];
const sevenDaysOut = new Date(today);
sevenDaysOut.setDate(today.getDate() + 7);
const sevenDaysStr = sevenDaysOut.toISOString().split('T')[0];

const dueInSevenDays = computed(() =>
  (payPeriodForecast.value?.dated ?? []).filter(
    item => item.periodDate >= todayStr && item.periodDate <= sevenDaysStr,
  ),
);

const dueInSevenTotal = computed(() =>
  dueInSevenDays.value.reduce((s, item) => s + item.amount, 0),
);

// ─── Needs spent KPI ──────────────────────────────────────────────
const needsDelta = computed(() =>
  prevMonthActuals.value.needs > 0
    ? currentMonthActuals.value.needs - prevMonthActuals.value.needs
    : null,
);

const needsUsedPct = computed(() => {
  if (currentMonthBudgeted.value.needs <= 0) return 0;
  return Math.min(100, (currentMonthActuals.value.needs / currentMonthBudgeted.value.needs) * 100);
});

const needsIsOver = computed(() =>
  currentMonthActuals.value.needs > currentMonthBudgeted.value.needs,
);

// ─── Net worth KPI ────────────────────────────────────────────────
/** Month-over-month percentage change for net worth. */
const netWorthMomPct = computed(() => {
  const change = netWorth.value.momChange;
  if (change === null) return null;
  const prev = netWorth.value.netWorth - change;
  if (prev === 0) return null;
  return (change / Math.abs(prev)) * 100;
});

// ─── Dashboard shared type toggle (RS-16) ────────────────────────
/** Drives the hero card + Purchases This Period. Persists per session only. */
const dashboardTypeFilter = ref<'wants' | 'needs'>('wants');

/** Hero card: budget for the active type. */
const heroBudget = computed(() =>
  dashboardTypeFilter.value === 'needs' ? biWeeklyNeedsBudget.value : biWeeklyBudget.value,
);

/** Hero card: amount spent for the active type (purchases only — deductions are
 *  excluded from the "spent" caption so the number matches the Spending tab).
 *  `heroRemaining` still deducts subs/loans from the available-to-spend total. */
const heroSpent = computed(() =>
  dashboardTypeFilter.value === 'needs'
    ? biWeeklyNeedsSpent.value
    : biWeeklySpent.value,
);

/** Hero card: remaining for the active type. */
const heroRemaining = computed(() =>
  dashboardTypeFilter.value === 'needs'
    ? biWeeklyNeedsRemaining.value
    : biWeeklyRemaining.value,
);

/** Hero card: % used for the active type. */
const heroUsedPct = computed(() => {
  if (heroBudget.value <= 0) return 0;
  return Math.min(100, (heroSpent.value / heroBudget.value) * 100);
});

// ─── Quick-add modal ──────────────────────────────────────────────
const showQuickAdd       = ref(false);
const quickAddName       = ref('');
const quickAddAmount     = ref('');
const quickAddBudgetType = ref<'wants' | 'needs'>('wants');
const quickAddInputEl    = ref<HTMLInputElement | null>(null);

const quickAddCats = computed(() => budget.spendingCategories);

const defaultCategory = computed(() =>
  quickAddCats.value[0]?.id ?? 'other',
);

const quickAddCategory = ref(defaultCategory.value);

/** Bi-weekly needs envelope (income × needs% ÷ 2). */
const biWeeklyNeedsBudget = computed(() =>
  (totalMonthlyIncome.value * (budget.allocation.needs / 100)) / 2,
);

/** All needs purchases spent so far this period. */
const biWeeklyNeedsSpent = computed(() =>
  budget.purchases
    .filter(p => p.budgetType === 'needs')
    .reduce((s, p) => s + p.amount, 0),
);

const biWeeklyNeedsRemaining = computed(() =>
  biWeeklyNeedsBudget.value - biWeeklyNeedsSpent.value,
);

const quickAddAfter = computed(() => {
  const amt = parseFloat(quickAddAmount.value) || 0;
  return quickAddBudgetType.value === 'needs'
    ? biWeeklyNeedsRemaining.value - amt
    : biWeeklyRemaining.value - amt;
});

const quickAddPreviewLabel = computed(() =>
  quickAddBudgetType.value === 'needs'
    ? 'BI-WEEKLY NEEDS REMAINING AFTER'
    : 'BI-WEEKLY WANTS REMAINING AFTER',
);

const quickAddValid = computed(() =>
  quickAddName.value.trim() !== '' &&
  parseFloat(quickAddAmount.value) > 0,
);

function openQuickAdd(): void {
  quickAddName.value       = '';
  quickAddAmount.value     = '';
  quickAddBudgetType.value = 'wants';
  quickAddCategory.value   = defaultCategory.value;
  showQuickAdd.value       = true;
  // BUG-020: use programmatic focus via nextTick instead of the `autofocus`
  // HTML attribute, which triggers a browser warning when another element
  // already has focus when the input is inserted into the DOM.
  nextTick(() => quickAddInputEl.value?.focus());
}

function submitQuickAdd(): void {
  if (!quickAddValid.value) return;
  const purchase: Omit<Purchase, 'id'> = {
    name:       quickAddName.value.trim(),
    amount:     parseFloat(quickAddAmount.value),
    category:   quickAddCategory.value,
    cardId:     null,
    budgetType: quickAddBudgetType.value,
    date:       today.toISOString().split('T')[0] as Purchase['date'],
  };
  budget.addPurchase(purchase);
  const typeLabel = quickAddBudgetType.value === 'needs' ? 'needs' : 'wants';
  toast.show(`Added "${purchase.name}" (${fmt(purchase.amount)}) to ${typeLabel}.`, 'success');
  showQuickAdd.value = false;
}
</script>

<template>
  <div class="page-dashboard">

    <!-- ══ Page header ═══════════════════════════════════════════════════ -->
    <header class="dash-header">
      <div class="dash-header__text">
        <p class="dash-header__eyebrow">
          Welcome back, Brahim
        </p>
        <h1 class="dash-header__title">
          Your money, {{ monthLabel }}
        </h1>
      </div>

      <div class="dash-header__actions">
        <button
          class="btn-primary"
          @click="openQuickAdd"
        >
          <span aria-hidden="true">+</span> Add purchase
        </button>
      </div>
    </header>

    <!-- ══ Hero KPI row ══════════════════════════════════════════════════ -->
    <div class="kpi-row">

      <!-- ── Hero: bi-weekly envelope (RS-16: wants/needs toggle) ── -->
      <div class="kpi-hero">
        <div class="kpi-hero__circle kpi-hero__circle--lg" aria-hidden="true" />
        <div class="kpi-hero__circle kpi-hero__circle--sm" aria-hidden="true" />

        <div class="kpi-hero__content">
          <div class="kpi-hero__label-row">
            <p class="kpi-hero__label">
              Available to spend
            </p>
            <!-- Wants / Needs toggle -->
            <div class="hero-type-toggle">
              <button
                class="htt-btn"
                :class="{ 'htt-btn--active': dashboardTypeFilter === 'wants' }"
                @click="dashboardTypeFilter = 'wants'"
              >
                Wants
              </button>
              <button
                class="htt-btn"
                :class="{ 'htt-btn--active': dashboardTypeFilter === 'needs' }"
                @click="dashboardTypeFilter = 'needs'"
              >
                Needs
              </button>
            </div>
          </div>
          <p
            v-if="periodEndLabel"
            class="kpi-hero__subtitle"
          >
            Bi-weekly {{ dashboardTypeFilter }} · until {{ periodEndLabel }}
          </p>
          <p
            v-else
            class="kpi-hero__subtitle"
          >
            Bi-weekly {{ dashboardTypeFilter }} · set a pay date in Settings
          </p>

          <div class="kpi-hero__amount">
            <span class="kpi-hero__amount-int">{{ fmt(Math.abs(heroRemaining)).split('.')[0] }}</span><span class="kpi-hero__amount-dec">.{{ fmt(Math.abs(heroRemaining)).split('.')[1] ?? '00' }}</span>
            <span
              v-if="heroRemaining < 0"
              class="kpi-hero__over-badge"
            >OVER</span>
          </div>

          <p class="kpi-hero__caption">
            {{ fmt(heroSpent) }} spent of {{ fmt(heroBudget) }}
          </p>
          <div
            class="kpi-hero__track"
            role="progressbar"
            :aria-valuenow="heroUsedPct"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`Bi-weekly ${dashboardTypeFilter} spent`"
          >
            <div
              class="kpi-hero__fill"
              :style="{ width: `${Math.min(100, heroUsedPct)}%` }"
            />
          </div>
        </div>
      </div>

      <!-- ── Due in 7 days ── -->
      <div class="kpi-card">
        <div class="kpi-card__header">
          <span class="kpi-card__label">Due next 7 days</span>
          <span
            v-if="dueInSevenDays.length"
            class="kpi-badge kpi-badge--chartreuse"
          >{{ dueInSevenDays.length }}</span>
        </div>
        <div class="kpi-card__value">
          {{ fmt(dueInSevenTotal) }}
        </div>
        <div
          v-if="dueInSevenDays.length === 0"
          class="kpi-card__empty"
        >
          Nothing due in the next 7 days 🎉
        </div>
        <ul
          v-else
          class="kpi-due-list"
        >
          <li
            v-for="item in dueInSevenDays.slice(0, 3)"
            :key="item.id + item.periodDate"
            class="kpi-due-item"
          >
            <span class="kpi-due-item__day">
              {{ new Date(item.periodDate + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) }}
            </span>
            <span class="kpi-due-item__name">{{ item.name }}</span>
            <span class="kpi-due-item__amount">{{ fmt(item.amount) }}</span>
          </li>
        </ul>
        <p
          v-if="dueInSevenDays.length > 3"
          class="kpi-card__more"
        >
          +{{ dueInSevenDays.length - 3 }} more — see Schedule tab
        </p>
      </div>

      <!-- ── Needs spent ── -->
      <div class="kpi-card">
        <div class="kpi-card__header">
          <span class="kpi-card__label">Needs spent</span>
        </div>
        <div
          class="kpi-card__value"
          :class="{ 'kpi-card__value--danger': needsIsOver }"
        >
          {{ fmt(currentMonthActuals.needs) }}
        </div>
        <div class="kpi-card__delta-row">
          <span
            v-if="needsDelta !== null"
            class="kpi-delta"
            :class="needsDelta > 0 ? 'kpi-delta--bad' : 'kpi-delta--good'"
          >
            {{ needsDelta > 0 ? '↑' : '↓' }} {{ fmt(Math.abs(needsDelta)) }}
          </span>
          <span class="kpi-card__budget-hint">of {{ fmt(currentMonthBudgeted.needs) }}</span>
        </div>
        <ProgressBar
          class="kpi-card__bar"
          :percent="needsUsedPct"
          :status="needsIsOver ? 'over' : 'on-track'"
          size="sm"
          aria-label="Needs budget used"
        />
      </div>

      <!-- ── Net worth ── -->
      <div class="kpi-card">
        <div class="kpi-card__header">
          <span class="kpi-card__label">Net worth</span>
        </div>
        <div class="kpi-card__value">
          {{ fmt(netWorth.netWorth) }}
        </div>
        <div class="kpi-card__delta-row">
          <span
            v-if="netWorth.momChange !== null"
            class="kpi-delta"
            :class="netWorth.momChange >= 0 ? 'kpi-delta--good' : 'kpi-delta--bad'"
          >
            {{ netWorth.momChange >= 0 ? '↑' : '↓' }}
            {{ fmt(Math.abs(netWorth.momChange)) }}
          </span>
          <span
            v-if="netWorthMomPct !== null"
            class="kpi-card__budget-hint"
          >
            ({{ netWorthMomPct >= 0 ? '+' : '' }}{{ netWorthMomPct.toFixed(1) }}%)
          </span>
        </div>
        <p class="kpi-card__sub-hint">
          Assets {{ fmt(netWorth.totalAssets) }} · Liabilities {{ fmt(netWorth.totalLiabilities) }}
        </p>
      </div>
    </div><!-- /kpi-row -->

    <!-- ══ Row 2 — 2-col charts row ════════════════════════════════════
         Purchases This Period (donut) · Money Flow (12-month trend)
    ═══════════════════════════════════════════════════════════════════ -->
    <div class="dash-charts-row">
      <BaseCard
        title="Purchases This Period"
        section-id="purchases-this-period"
        :collapsible="true"
      >
        <PurchasesThisPeriod :type-filter="dashboardTypeFilter" />
      </BaseCard>

      <BaseCard
        title="Money Flow (12 months)"
        section-id="money-flow"
        :collapsible="true"
      >
        <MoneyFlow />
      </BaseCard>
    </div>

    <!-- ══ Row 3 — 3-col widget row ══════════════════════════════════════
         Recurring Spend · Loan Payoff · Savings Accounts
    ═══════════════════════════════════════════════════════════════════ -->
    <div class="dash-widget-row">
      <BaseCard
        title="Recurring Spend"
        section-id="expense-cards"
        :collapsible="true"
      >
        <RecurringSpend />
      </BaseCard>

      <BaseCard
        title="Loan Payoff"
        section-id="loans"
        :collapsible="true"
      >
        <Loans />
      </BaseCard>

      <BaseCard
        title="Savings Accounts"
        section-id="savings-accounts"
        :collapsible="true"
      >
        <Savings />
      </BaseCard>
    </div>

    <!-- ══ Row 4 — 2-col row ══════════════════════════════════════════════
         Chequing Balance · Subscriptions
    ═══════════════════════════════════════════════════════════════════ -->
    <div class="dash-2col-row">
      <BaseCard
        title="Chequing Balance"
        section-id="chequing-balance"
        :collapsible="true"
      >
        <ChequingBalance />
      </BaseCard>

      <BaseCard
        title="Subscriptions"
        section-id="subscriptions"
        :collapsible="true"
      >
        <Subscriptions />
      </BaseCard>
    </div>

    <!-- ══ Row 5 — full-width: Credit Cards ══════════════════════════════
         (inline add/withdraw redesign in RS-13)
    ═══════════════════════════════════════════════════════════════════ -->
    <BaseCard
      title="Credit Cards"
      section-id="credit-cards"
      :collapsible="true"
    >
      <CreditCards />
    </BaseCard>

    <!-- ══ Row 6 — full-width: Wishlist ══════════════════════════════════
         (redesign in RS-14)
    ═══════════════════════════════════════════════════════════════════ -->
    <BaseCard
      title="Wishlist"
      section-id="wishlist"
      :collapsible="true"
    >
      <Wishlist />
    </BaseCard>

    <!-- ══ Quick-add wants modal ══════════════════════════════════════════ -->
    <BaseModal
      v-model:open="showQuickAdd"
      title="Log a purchase"
      size="sm"
    >
      <div class="quick-add">
        <p class="quick-add__eyebrow">
          QUICK ADD
        </p>

        <!-- Want / Need type toggle -->
        <label class="quick-add__label">Purchase type</label>
        <div class="quick-add__type-row">
          <button
            class="quick-add__type-btn"
            :class="{ 'quick-add__type-btn--wants': quickAddBudgetType === 'wants' }"
            type="button"
            @click="quickAddBudgetType = 'wants'"
          >
            🛍 Want
          </button>
          <button
            class="quick-add__type-btn"
            :class="{ 'quick-add__type-btn--needs': quickAddBudgetType === 'needs' }"
            type="button"
            @click="quickAddBudgetType = 'needs'"
          >
            🏠 Need
          </button>
        </div>

        <label class="quick-add__label">What did you buy?</label>
        <input
          ref="quickAddInputEl"
          v-model="quickAddName"
          class="quick-add__input"
          placeholder="e.g. coffee, t-shirt, dinner"
          @keydown.enter="submitQuickAdd"
          @keydown.esc="showQuickAdd = false"
        >

        <label class="quick-add__label">Amount</label>
        <div class="quick-add__amount-wrap">
          <span class="quick-add__dollar">$</span>
          <input
            v-model="quickAddAmount"
            class="quick-add__input quick-add__input--amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            @keydown.enter="submitQuickAdd"
            @keydown.esc="showQuickAdd = false"
          >
        </div>

        <label class="quick-add__label">Category</label>
        <div class="quick-add__cats">
          <button
            v-for="c in quickAddCats"
            :key="c.id"
            class="quick-add__cat-btn"
            :class="{ 'quick-add__cat-btn--active': quickAddCategory === c.id }"
            :style="quickAddCategory === c.id ? `--cat-color: ${c.color}` : ''"
            type="button"
            @click="quickAddCategory = c.id"
          >
            {{ c.name }}
          </button>
        </div>

        <!-- Remaining preview -->
        <div class="quick-add__preview">
          <div>
            <p class="quick-add__preview-label">
              {{ quickAddPreviewLabel }}
            </p>
            <p
              class="quick-add__preview-value"
              :class="{ 'quick-add__preview-value--over': quickAddAfter < 0 }"
            >
              {{ fmt(quickAddAfter) }}
            </p>
          </div>
          <span
            v-if="quickAddAfter < 0"
            class="kpi-delta kpi-delta--bad"
          >OVER BUDGET</span>
        </div>

        <div class="quick-add__footer">
          <button
            class="btn-secondary"
            type="button"
            @click="showQuickAdd = false"
          >
            Cancel
          </button>
          <button
            class="btn-primary"
            type="button"
            :disabled="!quickAddValid"
            @click="submitQuickAdd"
          >
            Add purchase
          </button>
        </div>
      </div>
    </BaseModal>

  </div><!-- /page-dashboard -->
</template>

<style scoped>
.page-dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ─── Page header ───────────────────────────────────────────────── */
.dash-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.dash-header__eyebrow {
  margin: 0 0 0.25rem;
  font-size: 0.8rem;
  color: var(--muted);
  font-weight: 500;
}

.dash-header__title {
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 1.85rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text);
}

.dash-header__actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}

/* ─── Shared button styles ─────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 1.1rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 2px 10px color-mix(in srgb, var(--accent) 40%, transparent);
  transition: opacity var(--transition-fast), box-shadow var(--transition-fast);
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 1rem;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}
.btn-secondary:hover { background: var(--surface2); }

/* ─── KPI row ──────────────────────────────────────────────────── */
.kpi-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 0.875rem;
  align-items: stretch;
}

@media (max-width: 1024px) {
  .kpi-row { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 600px) {
  .kpi-row { grid-template-columns: 1fr; }
}

/* ─── Hero card ────────────────────────────────────────────────── */
.kpi-hero {
  background: var(--accent);
  color: #fff;
  border-radius: 18px;
  padding: 1.5rem 1.6rem 1.4rem;
  position: relative;
  overflow: hidden;
  min-height: 200px;
  display: flex;
  align-items: flex-end;
}

.kpi-hero__circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.kpi-hero__circle--lg {
  width: 180px;
  height: 180px;
  top: -50px;
  right: -50px;
}

.kpi-hero__circle--sm {
  width: 90px;
  height: 90px;
  top: -15px;
  right: 70px;
  background: rgba(255, 255, 255, 0.05);
}

.kpi-hero__content {
  position: relative;
  width: 100%;
}

/* ── Hero label row (label + type toggle side by side) ─────────── */
.kpi-hero__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
}

.kpi-hero__label {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
}

/* ── Wants / Needs toggle pill (inside hero card) ────────────────── */
.hero-type-toggle {
  display: flex;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 999px;
  padding: 2px;
  gap: 2px;
}

.htt-btn {
  padding: 3px 10px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.02em;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.htt-btn--active {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.htt-btn:not(.htt-btn--active):hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
}

.kpi-hero__subtitle {
  margin: 0 0 0.85rem;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.65);
}

.kpi-hero__amount {
  display: flex;
  align-items: baseline;
  gap: 0.1rem;
  margin-bottom: 0.5rem;
  line-height: 1;
}

.kpi-hero__amount-int {
  font-size: clamp(2.8rem, 5vw, 3.5rem);
  font-weight: 800;
  letter-spacing: -0.06em;
}

.kpi-hero__amount-dec {
  font-size: clamp(1.4rem, 2.5vw, 1.75rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  color: rgba(255, 255, 255, 0.7);
}

.kpi-hero__over-badge {
  margin-left: 0.5rem;
  padding: 0.15rem 0.55rem;
  background: rgba(255, 107, 107, 0.3);
  border: 1px solid rgba(255, 107, 107, 0.6);
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #ffadad;
  align-self: center;
}

.kpi-hero__caption {
  margin: 0 0 0.55rem;
  font-size: 0.72rem;
  font-family: var(--font-mono);
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.65);
}

/* ─── Standard KPI cards ───────────────────────────────────────── */
.kpi-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 1.35rem 1.4rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.kpi-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.kpi-card__label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--muted);
}

.kpi-badge {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
}

.kpi-badge--chartreuse {
  background: #c8f24a;
  color: #3a4500;
}

.kpi-card__value {
  font-size: clamp(1.5rem, 2.5vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--text);
  line-height: 1;
  margin-bottom: 0.2rem;
}

.kpi-card__value--danger {
  color: var(--danger);
}

.kpi-card__delta-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.kpi-card__budget-hint {
  font-size: 0.75rem;
  color: var(--muted);
}

.kpi-card__sub-hint {
  margin: 0.35rem 0 0;
  font-size: 0.72rem;
  color: var(--muted);
}

.kpi-card__bar {
  margin-top: 0.6rem;
}

.kpi-card__empty {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 0.25rem;
}

.kpi-card__more {
  margin: 0.3rem 0 0;
  font-size: 0.72rem;
  color: var(--muted);
}

/* ─── Delta chips ──────────────────────────────────────────────── */
.kpi-delta {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}

.kpi-delta--good {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
}

.kpi-delta--bad {
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  color: var(--danger);
}

/* ─── Due in 7 days list ───────────────────────────────────────── */
.kpi-due-list {
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
}

.kpi-due-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.78rem;
}

.kpi-due-item__day {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--muted);
  min-width: 3.5rem;
  flex-shrink: 0;
}

.kpi-due-item__name {
  flex: 1;
  color: var(--text);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-due-item__amount {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text);
  flex-shrink: 0;
}

/* ─── Hero inline progress track ──────────────────────────────── */
.kpi-hero__track {
  height: 6px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  overflow: hidden;
}

.kpi-hero__fill {
  height: 100%;
  background: #c8f24a;
  border-radius: 999px;
  transition: width 0.35s ease-out;
}

/* ─── Dashboard grid rows ──────────────────────────────────────── */

/* 2-col charts row: Purchases This Period | Money Flow */
.dash-charts-row {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 900px) {
  .dash-charts-row {
    grid-template-columns: 1fr;
  }
}

/* 3-col row: Recurring Spend | Loan Payoff | Savings Accounts */
.dash-widget-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 1100px) {
  .dash-widget-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 680px) {
  .dash-widget-row {
    grid-template-columns: 1fr;
  }
}

/* 2-col row: Chequing Balance | Subscriptions */
.dash-2col-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 680px) {
  .dash-2col-row {
    grid-template-columns: 1fr;
  }
}

/* ─── Quick-add modal ──────────────────────────────────────────── */
.quick-add {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.quick-add__eyebrow {
  margin: 0 0 0.75rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--muted);
  font-family: var(--font-mono);
}

.quick-add__label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 0.3rem;
}

.quick-add__input {
  width: 100%;
  padding: 0.65rem 0.8rem;
  font-size: 0.9rem;
  font-family: inherit;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 10px;
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--transition-fast);
  margin-bottom: 1rem;
}

.quick-add__input:focus {
  border-color: var(--accent);
}

.quick-add__amount-wrap {
  position: relative;
  margin-bottom: 1rem;
}

.quick-add__dollar {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 0.9rem;
  pointer-events: none;
}

.quick-add__input--amount {
  padding-left: 1.6rem;
  margin-bottom: 0;
  font-family: var(--font-mono);
}

/* ── Want / Need type toggle ───────────────────────────────────── */
.quick-add__type-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.quick-add__type-btn {
  padding: 0.55rem 0;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--muted);
  font-family: inherit;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.quick-add__type-btn:hover:not(.quick-add__type-btn--wants):not(.quick-add__type-btn--needs) {
  border-color: var(--text);
  color: var(--text);
}

.quick-add__type-btn--wants {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}

.quick-add__type-btn--needs {
  background: color-mix(in srgb, var(--danger, #f87171) 12%, transparent);
  border-color: var(--danger, #f87171);
  color: var(--danger, #f87171);
}

.quick-add__cats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1.25rem;
}

.quick-add__cat-btn {
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  font-family: inherit;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.quick-add__cat-btn--active {
  background: color-mix(in srgb, var(--cat-color, var(--accent)) 20%, transparent);
  border-color: var(--cat-color, var(--accent));
  color: var(--cat-color, var(--accent));
}

.quick-add__preview {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.quick-add__preview-label {
  margin: 0 0 0.2rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--muted);
  font-family: var(--font-mono);
}

.quick-add__preview-value {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--text);
}

.quick-add__preview-value--over {
  color: var(--danger);
}

.quick-add__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

/* ─── Responsive ──────────────────────────────────────────────── */
@media (max-width: 768px) {
  .dash-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .dash-header__actions {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn-primary,
  .btn-secondary { transition: none; }
}
</style>
