<!--
  Module:   App.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration)
  Modified: May 2026 — Sprint 2 (real header + tabs + page switcher)
  Summary:  Root layout. Header (title + theme toggle), tab bar
            (Dashboard / Schedule / Docs), page slot routed via
            ui store's activeTab.
-->

<script setup lang="ts">
import { computed } from 'vue';
import { useThemeStore } from '@/stores/theme';
import { useUiStore } from '@/stores/ui';
import type { TabId } from '@/types/state';

import DashboardPage from '@/components/pages/DashboardPage.vue';
import SchedulePage from '@/components/pages/SchedulePage.vue';
import DocsPage from '@/components/pages/DocsPage.vue';
import ToastContainer from '@/components/ui/ToastContainer.vue';

const theme = useThemeStore();
const ui = useUiStore();

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'schedule',  label: 'Schedule',  icon: '📅' },
  { id: 'docs',      label: 'Docs',      icon: '📖' },
];

const activePage = computed(() => {
  switch (ui.activeTab) {
    case 'schedule':  return SchedulePage;
    case 'docs':      return DocsPage;
    case 'dashboard':
    default:          return DashboardPage;
  }
});
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-header__brand">
        <span
          class="app-header__icon"
          aria-hidden="true"
        >💸</span>
        <h1 class="app-header__title">
          A Penny For Our Thoughts
        </h1>
      </div>

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

      <button
        class="app-theme-toggle"
        :aria-label="`Switch to ${theme.isDark ? 'light' : 'dark'} mode`"
        :title="`Switch to ${theme.isDark ? 'light' : 'dark'} mode`"
        @click="theme.toggle"
      >
        {{ theme.isDark ? '🌙' : '☀️' }}
      </button>
    </header>

    <main
      :id="`page-${ui.activeTab}`"
      class="app-main"
      role="tabpanel"
    >
      <component :is="activePage" />
    </main>

    <ToastContainer />
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
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

/* ─── Tabs ────────────────────────────────────────────────────── */
.app-tabs {
  display: flex;
  gap: 0.25rem;
  justify-content: center;
}

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

/* ─── Responsive ──────────────────────────────────────────────── */
@media (max-width: 768px) {
  .app-header {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 0.5rem 1rem;
    padding: 0.75rem 1rem;
  }
  .app-tabs {
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
  .app-header__title {
    font-size: 0.95rem;
  }
  .app-tab__label {
    display: none;
  }
  .app-tab {
    padding: 0.4rem 0.6rem;
  }
}
</style>
