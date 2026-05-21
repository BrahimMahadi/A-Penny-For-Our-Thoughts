import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useToast } from '@/composables/useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Drain any existing toasts from previous tests by dismissing them.
    const { toasts, dismiss } = useToast();
    [...toasts.value].forEach((t) => dismiss(t.id));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('show() queues a new toast', () => {
    const { show, toasts } = useToast();
    show('Saved');
    expect(toasts.value.length).toBe(1);
    expect(toasts.value[0].message).toBe('Saved');
    expect(toasts.value[0].type).toBe('success');
  });

  it('show() returns the toast id', () => {
    const { show } = useToast();
    const id = show('Hello');
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  it('show() accepts a type variant', () => {
    const { show, toasts } = useToast();
    show('Failed', 'danger');
    expect(toasts.value[0].type).toBe('danger');
  });

  it('dismiss() removes the toast by id', () => {
    const { show, dismiss, toasts } = useToast();
    const id = show('Bye');
    dismiss(id);
    expect(toasts.value.length).toBe(0);
  });

  it('dismiss() with unknown id is a no-op', () => {
    const { show, dismiss, toasts } = useToast();
    show('A');
    show('B');
    dismiss(99999);
    expect(toasts.value.length).toBe(2);
  });

  it('auto-dismisses after the duration + animation buffer', () => {
    const { show, toasts } = useToast();
    show('Disappears');
    expect(toasts.value.length).toBe(1);
    // Advance past the safety timer (duration + 600ms)
    vi.advanceTimersByTime(4000);
    expect(toasts.value.length).toBe(0);
  });

  it('multiple toasts are tracked independently', () => {
    const { show, toasts } = useToast();
    show('A');
    show('B', 'danger');
    show('C', 'info');
    expect(toasts.value.length).toBe(3);
    expect(toasts.value.map((t) => t.message)).toEqual(['A', 'B', 'C']);
  });
});
