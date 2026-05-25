<!--
  Module:   App.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration)
  Modified: May 2026 — Sprint 5 (CSV toolbar, keyboard shortcuts)
            May 2026 — Sprint 10 (onboarding, what's new banner)
            May 2026 — Sprint 25 (Advanced tab; Option B floating section handle)
  Summary:  Root layout. Header (title + tab bar + theme toggle), page slot
            routed via ui store's activeTab. A fixed floating handle on the
            right edge opens the SectionPicker panel (Option B pattern).

  Keyboard shortcuts (global, guarded from inputs):
    ?           — toggle keyboard-shortcut help panel
    1 / 2 / 3 / 4 / 5 — switch to Dashboard / Schedule / Docs / Settings / Advanced
    E           — export CSV
    G           — open section picker (jump to section)
    T           — toggle theme
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
import SchedulePage  from '@/components/pages/SchedulePage.vue';
import DocsPage      from '@/components/pages/DocsPage.vue';
import SettingsPage  from '@/components/pages/SettingsPage.vue';
import AdvancedPage  from '@/components/pages/AdvancedPage.vue';
import ToastContainer   from '@/components/ui/ToastContainer.vue';
import BaseModal        from '@/components/ui/BaseModal.vue';
import SectionPicker    from '@/components/ui/SectionPicker.vue';
import UserMenu         from '@/components/ui/UserMenu.vue';
import OnboardingModal  from '@/components/onboarding/OnboardingModal.vue';
import WhatsNewBanner   from '@/components/onboarding/WhatsNewBanner.vue';
import LoginPage        from '@/components/auth/LoginPage.vue';
import { useAuthStore } from '@/stores/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

const theme  = useThemeStore();
const ui     = useUiStore();
const budget = useBudgetStore();
const auth   = useAuthStore();
const toast  = useToast();

const supabaseEnabled = isSupabaseConfigured();

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
  { id: 'advanced',  label: 'Advanced',  icon: '📊' },
];

const activePage = computed(() => {
  switch (ui.activeTab) {
    case 'schedule':  return SchedulePage;
    case 'docs':      return DocsPage;
    case 'settings':  return SettingsPage;
    case 'advanced':  return AdvancedPage;
    case 'dashboard':
    default:          return DashboardPage;
  }
});

// ─── CSV export (keyboard shortcut E — buttons now in Settings → Data Management)
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

// ─── Keyboard shortcut help panel ─────────────────────────────────────────────
const showShortcutHelp = ref(false);

