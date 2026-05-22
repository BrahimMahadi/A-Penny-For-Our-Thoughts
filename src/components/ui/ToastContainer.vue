<!--
  Module:   components/ui/ToastContainer.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Summary:  Singleton overlay that renders all toasts queued via
            `useToast().show(msg)`. Mount once in App.vue.
-->

<script setup lang="ts">
import { onMounted } from 'vue';
import { useToast } from '@/composables/useToast';

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
      <TransitionGroup name="base-toast">
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
  background: var(--surface, #0a1810);
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
  border-left-color: var(--accent, #4ade80);
}

/* Enter / leave transitions */
.base-toast-enter-active,
.base-toast-leave-active {
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}
.base-toast-enter-from {
  transform: translateX(120%);
  opacity: 0;
}
.base-toast-leave-to {
  transform: translateX(120%);
  opacity: 0;
}
.base-toast-move {
  transition: transform 0.25s ease;
}

@media (max-width: 540px) {
  .base-toast-container {
    left: 0.75rem;
    right: 0.75rem;
    bottom: 0.75rem;
  }
  .base-toast {
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-toast-enter-active,
  .base-toast-leave-active,
  .base-toast-move {
    transition: none;
  }
  .base-toast-enter-from,
  .base-toast-leave-to {
    transform: none;
    opacity: 0;
  }
}
</style>
