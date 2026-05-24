<!--
  Module:   components/charts/WantsDonut.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 3)
  Summary:  Wants-envelope doughnut chart. Each spending category is a
            coloured arc; a neutral "remaining" arc fills any unspent
            budget. Subscriptions deducted this period use the primary
            accent colour. Matches legacy renderWantsDonut() exactly.
-->

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Doughnut } from 'vue-chartjs';
import { useChartStyles } from '@/composables/useChartStyles';
import { useInView } from '@/composables/useInView';
import { CATEGORY_FALLBACK_COLOR } from '@/data/categories';
import { fmt } from '@/utils/format';

// ─── Props ───────────────────────────────────────────────────────
interface Props {
  /** Per-category spending totals (empty object = nothing spent yet). */
  categorySpending: Record<string, number>;
  /** Remaining budget after all spending (caller clamps ≥ 0). */
  remaining: number;
  /** Percentage of envelope used (0-100+), drives centre-text colour. */
  usedPct: number;
  /**
   * Live map of category name → hex color, built from budget.spendingCategories.
   * Passed by the parent so the chart always reflects user-defined colours
   * (including renames and recolours from the Category Manager).
   */
  categoryColors?: Record<string, string>;
}

const props = withDefaults(defineProps<Props>(), {
  categoryColors: () => ({}),
});

// ─── Lazy render ─────────────────────────────────────────────────
const wrapperRef = ref<HTMLElement | null>(null);
const { isInView } = useInView(wrapperRef);

// ─── Styles ──────────────────────────────────────────────────────
const styles = useChartStyles();

// ─── Chart data ──────────────────────────────────────────────────
const chartData = computed(() => {
  const S = styles.value;
  const SUBS_COLOUR = S.accent;
  const REST_COLOUR = S.surface2;

  // Filter zero-value entries
  const entries = Object.entries(props.categorySpending).filter(([, v]) => v > 0);
  const labels  = entries.map(([cat]) => cat);
  const data    = entries.map(([, v]) => v);
  const colors  = entries.map(([cat]) =>
    cat === 'Subscriptions' ? SUBS_COLOUR : (props.categoryColors[cat] ?? CATEGORY_FALLBACK_COLOR),
  );

  // Remaining arc (absent when overspent)
  if (props.remaining > 0) {
    labels.push('Remaining');
    data.push(props.remaining);
    colors.push(REST_COLOUR);
  }

  // Empty-state guard: plain grey ring when nothing spent/allocated
  if (data.length === 0) {
    labels.push('Remaining');
    data.push(1);
    colors.push(REST_COLOUR);
  }

  return {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderColor: Array<string>(data.length).fill('transparent'),
      borderWidth: 0,
      borderRadius: 2,
    }],
  };
});

// ─── Chart options ────────────────────────────────────────────────
const chartOptions = computed(() => {
  const S = styles.value;
  return {
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        ...S.tooltip,
        padding: 10,
        // Override tooltip font sizes (smaller than default 13/12 for the donut)
        titleFont: { size: 12, weight: 700, family: S.fontFamily },
        bodyFont:  { size: 11, weight: 400, family: S.fontFamily },
        callbacks: {
          title: (ctx: Array<{ label: string }>) => ctx[0]?.label ?? '',
          label: (ctx: { parsed: number }) => ' ' + fmt(ctx.parsed),
        },
      },
    },
    animation: { duration: 600, easing: 'easeInOutQuart' as const },
  };
});
</script>

<template>
  <div
    ref="wrapperRef"
    class="wants-donut-wrapper"
  >
    <template v-if="isInView">
      <Doughnut
        :data="chartData"
        :options="chartOptions"
      />
      <!-- Centre overlay — pct label -->
      <div
        class="wants-donut-centre"
        :class="{
          'wants-donut-centre--warn': usedPct >= 80 && usedPct < 100,
          'wants-donut-centre--over': usedPct >= 100,
        }"
      >
        {{ usedPct.toFixed(0) }}%
      </div>
    </template>
    <div
      v-else
      class="chart-skeleton"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.wants-donut-wrapper {
  position: relative;
  width: 100%;
  max-width: 220px;
  margin: 0 auto;
}

.wants-donut-centre {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--accent, #4ade80);
  pointer-events: none;
}

.wants-donut-centre--warn {
  color: var(--warn, #f59e0b);
}

.wants-donut-centre--over {
  color: var(--danger, #f87171);
}
</style>
