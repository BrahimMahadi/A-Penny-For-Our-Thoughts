<!--
  Module:   components/charts/AnalyticsBar.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 3)
  Summary:  Horizontal bar chart showing top spending categories in the
            Analytics panel. Data is derived from getTopCategories() and
            passed in as a pre-computed prop. Renders nothing when the
            category list is empty. Matches legacy renderAnalyticsBarChart().
-->

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import { useChartStyles } from '@/composables/useChartStyles';
import { fmt } from '@/utils/format';

// ─── Props ───────────────────────────────────────────────────────
interface Props {
  /**
   * Top categories array from getTopCategories().
   * Each tuple: [categoryName, totalAmount].
   */
  topCategories: Array<[string, number]>;
}

const props = defineProps<Props>();

// ─── Styles ──────────────────────────────────────────────────────
const styles = useChartStyles();

// ─── Chart data ──────────────────────────────────────────────────
const chartData = computed(() => {
  const S = styles.value;
  const labels = props.topCategories.map(([name]) => name);
  const data   = props.topCategories.map(([, amt]) => amt);

  return {
    labels,
    datasets: [{
      label: 'Top Categories',
      data,
      backgroundColor: S.accent2,
      borderColor: S.rgba(S.accent2, 0.3),
      borderWidth: 1,
      borderRadius: 6,
    }],
  };
});

// ─── Chart options ────────────────────────────────────────────────
const chartOptions = computed(() => {
  const S = styles.value;
  return {
    indexAxis: 'y' as const,
    responsive: true,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: S.tickColor,
          font: { size: 12, weight: 600, family: S.fontFamily },
          padding: 16,
          usePointStyle: true,
          pointStyle: 'rect' as const,
        },
      },
      tooltip: {
        ...S.tooltip,
        callbacks: {
          label: (ctx: { parsed: { x: number | null } }) =>
            ' Total: ' + fmt(ctx.parsed.x ?? 0),
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: S.tickColor,
          font: { size: 11, family: S.fontFamily },
          callback: (v: string | number) => '$' + Number(v).toLocaleString(),
        },
        grid: { color: S.gridColor },
      },
      y: {
        ticks: { color: S.tickColor, font: { size: 11, family: S.fontFamily } },
        grid: { color: S.gridColor },
      },
    },
  };
});
</script>

<template>
  <Bar
    v-if="topCategories.length > 0"
    :data="chartData"
    :options="chartOptions"
  />
</template>
