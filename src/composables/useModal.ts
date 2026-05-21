/**
 * Module:   composables/useModal.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 2)
 * Summary:  Helpers used by <BaseModal /> — body scroll lock + ESC
 *           handler. Lives as a composable so the same logic can be
 *           reused for any future overlay (drawer, command palette).
 */

import { watch, onBeforeUnmount, type Ref } from 'vue';

let activeLockCount = 0;
let savedBodyOverflow = '';

/**
 * When `isOpen` is true, locks the body scroll and registers an ESC
 * handler. Unlocks/unregisters automatically on close or unmount.
 *
 * Multiple stacked modals are safe: each open call increments a ref
 * count, and the scroll lock only releases when the count hits zero.
 */
export function useModal(isOpen: Ref<boolean>, onClose: () => void): void {
  function lock() {
    if (activeLockCount === 0) {
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeLockCount++;
  }

  function unlock() {
    activeLockCount = Math.max(0, activeLockCount - 1);
    if (activeLockCount === 0) {
      document.body.style.overflow = savedBodyOverflow;
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen.value) {
      e.stopPropagation();
      onClose();
    }
  }

  watch(
    isOpen,
    (open) => {
      if (open) {
        lock();
        document.addEventListener('keydown', handleKey);
      } else {
        unlock();
        document.removeEventListener('keydown', handleKey);
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    if (isOpen.value) unlock();
    document.removeEventListener('keydown', handleKey);
  });
}
