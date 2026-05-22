import { describe, it, expect, vi, afterEach } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useKeyboard } from '@/composables/useKeyboard';

function makeComponent(combo: string, handler: () => void, opts = {}) {
  return defineComponent({
    setup() {
      useKeyboard(combo, handler, opts);
      return () => h('div');
    },
  });
}

describe('useKeyboard', () => {
  afterEach(() => {
    // Each test mounts/unmounts its own component, so listeners clean up automatically.
  });

  it('fires the handler on the bound key', () => {
    const spy = vi.fn();
    const wrapper = mount(makeComponent('Escape', spy));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(spy).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('ignores other keys', () => {
    const spy = vi.fn();
    const wrapper = mount(makeComponent('Escape', spy));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(spy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('supports cmd+k combos', () => {
    const spy = vi.fn();
    const wrapper = mount(makeComponent('cmd+k', spy));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    expect(spy).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('does not fire cmd+k without meta', () => {
    const spy = vi.fn();
    const wrapper = mount(makeComponent('cmd+k', spy));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
    expect(spy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('guardFromInputs ignores keypresses originating in <input>', () => {
    const spy = vi.fn();
    const wrapper = mount(makeComponent('Escape', spy, { guardFromInputs: true }));
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
    document.body.removeChild(input);
    wrapper.unmount();
  });

  it('removes listener on unmount', async () => {
    const spy = vi.fn();
    const wrapper = mount(makeComponent('Escape', spy));
    wrapper.unmount();
    await nextTick();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(spy).not.toHaveBeenCalled();
  });
});
