<!--
  Module:   App.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration)
  Modified: May 2026 — Sprint 5 (CSV toolbar, keyboard shortcuts)
            May 2026 — Sprint 10 (onboarding, what's new banner)
  Summary:  Root layout. Header (title + tab bar + CSV toolbar + theme
            toggle), page slot routed via ui store's activeTab.

  Keyboard shortcuts (global, guarded from inputs):
    ?           — toggle keyboard-shortcut help panel
    1 / 2 / 3   — switch to Dashboard / Schedule / Docs
    E           — export CSV
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useThemeStore } from '@/stores/theme';
import { useUiStore } from '@/stores/ui';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useKeyboard } from '@/composables/useKeyboard';
import { useSwipe } from '@/composables/useSwipe';
import type { TabId } from '@/types/state';

import DashboardPage from '@/components/pages/DashboardPage.vue';
import SchedulePage from '@/components/pages/SchedulePage.vue';
import DocsPage from '@/components/pages/DocsPage.vue';
import SettingsPage from '@/components/pages/SettingsPage.vue';
import ToastContainer from '@/components/ui/ToastContainer.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import SectionPicker from '@/components/ui/SectionPicker.vue';
import OnboardingModal from '@/components/onboarding/OnboardingModal.vue';
import WhatsNewBanner from '@/components/onboarding/WhatsNewBanner.vue';

const theme  = useThemeStore();
const ui     = useUiStore();
const budget = useBudgetStore();
const toast  = useToast();

// ─── Tabs ────────────────────────────────────────────────────────────────────
interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'schedule',  label: 'Schedule',  icon: '📅' },
  { id: 'docs',      label: 'Docs',      icon: '📖' },
  { id: 'settings',  label: 'Settings',  icon: '⚙️' },
];

const activePage = computed(() => {
  switch (ui.activeTab) {
    case 'schedule':  return SchedulePage;
    case 'docs':      return DocsPage;
    case 'settings':  return SettingsPage;
    case 'dashboard':
    default:          return DashboardPage;
  }
});

// ─── CSV export ───────────────────────────────────────────────────────────────
function handleExport(): void {
  try {
    budget.exportCSV();
    toast.show('CSV exported.', 'success');
  } catch (err) {
    toast.show('Export failed: ' + (err instanceof Error ? err.message : String(err)), 'danger');
  }
}

// ─── Section picker ───────────────────────────────────────────────────────────
const sectionPickerOpen = ref(false);

// ─── CSV import ───────────────────────────────────────────────────────────────
const fileInputRef    = ref<HTMLInputElement | null>(null);
const jsonFileInputRef = ref<HTMLInputElement | null>(null);

function openImportPicker(): void {
  fileInputRef.value?.click();
}

function handleFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      if (!window.confirm('Import this CSV? This will replace all current data.')) {
        input.value = '';
        return;
      }
      budget.importCSV(text);
      toast.show('CSV imported successfully.', 'success');
    } catch (err) {
      toast.show('Import failed: ' + (err instanceof Error ? err.message : String(err)), 'danger');
    } finally {
      input.value = '';
    }
  };
  reader.onerror = () => {
    toast.show('Could not read the file.', 'danger');
    input.value = '';
  };
  reader.readAsText(file);
}

// ─── JSON export ──────────────────────────────────────────────────────────────
function handleJSONExport(): void {
  try {
    budget.exportJSON();
    toast.show('JSON backup downloaded.', 'success');
  } catch (err) {
    toast.show('Export failed: ' + (err instanceof Error ? err.message : String(err)), 'danger');
  }
}

// ─── JSON import ──────────────────────────────────────────────────────────────
function openJSONImportPicker(): void {
  jsonFileInputRef.value?.click();
}

function handleJSONFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      if (!window.confirm('Import this JSON backup? This will replace all current data.')) {
        input.value = '';
        return;
      }
      budget.importJSON(text);
      toast.show('JSON backup imported successfully.', 'success');
    } catch (err) {
      toast.show('Import failed: ' + (err instanceof Error ? err.message : String(err)), 'danger');
    } finally {
      input.value = '';
    }
  };
  reader.onerror = () => {
    toast.show('Could not read the file.', 'danger');
    input.value = '';
  };
  reader.readAsText(file);
}

// ─── Keyboard shortcut help panel ─────────────────────────────────────────────
const showShortcutHelp = ref(false);

