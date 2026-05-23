<!--
  Module:   components/charts/SpendingTrendChart.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 12 — Trend Charts & Goals Timeline)
  Summary:  Stacked bar chart showing 6 months of actual Needs / Wants /
            Savings spend alongside a monthly income reference line.
            Current month bar segment is full-opacity; past months are
            slightly dimmed so the eye is drawn to now.
            Lazy-renders via useInView.
-->

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Chart } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';
import { useChartStyles } from '@/composables/useChartStyles';
import { useInView } from '@/composables/useInView';
import { fmt } from '@/utils/format';
import type { SpendingTrendRow } from '@/utils/calculations';

// ─── Props ───────────────────────────────────────────────────────
interface Props {
  /** 6 rows from getSpendingTrend() — oldest first. */
  rows: SpendingTrendRow[];
}

const props = defineProps<Props>();

// ─── Lazy render ─────────────────────────────────────────────────
const wrapperRef = ref<HTMLElement | null>(null);
const { isInView } = useInView(wrapperRef);

// ─── Styles ──────────────────────────────────────────────────────
const styles = useChartStyles();

// ─── Chart data ──────────────────────────────────────────────────
const chartData = computed<ChartData<'bar', number[]>>(() => {
  const S      = styles.value;
  const labels = props.rows.map(r => r.label);

  // Opacity: current month = 1, past = 0.55
  const alpha = (isCurrent: boolean) => (isCurrent ? 1 : 0.55);

  return {
    labels,
    datasets: [
      // ── Needs (coral-ish / danger) ──────────────────────────────
      {
        label: 'Needs',
        data: props.rows.map(r => r.needs),
        backgroundColor: props.rows.map(r => S.rgba(S.danger, alpha(r.isCurrent))),
        hoverBackgroundColor: props.rows.map(r => S.rgba(S.danger, Math.min(1, alpha(r.isCurrent) + 0.2))),
        borderRadius: 0,
        stack: 'spend',
        order: 3,
      },
      // ── Wants (amber / warn) ────────────────────────────────────
      {
        label: 'Wants',
        data: props.rows.map(r => r.wants),
        backgroundColor: props.rows.map(r => S.rgba(S.warn, alpha(r.isCurrent))),
        hoverBackgroundColor: props.rows.map(r => S.rgba(S.warn, Math.min(1, alpha(r.isCurrent) + 0.2))),
        borderRadius: 0,
        stack: 'spend',
        order: 3,
      },
      // ── Savings (green / accent2) ────────────────────────────────
      {
        label: 'Savings',
        data: props.rows.map(r => r.savings),
        backgroundColor: props.rows.map(r => S.rgba(S.accent2, alpha(r.isCurrent))),
        hoverBackgroundColor: props.rows.map(r => S.rgba(S.accent2, Math.min(1, alpha(r.isCurrent) + 0.2))),
        borderRadius: 4,
        borderSkipped: false,
        stack: 'spend',
        order: 3,
      },
      // ── Income reference line ────────────────────────────────────
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'line' as any,
        label: 'Income',
        data: props.rows.map(r => r.income),
        borderColor: S.rgba(S.accent, 0.6),
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        stack: undefined,
        order: 1,
      },
    ] as ChartData<'bar', number[]>['datasets'],
  };
});

// ─── Chart options ────────────────────────────────────────────────
const chartOptions = computed<ChartOptions<'bar'>>(() => {
  const S = styles.value;
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: S.tickColor,
          font: { size: 11, weight: 600, family: S.fontFamily },
          padding: 14,
          usePointStyle: true,
          pointStyle: 'rect',
        },
      },
      tooltip: {
        ...S.tooltip,
        callbacks: {
          label: (ctx) => {
            const ds = ctx.dataset as { type?: string; label?: string };
            const y = (ctx.parsed as { y: number | null }).y ?? 0;
            return ` ${ds.label ?? ''}: ${fmt(y)}`;
          },
          footer: (items) => {
            // Sum the stacked segments (exclude the line dataset)
            const total = items
              .filter(i => (i.dataset as { type?: string }).type !== 'line')
              .reduce((s, i) => s + ((i.parsed as { y: number }).y ?? 0), 0);
            return total > 0 ? `Total: ${fmt(total)}` : '';
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: S.tickColor, font: { size: 11, family: S.fontFamily } },
        grid:  { display: false },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          color: S.tickColor,
          font:  { size: 11, family: S.fontFamily },
          callback: (v) =>
            '$' + (Number(v) >= 1000 ? (Number(v) / 1000).toFixed(1) + 'k' : v),
        },
        grid: { color: S.gridColor },
      },
    },
  };
});
</script>

<template>
  <div
    ref="wrapperRef"
    class="spending-trend-wrapper"
  >
    <Chart
      v-if="isInView && rows.length > 0"
      type="bar"
      :data="chartData"
      :options="chartOptions"
    />
    <div
      v-else-if="!isInView"
      class="chart-skeleton"
      aria-hidden="true"
    />
    <p
      v-else
      class="spending-trend-empty"
    >
      No spending data yet — start logging purchases and closing periods.
    </p>
  </div>
</template>

<style scoped>
.spending-trend-wrapper {
  position: relative;
  height: 260px;
}

.spending-trend-empty {
  font-size: 0.82rem;
  color: var(--muted);
  text-align: center;
  padding: 2rem 0;
  margin: 0;
}
</style>
