/**
 * Module:   stores/ui.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Updated:  May 2026 (Sprint 18) — sectionOrder persistence for drag-and-drop reordering
 *           May 2026 (Sprint 25) — advancedSectionOrder for the new Advanced tab
 * Summary:  Pinia store for transient UI state — filter values,
 *           panel visibility, currently-displayed month. Collapse
 *           state and section order ARE persisted to localStorage
 *           (penny_ui_prefs key). All other state resets every page load.
 *
 *           Replaces legacy uistate.js.
 */

import { defineStore } from 'pinia';
import type { UiState, AnalyticsFilters, ScheduleView, TabId } from '@/types/state';
import { STORAGE_KEYS } from '@/types/state';
import {
  DEFAULT_SECTION_ORDER,
  DEFAULT_ADVANCED_ORDER,
  DASHBOARD_SECTIONS,
  ADVANCED_SECTIONS,
} from '@/constants/dashboardSections';

// ─── UI prefs persistence helpers ────────────────────────────────

interface UiPrefs {
  collapsedSections?: string[];
  sectionOrder?: string[];
  advancedSectionOrder?: string[];
}

function loadUiPrefs(): UiPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.UI_PREFS);
    if (!raw) return {};
    return JSON.parse(raw) as UiPrefs;
  } catch {
    return {};
  }
}

function saveUiPrefs(prefs: UiPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEYS.UI_PREFS, JSON.stringify(prefs));
  } catch { /* quota full — non-critical */ }
}

// ─── Section order: load + migrate ───────────────────────────────
// Stored order may be stale (new sections added, old ones removed).
// Strategy:
//   1. Filter stored IDs to only those that still exist in the relevant section list
//   2. Append any IDs from the default order that are missing from stored order
//   This ensures no section is ever lost and new sections appear at the end.

function loadSectionOrder(): string[] {
  const { sectionOrder } = loadUiPrefs();
  const allIds = new Set(DEFAULT_SECTION_ORDER);
  if (!Array.isArray(sectionOrder) || sectionOrder.length === 0) {
    return [...DEFAULT_SECTION_ORDER];
  }
  const filtered = sectionOrder.filter(id => allIds.has(id));
  const missing = DEFAULT_SECTION_ORDER.filter(id => !filtered.includes(id));
  return [...filtered, ...missing];
}

function loadAdvancedSectionOrder(): string[] {
  const { advancedSectionOrder } = loadUiPrefs();
  const allIds = new Set(DEFAULT_ADVANCED_ORDER);
  if (!Array.isArray(advancedSectionOrder) || advancedSectionOrder.length === 0) {
    return [...DEFAULT_ADVANCED_ORDER];
  }
  const filtered = advancedSectionOrder.filter(id => allIds.has(id));
  const missing = DEFAULT_ADVANCED_ORDER.filter(id => !filtered.includes(id));
  return [...filtered, ...missing];
}

function loadCollapsedSections(): string[] {
  const { collapsedSections } = loadUiPrefs();
  return Array.isArray(collapsedSections) ? collapsedSections : [];
}

function saveAll(
  collapsedSections: string[],
  sectionOrder: string[],
  advancedSectionOrder: string[],
): void {
  saveUiPrefs({ collapsedSections, sectionOrder, advancedSectionOrder });
}

// ─── State factory ────────────────────────────────────────────────

function makeInitialUiState(): UiState {
  const now = new Date();
  return {
    activeTab: 'dashboard',
    analyticsPanelOpen: false,
    analyticsFilters: { startDate: '', endDate: '', search: '' },
    scheduleViewYear: now.getFullYear(),
    scheduleViewMonth: now.getMonth() + 1,
    scheduleView: 'list',
    schedulePayPeriodOffset: 0,
    collapsedSections: loadCollapsedSections(),
    sectionOrder: loadSectionOrder(),
    advancedSectionOrder: loadAdvancedSectionOrder(),
    sectionPickerOpen: false,
    shortcutHelpOpen:  false,
  };
}

