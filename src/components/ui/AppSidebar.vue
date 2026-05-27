<!--
  Module:   components/ui/AppSidebar.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Redesign Sprint 2)
  Updated:  May 2026 (Redesign Sprint 10) — hover-expand: 64px → 220px overlay panel
  Summary:  Slim sidebar with hover-expand behaviour.

  Layout pattern — two-element wrapper:
    <aside class="app-sidebar">            ← 64px ghost spacer, stays in flex flow
      <div class="app-sidebar__panel">    ← position:fixed, visually expands on hover

  When the panel is hovered it widens to 220px (icon stays left, label fades in to
  the right).  Content behind the sidebar is never reflowed — the ghost spacer holds
  the 64px column, the fixed panel overlays on top.

  Collapsed  → icon only (40×40 buttons, centred glyphs)
  Expanded   → icon + label, left-aligned, 220px wide

  Structure (top → bottom inside the panel):
    ¢  Brand logo square
    ◧  Dashboard
    ▥  Schedule
    ◐  Spending
    ◎  Goals
    ☰  Docs
    ◆  Settings
    [spacer]
    ?  Keyboard shortcuts help
    ☀️  Theme toggle
    Bⓐ Avatar / UserMenu button

  On mobile (≤768px) the aside and panel both hide; BottomNav renders instead.
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
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

// ─── Hover-expand state ──────────────────────────────────────────
const isExpanded = ref(false);

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
  <!--
    Ghost spacer — holds the 64px column in the page's flex layout.
    The visible panel is position:fixed, so it doesn't affect flow.
  -->
  <aside
    class="app-sidebar"
    aria-label="Main navigation"
  >
    <!-- Fixed overlay panel — this is the visual sidebar -->
    <div
      class="app-sidebar__panel"
      :class="{ 'app-sidebar__panel--expanded': isExpanded }"
      @mouseenter="isExpanded = true"
      @mouseleave="isExpanded = false"
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
          <span class="app-sidebar__label">{{ item.label }}</span>
        </button>
      </nav>

      <!-- Spacer pushes utility buttons to bottom -->
      <div class="app-sidebar__spacer" />

      <!-- Keyboard shortcuts help -->
      <button
        class="app-sidebar__btn app-sidebar__btn--icon-sm"
        title="Keyboard shortcuts (?)"
        aria-label="Keyboard shortcuts"
        @click="ui.toggleShortcutHelp()"
      >
        <span
          class="app-sidebar__glyph app-sidebar__help-glyph"
          aria-hidden="true"
        >?</span>
        <span class="app-sidebar__label">Shortcuts</span>
      </button>

      <!-- Theme toggle -->
      <button
        class="app-sidebar__btn app-sidebar__btn--icon-sm"
        :title="`Switch to ${theme.isDark ? 'light' : 'dark'} mode (T)`"
        :aria-label="`Switch to ${theme.isDark ? 'light' : 'dark'} mode`"
        @click="theme.toggle"
      >
        <span
          class="app-sidebar__glyph"
          aria-hidden="true"
        >{{ theme.isDark ? '🌙' : '☀️' }}</span>
        <span class="app-sidebar__label">{{ theme.isDark ? 'Light mode' : 'Dark mode' }}</span>
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
    </div>
  </aside>
</template>

<style scoped>
/* ── Ghost spacer ───────────────────────────────────────────────
   Stays in the flex flow to reserve the 64px column.
   The fixed panel overlays on top — no layout shift on expand.
   ─────────────────────────────────────────────────────────────── */
.app-sidebar {
  width: 64px;
  flex-shrink: 0;

  /* ── Hide on mobile — bottom nav takes over ─────────────────── */
  @media (max-width: 768px) {
    display: none;
  }
}

/* ── Fixed overlay panel ────────────────────────────────────────
   Visually expands from 64px to 220px on hover.
   ─────────────────────────────────────────────────────────────── */
.app-sidebar__panel {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 50;

  width: 64px;
  overflow: hidden;

  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 18px 0 16px;
  gap: 4px;

  transition:
    width 220ms cubic-bezier(0.4, 0, 0.2, 1),
    background var(--transition-fast),
    border-color var(--transition-fast);

  @media (max-width: 768px) {
    display: none;
  }
}

.app-sidebar__panel--expanded {
  width: 220px;
  /* Subtle shadow to lift panel above content */
  box-shadow: 2px 0 16px rgba(0, 0, 0, 0.12);
}

/* ── Brand logo ─────────────────────────────────────────────────
   Stays centred in the 64px column even when panel is wider.
   ─────────────────────────────────────────────────────────────── */
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
  /* Left-indent matches icon centre: (64px - 36px) / 2 = 14px */
  margin: 0 0 14px 14px;
  flex-shrink: 0;
  user-select: none;
}

/* ── Nav container ──────────────────────────────────────────────── */
.app-sidebar__nav {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  width: 100%;
}

/* ── Icon buttons ────────────────────────────────────────────────
   Each button is a flex row: glyph (fixed 40px) + label (fades in).
   ─────────────────────────────────────────────────────────────── */
.app-sidebar__btn {
  /* Full row width so active bg fills the expanded panel */
  width: 100%;
  min-height: 40px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  color: var(--muted);
  transition: background var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;
  /* Horizontal overflow guard */
  overflow: hidden;
  white-space: nowrap;
  /* Slight rounding inside the sidebar */
  border-radius: 0;
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
  outline-offset: -2px;
}

/* Slightly smaller icon buttons (theme toggle, help) */
.app-sidebar__btn--icon-sm {
  font-size: 15px;
}

/* ── Glyph cell ─────────────────────────────────────────────────
   Fixed 64px wide column so icon stays centred regardless of
   whether the panel is collapsed or expanded.
   ─────────────────────────────────────────────────────────────── */
.app-sidebar__glyph {
  /* Fixed icon column */
  width: 64px;
  min-width: 64px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

/* Help glyph — slightly bolder for readability */
.app-sidebar__help-glyph {
  font-size: 15px;
  font-weight: 700;
  font-family: var(--font-mono);
}

/* ── Label ──────────────────────────────────────────────────────
   Hidden (opacity: 0, shifted left) when panel is collapsed.
   Fades in when panel has --expanded class — the delay lets the
   width animation lead so letters don't appear before there is
   room for them.
   ─────────────────────────────────────────────────────────────── */
.app-sidebar__label {
  flex: 1;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  letter-spacing: 0.01em;
  color: inherit;
  opacity: 0;
  transform: translateX(-6px);
  transition:
    opacity 150ms ease 0ms,
    transform 150ms ease 0ms;
  pointer-events: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* When the panel is expanded, fade labels in with a short delay */
.app-sidebar__panel--expanded .app-sidebar__label {
  opacity: 1;
  transform: translateX(0);
  transition:
    opacity 150ms ease 80ms,
    transform 150ms ease 80ms;
  pointer-events: auto;
}

/* ── Spacer ─────────────────────────────────────────────────────── */
.app-sidebar__spacer {
  flex: 1;
}

/* ── Avatar / UserMenu bottom ──────────────────────────────────── */
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
  /* Centre it inside the 64px column */
  margin-left: 12px;
  flex-shrink: 0;
  user-select: none;
}

/* ── UserMenu override — centre inside icon column ─────────────── */
.app-sidebar__usermenu {
  flex-shrink: 0;
  margin-left: 12px;
}

/* ── prefers-reduced-motion ─────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .app-sidebar__panel {
    transition: none;
  }
  .app-sidebar__label {
    transition: none;
  }
}
</style>
