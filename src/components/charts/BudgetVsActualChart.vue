<!--
  Module:   components/charts/BudgetVsActualChart.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 3)
  Summary:  Grouped bar chart comparing budgeted vs. actual spending for
            Needs / Wants / Savings in the current month. Matches legacy
            renderBudgetVsActualChart().
-->

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import { useChartStyles } from '@/composables/useChartStyles';
import { fmt } from '@/utils/format';

// ─── Props ───────────────────────────────────────────────────────
interface BudgetActuals {
  needs: number;
  wants: number;
  savings: number;
}

interface Props {
  budgeted: BudgetActuals;
  actuals: BudgetActuals;
}

const props = defineProps<Props>();

// ─── Styles ──────────────────────────────────────────────────────
const styles = useChartStyles();

// ─── Chart data ──────────────────────────────────────────────────
const chartData = computed(() => {
  const S = styles.value;
  return {
    labels: ['Needs', 'Wants', 'Savings'],
    datasets: [
      {
        label: 'Budgeted',
        data: [props.budgeted.needs, props.budgeted.wants, props.budgeted.savings],
        backgroundColor: S.accent,
        borderColor: S.rgba(S.accent, 0.3),
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: 'Actual',
        data: [props.actuals.needs, props.actuals.wants, props.actuals.savings],
        backgroundColor: S.accent2,
        borderColor: S.rgba(S.accent2, 0.3),
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };
});

// ─── Chart options ────────────────────────────────────────────────
const chartOptions = computed(() => {
  const S = styles.value;
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: {
          color: S.tickColor,
          font: { size: 12, weight: 600, family: S.fontFamily },
          usePointStyle: true,
          pointStyle: 'rect' as const,
        },
      },
      tooltip: {
        ...S.tooltip,
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            ' ' + (ctx.dataset.label ?? '') + ': ' + fmt(ctx.parsed.y ?? 0),
        },
      },
    },
    scales: {
      x: {
        ticks: { color: S.tickColor, font: { size: 11, family: S.fontFamily } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: S.tickColor,
          font: { size: 11, family: S.fontFamily },
          callback: (v: string | number) => fmt(Number(v)),
        },
        grid: { color: S.gridColor },
      },
    },
  };
});
</script>

<template>
  <Bar
    :data="chartData"
    :options="chartOptions"
  />
</template>