const shortcuts = [
  { combo: '?',   description: 'Show / hide this panel' },
  { combo: '1',   description: 'Switch to Dashboard' },
  { combo: '2',   description: 'Switch to Schedule' },
  { combo: '3',   description: 'Switch to Docs' },
  { combo: '4',   description: 'Switch to Settings' },
  { combo: '5',   description: 'Switch to Advanced' },
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
useKeyboard('5', () => { ui.setActiveTab('advanced'); },                     { guardFromInputs: true });
useKeyboard('e', () => { handleExport(); },                                  { guardFromInputs: true });
useKeyboard('t', () => { theme.toggle(); },                                  { guardFromInputs: true });
useKeyboard('g', () => { sectionPickerOpen.value = !sectionPickerOpen.value; }, { guardFromInputs: true });

// ─── Swipe to change tab on mobile ────────────────────────────────────────
const TAB_ORDER: TabId[] = ['dashboard', 'schedule', 'docs', 'settings', 'advanced'];
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
  <!-- Auth loading — brief spinner while Supabase resolves the session -->
  <div
    v-if="supabaseEnabled && auth.loading"
    class="auth-loading"
    aria-label="Loading"
    role="status"
  >
    <span
      class="auth-loading__emoji"
      aria-hidden="true"
    >💸</span>
    <span class="auth-loading__text">Loading…</span>
  </div>

  <!-- Login page — shown when Supabase is configured but no session -->
  <LoginPage v-else-if="supabaseEnabled && !auth.user" />

  <!-- Main app shell -->
  <div
    v-else
    class="app-shell"
  >
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
      </nav>

      <!-- Toolbar: shortcuts + theme + user menu -->
      <div
        class="app-toolbar"
        role="toolbar"
        aria-label="App actions"
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

        <!-- User menu (only when signed in via Supabase) -->
        <UserMenu v-if="supabaseEnabled && auth.user" />
      </div>
    </header>

    <main
      :id="`page-${ui.activeTab}`"
      ref="appMainRef"
      class="app-main"
      role="tabpanel"
    >
      <!-- What's New banner — shown until user dismisses for this version -->
      <WhatsNewBanner />

      <component :is="activePage" />
    </main>

    <ToastContainer />

    <!-- ── Option B: Floating section handle ───────────────────────── -->
    <!-- Fixed pill on the right edge — opens the SectionPicker panel  -->
    <button
      class="section-handle"
      :class="{ 'section-handle--open': sectionPickerOpen }"
      aria-label="Open section picker (G)"
      title="Manage sections (G)"
      @click="sectionPickerOpen = !sectionPickerOpen"
    >
      <span
        class="section-handle__icon"
        aria-hidden="true"
      >⊞</span>
      <span
        class="section-handle__text"
        aria-hidden="true"
      >SECTIONS</span>
    </button>

    <!-- Section picker panel (opened by handle above) -->
    <SectionPicker v-model:open="sectionPickerOpen" />

    <!-- First-run onboarding stepper -->
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
  </div><!-- end v-else app-shell -->
</template>

<style scoped>
/* ─── Auth loading overlay ────────────────────────────────────────── */
.auth-loading {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: var(--bg, #0d1117);
  color: var(--muted, #6b7a99);
}
.auth-loading__emoji { font-size: 2.5rem; }
.auth-loading__text  { font-size: 0.9rem; letter-spacing: 0.05em; }

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
  position: relative;
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
  /* Right padding accommodates the floating section handle */
  padding-right: calc(1.5rem + 36px);
}

/* ─── Option B: Floating section handle ──────────────────────── */
.section-handle {
  position: fixed;
  right: 0;
  top: 40%;
  transform: translateY(-50%);
  z-index: 100;

  /* Size */
  width: 32px;
  height: 88px;
  padding: 0;

  /* Appearance */
  background: var(--surface, #0a1810);
  border: 1px solid var(--border, #2a3041);
  border-right: none;
  border-radius: 8px 0 0 8px;

  /* Accent left glow */
  border-left: 2px solid var(--accent, #4ade80);
  box-shadow: -2px 0 12px rgba(74, 222, 128, 0.12);

  /* Layout */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;

  cursor: pointer;
  color: var(--muted, #6b7a99);
  transition:
    background 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;

  /* Breathing pulse when closed */
  animation: handle-pulse 4s ease-in-out infinite;
}

.section-handle:hover,
.section-handle--open {
  background: var(--surface2, #0f2018);
  color: var(--accent, #4ade80);
  box-shadow: -2px 0 18px rgba(74, 222, 128, 0.25);
  animation: none;
}

.section-handle:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
  animation: none;
}

.section-handle__icon {
  font-size: 1.05rem;
  line-height: 1;
}

.section-handle__text {
  font-size: 0.48rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  line-height: 1;
  white-space: nowrap;
}

@keyframes handle-pulse {
  0%, 100% { box-shadow: -2px 0 12px rgba(74, 222, 128, 0.12); }
  50%       { box-shadow: -2px 0 20px rgba(74, 222, 128, 0.28); }
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
    padding-right: calc(1rem + 36px);
  }
}

@media (max-width: 540px) {
  /* ─── Header: collapse to single row — tabs move to bottom nav ─ */
  .app-header {
    grid-template-rows: auto;
    padding: 0.6rem 0.75rem;
  }
  .app-header__title {
    display: none;
  }

  /* ─── Bottom navigation bar ─────────────────────────────────── */
  .app-tabs {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: var(--surface, #0a1810);
    border-top: 1px solid var(--border, #2a3041);
    border-radius: 0;
    padding: 0 0 env(safe-area-inset-bottom, 0px);
    justify-content: stretch;
    overflow: visible;
    gap: 0;
  }
  .app-tabs::-webkit-scrollbar {
    display: none;
  }

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
    padding-right: 1rem; /* no handle offset needed — handle becomes FAB */
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

  /* ── Floating handle → compact FAB above bottom nav ─────────── */
  .section-handle {
    /* FAB in bottom-right, above bottom nav */
    top: auto;
    bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 12px);
    right: 12px;
    transform: none;

    /* Circular shape */
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--border, #2a3041);
    border-left: 2px solid var(--accent, #4ade80);

    /* Hide the SECTIONS text — icon only */
    gap: 0;
  }

  .section-handle__text {
    display: none;
  }

  .section-handle__icon {
    font-size: 1.2rem;
  }
}

/* ─── prefers-reduced-motion ──────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .app-tab,
  .app-toolbar-btn,
  .app-theme-toggle,
  .section-handle {
    transition: none;
    animation: none;
  }
}
</style>
