<!--
  Module:   components/sections/RecurringCalendar.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Updated:  May 2026 (Sprint 16 — pure calendar widget, pay-period redesign)
  Summary:  Pure calendar grid widget. Renders the recurring schedule in
            list, month-calendar, or 14-day pay-period view. Navigation,
            view-toggle, and day-detail panel are owned by the parent
            (SchedulePage). Emits `update:modelValue` with the selected
            ISO date whenever a day cell is clicked.
-->

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import { useUiStore } from '@/stores/ui';
import { useBudgetStore } from '@/stores/budget';
import { useAnalytics } from '@/composables/useAnalytics';
import { fmt } from '@/utils/format';
import { DOW_SHORT } from '@/constants/datetime';
import type { ForecastItem } from '@/utils/calculations';
import type { ISODate } from '@/types/budget';

// ─── Props / emits ────────────────────────────────────────────────
const props = defineProps<{
  /** Currently-selected ISO date; null = no selection */
  modelValue?: ISODate | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ISODate | null];
}>();

// ─── Day-of-week labels ───────────────────────────────────────────
// DOW_SHORT imported from @/constants/datetime (TECH-DEBT-1).
// DOW_LABELS kept as a local alias — the grid rotation slices a mutable copy.
const DOW_LABELS = [...DOW_SHORT];

/** Render a sorted day-pattern label, e.g. [1,3] → "Mon · Wed" */
function dayPatternLabel(days: number[] | undefined): string {
  if (!days || days.length === 0) return '—';
  return [...days].sort((a, b) => a - b).map(d => DOW_SHORT[d]).join(' · ');
}

// ─── Stores / composables ─────────────────────────────────────────
const ui     = useUiStore();
const budget = useBudgetStore();
const {
  totalMonthlyIncome,
  monthForecast,
  calendarDayMap,
  payPeriodForecast,
  payPeriodDayMap,
} = useAnalytics();

// ─── Income colour helper ─────────────────────────────────────────

/** Map an event source (or 'income') to its 2-px bar colour. */
function sourceToColor(source: string): string {
  if (source === 'income')       return 'var(--accent)';
  if (source === 'subscription') return '#a78bfa';
  if (source === 'loan')         return 'var(--warn, #f59e0b)';
  return 'var(--danger)';
}

/** Approximate per-pay income: total monthly / 2 (bi-weekly pay cadence). */
const incomePerPay = computed(() => totalMonthlyIncome.value / 2);

// ─── Active-period totals (used by list view) ─────────────────────
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
  activeVariance.value < 0 ? 'var(--danger)' : 'var(--accent2-text)',
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
interface CollapsedCustomDay extends ForecastItem {
  occurrences:   number;
  totalForMonth: number;
}

const listGrouped = computed(() => {
  const dated   = fc.value?.dated   ?? [];
  const undated = fc.value?.undated ?? [];

  const customMap     = new Map<string, CollapsedCustomDay>();
  const normalDated: ForecastItem[] = [];

  dated.forEach((item) => {
    if (item.frequency === 'custom-days') {
      const existing = customMap.get(item.id);
      if (existing) {
        customMap.set(item.id, {
          ...existing,
          occurrences:   existing.occurrences + 1,
          totalForMonth: existing.totalForMonth + item.amount,
        });
      } else {
        customMap.set(item.id, { ...item });
      }
    } else {
      normalDated.push(item);
    }
  });

  return { dated: normalDated, customDays: [...customMap.values()], undated };
});

// ─── Calendar grid (month view) ───────────────────────────────────
const today       = new Date();
const todayIso    = today.toISOString().split('T')[0] as ISODate;
const maxDay      = computed(() => new Date(ui.scheduleViewYear, ui.scheduleViewMonth, 0).getDate());
const firstDow    = computed(() => new Date(ui.scheduleViewYear, ui.scheduleViewMonth - 1, 1).getDay());
const isThisMonth = computed(() =>
  today.getFullYear() === ui.scheduleViewYear && today.getMonth() + 1 === ui.scheduleViewMonth,
);

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
  isPayDay: boolean;
}

