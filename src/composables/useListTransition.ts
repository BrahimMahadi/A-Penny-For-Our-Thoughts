/**
 * Module:   composables/useListTransition.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (RS-19 — List & Micro-interactions)
 * Summary:  Provides reusable GSAP enter / leave hooks for
 *           <TransitionGroup :css="false"> lists and grids.
 *
 *           Uses useGsap() internally so prefers-reduced-motion is
 *           automatically respected (duration collapses to 0 when active
 *           — items appear / disappear instantly without animation).
 *
 * Usage:
 *   const { onItemEnter, onItemLeave } = useListTransition();
 *
 *   <TransitionGroup
 *     :css="false"
 *     move-class="my-move"   <!-- CSS handles FLIP; GSAP handles enter/leave -->
 *     @enter="onItemEnter"
 *     @leave="onItemLeave"
 *   >
 */

import { useGsap } from '@/composables/useGsap';

export interface ListTransitionOptions {
  /** Y-axis travel distance for enter in px (default 14). */
  enterY?: number;
  /** Enter animation duration in seconds (default 0.28). */
  enterDuration?: number;
  /** Leave animation duration in seconds (default 0.2). */
  leaveDuration?: number;
  /** GSAP ease string for enter (default 'power2.out'). */
  enterEase?: string;
  /** GSAP ease string for leave (default 'power2.in'). */
  leaveEase?: string;
}

export function useListTransition(options: ListTransitionOptions = {}) {
  const {
    enterY       = 14,
    enterDuration = 0.28,
    leaveDuration = 0.2,
    enterEase    = 'power2.out',
    leaveEase    = 'power2.in',
  } = options;

  const { to, from } = useGsap();

  /**
   * Vue TransitionGroup @enter hook.
   * Animates the item in from below with a fade.
   * `done` is called in onComplete so Vue removes the entering state.
   */
  function onItemEnter(el: Element, done: () => void): void {
    from(el as HTMLElement, {
      opacity:  0,
      y:        enterY,
      duration: enterDuration,
      ease:     enterEase,
      onComplete: done,
    });
  }

  /**
   * Vue TransitionGroup @leave hook.
   * Fades the item out and floats it slightly upward.
   * `done` is called in onComplete so Vue removes the element.
   */
  function onItemLeave(el: Element, done: () => void): void {
    to(el as HTMLElement, {
      opacity:  0,
      y:        -(enterY * 0.5),
      duration: leaveDuration,
      ease:     leaveEase,
      onComplete: done,
    });
  }

  return { onItemEnter, onItemLeave };
}
