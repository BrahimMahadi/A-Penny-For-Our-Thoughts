<!--
  Module:   components/ui/AppSidebar.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Redesign Sprint 2)
  Summary:  Slim 64px icon sidebar. Replaces the legacy top-tab
            horizontal nav bar introduced in the original Vue 3 shell.

  Structure (top → bottom):
    ¢  Brand logo square (accent bg, white glyph)
    ◧  Dashboard
    ▥  Schedule
    ◐  Spending
    ◎  Goals
    ☰  Docs
    ◆  Settings
    [spacer]
    ?  Keyboard shortcuts help (→ ui.shortcutHelpOpen)
    ☀️  Theme toggle
    Bⓐ Avatar / UserMenu button (bottom)

  Active state: accent-soft bg + accent text color.
  Tooltip: native title attr on each button (keyboard-accessible).

  On mobile (≤ 768px) this component hides; BottomNav renders instead
  (handled by App.vue responsive rules / CSS).
-->

<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '@/stores/ui';
import { useThemeStore } from '@/stores/theme';
import { useAuthStore } from '@/stores/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import UserMenu from '@/components/ui/UserMenu.vue';
import type { TabId } from '@/types/state';

const ui    = useUiStore();
const theme = useThemeStore();
const auth  = useAuthStore();
const supabaseEnabled = isSupabaseConfigured();

interface NavItem {
  id: TabId;
  glyph: string;
  label: string;
}

// The 6 primary tabs shown in the sidebar.
// 'advanced' is intentionally omitted — accessible via keyboard shortcut only.
const navItems: NavItem[] = [
  { id: 'dashboard', glyph: '◧', label: 'Dashboard' },
  { id: 'schedule',  glyph: '▥', label: 'Schedule'  },
  { id: 'spending',  glyph: '◐', label: 'Spending'  },
  { id: 'goals',     glyph: '◎', label: 'Goals'     },
  { id: 'docs',      glyph: '☰', label: 'Docs'      },
  { id: 'settings',  glyph: '◆', label: 'Settings'  },
];

// User initials for the avatar button (falls back to "B")
const userInitial = computed(() => {
  if (supabaseEnabled && auth.user?.email) {
    return auth.user.email[0].toUpperCase();
  }
  return 'B';
});
</script>

<template>
  <aside
    class="app-sidebar"
    aria-label="Main navigation"
  >
    <!-- Brand logo -->
    <div
      class="app-sidebar__brand"
      aria-hidden="true"
    >¢</div>

    <!-- Primary nav -->
    <nav
      role="tablist"
      aria-label="Main sections"
      class="app-sidebar__nav"
    >
      <button
        v-for="item in navItems"
        :key="item.id"
        class="app-sidebar__btn"
        :class="{ 'app-sidebar__btn--active': ui.activeTab === item.id }"
        role="tab"
        :aria-selected="ui.activeTab === item.id"
        :title="item.label"
        :aria-label="item.label"
        @click="ui.setActiveTab(item.id)"
      >
        <span
          class="app-sidebar__glyph"
          aria-hidden="true"
        >{{ item.glyph }}</span>
      </button>
    </nav>

    <!-- Spacer pushes avatar to bottom -->
    <div class="app-sidebar__spacer" />

    <!-- Keyboard shortcuts help -->
    <button
      class="app-sidebar__btn app-sidebar__btn--icon-sm"
      title="Keyboard shortcuts (?)"
      aria-label="Keyboard shortcuts"
      @click="ui.toggleShortcutHelp()"
    >
      <span
        aria-hidden="true"
        class="app-sidebar__help-glyph"
      >?</span>
    </button>

    <!-- Theme toggle -->
    <button
      class="app-sidebar__btn app-sidebar__btn--icon-sm"
      :title="`Switch to ${theme.isDark ? 'light' : 'dark'} mode (T)`"
      :aria-label="`Switch to ${theme.isDark ? 'light' : 'dark'} mode`"
      @click="theme.toggle"
    >
      <span aria-hidden="true">{{ theme.isDark ? '🌙' : '☀️' }}</span>
    </button>

    <!-- User menu / avatar -->
    <UserMenu
      v-if="supabaseEnabled && auth.user"
      class="app-sidebar__usermenu"
    />
    <div
      v-else
      class="app-sidebar__avatar"
      aria-hidden="true"
    >
      {{ userInitial }}
    </div>
  </aside>
</template>

<style scoped>
/* ── Sidebar shell ──────────────────────────────────────────── */
.app-sidebar {
  width: 64px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 0 16px;
  gap: 4px;
  /* Sticky full-height column */
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 50;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

/* ── Brand logo ─────────────────────────────────────────────── */
.app-sidebar__brand {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 14px;
  flex-shrink: 0;
  user-select: none;
}

/* ── Nav container ──────────────────────────────────────────── */
.app-sidebar__nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

/* ── Icon buttons ───────────────────────────────────────────── */
.app-sidebar__btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  transition: background var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;
}

.app-sidebar__btn:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.app-sidebar__btn--active {
  background: var(--accent-soft);
  color: var(--accent);
}

.app-sidebar__btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Slightly smaller icon buttons (theme toggle, help) */
.app-sidebar__btn--icon-sm {
  font-size: 15px;
}

/* Help glyph — slightly bolder for readability */
.app-sidebar__help-glyph {
  font-size: 15px;
  font-weight: 700;
  font-family: var(--font-mono);
  line-height: 1;
}

/* ── Glyph ──────────────────────────────────────────────────── */
.app-sidebar__glyph {
  font-size: 16px;
  line-height: 1;
}

/* ── Spacer ─────────────────────────────────────────────────── */
.app-sidebar__spacer {
  flex: 1;
}

/* ── Avatar / UserMenu bottom ───────────────────────────────── */
.app-sidebar__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--surface2);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  flex-shrink: 0;
  user-select: none;
}

/* ── UserMenu override — make it fit sidebar ────────────────── */
.app-sidebar__usermenu {
  flex-shrink: 0;
}

/* ── Hide on mobile — bottom nav takes over ─────────────────── */
@media (max-width: 768px) {
  .app-sidebar {
    display: none;
  }
}
</style>
