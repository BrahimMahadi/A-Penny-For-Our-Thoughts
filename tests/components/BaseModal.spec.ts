import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseModal from '@/components/ui/BaseModal.vue';
import { nextTick } from 'vue';

describe('BaseModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  it('renders nothing when closed', () => {
    const wrapper = mount(BaseModal, {
      props: { open: false, title: 'Test' },
      attachTo: document.body,
    });
    expect(document.body.querySelector('.base-modal')).toBeNull();
    wrapper.unmount();
  });

  it('renders into body via Teleport when open', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'Test modal' },
      attachTo: document.body,
    });
    await nextTick();
    const modal = document.body.querySelector('.base-modal');
    expect(modal).not.toBeNull();
    expect(document.body.querySelector('.base-modal__title')?.textContent).toBe('Test modal');
    wrapper.unmount();
  });

  it('locks body scroll when open', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'Locked' },
      attachTo: document.body,
    });
    await nextTick();
    expect(document.body.style.overflow).toBe('hidden');
    wrapper.unmount();
  });

  it('emits close + update:open=false when ESC pressed', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'ESC me' },
      attachTo: document.body,
    });
    await nextTick();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
    wrapper.unmount();
  });

  it('renders default slot content', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'Slot' },
      slots: { default: '<p class="custom">Hello body</p>' },
      attachTo: document.body,
    });
    await nextTick();
    expect(document.body.querySelector('.custom')?.textContent).toBe('Hello body');
    wrapper.unmount();
  });

  it('renders footer slot when provided', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'Footer' },
      slots: { footer: '<button class="footer-btn">Save</button>' },
      attachTo: document.body,
    });
    await nextTick();
    expect(document.body.querySelector('.footer-btn')).not.toBeNull();
    wrapper.unmount();
  });

  it('close button emits close', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'Closable' },
      attachTo: document.body,
    });
    await nextTick();
    const closeBtn = document.body.querySelector<HTMLButtonElement>('.base-modal__close');
    closeBtn?.click();
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
    wrapper.unmount();
  });

  it('hides close button when closable=false', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'No close', closable: false },
      attachTo: document.body,
    });
    await nextTick();
    expect(document.body.querySelector('.base-modal__close')).toBeNull();
    wrapper.unmount();
  });

  it('size prop applies base-modal--lg class', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'Big', size: 'lg' },
      attachTo: document.body,
    });
    await nextTick();
    expect(document.body.querySelector('.base-modal--lg')).not.toBeNull();
    wrapper.unmount();
  });
});
