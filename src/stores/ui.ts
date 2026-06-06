/**
 * Module:   stores/ui.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Updated:  May 2026 (Sprint 18) — sectionOrder persistence for drag-and-drop reordering
 *           May 2026 (Sprint 25) — advancedSectionOrder for the new Advanced tab
 *           May 2026 (RS-22)    — Removed dashboard sectionOrder + reorder actions:
 *                                  Dashboard is a fixed-grid layout (RS-11), and the
 *                                  SectionPicker no longer offers reorder UI for it.
 *                                  Any legacy `sectionOrder` field in localStorage
 *                                  is silently ignored on load. advancedSectionOrder
 *                                  is retained — AdvancedPage still uses drag-reorder.
 *           May 2026 (RS-27)    — Advanced tab renamed to "Insights" + surfaced in
 *                                  the sidebar. State field `advancedSectionOrder`
 *                                  renamed → `insightsSectionOrder`; four reorder
 *                                  actions renamed accordingly. Legacy
 *                                  `advancedSectionOrder` localStorage payloads are
 *                                  migrated transparently on load (the load helper
 *                                  falls back to the legacy key) and dropped from
 *                                  the persisted payload on the next save.
 * Summary:  Pinia store for transient UI state — filter values,
 *           panel visibility, currently-displayed month. Collapse
 *           state and insights-section order ARE persisted to localStorage
 *           (penny_ui_prefs key). All other state resets every page load.
 *
 *           Replaces legacy uistate.js.
 */

import { defineStore } from 'pinia';
import type { UiState, AnalyticsFilters, ScheduleView, TabId } from '@/types/state';
import { STORAGE_KEYS } from '@/types/state';
import {
  DEFAULT_INSIGHTS_ORDER,
  DASHBOARD_SECTIONS,
  INSIGHTS_SECTIONS,
} from '@/constants/dashboardSections';

// ─── UI prefs persistence helpers ────────────────────────────────

interface UiPrefs {
  collapsedSections?: string[];
  /** Legacy field — silently ignored on load (dashboard is fixed-grid since RS-22) */
  sectionOrder?: string[];
  /** Legacy field — migrated to `insightsSectionOrder` in RS-27 */
  advancedSectionOrder?: string[];
  insightsSectionOrder?: string[];
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

// ─── Insights section order: load + migrate ──────────────────────
// Stored order may be stale (new sections added, old ones removed).
// Strategy:
//   1. Read from `insightsSectionOrder`; if missing, fall back to the legacy
//      `advancedSectionOrder` field (RS-27 migration — see header).
//   2. Filter stored IDs to only those that still exist in INSIGHTS_SECTIONS
//   3. Append any IDs from the default order that are missing from stored order
//   This ensures no section is ever lost and new sections appear at the end.
//   The legacy key is read but never written back — the next save persists
//   under the new `insightsSectionOrder` key, naturally dropping the legacy
//   field from the payload.

function loadInsightsSectionOrder(): string[] {
  const prefs = loadUiPrefs();
  const stored = prefs.insightsSectionOrder ?? prefs.advancedSectionOrder;
  const allIds = new Set(DEFAULT_INSIGHTS_ORDER);
  if (!Array.isArray(stored) || stored.length === 0) {
    return [...DEFAULT_INSIGHTS_ORDER];
  }
  const filtered = stored.filter(id => allIds.has(id));
  const missing = DEFAULT_INSIGHTS_ORDER.filter(id => !filtered.includes(id));
  return [...filtered, ...missing];
}

function loadCollapsedSections(): string[] {
  const { collapsedSections } = loadUiPrefs();
  return Array.isArray(collapsedSections) ? collapsedSections : [];
}

/**
 * Persist UI prefs. Note: the legacy `sectionOrder` (RS-22) and
 * `advancedSectionOrder` (RS-27) fields are intentionally NOT written — they've
 * been deprecated. Old payloads in localStorage with those fields will be
 * overwritten with the new schema on the first save.
 */
function saveAll(
  collapsedSections: string[],
  insightsSectionOrder: string[],
): void {
  saveUiPrefs({ collapsedSections, insightsSectionOrder });
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
    insightsSectionOrder: loadInsightsSectionOrder(),
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
      saveAll(this.collapsedSections, this.insightsSectionOrder);
    },

    expandSection(sectionId: string): void {
      this.collapsedSections = this.collapsedSections.filter(id => id !== sectionId);
      saveAll(this.collapsedSections, this.insightsSectionOrder);
    },

    // ─── Insights section order (renamed from Advanced in RS-27) ──

    /**
     * Persist a new Insights-tab section ordering.
     */
    setInsightsSectionOrder(order: string[]): void {
      const allIds = new Set(DEFAULT_INSIGHTS_ORDER);
      const filtered = order.filter(id => allIds.has(id));
      const missing = DEFAULT_INSIGHTS_ORDER.filter(id => !filtered.includes(id));
      this.insightsSectionOrder = [...filtered, ...missing];
      saveAll(this.collapsedSections, this.insightsSectionOrder);
    },

    /** Restore the canonical Insights section order */
    resetInsightsSectionOrder(): void {
      this.insightsSectionOrder = [...DEFAULT_INSIGHTS_ORDER];
      saveAll(this.collapsedSections, this.insightsSectionOrder);
    },

    /** Move an Insights section up one position. */
    moveInsightsSectionUp(sectionId: string): void {
      const idx = this.insightsSectionOrder.indexOf(sectionId);
      if (idx <= 0) return;
      const newOrder = [...this.insightsSectionOrder];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      this.insightsSectionOrder = newOrder;
      saveAll(this.collapsedSections, this.insightsSectionOrder);
    },

    /** Move an Insights section down one position. */
    moveInsightsSectionDown(sectionId: string): void {
      const idx = this.insightsSectionOrder.indexOf(sectionId);
      if (idx < 0 || idx >= this.insightsSectionOrder.length - 1) return;
      const newOrder = [...this.insightsSectionOrder];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      this.insightsSectionOrder = newOrder;
      saveAll(this.collapsedSections, this.insightsSectionOrder);
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
// fallow-ignore-next-line unused-export
export { DASHBOARD_SECTIONS, INSIGHTS_SECTIONS };
