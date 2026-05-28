/**
 * Module:   tests/composables/usePeriodRollover.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint RS-23 — Automatic Pay Period Rollover)
 * Summary:  Integration tests for the orchestration composable. Verifies:
 *             • Watcher-driven trigger when budget.payStart becomes set
 *             • visibilitychange trigger when the document becomes visible
 *             • Re-entrancy guard (no infinite loop from store mutations)
 *             • Toast shown when archived > 0
 *             • ui.resetToCurrentPayPeriod called when archived > 0
 *             • Silent no-op when archived === 0
 *             • Listener cleanup on unmount
 *
 *           The composable is exercised by mounting it inside a stub host
 *           component (Vue requires watch/onMounted/onBeforeUnmount to run
 *           inside a setup() lifecycle).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useBudgetStore } from '@/stores/budget';
import { useUiStore } from '@/stores/ui';
import { useToast } from '@/composables/useToast';
import { usePeriodRollover } from '@/composables/usePeriodRollover';

// ─── Host: a no-op component that just invokes the composable ───────────────
const Host = defineComponent({
  name: 'PeriodRolloverHost',
  setup() {
    usePeriodRollover();
    return () => null;
  },
});

/** Drive a visibilitychange with a controllable `visibilityState` value. */
function dispatchVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wrapper: any;

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  // Default to "visible" so the watcher path is testable in isolation
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'visible',
  });
});

afterEach(() => {
  wrapper?.unmount();
});

// ─────────────────────────────────────────────────────────────────────────────
//  Watcher trigger (payStart hydration)
// ─────────────────────────────────────────────────────────────────────────────
describe('usePeriodRollover — watcher trigger', () => {
  it('does NOT call autoArchiveMissedPeriods when payStart is null at mount', () => {
    const budget = useBudgetStore();
    const spy = vi.spyOn(budget, 'autoArchiveMissedPeriods');

    wrapper = mount(Host);

    expect(spy).not.toHaveBeenCalled();
  });

  it('runs the rollover when payStart becomes set after mount', async () => {
    const budget = useBudgetStore();
    const spy = vi.spyOn(budget, 'autoArchiveMissedPeriods').mockReturnValue(0);

    wrapper = mount(Host);
    expect(spy).not.toHaveBeenCalled();

    budget.setPayStart('2026-05-01');
    await nextTick();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('runs the rollover immediately when payStart is already set at mount', () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-01');
    const spy = vi.spyOn(budget, 'autoArchiveMissedPeriods').mockReturnValue(0);

    wrapper = mount(Host);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  visibilitychange trigger
// ─────────────────────────────────────────────────────────────────────────────
describe('usePeriodRollover — visibilitychange trigger', () => {
  it('runs the rollover when the document becomes visible', () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-01');
    const spy = vi.spyOn(budget, 'autoArchiveMissedPeriods').mockReturnValue(0);

    wrapper = mount(Host);
    spy.mockClear(); // ignore the mount-time invocation

    dispatchVisibility('visible');

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does NOT run the rollover when the document becomes hidden', () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-01');
    const spy = vi.spyOn(budget, 'autoArchiveMissedPeriods').mockReturnValue(0);

    wrapper = mount(Host);
    spy.mockClear();

    dispatchVisibility('hidden');

    expect(spy).not.toHaveBeenCalled();
  });

  it('removes the visibilitychange listener on unmount', () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-01');
    const spy = vi.spyOn(budget, 'autoArchiveMissedPeriods').mockReturnValue(0);

    wrapper = mount(Host);
    spy.mockClear();

    wrapper.unmount();
    wrapper = null;

    dispatchVisibility('visible');

    expect(spy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Side effects when archived > 0
//
//  Note: useToast() returns a NEW object per call (closures over a module-
//  scoped `toasts` ref). Spying on `.show` of one returned object doesn't
//  intercept calls made via another. The portable observable is the shared
//  toasts ref itself — we inspect it directly.
// ─────────────────────────────────────────────────────────────────────────────
describe('usePeriodRollover — side effects', () => {
  it('does NOT show a toast or reset the schedule when archived === 0', () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-01');
    vi.spyOn(budget, 'autoArchiveMissedPeriods').mockReturnValue(0);

    const ui = useUiStore();
    const uiSpy = vi.spyOn(ui, 'resetToCurrentPayPeriod');
    const { toasts } = useToast();
    const before = toasts.value.length;

    wrapper = mount(Host);

    expect(uiSpy).not.toHaveBeenCalled();
    expect(toasts.value.length).toBe(before);
  });

  it('shows a singular toast and resets the schedule when archived === 1', () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-01');
    vi.spyOn(budget, 'autoArchiveMissedPeriods').mockReturnValue(1);

    const ui = useUiStore();
    const uiSpy = vi.spyOn(ui, 'resetToCurrentPayPeriod');
    const { toasts } = useToast();
    const before = toasts.value.length;

    wrapper = mount(Host);

    expect(uiSpy).toHaveBeenCalledTimes(1);
    expect(toasts.value.length).toBe(before + 1);

    const latest = toasts.value[toasts.value.length - 1];
    expect(latest.message).toContain('1 pay period');
    expect(latest.message).not.toContain('pay periods');
    expect(latest.type).toBe('success');
  });

  it('shows a plural toast when archived >= 2', () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-01');
    vi.spyOn(budget, 'autoArchiveMissedPeriods').mockReturnValue(3);

    const { toasts } = useToast();
    const before = toasts.value.length;

    wrapper = mount(Host);

    expect(toasts.value.length).toBe(before + 1);
    const latest = toasts.value[toasts.value.length - 1];
    expect(latest.message).toContain('3 pay periods');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Re-entrancy guard
// ─────────────────────────────────────────────────────────────────────────────
describe('usePeriodRollover — re-entrancy guard', () => {
  it('does not recurse when the action mutates store state observed by the watcher', () => {
    const budget = useBudgetStore();
    const spy = vi.spyOn(budget, 'autoArchiveMissedPeriods').mockImplementation(() => {
      // Simulate the real action mutating state that lives near payStart.
      // Without the `running` guard, this could ping the watcher again.
      budget.lastArchivedPeriodStart = '2026-05-15';
      return 1;
    });

    budget.setPayStart('2026-05-01');
    wrapper = mount(Host);

    // Should be exactly 1 — the mount-time watcher invocation. The guard
    // prevents the mutation inside the action from re-triggering check().
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
