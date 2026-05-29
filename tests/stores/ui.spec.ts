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

// ─────────────────────────────────────────────────────────────────
//  Section state — RS-22 + RS-27
//
//  RS-22 (Dashboard fixed-grid; legacy `sectionOrder` dropped):
//    • The Dashboard is a fixed-grid layout (no user reordering).
//    • The ui store no longer exposes sectionOrder / setSectionOrder /
//      resetSectionOrder / moveSectionUp / moveSectionDown.
//    • Legacy `sectionOrder` field in localStorage is silently ignored
//      on load. The next save drops it from the persisted payload.
//
//  RS-27 (Advanced tab renamed → Insights, surfaced in sidebar):
//    • `advancedSectionOrder` field + four reorder actions renamed:
//        advancedSectionOrder → insightsSectionOrder
//        setAdvancedSectionOrder → setInsightsSectionOrder
//        resetAdvancedSectionOrder → resetInsightsSectionOrder
//        moveAdvancedSectionUp → moveInsightsSectionUp
//        moveAdvancedSectionDown → moveInsightsSectionDown
//    • Legacy `advancedSectionOrder` localStorage payloads are migrated
//      transparently on load (load helper falls back to the legacy key).
//      The next save persists under `insightsSectionOrder` and drops the
//      legacy field from the payload — same pattern as the RS-22 cleanup.
// ─────────────────────────────────────────────────────────────────
import { DEFAULT_INSIGHTS_ORDER } from '@/constants/dashboardSections';

