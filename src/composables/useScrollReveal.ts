/**
 * Module:   composables/useScrollReveal.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (v2.44.0 — GSAP ScrollTrigger scroll animations)
 * Updated:  June 2026 (v2.44.3 — BUG-034: stale trigger positions after layout shift)
 * Summary:  Wraps GSAP ScrollTrigger to deliver bidirectional scroll-reveal
 *           animations with a single consistent design language:
 *             - Y-axis: sections fade + rise from below (Dashboard)
 *             - X-axis: sections slide from the right (Spending / history)
 *           All animations respect `prefers-reduced-motion`; when reduced
 *           motion is active every animation is skipped entirely (elements
 *           remain at their natural CSS position).
 *
 *           Default settings (all overridable via ScrollRevealConfig):
 *             ease     : back.out     (springy settle approved by user)
 *             duration : 0.5 s
 *             stagger  : 0.08 s       (for grouped targets)
 *             offsetY  : 24 px        (Y-axis starting displacement)
 *             offsetX  : 48 px        (X-axis starting displacement)
 *             fadeOut  : true         (bidirectional — elements fade out as
 *                                      they leave the viewport in any direction)
 *             outEase  : power2.in    (sharper ease for the exit direction)
 *             outDur   : 0.3 s
 *
 *           BUG-034 self-healing:
 *             ScrollTrigger caches trigger positions at measurement time and
 *             only re-measures on window resize — NOT on DOM height changes
 *             (card collapse/expand, async chart sizing, etc.). Two mechanisms
 *             fix this:
 *             1. ResizeObserver on document.body — debounced 150 ms, calls
 *                ScrollTrigger.refresh() after any content-height change.
 *             2. onRefresh callback on every trigger — after positions are
 *                recalculated, snaps the element's visual state to match its
 *                true scroll position so no card can be stranded invisible.
 *
 * Usage:
 *   const { revealImmediate, revealOnScrollY, revealOnScrollX, killAll } =
 *     useScrollReveal();
 *
 *   // Above-fold items — animated once on mount:
 *   revealImmediate([heroEl], 0.05);
 *   revealImmediate(kpiCards, 0.15);
 *
 *   // Below-fold items — ScrollTrigger-driven:
 *   revealOnScrollY(chartsCards, chartsRowEl); // trigger on row, animate cards
 *   revealOnScrollX(purchasesCard);            // horizontal slide (Spending)
 */

import { onBeforeUnmount } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './useGsap';

gsap.registerPlugin(ScrollTrigger);

// ─── Public config type ───────────────────────────────────────────────────────

export interface ScrollRevealConfig {
  /** GSAP ease string.  Default: `'back.out'`. */
  ease?: string;
  /** Animation duration in seconds.  Default: `0.5`. */
  duration?: number;
  /** Per-element stagger in seconds for grouped targets.  Default: `0.08`. */
  stagger?: number;
  /** Y-axis starting displacement in px.  Default: `24`. */
  offsetY?: number;
  /** X-axis starting displacement in px (for `revealOnScrollX`).  Default: `48`. */
  offsetX?: number;
  /** Fade elements out as they scroll past the viewport edge.  Default: `true`. */
  fadeOut?: boolean;
  /** GSAP ease for the exit direction.  Default: `'power2.in'`. */
  outEase?: string;
  /** Exit animation duration in seconds.  Default: `0.3`. */
  outDuration?: number;
}

const DEFAULTS: Required<ScrollRevealConfig> = {
  ease:        'back.out',
  duration:    0.5,
  stagger:     0.08,
  offsetY:     24,
  offsetX:     48,
  fadeOut:     true,
  outEase:     'power2.in',
  outDuration: 0.3,
};

// ─── Composable ───────────────────────────────────────────────────────────────

