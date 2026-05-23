<!--
  Module:   components/sections/RecurringCalendar.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Summary:  Recurring schedule: 6-month summary cards, ForecastBar chart,
            and active-month detail in list or calendar view.
            Mirrors renderSchedule() + renderCalendarGrid().
-->

<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '@/stores/ui';
import { useAnalytics } from '@/composables/useAnalytics';
import ForecastBar from '@/components/charts/ForecastBar.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { fmt } from '@/utils/format';
import type { ForecastItem } from '@/utils/calculations';

const ui = useUiStore();
const { sixMonthForecast, monthForecast, calendarDayMap } = useAnalytics();

// ─── Month navigation ─────────────────────────────────────────────
function prevMonth(): void { ui.stepScheduleMonth(-1); }
function nextMonth(): void { ui.stepScheduleMonth(1); }
function setMonth(year: number, month: number): void { ui.setScheduleMonth(year, month); }

const viewLabel = computed(() =>
  new Date(ui.scheduleViewYear, ui.scheduleViewMonth - 1, 1)
    .toLocaleString('en-CA', { month: 'long', year: 'numeric' }),
);

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

// ─── Active month detail ──────────────────────────────────────────
const fc = computed(() => monthForecast.value);

const totalColor = computed(() =>
  fc.value.variance < 0 ? 'var(--danger)' : 'var(--accent2)',
);

const hasAny = computed(() =>
  fc.value.dated.length > 0 || fc.value.undated.length > 0,
);

// ─── Calendar grid ────────────────────────────────────────────────
const today      = new Date();
const maxDay     = computed(() => new Date(ui.scheduleViewYear, ui.scheduleViewMonth, 0).getDate());
const firstDow   = computed(() => new Date(ui.scheduleViewYear, ui.scheduleViewMonth - 1, 1).getDay());
const isThisMonth = computed(() =>
  today.getFullYear() === ui.scheduleViewYear && today.getMonth() + 1 === ui.scheduleViewMonth,
);

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const heavyThreshold = computed(() => fc.value.budgeted * 0.12);

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

// ─── View toggle ─────────────────────────────────────────────────
function setView(v: 'list' | 'calendar'): void { ui.setScheduleView(v); }

// ─── Bill row helper ─────────────────────────────────────────────
function ordinal(n: number): string {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
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
        :class="{ 'summary-card--active': isActiveCard(card.year, card.month) }"
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

    <!-- Active month detail -->
    <div class="detail-section">
      <!-- Detail header -->
      <div class="detail-header">
        <BaseButton
          size="xs"
          variant="secondary"
          @click="prevMonth"
        >
          ‹ Prev
        </BaseButton>
        <div class="detail-title">
          {{ viewLabel }}
          <span
            class="detail-total"
            :style="{ color: totalColor }"
          >
            {{ fmt(fc.total) }}/mo
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
          </div>
          <BaseButton
            size="xs"
            variant="secondary"
            @click="nextMonth"
          >
            Next ›
          </BaseButton>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="!hasAny"
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
            v-for="(item, i) in fc.dated"
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
            <span class="bill-amt">{{ fmt(item.totalForMonth) }}</span>
          </div>
        </template>

        <template v-if="fc.undated.length > 0">
          <div class="bill-group-label">
            Any time this month
          </div>
          <div
            v-for="(item, i) in fc.undated"
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

      <!-- CALENDAR VIEW -->
      <template v-else>
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
              }"
            >
              <span class="cal-day-num">{{ calDay.day }}</span>
              <div
                v-for="(item, bi) in calDay.items.slice(0, 2)"
                :key="bi"
                class="cal-badge"
                :class="item.source === 'subscription' ? 'cal-badge--sub' : 'cal-badge--expense'"
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
    </div>
  </div>
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
.cal-badge--more    { background: var(--surface2); color: var(--muted); }

.cal-day-total {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--danger);
  margin-top: auto;
  font-variant-numeric: tabular-nums;
}
</style>
