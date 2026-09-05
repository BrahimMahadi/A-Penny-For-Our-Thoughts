/**
 * Module:   tests/directives/vPress.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  September 2026 (MOBILE-5)
 * Summary:  Guards the v-press tactile-feedback directive.
 *
 *           tests/setup.ts mocks GSAP globally, so these assert the CONTRACT
 *           (which calls are made, with which values, and that listeners are
 *           cleaned up) rather than measured pixel transforms — jsdom does not
 *           run real animations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import gsap from 'gsap';
import {
  vPress,
  PRESS_SCALE,
  PRESS_DURATION,
  RELEASE_DURATION,
  RELEASE_EASE,
  REDUCED_MOTION_OPACITY,
} from '@/directives/vPress';

const Host = {
  template: `<button v-press ref="btn">tap</button>`,
};

function mountHost() {
  return mount(Host, { global: { directives: { press: vPress } } });
}

/** jsdom has no PointerEvent; Event carries everything these handlers use. */
function fire(el: Element, type: string): void {
  el.dispatchEvent(new Event(type));
}

describe('v-press directive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scales down on pointerdown with the agreed press values', () => {
    const spy = vi.spyOn(gsap, 'to');
    const w = mountHost();

    fire(w.element, 'pointerdown');

    expect(spy).toHaveBeenCalledTimes(1);
    const [, vars] = spy.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(vars.scale).toBe(PRESS_SCALE);
    expect(vars.duration).toBe(PRESS_DURATION);
    // overwrite prevents a fast press/release/press leaving competing tweens
    expect(vars.overwrite).toBe(true);
  });

  it('springs back to scale 1 on pointerup with the chosen release ease', () => {
    const spy = vi.spyOn(gsap, 'to');
    const w = mountHost();

    fire(w.element, 'pointerdown');
    fire(w.element, 'pointerup');

    expect(spy).toHaveBeenCalledTimes(2);
    const [, vars] = spy.mock.calls[1] as [unknown, Record<string, unknown>];
    expect(vars.scale).toBe(1);
    expect(vars.duration).toBe(RELEASE_DURATION);
    expect(vars.ease).toBe(RELEASE_EASE);
  });

  // A finger dragged off a pressed control fires pointerleave, not pointerup.
  // Without these the element stays stranded at 0.96 forever.
  it.each(['pointerleave', 'pointercancel'])('releases on %s', (evt) => {
    const spy = vi.spyOn(gsap, 'to');
    const w = mountHost();

    fire(w.element, 'pointerdown');
    fire(w.element, evt);

    expect(spy).toHaveBeenCalledTimes(2);
    const [, vars] = spy.mock.calls[1] as [unknown, Record<string, unknown>];
    expect(vars.scale).toBe(1);
  });

  it('uses opacity instead of a transform under prefers-reduced-motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (q: string) => ({ matches: true, media: q } as MediaQueryList),
    );
    const spy = vi.spyOn(gsap, 'to');
    const w = mountHost();
    const el = w.element as HTMLElement;

    fire(el, 'pointerdown');
    expect(el.style.opacity).toBe(REDUCED_MOTION_OPACITY);
    expect(spy).not.toHaveBeenCalled();

    fire(el, 'pointerup');
    expect(el.style.opacity).toBe('');
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not bind when the binding value is false', () => {
    const spy = vi.spyOn(gsap, 'to');
    const Disabled = { template: `<button v-press="false">tap</button>` };
    const w = mount(Disabled, { global: { directives: { press: vPress } } });

    fire(w.element, 'pointerdown');
    expect(spy).not.toHaveBeenCalled();
  });

  it('removes its listeners and kills tweens on unmount', () => {
    const w = mountHost();
    const el = w.element as HTMLElement;
    const removeSpy = vi.spyOn(el, 'removeEventListener');
    const killSpy = vi.spyOn(gsap, 'killTweensOf');

    w.unmount();

    const removed = removeSpy.mock.calls.map(([type]) => type);
    expect(removed).toEqual(
      expect.arrayContaining(['pointerdown', 'pointerup', 'pointerleave', 'pointercancel']),
    );
    expect(killSpy).toHaveBeenCalledWith(el);
  });

  it('is inert after unmount — a stray pointer event animates nothing', () => {
    const w = mountHost();
    const el = w.element as HTMLElement;
    w.unmount();

    const spy = vi.spyOn(gsap, 'to');
    fire(el, 'pointerdown');
    expect(spy).not.toHaveBeenCalled();
  });
});
