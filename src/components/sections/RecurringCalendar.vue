<!--
  Module:   components/sections/RecurringCalendar.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Updated:  May 2026 (Sprint 15 — Pay Period view)
  Summary:  Recurring schedule: 6-month summary cards, ForecastBar chart,
            and active-period detail in list, calendar, or pay-period view.
            The 14-day pay-period grid mirrors the calendar grid but is
            anchored to the user's bi-weekly pay cycle rather than a
            calendar month.
-->

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import { useUiStore } from '@/stores/ui';
import { useAnalytics } from '@/composables/useAnalytics';
import ForecastBar from '@/components/charts/ForecastBar.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { fmt } from '@/utils/format';
import type { ForecastItem } from '@/utils/calculations';
import type { ISODate } from '@/types/budget';

// Day-of-week abbreviations shared with the schedule list view
const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Render a sorted day-pattern label, e.g. [1,3] → "Mon · Wed" */
function dayPatternLabel(days: number[] | undefined): string {
  if (!days || days.length === 0) return '—';
  return [...days].sort((a, b) => a - b).map(d => DOW_SHORT[d]).join(' · ');
}

const ui = useUiStore();
const {
  sixMonthForecast,
  monthForecast,
  calendarDayMap,
  payPeriodForecast,
  payPeriodDayMap,
} = useAnalytics();

// ─── Month navigation ─────────────────────────────────────────────
function prevUnit(): void {
  if (ui.scheduleView === 'payperiod') ui.stepPayPeriod(-1);
  else ui.stepScheduleMonth(-1);
}

function nextUnit(): void {
  if (ui.scheduleView === 'payperiod') ui.stepPayPeriod(1);
  else ui.stepScheduleMonth(1);
}

function setMonth(year: number, month: number): void {
  ui.setScheduleMonth(year, month);
  // Clicking a month card always switches to list/calendar view if in pay period mode
  if (ui.scheduleView === 'payperiod') ui.setScheduleView('list');
}

const detailTitle = computed(() => {
  if (ui.scheduleView === 'payperiod') {
    return payPeriodForecast.value
      ? `Pay Period: ${payPeriodForecast.value.label}`
      : 'Pay Period';
  }
  return new Date(ui.scheduleViewYear, ui.scheduleViewMonth - 1, 1)
    .toLocaleString('en-CA', { month: 'long', year: 'numeric' });
});

// ─── 6-month summary cards ────────────────────────────────────────
const summaryCards = computed(() => sixMonthForecast.value);

function cardLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString('en-CA', { month: 'short', year: 'numeric' });
}

function isActiveCard(year: number, month: number): boolean {
  return year === ui.scheduleViewYear && month === ui.scheduleViewMonth;
}

// ─── Forecast bar chart data ──────────────────────────────────────
const forecastBarData = computed(() =>
  summaryCards.value.map(fc => ({
    year:     fc.year,
    month:    fc.month,
    label:    cardLabel(fc.year, fc.month),
    total:    fc.total,
    budgeted: fc.budgeted,
  })),
);

function onBarClick(year: number, month: number): void {
  setMonth(year, month);
}

// ─── Active period data (unified for all three views) ─────────────
const fc = computed(() => monthForecast.value);

const activeVariance = computed(() =>
  ui.scheduleView === 'payperiod'
    ? (payPeriodForecast.value?.variance ?? 0)
    : fc.value.variance,
);

const activeTotal = computed(() =>
  ui.scheduleView === 'payperiod'
    ? (payPeriodForecast.value?.total ?? 0)
    : fc.value.total,
);

const totalColor = computed(() =>
  activeVariance.value < 0 ? 'var(--danger)' : 'var(--accent2)',
);

const hasAny = computed(() => {
  if (ui.scheduleView === 'payperiod') {
    if (!payPeriodForecast.value) return false;
    return (
      payPeriodForecast.value.dated.length > 0 ||
      payPeriodForecast.value.undated.length > 0
    );
  }
  return fc.value.dated.length > 0 || fc.value.undated.length > 0;
});

// ─── List-view grouping for custom-days subscriptions ────────────
// custom-days subs produce one ForecastItem per occurrence day (for the
// calendar grid), but the list view must collapse them into a single row.
interface CollapsedCustomDay extends ForecastItem {
  occurrences: number;
  totalForMonth: number;
}

const listGrouped = computed(() => {
  const dated   = fc.value?.dated   ?? [];
  const undated = fc.value?.undated ?? [];

  const customMap = new Map<string, CollapsedCustomDay>();
  const normalDated: ForecastItem[] = [];

  dated.forEach((item) => {
    if (item.frequency === 'custom-days') {
      const existing = customMap.get(item.id);
      if (existing) {
        customMap.set(item.id, {
          ...existing,
          occurrences:  existing.occurrences + 1,
          totalForMonth: existing.totalForMonth + item.amount,
        });
      } else {
        customMap.set(item.id, { ...item });
      }
    } else {
      normalDated.push(item);
    }
  });

  return {
    dated:      normalDated,
    customDays: [...customMap.values()],
    undated,
  };
});

