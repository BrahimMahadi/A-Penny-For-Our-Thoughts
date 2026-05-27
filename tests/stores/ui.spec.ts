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
//  sectionOrder — Sprint 18 (collapsible + drag-and-drop reorder)
// ─────────────────────────────────────────────────────────────────
import { DEFAULT_SECTION_ORDER } from '@/constants/dashboardSections';

describe('ui store — sectionOrder', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initialises to the default section order', () => {
    const store = useUiStore();
    expect(store.sectionOrder).toEqual(DEFAULT_SECTION_ORDER);
  });

  it('sectionOrder contains all 7 known dashboard section IDs', () => {
    const store = useUiStore();
    // RS-11: income-streams, wants-tracker, savings-goals removed → 7 sections remain
    expect(store.sectionOrder).toHaveLength(7);
    expect(store.sectionOrder).toContain('expense-cards');
    expect(store.sectionOrder).toContain('subscriptions');
    expect(store.sectionOrder).toContain('wishlist');
  });

  it('setSectionOrder updates the order and persists to localStorage', () => {
    const store = useUiStore();
    const newOrder = [...DEFAULT_SECTION_ORDER].reverse();
    store.setSectionOrder(newOrder);
    expect(store.sectionOrder[0]).toBe(DEFAULT_SECTION_ORDER[DEFAULT_SECTION_ORDER.length - 1]);

    // Persisted?
    const raw = localStorage.getItem('penny_ui_prefs');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.sectionOrder[0]).toBe(DEFAULT_SECTION_ORDER[DEFAULT_SECTION_ORDER.length - 1]);
  });

  it('setSectionOrder filters out unknown IDs', () => {
    const store = useUiStore();
    store.setSectionOrder(['subscriptions', 'ghost-section-does-not-exist', 'loans']);
    expect(store.sectionOrder).not.toContain('ghost-section-does-not-exist');
  });

  it('setSectionOrder appends missing IDs so no section is ever lost', () => {
    const store = useUiStore();
    // Pass an order that only contains 2 of the 7 dashboard sections
    store.setSectionOrder(['subscriptions', 'loans']);
    expect(store.sectionOrder).toContain('wishlist');
    expect(store.sectionOrder.length).toBe(7);
    // The 2 provided sections come first
    expect(store.sectionOrder[0]).toBe('subscriptions');
    expect(store.sectionOrder[1]).toBe('loans');
  });

  it('resetSectionOrder restores the canonical order and persists', () => {
    const store = useUiStore();
    store.setSectionOrder([...DEFAULT_SECTION_ORDER].reverse());
    store.resetSectionOrder();
    expect(store.sectionOrder).toEqual(DEFAULT_SECTION_ORDER);
    const raw = localStorage.getItem('penny_ui_prefs');
    const parsed = JSON.parse(raw!);
    expect(parsed.sectionOrder).toEqual(DEFAULT_SECTION_ORDER);
  });

  it('moveSectionUp swaps a section with the one before it', () => {
    const store = useUiStore();
    const originalFirst = store.sectionOrder[0];
    const originalSecond = store.sectionOrder[1];
    store.moveSectionUp(originalSecond);
    expect(store.sectionOrder[0]).toBe(originalSecond);
    expect(store.sectionOrder[1]).toBe(originalFirst);
  });

  it('moveSectionUp does nothing when section is already first', () => {
    const store = useUiStore();
    const firstId = store.sectionOrder[0];
    const orderBefore = [...store.sectionOrder];
    store.moveSectionUp(firstId);
    expect(store.sectionOrder).toEqual(orderBefore);
  });

  it('moveSectionDown swaps a section with the one after it', () => {
    const store = useUiStore();
    const originalFirst = store.sectionOrder[0];
    const originalSecond = store.sectionOrder[1];
    store.moveSectionDown(originalFirst);
    expect(store.sectionOrder[0]).toBe(originalSecond);
    expect(store.sectionOrder[1]).toBe(originalFirst);
  });

  it('moveSectionDown does nothing when section is already last', () => {
    const store = useUiStore();
    const lastId = store.sectionOrder[store.sectionOrder.length - 1];
    const orderBefore = [...store.sectionOrder];
    store.moveSectionDown(lastId);
    expect(store.sectionOrder).toEqual(orderBefore);
  });

  it('sectionOrder survives a store re-init when persisted', () => {
    // Write a custom order to localStorage first
    const customOrder = [...DEFAULT_SECTION_ORDER].reverse();
    localStorage.setItem('penny_ui_prefs', JSON.stringify({
      collapsedSections: [],
      sectionOrder: customOrder,
    }));
    // Create a fresh store — it should pick up the persisted order
    setActivePinia(createPinia());
    const store2 = useUiStore();
    expect(store2.sectionOrder[0]).toBe(customOrder[0]);
  });

  it('migration: unknown IDs in stored order are filtered out on load', () => {
    localStorage.setItem('penny_ui_prefs', JSON.stringify({
      collapsedSections: [],
      sectionOrder: ['subscriptions', 'totally-fake-id', 'loans'],
    }));
    setActivePinia(createPinia());
    const store2 = useUiStore();
    expect(store2.sectionOrder).not.toContain('totally-fake-id');
    expect(store2.sectionOrder.length).toBe(7);
  });

  it('migration: sections missing from stored order are appended on load', () => {
    // Store only has 2 IDs persisted
    localStorage.setItem('penny_ui_prefs', JSON.stringify({
      collapsedSections: [],
      sectionOrder: ['subscriptions', 'loans'],
    }));
    setActivePinia(createPinia());
    const store2 = useUiStore();
    expect(store2.sectionOrder.length).toBe(7);
    expect(store2.sectionOrder[0]).toBe('subscriptions');
    expect(store2.sectionOrder[1]).toBe('loans');
  });

  it('collapsedSections and sectionOrder are saved together in penny_ui_prefs', () => {
    const store = useUiStore();
    store.toggleSection('wishlist');
    store.setSectionOrder([...DEFAULT_SECTION_ORDER].reverse());
    const raw = JSON.parse(localStorage.getItem('penny_ui_prefs')!);
    expect(raw.collapsedSections).toContain('wishlist');
    expect(raw.sectionOrder[0]).toBe(DEFAULT_SECTION_ORDER[DEFAULT_SECTION_ORDER.length - 1]);
  });
});
