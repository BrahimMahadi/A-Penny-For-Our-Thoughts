<!--
  Module:   components/ui/ProgressBar.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Summary:  Progress bar with status colour. Used for: goal progress,
            wants envelope, credit-card utilisation, budget alerts.
            Status auto-derives from `percent` unless overridden.
-->

<script setup lang="ts">
import { computed } from 'vue';

type Status = 'on-track' | 'caution' | 'over';

interface Props {
  /** Filled percentage 0–100. Clamped on render. */
  percent: number;
  /** Override the auto-status (computed from percent otherwise) */
  status?: Status;
  /** Visible label e.g. "$1,234 of $5,000 (24.6%)" */
  label?: string;
  /** Visually hidden accessible label */
  ariaLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  status: undefined,
  label: '',
  ariaLabel: 'Progress',
  size: 'md',
});

const clamped = computed(() => Math.max(0, Math.min(100, props.percent)));

const computedStatus = computed<Status>(() => {
  if (props.status) return props.status;
  if (props.percent > 110) return 'over';
  if (props.percent > 100) return 'caution';
  return 'on-track';
});
</script>

<template>
  <div
    class="base-progress-bar"
    :class="[`base-progress-bar--${size}`]"
    role="progressbar"
    :aria-label="ariaLabel"
    :aria-valuenow="clamped"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="base-progress-bar__fill"
      :class="`base-progress-bar__fill--${computedStatus}`"
      :style="{ width: `${clamped}%` }"
    />
    <span
      v-if="label"
      class="base-progress-bar__label"
    >{{ label }}</span>
  </div>
</template>

<style scoped>
.base-progress-bar {
  position: relative;
  background: var(--surface2, #0f2018);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--border, #2a3041);
}

.base-progress-bar--sm {
  height: 6px;
}
.base-progress-bar--md {
  height: 10px;
}
.base-progress-bar--lg {
  height: 16px;
}

.base-progress-bar__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.35s ease-out, background-color 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  .base-progress-bar__fill {
    transition: none;
  }
}

.base-progress-bar__fill--on-track {
  background: var(--accent, #4ade80);
}
.base-progress-bar__fill--caution {
  background: var(--warn, #fbbf24);
}
.base-progress-bar__fill--over {
  background: var(--danger, #f87171);
}

.base-progress-bar__label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text, #e3e6ee);
  text-shadow: 0 0 4px var(--surface, #0a1810);
  pointer-events: none;
}
</style>