const calDays = computed<CalDay[]>(() => {
  const days: CalDay[]  = [];
  const map             = calendarDayMap.value;
  const payStart        = budget.$state.payStart;
  const payStartMs      = payStart ? new Date(payStart + 'T00:00:00').getTime() : null;

  for (let d = 1; d <= maxDay.value; d++) {
    const items    = map.get(d) || [];
    const dayTotal = items.reduce((s, i) => s + i.totalForMonth, 0);

    let isPayDay = false;
    if (payStartMs !== null) {
      const dateMs = new Date(ui.scheduleViewYear, ui.scheduleViewMonth - 1, d).getTime();
      const diff   = Math.round((dateMs - payStartMs) / 86400000);
      isPayDay     = diff % 14 === 0;
    }

    days.push({
      day:     d,
      items,
      dayTotal,
      isToday: isThisMonth.value && today.getDate() === d,
      isHeavy: dayTotal > heavyThreshold.value && heavyThreshold.value > 0,
      isPayDay,
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

/** Build the ISO date string for a given calendar day in the current view month. */
function calDayIso(day: number): ISODate {
  return `${ui.scheduleViewYear}-${String(ui.scheduleViewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}` as ISODate;
}

// ─── Pay-period grid (14-day view) ────────────────────────────────

interface PayPeriodDay {
  isoDate:    ISODate;
  dayNum:     number;
  monthLabel: string;
  showMonth:  boolean;
  items:      ReturnType<typeof payPeriodDayMap.value.get> extends infer T ? Exclude<T, undefined> : never[];
  dayTotal:   number;
  isToday:    boolean;
  isHeavy:    boolean;
  isPayStart: boolean;
  isPayEnd:   boolean;
}

const ppDays = computed<PayPeriodDay[]>(() => {
  const fc2 = payPeriodForecast.value;
  if (!fc2) return [];
  const map       = payPeriodDayMap.value;
  const startDate = new Date(fc2.periodStart + 'T00:00:00');
  const days: PayPeriodDay[] = [];

  for (let i = 0; i < 14; i++) {
    const d       = new Date(startDate.getTime() + i * 86400000);
    const isoDate = d.toISOString().split('T')[0] as ISODate;
    const items   = map.get(isoDate) ?? [];
    const dayTotal = items.reduce((s, item) => s + item.totalForMonth, 0);
    days.push({
      isoDate,
      dayNum:     d.getDate(),
      monthLabel: d.toLocaleString('en-CA', { month: 'short' }),
      showMonth:  d.getDate() === 1,
      items,
      dayTotal,
      isToday:    isoDate === todayIso,
      isHeavy:    dayTotal > heavyThreshold.value && heavyThreshold.value > 0,
      isPayStart: i === 0,
      isPayEnd:   i === 13,
    });
  }
  return days;
});

/**
 * DOW header labels for the pay-period grid, rotated so the first column
 * aligns with the day-of-week on which the period starts (typically Thursday).
 */
const ppDowLabels = computed(() => {
  const fc2 = payPeriodForecast.value;
  if (!fc2) return DOW_LABELS;
  const startDow = new Date(fc2.periodStart + 'T00:00:00').getDay();
  return [...DOW_LABELS.slice(startDow), ...DOW_LABELS.slice(0, startDow)];
});

// 14 days ÷ 7 = exactly 2 rows — no leading or trailing blank cells needed.
const ppLeadingBlanks  = computed(() => []);
const ppTrailingBlanks = computed(() => []);

// ─── Selection ────────────────────────────────────────────────────
function onCalDayClick(day: number): void {
  const cd = calDays.value.find(c => c.day === day);
  if (!cd || (!cd.items.length && !cd.isPayDay)) return;
  const iso = calDayIso(day);
  emit('update:modelValue', props.modelValue === iso ? null : iso);
}

function onPpDayClick(isoDate: string): void {
  const pd = ppDays.value.find(d => d.isoDate === isoDate);
  if (!pd || (!pd.items.length && !pd.isPayStart)) return;
  emit('update:modelValue', props.modelValue === isoDate ? null : isoDate as ISODate);
}

// ─── Bill row helper ─────────────────────────────────────────────
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function frequencyLabel(item: ForecastItem): string {
  const map: Record<string, string> = {
    monthly: 'monthly', weekly: 'weekly', 'bi-weekly': 'bi-weekly',
    biyearly: 'every 6 mo', quarterly: 'quarterly', yearly: 'yearly',
    'bi-monthly': 'bi-monthly', 'custom-days': 'recurring',
  };
  return (item.frequency && map[item.frequency]) || item.frequency || '';
}

// ─── Hover popover (desktop only) ────────────────────────────────
const supportsHover = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(hover: hover)').matches
  : false;

const hoveredCalDay   = ref<number | null>(null);
const hoveredPpDate   = ref<string | null>(null);
const popoverPos      = ref({ top: 0, left: 0, flipLeft: false });
const popoverVisible  = ref(false);

let _leaveTimer: ReturnType<typeof setTimeout> | null = null;
function _clearLeave(): void {
  if (_leaveTimer !== null) { clearTimeout(_leaveTimer); _leaveTimer = null; }
}
onUnmounted(() => _clearLeave());

interface DayDetailData {
  label:         string;
  dayTotal:      number;
  items:         ForecastItem[];
  incomeAmount?: number;
}

function _buildCalDetail(day: number): DayDetailData | null {
  const cd = calDays.value.find(c => c.day === day);
  if (!cd || (!cd.items.length && !cd.isPayDay)) return null;
  const date  = new Date(ui.scheduleViewYear, ui.scheduleViewMonth - 1, day);
  const label = date.toLocaleString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
  return {
    label,
    dayTotal:     cd.dayTotal,
    items:        cd.items,
    incomeAmount: cd.isPayDay ? incomePerPay.value : undefined,
  };
}

function _buildPpDetail(isoDate: string): DayDetailData | null {
  const pd = ppDays.value.find(d => d.isoDate === isoDate);
  if (!pd || (!pd.items.length && !pd.isPayStart)) return null;
  const date  = new Date(isoDate + 'T00:00:00');
  const label = date.toLocaleString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
  return {
    label,
    dayTotal:     pd.dayTotal,
    items:        pd.items,
    incomeAmount: pd.isPayStart ? incomePerPay.value : undefined,
  };
}

const hoveredDayDetail = computed<DayDetailData | null>(() => {
  if (hoveredCalDay.value !== null) return _buildCalDetail(hoveredCalDay.value);
  if (hoveredPpDate.value !== null) return _buildPpDetail(hoveredPpDate.value);
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
function onCalDayEnter(day: number, event: MouseEvent): void {
  if (!supportsHover) return;
  _clearLeave();
  const cd = calDays.value.find(c => c.day === day);
  if (!cd?.items.length && !cd?.isPayDay) { popoverVisible.value = false; return; }
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
function onPpDayEnter(isoDate: string, event: MouseEvent): void {
  if (!supportsHover) return;
  _clearLeave();
  const pd = ppDays.value.find(d => d.isoDate === isoDate);
  if (!pd?.items.length && !pd?.isPayStart) { popoverVisible.value = false; return; }
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
function onPopoverEnter(): void { if (supportsHover) _clearLeave(); }

function onPopoverLeave(): void {
  if (!supportsHover) return;
  _clearLeave();
  _leaveTimer = setTimeout(() => {
    hoveredCalDay.value  = null;
    hoveredPpDate.value  = null;
    popoverVisible.value = false;
  }, 150);
}

/** Left-border colour for popover rows — mirrors sourceToColor for non-income. */
function itemBorderColor(item: ForecastItem): string {
  return sourceToColor(item.source);
}

// ─── Clear hover state on navigation ───────────────────────────
watch(
  [() => ui.scheduleView, () => ui.scheduleViewMonth, () => ui.scheduleViewYear, () => ui.schedulePayPeriodOffset],
  () => {
    hoveredCalDay.value  = null;
    hoveredPpDate.value  = null;
    popoverVisible.value = false;
    _clearLeave();
    if (props.modelValue != null) emit('update:modelValue', null);
  },
);
</script>

<template>
  <div class="recurring-calendar">

    <!-- Pay period: no payStart configured -->
    <div
      v-if="ui.scheduleView === 'payperiod' && !payPeriodForecast"
      class="detail-empty"
    >
      <div>📅</div>
      <div>No pay period configured. Set a start date in <strong>Settings → Pay Period</strong> to use this view.</div>
    </div>

    <!-- List view: no bills yet -->
    <div
      v-else-if="ui.scheduleView === 'list' && !hasAny"
      class="detail-empty"
    >
      <div>📅</div>
      <div>No recurring bills yet — add expense cards or subscriptions to see them here.</div>
    </div>

    <!-- ───────────── LIST VIEW ──────────────────────────────────── -->
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

    <!-- ───────────── CALENDAR VIEW (month) ─────────────────────── -->
    <template v-else-if="ui.scheduleView === 'calendar'">
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
            class="cal-cell cal-cell--month cal-blank"
          />

          <!-- Day cells -->
          <div
            v-for="calDay in calDays"
            :key="calDay.day"
            class="cal-cell cal-cell--month"
            :class="{
              'cal-today':       calDay.isToday,
              'cal-has-events':  calDay.items.length > 0 || calDay.isPayDay,
              'cal-heavy':       calDay.isHeavy,
              'cal-interactive': calDay.items.length > 0 || calDay.isPayDay,
              'cal-selected':    modelValue === calDayIso(calDay.day) && (calDay.items.length > 0 || calDay.isPayDay),
            }"
            @click="onCalDayClick(calDay.day)"
            @mouseenter="onCalDayEnter(calDay.day, $event)"
            @mouseleave="onCalDayLeave()"
          >
            <div class="cal-cell-top">
              <span class="cal-day-num">{{ calDay.day }}</span>
            </div>

            <!-- Income event row (pay day) -->
            <div
              v-if="calDay.isPayDay"
              class="cal-event-row"
            >
              <span
                class="cal-event-bar"
                style="background: var(--accent)"
              />
              <span class="cal-event-name">Pay</span>
            </div>

            <!-- Bill / sub / loan event rows (up to remaining slots) -->
            <div
              v-for="(item, bi) in calDay.items.slice(0, calDay.isPayDay ? 1 : 2)"
              :key="bi"
              class="cal-event-row"
            >
              <span
                class="cal-event-bar"
                :style="{ background: sourceToColor(item.source) }"
              />
              <span class="cal-event-name">{{ item.name }}</span>
            </div>

            <!-- "+N more" overflow indicator -->
            <div
              v-if="(calDay.isPayDay ? 1 : 0) + calDay.items.length > 2"
              class="cal-event-more"
            >
              +{{ (calDay.isPayDay ? 1 : 0) + calDay.items.length - 2 }} more
            </div>
          </div>

          <!-- Trailing blank cells -->
          <div
            v-for="(_, i) in trailingBlanks"
            :key="`blank-t-${i}`"
            class="cal-cell cal-cell--month cal-blank"
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

      <!-- Legend -->
      <div class="cal-legend">
        <span class="cal-legend-item">
          <span class="cal-legend-bar" style="background: var(--accent)" />Income
        </span>
        <span class="cal-legend-item">
          <span class="cal-legend-bar" style="background: var(--danger)" />Bill
        </span>
        <span class="cal-legend-item">
          <span class="cal-legend-bar" style="background: #a78bfa" />Sub
        </span>
        <span class="cal-legend-item">
          <span class="cal-legend-bar" style="background: var(--warn, #f59e0b)" />Loan
        </span>
      </div>
    </template>

    <!-- ───────────── PAY PERIOD VIEW (14-day grid) ──────────────── -->
    <template v-else-if="ui.scheduleView === 'payperiod' && payPeriodForecast">
      <div class="cal-scroll-wrapper">
        <div class="cal-grid">
          <!-- THU-anchored day-of-week headers -->
          <div
            v-for="dow in ppDowLabels"
            :key="dow"
            class="cal-header-cell"
          >
            {{ dow }}
          </div>

          <!-- Leading blank cells (always empty — 14 days fills 2 rows exactly) -->
          <div
            v-for="(_, i) in ppLeadingBlanks"
            :key="`pp-blank-l-${i}`"
            class="cal-cell cal-blank"
          />

          <!-- 14 day cells -->
          <div
            v-for="ppDay in ppDays"
            :key="ppDay.isoDate"
            class="cal-cell cal-cell--period"
            :class="{
              'cal-today':       ppDay.isToday,
              'cal-has-events':  ppDay.items.length > 0 || ppDay.isPayStart,
              'cal-heavy':       ppDay.isHeavy,
              'cal-interactive': ppDay.items.length > 0 || ppDay.isPayStart,
              'cal-selected':    modelValue === ppDay.isoDate && (ppDay.items.length > 0 || ppDay.isPayStart),
              'cal-pay-start':   ppDay.isPayStart,
              'cal-pay-end':     ppDay.isPayEnd,
            }"
            @click="onPpDayClick(ppDay.isoDate)"
            @mouseenter="onPpDayEnter(ppDay.isoDate, $event)"
            @mouseleave="onPpDayLeave()"
          >
            <div class="cal-cell-top">
              <span
                class="cal-day-num"
                :class="{ 'cal-day-num--month-start': ppDay.showMonth }"
              >
                <span
                  v-if="ppDay.showMonth"
                  class="cal-month-abbr"
                >{{ ppDay.monthLabel }}</span>
                {{ ppDay.dayNum }}
              </span>
              <span
                v-if="ppDay.isPayStart"
                class="cal-pay-marker cal-pay-marker--pay"
              >PAY</span>
              <span
                v-else-if="ppDay.isPayEnd"
                class="cal-pay-marker cal-pay-marker--end"
              >END</span>
            </div>

            <!-- Income event row (period start = pay day) -->
            <div
              v-if="ppDay.isPayStart"
              class="cal-event-row"
            >
              <span
                class="cal-event-bar"
                style="background: var(--accent)"
              />
              <span class="cal-event-name">Pay</span>
            </div>

            <!-- Bill / sub / loan event rows (up to remaining slots) -->
            <div
              v-for="(item, bi) in ppDay.items.slice(0, ppDay.isPayStart ? 3 : 4)"
              :key="bi"
              class="cal-event-row"
            >
              <span
                class="cal-event-bar"
                :style="{ background: sourceToColor(item.source) }"
              />
              <span class="cal-event-name">{{ item.name }}</span>
            </div>

            <!-- "+N more" overflow indicator -->
            <div
              v-if="(ppDay.isPayStart ? 1 : 0) + ppDay.items.length > 4"
              class="cal-event-more"
            >
              +{{ (ppDay.isPayStart ? 1 : 0) + ppDay.items.length - 4 }} more
            </div>
          </div>

          <!-- Trailing blank cells (always empty) -->
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

      <!-- Legend -->
      <div class="cal-legend">
        <span class="cal-legend-item">
          <span class="cal-legend-bar" style="background: var(--accent)" />Income
        </span>
        <span class="cal-legend-item">
          <span class="cal-legend-bar" style="background: var(--danger)" />Bill
        </span>
        <span class="cal-legend-item">
          <span class="cal-legend-bar" style="background: #a78bfa" />Sub
        </span>
        <span class="cal-legend-item">
          <span class="cal-legend-bar" style="background: var(--warn, #f59e0b)" />Loan
        </span>
      </div>
    </template>

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

        <!-- Income row (pay day) -->
        <div
          v-if="hoveredDayDetail.incomeAmount"
          class="day-popover__row"
        >
          <span
            class="day-popover__dot"
            style="background: var(--accent)"
          />
          <span class="day-popover__name">Pay</span>
          <span
            class="bill-badge"
            style="background: rgba(74,222,128,0.12); color: var(--accent); flex-shrink:0"
          >income</span>
          <span
            class="day-popover__amt"
            style="color: var(--accent)"
          >+{{ fmt(hoveredDayDetail.incomeAmount) }}</span>
        </div>

        <!-- Bill / sub / loan rows -->
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

.detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  color: var(--muted);
  font-size: 0.85rem;
  text-align: center;
  padding: 1.5rem 1rem;
}

/* ── List view ────────────────────────────────────────────────── */
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
.bill-badge--expense  { background: rgba(248, 113, 113, 0.12); color: var(--danger); }

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

/* ── Calendar grid — scroll wrapper ──────────────────────────── */
.cal-scroll-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 -0.1rem;
  padding: 0 0.1rem;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.cal-scroll-wrapper::-webkit-scrollbar { height: 4px; }
.cal-scroll-wrapper::-webkit-scrollbar-track  { background: transparent; }
.cal-scroll-wrapper::-webkit-scrollbar-thumb  {
  background: var(--border);
  border-radius: 2px;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
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

/* ── Day cells ───────────────────────────────────────────────── */
.cal-cell {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 5px 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.65rem;
  position: relative;
  overflow: hidden;
  transition: all 0.1s;
}

/* Month view: compact height */
.cal-cell--month {
  min-height: 86px;
}

/* Pay-period view: taller for more events */
.cal-cell--period {
  min-height: 130px;
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

.cal-has-events {
  background: rgba(96, 165, 250, 0.03);
}

/* Pay-start / pay-end cell tint */
.cal-pay-start {
  border-color: rgba(74, 222, 128, 0.4);
}

.cal-pay-end {
  border-color: rgba(74, 222, 128, 0.2);
}

.cal-interactive {
  cursor: pointer;
}

.cal-interactive:hover {
  border-color: rgba(96, 165, 250, 0.4);
  background: rgba(96, 165, 250, 0.06);
}

.cal-selected {
  border-color: var(--accent2) !important;
  background: rgba(96, 165, 250, 0.1) !important;
  box-shadow: 0 0 0 1px var(--accent2);
}

/* ── Cell top row (day number + PAY/END marker) ──────────────── */
.cal-cell-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  line-height: 1;
  margin-bottom: 1px;
}

.cal-day-num {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 2px;
}

.cal-day-num--month-start { color: var(--text); }

.cal-today .cal-day-num { color: var(--accent); }

.cal-month-abbr {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--accent2-text);
}

/* PAY / END marker badges */
.cal-pay-marker {
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.cal-pay-marker--pay { color: var(--accent); }
.cal-pay-marker--end { color: var(--muted); }

/* ── Event rows inside cells ─────────────────────────────────── */
.cal-event-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.cal-event-bar {
  width: 2px;
  align-self: stretch;
  min-height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}

.cal-event-name {
  font-size: 0.62rem;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
  line-height: 1.3;
}

.cal-event-more {
  font-size: 0.58rem;
  font-weight: 600;
  color: var(--muted);
  margin-left: 6px;
  line-height: 1;
}

/* ── Legend ──────────────────────────────────────────────────── */
.cal-legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 0.7rem;
  color: var(--muted);
  margin-top: 0.25rem;
}

.cal-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.cal-legend-bar {
  width: 8px;
  height: 3px;
  border-radius: 999px;
  flex-shrink: 0;
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

.day-popover .bill-badge--expense { background: rgba(248, 113, 113, 0.15); color: var(--danger, #f87171); }
.day-popover .bill-badge--sub     { background: rgba(167, 139, 250, 0.15); color: #a78bfa; }
.day-popover .bill-badge--loan    { background: rgba(251, 191, 36,  0.15); color: #f59e0b; }

@media (max-width: 480px) {
  .cal-pay-marker  { font-size: 0.72rem; }
  .cal-event-name  { font-size: 0.72rem; }
  .cal-event-more  { font-size: 0.72rem; }
}
</style>