export const useUiStore = defineStore('ui', {
  state: (): UiState => makeInitialUiState(),

  getters: {
    isSectionCollapsed: (state) => (sectionId: string): boolean =>
      state.collapsedSections.includes(sectionId),
  },

  actions: {
    setActiveTab(tab: TabId): void {
      this.activeTab = tab;
    },

    toggleSection(sectionId: string): void {
      const idx = this.collapsedSections.indexOf(sectionId);
      if (idx === -1) {
        this.collapsedSections = [...this.collapsedSections, sectionId];
      } else {
        this.collapsedSections = this.collapsedSections.filter(id => id !== sectionId);
      }
      saveAll(this.collapsedSections, this.sectionOrder, this.advancedSectionOrder);
    },

    expandSection(sectionId: string): void {
      this.collapsedSections = this.collapsedSections.filter(id => id !== sectionId);
      saveAll(this.collapsedSections, this.sectionOrder, this.advancedSectionOrder);
    },

    // ─── Dashboard section order ──────────────────────────────────

    /**
     * Persist a new dashboard section ordering. The `order` array must contain all
     * section IDs — any IDs missing from the current registry are appended.
     */
    setSectionOrder(order: string[]): void {
      const allIds = new Set(DEFAULT_SECTION_ORDER);
      const filtered = order.filter(id => allIds.has(id));
      const missing = DEFAULT_SECTION_ORDER.filter(id => !filtered.includes(id));
      this.sectionOrder = [...filtered, ...missing];
      saveAll(this.collapsedSections, this.sectionOrder, this.advancedSectionOrder);
    },

    /** Restore the canonical dashboard section order */
    resetSectionOrder(): void {
      this.sectionOrder = [...DEFAULT_SECTION_ORDER];
      saveAll(this.collapsedSections, this.sectionOrder, this.advancedSectionOrder);
    },

    /** Move a dashboard section up one position. */
    moveSectionUp(sectionId: string): void {
      const idx = this.sectionOrder.indexOf(sectionId);
      if (idx <= 0) return;
      const newOrder = [...this.sectionOrder];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      this.sectionOrder = newOrder;
      saveAll(this.collapsedSections, this.sectionOrder, this.advancedSectionOrder);
    },

    /** Move a dashboard section down one position. */
    moveSectionDown(sectionId: string): void {
      const idx = this.sectionOrder.indexOf(sectionId);
      if (idx < 0 || idx >= this.sectionOrder.length - 1) return;
      const newOrder = [...this.sectionOrder];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      this.sectionOrder = newOrder;
      saveAll(this.collapsedSections, this.sectionOrder, this.advancedSectionOrder);
    },

    // ─── Advanced section order ───────────────────────────────────

    /**
     * Persist a new advanced section ordering.
     */
    setAdvancedSectionOrder(order: string[]): void {
      const allIds = new Set(DEFAULT_ADVANCED_ORDER);
      const filtered = order.filter(id => allIds.has(id));
      const missing = DEFAULT_ADVANCED_ORDER.filter(id => !filtered.includes(id));
      this.advancedSectionOrder = [...filtered, ...missing];
      saveAll(this.collapsedSections, this.sectionOrder, this.advancedSectionOrder);
    },

    /** Restore the canonical advanced section order */
    resetAdvancedSectionOrder(): void {
      this.advancedSectionOrder = [...DEFAULT_ADVANCED_ORDER];
      saveAll(this.collapsedSections, this.sectionOrder, this.advancedSectionOrder);
    },

    /** Move an advanced section up one position. */
    moveAdvancedSectionUp(sectionId: string): void {
      const idx = this.advancedSectionOrder.indexOf(sectionId);
      if (idx <= 0) return;
      const newOrder = [...this.advancedSectionOrder];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      this.advancedSectionOrder = newOrder;
      saveAll(this.collapsedSections, this.sectionOrder, this.advancedSectionOrder);
    },

    /** Move an advanced section down one position. */
    moveAdvancedSectionDown(sectionId: string): void {
      const idx = this.advancedSectionOrder.indexOf(sectionId);
      if (idx < 0 || idx >= this.advancedSectionOrder.length - 1) return;
      const newOrder = [...this.advancedSectionOrder];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      this.advancedSectionOrder = newOrder;
      saveAll(this.collapsedSections, this.sectionOrder, this.advancedSectionOrder);
    },

    // ─── Section picker ───────────────────────────────────────────

    openSectionPicker(): void {
      this.sectionPickerOpen = true;
    },

    closeSectionPicker(): void {
      this.sectionPickerOpen = false;
    },

    toggleSectionPicker(): void {
      this.sectionPickerOpen = !this.sectionPickerOpen;
    },

    // ─── Shortcut help ────────────────────────────────────────────

    openShortcutHelp(): void {
      this.shortcutHelpOpen = true;
    },

    closeShortcutHelp(): void {
      this.shortcutHelpOpen = false;
    },

    toggleShortcutHelp(): void {
      this.shortcutHelpOpen = !this.shortcutHelpOpen;
    },

    // ─── Analytics panel ─────────────────────────────────────────

    toggleAnalyticsPanel(): void {
      this.analyticsPanelOpen = !this.analyticsPanelOpen;
    },

    setAnalyticsPanelOpen(open: boolean): void {
      this.analyticsPanelOpen = open;
    },

    setAnalyticsFilters(patch: Partial<AnalyticsFilters>): void {
      this.analyticsFilters = { ...this.analyticsFilters, ...patch };
    },

    clearAnalyticsFilters(): void {
      this.analyticsFilters = { startDate: '', endDate: '', search: '' };
    },

    // ─── Schedule ─────────────────────────────────────────────────

    setScheduleView(view: ScheduleView): void {
      this.scheduleView = view;
    },

    /** Set both year and month at once. Month is 1-based (1–12). */
    setScheduleMonth(year: number, month: number): void {
      this.scheduleViewYear = year;
      this.scheduleViewMonth = month;
    },

    /** Step the schedule month forward/back by `delta` months. */
    stepScheduleMonth(delta: number): void {
      const d = new Date(this.scheduleViewYear, this.scheduleViewMonth - 1 + delta, 1);
      this.scheduleViewYear = d.getFullYear();
      this.scheduleViewMonth = d.getMonth() + 1;
    },

    /** Reset month picker to current calendar month. */
    resetScheduleToToday(): void {
      const now = new Date();
      this.scheduleViewYear = now.getFullYear();
      this.scheduleViewMonth = now.getMonth() + 1;
    },

    /** Step the pay-period offset forward (+1) or backward (-1). */
    stepPayPeriod(delta: number): void {
      this.schedulePayPeriodOffset += delta;
    },

    /** Reset pay-period offset to the current period. */
    resetToCurrentPayPeriod(): void {
      this.schedulePayPeriodOffset = 0;
    },
  },
});

// Re-export for convenience so callers don't need to import dashboardSections separately
export { DASHBOARD_SECTIONS, ADVANCED_SECTIONS };
