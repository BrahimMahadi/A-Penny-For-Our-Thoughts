/**
 * Module:   composables/useCountUp.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (RS-18 — Page Load Animations)
 * Summary:  Returns a reactive numeric value that "counts up" from 0 to the
 *           source value on mount, and animates between old and new values
 *           whenever the source changes (e.g. Wants ↔ Needs toggle).
 *
 *           Powered by GSAP via useGsap() so prefers-reduced-motion is
 *           automatically respected (duration is set to 0 when reduced motion
 *           is active — value jumps instantly to its final state).
 *
 * Usage:
 *   const displayed = useCountUp(computed(() => heroRemaining.value));
 *   // In template: {{ fmt(displayed) }}
 */

import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useGsap } from '@/composables/useGsap';
import gsap from 'gsap';

export interface CountUpOptions {
  /** Animation duration in seconds (default 0.65). */
  duration?: number;
  /** GSAP ease string (default 'power2.out'). */
  ease?: string;
  /** Delay before the initial mount animation (seconds, default 0.05). */
  mountDelay?: number;
}

export function useCountUp(
  source: Ref<number> | ComputedRef<number>,
  options: CountUpOptions = {},
): ComputedRef<number> {
  const { duration = 0.65, ease = 'power2.out', mountDelay = 0.05 } = options;
  const { to } = useGsap();

  const displayed = ref(0);
  let tween: gsap.core.Tween | null = null;

  function animateTo(newVal: number, startVal: number): void {
    tween?.kill();
    const proxy = { v: startVal };
    tween = to(proxy, {
      v: newVal,
      duration,
      ease,
      onUpdate(): void {
        displayed.value = (proxy as { v: number }).v;
      },
      onComplete(): void {
        // Ensure the displayed value is exactly the target (avoids float drift)
        displayed.value = newVal;
      },
    });
  }

  // On mount: count up from 0 to the current value
  onMounted(() => {
    animateTo(source.value, 0);
  });

  // On source change: animate from the current displayed value to the new value
  watch(source, (newVal) => {
    animateTo(newVal, displayed.value);
  });

  onUnmounted(() => {
    tween?.kill();
  });

  return computed(() => displayed.value);
}