const shortcuts = [
  { combo: '?',   description: 'Show / hide this panel' },
  { combo: '1',   description: 'Switch to Dashboard' },
  { combo: '2',   description: 'Switch to Schedule' },
  { combo: '3',   description: 'Switch to Docs' },
  { combo: '4',   description: 'Switch to Settings' },
  { combo: 'G',   description: 'Open section picker (jump to section)' },
  { combo: 'E',   description: 'Export CSV' },
  { combo: 'T',   description: 'Toggle light / dark theme' },
];

// ─── Global shortcuts (guarded from inputs) ────────────────────────────────
useKeyboard('?', () => { showShortcutHelp.value = !showShortcutHelp.value; }, { guardFromInputs: true });
useKeyboard('1', () => { ui.setActiveTab('dashboard'); },                    { guardFromInputs: true });
useKeyboard('2', () => { ui.setActiveTab('schedule'); },                     { guardFromInputs: true });
useKeyboard('3', () => { ui.setActiveTab('docs'); },                         { guardFromInputs: true });
useKeyboard('4', () => { ui.setActiveTab('settings'); },                     { guardFromInputs: true });
useKeyboard('e', () => { handleExport(); },                                          { guardFromInputs: true });
useKeyboard('t', () => { theme.toggle(); },                                          { guardFromInputs: true });
useKeyboard('g', () => { sectionPickerOpen.value = !sectionPickerOpen.value; },      { guardFromInputs: true });

// ─── 9B: Swipe to change tab on mobile ────────────────────────────────────
const TAB_ORDER: TabId[] = ['dashboard', 'schedule', 'docs', 'settings'];
const appMainRef = ref<HTMLElement | null>(null);

useSwipe(
  appMainRef,
  () => {
    // Swipe left → next tab
    const idx = TAB_ORDER.indexOf(ui.activeTab);
    if (idx < TAB_ORDER.length - 1) ui.setActiveTab(TAB_ORDER[idx + 1]);
  },
  () => {
    // Swipe right → previous tab
    const idx = TAB_ORDER.indexOf(ui.activeTab);
    if (idx > 0) ui.setActiveTab(TAB_ORDER[idx - 1]);
  },
);
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <!-- Brand -->
      <div class="app-header__brand">
        <span
          class="app-header__icon"
          aria-hidden="true"
        >💸</span>
        <h1 class="app-header__title">
          A Penny For Our Thoughts
        </h1>
      </div>

      <!-- Tab navigation -->
      <nav
        class="app-tabs"
        role="tablist"
        aria-label="Main sections"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="app-tab"
          :class="{ 'app-tab--active': ui.activeTab === tab.id }"
          role="tab"
          :aria-selected="ui.activeTab === tab.id"
          :aria-controls="`page-${tab.id}`"
          @click="ui.setActiveTab(tab.id)"
        >
          <span
            class="app-tab__icon"
            aria-hidden="true"
          >{{ tab.icon }}</span>
          <span class="app-tab__label">{{ tab.label }}</span>
        </button>

        <!-- Section picker button — not a tab, opens jump-to panel -->
        <button
          class="app-tab app-tab--sections"
          :class="{ 'app-tab--active': sectionPickerOpen }"
          title="Jump to section (G)"
          aria-label="Open section picker"
          @click="sectionPickerOpen = !sectionPickerOpen"
        >
          <span
            class="app-tab__icon"
            aria-hidden="true"
          >⊞</span>
          <span class="app-tab__label">Sections</span>
        </button>
      </nav>

      <!-- Toolbar: CSV + shortcuts + theme -->
      <div
        class="app-toolbar"
        role="toolbar"
        aria-label="App actions"
      >
        <!-- CSV export -->
        <button
          class="app-toolbar-btn"
          title="Export all data as CSV (E)"
          aria-label="Export CSV"
          @click="handleExport"
        >
          ⬆
        </button>

        <!-- CSV import -->
        <button
          class="app-toolbar-btn"
          title="Import data from CSV file"
          aria-label="Import CSV"
          @click="openImportPicker"
        >
          ⬇
        </button>

        <!-- Divider -->
        <span
          class="app-toolbar-divider"
          aria-hidden="true"
        />

        <!-- JSON export -->
        <button
          class="app-toolbar-btn"
          title="Export full backup as JSON"
          aria-label="Export JSON backup"
          @click="handleJSONExport"
        >
          📦
        </button>

        <!-- JSON import -->
        <button
          class="app-toolbar-btn"
          title="Restore from JSON backup"
          aria-label="Import JSON backup"
          @click="openJSONImportPicker"
        >
          📂
        </button>

        <!-- Hidden file input (CSV — trigger via openImportPicker) -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".csv"
          class="app-file-input"
          aria-hidden="true"
          tabindex="-1"
          @change="handleFileChange"
        >

        <!-- Hidden file input (JSON — trigger via openJSONImportPicker) -->
        <input
          ref="jsonFileInputRef"
          type="file"
          accept=".json"
          class="app-file-input"
          aria-hidden="true"
          tabindex="-1"
          @change="handleJSONFileChange"
        >

        <!-- Shortcut help -->
        <button
          class="app-toolbar-btn"
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
          @click="showShortcutHelp = true"
        >
          ?
        </button>

        <!-- Theme toggle -->
        <button
          class="app-theme-toggle"
          :aria-label="`Switch to ${theme.isDark ? 'light' : 'dark'} mode`"
          :title="`Switch to ${theme.isDark ? 'light' : 'dark'} mode (T)`"
          @click="theme.toggle"
        >
          {{ theme.isDark ? '🌙' : '☀️' }}
        </button>
      </div>
    </header>

    <main
      :id="`page-${ui.activeTab}`"
      ref="appMainRef"
      class="app-main"
      role="tabpanel"
    >
      <!-- 10D: What's New banner — shown until user dismisses for this version -->
      <WhatsNewBanner />

      <component :is="activePage" />
    </main>

    <ToastContainer />

    <!-- 13: Section picker panel -->
    <SectionPicker v-model:open="sectionPickerOpen" />

    <!-- 10B: First-run onboarding stepper -->
    <OnboardingModal
      v-if="budget.isFirstRun"
      @done="budget.completeOnboarding()"
    />

    <!-- Keyboard shortcut help panel -->
    <BaseModal
      v-model:open="showShortcutHelp"
      title="Keyboard Shortcuts"
      size="sm"
    >
      <table class="shortcut-table">
        <tbody>
          <tr
            v-for="s in shortcuts"
            :key="s.combo"
          >
            <td>
              <kbd class="shortcut-kbd">{{ s.combo }}</kbd>
            </td>
            <td class="shortcut-desc">
              {{ s.description }}
            </td>
          </tr>
        </tbody>
      </table>
    </BaseModal>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--bg, #0d1117);
  color: var(--text, #e3e6ee);
  display: flex;
  flex-direction: column;
}