describe('ui store — RS-22 + RS-27 section state', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ── Dashboard sectionOrder removed (RS-22) ─────────────────────
  it('store no longer exposes sectionOrder', () => {
    const store = useUiStore();
    expect((store as unknown as Record<string, unknown>).sectionOrder).toBeUndefined();
  });

  it('store no longer exposes setSectionOrder / resetSectionOrder', () => {
    const store = useUiStore() as unknown as Record<string, unknown>;
    expect(store.setSectionOrder).toBeUndefined();
    expect(store.resetSectionOrder).toBeUndefined();
  });

  it('store no longer exposes moveSectionUp / moveSectionDown', () => {
    const store = useUiStore() as unknown as Record<string, unknown>;
    expect(store.moveSectionUp).toBeUndefined();
    expect(store.moveSectionDown).toBeUndefined();
  });

  // ── Legacy `sectionOrder` migration (RS-22) ────────────────────
  it('silently ignores legacy sectionOrder field on load', () => {
    localStorage.setItem('penny_ui_prefs', JSON.stringify({
      collapsedSections: ['wishlist'],
      sectionOrder: ['subscriptions', 'loans'],
    }));
    setActivePinia(createPinia());
    const store = useUiStore();
    // Collapsed state is preserved; legacy sectionOrder is ignored
    expect(store.collapsedSections).toContain('wishlist');
    expect((store as unknown as Record<string, unknown>).sectionOrder).toBeUndefined();
  });

  it('next save drops the legacy sectionOrder field from localStorage', () => {
    // Seed localStorage with both legacy fields
    localStorage.setItem('penny_ui_prefs', JSON.stringify({
      collapsedSections: [],
      sectionOrder: ['anything'],
      insightsSectionOrder: [...DEFAULT_INSIGHTS_ORDER],
    }));
    setActivePinia(createPinia());
    const store = useUiStore();
    // Trigger a save by mutating collapsed state
    store.toggleSection('wishlist');
    const raw = JSON.parse(localStorage.getItem('penny_ui_prefs')!);
    expect(raw.sectionOrder).toBeUndefined();
    expect(raw.collapsedSections).toContain('wishlist');
    expect(raw.insightsSectionOrder).toEqual(DEFAULT_INSIGHTS_ORDER);
  });

  // ── RS-27 rename: store no longer exposes Advanced-named API ──
  it('store no longer exposes advancedSectionOrder', () => {
    const store = useUiStore() as unknown as Record<string, unknown>;
    expect(store.advancedSectionOrder).toBeUndefined();
  });

  it('store no longer exposes setAdvancedSectionOrder / resetAdvancedSectionOrder', () => {
    const store = useUiStore() as unknown as Record<string, unknown>;
    expect(store.setAdvancedSectionOrder).toBeUndefined();
    expect(store.resetAdvancedSectionOrder).toBeUndefined();
  });

  it('store no longer exposes moveAdvancedSectionUp / moveAdvancedSectionDown', () => {
    const store = useUiStore() as unknown as Record<string, unknown>;
    expect(store.moveAdvancedSectionUp).toBeUndefined();
    expect(store.moveAdvancedSectionDown).toBeUndefined();
  });

  // ── RS-27 migration: legacy advancedSectionOrder is read on first load ──
  it('migrates legacy `advancedSectionOrder` localStorage payload to insightsSectionOrder on load', () => {
    const customOrder = [...DEFAULT_INSIGHTS_ORDER].reverse();
    localStorage.setItem('penny_ui_prefs', JSON.stringify({
      collapsedSections: [],
      advancedSectionOrder: customOrder,
    }));
    setActivePinia(createPinia());
    const store = useUiStore();
    expect(store.insightsSectionOrder).toEqual(customOrder);
  });

  it('prefers `insightsSectionOrder` when both legacy and new fields are present', () => {
    const legacyOrder = [...DEFAULT_INSIGHTS_ORDER].reverse();
    const currentOrder = [...DEFAULT_INSIGHTS_ORDER];
    localStorage.setItem('penny_ui_prefs', JSON.stringify({
      collapsedSections: [],
      advancedSectionOrder: legacyOrder,
      insightsSectionOrder: currentOrder,
    }));
    setActivePinia(createPinia());
    const store = useUiStore();
    expect(store.insightsSectionOrder).toEqual(currentOrder);
  });

  it('next save drops the legacy advancedSectionOrder field from localStorage', () => {
    localStorage.setItem('penny_ui_prefs', JSON.stringify({
      collapsedSections: [],
      advancedSectionOrder: [...DEFAULT_INSIGHTS_ORDER],
    }));
    setActivePinia(createPinia());
    const store = useUiStore();
    store.toggleSection('wishlist');
    const raw = JSON.parse(localStorage.getItem('penny_ui_prefs')!);
    expect(raw.advancedSectionOrder).toBeUndefined();
    expect(raw.insightsSectionOrder).toEqual(DEFAULT_INSIGHTS_ORDER);
  });

  // ── insightsSectionOrder works end-to-end (the live API) ──────
  it('initialises insightsSectionOrder to the default order', () => {
    const store = useUiStore();
    expect(store.insightsSectionOrder).toEqual(DEFAULT_INSIGHTS_ORDER);
  });

  it('setInsightsSectionOrder persists a new ordering', () => {
    const store = useUiStore();
    const newOrder = [...DEFAULT_INSIGHTS_ORDER].reverse();
    store.setInsightsSectionOrder(newOrder);
    expect(store.insightsSectionOrder[0])
      .toBe(DEFAULT_INSIGHTS_ORDER[DEFAULT_INSIGHTS_ORDER.length - 1]);
    const raw = JSON.parse(localStorage.getItem('penny_ui_prefs')!);
    expect(raw.insightsSectionOrder[0])
      .toBe(DEFAULT_INSIGHTS_ORDER[DEFAULT_INSIGHTS_ORDER.length - 1]);
  });

  it('resetInsightsSectionOrder restores the canonical Insights order', () => {
    const store = useUiStore();
    store.setInsightsSectionOrder([...DEFAULT_INSIGHTS_ORDER].reverse());
    store.resetInsightsSectionOrder();
    expect(store.insightsSectionOrder).toEqual(DEFAULT_INSIGHTS_ORDER);
  });

  it('moveInsightsSectionUp swaps with the section before it', () => {
    const store = useUiStore();
    const first  = store.insightsSectionOrder[0];
    const second = store.insightsSectionOrder[1];
    store.moveInsightsSectionUp(second);
    expect(store.insightsSectionOrder[0]).toBe(second);
    expect(store.insightsSectionOrder[1]).toBe(first);
  });

  it('moveInsightsSectionDown swaps with the section after it', () => {
    const store = useUiStore();
    const first  = store.insightsSectionOrder[0];
    const second = store.insightsSectionOrder[1];
    store.moveInsightsSectionDown(first);
    expect(store.insightsSectionOrder[0]).toBe(second);
    expect(store.insightsSectionOrder[1]).toBe(first);
  });
});