// ─── Calendar grid (month view) ───────────────────────────────────
const today      = new Date();
const todayIso   = today.toISOString().split('T')[0] as ISODate;
const maxDay     = computed(() => new Date(ui.scheduleViewYear, ui.scheduleViewMonth, 0).getDate());
const firstDow   = computed(() => new Date(ui.scheduleViewYear, ui.scheduleViewMonth - 1, 1).getDay());
const isThisMonth = computed(() =>
  today.getFullYear() === ui.scheduleViewYear && today.getMonth() + 1 === ui.scheduleViewMonth,
);

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const heavyThreshold = computed(() => {
  if (ui.scheduleView === 'payperiod') {
    return (payPeriodForecast.value?.budgeted ?? 0) * 0.12;
  }
  return fc.value.budgeted * 0.12;
});

interface CalDay {
  day:      number;
  items:    ForecastItem[];
  dayTotal: number;
  isToday:  boolean;
  isHeavy:  boolean;
}

const calDays = computed<CalDay[]>(() => {
  const days: CalDay[] = [];
  const map = calendarDayMap.value;
  for (let d = 1; d <= maxDay.value; d++) {
    const items    = map.get(d) || [];
    const dayTotal = items.reduce((s, i) => s + i.totalForMonth, 0);
    days.push({
      day:      d,
      items,
      dayTotal,
      isToday:  isThisMonth.value && today.getDate() === d,
      isHeavy:  dayTotal > heavyThreshold.value && heavyThreshold.value > 0,
    });
  }
  return days;
});

const leadingBlanks = computed(() => Array.from({ length: firstDow.value }));
const trailingBlanks = computed(() => {
  const total = firstDow.value + maxDay.value;
  const rem   = total % 7;
  return rem > 0 ? Array.from({ length: 7 - rem }) : [];
});

// ─── Pay-period grid (14-day view) ────────────────────────────────

interface PayPeriodDay {
  isoDate:      ISODate;
  dayNum:       number;
  monthLabel:   string;    // shown on the 1st of any month within the period
  showMonth:    boolean;
  items:        ReturnType<typeof payPeriodDayMap.value.get> extends infer T ? Exclude<T, undefined> : never[];
  dayTotal:     number;
  isToday:      boolean;
  isHeavy:      boolean;
}

const ppDays = computed<PayPeriodDay[]>(() => {
  const fc2 = payPeriodForecast.value;
  if (!fc2) return [];
  const map = payPeriodDayMap.value;
  const startDate = new Date(fc2.periodStart + 'T00:00:00');
  const days: PayPeriodDay[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    const isoDate = d.toISOString().split('T')[0] as ISODate;
    const items = map.get(isoDate) ?? [];
    const dayTotal = items.reduce((s, item) => s + item.totalForMonth, 0);
    days.push({
      isoDate,
      dayNum: d.getDate(),
      monthLabel: d.toLocaleString('en-CA', { month: 'short' }),
      showMonth: d.getDate() === 1,
      items,
      dayTotal,
      isToday: isoDate === todayIso,
      isHeavy: dayTotal > heavyThreshold.value && heavyThreshold.value > 0,
    });
  }
  return days;
});

const ppLeadingBlanks = computed(() => {
  const fc2 = payPeriodForecast.value;
  if (!fc2) return [];
  const startDow = new Date(fc2.periodStart + 'T00:00:00').getDay();
  return Array.from({ length: startDow });
});

const ppTrailingBlanks = computed(() => {
  const total = ppLeadingBlanks.value.length + 14;
  const rem = total % 7;
  return rem > 0 ? Array.from({ length: 7 - rem }) : [];
});

// ─── View toggle ─────────────────────────────────────────────────
function setView(v: 'list' | 'calendar' | 'payperiod'): void {
  ui.setScheduleView(v);
  // Reset pay-period offset to current when entering the pay-period view.
  if (v === 'payperiod') ui.resetToCurrentPayPeriod();
}

