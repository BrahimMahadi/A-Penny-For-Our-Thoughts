/**
 * Module:   stores/ui.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Summary:  Pinia store for transient UI state — filter values,
 *           panel visibility, currently-displayed month. NOT
 *           persisted to localStorage; resets every page load.
 *
 *           Replaces legacy uistate.js.
 */

import { defineStore } from 'pinia';
import type { UiState, AnalyticsFilters, ScheduleView, TabId } from '@/types/state';
import { STORAGE_KEYS } from '@/types/state';

// ─── Collapsed-sections persistence helpers ───────────────────────

function loadCollapsedSections(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.UI_PREFS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { collapsedSections?: string[] };
    return Array.isArray(parsed.collapsedSections) ? parsed.collapsedSections : [];
  } catch {
    return [];
  }
}

function saveCollapsedSections(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.UI_PREFS, JSON.stringify({ collapsedSections: ids }));
  } catch { /* quota full — non-critical */ }
}

function makeInitialUiState(): UiState {
  const now = new Date();
  return {
    activeTab: 'dashboard',
    analyticsPanelOpen: false,
    analyticsFilters: { startDate: '', endDate: '', search: '' },
    scheduleViewYear: now.getFullYear(),
    scheduleViewMonth: now.getMonth() + 1,
    scheduleView: 'list',
    collapsedSections: loadCollapsedSections(),
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
      saveCollapsedSections(this.collapsedSections);
    },

    expandSection(sectionId: string): void {
      this.collapsedSections = this.collapsedSections.filter(id => id !== sectionId);
      saveCollapsedSections(this.collapsedSections);
    },

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
  },
});
