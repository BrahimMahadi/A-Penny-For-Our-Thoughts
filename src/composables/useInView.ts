/**
 * Module:   composables/useInView.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 8 — performance)
 * Summary:  Lightweight IntersectionObserver composable for lazy-rendering
 *           Chart.js canvases. The returned `isInView` ref starts `false`
 *           and flips to `true` once the observed element enters the viewport.
 *           It stays `true` after that — charts are never unmounted on scroll.
 *
 *           Falls back to `true` immediately when IntersectionObserver is
 *           unavailable (jsdom tests, old browsers, SSR-like contexts).
 */

import { ref, watch, onUnmounted, readonly, type Ref } from 'vue';

export interface UseInViewOptions {
  /**
   * Margin around the viewport used to pre-load charts before they're
   * fully visible. A positive value means the chart starts rendering
   * before the user scrolls to it, eliminating any visible delay.
   * @default '120px'
   */
  rootMargin?: string;
  /**
   * Intersection ratio threshold (0 = first pixel visible).
   * @default 0
   */
  threshold?: number;
}

/**
 * Observe `elementRef` with IntersectionObserver and return a reactive
 * `isInView` boolean. Once `true`, the observer disconnects — charts
 * are never unmounted on scroll-away.
 *
 * @example
 * ```vue
 * <script setup>
 * const wrapperRef = ref<HTMLElement | null>(null);
 * const { isInView } = useInView(wrapperRef);
 * </script>
 *
 * <template>
 *   <div ref="wrapperRef">
 *     <MyChart v-if="isInView" />
 *     <div v-else class="chart-skeleton" aria-hidden="true" />
 *   </div>
 * </template>
 * ```
 */
export function useInView(
  elementRef: Ref<HTMLElement | null>,
  options: UseInViewOptions = {},
) {
  const isInView = ref(false);
  let observer: IntersectionObserver | null = null;

  function cleanup() {
    observer?.disconnect();
    observer = null;
  }

  function startObserving(el: HTMLElement) {
    // Graceful degradation: render immediately when IO is unavailable
    // (jsdom, very old browsers, or any environment that blocks IO).
    if (typeof IntersectionObserver === 'undefined') {
      isInView.value = true;
      return;
    }

    cleanup();

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          isInView.value = true;
          // Disconnect once visible — no need to keep observing.
          cleanup();
        }
      },
      {
        rootMargin: options.rootMargin ?? '120px',
        threshold: options.threshold ?? 0,
      },
    );

    observer.observe(el);
  }

  // `watch` with `immediate: true` handles both the case where the ref
  // is already populated at setup time and where it fills in async.
  watch(
    elementRef,
    (el) => {
      if (el && !isInView.value) startObserving(el);
    },
    { immediate: true },
  );

  onUnmounted(cleanup);

  return { isInView: readonly(isInView) };
}
