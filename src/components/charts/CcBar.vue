<!--
  Module:   components/charts/CcBar.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 3)
  Summary:  Stacked credit-card utilisation bar chart. Each bar shows
            Balance (coloured green/amber/red by utilisation %) and
            Available credit (neutral grey). Matches legacy renderCcBarChart().
-->

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import { useChartStyles } from '@/composables/useChartStyles';
import { fmt } from '@/utils/format';

// ─── Props ───────────────────────────────────────────────────────
interface CardData {
  name: string;
  balance: number;
  limit: number;
}

interface Props {
  cards: CardData[];
}

const props = defineProps<Props>();

// ─── Styles ──────────────────────────────────────────────────────
const styles = useChartStyles();

// ─── Chart data ──────────────────────────────────────────────────
const chartData = computed(() => {
  const S = styles.value;
  const labels    = props.cards.map(c => c.name.split(' ').slice(0, 2).join(' '));
  const balances  = props.cards.map(c => +c.balance);
  const available = props.cards.map(c => Math.max(0, +c.limit - +c.balance));
  const bgColors  = props.cards.map(c => {
    const p = (+c.balance / +c.limit) * 100;
    return p > 50 ? S.danger : p > 30 ? S.warn : S.accent2;
  });

  return {
    labels,
    datasets: [
      {
        label: 'Balance',
        data: balances,
        backgroundColor: bgColors,
        borderColor: 'transparent',
        borderRadius: 6,
        borderSkipped: false as const,
      },
      {
        label: 'Available',
        data: available,
        backgroundColor: S.surface2,
        borderColor: 'transparent',
        borderRadius: 6,
        borderSkipped: false as const,
      },
    ],
  };
});

// ─── Chart options ────────────────────────────────────────────────
const chartOptions = computed(() => {
  const S = styles.value;
  return {
    responsive: true,
    scales: {
      x: {
        stacked: true,
        ticks: { color: S.tickColor, font: { size: 11, family: S.fontFamily } },
        grid:  { color: S.gridColor },
      },
      y: {
        stacked: true,
        ticks: {
          color: S.tickColor,
          font: { size: 11, family: S.fontFamily },
          // tickValue is string | number depending on scale type
          callback: (v: string | number) => '$' + Number(v).toLocaleString(),
        },
        grid: { color: S.gridColor },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: S.tickColor,
          font: { size: 12, weight: 600, family: S.fontFamily },
          padding: 14,
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
  };
});
</script>

<template>
  <Bar
    :data="chartData"
    :options="chartOptions"
  />
</template>
