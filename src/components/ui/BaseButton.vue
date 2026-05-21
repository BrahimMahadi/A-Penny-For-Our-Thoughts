<!--
  Module:   components/ui/BaseButton.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Summary:  Themed button primitive. Variants align with the legacy
            `.base-btn`, `.base-btn.secondary`, `.base-btn.danger`, `.base-btn.sm` classes.
-->

<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  variant?: Variant;
  size?: Size;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  /** Optional ARIA label for icon-only buttons */
  ariaLabel?: string;
  /** Full-width button (block layout) */
  block?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  ariaLabel: undefined,
  block: false,
});

const classes = computed(() => [
  'base-btn',
  `base-btn--${props.variant}`,
  `base-btn--${props.size}`,
  { 'base-btn--block': props.block, 'base-btn--disabled': props.disabled },
]);
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="disabled"
    :aria-label="ariaLabel"
  >
    <slot />
  </button>
</template>

<style scoped>
.base-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 6px;
  border: 1px solid transparent;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition:
    filter 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
  white-space: nowrap;
}

.base-btn:active:not(.base-btn--disabled) {
  transform: translateY(1px);
}

.base-btn:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

/* ─── Sizes ───────────────────────────────────────────────────── */
.base-btn--sm {
  padding: 0.3rem 0.65rem;
  font-size: 0.82rem;
}
.base-btn--md {
  padding: 0.5rem 1rem;
  font-size: 0.95rem;
}
.base-btn--lg {
  padding: 0.65rem 1.25rem;
  font-size: 1rem;
}

/* ─── Block ───────────────────────────────────────────────────── */
.base-btn--block {
  width: 100%;
}

/* ─── Variants ────────────────────────────────────────────────── */
.base-btn--primary {
  background: var(--accent, #4ade80);
  color: var(--surface, #0a1810);
}
.base-btn--primary:hover:not(.base-btn--disabled) {
  filter: brightness(1.1);
}

.base-btn--secondary {
  background: var(--surface2, #0f2018);
  color: var(--text, #e3e6ee);
  border-color: var(--border, #2a3041);
}
.base-btn--secondary:hover:not(.base-btn--disabled) {
  background: var(--surface3, #152a1e);
}

.base-btn--danger {
  background: transparent;
  color: var(--danger, #f87171);
  border-color: var(--danger, #f87171);
}
.base-btn--danger:hover:not(.base-btn--disabled) {
  background: var(--danger, #f87171);
  color: var(--surface, #0a1810);
}

.base-btn--ghost {
  background: transparent;
  color: var(--muted, #5a7a63);
  border-color: transparent;
}
.base-btn--ghost:hover:not(.base-btn--disabled) {
  color: var(--text, #e3e6ee);
  background: var(--surface2, #0f2018);
}

/* ─── Disabled ────────────────────────────────────────────────── */
.base-btn--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
