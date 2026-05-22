<!--
  Module:   components/charts/AnalyticsLine.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 3)
  Summary:  Spending-over-time line chart for the Spending Analytics panel.
            Each point is one filtered history period. Empty history renders
            nothing (parent should show EmptyState instead). Matches legacy
            renderAnalyticsLineChart().
-->

<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import { useChartStyles } from '@/composables/useChartStyles';
import { fmt } from '@/utils/format';

// ─── Props ───────────────────────────────────────────────────────
interface HistoryPoint {
  /** Display label (falls back to date if absent). */
  label?: string;
  date: string;
  total: number;
}

interface Props {
  history: HistoryPoint[];
}

const props = defineProps<Props>();

// ─── Styles ──────────────────────────────────────────────────────
const styles = useChartStyles();

// ─── Chart data ──────────────────────────────────────────────────
const chartData = computed(() => {
  const S = styles.value;
  const labels = props.history.map(p => p.label ?? p.date);
  const data   = props.history.map(p => p.total);

  return {
    labels,
    datasets: [{
      label: 'Spending Over Time',
      data,
      borderColor: S.accent,
      backgroundColor: S.rgba(S.accent, 0.1),
      fill: true,
      tension: 0.4,
      pointBackgroundColor: S.accent,
      pointBorderColor: S.surface,
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      borderWidth: 3,
    }],
  };
});

// ─── Chart options ────────────────────────────────────────────────
const chartOptions = computed(() => {
  const S = styles.value;
  return {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: S.tickColor,
          font: { size: 12, weight: 600, family: S.fontFamily },
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle' as const,
        },
      },
      tooltip: {
        ...S.tooltip,
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) =>
            ' Spent: ' + fmt(ctx.parsed.y ?? 0),
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: S.tickColor,
          font: { size: 11, family: S.fontFamily },
          maxRotation: 45,
        },
        grid: { color: S.gridColor },
      },
      y: {
        ticks: {
          color: S.tickColor,
          font: { size: 11, family: S.fontFamily },
          callback: (v: string | number) => '$' + Number(v).toLocaleString(),
        },
        grid: { color: S.gridColor },
      },
    },
  };
});
</script>

<template>
  <Line
    v-if="history.length > 0"
    :data="chartData"
    :options="chartOptions"
  />
</template>
