<!--
  Module:   components/ui/BottomNav.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Redesign Sprint 2)
  Summary:  Mobile bottom navigation bar (≤ 768px). Shows the same
            7 primary tabs as AppSidebar but as a fixed row of icon +
            label buttons at the bottom of the screen.
            RS-27: 'insights' added between Goals and Docs to match the
            sidebar's surfaced layout.

  Only visible at ≤ 768px; AppSidebar hides at this breakpoint.
-->

<script setup lang="ts">
import { useUiStore } from '@/stores/ui';
import type { TabId } from '@/types/state';

const ui = useUiStore();

interface NavItem {
  id: TabId;
  glyph: string;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', glyph: '◧',  label: 'Dashboard' },
  { id: 'schedule',  glyph: '▥',  label: 'Schedule'  },
  { id: 'spending',  glyph: '◐',  label: 'Spending'  },
  { id: 'goals',     glyph: '◎',  label: 'Goals'     },
  { id: 'insights',  glyph: '📊', label: 'Insights'  },
  { id: 'docs',      glyph: '☰',  label: 'Docs'      },
  { id: 'settings',  glyph: '◆',  label: 'Settings'  },
];
</script>

<template>
  <nav
    class="bottom-nav"
    role="tablist"
    aria-label="Main sections"
  >
    <button
      v-for="item in navItems"
      :key="item.id"
      class="bottom-nav__btn"
      :class="{ 'bottom-nav__btn--active': ui.activeTab === item.id }"
      role="tab"
      :aria-selected="ui.activeTab === item.id"
      :aria-label="item.label"
      @click="ui.setActiveTab(item.id)"
    >
      <!-- Active indicator pill above the icon -->
      <span
        v-if="ui.activeTab === item.id"
        class="bottom-nav__indicator"
        aria-hidden="true"
      />
      <span
        class="bottom-nav__glyph"
        aria-hidden="true"
      >{{ item.glyph }}</span>
      <span class="bottom-nav__label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  /* Only visible on mobile */
  display: none;
}

@media (max-width: 768px) {
  .bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 0 0 env(safe-area-inset-bottom, 0px);
    gap: 0;
    transition: background var(--transition-fast), border-color var(--transition-fast);
  }

  .bottom-nav__btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: 54px;
    padding: 6px 2px 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--muted);
    position: relative;
    transition: color var(--transition-fast);
  }

  .bottom-nav__btn--active {
    color: var(--accent);
  }

  .bottom-nav__btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  /* Accent pill at the top of the active button */
  .bottom-nav__indicator {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 2px;
    background: var(--accent);
    border-radius: 0 0 2px 2px;
  }

  .bottom-nav__glyph {
    font-size: 18px;
    line-height: 1;
  }

  .bottom-nav__label {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 1;
    text-transform: uppercase;
  }
}
</style>
