/**
 * Module:   composables/useGsapObserver.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (v2.43.0 — GSAP Observer swipe navigation)
 * Summary:  Wraps GSAP Observer for horizontal touch-swipe gesture detection
 *           on a ref'd DOM element. Replaces the raw touchstart/touchend
 *           approach in useSwipe for App-level tab navigation; useSwipe is
 *           retained for other consumers.
 *
 *           Advantages over raw touch listeners:
 *             - Built-in tolerance and drag-minimum so micro-movements don't
 *               fire callbacks
 *             - Axis locking: diagonal gestures are not misread as horizontal
 *             - Clean `observer.kill()` teardown on unmount
 *
 *           Only `type: 'touch'` is tracked (not pointer/mouse) so desktop
 *           mouse users can drag content without switching tabs.
 *           `preventDefault` is intentionally NOT set so inner page scrolling
 *           remains unaffected.
 *
 *           BUG-039 (September 2026): the Observer is attached to `.app-main`,
 *           an ancestor of every horizontally-scrollable region in the app —
 *           the purchases table, Budget vs Actual, the recurring calendar.
 *           Measured on the Spending page at 375px: `.purchases-table-wrap` is
 *           480px wide in a 296px viewport, and swiping it sideways to read the
 *           right-hand columns switched the tab (Spending → Goals) instead of
 *           scrolling the table. `shouldIgnoreGesture` now walks up from the
 *           touch target and defers to any scroller that can still travel in
 *           the swipe's direction.
 *
 *           NOT a problem, verified rather than assumed: the Observer does not
 *           multi-fire. One continuous 290px drag advances exactly one tab.
 *           The `cooldownMs` guard exists only to absorb a second flick landing
 *           mid-transition, not to suppress duplicate callbacks.
 */

import { watch, onBeforeUnmount, type Ref } from 'vue';
import gsap from 'gsap';
import { Observer } from 'gsap/Observer';

gsap.registerPlugin(Observer);

export interface UseGsapObserverOptions {
  /** Called when the user swipes left (next tab). */
  onSwipeLeft?: () => void;
  /** Called when the user swipes right (previous tab). */
  onSwipeRight?: () => void;
  /**
   * Minimum px of drag movement before the swipe is recognised.
   * Prevents accidental tab switches on slight finger movements.
   * Default: 40.
   */
  dragMinimum?: number;
  /**
   * px tolerance before the swipe direction is committed.
   * Default: 12.
   */
  tolerance?: number;
  /**
   * Milliseconds after a successful swipe during which further swipes are
   * ignored. Covers the tab-change transition, so a second flick arriving
   * mid-animation does not skip a tab. Default: 350 (transition is ~300ms).
   */
  cooldownMs?: number;
}

/**
 * True when the gesture began inside an element that should consume it itself.
 *
 * Walks from the touch target up to (and including) the observed root, looking
 * for a horizontally scrollable ancestor with room left to travel in the
 * gesture's direction. A swipe inside a scrolled-to-the-end table still changes
 * tab, which is what a user expects once the content cannot move further.
 */
export function shouldIgnoreGesture(
  start: EventTarget | null,
  root: HTMLElement,
  direction: 'left' | 'right',
): boolean {
  let node = start instanceof Node
    ? (start instanceof HTMLElement ? start : start.parentElement)
    : null;

  while (node && node !== root.parentElement) {
    const style = window.getComputedStyle(node);
    const scrollsX = style.overflowX === 'auto' || style.overflowX === 'scroll';
    const overflows = node.scrollWidth > node.clientWidth + 1;

    if (scrollsX && overflows) {
      // Swiping left moves content leftward, i.e. scrollLeft increases.
      const room = direction === 'left'
        ? node.scrollLeft < node.scrollWidth - node.clientWidth - 1
        : node.scrollLeft > 1;
      if (room) return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function useGsapObserver(
  targetRef: Ref<HTMLElement | null>,
  options: UseGsapObserverOptions = {},
): void {
  const {
    onSwipeLeft,
    onSwipeRight,
    dragMinimum = 40,
    tolerance = 12,
    cooldownMs = 350,
  } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let observer: any = null;
  let lastFiredAt = 0;

  function attach(el: HTMLElement): void {
    /** Shared gate: cooldown first (cheap), then the scroller walk. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function accept(self: any, direction: 'left' | 'right'): boolean {
      const now = Date.now();
      if (now - lastFiredAt < cooldownMs) return false;
      if (shouldIgnoreGesture(self?.event?.target ?? null, el, direction)) return false;
      lastFiredAt = now;
      return true;
    }

    observer = Observer.create({
      target:      el,
      type:        'touch',
      lockAxis:    true,   // prevent diagonal gestures from being misread
      tolerance,
      dragMinimum,
      onLeft:      (self) => { if (accept(self, 'left'))  onSwipeLeft?.(); },
      onRight:     (self) => { if (accept(self, 'right')) onSwipeRight?.(); },
      // onUp / onDown intentionally omitted — only horizontal swipes switch tabs
    });
  }

  function detach(): void {
    observer?.kill();
    observer = null;
    lastFiredAt = 0;
  }

  watch(targetRef, (newEl, oldEl) => {
    if (oldEl) detach();
    if (newEl) attach(newEl);
  }, { immediate: true });

  onBeforeUnmount(detach);
}
