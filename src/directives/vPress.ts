/**
 * Module:   src/directives/vPress.ts
 * Project:  A Penny For Our Thoughts
 * Created:  September 2026 (MOBILE-5)
 * Summary:  `v-press` — tactile press feedback for touch targets. A quick
 *           scale-down on press, a spring release.
 *
 *           Extends MOBILE-1, which gave `.btn-primary` / `.btn-secondary`
 *           (and the quick-add pills) a flat CSS `:active { scale(0.96) }`.
 *           Those keep their CSS press — it works and needs no per-element
 *           wiring. This directive covers the surfaces that had NO feedback at
 *           all, where touch has no `:hover` to signal interactivity:
 *
 *             - bottom nav tabs, the More button, and overflow-sheet items
 *             - the floating section handle / FAB
 *
 *           Deliberately NOT applied to:
 *             - the hero Wants/Needs toggle — MOBILE-1 left it out because its
 *               GSAP Flip indicator would fight a competing squeeze.
 *             - category/summary rows that have no click handler. Press
 *               feedback on an inert row is a false affordance.
 *             - the ~20 section components' edit/delete buttons, which already
 *               inherit the `.btn-*` CSS press.
 *
 *           It is a general-purpose directive, so new interactive surfaces can
 *           opt in with a single `v-press` attribute.
 *
 *           A directive rather than a composable because most of these targets
 *           live inside `v-for` (nav tabs, purchase rows), where per-element
 *           template refs would mean managing parallel ref arrays.
 *
 *           Timings chosen against the MOBILE-5 demo harness:
 *             scale 0.96 · press 0.08s · release 0.4s `back.out(2.2)`
 *           A real tap is ~80ms, so the release curve is most of what the user
 *           actually perceives — hence a near-instant press against a slower,
 *           slightly overshooting release.
 *
 *           Visual only. No Vibration API: iOS Safari does not implement
 *           `navigator.vibrate`, so haptics would be dead weight for roughly
 *           half the userbase while giving the other half an inconsistent feel.
 */

import type { Directive } from 'vue';
import gsap from 'gsap';
import { prefersReducedMotion } from '../composables/useGsap';

/** Press-state constants, exported so specs assert against one source. */
export const PRESS_SCALE = 0.96;
export const PRESS_DURATION = 0.08;
export const RELEASE_DURATION = 0.4;
export const RELEASE_EASE = 'back.out(2.2)';

/** Applied instead of a transform when the user prefers reduced motion. */
export const REDUCED_MOTION_OPACITY = '0.7';

interface PressHandlers {
  down: () => void;
  up: () => void;
}

/**
 * Handlers are keyed off the element so `unmounted` removes exactly what
 * `mounted` added. A WeakMap means a removed element is collectable without
 * any explicit cleanup bookkeeping.
 */
const registry = new WeakMap<HTMLElement, PressHandlers>();

function applyPress(el: HTMLElement): void {
  if (prefersReducedMotion()) {
    el.style.opacity = REDUCED_MOTION_OPACITY;
    return;
  }
  // `overwrite` so a fast press/release/press cannot leave two tweens
  // fighting over the same transform and stranding a half-scaled element.
  gsap.to(el, {
    scale: PRESS_SCALE,
    duration: PRESS_DURATION,
    ease: 'power2.out',
    overwrite: true,
  });
}

function applyRelease(el: HTMLElement): void {
  if (prefersReducedMotion()) {
    el.style.opacity = '';
    return;
  }
  gsap.to(el, {
    scale: 1,
    duration: RELEASE_DURATION,
    ease: RELEASE_EASE,
    overwrite: true,
  });
}

/**
 * `v-press` — bind to any element that should feel pressable.
 *
 * Pointer events rather than touch/mouse pairs, so one code path covers touch,
 * pen and mouse. `pointerleave` and `pointercancel` both release: without them,
 * dragging a finger off a pressed control strands it at 0.96 permanently — the
 * classic failure in hand-rolled press states.
 *
 * Pass `false` to disable (e.g. `v-press="!disabled"`), for controls that
 * should not feel pressable while inert.
 */
export const vPress: Directive<HTMLElement, boolean | undefined> = {
  mounted(el, binding) {
    if (binding.value === false) return;

    const handlers: PressHandlers = {
      down: () => applyPress(el),
      up: () => applyRelease(el),
    };

    el.addEventListener('pointerdown', handlers.down);
    el.addEventListener('pointerup', handlers.up);
    el.addEventListener('pointerleave', handlers.up);
    el.addEventListener('pointercancel', handlers.up);

    registry.set(el, handlers);
  },

  unmounted(el) {
    const handlers = registry.get(el);
    if (!handlers) return;

    el.removeEventListener('pointerdown', handlers.down);
    el.removeEventListener('pointerup', handlers.up);
    el.removeEventListener('pointerleave', handlers.up);
    el.removeEventListener('pointercancel', handlers.up);

    registry.delete(el);
    // Kill any in-flight tween so GSAP is not left animating a detached node.
    gsap.killTweensOf(el);
  },
};
