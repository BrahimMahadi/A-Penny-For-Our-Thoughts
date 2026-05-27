<!--
  Module:   App.vue
  Project:  A Penny For Our Thoughts
  Modified: May 2026 — Vue 3 migration (Sprint 0)
            May 2026 — Sprint 5 (CSV toolbar, keyboard shortcuts)
            May 2026 — Sprint 10 (onboarding, what's new banner)
            May 2026 — Sprint 25 (Advanced tab; Option B floating section handle)
            May 2026 — Redesign Sprint 2 (sidebar nav, 6-tab set, BottomNav)
            May 2026 — Redesign Sprint 3 (removed top header bar; full-width main)
            May 2026 — Redesign Sprint 8 (AppStatusBar wired above main)
            May 2026 — RS-18 (GSAP tab transitions)
  Summary:  Root layout. Slim 64px icon sidebar (AppSidebar) + scrollable
            full-width main column. AppStatusBar sits at the top of the content
            column (hidden on mobile). No top header bar — pages own their own
            headers. Mobile (≤768px): sidebar hidden, BottomNav fixed to bottom.
            Page routed via ui store's activeTab. A floating handle on the right
            edge opens SectionPicker.

  Keyboard shortcuts (global, guarded from inputs):
    ?           — toggle keyboard-shortcut help panel
    1 / 2 / 3 / 4 / 5 / 6 / 7 — switch Dashboard / Schedule / Spending /
                                  Goals / Docs / Settings / Advanced
    E           — export CSV
    G           — open section picker (jump to section)
    T           — toggle theme
-->

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useThemeStore } from '@/stores/theme';
import { useUiStore } from '@/stores/ui';
import { useGsap, prefersReducedMotion } from '@/composables/useGsap';
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
import AppSidebar       from '@/components/ui/AppSidebar.vue';
import AppStatusBar     from '@/components/ui/AppStatusBar.vue';
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
const { to, fromTo, raw: rawGsap } = useGsap();

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
// State lives in ui store so AppSidebar's ? button can toggle it.

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
useKeyboard('?', () => { ui.toggleShortcutHelp(); }, { guardFromInputs: true });
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

// ─── Tab transition ────────────────────────────────────────────────────────
// Track which direction the user is navigating so the slide goes the right way.
// Positive = moving forward in the tab order (new content slides in from right).
// Negative = moving backward (new content slides in from left).
const TAB_ORDER: TabId[] = ['dashboard', 'schedule', 'spending', 'goals', 'docs', 'settings'];
const tabDirection = ref(1);

watch(
  () => ui.activeTab as TabId,
  (newTab, oldTab) => {
    const prev = TAB_ORDER.indexOf(oldTab ?? 'dashboard');
    const next = TAB_ORDER.indexOf(newTab);
    tabDirection.value = next >= prev ? 1 : -1;
  },
);

// ── BUG-020 fix: pre-hide the entering element before the first paint so
// there is never a one-frame flash of the page at full opacity.
// Skip the hide for reduced-motion users — their animation is duration:0
// so they'll never see a flash anyway.
function onTabBeforeEnter(el: Element): void {
  if (!prefersReducedMotion()) {
    rawGsap.set(el as HTMLElement, { opacity: 0, x: tabDirection.value * 28 });
  }
}

// BUG-020 fix:
//   • Switch from gsap.from() → gsap.fromTo() so both start AND end states are
//     explicit. gsap.from() captures the target's current values as the "to"
//     state at call-time; if a prior interrupted animation left opacity:0 as an
//     inline style, the tween would animate 0→0 and the page would stay blank.
//   • Add onInterrupt: done so Vue's mode="out-in" is never left waiting for a
//     done() that was swallowed by a killed tween (happens on rapid tab switching).
//   • Add clearProps so GSAP's inline styles are removed on completion, returning
//     the element to its natural CSS state.
function onTabLeave(el: Element, done: () => void): void {
  to(el as HTMLElement, {
    x:          tabDirection.value * -28,
    opacity:    0,
    duration:   0.2,
    ease:       'power2.in',
    onComplete: done,
    onInterrupt: done,  // safety net: always unblock Vue's out-in mode
  });
}
function onTabEnter(el: Element, done: () => void): void {
  fromTo(
    el as HTMLElement,
    { x: tabDirection.value * 28, opacity: 0 },     // explicit start state
    {
      x:           0,
      opacity:     1,
      duration:    0.28,
      ease:        'power2.out',
      clearProps:  'opacity,x',                       // clean up after animation
      onComplete:  done,
      onInterrupt: done,                              // safety net
    },
  );
}

// ─── Swipe to change tab on mobile ────────────────────────────────────────
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

    <!-- ── Content column (status bar + page area) ─────────────── -->
    <div class="app-content">
      <!-- Status bar: recent purchases ticker + up-next bill (desktop only) -->
      <AppStatusBar />

      <!-- Page content -->
      <main
        :id="`page-${ui.activeTab}`"
        ref="appMainRef"
        class="app-main"
        role="tabpanel"
      >
        <!-- What's New banner — shown until user dismisses for this version -->
        <WhatsNewBanner />

        <Transition
          :css="false"
          mode="out-in"
          @before-enter="onTabBeforeEnter"
          @leave="onTabLeave"
          @enter="onTabEnter"
        >
          <component
            :is="activePage"
            :key="ui.activeTab"
          />
        </Transition>
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
      :open="ui.shortcutHelpOpen"
      title="Keyboard Shortcuts"
      size="sm"
      @update:open="(v) => v ? ui.openShortcutHelp() : ui.closeShortcutHelp()"
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


/* ─── Main page area — full-width, no max-width cap ────────────── */
.app-main {
  flex: 1;
  padding: 1.75rem 2rem 5rem;
  /* Right gutter accounts for the floating section handle (32px + gap) */
  padding-right: calc(2rem + 40px);
  /* Extra bottom room for the fixed AppStatusBar (36px + breathing space) */
  padding-bottom: calc(5rem + 44px);
  box-sizing: border-box;
  min-width: 0;
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

  .app-main {
    padding: 1.25rem 1rem calc(54px + env(safe-area-inset-bottom, 0px) + 1.25rem);
    padding-right: calc(1rem + 36px); /* section handle */
  }
}

@media (max-width: 540px) {
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
  .section-handle {
    transition: none;
    animation: none;
  }
}
</style>
