/**
 * Module:   composables/useToast.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 2)
 * Summary:  Reactive toast notification system. The shared queue is
 *           a module-level ref so any component can call `useToast().show(...)`
 *           and a single <ToastContainer /> mounted in App.vue renders them.
 */

import { ref, readonly } from 'vue';

export type ToastType = 'success' | 'danger' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

// Module-scoped state shared across all consumers.
const toasts = ref<Toast[]>([]);
let nextId = 1;
const DEFAULT_DURATION_MS = 2500;

/**
 * Reactive toast hook.
 * - `toasts` is read-only from consumer side (mutate only via show/dismiss).
 * - `show(message, type?)` queues a new toast that auto-dismisses.
 * - `dismiss(id)` lets the container remove a toast when its exit animation ends.
 */
export function useToast() {
  function show(
    message: string,
    type: ToastType = 'success',
    duration = DEFAULT_DURATION_MS,
  ): number {
    const id = nextId++;
    toasts.value.push({ id, message, type });
    // Schedule auto-dismiss. ToastContainer will mark it 'leaving'
    // first for the exit animation, then call dismiss when the
    // animation ends. We just trigger the removal flow here by
    // waiting the same duration before the container handles it.
    window.setTimeout(() => {
      // No-op here; the container handles the animation and calls dismiss.
      // We still emit a manual dismiss after a safety margin in case
      // the container isn't mounted (e.g. tests).
      dismiss(id);
    }, duration + 600); // duration + animation buffer
    return id;
  }

  function dismiss(id: number): void {
    const idx = toasts.value.findIndex((t) => t.id === id);
    if (idx >= 0) toasts.value.splice(idx, 1);
  }

  return {
    toasts: readonly(toasts),
    show,
    dismiss,
    /** Exposed for ToastContainer — should not be called by app code. */
    _DURATION_MS: DEFAULT_DURATION_MS,
  };
}
