import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useUiStore } from '@/stores/ui';

describe('ui store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initialises analyticsFilters as empty strings', () => {
    const store = useUiStore();
    expect(store.analyticsFilters).toEqual({ startDate: '', endDate: '', search: '' });
  });

  it('setAnalyticsFilters merges into existing object', () => {
    const store = useUiStore();
    store.setAnalyticsFilters({ search: 'coffee' });
    expect(store.analyticsFilters).toEqual({ startDate: '', endDate: '', search: 'coffee' });
    store.setAnalyticsFilters({ startDate: '2026-01-01' });
    expect(store.analyticsFilters.search).toBe('coffee');
    expect(store.analyticsFilters.startDate).toBe('2026-01-01');
  });

  it('clearAnalyticsFilters resets all filter fields', () => {
    const store = useUiStore();
    store.setAnalyticsFilters({ search: 'coffee', startDate: '2026-01-01' });
    store.clearAnalyticsFilters();
    expect(store.analyticsFilters).toEqual({ startDate: '', endDate: '', search: '' });
  });

  it('setScheduleView updates view mode', () => {
    const store = useUiStore();
    expect(store.scheduleView).toBe('list');
    store.setScheduleView('calendar');
    expect(store.scheduleView).toBe('calendar');
  });

  it('setScheduleMonth sets both year and month', () => {
    const store = useUiStore();
    store.setScheduleMonth(2027, 3);
    expect(store.scheduleViewYear).toBe(2027);
    expect(store.scheduleViewMonth).toBe(3);
  });
});

describe('ui store — stepScheduleMonth date arithmetic', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial month matches current date', () => {
    const store = useUiStore();
    expect(store.scheduleViewYear).toBe(2026);
    expect(store.scheduleViewMonth).toBe(5);
  });

  it('stepScheduleMonth(+1) advances by one month', () => {
    const store = useUiStore();
    store.stepScheduleMonth(1);
    expect(store.scheduleViewMonth).toBe(6);
  });

  it('stepScheduleMonth(-1) goes back one month', () => {
    const store = useUiStore();
    store.stepScheduleMonth(-1);
    expect(store.scheduleViewMonth).toBe(4);
  });

  it('stepScheduleMonth(+12) wraps year forward', () => {
    const store = useUiStore();
    store.stepScheduleMonth(12);
    expect(store.scheduleViewYear).toBe(2027);
    expect(store.scheduleViewMonth).toBe(5);
  });

  it('stepScheduleMonth(-6) wraps year backward', () => {
    const store = useUiStore();
    store.setScheduleMonth(2026, 3);
    store.stepScheduleMonth(-6);
    expect(store.scheduleViewYear).toBe(2025);
    expect(store.scheduleViewMonth).toBe(9);
  });

  it('resetScheduleToToday restores current month', () => {
    const store = useUiStore();
    store.setScheduleMonth(2020, 1);
    store.resetScheduleToToday();
    expect(store.scheduleViewYear).toBe(2026);
    expect(store.scheduleViewMonth).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────
//  Pay-period offset actions
// ─────────────────────────────────────────────────────────────────
describe('ui store — pay-period offset', () => {
  beforeEach(() => { setActivePinia(createPinia()); });

  it('schedulePayPeriodOffset initialises to 0', () => {
    const store = useUiStore();
    expect(store.schedulePayPeriodOffset).toBe(0);
  });

  it('stepPayPeriod(+1) increments offset', () => {
    const store = useUiStore();
    store.stepPayPeriod(1);
    expect(store.schedulePayPeriodOffset).toBe(1);
  });

  it('stepPayPeriod(-1) decrements offset', () => {
    const store = useUiStore();
    store.stepPayPeriod(-1);
    expect(store.schedulePayPeriodOffset).toBe(-1);
  });

  it('stepPayPeriod chains additively', () => {
    const store = useUiStore();
    store.stepPayPeriod(2);
    store.stepPayPeriod(3);
    expect(store.schedulePayPeriodOffset).toBe(5);
  });

  it('resetToCurrentPayPeriod sets offset to 0', () => {
    const store = useUiStore();
    store.stepPayPeriod(4);
    store.resetToCurrentPayPeriod();
    expect(store.schedulePayPeriodOffset).toBe(0);
  });

  it('setScheduleView payperiod is accepted', () => {
    const store = useUiStore();
    store.setScheduleView('payperiod');
    expect(store.scheduleView).toBe('payperiod');
  });
});
