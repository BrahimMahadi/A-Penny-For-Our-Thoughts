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
  /**
   * Visible label rendered BELOW the track (e.g. "$1,234 / $5,000").
   * Rendered in normal document flow so it is never clipped by the
   * track's overflow:hidden and always readable regardless of fill %.
   */
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
  <!--
    Outer wrapper: flex column so the label renders naturally BELOW the
    track. Never put the label inside the overflow:hidden track — it clips
    the text and makes it unreadable against the colored fill.
  -->
  <div
    class="base-progress-bar"
    :class="[`base-progress-bar--${size}`]"
    role="progressbar"
    :aria-label="ariaLabel"
    :aria-valuenow="clamped"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <!-- The track: overflow:hidden clips the fill's rounded edges cleanly -->
    <div class="base-progress-bar__track">
      <div
        class="base-progress-bar__fill"
        :class="`base-progress-bar__fill--${computedStatus}`"
        :style="{ width: `${clamped}%` }"
      />
    </div>

    <!-- Label sits below the track in normal flow — always fully visible -->
    <div
      v-if="label"
      class="base-progress-bar__label"
    >
      {{ label }}
    </div>
  </div>
</template>

<style scoped>
/* Wrapper: flex column so label stacks below the track */
.base-progress-bar {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* The actual coloured track (overflow:hidden clips fill border-radius) */
.base-progress-bar__track {
  position: relative;
  background: var(--surface2, #1a1a24);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--border, #2a3041);
}

/* Height lives on the track, sized via modifier on the wrapper */
.base-progress-bar--sm .base-progress-bar__track { height: 6px; }
.base-progress-bar--md .base-progress-bar__track { height: 10px; }
.base-progress-bar--lg .base-progress-bar__track { height: 16px; }

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

.base-progress-bar__fill--on-track { background: var(--accent, #5b3df5); }
.base-progress-bar__fill--caution  { background: var(--warn, #fbbf24); }
.base-progress-bar__fill--over     { background: var(--danger, #f87171); }

/* Label: normal flow below track — no clipping, no text-shadow hack needed */
.base-progress-bar__label {
  font-size: 0.72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--muted, #6b7a99);
  text-align: center;
  line-height: 1;
  white-space: nowrap;
}
</style>
