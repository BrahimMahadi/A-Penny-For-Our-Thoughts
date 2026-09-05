/**
 * Module:   tests/composables/useModal.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  September 2026 (BUG-038)
 * Summary:  Guards the modal body scroll lock.
 *
 *           The composable had no coverage at all, which is how BUG-038
 *           survived: the old lock set only `body.style.overflow = 'hidden'`,
 *           which desktop Chrome honours and iOS Safari ignores for touch
 *           scrolling — so the page kept scrolling behind an open modal on a
 *           phone, and nothing in CI noticed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, ref, type Ref } from 'vue';
import { mount } from '@vue/test-utils';

type UseModal = typeof import('@/composables/useModal')['useModal'];

/**
 * The lock's refcount and saved styles are module-level singletons — correct
 * for an app with one document, but they would leak between tests here (a host
 * left mounted keeps the count above zero, and the next lock() then skips
 * applying styles). Re-import a fresh module for every test instead.
 */
let useModal: UseModal;

/** Minimal host so the composable runs inside a real component lifecycle. */
function makeHost(isOpen: Ref<boolean>, onClose = () => {}) {
  return defineComponent({
    setup() {
      useModal(isOpen, onClose);
      return () => null;
    },
  });
}

describe('useModal — body scroll lock (BUG-038)', () => {
  let scrollToSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    document.body.removeAttribute('style');
    scrollToSpy = vi.fn();
    window.scrollTo = scrollToSpy as unknown as typeof window.scrollTo;
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });

    vi.resetModules();
    ({ useModal } = await import('@/composables/useModal'));
  });

  afterEach(() => {
    document.body.removeAttribute('style');
    vi.restoreAllMocks();
  });

  it('pins the body with position:fixed rather than relying on overflow alone', () => {
    // overflow:hidden is kept as belt-and-braces, but position:fixed is what
    // actually holds on iOS — assert the pinning explicitly.
    const isOpen = ref(true);
    mount(makeHost(isOpen));

    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.width).toBe('100%');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('pins at the current scroll offset so the page does not jump to the top', () => {
    Object.defineProperty(window, 'scrollY', { value: 742, writable: true, configurable: true });
    const isOpen = ref(true);
    mount(makeHost(isOpen));

    expect(document.body.style.top).toBe('-742px');
  });

  it('restores the scroll position when the modal closes', async () => {
    Object.defineProperty(window, 'scrollY', { value: 512, writable: true, configurable: true });
    const isOpen = ref(true);
    const w = mount(makeHost(isOpen));

    isOpen.value = false;
    await w.vm.$nextTick();

    expect(document.body.style.position).toBe('');
    expect(document.body.style.top).toBe('');
    expect(scrollToSpy).toHaveBeenCalledWith(0, 512);
  });

  it('restores pre-existing inline body styles verbatim, not to empty', () => {
    document.body.style.overflow = 'scroll';
    document.body.style.paddingRight = '7px';

    const isOpen = ref(true);
    const w = mount(makeHost(isOpen));
    expect(document.body.style.overflow).toBe('hidden');

    isOpen.value = false;
    return w.vm.$nextTick().then(() => {
      expect(document.body.style.overflow).toBe('scroll');
      expect(document.body.style.paddingRight).toBe('7px');
    });
  });

  it('keeps the lock while a second stacked modal is still open', async () => {
    const first = ref(true);
    const second = ref(true);
    const w1 = mount(makeHost(first));
    const w2 = mount(makeHost(second));

    first.value = false;
    await w1.vm.$nextTick();

    // One modal remains open — the page must stay locked.
    expect(document.body.style.position).toBe('fixed');

    second.value = false;
    await w2.vm.$nextTick();
    expect(document.body.style.position).toBe('');
  });

  // The regression the per-instance guard exists for. The watcher is
  // `immediate`, so a CLOSED modal mounting used to call the shared unlock()
  // and decrement a count it never incremented — releasing an open modal's
  // lock and letting the page scroll behind it.
  it('a closed modal mounting does not release an open modal\'s lock', async () => {
    const open = ref(true);
    mount(makeHost(open));
    expect(document.body.style.position).toBe('fixed');

    const closed = ref(false);
    mount(makeHost(closed));

    expect(document.body.style.position).toBe('fixed');
  });

  it('releases the lock when an open modal is unmounted', () => {
    const isOpen = ref(true);
    const w = mount(makeHost(isOpen));
    expect(document.body.style.position).toBe('fixed');

    w.unmount();
    expect(document.body.style.position).toBe('');
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const isOpen = ref(true);
    mount(makeHost(isOpen, onClose));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape once closed', async () => {
    const onClose = vi.fn();
    const isOpen = ref(true);
    const w = mount(makeHost(isOpen, onClose));

    isOpen.value = false;
    await w.vm.$nextTick();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
