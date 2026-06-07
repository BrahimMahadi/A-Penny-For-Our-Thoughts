/**
 * Module:   composables/useFlipIndicator.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (feat/gsap-flip-toggles)
 * Summary:  Shared composable for GSAP Flip sliding indicator pills.
 *
 *           Captures the indicator element's current bounding rect, moves it
 *           to match the currently-active button, then uses Flip.from() to
 *           animate from the old position to the new one — creating the
 *           smooth "sliding pill" effect with no janky CSS transitions.
 *
 *           Two axis modes:
 *             'both'  — full pill (tracks left + top + width + height)
 *             'y'     — vertical left-bar (tracks top + height only)
 *
 *           Respects prefers-reduced-motion: when the OS requests less motion,
 *           the indicator snaps instantly to its new position.
 *
 *           Reveal-on-mount: the indicator starts hidden (set opacity:0 in CSS)
 *           and is faded in after the first snap so there is no flash of an
 *           un-positioned element at the top-left of its wrapper.
 *
 * Usage:
 *   const wrapperRef  = ref<HTMLElement | null>(null);
 *   const indicatorRef = ref<HTMLElement | null>(null);
 *
 *   const { move, snap } = useFlipIndicator(wrapperRef, indicatorRef, {
 *     activeSel: '.my-btn--active',
 *     ease:      'back.out(2.5)',
 *     duration:  0.32,
 *     axis:      'both',
 *   });
 *
 *   // In a click handler — update state first, then call move():
 *   function handleClick(val: string) {
 *     activeFilter.value = val; // state update triggers Vue re-render
 *     move();                   // animates after nextTick
 *   }
 */

import { onMounted, onUnmounted, nextTick } from 'vue';
import type { Ref } from 'vue';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { prefersReducedMotion } from '@/composables/useGsap';

gsap.registerPlugin(Flip);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlipIndicatorOptions {
  /**
   * CSS selector that identifies the currently-active button inside the
   * wrapper element (e.g. '.btn--active', '[aria-selected="true"]').
   */
  activeSel: string;

  /**
   * GSAP ease applied to the Flip animation.
   * Default: 'back.out(2.5)' — bouncy overshoot feel.
   */
  ease?: string;

  /**
   * Animation duration in seconds.
   * Default: 0.32
   */
  duration?: number;

  /**
   * Axis mode:
   *   'both' — tracks left + top + width + height (horizontal pill indicator)
   *   'y'    — tracks top + height only (vertical left-bar indicator)
   * Default: 'both'
   */
  axis?: 'both' | 'y';
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useFlipIndicator(
  wrapperRef:   Ref<HTMLElement | null>,
  indicatorRef: Ref<HTMLElement | null>,
  options: FlipIndicatorOptions,
) {
  const {
    activeSel,
    ease     = 'back.out(2.5)',
    duration = 0.32,
    axis     = 'both',
  } = options;

  // ── Internal helpers ──────────────────────────────────────────────

  /** Place indicator at the active button's position with no animation. */
  function snap(): void {
    const wrapper = wrapperRef.value;
    const ind     = indicatorRef.value;
    if (!wrapper || !ind) return;

    const activeBtn = wrapper.querySelector<HTMLElement>(activeSel);
    if (!activeBtn) return;

    const wr = wrapper.getBoundingClientRect();
    const br = activeBtn.getBoundingClientRect();

    if (axis === 'y') {
      ind.style.top    = (br.top  - wr.top) + 'px';
      ind.style.height = br.height + 'px';
    } else {
      ind.style.left   = (br.left - wr.left) + 'px';
      ind.style.top    = (br.top  - wr.top)  + 'px';
      ind.style.width  = br.width  + 'px';
      ind.style.height = br.height + 'px';
    }
  }

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Animate the indicator to the currently-active button.
   * Call this AFTER updating reactive state so Vue has queued a re-render.
   * Internally awaits nextTick() so the new --active class is in the DOM
   * before measuring button positions.
   */
  async function move(): Promise<void> {
    await nextTick();

    const wrapper = wrapperRef.value;
    const ind     = indicatorRef.value;
    if (!wrapper || !ind) return;

    const activeBtn = wrapper.querySelector<HTMLElement>(activeSel);
    if (!activeBtn) return;

    const wr = wrapper.getBoundingClientRect();
    const br = activeBtn.getBoundingClientRect();

    if (prefersReducedMotion()) {
      // Instant jump — no Flip, no duration
      if (axis === 'y') {
        ind.style.top    = (br.top  - wr.top) + 'px';
        ind.style.height = br.height + 'px';
      } else {
        ind.style.left   = (br.left - wr.left) + 'px';
        ind.style.top    = (br.top  - wr.top)  + 'px';
        ind.style.width  = br.width  + 'px';
        ind.style.height = br.height + 'px';
      }
      return;
    }

    // 1. Record current position
    const state = Flip.getState(ind);

    // 2. Move indicator to the new position immediately (no paint yet)
    if (axis === 'y') {
      ind.style.top    = (br.top  - wr.top) + 'px';
      ind.style.height = br.height + 'px';
    } else {
      ind.style.left   = (br.left - wr.left) + 'px';
      ind.style.top    = (br.top  - wr.top)  + 'px';
      ind.style.width  = br.width  + 'px';
      ind.style.height = br.height + 'px';
    }

    // 3. Flip animates FROM the old position TO the new one
    Flip.from(state, { duration, ease });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;

  function onResize(): void {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(snap, 150);
  }

  onMounted(async () => {
    await nextTick();
    snap();

    // Reveal indicator now that it's correctly positioned
    const ind = indicatorRef.value;
    if (ind) ind.style.opacity = '1';

    // Re-snap once custom fonts have loaded (avoids text-reflow misalignment)
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        snap();
      });
    }

    window.addEventListener('resize', onResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', onResize);
    if (resizeTimer) clearTimeout(resizeTimer);
  });

  return { move, snap };
}
