<!--
  Module:   components/charts/NetWorthChart.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 3)
  Summary:  Net-worth line chart. Line and fill are green when the last
            value is ≥ 0, red when negative. A note slot is shown when
            fewer than 2 data points exist. Matches legacy renderNetWorthChart().
-->

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Line } from 'vue-chartjs';
import { useChartStyles } from '@/composables/useChartStyles';
import { useInView } from '@/composables/useInView';
import { fmt } from '@/utils/format';

// ─── Props ───────────────────────────────────────────────────────
interface HistorySnapshot {
  /** 'YYYY-MM' ISO month key */
  date: string;
  netWorth: number;
}

interface Props {
  history: HistorySnapshot[];
}

const props = defineProps<Props>();

// ─── Lazy render ─────────────────────────────────────────────────
const wrapperRef = ref<HTMLElement | null>(null);
const { isInView } = useInView(wrapperRef);

// ─── Styles ──────────────────────────────────────────────────────
const styles = useChartStyles();

// ─── Derived data ────────────────────────────────────────────────
const showSingleNote = computed(() => props.history.length < 2);

const chartData = computed(() => {
  const S = styles.value;
  const labels = props.history.map(h => {
    const [y, m] = h.date.split('-');
    return new Date(+y, +m - 1).toLocaleString('en-CA', {
      month: 'short', year: '2-digit',
    });
  });
  const values    = props.history.map(h => h.netWorth);
  const lastValue = values[values.length - 1] ?? 0;

  const lineColor  = lastValue >= 0 ? S.rgba(S.accent2, 0.8) : S.rgba(S.danger, 0.8);
  const fillColor  = lastValue >= 0 ? S.rgba(S.accent2, 0.08) : S.rgba(S.danger, 0.08);
  const pointColor = lineColor;
  const pointR     = props.history.length === 1 ? 6 : 3;

  return {
    labels,
    datasets: [{
      label: 'Net Worth',
      data: values,
      borderColor: lineColor,
      backgroundColor: fillColor,
      borderWidth: 2,
      pointRadius: pointR,
      pointBackgroundColor: pointColor,
      tension: 0.3,
      fill: true,
    }],
  };
});

// ─── Chart options ────────────────────────────────────────────────
const chartOptions = computed(() => {
  const S = styles.value;
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...S.tooltip,
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) =>
            ' ' + fmt(ctx.parsed.y ?? 0),
        },
      },
    },
    scales: {
      x: {
        grid: { color: S.gridColor },
        ticks: { color: S.tickColor, font: { size: 11, family: S.fontFamily } },
      },
      y: {
        grid: { color: S.gridColor },
        ticks: {
          color: S.tickColor,
          font: { size: 11, family: S.fontFamily },
          callback: (v: string | number) => {
            const n = Number(v);
            return '$' + (Math.abs(n) >= 1000 ? (n / 1000).toFixed(0) + 'k' : n);
          },
        },
      },
    },
  };
});
</script>

<template>
  <div
    ref="wrapperRef"
    class="net-worth-chart-wrapper"
  >
    <template v-if="isInView">
      <Line
        v-if="history.length > 0"
        :data="chartData"
        :options="chartOptions"
      />
      <!-- Shown when < 2 months of data exist -->
      <p
        v-if="showSingleNote"
        class="net-worth-chart-note"
      >
        More history will appear as months accumulate.
      </p>
    </template>
    <div
      v-else
      class="chart-skeleton"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.net-worth-chart-wrapper {
  position: relative;
  height: 220px;
}

.net-worth-chart-note {
  font-size: 0.8rem;
  color: var(--muted, #8b8b95);
  text-align: center;
  margin-top: 0.5rem;
}
</style>
