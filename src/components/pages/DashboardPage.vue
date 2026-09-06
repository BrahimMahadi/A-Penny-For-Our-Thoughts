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
              Row 1 — 4-col KPI hero row (wants envelope, due-in-7, needs, chequing balance)
              Row 2 — 2-col charts row   (Purchases This Period | Money Flow)
              Row 3 — 3-col widget row   (Recurring Spend | Loan Payoff | Savings Accounts)
              Row 4 — full-width         (Subscriptions)
              Row 5 — full-width         (Credit Cards)
              Row 6 — full-width         (Wishlist)
-->

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import BaseCard    from '@/components/ui/BaseCard.vue';
import BaseModal   from '@/components/ui/BaseModal.vue';
import ProgressBar from '@/components/ui/ProgressBar.vue';
import { useUiStore }    from '@/stores/ui';
import { useBudgetStore } from '@/stores/budget';
import { useAnalytics }  from '@/composables/useAnalytics';
import { useToast }      from '@/composables/useToast';
import { useGsap, prefersReducedMotion } from '@/composables/useGsap';
import { useScrollReveal } from '@/composables/useScrollReveal';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
import { useFlipIndicator }   from '@/composables/useFlipIndicator';
import { useCountUp }         from '@/composables/useCountUp';
import { useFormValidation, rules } from '@/composables/useFormValidation';
import { useToday } from '@/composables/useToday';
import { fmt }           from '@/utils/format';
import {
  getEnvelopeState,
  getSubsDeductedThisPeriod,
  getLoansDeductedThisPeriod,
  getPayPeriodForecast,
  getPreviousPeriodPaceSpend,
  applyRulesToName,
} from '@/utils/calculations';
import { FALLBACK_CATEGORY_NAME } from '@/data/categories';
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
import OneTimeIncomeModal  from '@/components/modals/OneTimeIncomeModal.vue';
import ThemeToggle         from '@/components/ui/ThemeToggle.vue';

// ─── Stores & composables ──────────────────────────────────────────
const ui     = useUiStore();
const budget = useBudgetStore();
const toast  = useToast();
const { from: gsapFrom } = useGsap();
const { revealImmediate, revealOnScrollY } = useScrollReveal();
const {
  totalMonthlyIncome,
  payPeriodForecast,
} = useAnalytics();

// ─── Reactive "today" ─────────────────────────────────────────────
// BUG-035: a frozen `const today = new Date()` never advanced across a
// pay-period boundary while the tab stayed open, stranding the hero window
// and windfall boost on the previous period. `useToday()` returns a reactive
// Date that updates when the calendar day rolls over, so every computed below
// that reads `today.value` self-heals.
const { today } = useToday();

// ─── Dashboard greeting ───────────────────────────────────────────
// Personalised from budget.displayName (set in onboarding / Settings).
// Falls back to a bare "Welcome back" when no name is set, so the
// greeting never shows a hardcoded or stale name.
const greeting = computed(() => {
  const name = budget.displayName.trim();
  return name ? `Welcome back, ${name}` : 'Welcome back';
});

// ─── Current pay-period window (offset 0 = in-progress period) ────
// BUG-024: the Dashboard must date-filter purchases to the current
// period window, exactly as SpendingPage does. Without this, any
// purchases that survived in `budget.purchases` beyond a rollover
// (due to the BUG-023 DB sync gap) would silently inflate the totals.
// Even after BUG-023 is fixed this remains the correct behaviour —
// undated purchases and any edge-case DB drift are filtered out rather
// than silently counted.
const currentPeriod = computed(() => getPayPeriodForecast(budget.$state, 0, today.value));

/**
 * Purchases that fall within the current bi-weekly period window.
 * Mirrors the `purchasesInPeriod` filter in SpendingPage so both tabs
 * always show the same set of purchases.
 */
const currentPeriodPurchases = computed<Purchase[]>(() => {
  if (!currentPeriod.value) return budget.purchases; // no payStart set yet
  const { periodStart, periodEnd } = currentPeriod.value;
  return budget.purchases.filter(
    p => p.date && p.date >= periodStart && p.date <= periodEnd,
  );
});

// ─── Hero KPI: bi-weekly wants envelope ───────────────────────────
const biWeeklyBudget = computed(() =>
  (totalMonthlyIncome.value * (budget.allocation.wants / 100)) / 2
  + budget.currentPeriodExtraWants,
);

