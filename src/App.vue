<!--
  Module:   App.vue
  Project:  A Penny For Our Thoughts
  Modified: May 2026 — Vue 3 migration (Sprint 0)
            May 2026 — Sprint 5 (CSV toolbar, keyboard shortcuts)
            May 2026 — Sprint 10 (onboarding, what's new banner)
            May 2026 — Sprint 25 (Advanced tab; Option B floating section handle)
            May 2026 — Redesign Sprint 2 (sidebar nav, 6-tab set, BottomNav)
  Summary:  Root layout. Slim 64px icon sidebar (AppSidebar) + scrollable
            main column. Mobile (≤768px): sidebar hidden, BottomNav fixed
            to bottom edge. Page routed via ui store's activeTab.
            A fixed floating handle on the right edge opens SectionPicker.

  Keyboard shortcuts (global, guarded from inputs):
    ?           — toggle keyboard-shortcut help panel
    1 / 2 / 3 / 4 / 5 / 6 / 7 — switch Dashboard / Schedule / Spending /
                                  Goals / Docs / Settings / Advanced
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
import SpendingPage  from '@/components/pages/SpendingPage.vue';
import GoalsPage     from '@/components/pages/GoalsPage.vue';
import DocsPage      from '@/components/pages/DocsPage.vue';
import SettingsPage  from '@/components/pages/SettingsPage.vue';
import AdvancedPage  from '@/components/pages/AdvancedPage.vue';

import ToastContainer   from '@/components/ui/ToastContainer.vue';
import BaseModal        from '@/components/ui/BaseModal.vue';
import SectionPicker    from '@/components/ui/SectionPicker.vue';
import UserMenu         from '@/components/ui/UserMenu.vue';
import AppSidebar       from '@/components/ui/AppSidebar.vue';
import BottomNav        from '@/components/ui/BottomNav.vue';
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

// ─── Page routing ─────────────────────────────────────────────────────────────
const activePage = computed(() => {
  switch (ui.activeTab) {
    case 'schedule':  return SchedulePage;
    case 'spending':  return SpendingPage;
    case 'goals':     return GoalsPage;
    case 'docs':      return DocsPage;
    case 'settings':  return SettingsPage;
    case 'advanced':  return AdvancedPage;
    case 'dashboard':
    default:          return DashboardPage;
  }
});

// ─── CSV export (keyboard shortcut E)  ────────────────────────────────────────
function handleExport(): void {
  try {
    budget.exportCSV();
    toast.show('CSV exported.', 'success');
  } catch (err) {
    toast.show('Export failed: ' + (err instanceof Error ? err.message : String(err)), 'danger');
  }
}

// ─── Section picker ───────────────────────────────────────────────────────────
// State lives in ui store so DashboardPage can open it via "Manage widgets" button.

// ─── Keyboard shortcut help panel ─────────────────────────────────────────────
const showShortcutHelp = ref(false);

const shortcuts = [
  { combo: '?',   description: 'Show / hide this panel' },
  { combo: '1',   description: 'Switch to Dashboard' },
  { combo: '2',   description: 'Switch to Schedule' },
  { combo: '3',   description: 'Switch to Spending' },
  { combo: '4',   description: 'Switch to Goals' },
  { combo: '5',   description: 'Switch to Docs' },
  { combo: '6',   description: 'Switch to Settings' },
  { combo: '7',   description: 'Switch to Advanced' },
  { combo: 'G',   description: 'Open section picker (jump to section)' },
  { combo: 'E',   description: 'Export CSV' },
  { combo: 'T',   description: 'Toggle light / dark theme' },
];

// ─── Global shortcuts (guarded from inputs) ────────────────────────────────
useKeyboard('?', () => { showShortcutHelp.value = !showShortcutHelp.value; }, { guardFromInputs: true });
useKeyboard('1', () => { ui.setActiveTab('dashboard'); },                    { guardFromInputs: true });
useKeyboard('2', () => { ui.setActiveTab('schedule'); },                     { guardFromInputs: true });
useKeyboard('3', () => { ui.setActiveTab('spending'); },                     { guardFromInputs: true });
useKeyboard('4', () => { ui.setActiveTab('goals'); },                        { guardFromInputs: true });
useKeyboard('5', () => { ui.setActiveTab('docs'); },                         { guardFromInputs: true });
useKeyboard('6', () => { ui.setActiveTab('settings'); },                     { guardFromInputs: true });
useKeyboard('7', () => { ui.setActiveTab('advanced'); },                     { guardFromInputs: true });
useKeyboard('e', () => { handleExport(); },                                  { guardFromInputs: true });
useKeyboard('t', () => { theme.toggle(); },                                  { guardFromInputs: true });
useKeyboard('g', () => { ui.toggleSectionPicker(); }, { guardFromInputs: true });

// ─── Swipe to change tab on mobile ────────────────────────────────────────
const TAB_ORDER: TabId[] = ['dashboard', 'schedule', 'spending', 'goals', 'docs', 'settings'];
const appMainRef = ref<HTMLElement | null>(null);

useSwipe(
  appMainRef,
  () => {
    // Swipe left → next tab
    const idx = TAB_ORDER.indexOf(ui.activeTab as TabId);
    if (idx >= 0 && idx < TAB_ORDER.length - 1) ui.setActiveTab(TAB_ORDER[idx + 1]);
  },
  () => {
    // Swipe right → previous tab
    const idx = TAB_ORDER.indexOf(ui.activeTab as TabId);
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

  <!-- Main app shell: sidebar + content column -->
  <div
    v-else
    class="app-shell"
  >
    <!-- ── Sidebar (desktop) ──────────────────────────────── -->
    <AppSidebar />

    <!-- ── Content column (header + page area) ───────────── -->
    <div class="app-content">
      <!-- Top header strip: title + toolbar -->
      <header class="app-header">
        <div class="app-header__brand">
          <span
            class="app-header__icon"
            aria-hidden="true"
          >💸</span>
          <h1 class="app-header__title">A Penny For Our Thoughts</h1>
        </div>

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

          <!-- User menu (Supabase only, sidebar already has theme toggle) -->
          <UserMenu v-if="supabaseEnabled && auth.user" />
        </div>
      </header>

      <!-- Page content -->
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
    </div>

    <!-- ── Bottom nav (mobile ≤768px) ────────────────────── -->
    <BottomNav />

    <ToastContainer />

    <!-- ── Option B: Floating section handle ───────────────── -->
    <button
      class="section-handle"
      :class="{ 'section-handle--open': ui.sectionPickerOpen }"
      aria-label="Open section picker (G)"
      title="Manage sections (G)"
      @click="ui.toggleSectionPicker()"
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

    <!-- Section picker panel -->
    <SectionPicker
      :open="ui.sectionPickerOpen"
      @update:open="(v) => v ? ui.openSectionPicker() : ui.closeSectionPicker()"
    />

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
  background: var(--bg);
  color: var(--muted);
}
.auth-loading__emoji { font-size: 2.5rem; }
.auth-loading__text  { font-size: 0.9rem; letter-spacing: 0.05em; }

/* ─── App shell: sidebar + content side-by-side ───────────────── */
.app-shell {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: row;
}

/* ─── Content column ──────────────────────────────────────────── */
.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;          /* prevent flex blowout */
  overflow: hidden;
}

/* ─── Top header strip (no tabs — just brand + toolbar) ────────── */
.app-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 40;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.app-header__icon {
  font-size: 1.4rem;
}

.app-header__title {
  margin: 0;
  font-size: clamp(0.88rem, 2vw, 1rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: var(--text);
}

/* ─── Toolbar ─────────────────────────────────────────────────── */
.app-toolbar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
}

.app-toolbar-btn {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.app-toolbar-btn:hover {
  color: var(--text);
}

.app-toolbar-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ─── Main page area ─────────────────────────────────────────── */
.app-main {
  flex: 1;
  padding: 1.75rem 2rem 5rem;
  max-width: 1280px;
  width: 100%;
  box-sizing: border-box;
  /* Right margin for the floating section handle */
  padding-right: calc(2rem + 40px);
}

/* ─── Option B: Floating section handle ──────────────────────── */
.section-handle {
  position: fixed;
  right: 0;
  top: 40%;
  transform: translateY(-50%);
  z-index: 100;

  width: 32px;
  height: 88px;
  padding: 0;

  background: var(--surface);
  border: 1px solid var(--border);
  border-right: none;
  border-radius: 8px 0 0 8px;
  border-left: 2px solid var(--accent);
  box-shadow: -2px 0 12px var(--accent-soft);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;

  cursor: pointer;
  color: var(--muted);
  transition: background var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
  animation: handle-pulse 4s ease-in-out infinite;
}

.section-handle:hover,
.section-handle--open {
  background: var(--surface2);
  color: var(--accent);
  box-shadow: -2px 0 18px var(--accent-soft);
  animation: none;
}

.section-handle:focus-visible {
  outline: 2px solid var(--accent);
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
  0%, 100% { box-shadow: -2px 0 12px var(--accent-soft); }
  50%       { box-shadow: -2px 0 22px var(--accent-soft); }
}

/* ─── Shortcut help table ─────────────────────────────────────── */
.shortcut-table {
  width: 100%;
  border-collapse: collapse;
}
.shortcut-table tr + tr td {
  border-top: 1px solid var(--border);
}
.shortcut-table td {
  padding: 0.5rem 0.25rem;
  vertical-align: middle;
}
.shortcut-kbd {
  display: inline-block;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 0.15rem 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--accent);
  white-space: nowrap;
  min-width: 2rem;
  text-align: center;
}
.shortcut-desc {
  padding-left: 0.75rem;
  font-size: 0.875rem;
  color: var(--muted);
}

/* ─── Responsive ──────────────────────────────────────────────── */
@media (max-width: 768px) {
  .app-shell {
    flex-direction: column;
  }

  .app-header {
    padding: 0.65rem 1rem;
  }

  .app-main {
    padding: 1.25rem 1rem calc(54px + env(safe-area-inset-bottom, 0px) + 1.25rem);
    padding-right: calc(1rem + 36px); /* section handle */
  }
}

@media (max-width: 540px) {
  .app-header__title {
    display: none;
  }

  .app-main {
    padding-right: 1rem;
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 1rem);
  }

  /* Section handle → compact FAB above bottom nav */
  .section-handle {
    top: auto;
    bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 12px);
    right: 12px;
    transform: none;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--border);
    border-left: 2px solid var(--accent);
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
  .app-toolbar-btn,
  .section-handle {
    transition: none;
    animation: none;
  }
}
</style>
