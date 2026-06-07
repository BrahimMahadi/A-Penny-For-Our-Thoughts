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

  const { to, from, raw } = useGsap();

  /**
   * Vue TransitionGroup @enter hook.
   * Animates the item in from below with a fade.
   * Kills any in-progress leave tween first and clears stale inline styles
   * (height/overflow left by an interrupted collapse) so rapid filter
   * switching never leaves items invisible or zero-height.
   * `done` is called in onComplete so Vue removes the entering state.
   *
   * NOTE: We disable any CSS animation on the element before GSAP reads its
   * "to" values.  `extras.css` applies `animation: listItemIn … fill-mode: both`
   * to `.sub-item` / `.wish-item`, which pre-applies `opacity:0` as the
   * initial keyframe state.  If we let that stand, GSAP's `from()` captures
   * opacity:0 as the target and the item never becomes visible.
   */
  function onItemEnter(el: Element, done: () => void): void {
    const htmlEl = el as HTMLElement;
    // Disable conflicting CSS animation before GSAP captures the "to" state.
    htmlEl.style.animation = 'none';
    raw.killTweensOf(el);
    raw.set(el, { clearProps: 'height,overflow,paddingTop,paddingBottom,opacity,y,transform' });
    from(htmlEl, {
      opacity:  0,
      y:        enterY,
      duration: enterDuration,
      ease:     enterEase,
      onComplete: done,
    });
  }

  /**
   * Vue TransitionGroup @leave hook.
   * Collapses the item's height to 0 while fading out, which naturally
   * removes it from the document flow as it shrinks — entering items render
   * at the correct positions from the very first frame.
   *
   * This avoids the position:absolute approach, which breaks when multiple
   * items leave in the same JS tick: Vue calls each leave hook sequentially,
   * so by the time item N's hook fires, items 1…N-1 are already out of flow
   * and item N's getBoundingClientRect() reflects the shifted layout, not the
   * original position — causing all leaving items to pile up at top:0.
   *
   * `done` is called in onComplete so Vue removes the element from the DOM.
   */
  function onItemLeave(el: Element, done: () => void): void {
    raw.killTweensOf(el);
    const htmlEl = el as HTMLElement;
    // Fix the height at its current rendered value so GSAP can animate it to 0.
    raw.set(htmlEl, { height: htmlEl.offsetHeight, overflow: 'hidden' });
    to(htmlEl, {
      opacity:    0,
      height:     0,
      paddingTop: 0,
      paddingBottom: 0,
      duration:   leaveDuration,
      ease:       leaveEase,
      onComplete: done,
    });
  }

  return { onItemEnter, onItemLeave };
}