const biWeeklySpent = computed(() =>
  currentPeriodPurchases.value
    .filter(p => (p.budgetType || 'wants') === 'wants')
    .reduce((s, p) => s + p.amount, 0),
);

/** Subscription + loan amounts deducted from this bi-weekly envelope. */
/* BUG-042: every envelope figure now comes from one helper so "spent" and
   "remaining" can never disagree again. See getEnvelopeState. */
const wantsEnvelope = computed(() =>
  getEnvelopeState(budget.$state, biWeeklyBudget.value, 'wants', today.value),
);
const needsEnvelope = computed(() =>
  getEnvelopeState(budget.$state, biWeeklyNeedsBudget.value, 'needs', today.value),
);

const biWeeklyDeductions = computed(() => wantsEnvelope.value.deductions);
const biWeeklyRemaining  = computed(() => wantsEnvelope.value.remaining);
const biWeeklyUsedPct    = computed(() => Math.min(100, wantsEnvelope.value.usedPct));

/** "until May 24" label from the current pay period's end date. */
const periodEndLabel = computed(() => {
  const end = payPeriodForecast.value?.periodEnd;
  if (!end) return null;
  return new Date(end + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
});

// ─── Due in 7 days ────────────────────────────────────────────────
// Computeds (not consts) so they track the reactive `today` across a rollover.
const todayStr = computed(() => today.value.toISOString().split('T')[0]);
const sevenDaysStr = computed(() => {
  const out = new Date(today.value);
  out.setDate(today.value.getDate() + 7);
  return out.toISOString().split('T')[0];
});

const dueInSevenDays = computed(() =>
  (payPeriodForecast.value?.dated ?? []).filter(
    item => item.periodDate >= todayStr.value && item.periodDate <= sevenDaysStr.value,
  ),
);

const dueInSevenTotal = computed(() =>
  dueInSevenDays.value.reduce((s, item) => s + item.amount, 0),
);

// ─── Hero period-over-period delta (v2.45.2) ──────────────────────
// Pace-adjusted: spend-so-far this period vs last period's spend through the
// SAME elapsed day, for the active wants/needs bucket (`heroSpent`). Returns
// null when no prior period is archived → the chip is hidden. Reactive via the
// clock-backed `today` and the spending-history slice.
const periodPaceLast = computed(() =>
  getPreviousPeriodPaceSpend(budget.$state, dashboardTypeFilter.value, today.value),
);

/** Δ vs last period's pace; null when there's no prior period to compare. */
const periodDelta = computed<number | null>(() =>
  periodPaceLast.value === null ? null : heroSpent.value - periodPaceLast.value,
);

/** Direction for styling/arrow. `up` = spending faster than last period (cautionary). */
const periodDeltaDir = computed<'up' | 'down' | 'flat' | null>(() => {
  if (periodDelta.value === null) return null;
  if (periodDelta.value > 0.005) return 'up';
  if (periodDelta.value < -0.005) return 'down';
  return 'flat';
});

// ─── Dashboard shared type toggle (RS-16) ────────────────────────
/** Drives the hero card + Purchases This Period. Persists per session only. */
const dashboardTypeFilter = ref<'wants' | 'needs'>('wants');

// ── Flip pill indicator for the hero toggle ───────────────────────
const heroToggleRef = ref<HTMLElement | null>(null);
const heroIndRef    = ref<HTMLElement | null>(null);
const heroAmountRef = ref<HTMLElement | null>(null);

const { move: moveHeroInd } = useFlipIndicator(
  heroToggleRef,
  heroIndRef,
  {
    activeSel: '.htt-btn--active',
    ease:      'back.out(2.5)',
    duration:  0.32,
    axis:      'both',
  },
);

/** Set the hero type filter and trigger Flip + fade-drift animations. */
function setHeroFilter(type: 'wants' | 'needs'): void {
  if (dashboardTypeFilter.value === type) return;
  dashboardTypeFilter.value = type; // reactive update first — tests rely on this
  void moveHeroInd();               // Flip pill animates after nextTick
  // Fade + vertical drift on the amount so it feels refreshed
  nextTick(() => {
    if (heroAmountRef.value) {
      gsapFrom(heroAmountRef.value, {
        y: 6,
        opacity: 0,
        duration: 0.26,
        ease: 'power2.out',
        clearProps: 'opacity,y,transform',
      });
    }
  });
}

/** Hero card: budget for the active type. */
const heroBudget = computed(() =>
  dashboardTypeFilter.value === 'needs' ? biWeeklyNeedsBudget.value : biWeeklyBudget.value,
);

/**
 * Hero card: amount consumed from the active envelope — purchases AND the
 * subscription/loan deductions.
 *
 * BUG-042: this was purchases-only, a deliberate BUG-021 decision to make the
 * caption match the Spending tab. The cost was a card that read "$362.00 spent
 * of $627.45" directly beneath "$37.67 OVER" — two statements that cannot both
 * be read plainly. Everything now reports the same figure instead.
 */
const heroSpent = computed(() =>
  dashboardTypeFilter.value === 'needs'
    ? needsEnvelope.value.spent
    : wantsEnvelope.value.spent,
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

// ─── Quick-income modal ───────────────────────────────────────────
const showQuickIncome = ref(false);

function openQuickIncome(): void {
  showQuickIncome.value = true;
}

// ─── Quick-add modal ──────────────────────────────────────────────
const showQuickAdd       = ref(false);
const quickAddName       = ref('');
const quickAddAmount     = ref('');
const quickAddBudgetType = ref<'wants' | 'needs'>('wants');
const quickAddInputEl    = ref<HTMLInputElement | null>(null);
const quickAddCardId     = ref<string | null>(null);

const quickAddValidation = useFormValidation(() => ({
  name:   rules.required(quickAddName.value, 'Name'),
  amount: rules.positiveNumber(parseFloat(quickAddAmount.value) || 0, 'Amount'),
}));

const quickAddCats = computed(() => budget.spendingCategories);

const defaultCategory = computed(() =>
  quickAddCats.value[0]?.name ?? FALLBACK_CATEGORY_NAME,
);

const quickAddCategory = ref(defaultCategory.value);

// ─── Auto-categorise by rules (BUG-028) ──────────────────────────
// Mirror the same watch that SpendingPage uses so transaction rules
// apply as the user types in the quick-add name field. When a rule
// matches, the corresponding category pill highlights automatically.
// The user can still override by tapping any other pill.
watch(quickAddName, (name) => {
  const matched = applyRulesToName(budget.rules, name);
  if (matched) quickAddCategory.value = matched;
});

/** Bi-weekly needs envelope (income × needs% ÷ 2) + windfall needs boost. */
const biWeeklyNeedsBudget = computed(() =>
  (totalMonthlyIncome.value * (budget.allocation.needs / 100)) / 2
  + budget.currentPeriodExtraNeeds,
);

/** All needs purchases spent so far this period (current window only). */
const biWeeklyNeedsSpent = computed(() =>
  currentPeriodPurchases.value
    .filter(p => p.budgetType === 'needs')
    .reduce((s, p) => s + p.amount, 0),
);

/* BUG-042: needs previously subtracted NO deductions at all, so a
   need-flagged subscription or loan was invisible and this overstated the
   money available. It now deducts its own bucket, symmetrically with wants. */
const biWeeklyNeedsRemaining = computed(() => needsEnvelope.value.remaining);

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


function openQuickAdd(): void {
  quickAddName.value       = '';
  quickAddAmount.value     = '';
  quickAddBudgetType.value = 'wants';
  quickAddCategory.value   = defaultCategory.value;
  quickAddCardId.value     = null;
  quickAddValidation.reset();
  showQuickAdd.value       = true;
  // BUG-020: use programmatic focus via nextTick instead of the `autofocus`
  // HTML attribute, which triggers a browser warning when another element
  // already has focus when the input is inserted into the DOM.
  nextTick(() => quickAddInputEl.value?.focus());
}

function submitQuickAdd(): void {
  quickAddValidation.touchAll();
  if (!quickAddValidation.isValid.value) return;
  const purchase: Omit<Purchase, 'id'> = {
    name:       quickAddName.value.trim(),
    amount:     parseFloat(quickAddAmount.value),
    category:   quickAddCategory.value,
    cardId:     quickAddCardId.value,
    budgetType: quickAddBudgetType.value,
    date:       today.value.toISOString().split('T')[0] as Purchase['date'],
  };
  budget.addPurchase(purchase);
  const typeLabel = quickAddBudgetType.value === 'needs' ? 'needs' : 'wants';
  toast.show(`Added "${purchase.name}" (${fmt(purchase.amount)}) to ${typeLabel}.`, 'success');
  showQuickAdd.value = false;

  // Brief pulse on the hero amount to confirm the balance just changed
  if (heroAmountRef.value && !prefersReducedMotion()) {
    gsap.fromTo(
      heroAmountRef.value,
      { scale: 1 },
      { scale: 1.06, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 1 },
    );
  }
}

// ─── Page-load animations ─────────────────────────────────────────────────
// dashboardRef points to the root .page-dashboard element so we can query
// its .base-card children without selecting cards from other pages.
const dashboardRef = ref<HTMLElement | null>(null);

// Animated display value for the hero "remaining" amount — counts up from
// $0 on mount and transitions smoothly when the Wants/Needs toggle switches.
const animHeroRemaining = useCountUp(computed(() => Math.abs(heroRemaining.value)));

onMounted(() => {
  nextTick(() => {
    const root = dashboardRef.value;
    if (!root) return;

    // ── 1. Hero KPI card — immediate, shorter travel distance ──────────────
    const hero = root.querySelector<HTMLElement>('.kpi-hero');
    if (hero) revealImmediate([hero], 0.05, 0.6);

    // ── 2. KPI cards + Chequing Balance card — immediate stagger ──────────
    const kpiItems = Array.from(
      root.querySelectorAll<HTMLElement>('.kpi-card, .kpi-row > .base-card'),
    );
    if (kpiItems.length) revealImmediate(kpiItems, 0.15);

    // ── 3. Charts row — ScrollTrigger on the row, animate inner cards ──────
    const chartsRow = root.querySelector<HTMLElement>('.dash-charts-row');
    if (chartsRow) {
      const chartsCards = Array.from(chartsRow.querySelectorAll<HTMLElement>('.base-card'));
      revealOnScrollY(chartsCards.length ? chartsCards : [chartsRow], chartsRow);
    }

    // ── 4. Widget row — ScrollTrigger on the row, animate inner cards ──────
    const widgetRow = root.querySelector<HTMLElement>('.dash-widget-row');
    if (widgetRow) {
      const widgetCards = Array.from(widgetRow.querySelectorAll<HTMLElement>('.base-card'));
      revealOnScrollY(widgetCards.length ? widgetCards : [widgetRow], widgetRow);
    }

    // ── 5. Full-width cards (Subscriptions, Credit Cards, Wishlist) ─────────
    // Direct children of .page-dashboard that are .base-card
    const fullWidthCards = Array.from(
      root.querySelectorAll<HTMLElement>(':scope > .base-card'),
    );
    fullWidthCards.forEach(card => revealOnScrollY([card]));

    ScrollTrigger.refresh();
  });
});
</script>

<template>
  <div
    ref="dashboardRef"
    class="page-dashboard"
  >

    <!-- ══ Page header ═══════════════════════════════════════════════════ -->
    <header class="dash-header">
      <div class="dash-header__text">
        <h1 class="dash-header__title">
          {{ greeting }}
        </h1>
      </div>

      <div class="dash-header__actions">
        <ThemeToggle
          variant="icon"
          class="dash-header__theme"
        />
        <button
          class="btn-secondary"
          @click="openQuickIncome"
        >
          <span aria-hidden="true">+</span> Log income
        </button>
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
            <!-- Wants / Needs toggle — Flip sliding pill -->
            <div
              ref="heroToggleRef"
              class="hero-type-toggle"
            >
              <!-- Sliding indicator (GSAP Flip manages position) -->
              <span
                ref="heroIndRef"
                class="htt-ind"
                aria-hidden="true"
              />
              <button
                class="htt-btn"
                :class="{ 'htt-btn--active': dashboardTypeFilter === 'wants' }"
                @click="setHeroFilter('wants')"
              >
                Wants
              </button>
              <button
                class="htt-btn"
                :class="{ 'htt-btn--active': dashboardTypeFilter === 'needs' }"
                @click="setHeroFilter('needs')"
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

          <div
            ref="heroAmountRef"
            class="kpi-hero__amount"
          >
            <!-- animHeroRemaining counts up from $0 on mount and transitions
                 smoothly when the Wants/Needs toggle changes. heroRemaining
                 still drives the OVER badge so it flips immediately. -->
            <span class="kpi-hero__amount-int">{{ fmt(animHeroRemaining).split('.')[0] }}</span><span class="kpi-hero__amount-dec">.{{ fmt(animHeroRemaining).split('.')[1] ?? '00' }}</span>
            <span
              v-if="heroRemaining < 0"
              class="kpi-hero__over-badge"
            >OVER</span>
          </div>

          <p class="kpi-hero__caption">
            {{ fmt(heroSpent) }} spent of {{ fmt(heroBudget) }}
          </p>

          <!-- Windfall callout — only shown when extra income exists this period -->
          <p
            v-if="budget.currentPeriodWindfallTotal > 0"
            class="kpi-hero__windfall"
          >
            <span class="kpi-hero__windfall-icon" aria-hidden="true">💰</span>
            +{{ fmt(budget.currentPeriodWindfallTotal) }} windfall this period
          </p>

          <!-- Period-over-period delta (pace-adjusted vs last period). Hidden
               when there's no prior period archived to compare against. -->
          <p
            v-if="periodDelta !== null"
            class="kpi-hero__delta"
            :class="`kpi-hero__delta--${periodDeltaDir}`"
          >
            <span aria-hidden="true">{{ periodDeltaDir === 'up' ? '↑' : periodDeltaDir === 'down' ? '↓' : '→' }}</span>
            {{ fmt(Math.abs(periodDelta)) }} vs last period’s pace
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

      <!-- ── Chequing Balance ── -->
      <BaseCard
        title="Chequing Balance"
        section-id="chequing-balance"
      >
        <ChequingBalance />
      </BaseCard>
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

    <!-- ══ Row 4 — full-width: Subscriptions ════════════════════════════
         (Chequing Balance moved to KPI row)
    ═══════════════════════════════════════════════════════════════════ -->
    <BaseCard
      title="Subscriptions"
      section-id="subscriptions"
      :collapsible="true"
    >
      <Subscriptions />
    </BaseCard>

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

    <!-- ══ Quick-income modal ════════════════════════════════════════════ -->
    <OneTimeIncomeModal
      v-model:open="showQuickIncome"
    />

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
          :class="{ 'form-input--error': quickAddValidation.errors.value.name }"
          placeholder="e.g. coffee, t-shirt, dinner"
          @blur="quickAddValidation.touch('name')"
          @keydown.enter="submitQuickAdd"
          @keydown.esc="showQuickAdd = false"
        >
        <p
          v-if="quickAddValidation.errors.value.name"
          class="quick-add__field-error"
        >
          {{ quickAddValidation.errors.value.name }}
        </p>

        <label class="quick-add__label">Amount</label>
        <div class="quick-add__amount-wrap">
          <span class="quick-add__dollar">$</span>
          <input
            v-model="quickAddAmount"
            class="quick-add__input quick-add__input--amount"
            :class="{ 'form-input--error': quickAddValidation.errors.value.amount }"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            @blur="quickAddValidation.touch('amount')"
            @keydown.enter="submitQuickAdd"
            @keydown.esc="showQuickAdd = false"
          >
        </div>
        <p
          v-if="quickAddValidation.errors.value.amount"
          class="quick-add__field-error"
        >
          {{ quickAddValidation.errors.value.amount }}
        </p>

        <label class="quick-add__label">Category</label>
        <div class="quick-add__cats">
          <button
            v-for="c in quickAddCats"
            :key="c.id"
            class="quick-add__cat-btn"
            :class="{ 'quick-add__cat-btn--active': quickAddCategory === c.name }"
            :style="quickAddCategory === c.name ? `--cat-color: ${c.color}` : ''"
            type="button"
            @click="quickAddCategory = c.name"
          >
            {{ c.name }}
          </button>
        </div>

        <!-- Card (optional — only shown when expense cards exist) -->
        <template v-if="budget.expenseCards.length > 0">
          <label class="quick-add__label">Card (optional)</label>
          <select
            v-model="quickAddCardId"
            class="quick-add__input quick-add__select"
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
        </template>

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
            :disabled="!quickAddValidation.isValid.value"
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

/* ─── KPI row ──────────────────────────────────────────────────── */
.kpi-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 0.875rem;
  align-items: stretch;
}

@media (max-width: 1024px) {
  .kpi-row { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 480px) {
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
  position: relative; /* anchors the abs indicator */
  display: flex;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 999px;
  padding: 2px;
  gap: 2px;
}

/* Sliding indicator — GSAP Flip moves left/top/width/height */
.htt-ind {
  position: absolute;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  pointer-events: none;
  z-index: 0;
  opacity: 0; /* revealed by composable after first snap */
}

.htt-btn {
  position: relative;
  z-index: 1;
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
  transition: color var(--transition-fast);
  white-space: nowrap;
}

.htt-btn--active {
  color: #fff;
}

.htt-btn:not(.htt-btn--active):hover {
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

.kpi-hero__windfall {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0 0 0.55rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #34d399;
  background: rgba(52, 211, 153, 0.15);
  border-radius: 99px;
  padding: 0.15rem 0.55rem;
  letter-spacing: 0.01em;
}
.kpi-hero__windfall-icon {
  font-size: 0.8rem;
}

/* Period-over-period delta chip (pace-adjusted vs last period). On the
   accent hero background, so colours are tuned for contrast on purple. */
.kpi-hero__delta {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0 0 0.55rem;
  font-size: 0.72rem;
  font-weight: 700;
  font-family: var(--font-mono);
  border-radius: 99px;
  padding: 0.15rem 0.55rem;
  letter-spacing: 0.01em;
  background: rgba(255, 255, 255, 0.16);
}
.kpi-hero__delta--up   { color: #ffd0d0; } /* spending faster than last period — cautionary */
.kpi-hero__delta--down { color: #c8f24a; } /* spending slower — good */
.kpi-hero__delta--flat { color: rgba(255, 255, 255, 0.9); }

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

.kpi-card__sub-hint {
  margin: 0.35rem 0 0;
  font-size: 0.72rem;
  color: var(--muted);
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

@media (max-width: 1024px) {
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

@media (max-width: 1024px) {
  .dash-widget-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
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

@media (max-width: 768px) {
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

/* Select element reuses .quick-add__input styles; keep native arrow */
.quick-add__select {
  cursor: pointer;
  appearance: auto;
}

/* Per-field error text — negative top-margin pulls message close to the input */
.quick-add__field-error {
  font-size: 0.75rem;
  color: var(--danger, #f87171);
  margin: -0.65rem 0 0.75rem;
}

/* MOBILE-1: tactile press feedback on the type selector + category chips
   (touch devices have no :hover). The hero toggle uses its Flip indicator
   for feedback, so it's left out of the squeeze to avoid fighting the slide. */
.quick-add__type-btn:active,
.quick-add__cat-btn:active {
  transform: scale(0.96);
}
@media (prefers-reduced-motion: reduce) {
  .quick-add__type-btn:active,
  .quick-add__cat-btn:active { transform: none; }
}

/* ─── Responsive ──────────────────────────────────────────────── */
@media (max-width: 768px) {
  .dash-header {
    flex-direction: column;
    align-items: flex-start;
  }

  /* MOBILE-1: stack the primary actions full-width so they're easy thumb
     targets instead of two cramped, narrow pills. */
  .dash-header__actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  .dash-header__actions .btn-primary,
  .dash-header__actions .btn-secondary {
    width: 100%;
  }
  /* Keep the theme icon compact + right-aligned above the stacked CTAs
     (the column is align-items:stretch, which would otherwise stretch it). */
  .dash-header__theme {
    align-self: flex-end;
  }

  /* MOBILE-1: enlarge the toggle + chip hit areas for thumbs.
     inline-flex centring keeps the label vertically centred at the
     taller min-height. */
  .htt-btn {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .quick-add__cat-btn,
  .quick-add__type-btn {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .quick-add__preview-label { font-size: 0.72rem; }

  /* Cancel the global responsive.css `header h1 { max-width: 140px }` rule —
     that rule targets the tiny app-shell header only; the Dashboard's
     page-level <header class="dash-header"> must never clip the greeting. */
  .dash-header__title {
    max-width: none;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }
}

</style>
