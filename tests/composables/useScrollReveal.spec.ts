/**
 * Module:   tests/composables/useScrollReveal.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (v2.44.0 — GSAP ScrollTrigger scroll animations)
 * Updated:  June 2026 (v2.44.3 — BUG-034: ResizeObserver + onRefresh self-heal)
 * Summary:  Tests for the useScrollReveal composable.
 *
 *           GSAP ScrollTrigger requires real layout APIs (scroll position,
 *           getBoundingClientRect) that jsdom does not provide, so the entire
 *           GSAP + ScrollTrigger surface is mocked at the module level.
 *           Tests verify the composable's contract:
 *             - ScrollTrigger.create() is called with correct arguments
 *             - gsap.set() is called with the correct hidden initial state
 *             - Callbacks (onEnter, onLeave, onEnterBack, onLeaveBack) fire
 *               the right gsap.to() calls with correct parameters
 *             - onRefresh self-heals element state after positions recalculate
 *             - fadeOut:false skips the leave callbacks
 *             - prefersReducedMotion guard skips all animations
 *             - ResizeObserver watches document.body and debounces refresh calls
 *             - killAll() / onBeforeUnmount kill every trigger and disconnect
 *               the ResizeObserver
 *             - null / empty guard: no crash on missing elements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useScrollReveal } from '@/composables/useScrollReveal';

// ─── GSAP mocks ───────────────────────────────────────────────────
// vi.mock() factories are hoisted above variable declarations, so any
// referenced variables must also be hoisted via vi.hoisted().
const {
  mockStKill,
  mockStCreate,
  mockGsapSet,
  mockGsapTo,
  mockGsapFromTo,
  mockStRefresh,
  mockRegisterPlugin,
} = vi.hoisted(() => {
  const mockStKill    = vi.fn();
  const mockStCreate  = vi.fn(() => ({ kill: mockStKill }));
  const mockStRefresh = vi.fn();
  const mockGsapSet   = vi.fn();
  const mockGsapTo    = vi.fn();
  const mockGsapFromTo = vi.fn();
  const mockRegisterPlugin = vi.fn();
  return {
    mockStKill, mockStCreate, mockStRefresh,
    mockGsapSet, mockGsapTo, mockGsapFromTo, mockRegisterPlugin,
  };
});

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    create:  mockStCreate,
    refresh: mockStRefresh,
  },
}));

vi.mock('gsap', () => ({
  default: {
    registerPlugin: mockRegisterPlugin,
    set:   mockGsapSet,
    to:    mockGsapTo,
    fromTo: mockGsapFromTo,
  },
}));

// Also mock prefersReducedMotion so we can toggle it per-test
const { mockPrefersReducedMotion } = vi.hoisted(() => {
  const mockPrefersReducedMotion = vi.fn(() => false);
  return { mockPrefersReducedMotion };
});

vi.mock('@/composables/useGsap', () => ({
  prefersReducedMotion: mockPrefersReducedMotion,
}));

// ─── Helper ───────────────────────────────────────────────────────

function makeEl(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function mountWithReveal(
  setup: (el: HTMLElement, el2: HTMLElement) => void,
) {
  const el  = makeEl();
  const el2 = makeEl();

  const Comp = defineComponent({
    setup() {
      const elRef = ref<HTMLElement | null>(null);
      setup(el, el2);
      return { elRef };
    },
    template: '<div ref="elRef" />',
  });

  return { wrapper: mount(Comp, { attachTo: document.body }), el, el2 };
}

// ─── Tests ────────────────────────────────────────────────────────
describe('useScrollReveal', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapper: any;

  // ResizeObserver mock — freshly created each test so capturedROCallback
  // is scoped to the test that sets up the composable.
  let capturedROCallback: ResizeObserverCallback | null;
  let mockROObserve: ReturnType<typeof vi.fn>;
  let mockRODisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockStCreate.mockClear();
    mockStKill.mockClear();
    mockStRefresh.mockClear();
    mockGsapSet.mockClear();
    mockGsapTo.mockClear();
    mockGsapFromTo.mockClear();
    mockPrefersReducedMotion.mockReturnValue(false);

    capturedROCallback = null;
    mockROObserve    = vi.fn();
    mockRODisconnect = vi.fn();

    // Override the global stub from setup.ts with a spy that captures
    // the ResizeObserver callback so individual tests can trigger it.
    global.ResizeObserver = vi.fn((cb: ResizeObserverCallback) => {
      capturedROCallback = cb;
      return { observe: mockROObserve, disconnect: mockRODisconnect, unobserve: vi.fn() };
    }) as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  // ── revealImmediate ─────────────────────────────────────────────

  it('revealImmediate calls gsap.fromTo with correct defaults', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealImmediate } = useScrollReveal();
        revealImmediate([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    expect(mockGsapFromTo).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [targets, fromVars, toVars] = (mockGsapFromTo.mock.calls as any)[0];
    expect(targets).toEqual([el]);
    expect(fromVars.opacity).toBe(0);
    expect(fromVars.y).toBe(24);          // default offsetY
    expect(toVars.opacity).toBe(1);
    expect(toVars.y).toBe(0);
    expect(toVars.ease).toBe('back.out');  // default ease
    expect(toVars.duration).toBe(0.5);    // default duration
    expect(toVars.stagger).toBe(0.08);    // default stagger
  });

  it('revealImmediate applies offsetYFactor to starting y', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealImmediate } = useScrollReveal();
        revealImmediate([el], 0, 0.6);  // hero variant
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, fromVars] = (mockGsapFromTo.mock.calls as any)[0];
    expect(fromVars.y).toBeCloseTo(24 * 0.6);
  });

  it('revealImmediate respects delay parameter', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealImmediate } = useScrollReveal();
        revealImmediate([el], 0.15);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, , toVars] = (mockGsapFromTo.mock.calls as any)[0];
    expect(toVars.delay).toBe(0.15);
  });

  it('revealImmediate does nothing when prefersReducedMotion is true', () => {
    mockPrefersReducedMotion.mockReturnValue(true);
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealImmediate } = useScrollReveal();
        revealImmediate([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    expect(mockGsapFromTo).not.toHaveBeenCalled();
  });

  it('revealImmediate does nothing for empty targets array', () => {
    const Comp = defineComponent({
      setup() {
        const { revealImmediate } = useScrollReveal();
        revealImmediate([]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    expect(mockGsapFromTo).not.toHaveBeenCalled();
  });

  // ── revealOnScrollY ─────────────────────────────────────────────

  it('revealOnScrollY calls gsap.set with opacity:0 and y:offsetY', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal();
        revealOnScrollY([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    expect(mockGsapSet).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [targets, vars] = (mockGsapSet.mock.calls as any)[0];
    expect(targets).toEqual([el]);
    expect(vars.opacity).toBe(0);
    expect(vars.y).toBe(24);
  });

  it('revealOnScrollY creates a ScrollTrigger with start:top 88%', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal();
        revealOnScrollY([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    expect(mockStCreate).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stOpts = (mockStCreate.mock.calls as any)[0][0];
    expect(stOpts.trigger).toBe(el);
    expect(stOpts.start).toBe('top 88%');
    expect(stOpts.end).toBe('bottom 12%');
  });

  it('revealOnScrollY onEnter animates to opacity:1, y:0', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal();
        revealOnScrollY([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onEnter } = (mockStCreate.mock.calls as any)[0][0];
    onEnter();

    expect(mockGsapTo).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, vars] = (mockGsapTo.mock.calls as any)[0];
    expect(vars.opacity).toBe(1);
    expect(vars.y).toBe(0);
    expect(vars.ease).toBe('back.out');
  });

  it('revealOnScrollY onLeave fades out upward when fadeOut:true (default)', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal();
        revealOnScrollY([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onLeave } = (mockStCreate.mock.calls as any)[0][0];
    onLeave();

    expect(mockGsapTo).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, vars] = (mockGsapTo.mock.calls as any)[0];
    expect(vars.opacity).toBe(0);
    expect(vars.y).toBeLessThan(0); // exits upward (negative y)
    expect(vars.ease).toBe('power2.in');
  });

  it('revealOnScrollY onLeave does nothing when fadeOut:false', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal({ fadeOut: false });
        revealOnScrollY([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    mockGsapTo.mockClear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onLeave } = (mockStCreate.mock.calls as any)[0][0];
    onLeave();

    expect(mockGsapTo).not.toHaveBeenCalled();
  });

  it('revealOnScrollY onLeaveBack fades out downward', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal();
        revealOnScrollY([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onLeaveBack } = (mockStCreate.mock.calls as any)[0][0];
    onLeaveBack();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, vars] = (mockGsapTo.mock.calls as any)[0];
    expect(vars.opacity).toBe(0);
    expect(vars.y).toBeGreaterThan(0); // exits downward (positive y)
  });

  it('revealOnScrollY uses custom triggerEl when provided', () => {
    const target  = makeEl();
    const trigger = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal();
        revealOnScrollY([target], trigger);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stOpts = (mockStCreate.mock.calls as any)[0][0];
    expect(stOpts.trigger).toBe(trigger);
  });

  it('revealOnScrollY does nothing when prefersReducedMotion is true', () => {
    mockPrefersReducedMotion.mockReturnValue(true);
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal();
        revealOnScrollY([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    expect(mockStCreate).not.toHaveBeenCalled();
    expect(mockGsapSet).not.toHaveBeenCalled();
  });

  // ── revealOnScrollY onRefresh self-heal (BUG-034) ───────────────

  it('revealOnScrollY onRefresh snaps targets to visible when trigger is active', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal();
        revealOnScrollY([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onRefresh } = (mockStCreate.mock.calls as any)[0][0];
    mockGsapSet.mockClear(); // clear the initial gsap.set from revealOnScrollY
    onRefresh({ isActive: true, progress: 0.5 });

    expect(mockGsapSet).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [targets, vars] = (mockGsapSet.mock.calls as any)[0];
    expect(targets).toEqual([el]);
    expect(vars.opacity).toBe(1);
    expect(vars.y).toBe(0);
  });

  it('revealOnScrollY onRefresh snaps to faded-out when scrolled past (progress≥1, fadeOut:true)', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal();
        revealOnScrollY([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onRefresh } = (mockStCreate.mock.calls as any)[0][0];
    mockGsapSet.mockClear();
    onRefresh({ isActive: false, progress: 1 });

    expect(mockGsapSet).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, vars] = (mockGsapSet.mock.calls as any)[0];
    expect(vars.opacity).toBe(0);
    expect(vars.y).toBeLessThan(0); // matches onLeave exit state (negative y)
  });

  it('revealOnScrollY onRefresh does nothing when below viewport (progress=0)', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal();
        revealOnScrollY([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onRefresh } = (mockStCreate.mock.calls as any)[0][0];
    mockGsapSet.mockClear();
    onRefresh({ isActive: false, progress: 0 });

    // No set call — element stays in its initial hidden state (opacity:0, y:offsetY)
    expect(mockGsapSet).not.toHaveBeenCalled();
  });

  // ── revealOnScrollX ─────────────────────────────────────────────

  it('revealOnScrollX calls gsap.set with opacity:0 and x:offsetX', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollX } = useScrollReveal();
        revealOnScrollX(el);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    expect(mockGsapSet).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [target, vars] = (mockGsapSet.mock.calls as any)[0];
    expect(target).toBe(el);
    expect(vars.opacity).toBe(0);
    expect(vars.x).toBe(48); // default offsetX
  });

  it('revealOnScrollX onEnter animates to opacity:1, x:0', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollX } = useScrollReveal();
        revealOnScrollX(el);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onEnter } = (mockStCreate.mock.calls as any)[0][0];
    onEnter();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, vars] = (mockGsapTo.mock.calls as any)[0];
    expect(vars.opacity).toBe(1);
    expect(vars.x).toBe(0);
  });

  it('revealOnScrollX onLeave fades out to the left', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollX } = useScrollReveal();
        revealOnScrollX(el);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onLeave } = (mockStCreate.mock.calls as any)[0][0];
    onLeave();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, vars] = (mockGsapTo.mock.calls as any)[0];
    expect(vars.opacity).toBe(0);
    expect(vars.x).toBeLessThan(0); // exits left (negative x)
  });

  it('revealOnScrollX onLeaveBack fades out to the right', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollX } = useScrollReveal();
        revealOnScrollX(el);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onLeaveBack } = (mockStCreate.mock.calls as any)[0][0];
    onLeaveBack();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, vars] = (mockGsapTo.mock.calls as any)[0];
    expect(vars.opacity).toBe(0);
    expect(vars.x).toBeGreaterThan(0); // exits right (positive x)
  });

  it('revealOnScrollX does nothing when prefersReducedMotion is true', () => {
    mockPrefersReducedMotion.mockReturnValue(true);
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollX } = useScrollReveal();
        revealOnScrollX(el);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    expect(mockStCreate).not.toHaveBeenCalled();
  });

  // ── revealOnScrollX onRefresh self-heal (BUG-034) ───────────────

  it('revealOnScrollX onRefresh snaps target to visible when trigger is active', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollX } = useScrollReveal();
        revealOnScrollX(el);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onRefresh } = (mockStCreate.mock.calls as any)[0][0];
    mockGsapSet.mockClear();
    onRefresh({ isActive: true, progress: 0.5 });

    expect(mockGsapSet).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [target, vars] = (mockGsapSet.mock.calls as any)[0];
    expect(target).toBe(el);
    expect(vars.opacity).toBe(1);
    expect(vars.x).toBe(0);
  });

  it('revealOnScrollX onRefresh snaps to faded-out when scrolled past (progress≥1, fadeOut:true)', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollX } = useScrollReveal();
        revealOnScrollX(el);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onRefresh } = (mockStCreate.mock.calls as any)[0][0];
    mockGsapSet.mockClear();
    onRefresh({ isActive: false, progress: 1 });

    expect(mockGsapSet).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, vars] = (mockGsapSet.mock.calls as any)[0];
    expect(vars.opacity).toBe(0);
    expect(vars.x).toBeLessThan(0); // matches onLeave exit state (negative x)
  });

  // ── Custom config ───────────────────────────────────────────────

  it('uses custom offsetY from config', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal({ offsetY: 40 });
        revealOnScrollY([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, vars] = (mockGsapSet.mock.calls as any)[0];
    expect(vars.y).toBe(40);
  });

  it('uses custom ease from config', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal({ ease: 'power3.out' });
        revealOnScrollY([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { onEnter } = (mockStCreate.mock.calls as any)[0][0];
    onEnter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, vars] = (mockGsapTo.mock.calls as any)[0];
    expect(vars.ease).toBe('power3.out');
  });

  // ── ResizeObserver wiring (BUG-034) ────────────────────────────

  it('creates a ResizeObserver that observes document.body', () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        useScrollReveal();
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    expect(global.ResizeObserver).toHaveBeenCalledOnce();
    expect(mockROObserve).toHaveBeenCalledWith(document.body);
  });

  it('skips ResizeObserver when prefersReducedMotion is true', () => {
    mockPrefersReducedMotion.mockReturnValue(true);
    const Comp = defineComponent({
      setup() {
        useScrollReveal();
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    expect(global.ResizeObserver).not.toHaveBeenCalled();
  });

  it('debounces multiple resize events into a single ScrollTrigger.refresh()', () => {
    vi.useFakeTimers();
    const Comp = defineComponent({
      setup() {
        useScrollReveal();
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    // Fire 3 resize events in rapid succession
    capturedROCallback!([], {} as ResizeObserver);
    capturedROCallback!([], {} as ResizeObserver);
    capturedROCallback!([], {} as ResizeObserver);

    // No refresh yet — debounce window hasn't elapsed
    expect(mockStRefresh).not.toHaveBeenCalled();

    // After debounce settles (150 ms)
    vi.advanceTimersByTime(200);
    expect(mockStRefresh).toHaveBeenCalledOnce();
  });

  it('calls ScrollTrigger.refresh once after a single resize event', () => {
    vi.useFakeTimers();
    const Comp = defineComponent({
      setup() {
        useScrollReveal();
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    capturedROCallback!([], {} as ResizeObserver);
    vi.advanceTimersByTime(200);

    expect(mockStRefresh).toHaveBeenCalledOnce();
  });

  // ── Cleanup ─────────────────────────────────────────────────────

  it('killAll kills every ScrollTrigger created', async () => {
    const { wrapper: w, el } = mountWithReveal((target) => {
      const { revealOnScrollY, killAll } = useScrollReveal();
      revealOnScrollY([target]);
      revealOnScrollY([target]); // create two triggers
      killAll();
    });
    wrapper = w;

    expect(mockStKill).toHaveBeenCalledTimes(2);
  });

  it('killAll disconnects the ResizeObserver and cancels pending timer', () => {
    vi.useFakeTimers();
    const Comp = defineComponent({
      setup() {
        const { killAll } = useScrollReveal();
        // Queue a pending refresh, then kill before it fires
        capturedROCallback?.([], {} as ResizeObserver);
        killAll();
      },
      template: '<div />',
    });
    wrapper = mount(Comp);

    expect(mockRODisconnect).toHaveBeenCalledOnce();
    // Timer was cancelled — refresh should not fire even after debounce window
    vi.advanceTimersByTime(300);
    expect(mockStRefresh).not.toHaveBeenCalled();
  });

  it('kills all ScrollTriggers on unmount', async () => {
    const el = makeEl();
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal();
        revealOnScrollY([el]);
      },
      template: '<div />',
    });
    wrapper = mount(Comp, { attachTo: document.body });
    await nextTick();

    expect(mockStKill).not.toHaveBeenCalled();
    wrapper.unmount();
    wrapper = null;

    expect(mockStKill).toHaveBeenCalledOnce();
  });

  it('disconnects the ResizeObserver on unmount', async () => {
    const Comp = defineComponent({
      setup() {
        useScrollReveal();
      },
      template: '<div />',
    });
    wrapper = mount(Comp, { attachTo: document.body });
    await nextTick();

    expect(mockRODisconnect).not.toHaveBeenCalled();
    wrapper.unmount();
    wrapper = null;

    expect(mockRODisconnect).toHaveBeenCalledOnce();
  });

  it('does not crash when revealOnScrollY is called with empty array', () => {
    const Comp = defineComponent({
      setup() {
        const { revealOnScrollY } = useScrollReveal();
        expect(() => revealOnScrollY([])).not.toThrow();
      },
      template: '<div />',
    });
    wrapper = mount(Comp);
    expect(mockStCreate).not.toHaveBeenCalled();
  });
});
