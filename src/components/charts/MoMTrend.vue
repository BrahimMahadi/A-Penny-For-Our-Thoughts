<!--
  Module:   components/charts/MoMTrend.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 3)
  Summary:  Month-over-month wants spending bar chart with a dashed budget
            reference line. Current month bar is brighter than past months.
            Mixed chart: Bar base + Line dataset (Chart.js mixed type pattern).
            Matches legacy renderMomTrendChart().
-->

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Chart } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';
import { useChartStyles } from '@/composables/useChartStyles';
import { useInView } from '@/composables/useInView';
import { fmt } from '@/utils/format';

// ─── Props ───────────────────────────────────────────────────────
interface MonthRow {
  label: string;
  total: number;
  isCurrent: boolean;
}

interface Props {
  /** 6 months of wants history from getMonthlyWantsHistory(). */
  monthlyData: MonthRow[];
  /** Monthly wants budget (drawn as dashed reference line). */
  wantsBudget: number;
}

const props = defineProps<Props>();

// ─── Lazy render ─────────────────────────────────────────────────
const wrapperRef = ref<HTMLElement | null>(null);
const { isInView } = useInView(wrapperRef);

// ─── Styles ──────────────────────────────────────────────────────
const styles = useChartStyles();

// ─── Chart data ──────────────────────────────────────────────────
// Cast as ChartData<'bar'> — Chart.js 4 supports mixed types at runtime
// via per-dataset `type` override, but the TS generics don't express
// this directly. The cast is safe: Bar is the base type, Line is the overlay.
const chartData = computed<ChartData<'bar', number[]>>(() => {
  const S      = styles.value;
  const labels = props.monthlyData.map(d => d.label);
  const totals = props.monthlyData.map(d => d.total);
  const colors = props.monthlyData.map(d =>
    d.isCurrent ? S.accent2 : S.rgba(S.accent2, 0.45),
  );
  const hoverColors = props.monthlyData.map(d =>
    d.isCurrent ? S.rgba(S.accent2, 0.9) : S.rgba(S.accent2, 0.65),
  );

  return {
    labels,
    datasets: [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'bar' as any,
        label: 'Wants Spending',
        data: totals,
        backgroundColor: colors,
        hoverBackgroundColor: hoverColors,
        borderRadius: 6,
        order: 2,
      },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'line' as any,
        label: 'Wants Budget',
        data: Array<number>(labels.length).fill(props.wantsBudget),
        borderColor: S.rgba(S.accent, 0.7),
        borderDash: [5, 4],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
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
              : ' Spent: '  + fmt(y);
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
  };
});
</script>

<template>
  <div
    ref="wrapperRef"
    class="mom-trend-wrapper"
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
.mom-trend-wrapper {
  position: relative;
  height: 240px;
}
</style>
