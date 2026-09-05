/**
 * Module:   composables/useModal.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 2)
 * Modified: September 2026 (BUG-038) — scroll lock rewritten to the
 *           position-fixed technique so it holds on iOS Safari.
 * Summary:  Helpers used by <BaseModal /> — body scroll lock + ESC
 *           handler. Lives as a composable so the same logic can be
 *           reused for any future overlay (drawer, command palette).
 */

import { watch, onBeforeUnmount, type Ref } from 'vue';

let activeLockCount = 0;
let savedScrollY = 0;

/** Inline styles captured at lock time, restored verbatim on unlock. */
interface SavedBodyStyle {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  paddingRight: string;
}
let savedStyle: SavedBodyStyle | null = null;

/**
 * Lock page scrolling behind a modal.
 *
 * BUG-038: this previously set only `document.body.style.overflow = 'hidden'`.
 * That is honoured by desktop Chrome (verified: real wheel input moved the page
 * 0 → 343px unlocked, 0 → 0 locked) but **iOS Safari ignores it for touch
 * scrolling** — so on a phone the page kept scrolling behind an open modal,
 * which is exactly where a bottom-sheet modal is used.
 *
 * The fix is the position-fixed technique: take the body out of flow and pin it
 * at its current offset. Every engine honours this, because there is no longer
 * anything to scroll. The offset must be reapplied on unlock or the page jumps
 * to the top when the modal closes — a worse bug than the one being fixed.
 *
 * `position: fixed` on the body does NOT trap the teleported modal: only
 * `transform`, `filter`, `perspective` and `will-change` create a containing
 * block for fixed-position descendants, so the overlay still positions against
 * the viewport as intended.
 */
function lock(): void {
  if (activeLockCount === 0) {
    savedScrollY = window.scrollY;

    const { style } = document.body;
    savedStyle = {
      overflow: style.overflow,
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
      paddingRight: style.paddingRight,
    };

    // Removing the scrollbar reflows the layout by its width. Pad the body by
    // the same amount so the page does not visibly jump sideways as the modal
    // opens. Always 0 on mobile (overlay scrollbars) and on any platform
    // configured to overlay them.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    style.position = 'fixed';
    style.top = `-${savedScrollY}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';
    // Kept alongside position:fixed — belt and braces for engines that would
    // otherwise still expose a scrollport on the body box.
    style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  activeLockCount++;
}

/** Release one lock; restores the page only when the last modal closes. */
function unlock(): void {
  activeLockCount = Math.max(0, activeLockCount - 1);
  if (activeLockCount > 0 || !savedStyle) return;

  const { style } = document.body;
  style.overflow = savedStyle.overflow;
  style.position = savedStyle.position;
  style.top = savedStyle.top;
  style.left = savedStyle.left;
  style.right = savedStyle.right;
  style.width = savedStyle.width;
  style.paddingRight = savedStyle.paddingRight;
  savedStyle = null;

  // Only meaningful after the styles above are restored — while the body is
  // still fixed there is nothing to scroll and the call is a no-op.
  window.scrollTo(0, savedScrollY);
}

/**
 * When `isOpen` is true, locks the body scroll and registers an ESC
 * handler. Unlocks/unregisters automatically on close or unmount.
 *
 * Multiple stacked modals are safe: each open call increments a ref
 * count, and the scroll lock only releases when the count hits zero.
 */
export function useModal(isOpen: Ref<boolean>, onClose: () => void): void {
  /**
   * Whether THIS instance currently holds a lock.
   *
   * The watcher is `immediate`, so a closed modal fires its handler on mount.
   * Calling the shared `unlock()` from there would decrement a count this
   * instance never incremented — and a modal mounting while another one is
   * already open would release that modal's lock and let the page scroll again.
   * Pairing every unlock with a lock this instance actually took keeps the
   * refcount honest.
   */
  let holdsLock = false;

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen.value) {
      e.stopPropagation();
      onClose();
    }
  }

  function release(): void {
    if (!holdsLock) return;
    holdsLock = false;
    unlock();
  }

  watch(
    isOpen,
    (open) => {
      if (open) {
        if (!holdsLock) {
          holdsLock = true;
          lock();
        }
        document.addEventListener('keydown', handleKey);
      } else {
        release();
        document.removeEventListener('keydown', handleKey);
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    release();
    document.removeEventListener('keydown', handleKey);
  });
}
