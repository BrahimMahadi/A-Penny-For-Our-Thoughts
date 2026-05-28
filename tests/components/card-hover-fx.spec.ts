/**
 * Module:   tests/components/card-hover-fx.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint RS-21 — Card Hover Effects)
 * Summary:  Unit tests for CardHoverFX.vue.
 *           The component is a fragment (two root elements: .chfx-shine and
 *           .chfx-bg), so all DOM assertions use document.body.querySelector
 *           via attachTo:document.body rather than wrapper.find().
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import CardHoverFX from '@/components/ui/CardHoverFX.vue';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wrapper: any;

function mountFx(props: Record<string, unknown> = {}) {
  wrapper = mount(CardHoverFX, { attachTo: document.body, props });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Structure
// ─────────────────────────────────────────────────────────────────────────────
describe('CardHoverFX — structure', () => {
  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = '';
  });

  it('renders the shine layer (.chfx-shine)', async () => {
    mountFx();
    await nextTick();
    expect(document.body.querySelector('.chfx-shine')).not.toBeNull();
  });

  it('renders the background layer (.chfx-bg)', async () => {
    mountFx();
    await nextTick();
    expect(document.body.querySelector('.chfx-bg')).not.toBeNull();
  });

  it('marks .chfx-shine as aria-hidden', async () => {
    mountFx();
    await nextTick();
    expect(document.body.querySelector('.chfx-shine')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('marks .chfx-bg as aria-hidden', async () => {
    mountFx();
    await nextTick();
    expect(document.body.querySelector('.chfx-bg')?.getAttribute('aria-hidden')).toBe('true');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Tiles prop
// ─────────────────────────────────────────────────────────────────────────────
describe('CardHoverFX — tiles prop', () => {
  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = '';
  });

  it('renders 10 tile divs when tiles=true (default)', async () => {
    mountFx();
    await nextTick();
    expect(document.body.querySelectorAll('.chfx-tile')).toHaveLength(10);
  });

  it('renders tiles container when tiles=true', async () => {
    mountFx();
    await nextTick();
    expect(document.body.querySelector('.chfx-tiles')).not.toBeNull();
  });

  it('renders all 10 individual tile classes (.chfx-tile--1 … --10)', async () => {
    mountFx();
    await nextTick();
    for (let i = 1; i <= 10; i++) {
      expect(
        document.body.querySelector(`.chfx-tile--${i}`),
        `expected .chfx-tile--${i} to be in the DOM`,
      ).not.toBeNull();
    }
  });

  it('omits tile divs when tiles=false', async () => {
    mountFx({ tiles: false });
    await nextTick();
    expect(document.body.querySelectorAll('.chfx-tile')).toHaveLength(0);
  });

  it('omits .chfx-tiles container when tiles=false', async () => {
    mountFx({ tiles: false });
    await nextTick();
    expect(document.body.querySelector('.chfx-tiles')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Lines (always rendered, independent of tiles prop)
// ─────────────────────────────────────────────────────────────────────────────
describe('CardHoverFX — lines', () => {
  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = '';
  });

  it('always renders 3 line divs when tiles=true', async () => {
    mountFx();
    await nextTick();
    expect(document.body.querySelectorAll('.chfx-line')).toHaveLength(3);
  });

  it('always renders 3 line divs when tiles=false', async () => {
    mountFx({ tiles: false });
    await nextTick();
    expect(document.body.querySelectorAll('.chfx-line')).toHaveLength(3);
  });

  it('renders all 3 numbered line classes (.chfx-line--1 … --3)', async () => {
    mountFx();
    await nextTick();
    for (let i = 1; i <= 3; i++) {
      expect(
        document.body.querySelector(`.chfx-line--${i}`),
        `expected .chfx-line--${i} to be in the DOM`,
      ).not.toBeNull();
    }
  });
});
