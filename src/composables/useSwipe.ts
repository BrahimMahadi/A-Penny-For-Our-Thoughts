/**
 * Module:   composables/useSwipe.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 9 — Mobile UX Pass)
 * Summary:  Detects horizontal swipe gestures on a given DOM element and
 *           calls onSwipeLeft / onSwipeRight accordingly.
 *
 *           Two guards prevent false positives:
 *             1. Vertical dominance — if |dy| > maxVertical the gesture is
 *                treated as a vertical scroll, not a swipe.
 *             2. Scrollable child — if the gesture starts inside an element
 *                whose overflow-x is auto/scroll AND has overflowing content
 *                (e.g. a horizontally-scrolling list), the swipe is aborted
 *                so the inner scroll still works.
 *
 *           Listeners are passive (no jank) and cleaned up on unmount.
 */

import { watch, onBeforeUnmount, type Ref } from 'vue';

export interface UseSwipeOptions {
  /** Minimum horizontal px delta to count as a swipe. Default: 60. */
  threshold?: number;
  /** Maximum vertical px delta before the gesture is treated as a scroll. Default: 50. */
  maxVertical?: number;
}

export function useSwipe(
  elementRef: Ref<HTMLElement | null>,
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  options: UseSwipeOptions = {},
): void {
  const { threshold = 60, maxVertical = 50 } = options;

  let startX = 0;
  let startY = 0;
  let startTarget: EventTarget | null = null;
  let currentEl: HTMLElement | null = null;

  /**
   * Walk up from `target` to the swipe element's root. If any ancestor
   * is a horizontally-scrollable container with actual overflow, the
   * gesture likely belongs to that scroll — don't swipe.
   */
  function isInsideHScrollable(target: EventTarget | null): boolean {
    let node = target instanceof HTMLElement ? target : null;
    while (node && node !== currentEl) {
      const ox = window.getComputedStyle(node).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  function onTouchStart(e: TouchEvent): void {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTarget = e.target;
  }

  function onTouchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    // Vertical-dominant gesture → user is scrolling, not swiping
    if (Math.abs(dy) > maxVertical) return;
    // Horizontal distance below threshold → not intentional
    if (Math.abs(dx) < threshold) return;
    // Started inside a horizontally-scrollable child → don't swipe
    if (isInsideHScrollable(startTarget)) return;

    if (dx < 0) onSwipeLeft();
    else onSwipeRight();
  }

  function attach(el: HTMLElement): void {
    currentEl = el;
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  function detach(): void {
    if (!currentEl) return;
    currentEl.removeEventListener('touchstart', onTouchStart);
    currentEl.removeEventListener('touchend', onTouchEnd);
    currentEl = null;
  }

  watch(elementRef, (newEl, oldEl) => {
    if (oldEl) detach();
    if (newEl) attach(newEl);
  }, { immediate: true });

  onBeforeUnmount(detach);
}
