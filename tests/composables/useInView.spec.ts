/**
 * Module:   tests/composables/useInView.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 8 — performance)
 * Summary:  Tests for the useInView composable.
 *
 *           jsdom does not implement IntersectionObserver, so:
 *           • "no-IO" tests rely on the composable's immediate-true fallback.
 *           • "with-IO" tests stub IntersectionObserver globally and mount
 *             a minimal component so lifecycle hooks (watch, onUnmounted) run.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineComponent, ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useInView } from '@/composables/useInView';

// ─── IntersectionObserver mock ───────────────────────────────────
type IOEntry = { isIntersecting: boolean };
type IOCallback = (entries: IOEntry[]) => void;

/** Class-based IO mock — avoids `this` aliasing lint error. */
class MockIO {
  static lastOptions: { rootMargin?: string; threshold?: number } | undefined;
  static lastInstance: MockIO | null = null;

  observe    = vi.fn();
  disconnect = vi.fn();
  private cb: IOCallback;

  constructor(callback: IOCallback, options?: { rootMargin?: string; threshold?: number }) {
    this.cb = callback;
    MockIO.lastOptions  = options;
    MockIO.lastInstance = this;
  }

  /** Trigger the intersection callback with the given `isIntersecting` value. */
  fire(isIntersecting: boolean) {
    this.cb([{ isIntersecting }]);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Mount a minimal component that runs useInView and exposes its state. */
function mountWithIO(options: { rootMargin?: string; threshold?: number } = {}) {
  const Comp = defineComponent({
    setup() {
      const elRef = ref<HTMLElement | null>(null);
      const { isInView } = useInView(elRef, options);
      return { elRef, isInView };
    },
    template: '<div ref="elRef" />',
  });
  return mount(Comp, { attachTo: document.body });
}

// ─────────────────────────────────────────────────────────────────
//  1. NO IntersectionObserver (jsdom default — immediate fallback)
// ─────────────────────────────────────────────────────────────────
describe('useInView — no IntersectionObserver (jsdom)', () => {
  it('isInView is true immediately when IO is unavailable', async () => {
    // jsdom does not define IntersectionObserver — composable falls back to true
    const wrapper = mountWithIO();
    await nextTick();
    expect(wrapper.vm.isInView).toBe(true);
    wrapper.unmount();
  });

  it('does not throw when IO is undefined', () => {
    expect(() => mountWithIO().unmount()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────
//  2. WITH mocked IntersectionObserver
// ─────────────────────────────────────────────────────────────────
describe('useInView — with mocked IntersectionObserver', () => {
  beforeEach(() => {
    MockIO.lastInstance = null;
    MockIO.lastOptions  = undefined;
    vi.stubGlobal('IntersectionObserver', MockIO);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('isInView is false before the element enters the viewport', async () => {
    const wrapper = mountWithIO();
    await nextTick();
    expect(wrapper.vm.isInView).toBe(false);
    wrapper.unmount();
  });

  it('isInView becomes true when observer fires with isIntersecting: true', async () => {
    const wrapper = mountWithIO();
    await nextTick();

    expect(wrapper.vm.isInView).toBe(false);
    MockIO.lastInstance!.fire(true);
    await nextTick();

    expect(wrapper.vm.isInView).toBe(true);
    wrapper.unmount();
  });

  it('isInView stays false when observer fires with isIntersecting: false', async () => {
    const wrapper = mountWithIO();
    await nextTick();

    MockIO.lastInstance!.fire(false);
    await nextTick();

    expect(wrapper.vm.isInView).toBe(false);
    wrapper.unmount();
  });

  it('isInView stays true after first intersection — not toggled back on leave', async () => {
    const wrapper = mountWithIO();
    await nextTick();

    MockIO.lastInstance!.fire(true);
    await nextTick();
    expect(wrapper.vm.isInView).toBe(true);

    // Simulate scroll-away; value must NOT reset
    MockIO.lastInstance!.fire(false);
    await nextTick();
    expect(wrapper.vm.isInView).toBe(true);
    wrapper.unmount();
  });

  it('observe() is called once on mount', async () => {
    const wrapper = mountWithIO();
    await nextTick();
    expect(MockIO.lastInstance!.observe).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it('disconnect() is called immediately after the element first intersects', async () => {
    const wrapper = mountWithIO();
    await nextTick();

    MockIO.lastInstance!.fire(true);
    await nextTick();

    expect(MockIO.lastInstance!.disconnect).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it('disconnect() is called on component unmount (cleanup guard)', async () => {
    const wrapper = mountWithIO();
    await nextTick();

    const io = MockIO.lastInstance!;
    wrapper.unmount();

    expect(io.disconnect).toHaveBeenCalled();
  });

  it('passes custom rootMargin to IntersectionObserver constructor', async () => {
    const wrapper = mountWithIO({ rootMargin: '50px' });
    await nextTick();

    expect(MockIO.lastOptions?.rootMargin).toBe('50px');
    wrapper.unmount();
  });

  it('uses default rootMargin of "120px" when no options provided', async () => {
    const wrapper = mountWithIO();
    await nextTick();

    expect(MockIO.lastOptions?.rootMargin).toBe('120px');
    wrapper.unmount();
  });
});
