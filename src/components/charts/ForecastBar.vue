<!--
  Module:   components/charts/ForecastBar.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 3)
  Summary:  6-month recurring expense forecast bar chart. Bars are green
            (under budget) or red (over budget). A dashed line shows the
            Needs budget. Clicking a bar emits bar-click(year, month) so
            the Schedule page can navigate to that month.
            Mixed chart: Bar base + Line dataset.
            Matches legacy renderForecastBarChart().
-->

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Chart } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';
import { useChartStyles } from '@/composables/useChartStyles';
import { useInView } from '@/composables/useInView';
import { fmt } from '@/utils/format';

// ─── Props & emits ───────────────────────────────────────────────
interface ForecastRow {
  year: number;
  month: number;
  label: string;
  total: number;
  budgeted: number;
}

interface Props {
  forecastData: ForecastRow[];
}

const props = defineProps<Props>();

// ─── Lazy render ─────────────────────────────────────────────────
const wrapperRef = ref<HTMLElement | null>(null);
const { isInView } = useInView(wrapperRef);

const emit = defineEmits<{
  (e: 'bar-click', year: number, month: number): void;
}>();

// ─── Styles ──────────────────────────────────────────────────────
const styles = useChartStyles();

// ─── Chart data ──────────────────────────────────────────────────
// Cast as ChartData<'bar'> — Chart.js 4 supports per-dataset type overrides
// at runtime but the TS generics don't encode this directly. The cast is safe.
const chartData = computed<ChartData<'bar', number[]>>(() => {
  const S        = styles.value;
  const labels   = props.forecastData.map(d => d.label);
  const totals   = props.forecastData.map(d => d.total);
  const budgeted = props.forecastData[0]?.budgeted ?? 0;

  const barColors = props.forecastData.map(d =>
    d.total > d.budgeted ? S.rgba(S.danger, 0.8) : S.rgba(S.accent2, 0.8),
  );
  const hoverColors = props.forecastData.map(d =>
    d.total > d.budgeted ? S.danger : S.accent2,
  );

  return {
    labels,
    datasets: [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'bar' as any,
        label: 'Recurring Bills',
        data: totals,
        backgroundColor: barColors,
        hoverBackgroundColor: hoverColors,
        borderColor: 'transparent',
        borderRadius: 6,
        borderSkipped: false,
        order: 2,
      },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'line' as any,
        label: 'Needs Budget',
        data: Array<number>(labels.length).fill(budgeted),
        borderColor: S.rgba(S.accent, 0.6),
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 4],
        pointRadius: 0,
        order: 1,
      },
    ] as ChartData<'bar', number[]>['datasets'],
  };
});

// ─── Chart options ────────────────────────────────────────────────
const chartOptions = computed<ChartOptions<'bar'>>(() => {
  const S = styles.value;
  // Capture rows for the click handler; this computed also re-runs when
  // props.forecastData changes so click targets stay current.
  const rows = props.forecastData;

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: S.tickColor,
          font: { size: 11, weight: 600, family: S.fontFamily },
          padding: 12,
          usePointStyle: true,
          pointStyle: 'rect',
        },
      },
      tooltip: {
        ...S.tooltip,
        callbacks: {
          label: (ctx) => {
            const ds = ctx.dataset as { type?: string };
            const y = (ctx.parsed as { y: number | null }).y ?? 0;
            return ds.type === 'line'
              ? ' Budget: ' + fmt(y)
              : ' Bills: '  + fmt(y);
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: S.tickColor, font: { size: 11, family: S.fontFamily } },
        grid:  { color: S.gridColor },
      },
      y: {
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
    // Click on a bar → navigate schedule to that month
    onClick(_event, elements) {
      if (!elements.length) return;
      const row = rows[elements[0].index];
      if (row) emit('bar-click', row.year, row.month);
    },
    onHover(_event, elements) {
      const ev = _event as unknown as { native?: { target?: HTMLElement } };
      if (ev.native?.target) {
        ev.native.target.style.cursor = elements.length ? 'pointer' : 'default';
      }
    },
  };
});
</script>

<template>
  <div
    ref="wrapperRef"
    class="forecast-bar-wrapper"
  >
    <Chart
      v-if="isInView"
      type="bar"
      :data="chartData"
      :options="chartOptions"
    />
    <div
      v-else
      class="chart-skeleton"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.forecast-bar-wrapper {
  position: relative;
  height: 260px;
}
</style>
