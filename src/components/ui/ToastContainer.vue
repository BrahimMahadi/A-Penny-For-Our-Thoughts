<!--
  Module:   components/ui/ToastContainer.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Modified: May 2026 (RS-17) — GSAP slide-in with back.out spring ease
  Summary:  Singleton overlay that renders all toasts queued via
            `useToast().show(msg)`. Mount once in App.vue.
-->

<script setup lang="ts">
import { onMounted } from 'vue';
import { useToast } from '@/composables/useToast';
import { useGsap } from '@/composables/useGsap';

const { to, from } = useGsap();

const { toasts, dismiss, _DURATION_MS } = useToast();

/**
 * Vue transition group handles the enter/leave animations for us.
 * Each toast schedules its own removal after the configured duration
 * so the leave transition runs.
 */
function scheduleExit(id: number) {
  window.setTimeout(() => dismiss(id), _DURATION_MS);
}

onMounted(() => {
  // Schedule exit for any toasts that exist at mount time (rare but possible
  // during HMR / SSR hydration).
  toasts.value.forEach((t) => scheduleExit(t.id));
});

// ─── GSAP transition hooks for each toast ─────────────────────────────────
// Note: @move is NOT a valid JS hook on <TransitionGroup>. Moves (FLIP) are
// handled exclusively via the move-class CSS prop — see .toast-move below.
// BUG-020 fix: removed the invalid @move="onToastMove" handler that was
// causing the Vue warning "Extraneous non-emits event listeners (move) were
// passed to component but could not be automatically inherited".
function onToastEnter(el: Element, done: () => void): void {
  from(el, { x: 110, opacity: 0, duration: 0.38, ease: 'back.out(1.5)',
             onComplete: done });
}
function onToastLeave(el: Element, done: () => void): void {
  to(el, { x: 110, opacity: 0, duration: 0.26, ease: 'power2.in',
           onComplete: done });
}

// Watch new toasts and schedule exits as they arrive.
// (Reactive helper rather than a manual watch for clarity.)
import { watch } from 'vue';
watch(
  () => toasts.value.map((t) => t.id).join(','),
  (newIds, oldIds) => {
    const oldSet = new Set((oldIds || '').split(',').filter(Boolean));
    toasts.value.forEach((t) => {
      if (!oldSet.has(String(t.id))) scheduleExit(t.id);
    });
  },
);
</script>

<template>
  <Teleport to="body">
    <div
      class="base-toast-container"
      aria-live="polite"
      aria-atomic="false"
    >
      <!-- move-class (not @move) is the correct way to animate TransitionGroup FLIP moves -->
      <TransitionGroup
        :css="false"
        move-class="toast-move"
        @enter="onToastEnter"
        @leave="onToastLeave"
      >
        <div
          v-for="t in toasts"
          :key="t.id"
          class="base-toast"
          :class="`base-toast--${t.type}`"
          role="status"
        >
          {{ t.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.base-toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 9999;
  pointer-events: none;
}

.base-toast {
  pointer-events: auto;
  background: var(--surface, #16161e);
  border: 1px solid var(--border, #2a3041);
  border-left-width: 4px;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  color: var(--text, #e3e6ee);
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  max-width: 360px;
}

.base-toast--success {
  border-left-color: var(--accent2, #34d399);
}
.base-toast--danger {
  border-left-color: var(--danger, #f87171);
}
.base-toast--info {
  border-left-color: var(--accent, #5b3df5);
}
.base-toast--warning {
  border-left-color: #f59e0b;
}

@media (max-width: 480px) {
  .base-toast-container {
    left: 0.75rem;
    right: 0.75rem;
    bottom: 0.75rem;
  }
  .base-toast {
    max-width: none;
  }
}

/* FLIP move: when a toast is dismissed, remaining toasts slide into position */
.toast-move {
  transition: transform 0.22s ease;
}

/* Disable FLIP for reduced-motion users */
@media (prefers-reduced-motion: reduce) {
  .toast-move {
    transition: none;
  }
}

/* Enter / leave are handled by GSAP (useGsap respects prefers-reduced-motion) */
</style>