export function useScrollReveal(config: ScrollRevealConfig = {}) {
  const cfg = { ...DEFAULTS, ...config };

  /** All ScrollTrigger instances created by this composable instance. */
  const triggers: ScrollTrigger[] = [];

  // ── BUG-034: ResizeObserver + debounced refresh ───────────────────────────
  // ScrollTrigger caches scroll positions at measurement time. DOM height
  // changes (card collapse, async charts) are not detected automatically —
  // only window resize triggers a recalculation. We watch document.body and
  // schedule a refresh whenever its height changes.

  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleRefresh(): void {
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
      refreshTimer = null;
    }, 150);
  }

  // Guard: skip observer in reduced-motion mode (no triggers will be created)
  // and in environments without ResizeObserver (jsdom in tests).
  const resizeObserver =
    !prefersReducedMotion() && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(scheduleRefresh)
      : null;

  resizeObserver?.observe(document.body);

  // ── Immediate (above-fold) reveal ─────────────────────────────────────────

  /**
   * Animate `targets` into view immediately — no ScrollTrigger.
   * Used for above-fold content that is visible without scrolling.
   *
   * @param targets      Elements to animate.
   * @param delay        GSAP delay in seconds before the animation starts.
   * @param offsetYFactor Multiplier on `offsetY` for the starting position.
   *                     Use 0.6 for the hero card (shorter travel distance).
   */
  function revealImmediate(
    targets: HTMLElement[],
    delay = 0,
    offsetYFactor = 1.0,
  ): void {
    if (prefersReducedMotion() || !targets.length) return;
    gsap.fromTo(
      targets,
      { opacity: 0, y: cfg.offsetY * offsetYFactor },
      {
        opacity:    1,
        y:          0,
        duration:   cfg.duration,
        ease:       cfg.ease,
        stagger:    cfg.stagger,
        delay,
        clearProps: 'opacity,y,transform',
      },
    );
  }

  // ── ScrollTrigger Y-axis reveal ───────────────────────────────────────────

  /**
   * Fade-and-rise reveal driven by the scroll position (Y axis).
   * Elements start hidden (`opacity:0, y:+offsetY`) and are animated to their
   * natural position when they enter the viewport.  When `fadeOut:true` they
   * also fade out as they exit the viewport at the top or bottom.
   *
   * @param targets    One or more elements to animate as a group.
   * @param triggerEl  The element used as the ScrollTrigger anchor.
   *                   Defaults to the first element in `targets`.
   */
  function revealOnScrollY(
    targets: HTMLElement[],
    triggerEl?: HTMLElement,
  ): void {
    if (prefersReducedMotion() || !targets.length) return;

    const trigger = triggerEl ?? targets[0];
    gsap.set(targets, { opacity: 0, y: cfg.offsetY });

    const st = ScrollTrigger.create({
      trigger,
      start: 'top 88%',
      end:   'bottom 12%',

      onEnter: () =>
        gsap.to(targets, {
          opacity:   1,
          y:         0,
          duration:  cfg.duration,
          ease:      cfg.ease,
          stagger:   cfg.stagger,
          overwrite: 'auto',
        }),

      onLeave: () => {
        if (!cfg.fadeOut) return;
        gsap.to(targets, {
          opacity:   0,
          y:         -(cfg.offsetY * 0.5),
          duration:  cfg.outDuration,
          ease:      cfg.outEase,
          overwrite: 'auto',
        });
      },

      onEnterBack: () => {
        if (!cfg.fadeOut) return;
        gsap.to(targets, {
          opacity:   1,
          y:         0,
          duration:  cfg.duration,
          ease:      cfg.ease,
          stagger:   cfg.stagger,
          overwrite: 'auto',
        });
      },

      onLeaveBack: () => {
        if (!cfg.fadeOut) return;
        gsap.to(targets, {
          opacity:   0,
          y:         cfg.offsetY,
          duration:  cfg.outDuration,
          ease:      cfg.outEase,
          overwrite: 'auto',
        });
      },

      // BUG-034: After ScrollTrigger recalculates positions, snap each element
      // to the state matching its true scroll position. Prevents cards being
      // stranded invisible when a layout shift (collapse, async chart) moved
      // them relative to where the trigger was originally measured.
      onRefresh(self) {
        if (self.isActive) {
          gsap.set(targets, { opacity: 1, y: 0 });
        } else if ((self.progress as number) >= 1 && cfg.fadeOut) {
          // Scrolled past — match the onLeave exit state
          gsap.set(targets, { opacity: 0, y: -(cfg.offsetY * 0.5) });
        }
        // progress === 0: still below viewport → keep initial hidden state
      },
    });

    triggers.push(st);
  }

  // ── ScrollTrigger X-axis reveal ───────────────────────────────────────────

  /**
   * Slide-from-right reveal driven by the scroll position (X axis).
   * Used for Spending page section cards to give them a "history card" feel.
   *
   * @param target     Single element to animate.
   * @param triggerEl  The element used as the ScrollTrigger anchor.
   *                   Defaults to `target` itself.
   */
  function revealOnScrollX(
    target: HTMLElement,
    triggerEl?: HTMLElement,
  ): void {
    if (prefersReducedMotion()) return;

    const trigger = triggerEl ?? target;
    gsap.set(target, { opacity: 0, x: cfg.offsetX });

    const st = ScrollTrigger.create({
      trigger,
      start: 'top 88%',
      end:   'bottom 12%',

      onEnter: () =>
        gsap.to(target, {
          opacity:   1,
          x:         0,
          duration:  cfg.duration,
          ease:      cfg.ease,
          overwrite: 'auto',
        }),

      onLeave: () => {
        if (!cfg.fadeOut) return;
        gsap.to(target, {
          opacity:   0,
          x:         -(cfg.offsetX * 0.4),
          duration:  cfg.outDuration,
          ease:      cfg.outEase,
          overwrite: 'auto',
        });
      },

      onEnterBack: () => {
        if (!cfg.fadeOut) return;
        gsap.to(target, {
          opacity:   1,
          x:         0,
          duration:  cfg.duration,
          ease:      cfg.ease,
          overwrite: 'auto',
        });
      },

      onLeaveBack: () => {
        if (!cfg.fadeOut) return;
        gsap.to(target, {
          opacity:   0,
          x:         cfg.offsetX,
          duration:  cfg.outDuration,
          ease:      cfg.outEase,
          overwrite: 'auto',
        });
      },

      // BUG-034: self-heal after positions are recalculated (see Y-axis note above)
      onRefresh(self) {
        if (self.isActive) {
          gsap.set(target, { opacity: 1, x: 0 });
        } else if ((self.progress as number) >= 1 && cfg.fadeOut) {
          gsap.set(target, { opacity: 0, x: -(cfg.offsetX * 0.4) });
        }
        // progress === 0: still below viewport → keep initial hidden state
      },
    });

    triggers.push(st);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  /**
   * Kill all ScrollTrigger instances, disconnect the ResizeObserver, and
   * cancel any pending debounced refresh. Called automatically on
   * `onBeforeUnmount`; can also be called manually (e.g. when the page
   * re-renders for a new period and triggers need reset).
   */
  function killAll(): void {
    triggers.forEach(t => t.kill());
    triggers.length = 0;
    resizeObserver?.disconnect();
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  onBeforeUnmount(killAll);

  return { revealImmediate, revealOnScrollY, revealOnScrollX, killAll };
}
