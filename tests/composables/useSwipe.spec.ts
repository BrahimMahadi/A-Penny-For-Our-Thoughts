/**
 * Module:   tests/composables/useSwipe.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 9 — Mobile UX Pass)
 * Summary:  Tests for the useSwipe composable.
 *
 *           jsdom 24 exposes TouchEvent but does NOT expose the Touch
 *           constructor as a global.  We build plain touch-like objects
 *           instead — jsdom accepts them in the touches / changedTouches
 *           arrays without complaint.  Every test awaits nextTick() so
 *           Vue's watcher flush completes before events are dispatched.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useSwipe } from '@/composables/useSwipe';

// ─── Helpers ─────────────────────────────────────────────────────

function mountWithSwipe(
  onLeft: () => void,
  onRight: () => void,
  options: { threshold?: number; maxVertical?: number } = {},
) {
  const Comp = defineComponent({
    setup() {
      const elRef = ref<HTMLElement | null>(null);
      useSwipe(elRef, onLeft, onRight, options);
      return { elRef };
    },
    template: '<div ref="elRef" style="width:300px;height:300px" />',
  });
  return mount(Comp, { attachTo: document.body });
}

/**
 * Build a minimal touch-like plain object.
 * jsdom 24 does not expose `Touch` as a global, but its TouchEvent
 * constructor accepts plain objects in the touches / changedTouches
 * arrays as long as they carry the expected properties.
 */
function makeTouch(
  el: HTMLElement,
  clientX: number,
  clientY: number,
): Record<string, unknown> {
  return {
    identifier: Date.now(),
    target: el,
    clientX,
    clientY,
    pageX: clientX,
    pageY: clientY,
    screenX: clientX,
    screenY: clientY,
    radiusX: 1,
    radiusY: 1,
    rotationAngle: 0,
    force: 1,
  };
}

/**
 * Fire a touchstart + touchend pair on `el` using real TouchEvent objects.
 */
function swipe(
  el: HTMLElement,
  startX: number,
  endX: number,
  startY = 100,
  endY = 100,
): void {
  const startTouch = makeTouch(el, startX, startY);
  const endTouch   = makeTouch(el, endX,   endY);

  el.dispatchEvent(
    new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      touches: [startTouch as any],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      changedTouches: [startTouch as any],
    }),
  );
  el.dispatchEvent(
    new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      changedTouches: [endTouch as any],
    }),
  );
}

// ─────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────
describe('useSwipe', () => {
  let onLeft:  ReturnType<typeof vi.fn>;
  let onRight: ReturnType<typeof vi.fn>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapper: any;

  beforeEach(() => {
    onLeft  = vi.fn();
    onRight = vi.fn();
  });

  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = '';
  });

  // ── Direction ──────────────────────────────────────────────────

  it('calls onSwipeLeft when swiping left past the default threshold', async () => {
    wrapper = mountWithSwipe(onLeft, onRight);
    await nextTick(); // let Vue flush the watcher so listeners are attached
    swipe(wrapper.element as HTMLElement, 200, 120); // 80px left
    expect(onLeft).toHaveBeenCalledOnce();
    expect(onRight).not.toHaveBeenCalled();
  });

  it('calls onSwipeRight when swiping right past the default threshold', async () => {
    wrapper = mountWithSwipe(onLeft, onRight);
    await nextTick();
    swipe(wrapper.element as HTMLElement, 120, 200); // 80px right
    expect(onRight).toHaveBeenCalledOnce();
    expect(onLeft).not.toHaveBeenCalled();
  });

  // ── Threshold ──────────────────────────────────────────────────

  it('does NOT fire when horizontal delta is below the threshold', async () => {
    wrapper = mountWithSwipe(onLeft, onRight); // default threshold = 60
    await nextTick();
    swipe(wrapper.element as HTMLElement, 200, 160); // only 40px — below threshold
    expect(onLeft).not.toHaveBeenCalled();
    expect(onRight).not.toHaveBeenCalled();
  });

  it('fires when delta equals the threshold (≥ check)', async () => {
    wrapper = mountWithSwipe(onLeft, onRight, { threshold: 60 });
    await nextTick();
    swipe(wrapper.element as HTMLElement, 200, 140); // exactly 60px left
    expect(onLeft).toHaveBeenCalledOnce();
  });

  it('respects a custom threshold', async () => {
    wrapper = mountWithSwipe(onLeft, onRight, { threshold: 100 });
    await nextTick();
    // 80px — below custom threshold
    swipe(wrapper.element as HTMLElement, 200, 120);
    expect(onLeft).not.toHaveBeenCalled();
    // 110px — above custom threshold
    swipe(wrapper.element as HTMLElement, 200, 90);
    expect(onLeft).toHaveBeenCalledOnce();
  });

  // ── Vertical guard ─────────────────────────────────────────────

  it('does NOT fire when vertical movement exceeds maxVertical', async () => {
    wrapper = mountWithSwipe(onLeft, onRight); // default maxVertical = 50
    await nextTick();
    // 100px horizontal, 80px vertical — vertical > 50 → treat as scroll
    swipe(wrapper.element as HTMLElement, 200, 100, 100, 180);
    expect(onLeft).not.toHaveBeenCalled();
  });

  it('fires when vertical movement is within maxVertical', async () => {
    wrapper = mountWithSwipe(onLeft, onRight); // default maxVertical = 50
    await nextTick();
    // 100px horizontal, 30px vertical — well within maxVertical
    swipe(wrapper.element as HTMLElement, 200, 100, 100, 130);
    expect(onLeft).toHaveBeenCalledOnce();
  });

  it('respects a custom maxVertical', async () => {
    wrapper = mountWithSwipe(onLeft, onRight, { maxVertical: 20 });
    await nextTick();
    // 100px horizontal, 30px vertical — exceeds custom maxVertical of 20 → blocked
    swipe(wrapper.element as HTMLElement, 200, 100, 100, 130);
    expect(onLeft).not.toHaveBeenCalled();
  });

  // ── Multiple swipes ────────────────────────────────────────────

  it('fires on each valid swipe independently', async () => {
    wrapper = mountWithSwipe(onLeft, onRight);
    await nextTick();
    const el = wrapper.element as HTMLElement;
    swipe(el, 200, 100); // left
    swipe(el, 100, 200); // right
    swipe(el, 200, 100); // left again
    expect(onLeft).toHaveBeenCalledTimes(2);
    expect(onRight).toHaveBeenCalledTimes(1);
  });

  // ── Cleanup ────────────────────────────────────────────────────

  it('removes both touch listeners on unmount', async () => {
    wrapper = mountWithSwipe(onLeft, onRight);
    await nextTick();
    const remove = vi.spyOn(wrapper.element as HTMLElement, 'removeEventListener');
    wrapper.unmount();
    const types = remove.mock.calls.map((c) => c[0]);
    expect(types).toContain('touchstart');
    expect(types).toContain('touchend');
  });

  it('does not fire after unmount', async () => {
    wrapper = mountWithSwipe(onLeft, onRight);
    await nextTick();
    const el = wrapper.element as HTMLElement;
    wrapper.unmount();
    swipe(el, 200, 100);
    expect(onLeft).not.toHaveBeenCalled();
  });
});
