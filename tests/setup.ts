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
import { tickClock } from '@/lib/clock';

// ─── Reactive day-clock sync (BUG-035) ────────────────────────────────────────
// lib/clock.ts holds a reactive `currentDay` that date-scoped getters/computeds
// read so they self-heal across a pay-period / month boundary. In production it
// ticks on visibilitychange / focus / interval. Tests fake the date with
// `vi.setSystemTime(...)`, so we patch that call to also tick the app clock —
// every test that sets a system time then transparently has the app clock
// observe it, exactly as the browser would. No per-test wiring needed.
const _setSystemTime = vi.setSystemTime.bind(vi);
vi.setSystemTime = ((time?: number | Date | string) => {
  const result = _setSystemTime(time as Date);
  tickClock();
  return result;
}) as typeof vi.setSystemTime;

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

// ─── GSAP ScrollTrigger mock ──────────────────────────────────────────────────
// ScrollTrigger.create() uses real scroll/layout APIs that jsdom does not provide.
// Stub it globally so tests that render pages with scroll animations (DashboardPage,
// SpendingPage) don't generate unhandled rejections.
vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    create:  vi.fn(() => ({ kill: vi.fn() })),
    refresh: vi.fn(),
    getAll:  vi.fn(() => []),
    kill:    vi.fn(),
  },
}));

// ─── ResizeObserver stub ──────────────────────────────────────────────────────
// jsdom does not implement ResizeObserver. Provide a no-op global stub so
// useScrollReveal's BUG-034 observer doesn't throw in any test that renders
// components using the composable. useScrollReveal.spec.ts overrides this
// with a detailed mock in its own beforeEach to test wiring behaviour.
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = vi.fn(() => ({
    observe:    vi.fn(),
    disconnect: vi.fn(),
    unobserve:  vi.fn(),
  })) as unknown as typeof ResizeObserver;
}
