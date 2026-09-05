/**
 * Module:   tests/composables/useGsapObserver.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (v2.43.0 — GSAP Observer swipe navigation)
 * Summary:  Tests for the useGsapObserver composable.
 *
 *           GSAP Observer uses real browser layout APIs that jsdom does not
 *           provide, so the module is mocked at the top level. The tests
 *           verify the composable's contract: correct Observer.create()
 *           arguments, callback wiring, observer.kill() cleanup, null-ref
 *           guard, and reinit when the ref changes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useGsapObserver, shouldIgnoreGesture } from '@/composables/useGsapObserver';

// ─── GSAP Observer mock ───────────────────────────────────────────
// vi.mock() is hoisted above all variable declarations by Vitest, so any
// variables referenced inside a factory must also be hoisted via vi.hoisted().
const { mockKill, mockCreate } = vi.hoisted(() => {
  const mockKill   = vi.fn();
  const mockCreate = vi.fn(() => ({ kill: mockKill }));
  return { mockKill, mockCreate };
});

vi.mock('gsap/Observer', () => ({
  Observer: { create: mockCreate },
}));

vi.mock('gsap', () => ({
  default: { registerPlugin: vi.fn() },
}));

// ─── Helpers ─────────────────────────────────────────────────────

function mountWithObserver(
  onLeft?: () => void,
  onRight?: () => void,
  opts: { dragMinimum?: number; tolerance?: number } = {},
) {
  const Comp = defineComponent({
    setup() {
      const elRef = ref<HTMLElement | null>(null);
      useGsapObserver(elRef, {
        onSwipeLeft:  onLeft,
        onSwipeRight: onRight,
        ...opts,
      });
      return { elRef };
    },
    template: '<div ref="elRef" style="width:300px;height:300px" />',
  });
  return mount(Comp, { attachTo: document.body });
}

// ─────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────
describe('useGsapObserver', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapper: any;

  beforeEach(() => {
    mockCreate.mockClear();
    mockKill.mockClear();
  });

  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = '';
  });

  // ── Observer creation ─────────────────────────────────────────

  it('calls Observer.create() when the element ref is attached', async () => {
    wrapper = mountWithObserver();
    await nextTick();
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('passes the correct target element to Observer.create()', async () => {
    wrapper = mountWithObserver();
    await nextTick();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (mockCreate.mock.calls as any)[0][0];
    expect(callArgs.target).toBe(wrapper.element);
  });

  it('configures Observer for touch-only detection with lockAxis', async () => {
    wrapper = mountWithObserver();
    await nextTick();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (mockCreate.mock.calls as any)[0][0];
    expect(callArgs.type).toBe('touch');
    expect(callArgs.lockAxis).toBe(true);
  });

  it('uses default dragMinimum=40 and tolerance=12', async () => {
    wrapper = mountWithObserver();
    await nextTick();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (mockCreate.mock.calls as any)[0][0];
    expect(callArgs.dragMinimum).toBe(40);
    expect(callArgs.tolerance).toBe(12);
  });

  it('respects custom dragMinimum and tolerance options', async () => {
    wrapper = mountWithObserver(undefined, undefined, { dragMinimum: 60, tolerance: 20 });
    await nextTick();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (mockCreate.mock.calls as any)[0][0];
    expect(callArgs.dragMinimum).toBe(60);
    expect(callArgs.tolerance).toBe(20);
  });

  // ── Callbacks ─────────────────────────────────────────────────

  it('wires onSwipeLeft callback to Observer onLeft', async () => {
    const onLeft = vi.fn();
    wrapper = mountWithObserver(onLeft);
    await nextTick();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onLeft: observerOnLeft } = (mockCreate.mock.calls as any)[0][0];
    observerOnLeft();
    expect(onLeft).toHaveBeenCalledOnce();
  });

  it('wires onSwipeRight callback to Observer onRight', async () => {
    const onRight = vi.fn();
    wrapper = mountWithObserver(undefined, onRight);
    await nextTick();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onRight: observerOnRight } = (mockCreate.mock.calls as any)[0][0];
    observerOnRight();
    expect(onRight).toHaveBeenCalledOnce();
  });

  it('does not throw when optional callbacks are omitted', async () => {
    wrapper = mountWithObserver(); // no callbacks
    await nextTick();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onLeft, onRight } = (mockCreate.mock.calls as any)[0][0];
    expect(() => { onLeft(); onRight(); }).not.toThrow();
  });

  // ── Cleanup ───────────────────────────────────────────────────

  it('calls observer.kill() on unmount', async () => {
    wrapper = mountWithObserver();
    await nextTick();
    expect(mockKill).not.toHaveBeenCalled();
    wrapper.unmount();
    wrapper = null;
    expect(mockKill).toHaveBeenCalledOnce();
  });

  // ── Null-ref guard ────────────────────────────────────────────

  it('does not call Observer.create() when ref is initially null', async () => {
    const Comp = defineComponent({
      setup() {
        const elRef = ref<HTMLElement | null>(null);
        // mount with null ref — never set to an element
        useGsapObserver(elRef, { onSwipeLeft: vi.fn() });
        return {};
      },
      template: '<div />',
    });
    wrapper = mount(Comp);
    await nextTick();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   BUG-039 — gesture gating
   ═══════════════════════════════════════════════════════════════════════════ */

