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
}

export function useGsapObserver(
  targetRef: Ref<HTMLElement | null>,
  options: UseGsapObserverOptions = {},
): void {
  const { onSwipeLeft, onSwipeRight, dragMinimum = 40, tolerance = 12 } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let observer: any = null;

  function attach(el: HTMLElement): void {
    observer = Observer.create({
      target:      el,
      type:        'touch',
      lockAxis:    true,   // prevent diagonal gestures from being misread
      tolerance,
      dragMinimum,
      onLeft:      () => onSwipeLeft?.(),
      onRight:     () => onSwipeRight?.(),
      // onUp / onDown intentionally omitted — only horizontal swipes switch tabs
    });
  }

  function detach(): void {
    observer?.kill();
    observer = null;
  }

  watch(targetRef, (newEl, oldEl) => {
    if (oldEl) detach();
    if (newEl) attach(newEl);
  }, { immediate: true });

  onBeforeUnmount(detach);
}
