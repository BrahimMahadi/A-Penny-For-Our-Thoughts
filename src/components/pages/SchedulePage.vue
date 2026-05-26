<!--
  Module:   components/pages/SchedulePage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Updated:  May 2026 (Sprint 16 — full-page redesign with pay-period view)
  Summary:  Schedule tab. Owns navigation, view toggle, KPI tiles, and the
            two-column layout (RecurringCalendar + SelectedDay panel).
            RecurringCalendar is a pure widget — this page provides all
            nav controls and consumes the selected-day v-model.
-->

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useUiStore } from '@/stores/ui';
import { useBudgetStore } from '@/stores/budget';
import { useAnalytics } from '@/composables/useAnalytics';
import { getCurrentPeriodStart } from '@/utils/calculations';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import StatCard from '@/components/ui/StatCard.vue';
import RecurringCalendar from '@/components/sections/RecurringCalendar.vue';
import { fmt } from '@/utils/format';
import type { ForecastItem, PayPeriodForecastItem } from '@/utils/calculations';
import type { ISODate } from '@/types/budget';

const ui     = useUiStore();
const budget = useBudgetStore();
const {
  totalMonthlyIncome,
  monthForecast,
  calendarDayMap,
  payPeriodForecast,
  payPeriodDayMap,
} = useAnalytics();

// ─── Selected day (v-model for RecurringCalendar) ─────────────────
const selectedKey = ref<ISODate | null>(null);

// ─── Dynamic page title ───────────────────────────────────────────
const pageTitle = computed(() => {
  if (ui.scheduleView === 'payperiod' && payPeriodForecast.value) {
    return payPeriodForecast.value.label;
  }
  return new Date(ui.scheduleViewYear, ui.scheduleViewMonth - 1, 1)
    .toLocaleString('en-CA', { month: 'long', year: 'numeric' });
});

// ─── Navigation ───────────────────────────────────────────────────
function goToday(): void {
  if (ui.scheduleView === 'payperiod') {
    ui.resetToCurrentPayPeriod();
  } else {
    const now = new Date();
    ui.setScheduleMonth(now.getFullYear(), now.getMonth() + 1);
  }
  selectedKey.value = null;
}

function goPrev(): void {
  if (ui.scheduleView === 'payperiod') ui.stepPayPeriod(-1);
  else ui.stepScheduleMonth(-1);
  selectedKey.value = null;
}

function goNext(): void {
  if (ui.scheduleView === 'payperiod') ui.stepPayPeriod(1);
  else ui.stepScheduleMonth(1);
  selectedKey.value = null;
}

// ─── View toggle ─────────────────────────────────────────────────
function setView(v: 'list' | 'calendar' | 'payperiod'): void {
  ui.setScheduleView(v);
  if (v === 'payperiod') ui.resetToCurrentPayPeriod();
  selectedKey.value = null;
}

// ─── KPI tiles ───────────────────────────────────────────────────
const isPeriodView = computed(() => ui.scheduleView === 'payperiod');
const kpiLabel     = computed(() => isPeriodView.value ? 'this period' : 'this month');

const incomeKpi = computed(() =>
  isPeriodView.value ? totalMonthlyIncome.value / 2 : totalMonthlyIncome.value,
);

const billsKpi = computed(() =>
  isPeriodView.value
    ? (payPeriodForecast.value?.total ?? 0)
    : monthForecast.value.total,
);

const netKpi = computed(() => incomeKpi.value - billsKpi.value);

// ─── Selected day detail ──────────────────────────────────────────
const today = new Date();
const todayIso = today.toISOString().split('T')[0] as ISODate;

/** Items for the selected ISO date (bills/subs/loans). */
const selectedDayItems = computed<(ForecastItem | PayPeriodForecastItem)[]>(() => {
  if (!selectedKey.value) return [];
  const iso = selectedKey.value;

  if (ui.scheduleView === 'payperiod') {
    return payPeriodDayMap.value.get(iso) ?? [];
  }

  // Calendar / list: extract day number from ISO date
  const [y, m, d] = iso.split('-').map(Number);
  if (y !== ui.scheduleViewYear || m !== ui.scheduleViewMonth) return [];
  return calendarDayMap.value.get(d) ?? [];
});

/** True if the selected date falls on a bi-weekly pay day. */
const selectedDayIsPayDay = computed(() => {
  if (!selectedKey.value) return false;
  const payStart = budget.$state.payStart;
  if (!payStart) return false;
  const payStartMs  = new Date(payStart + 'T00:00:00').getTime();
  const selectedMs  = new Date(selectedKey.value + 'T00:00:00').getTime();
  const diff        = Math.round((selectedMs - payStartMs) / 86400000);
  return diff % 14 === 0;
});

