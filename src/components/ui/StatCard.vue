<!--
  Module:   components/ui/StatCard.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Summary:  Bloomberg-style stat tile: small label, large value,
            optional delta indicator. Used at the top of the
            Dashboard and inside the Analytics panel.
-->

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  label: string;
  value: string | number;
  /** Optional sub-label or helper text below the value */
  hint?: string;
  /**
   * Delta value to display alongside the main value.
   * Positive shows green ▲, negative shows red ▼.
   */
  delta?: number | null;
  /** Format string for the delta (e.g. '$', '%') */
  deltaPrefix?: string;
  /** Treat delta direction as inverted (e.g. for liabilities) */
  invertDelta?: boolean;
  /** Visual emphasis variant */
  variant?: 'default' | 'accent' | 'muted';
}

const props = withDefaults(defineProps<Props>(), {
  hint: '',
  delta: null,
  deltaPrefix: '',
  invertDelta: false,
  variant: 'default',
});

const deltaInfo = computed(() => {
  if (props.delta === null || props.delta === undefined) return null;
  const positive = props.invertDelta ? props.delta < 0 : props.delta > 0;
  const negative = props.invertDelta ? props.delta > 0 : props.delta < 0;
  const arrow = props.delta === 0 ? '–' : props.delta > 0 ? '▲' : '▼';
  const sign = props.delta > 0 ? '+' : '';
  return {
    arrow,
    text: `${sign}${props.deltaPrefix}${props.delta.toLocaleString('en-CA', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })}`,
    cls: positive ? 'base-stat-card__delta--up' : negative ? 'base-stat-card__delta--down' : 'base-stat-card__delta--flat',
  };
});
</script>

<template>
  <div
    class="base-stat-card"
    :class="`base-stat-card--${variant}`"
  >
    <div class="base-stat-card__label">
      {{ label }}
    </div>
    <div class="base-stat-card__value">
      {{ value }}
    </div>
    <div
      v-if="deltaInfo"
      class="base-stat-card__delta"
      :class="deltaInfo.cls"
    >
      <span aria-hidden="true">{{ deltaInfo.arrow }}</span>
      <span>{{ deltaInfo.text }}</span>
    </div>
    <div
      v-if="hint"
      class="base-stat-card__hint"
    >
      {{ hint }}
    </div>
  </div>
</template>

<style scoped>
.base-stat-card {
  background: var(--surface, #16161e);
  border: 1px solid var(--border, #2a3041);
  border-radius: 8px;
  padding: 0.85rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.base-stat-card__label {
  /* 9E: fluid type — stays readable from 320px to desktop */
  font-size: clamp(0.65rem, 1.8vw, 0.7rem);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted, #8b8b95);
  font-weight: 600;
}

.base-stat-card__value {
  /* 9E: fluid type — scales from 1.2rem on very small screens to 1.45rem on desktop */
  font-size: clamp(1.2rem, 4.5vw, 1.45rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text, #e3e6ee);
  font-variant-numeric: tabular-nums;
}

.base-stat-card--accent .base-stat-card__value {
  color: var(--accent, #5b3df5);
}

.base-stat-card--muted {
  background: transparent;
}
.base-stat-card--muted .base-stat-card__value {
  color: var(--muted, #8b8b95);
}

.base-stat-card__delta {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3rem;
  font-size: 0.82rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.base-stat-card__delta--up {
  color: var(--accent2, #34d399);
}
.base-stat-card__delta--down {
  color: var(--danger, #f87171);
}
.base-stat-card__delta--flat {
  color: var(--muted, #8b8b95);
}

.base-stat-card__hint {
  font-size: 0.78rem;
  color: var(--muted, #8b8b95);
}
</style>
