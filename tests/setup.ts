/**
 * Module:   tests/setup.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (RS-17 — GSAP Foundation)
 * Summary:  Global Vitest setup file.
 *           Mocks GSAP so jsdom tests are unaffected by animation timelines.
 *           The mock calls every onComplete callback immediately, which ensures
 *           Vue <Transition> `done()` callbacks fire synchronously so tests
 *           can assert on final DOM state after a single `await nextTick()`.
 */

import { vi } from 'vitest';

// ─── window.matchMedia stub ───────────────────────────────────────────────────
// jsdom does not implement matchMedia. Provide a global stub that always returns
// matches=false (no reduced motion) so useGsap() can call it without crashing.
// Individual tests that need to override this can call vi.spyOn(window, 'matchMedia').
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ─── GSAP mock ────────────────────────────────────────────────────────────────
// GSAP uses requestAnimationFrame internally and has no real effect in jsdom.
// We replace it with a synchronous stub that:
//   1. Calls onComplete immediately so Transition `done()` hooks fire.
//   2. Does not try to set any CSS properties (avoids jsdom compute errors).
//   3. Returns a fake tween with a `kill()` method so callers don't crash.

function callOnComplete(vars?: Record<string, unknown>): void {
  if (typeof vars?.onComplete === 'function') {
    (vars.onComplete as () => void)();
  }
}

const fakeTween = () => ({ kill: vi.fn(), pause: vi.fn(), play: vi.fn() });

const fakeTimeline = (vars?: Record<string, unknown>) => {
  const tl: Record<string, unknown> = {};
  tl['to']     = vi.fn((_t: unknown, v?: Record<string, unknown>) => { callOnComplete(v); return tl; });
  tl['from']   = vi.fn((_t: unknown, v?: Record<string, unknown>) => { callOnComplete(v); return tl; });
  tl['fromTo'] = vi.fn((_t: unknown, _f: unknown, v?: Record<string, unknown>) => { callOnComplete(v); return tl; });
  tl['set']    = vi.fn().mockReturnValue(tl);
  tl['add']    = vi.fn().mockReturnValue(tl);
  tl['kill']   = vi.fn();
  tl['pause']  = vi.fn();
  tl['play']   = vi.fn();
  // Call the timeline-level onComplete immediately too
  callOnComplete(vars as Record<string, unknown> | undefined);
  return tl;
};

vi.mock('gsap', () => ({
  default: {
    to:             vi.fn((_t: unknown, vars?: Record<string, unknown>) => { callOnComplete(vars); return fakeTween(); }),
    from:           vi.fn((_t: unknown, vars?: Record<string, unknown>) => { callOnComplete(vars); return fakeTween(); }),
    fromTo:         vi.fn((_t: unknown, _f: unknown, vars?: Record<string, unknown>) => { callOnComplete(vars); return fakeTween(); }),
    set:            vi.fn(),
    killTweensOf:   vi.fn(),
    timeline:       vi.fn((vars?: Record<string, unknown>) => fakeTimeline(vars)),
    registerPlugin: vi.fn(),
    utils: {
      toArray: vi.fn((v: unknown) => (Array.isArray(v) ? v : [v])),
    },
  },
}));

// ─── GSAP Flip mock ───────────────────────────────────────────────────────────
// Flip.getState() / Flip.from() require real browser layout APIs (getBoundingClientRect,
// computed styles) which jsdom does not implement. Stub the entire Flip module so
// tests are not affected by animation-layer code in components.
vi.mock('gsap/Flip', () => ({
  Flip: {
    getState: vi.fn(() => ({})),
    from:     vi.fn((_state: unknown, vars?: Record<string, unknown>) => {
      callOnComplete(vars);
      return fakeTween();
    }),
  },
}));