const incomePerPay = computed(() => totalMonthlyIncome.value / 2);

/** Formatted label for the selected day panel header. */
const selectedDayLabel = computed(() => {
  if (!selectedKey.value) return '';
  const d = new Date(selectedKey.value + 'T00:00:00');
  return d.toLocaleString('en-CA', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
});

/** Bills-only spend for the selected day (excludes income). */
const selectedDayBillsTotal = computed(() =>
  selectedDayItems.value.reduce((s, item) => s + item.totalForMonth, 0),
);

function selectedItemBorderColor(item: ForecastItem): string {
  if (item.source === 'subscription') return '#a78bfa';
  if (item.source === 'loan')         return 'var(--warn, #f59e0b)';
  return 'var(--danger)';
}

// ─── Pay schedule timeline ────────────────────────────────────────
interface PayTimelineEntry {
  label:     string;
  iso:       ISODate;
  isPast:    boolean;
  isCurrent: boolean;
  isNext:    boolean;
}

const payTimeline = computed<PayTimelineEntry[]>(() => {
  const payStart = budget.$state.payStart;
  if (!payStart) return [];

  const currentStartIso = getCurrentPeriodStart({ payStart }, today);
  if (!currentStartIso) return [];

  const currentStart = new Date(currentStartIso + 'T00:00:00');
  const todayMs      = new Date().setHours(0, 0, 0, 0);
  const entries: PayTimelineEntry[] = [];

  for (let i = -3; i <= 2; i++) {
    const d = new Date(currentStart);
    d.setDate(d.getDate() + i * 14);
    const iso = d.toISOString().split('T')[0] as ISODate;
    entries.push({
      label:     d.toLocaleString('en-CA', { month: 'short', day: 'numeric' }),
      iso,
      isPast:    d.getTime() < todayMs,
      isCurrent: i === 0,
      isNext:    i === 1,
    });
  }
  return entries;
});

const payScheduleLabel = computed(() => {
  const payStart = budget.$state.payStart;
  if (!payStart) return 'Not configured';
  const DOW = ['Sundays','Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays'];
  const d   = new Date(payStart + 'T00:00:00');
  return `Bi-weekly · ${DOW[d.getDay()]}`;
});
</script>

<template>
  <div class="page-schedule">

    <!-- ── Page header ─────────────────────────────────────────── -->
    <div class="sched-header">
      <div class="sched-header__left">
        <div class="sched-eyebrow">Schedule</div>
        <h1 class="sched-title">
          {{ pageTitle }}
        </h1>
      </div>

      <div class="sched-header__right">
        <!-- Prev / Today / Next navigation -->
        <div class="nav-group">
          <button
            class="nav-btn"
            title="Previous"
            @click="goPrev"
          >
            ‹
          </button>
          <button
            class="nav-btn nav-btn--today"
            @click="goToday"
          >
            Today
          </button>
          <button
            class="nav-btn"
            title="Next"
            @click="goNext"
          >
            ›
          </button>
        </div>

        <!-- Month | Pay period | List toggle -->
        <div class="view-toggle">
          <button
            class="view-toggle-btn"
            :class="{ 'view-toggle-btn--active': ui.scheduleView === 'calendar' }"
            @click="setView('calendar')"
          >
            Month
          </button>
          <button
            class="view-toggle-btn"
            :class="{ 'view-toggle-btn--active': ui.scheduleView === 'payperiod' }"
            @click="setView('payperiod')"
          >
            Pay period
          </button>
          <button
            class="view-toggle-btn"
            :class="{ 'view-toggle-btn--active': ui.scheduleView === 'list' }"
            @click="setView('list')"
          >
            List
          </button>
        </div>
      </div>
    </div>

    <!-- ── KPI tiles ───────────────────────────────────────────── -->
    <div class="kpi-row">
      <StatCard
        :label="`Income ${kpiLabel}`"
        :value="fmt(incomeKpi)"
        variant="accent"
      />
      <StatCard
        :label="`Bills + recurring`"
        :value="fmt(billsKpi)"
        :hint="kpiLabel"
      />
      <StatCard
        :label="`Net (income − bills)`"
        :value="fmt(netKpi)"
        :variant="netKpi >= 0 ? 'default' : 'default'"
        :hint="netKpi >= 0 ? `${fmt(netKpi)} surplus` : `${fmt(Math.abs(netKpi))} over`"
      />
    </div>

    <!-- ── Calendar / SelectedDay 2-column layout ──────────────── -->
    <div
      class="sched-body"
      :class="{ 'sched-body--list': ui.scheduleView === 'list' }"
    >
      <!-- Calendar widget -->
      <BaseCard class="sched-calendar-card">
        <RecurringCalendar
          v-model="selectedKey"
        />
      </BaseCard>

      <!-- Selected day panel (hidden in list view) -->
      <BaseCard
        v-if="ui.scheduleView !== 'list'"
        class="sched-day-card"
      >
        <div class="day-panel">
          <div class="day-panel__eyebrow">
            SELECTED DAY
          </div>

          <template v-if="!selectedKey">
            <!-- Empty state -->
            <div class="day-panel__empty">
              <div class="day-panel__empty-icon">
                📅
              </div>
              <div class="day-panel__empty-text">
                Click a date with markers to see what's due.
              </div>
            </div>
          </template>

          <template v-else>
            <div class="day-panel__date">
              {{ selectedDayLabel }}
            </div>
            <div class="day-panel__subtitle">
              <template v-if="selectedDayItems.length === 0 && !selectedDayIsPayDay">
                No bills due
              </template>
              <template v-else>
                {{ (selectedDayIsPayDay ? 1 : 0) + selectedDayItems.length }} event{{ (selectedDayIsPayDay ? 1 : 0) + selectedDayItems.length !== 1 ? 's' : '' }}
                <template v-if="selectedDayBillsTotal > 0">
                  · {{ fmt(selectedDayBillsTotal) }} out
                </template>
              </template>
            </div>

            <!-- Income row (pay day) -->
            <div
              v-if="selectedDayIsPayDay"
              class="day-event-row"
            >
              <span
                class="day-event-bar"
                style="background: var(--accent)"
              />
              <div class="day-event-info">
                <div class="day-event-name">Pay</div>
                <div class="day-event-meta">income</div>
              </div>
              <div
                class="day-event-amt"
                style="color: var(--accent)"
              >
                +{{ fmt(incomePerPay) }}
              </div>
            </div>

            <!-- Bill / sub / loan rows -->
            <div
              v-for="(item, i) in selectedDayItems"
              :key="i"
              class="day-event-row"
              :style="{ borderLeftColor: selectedItemBorderColor(item) }"
            >
              <span
                class="day-event-bar"
                :style="{ background: selectedItemBorderColor(item) }"
              />
              <div class="day-event-info">
                <div class="day-event-name">{{ item.name }}</div>
                <div class="day-event-meta">
                  {{ item.source }}<template v-if="item.cardLabel"> · {{ item.cardLabel }}</template>
                </div>
              </div>
              <div class="day-event-amt">
                −{{ fmt(item.totalForMonth) }}
              </div>
            </div>
          </template>
        </div>
      </BaseCard>
    </div>

    <!-- ── Pay schedule timeline ───────────────────────────────── -->
    <BaseCard v-if="payTimeline.length > 0">
      <div class="timeline-header">
        <div>
          <div class="timeline-eyebrow">
            Pay schedule
          </div>
          <div class="timeline-title">
            {{ payScheduleLabel }}
          </div>
        </div>
        <div class="timeline-income-label">
          {{ fmt(incomePerPay) }} per pay
        </div>
      </div>

      <!-- Dot timeline -->
      <div class="timeline-track-wrap">
        <div class="timeline-line" />
        <div class="timeline-dots">
          <div
            v-for="(entry, i) in payTimeline"
            :key="i"
            class="timeline-dot-col"
          >
            <div class="timeline-dot-label">
              {{ entry.label }}
            </div>
            <div
              class="timeline-dot"
              :class="{
                'timeline-dot--past':    entry.isPast,
                'timeline-dot--current': entry.isCurrent,
                'timeline-dot--next':    entry.isNext,
                'timeline-dot--future':  !entry.isPast && !entry.isCurrent && !entry.isNext,
              }"
            />
            <div
              class="timeline-dot-sub"
              :class="{ 'timeline-dot-sub--next': entry.isNext }"
            >
              {{ entry.isNext ? 'Next pay' : entry.isCurrent ? 'Current' : '' }}
            </div>
          </div>
        </div>
      </div>
    </BaseCard>

  </div>