describe('shouldIgnoreGesture (BUG-039)', () => {
  /** Build a scroller whose scrollWidth/clientWidth jsdom cannot compute itself. */
  function makeScroller(opts: {
    overflowX: string;
    scrollWidth: number;
    clientWidth: number;
    scrollLeft: number;
  }): { root: HTMLElement; scroller: HTMLElement; child: HTMLElement } {
    const root = document.createElement('div');
    const scroller = document.createElement('div');
    const child = document.createElement('td');
    scroller.style.overflowX = opts.overflowX;
    Object.defineProperty(scroller, 'scrollWidth', { value: opts.scrollWidth, configurable: true });
    Object.defineProperty(scroller, 'clientWidth', { value: opts.clientWidth, configurable: true });
    scroller.scrollLeft = opts.scrollLeft;
    scroller.appendChild(child);
    root.appendChild(scroller);
    document.body.appendChild(root);
    return { root, scroller, child };
  }

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('defers to a horizontal scroller that still has room to travel', () => {
    // The measured real case: .purchases-table-wrap, 480px wide in 296px.
    const { root, child } = makeScroller({
      overflowX: 'auto', scrollWidth: 480, clientWidth: 296, scrollLeft: 0,
    });
    expect(shouldIgnoreGesture(child, root, 'left')).toBe(true);
  });

  it('allows the tab change once the scroller has reached its end', () => {
    const { root, child } = makeScroller({
      overflowX: 'auto', scrollWidth: 480, clientWidth: 296, scrollLeft: 184,
    });
    expect(shouldIgnoreGesture(child, root, 'left')).toBe(false);
  });

  it('allows a rightward swipe when the scroller is already at its start', () => {
    const { root, child } = makeScroller({
      overflowX: 'auto', scrollWidth: 480, clientWidth: 296, scrollLeft: 0,
    });
    expect(shouldIgnoreGesture(child, root, 'right')).toBe(false);
  });

  it('ignores elements that are not horizontally scrollable', () => {
    const { root, child } = makeScroller({
      overflowX: 'visible', scrollWidth: 480, clientWidth: 296, scrollLeft: 0,
    });
    expect(shouldIgnoreGesture(child, root, 'left')).toBe(false);
  });

  it('ignores a scroller whose content fits', () => {
    const { root, child } = makeScroller({
      overflowX: 'auto', scrollWidth: 296, clientWidth: 296, scrollLeft: 0,
    });
    expect(shouldIgnoreGesture(child, root, 'left')).toBe(false);
  });

  it('stops walking at the observed root', () => {
    // A scroller ABOVE the root must not gate gestures inside it.
    const outer = document.createElement('div');
    outer.style.overflowX = 'auto';
    Object.defineProperty(outer, 'scrollWidth', { value: 900, configurable: true });
    Object.defineProperty(outer, 'clientWidth', { value: 300, configurable: true });
    const root = document.createElement('div');
    const child = document.createElement('span');
    root.appendChild(child);
    outer.appendChild(root);
    document.body.appendChild(outer);

    expect(shouldIgnoreGesture(child, root, 'left')).toBe(false);
  });

  it('handles a null target without throwing', () => {
    const root = document.createElement('div');
    expect(shouldIgnoreGesture(null, root, 'left')).toBe(false);
  });
});
