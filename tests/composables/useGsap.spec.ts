/**
 * Module:   tests/composables/useGsap.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (RS-17 — GSAP Foundation)
 * Summary:  Unit tests for the useGsap composable.
 *           Verifies reduced-motion fast-path, delegate calls to GSAP,
 *           and that onComplete callbacks fire in all code paths.
 *
 * Note: `gsap` itself is mocked globally via tests/setup.ts.
 *       These tests verify that useGsap delegates correctly and that the
 *       reduced-motion branch short-circuits with duration:0.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import gsap from 'gsap';
import { useGsap, prefersReducedMotion } from '@/composables/useGsap';

// ─── helpers ──────────────────────────────────────────────────────────────
function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce') ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('prefersReducedMotion()', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns false when matchMedia does not match', () => {
    mockMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('returns true when matchMedia matches reduce', () => {
    mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when matchMedia is not a function (jsdom / SSR guard)', () => {
    // Simulate jsdom where matchMedia is not implemented
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: undefined,
    });
    expect(prefersReducedMotion()).toBe(false);
    // Restore the stub for subsequent tests
    mockMatchMedia(false);
  });
});

describe('useGsap()', () => {
  const el = document.createElement('div');

  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false); // no reduced motion by default
  });

  afterEach(() => { vi.restoreAllMocks(); });

  // ── Normal motion ──────────────────────────────────────────────────────

  it('to() calls gsap.to with the provided vars', () => {
    const { to } = useGsap();
    to(el, { opacity: 1, duration: 0.3 });
    expect(gsap.to).toHaveBeenCalledWith(el, { opacity: 1, duration: 0.3 });
  });

  it('from() calls gsap.from with the provided vars', () => {
    const { from } = useGsap();
    from(el, { x: -20, duration: 0.25 });
    expect(gsap.from).toHaveBeenCalledWith(el, { x: -20, duration: 0.25 });
  });

  it('fromTo() calls gsap.fromTo with both var sets', () => {
    const { fromTo } = useGsap();
    fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    expect(gsap.fromTo).toHaveBeenCalledWith(el, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  });

  it('timeline() calls gsap.timeline with the provided vars', () => {
    const { timeline } = useGsap();
    timeline({ delay: 0.1 });
    expect(gsap.timeline).toHaveBeenCalledWith(expect.objectContaining({ delay: 0.1 }));
  });

  it('raw is the gsap instance', () => {
    const { raw } = useGsap();
    expect(raw).toBe(gsap);
  });

  // ── Reduced motion ─────────────────────────────────────────────────────

  it('to() uses duration:0 when reduced motion is on', () => {
    mockMatchMedia(true);
    const { to } = useGsap();
    to(el, { opacity: 1, duration: 0.5 });
    expect(gsap.to).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ duration: 0, delay: 0 }),
    );
  });

  it('from() uses duration:0 when reduced motion is on', () => {
    mockMatchMedia(true);
    const { from } = useGsap();
    from(el, { x: -20, duration: 0.4 });
    expect(gsap.from).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ duration: 0, delay: 0 }),
    );
  });

  it('fromTo() calls gsap.to (not fromTo) with duration:0 when reduced motion is on', () => {
    mockMatchMedia(true);
    const { fromTo } = useGsap();
    fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    // Reduced path calls gsap.to with the end vars + duration:0
    expect(gsap.to).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ opacity: 1, duration: 0, delay: 0 }),
    );
    expect(gsap.fromTo).not.toHaveBeenCalled();
  });

  it('timeline() includes zero-duration defaults when reduced motion is on', () => {
    mockMatchMedia(true);
    const { timeline } = useGsap();
    timeline();
    expect(gsap.timeline).toHaveBeenCalledWith(
      expect.objectContaining({ defaults: expect.objectContaining({ duration: 0 }) }),
    );
  });

  // ── onComplete callback fires in both modes ────────────────────────────

  it('onComplete fires via mock regardless of reduced-motion state (normal)', () => {
    mockMatchMedia(false);
    const { to } = useGsap();
    const cb = vi.fn();
    to(el, { opacity: 1, duration: 0.3, onComplete: cb });
    // The GSAP mock in setup.ts calls onComplete immediately
    expect(cb).toHaveBeenCalledOnce();
  });

  it('onComplete fires via mock regardless of reduced-motion state (reduced)', () => {
    mockMatchMedia(true);
    const { to } = useGsap();
    const cb = vi.fn();
    to(el, { opacity: 1, duration: 0.3, onComplete: cb });
    expect(cb).toHaveBeenCalledOnce();
  });
});