// ─── Bill row helper ─────────────────────────────────────────────
function ordinal(n: number): string {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Day detail: hover popover + click slide panel ────────────────
/** True when the device supports precise hover (not touch-primary). */
const supportsHover = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(hover: hover)').matches
  : false;

/** Calendar view: which day number is currently selected (slide panel). */
const selectedCalDay = ref<number | null>(null);
/** Pay-period view: which ISO date is currently selected (slide panel). */
const selectedPpDate = ref<string | null>(null);

/** Desktop hover popover — which cal day is hovered. */
const hoveredCalDay = ref<number | null>(null);
/** Desktop hover popover — which pp ISO date is hovered. */
const hoveredPpDate = ref<string | null>(null);

/** Popover position (fixed coordinates). */
const popoverPos   = ref({ top: 0, left: 0, flipLeft: false });
const popoverVisible = ref(false);

let _leaveTimer: ReturnType<typeof setTimeout> | null = null;
function _clearLeave(): void {
  if (_leaveTimer !== null) { clearTimeout(_leaveTimer); _leaveTimer = null; }
}
onUnmounted(() => _clearLeave());

// ─── Shared data shape for the detail panel / popover ────────────
interface DayDetailData {
  label:    string;          // e.g. "Sat, May 3"
  dayTotal: number;
  items:    ForecastItem[];
}

function _buildCalDetail(day: number): DayDetailData | null {
  const cd = calDays.value.find(c => c.day === day);
  if (!cd || cd.items.length === 0) return null;
  const date  = new Date(ui.scheduleViewYear, ui.scheduleViewMonth - 1, day);
  const label = date.toLocaleString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
  return { label, dayTotal: cd.dayTotal, items: cd.items };
}

function _buildPpDetail(isoDate: string): DayDetailData | null {
  const pd = ppDays.value.find(d => d.isoDate === isoDate);
  if (!pd || pd.items.length === 0) return null;
  const date  = new Date(isoDate + 'T00:00:00');
  const label = date.toLocaleString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
  return { label, dayTotal: pd.dayTotal, items: pd.items };
}

const hoveredDayDetail = computed<DayDetailData | null>(() => {
  if (hoveredCalDay.value !== null) return _buildCalDetail(hoveredCalDay.value);
  if (hoveredPpDate.value !== null) return _buildPpDetail(hoveredPpDate.value);
  return null;
});

const selectedDayDetail = computed<DayDetailData | null>(() => {
  if (selectedCalDay.value !== null) return _buildCalDetail(selectedCalDay.value);
  if (selectedPpDate.value !== null) return _buildPpDetail(selectedPpDate.value);
  return null;
});

// ─── Popover positioning ─────────────────────────────────────────
const POPOVER_W = 234;
const POPOVER_H = 340;

function _positionPopover(el: HTMLElement): void {
  const rect     = el.getBoundingClientRect();
  const flipLeft = rect.right + POPOVER_W + 8 > window.innerWidth - 8;
  const left     = flipLeft ? rect.left - POPOVER_W - 4 : rect.right + 4;
  let   top      = rect.top;
  if (top + POPOVER_H > window.innerHeight - 8) {
    top = Math.max(8, window.innerHeight - POPOVER_H - 8);
  }
  popoverPos.value = { top, left, flipLeft };
}

// ─── Calendar view event handlers ───────────────────────────────
function onCalDayClick(day: number): void {
  if (!calDays.value.find(c => c.day === day)?.items.length) return;
  selectedCalDay.value = selectedCalDay.value === day ? null : day;
  selectedPpDate.value = null;
}

function onCalDayEnter(day: number, event: MouseEvent): void {
  if (!supportsHover) return;
  _clearLeave();
  const items = calDays.value.find(c => c.day === day)?.items ?? [];
  if (items.length === 0) { popoverVisible.value = false; return; }
  hoveredCalDay.value  = day;
  hoveredPpDate.value  = null;
  _positionPopover(event.currentTarget as HTMLElement);
  popoverVisible.value = true;
}

function onCalDayLeave(): void {
  if (!supportsHover) return;
  _clearLeave();
  _leaveTimer = setTimeout(() => {
    hoveredCalDay.value  = null;
    popoverVisible.value = false;
  }, 150);
}

// ─── Pay-period view event handlers ─────────────────────────────
function onPpDayClick(isoDate: string): void {
  const items = ppDays.value.find(d => d.isoDate === isoDate)?.items ?? [];
  if (!items.length) return;
  selectedPpDate.value = selectedPpDate.value === isoDate ? null : isoDate;
  selectedCalDay.value = null;
}

function onPpDayEnter(isoDate: string, event: MouseEvent): void {
  if (!supportsHover) return;
  _clearLeave();
  const items = ppDays.value.find(d => d.isoDate === isoDate)?.items ?? [];
  if (items.length === 0) { popoverVisible.value = false; return; }
  hoveredPpDate.value  = isoDate;
  hoveredCalDay.value  = null;
  _positionPopover(event.currentTarget as HTMLElement);
  popoverVisible.value = true;
}

function onPpDayLeave(): void {
  if (!supportsHover) return;
  _clearLeave();
  _leaveTimer = setTimeout(() => {
    hoveredPpDate.value  = null;
    popoverVisible.value = false;
  }, 150);
}

// ─── Popover self-hover (grace period) ──────────────────────────
function onPopoverEnter(): void {
  if (!supportsHover) return;
  _clearLeave();
}

function onPopoverLeave(): void {
  if (!supportsHover) return;
  _clearLeave();
  _leaveTimer = setTimeout(() => {
    hoveredCalDay.value  = null;
    hoveredPpDate.value  = null;
    popoverVisible.value = false;
  }, 150);
}

function closeDayDetail(): void {
  selectedCalDay.value = null;
  selectedPpDate.value = null;
}

// ─── Clear state on navigation ───────────────────────────────────
watch(
  [() => ui.scheduleView, () => ui.scheduleViewMonth, () => ui.scheduleViewYear, () => ui.schedulePayPeriodOffset],
  () => {
    selectedCalDay.value = null;
    selectedPpDate.value = null;
    hoveredCalDay.value  = null;
    hoveredPpDate.value  = null;
    popoverVisible.value = false;
    _clearLeave();
  },
);

// ─── Item type colour for slide panel left border ────────────────
function itemBorderColor(item: ForecastItem): string {
  if (item.source === 'subscription') return '#a78bfa';
  if (item.source === 'loan')         return 'var(--warn, #f59e0b)';
  return 'var(--accent2)';
}

function frequencyLabel(item: ForecastItem): string {
  const map: Record<string, string> = {
    monthly: 'monthly', weekly: 'weekly', 'bi-weekly': 'bi-weekly',
    biyearly: 'every 6 mo', quarterly: 'quarterly', yearly: 'yearly',
    'bi-monthly': 'bi-monthly', 'custom-days': 'recurring',
  };
  return (item.frequency && map[item.frequency]) || item.frequency || '';
}
</script>

<template>
  <div class="recurring-calendar">
    <!-- 6-month summary cards -->
    <div class="summary-cards">
      <button
        v-for="card in summaryCards"
        :key="`${card.year}-${card.month}`"
        class="summary-card"
        :class="{ 'summary-card--active': isActiveCard(card.year, card.month) && ui.scheduleView !== 'payperiod' }"
        type="button"
        @click="setMonth(card.year, card.month)"
      >
        <div class="summary-card__month">
          {{ cardLabel(card.year, card.month) }}
        </div>
        <div class="summary-card__total">
          {{ fmt(card.total) }}
        </div>
        <div
          class="summary-card__variance"
          :class="card.variance < 0 ? 'text-danger' : 'text-accent2'"
        >
          {{ card.variance < 0 ? `+${fmt(Math.abs(card.variance))} over` : `${fmt(Math.abs(card.variance))} under` }}
        </div>
        <div class="summary-card__count">
          {{ card.billCount }} bill{{ card.billCount !== 1 ? 's' : '' }}
        </div>
      </button>
    </div>

    <!-- Forecast bar chart -->
    <ForecastBar
      :forecast-data="forecastBarData"
      @bar-click="onBarClick"
    />

    <!-- Active period detail -->
    <div class="detail-section">
      <!-- Detail header -->
      <div class="detail-header">
        <BaseButton
          size="xs"
          variant="secondary"
          @click="prevUnit"
        >
          ‹ Prev
        </BaseButton>
        <div class="detail-title">
          {{ detailTitle }}
          <span
            class="detail-total"
            :style="{ color: totalColor }"
          >
            {{ fmt(activeTotal) }}{{ ui.scheduleView === 'payperiod' ? '/period' : '/mo' }}
          </span>
        </div>
        <div class="detail-header-right">
          <div class="view-toggle">
            <button
              class="view-toggle-btn"
              :class="{ active: ui.scheduleView === 'list' }"
              title="List view"
              @click="setView('list')"
            >
              ☰
            </button>
            <button
              class="view-toggle-btn"
              :class="{ active: ui.scheduleView === 'calendar' }"
              title="Calendar view"
              @click="setView('calendar')"
            >
              ⊞
            </button>
            <button
              class="view-toggle-btn view-toggle-btn--pp"
              :class="{ active: ui.scheduleView === 'payperiod' }"
              title="Pay period view (14-day grid)"
              @click="setView('payperiod')"
            >
              2W
            </button>
          </div>
          <BaseButton
            size="xs"
            variant="secondary"
            @click="nextUnit"
          >
            Next ›
          </BaseButton>
        </div>
      </div>

      <!-- Pay period: no payStart configured -->
      <div
        v-if="ui.scheduleView === 'payperiod' && !payPeriodForecast"
        class="detail-empty"
      >
        <div>📅</div>
        <div>No pay period configured. Set a start date in <strong>Settings → Pay Period</strong> to use this view.</div>
      </div>

      <!-- Empty state (bills configured, but pay-period is fine) -->
      <div
        v-else-if="!hasAny"
        class="detail-empty"
      >
        <div>📅</div>
        <div>No recurring bills yet — add expense cards or subscriptions to see them here.</div>
      </div>

      <!-- LIST VIEW -->
      <template v-else-if="ui.scheduleView === 'list'">
        <template v-if="fc.dated.length > 0">
          <div class="bill-group-label">
            Scheduled by date
          </div>
          <div
            v-for="(item, i) in listGrouped.dated"
            :key="`dated-${i}`"
            class="bill-row"
          >
            <span class="bill-day">{{ item.dueDay ? ordinal(item.dueDay) : '∞' }}</span>
            <span class="bill-name">{{ item.name }}</span>
            <span class="bill-badge bill-badge--card">{{ item.cardLabel }}</span>
            <span
              v-if="item.biweekly"
              class="bill-badge bill-badge--biweekly"
            >×2 bi-wk</span>
            <span
              v-else-if="item.source === 'subscription'"
              class="bill-badge bill-badge--sub"
            >subscription</span>
            <span
              v-else-if="item.source === 'loan'"
              class="bill-badge bill-badge--loan"
            >loan</span>
            <span class="bill-amt">{{ fmt(item.totalForMonth) }}</span>
          </div>
        </template>

        <!-- Custom-days recurring patterns (collapsed, one row per subscription) -->
        <template v-if="listGrouped.customDays.length > 0">
          <div class="bill-group-label">
            Weekly recurring pattern
          </div>
          <div
            v-for="(item, i) in listGrouped.customDays"
            :key="`custom-${i}`"
            class="bill-row"
          >
            <span class="bill-day bill-day--pattern">≡</span>
            <span class="bill-name">{{ item.name }}</span>
            <span class="bill-badge bill-badge--custom">{{ dayPatternLabel(item.daysOfWeek) }}</span>
            <span class="bill-badge bill-badge--sub">subscription</span>
            <span class="bill-count">×{{ item.occurrences }} this mo.</span>
            <span class="bill-amt">{{ fmt(item.totalForMonth) }}</span>
          </div>
        </template>

        <template v-if="listGrouped.undated.length > 0">
          <div class="bill-group-label">
            Any time this month
          </div>
          <div
            v-for="(item, i) in listGrouped.undated"
            :key="`undated-${i}`"
            class="bill-row"
          >
            <span class="bill-day">∞</span>
            <span class="bill-name">{{ item.name }}</span>
            <span class="bill-badge bill-badge--card">{{ item.cardLabel }}</span>
            <span
              v-if="item.source === 'subscription'"
              class="bill-badge bill-badge--sub"
            >subscription</span>
            <span class="bill-amt">{{ fmt(item.totalForMonth) }}</span>
          </div>
        </template>

        <div class="bill-total-row">
          <span>Total recurring</span>
          <span
            class="bill-total-amt"
            :style="{ color: totalColor }"
          >{{ fmt(fc.total) }}</span>
        </div>
      </template>

      <!-- CALENDAR VIEW (month) -->
      <template v-else-if="ui.scheduleView === 'calendar'">
        <!-- Scroll wrapper prevents the 7-column grid from clipping on narrow screens -->
        <div class="cal-scroll-wrapper">
          <div class="cal-grid">
            <!-- Day-of-week headers -->
            <div
              v-for="dow in DOW_LABELS"
              :key="dow"
              class="cal-header-cell"
            >
              {{ dow }}
            </div>

            <!-- Leading blank cells -->
            <div
              v-for="(_, i) in leadingBlanks"
              :key="`blank-l-${i}`"
              class="cal-cell cal-blank"
            />

            <!-- Day cells -->
            <div
              v-for="calDay in calDays"
              :key="calDay.day"
              class="cal-cell"
              :class="{
                'cal-today': calDay.isToday,
                'cal-has-bills': calDay.items.length > 0,
                'cal-heavy': calDay.isHeavy,
                'cal-interactive': calDay.items.length > 0,
                'cal-selected': selectedCalDay === calDay.day && calDay.items.length > 0,
              }"
              @click="onCalDayClick(calDay.day)"
              @mouseenter="onCalDayEnter(calDay.day, $event)"
              @mouseleave="onCalDayLeave()"
            >
              <span class="cal-day-num">{{ calDay.day }}</span>
              <div
                v-for="(item, bi) in calDay.items.slice(0, 2)"
                :key="bi"
                class="cal-badge"
                :class="item.source === 'subscription' ? 'cal-badge--sub' : item.source === 'loan' ? 'cal-badge--loan' : 'cal-badge--expense'"
                :title="`${item.name} — ${fmt(item.totalForMonth)}`"
              >
                {{ item.name }}
              </div>
              <div
                v-if="calDay.items.length > 2"
                class="cal-badge cal-badge--more"
              >
                +{{ calDay.items.length - 2 }}
              </div>
              <div
                v-if="calDay.dayTotal > 0"
                class="cal-day-total"
              >
                {{ fmt(calDay.dayTotal) }}
              </div>
            </div>

            <!-- Trailing blank cells -->
            <div
              v-for="(_, i) in trailingBlanks"
              :key="`blank-t-${i}`"
              class="cal-cell cal-blank"
            />
          </div>
        </div>

        <!-- Undated items below grid -->
        <template v-if="fc.undated.length > 0">
          <div
            class="bill-group-label"
            style="margin-top: 1rem"
          >
            No fixed date this month
          </div>
          <div
            v-for="(item, i) in fc.undated"
            :key="`cal-undated-${i}`"
            class="bill-row"
          >
            <span class="bill-day">∞</span>
            <span class="bill-name">{{ item.name }}</span>
            <span
              v-if="item.source === 'subscription'"
              class="bill-badge bill-badge--sub"
            >subscription</span>
            <span
              v-else
              class="bill-badge bill-badge--card"
            >{{ item.cardLabel }}</span>
            <span class="bill-amt">{{ fmt(item.totalForMonth) }}</span>
          </div>
        </template>
      </template>

      <!-- PAY PERIOD VIEW (14-day grid) -->
      <template v-else-if="ui.scheduleView === 'payperiod' && payPeriodForecast">
        <!-- Period budget bar -->
        <div class="pp-budget-bar">
          <div class="pp-budget-bar__label">
            <span class="pp-budget-bar__billed">{{ fmt(payPeriodForecast.total) }} billed</span>
            <span class="pp-budget-bar__budget">of {{ fmt(payPeriodForecast.budgeted) }} Needs budget</span>
          </div>
          <div class="pp-budget-bar__track">
            <div
              class="pp-budget-bar__fill"
              :style="{
                width: payPeriodForecast.budgeted > 0
                  ? `${Math.min((payPeriodForecast.total / payPeriodForecast.budgeted) * 100, 100)}%`
                  : '0%',
                background: activeVariance < 0 ? 'var(--danger)' : 'var(--accent)',
              }"
            />
          </div>
        </div>

        <!-- 14-day grid -->
        <div class="cal-scroll-wrapper">
          <div class="cal-grid">
            <!-- Day-of-week headers -->
            <div
              v-for="dow in DOW_LABELS"
              :key="dow"
              class="cal-header-cell"
            >
              {{ dow }}
            </div>

            <!-- Leading blank cells -->
            <div
              v-for="(_, i) in ppLeadingBlanks"
              :key="`pp-blank-l-${i}`"
              class="cal-cell cal-blank"
            />

            <!-- 14 day cells -->
            <div
              v-for="ppDay in ppDays"
              :key="ppDay.isoDate"
              class="cal-cell"
              :class="{
                'cal-today': ppDay.isToday,
                'cal-has-bills': ppDay.items.length > 0,
                'cal-heavy': ppDay.isHeavy,
                'cal-interactive': ppDay.items.length > 0,
                'cal-selected': selectedPpDate === ppDay.isoDate && ppDay.items.length > 0,
              }"
              @click="onPpDayClick(ppDay.isoDate)"
              @mouseenter="onPpDayEnter(ppDay.isoDate, $event)"
              @mouseleave="onPpDayLeave()"
            >
              <span
                class="cal-day-num"
                :class="{ 'cal-day-num--month-start': ppDay.showMonth }"
              >
                <span v-if="ppDay.showMonth" class="cal-month-abbr">{{ ppDay.monthLabel }}</span>
                {{ ppDay.dayNum }}
              </span>
              <div
                v-for="(item, bi) in ppDay.items.slice(0, 2)"
                :key="bi"
                class="cal-badge"
                :class="item.source === 'subscription' ? 'cal-badge--sub' : item.source === 'loan' ? 'cal-badge--loan' : 'cal-badge--expense'"
                :title="`${item.name} — ${fmt(item.totalForMonth)}`"
              >
                {{ item.name }}
              </div>
              <div
                v-if="ppDay.items.length > 2"
                class="cal-badge cal-badge--more"
              >
                +{{ ppDay.items.length - 2 }}
              </div>
              <div
                v-if="ppDay.dayTotal > 0"
                class="cal-day-total"
              >
                {{ fmt(ppDay.dayTotal) }}
              </div>
            </div>

            <!-- Trailing blank cells -->
            <div
              v-for="(_, i) in ppTrailingBlanks"
              :key="`pp-blank-t-${i}`"
              class="cal-cell cal-blank"
            />
          </div>
        </div>

        <!-- Undated items below grid -->
        <template v-if="payPeriodForecast.undated.length > 0">
          <div
            class="bill-group-label"
            style="margin-top: 1rem"
          >
            No fixed date this period
          </div>
          <div
            v-for="(item, i) in payPeriodForecast.undated"
            :key="`pp-undated-${i}`"
            class="bill-row"
          >
            <span class="bill-day">∞</span>
            <span class="bill-name">{{ item.name }}</span>
            <span class="bill-badge bill-badge--card">{{ item.cardLabel }}</span>
            <span
              v-if="item.biweekly"
              class="bill-badge bill-badge--biweekly"
            >bi-wk</span>
            <span
              v-else-if="item.source === 'loan'"
              class="bill-badge bill-badge--loan"
            >loan</span>
            <span
              class="bill-amt"
              :title="item.biweekly ? 'Per-period amount' : 'Approx. half of monthly amount'"
            >
              {{ fmt(item.totalForMonth) }}
            </span>
          </div>
        </template>

        <!-- Period total row -->
        <div class="bill-total-row">
          <span>Total this period</span>
          <span
            class="bill-total-amt"
            :style="{ color: totalColor }"
          >{{ fmt(payPeriodForecast.total) }}</span>
        </div>
      </template>

      <!-- ── Day Detail Slide Panel ── -->
      <!-- Shows when any calendar or pay-period day is clicked. -->
      <Transition name="detail-slide">
        <div
          v-if="selectedDayDetail"
          class="day-detail-panel"
          data-testid="day-detail-panel"
        >
          <div class="day-detail-panel__header">
            <div class="day-detail-panel__title">
              <span class="day-detail-panel__date">{{ selectedDayDetail.label }}</span>
              <span class="day-detail-panel__chip">{{ fmt(selectedDayDetail.dayTotal) }}</span>
            </div>
            <button
              class="day-detail-panel__close"
              title="Close"
              aria-label="Close day detail"
              @click="closeDayDetail"
            >
              ×
            </button>
          </div>

          <div
            v-for="(item, i) in selectedDayDetail.items"
            :key="i"
            class="day-detail-row"
            :style="{ borderLeftColor: itemBorderColor(item) }"
          >
            <div class="day-detail-row__info">
              <span class="day-detail-row__name">{{ item.name }}</span>
              <div class="day-detail-row__badges">
                <span
                  class="bill-badge"
                  :class="item.source === 'subscription' ? 'bill-badge--sub' : item.source === 'loan' ? 'bill-badge--loan' : 'bill-badge--expense'"
                >{{ item.source }}</span>
                <span
                  v-if="item.cardLabel"
                  class="bill-badge bill-badge--card"
                >{{ item.cardLabel }}</span>
                <span
                  v-if="item.biweekly"
                  class="bill-badge bill-badge--biweekly"
                >bi-weekly</span>
              </div>
            </div>
            <div class="day-detail-row__right">
              <span class="day-detail-row__amt">{{ fmt(item.totalForMonth) }}</span>
              <span
                v-if="frequencyLabel(item)"
                class="day-detail-row__freq"
              >{{ frequencyLabel(item) }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>

  <!-- ── Hover Popover (desktop only, teleported to <body>) ── -->
  <Teleport to="body">
    <Transition name="popover-fade">
      <div
        v-if="popoverVisible && hoveredDayDetail"
        class="day-popover"
        :style="{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }"
        data-testid="day-popover"
        @mouseenter="onPopoverEnter"
        @mouseleave="onPopoverLeave"
      >
        <div class="day-popover__header">
          <span class="day-popover__date">{{ hoveredDayDetail.label }}</span>
          <span class="day-popover__total">{{ fmt(hoveredDayDetail.dayTotal) }}</span>
        </div>
        <div
          v-for="(item, i) in hoveredDayDetail.items"
          :key="i"
          class="day-popover__row"
        >
          <span
            class="day-popover__dot"
            :style="{ background: itemBorderColor(item) }"
          />
          <span class="day-popover__name">{{ item.name }}</span>
          <span
            class="bill-badge"
            :class="item.source === 'subscription' ? 'bill-badge--sub' : item.source === 'loan' ? 'bill-badge--loan' : 'bill-badge--expense'"
          >{{ item.source === 'subscription' ? 'sub' : item.source }}</span>
          <span class="day-popover__amt">{{ fmt(item.totalForMonth) }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.recurring-calendar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Summary cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.4rem;
  overflow-x: auto;
}

@media (max-width: 700px) {
  .summary-cards { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 420px) {
  .summary-cards { grid-template-columns: repeat(2, 1fr); }
}

.summary-card {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.5rem;
  text-align: center;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  font: inherit;
  color: inherit;
}

.summary-card:hover {
  border-color: var(--accent);
}

.summary-card--active {
  background: rgba(74, 222, 128, 0.08);
  border-color: var(--accent);
}

.summary-card__month {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--muted);
}

.summary-card__total {
  font-size: 0.95rem;
  font-weight: 800;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

.summary-card__variance {
  font-size: 0.68rem;
  font-weight: 600;
  margin-top: 2px;
}

.summary-card__count {
  font-size: 0.65rem;
  color: var(--muted);
  margin-top: 2px;
}

.text-danger  { color: var(--danger); }
.text-accent2 { color: var(--accent2); }

/* Detail section */
.detail-section {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.detail-title {
  font-size: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.detail-total {
  font-size: 0.875rem;
  font-weight: 600;
}

.detail-header-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.view-toggle {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.view-toggle-btn {
  background: transparent;
  border: none;
  padding: 4px 9px;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--muted);
  transition: background 0.15s, color 0.15s;
}

.view-toggle-btn--pp {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  padding: 4px 7px;
}

.view-toggle-btn.active,
.view-toggle-btn:hover {
  background: var(--accent);
  color: var(--surface);
}

.detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  color: var(--muted);
  font-size: 0.85rem;
  text-align: center;
  padding: 1rem;
}

/* Pay-period budget bar */
.pp-budget-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pp-budget-bar__label {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
}

.pp-budget-bar__billed {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.pp-budget-bar__budget {
  color: var(--muted);
}

.pp-budget-bar__track {
  height: 5px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.pp-budget-bar__fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* List view */
.bill-group-label {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0.25rem 0;
}

.bill-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  padding: 0.3rem 0;
  border-bottom: 1px solid var(--border-light, rgba(42, 48, 65, 0.4));
  flex-wrap: wrap;
}

.bill-row:last-of-type {
  border-bottom: none;
}

.bill-day {
  font-size: 0.75rem;
  color: var(--muted);
  min-width: 28px;
  font-variant-numeric: tabular-nums;
}

.bill-day--pattern {
  color: #a78bfa;
  font-size: 1rem;
  line-height: 1;
}

.bill-count {
  font-size: 0.68rem;
  color: var(--muted);
  white-space: nowrap;
}

.bill-name {
  font-weight: 600;
  flex: 1;
  min-width: 80px;
}

.bill-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
}

.bill-badge--card     { background: var(--surface); color: var(--muted); }
.bill-badge--biweekly { background: rgba(74, 222, 128, 0.12); color: var(--accent); }
.bill-badge--sub      { background: rgba(167, 139, 250, 0.12); color: #a78bfa; }
.bill-badge--loan     { background: rgba(251, 191, 36, 0.12);  color: var(--warn, #f59e0b); }
.bill-badge--custom   { background: rgba(167, 139, 250, 0.18); color: #a78bfa; font-weight: 700; }

.bill-amt {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-left: auto;
}

.bill-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
  border-top: 2px solid var(--border);
  font-size: 0.875rem;
  font-weight: 600;
}

.bill-total-amt {
  font-size: 1rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

/* Calendar grid — scroll wrapper prevents clipping on narrow screens */
.cal-scroll-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  /* Extend flush to card edges on very small screens */
  margin: 0 -0.1rem;
  padding: 0 0.1rem;
  /* Hide the scrollbar track but keep functionality */
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.cal-scroll-wrapper::-webkit-scrollbar {
  height: 4px;
}

.cal-scroll-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.cal-scroll-wrapper::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  /* Minimum width keeps all 7 columns legible; scrolls below this */
  min-width: 380px;
}

.cal-header-cell {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-align: center;
  color: var(--muted);
  padding: 4px 0;
}

.cal-cell {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 3px 4px;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.65rem;
  position: relative;
}

.cal-blank {
  background: transparent;
  border-color: transparent;
}

.cal-today {
  border-color: var(--accent);
  background: rgba(74, 222, 128, 0.06);
}

.cal-heavy {
  background: rgba(248, 113, 113, 0.06);
}

.cal-has-bills {
  background: rgba(96, 165, 250, 0.04);
}

.cal-day-num {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted);
  line-height: 1;
  display: flex;
  align-items: center;
  gap: 2px;
}

.cal-day-num--month-start {
  color: var(--text);
}

.cal-month-abbr {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--accent2);
}

.cal-today .cal-day-num {
  color: var(--accent);
}

.cal-badge {
  border-radius: 2px;
  padding: 1px 3px;
  font-size: 0.6rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cal-badge--expense { background: rgba(96, 165, 250, 0.15); color: var(--accent2); }
.cal-badge--sub     { background: rgba(167, 139, 250, 0.15); color: #a78bfa; }
.cal-badge--loan    { background: rgba(251, 191, 36, 0.15);  color: var(--warn, #f59e0b); }
.cal-badge--more    { background: var(--surface2); color: var(--muted); }

.cal-day-total {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--danger);
  margin-top: auto;
  font-variant-numeric: tabular-nums;
}

/* Interactive cell states */
.cal-interactive {
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}

.cal-interactive:hover {
  border-color: rgba(96, 165, 250, 0.5);
  background: rgba(96, 165, 250, 0.07);
}

.cal-selected {
  border-color: var(--accent2) !important;
  background: rgba(96, 165, 250, 0.1) !important;
  box-shadow: 0 0 0 1px var(--accent2);
}

/* ── Day Detail Slide Panel ─────────────────────────────────── */
.detail-slide-enter-active {
  transition: max-height 0.26s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.18s ease;
  max-height: 700px;
  overflow: hidden;
}

.detail-slide-leave-active {
  transition: max-height 0.22s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.14s ease;
  max-height: 700px;
  overflow: hidden;
}

.detail-slide-enter-from,
.detail-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.day-detail-panel {
  border-top: 1px solid var(--border);
  padding-top: 0.6rem;
}

.day-detail-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.day-detail-panel__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.day-detail-panel__date {
  font-size: 0.875rem;
  font-weight: 700;
}

.day-detail-panel__chip {
  font-size: 0.72rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: rgba(96, 165, 250, 0.12);
  color: var(--accent2);
  border-radius: 20px;
  padding: 2px 8px;
}

.day-detail-panel__close {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.12s, color 0.12s;
}

.day-detail-panel__close:hover {
  background: var(--border);
  color: var(--text);
}

.day-detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  margin-bottom: 3px;
  border-left: 3px solid transparent;
  border-radius: 0 4px 4px 0;
  background: var(--surface);
  transition: background 0.1s;
}

.day-detail-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.day-detail-row__info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.day-detail-row__name {
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.day-detail-row__badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.day-detail-row__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.day-detail-row__amt {
  font-size: 0.88rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.day-detail-row__freq {
  font-size: 0.62rem;
  color: var(--muted);
}
</style>

<!-- Teleported popover must be unscoped — it lives directly in <body> -->
<style>
.day-popover {
  position: fixed;
  z-index: 9999;
  width: 234px;
  background: var(--surface, #0a0f1a);
  border: 1px solid var(--border, #1e2840);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
  padding: 0.55rem 0.7rem;
  font-size: 0.78rem;
  color: var(--text, #e3e6ee);
  pointer-events: auto;
}

.day-popover__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.45rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--border, #1e2840);
}

.day-popover__date {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text, #e3e6ee);
}

.day-popover__total {
  font-size: 0.8rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--danger, #f87171);
}

.day-popover__row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(30, 40, 64, 0.5);
}

.day-popover__row:last-child {
  border-bottom: none;
}

.day-popover__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.day-popover__name {
  flex: 1;
  font-weight: 600;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text, #e3e6ee);
}

.day-popover__amt {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
  margin-left: auto;
  color: var(--text, #e3e6ee);
}

/* Popover transition */
.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-2px);
}

/* badge styles for popover (mirror scoped ones) */
.day-popover .bill-badge {
  font-size: 0.62rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
}

.day-popover .bill-badge--expense { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }
.day-popover .bill-badge--sub     { background: rgba(167, 139, 250, 0.15); color: #a78bfa; }
.day-popover .bill-badge--loan    { background: rgba(251, 191, 36, 0.15);  color: #f59e0b; }
</style>