</template>

<style scoped>
.page-schedule {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Page header ───────────────────────────────────────────────── */
.sched-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.sched-eyebrow {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 600;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}

.sched-title {
  margin: 0;
  font-size: clamp(1.4rem, 4vw, 1.75rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.sched-header__right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

/* ── Nav group (‹ Today ›) ────────────────────────────────────── */
.nav-group {
  display: flex;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px;
  gap: 1px;
}

.nav-btn {
  padding: 5px 11px;
  background: transparent;
  border: none;
  font-size: 0.8rem;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
  border-radius: 999px;
  transition: background 0.12s, color 0.12s;
  line-height: 1;
}

.nav-btn:hover {
  background: var(--border);
  color: var(--text);
}

.nav-btn--today {
  padding: 5px 12px;
  font-weight: 600;
  color: var(--accent);
  background: rgba(74, 222, 128, 0.08);
}

.nav-btn--today:hover {
  background: rgba(74, 222, 128, 0.16);
  color: var(--accent);
}

/* ── View toggle ─────────────────────────────────────────────── */
.view-toggle {
  display: flex;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px;
  gap: 1px;
}

.view-toggle-btn {
  padding: 5px 13px;
  background: transparent;
  border: none;
  font-size: 0.8rem;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
  border-radius: 999px;
  font-weight: 500;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}

.view-toggle-btn--active {
  background: var(--accent);
  color: #fff;
  font-weight: 700;
}

.view-toggle-btn:not(.view-toggle-btn--active):hover {
  background: var(--border);
  color: var(--text);
}

/* ── KPI row ─────────────────────────────────────────────────── */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

@media (max-width: 560px) {
  .kpi-row { grid-template-columns: 1fr 1fr; }
}

/* ── Schedule body layout ────────────────────────────────────── */
.sched-body {
  display: grid;
  grid-template-columns: 2.2fr 1fr;
  gap: 0.75rem;
  align-items: start;
}

/* List view: full-width single column */
.sched-body--list {
  grid-template-columns: 1fr;
}

@media (max-width: 820px) {
  .sched-body:not(.sched-body--list) {
    grid-template-columns: 1fr;
  }
}

.sched-calendar-card,
.sched-day-card {
  min-width: 0;
}

/* ── Day detail panel ────────────────────────────────────────── */
.day-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.day-panel__eyebrow {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--muted);
  text-transform: uppercase;
}

.day-panel__date {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.day-panel__subtitle {
  font-size: 0.78rem;
  color: var(--muted);
  margin-top: -0.25rem;
}

.day-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 1.5rem 1rem;
  border: 1px dashed var(--border);
  border-radius: 10px;
  text-align: center;
}

.day-panel__empty-icon {
  font-size: 1.5rem;
}

.day-panel__empty-text {
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.4;
}

/* ── Day event rows ──────────────────────────────────────────── */
.day-event-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.day-event-row:last-child {
  border-bottom: none;
}

.day-event-bar {
  width: 3px;
  align-self: stretch;
  min-height: 28px;
  border-radius: 999px;
  flex-shrink: 0;
}

.day-event-info {
  flex: 1;
  min-width: 0;
}

.day-event-name {
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.day-event-meta {
  font-size: 0.72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 2px;
}

.day-event-amt {
  font-size: 0.875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* ── Pay schedule timeline ───────────────────────────────────── */
.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 1rem;
}

.timeline-eyebrow {
  font-size: 0.72rem;
  color: var(--muted);
  font-weight: 600;
  margin-bottom: 3px;
}

.timeline-title {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.timeline-income-label {
  font-size: 0.78rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.timeline-track-wrap {
  position: relative;
  padding: 0.5rem 0 1.5rem;
}

.timeline-line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--border);
  transform: translateY(-50%);
  border-radius: 1px;
}

.timeline-dots {
  display: flex;
  justify-content: space-between;
  position: relative;
}

.timeline-dot-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.timeline-dot-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid transparent;
  flex-shrink: 0;
}

.timeline-dot--past    { background: var(--muted); opacity: 0.5; }
.timeline-dot--current { background: var(--text); }
.timeline-dot--next    {
  width: 14px;
  height: 14px;
  background: var(--accent);
  border-color: rgba(74, 222, 128, 0.3);
  border-width: 3px;
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.15);
}
.timeline-dot--future  { background: var(--border); }

.timeline-dot-sub {
  font-size: 0.62rem;
  color: var(--muted);
  font-weight: 500;
  white-space: nowrap;
  text-align: center;
  min-height: 1em;
}

.timeline-dot-sub--next {
  color: var(--accent);
  font-weight: 700;
}
</style>
