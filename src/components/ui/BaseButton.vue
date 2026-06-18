<!--
  Module:   components/ui/BaseButton.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Summary:  Themed button primitive. Variants align with the legacy
            `.base-btn`, `.base-btn.secondary`, `.base-btn.danger`, `.base-btn.sm` classes.
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGsap } from '@/composables/useGsap';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'xs' | 'sm' | 'md' | 'lg';

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

// ─── GSAP press feedback ──────────────────────────────────────────
const buttonRef = ref<HTMLButtonElement | null>(null);
const { to } = useGsap();

function onPress(): void {
  if (props.disabled || !buttonRef.value) return;
  to(buttonRef.value, { scale: 0.93, duration: 0.08, ease: 'power2.in', overwrite: true });
}

function onRelease(): void {
  if (!buttonRef.value) return;
  to(buttonRef.value, { scale: 1, duration: 0.4, ease: 'elastic.out(1.2, 0.4)', overwrite: true });
}
</script>

<template>
  <button
    ref="buttonRef"
    :type="type"
    :class="classes"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @pointerdown="onPress"
    @pointerup="onRelease"
    @pointerleave="onRelease"
    @keydown.enter="onPress"
    @keydown.space.prevent="onPress"
    @keyup.enter="onRelease"
    @keyup.space="onRelease"
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
  /* transform is handled by GSAP press feedback — omit it from CSS transition
     to avoid fighting GSAP's inline style overrides */
  transition:
    filter 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease;
  white-space: nowrap;
}

.base-btn:focus-visible {
  outline: 2px solid var(--accent, #5b3df5);
  outline-offset: 2px;
}

/* ─── Sizes ───────────────────────────────────────────────────── */
.base-btn--xs {
  padding: 0.15rem 0.45rem;
  font-size: 0.75rem;
  border-radius: 4px;
}
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
  background: var(--accent, #5b3df5);
  color: var(--surface, #16161e);
}
.base-btn--primary:hover:not(.base-btn--disabled) {
  filter: brightness(1.1);
}

.base-btn--secondary {
  background: var(--surface2, #1a1a24);
  color: var(--text, #e3e6ee);
  border-color: var(--border, #2a3041);
}
.base-btn--secondary:hover:not(.base-btn--disabled) {
  background: var(--surface3, #1f1f2a);
}

.base-btn--danger {
  background: transparent;
  color: var(--danger, #f87171);
  border-color: var(--danger, #f87171);
}
.base-btn--danger:hover:not(.base-btn--disabled) {
  background: var(--danger, #f87171);
  color: var(--surface, #16161e);
}

.base-btn--ghost {
  background: transparent;
  color: var(--muted, #8b8b95);
  border-color: transparent;
}
.base-btn--ghost:hover:not(.base-btn--disabled) {
  color: var(--text, #e3e6ee);
  background: var(--surface2, #1a1a24);
}

.base-btn--outline {
  background: transparent;
  color: var(--text, #e3e6ee);
  border-color: var(--border, #2a3041);
}
.base-btn--outline:hover:not(.base-btn--disabled) {
  background: var(--surface2, #1a1a24);
  border-color: var(--accent, #5b3df5);
}

/* ─── Disabled ────────────────────────────────────────────────── */
.base-btn--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ─── 9D: Touch target minimum at ≤540px (WCAG 2.5.5 — 44×44px) ── */
@media (max-width: 480px) {
  .base-btn--xs,
  .base-btn--sm {
    min-height: 44px;
    min-width: 44px;
  }
}
</style>
