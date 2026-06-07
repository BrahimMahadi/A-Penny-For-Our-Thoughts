/**
 * Module:   composables/useGsap.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (RS-17 — GSAP Foundation)
 * Summary:  Thin wrapper around GSAP that centralises two concerns:
 *
 *           1. prefers-reduced-motion — when the OS/browser requests less
 *              motion, every animation is replaced with an instant jump to
 *              the final state; onComplete callbacks are still fired so
 *              Vue Transition `done()` hooks aren't left dangling.
 *
 *           2. Single import point — components import useGsap() rather than
 *              importing GSAP directly, which also makes test mocking easier.
 *
 * Usage:
 *   const { to, from, fromTo, timeline, raw } = useGsap();
 *
 *   // Animate with automatic reduced-motion awareness:
 *   to(el, { opacity: 1, duration: 0.3 });
 *
 *   // Raw access for gsap.set() and gsap.registerPlugin():
 *   raw.set(el, { clearProps: 'height' });
 */

import gsap from 'gsap';

/**
 * Returns true when the OS / browser has requested reduced motion.
 * Gracefully returns false in environments without matchMedia (SSR, jsdom).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  // Defensive null check: in jsdom test environments the mock may be
  // reset by vi.restoreAllMocks() between async lifecycle calls, causing
  // matchMedia() to return undefined. Fall back to false (no reduction).
  return window.matchMedia('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

export function useGsap() {
  const reduced = prefersReducedMotion;

  /**
   * Wrapper for gsap.to().
   * When reduced motion is on, the animation plays at duration 0 (instant jump
   * to the end state) so onComplete still fires and callers don't need guards.
   */
  function to(
    target: gsap.TweenTarget,
    vars: gsap.TweenVars,
  ): gsap.core.Tween {
    return gsap.to(target, reduced() ? { ...vars, duration: 0, delay: 0 } : vars);
  }

  /**
   * Wrapper for gsap.from().
   * When reduced motion is on, the from-state is skipped entirely (duration 0).
   */
  function from(
    target: gsap.TweenTarget,
    vars: gsap.TweenVars,
  ): gsap.core.Tween {
    return gsap.from(target, reduced() ? { ...vars, duration: 0, delay: 0 } : vars);
  }

  /**
   * Wrapper for gsap.fromTo().
   * When reduced motion is on, jumps straight to the toVars end state.
   */
  function fromTo(
    target: gsap.TweenTarget,
    fromVars: gsap.TweenVars,
    toVars: gsap.TweenVars,
  ): gsap.core.Tween {
    if (reduced()) {
      return gsap.to(target, { ...toVars, duration: 0, delay: 0 });
    }
    return gsap.fromTo(target, fromVars, toVars);
  }

  /**
   * Wrapper for gsap.timeline().
   * When reduced motion is on, returns a zero-duration timeline.
   */
  function timeline(vars?: gsap.TimelineVars): gsap.core.Timeline {
    return gsap.timeline(
      reduced() ? { ...vars, duration: 0, defaults: { duration: 0 } } : vars,
    );
  }

  return {
    to,
    from,
    fromTo,
    timeline,
    /** Raw GSAP instance for gsap.set(), gsap.registerPlugin(), etc. */
    raw: gsap,
  };
}