/* ─── Header ──────────────────────────────────────────────────── */
.app-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1.5rem;
  padding: 0.85rem 1.5rem;
  background: var(--surface, #0a1810);
  border-bottom: 1px solid var(--border, #2a3041);
  position: sticky;
  top: 0;
  z-index: 50;
}

/* ─── Toolbar ─────────────────────────────────────────────────── */
.app-toolbar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.app-toolbar-btn {
  background: var(--surface2, #0f2018);
  border: 1px solid var(--border, #2a3041);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--muted, #5a7a63);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, background 0.15s ease;
}
.app-toolbar-btn:hover {
  color: var(--text, #e3e6ee);
  background: var(--surface2, #0f2018);
  filter: brightness(1.15);
}
.app-toolbar-btn:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

/* Hide the real file inputs — triggered programmatically */
.app-file-input {
  display: none;
}

.app-toolbar-divider {
  display: inline-block;
  width: 1px;
  height: 20px;
  background: var(--border, #2a3041);
  margin: 0 0.1rem;
  flex-shrink: 0;
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.app-header__icon {
  font-size: 1.5rem;
}
.app-header__title {
  margin: 0;
  /* 9E: fluid type — scales smoothly from 0.9rem @ 320px to 1.05rem @ 1024px */
  font-size: clamp(0.9rem, 2.5vw, 1.05rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

/* ─── Tabs ────────────────────────────────────────────────────── */
.app-tabs {
  display: flex;
  gap: 0.25rem;
  justify-content: center;
  /* Prevent tab clipping at intermediate viewport widths */
  overflow-x: auto;
  scrollbar-width: none;
}
.app-tabs::-webkit-scrollbar { display: none; }

.app-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  color: var(--muted, #5a7a63);
  border: 0;
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  font-size: 0.92rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  position: relative; /* needed for the ::before active indicator on mobile */
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.app-tab:hover {
  color: var(--text, #e3e6ee);
  background: var(--surface2, #0f2018);
}

.app-tab--active {
  color: var(--accent, #4ade80);
  background: var(--surface2, #0f2018);
}

.app-tab:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

/* ─── Theme toggle ────────────────────────────────────────────── */
.app-theme-toggle {
  background: var(--surface2, #0f2018);
  border: 1px solid var(--border, #2a3041);
  border-radius: 8px;
  width: 40px;
  height: 40px;
  font-size: 1.2rem;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    filter 0.2s ease;
}
.app-theme-toggle:hover {
  filter: brightness(1.15);
  transform: scale(1.05);
}
.app-theme-toggle:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

/* ─── Main page area ─────────────────────────────────────────── */
.app-main {
  padding: 1.25rem 1.5rem 3rem;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

/* ─── Shortcut help table ─────────────────────────────────────── */
.shortcut-table {
  width: 100%;
  border-collapse: collapse;
}
.shortcut-table tr + tr td {
  border-top: 1px solid var(--border, #2a3041);
}
.shortcut-table td {
  padding: 0.5rem 0.25rem;
  vertical-align: middle;
}
.shortcut-kbd {
  display: inline-block;
  background: var(--surface2, #0f2018);
  border: 1px solid var(--border, #2a3041);
  border-radius: 5px;
  padding: 0.15rem 0.5rem;
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  color: var(--accent, #4ade80);
  white-space: nowrap;
  min-width: 2rem;
  text-align: center;
}
.shortcut-desc {
  padding-left: 0.75rem;
  font-size: 0.875rem;
  color: var(--muted, #5a7a63);
}

/* ─── Responsive ──────────────────────────────────────────────── */
@media (max-width: 768px) {
  .app-header {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 0.5rem 0.75rem;
    padding: 0.75rem 1rem;
  }
  /* Pin brand to row 1 col 1, toolbar to row 1 col 2, tabs to row 2 full-width.
     Without explicit placement the toolbar (which appears after tabs in source)
     would overflow to row 3 because .app-tabs already spans 1/-1 in row 2. */
  .app-header__brand {
    grid-row: 1;
    grid-column: 1;
  }
  .app-toolbar {
    grid-row: 1;
    grid-column: 2;
  }
  .app-tabs {
    grid-row: 2;
    grid-column: 1 / -1;
    justify-content: flex-start;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .app-tabs::-webkit-scrollbar {
    display: none;
  }
  .app-main {
    padding: 1rem 1rem 3rem;
  }
}

@media (max-width: 540px) {
  /* ─── Header: collapse to single row — tabs move to bottom nav ─ */
  .app-header {
    grid-template-rows: auto;
    padding: 0.6rem 0.75rem;
  }
  /* Keep header compact with tabs gone */
  .app-header__title {
    display: none;
  }

  /* ─── Bottom navigation bar ─────────────────────────────────── */
  .app-tabs {
    /* Take out of header grid flow */
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    /* Styling */
    background: var(--surface, #0a1810);
    border-top: 1px solid var(--border, #2a3041);
    border-radius: 0;
    /* Safe area inset for iPhone home indicator */
    padding: 0 0 env(safe-area-inset-bottom, 0px);
    /* Layout */
    justify-content: stretch;
    overflow: visible;
    gap: 0;
  }
  .app-tabs::-webkit-scrollbar {
    display: none;
  }

  /* Tab items: icon stacked above label, equal width */
  .app-tab {
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    padding: 0.45rem 0.2rem 0.5rem;
    min-height: 54px;
    border-radius: 0;
  }

  .app-tab__icon {
    font-size: 1.3rem;
    line-height: 1;
  }

  /* Show labels in the bottom bar (overrides the generic mobile hide) */
  .app-tab__label {
    display: block;
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1;
  }

  /* Active indicator: accent dot above active tab */
  .app-tab--active::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 2px;
    background: var(--accent, #4ade80);
    border-radius: 0 0 2px 2px;
  }

  /* Pad main content so nothing hides behind the fixed bottom nav */
  .app-main {
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  }

  /* Touch targets for toolbar buttons */
  .app-toolbar-btn {
    width: 44px;
    height: 44px;
    font-size: 0.9rem;
  }
  .app-theme-toggle {
    width: 44px;
    height: 44px;
  }
}

/* ─── prefers-reduced-motion ──────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .app-tab,
  .app-toolbar-btn,
  .app-theme-toggle {
    transition: none;
  }
}
</style>
