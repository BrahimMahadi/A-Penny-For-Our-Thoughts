<!--
  Module:   components/ui/BottomNav.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Redesign Sprint 2)
  Summary:  Mobile bottom navigation bar (≤ 768px). Shows 5 primary tabs
            plus a "More ···" button that opens a slide-up sheet containing
            the overflow tabs (Docs, Settings).

            If the active tab is in the overflow set, the More button
            renders with the active accent colour and an indicator dot
            so the user always knows where they are.

  Only visible at ≤ 768px; AppSidebar handles desktop navigation.
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUiStore } from '@/stores/ui';
import type { TabId } from '@/types/state';
import { PRIMARY_TAB_ORDER, OVERFLOW_TAB_IDS, isOverflowTab } from '@/lib/tabs';

const ui = useUiStore();

interface NavItem {
  id: TabId;
  glyph: string;
  label: string;
}

const allItems: NavItem[] = [
  { id: 'dashboard', glyph: '◧',  label: 'Dashboard' },
  { id: 'schedule',  glyph: '▥',  label: 'Schedule'  },
  { id: 'spending',  glyph: '◐',  label: 'Spending'  },
  { id: 'goals',     glyph: '◎',  label: 'Goals'     },
  { id: 'insights',  glyph: '📊', label: 'Insights'  },
  { id: 'docs',      glyph: '☰',  label: 'Docs'      },
  { id: 'settings',  glyph: '◆',  label: 'Settings'  },
];

// Slot membership and ordering both come from @/lib/tabs — the single source
// this file and App.vue share, so they cannot drift apart again (BUG-039).
const byId = new Map(allItems.map(item => [item.id, item]));
const primaryItems = PRIMARY_TAB_ORDER.map(id => byId.get(id)!).filter(Boolean);
const overflowItems = OVERFLOW_TAB_IDS.map(id => byId.get(id)!).filter(Boolean);

/** True when the currently-active tab lives in the overflow group. */
const isOverflow = computed(() => isOverflowTab(ui.activeTab));

const moreOpen = ref(false);

function openMore(): void  { moreOpen.value = true;  }
function closeMore(): void { moreOpen.value = false; }

function selectOverflow(id: TabId): void {
  ui.setActiveTab(id);
  closeMore();
}
</script>

<template>
  <nav
    class="bottom-nav"
    role="navigation"
    aria-label="Main sections"
  >
    <!-- Primary 5 tabs -->
    <button
      v-for="item in primaryItems"
      :key="item.id"
      v-press
      class="bottom-nav__btn"
      :class="{ 'bottom-nav__btn--active': ui.activeTab === item.id }"
      :aria-label="item.label"
      :aria-current="ui.activeTab === item.id ? 'page' : undefined"
      @click="ui.setActiveTab(item.id)"
    >
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

    <!-- More button — 6th slot, opens overflow sheet -->
    <button
      v-press
      class="bottom-nav__btn bottom-nav__more"
      :class="{ 'bottom-nav__btn--active': isOverflow }"
      aria-label="More sections"
      :aria-expanded="moreOpen"
      @click="openMore"
    >
      <span
        v-if="isOverflow"
        class="bottom-nav__indicator"
        aria-hidden="true"
      />
      <!-- Dot indicator when an overflow tab is active and sheet is closed -->
      <span
        v-if="isOverflow && !moreOpen"
        class="bottom-nav__dot"
        aria-hidden="true"
      />
      <span
        class="bottom-nav__glyph"
        aria-hidden="true"
      >···</span>
      <span class="bottom-nav__label">More</span>
    </button>
  </nav>

  <!-- Overflow sheet + dim overlay, teleported to body for clean z-index stacking -->
  <Teleport to="body">
    <div
      class="bnav-more-wrap"
      :class="{ 'bnav-more-wrap--open': moreOpen }"
      :aria-hidden="!moreOpen"
    >
      <div
        class="bnav-more-overlay"
        @click="closeMore"
      />
      <div
        class="bnav-more-sheet"
        role="dialog"
        aria-label="More sections"
        aria-modal="true"
      >
        <p class="bnav-more-sheet__eyebrow">
          More
        </p>
        <div class="bnav-more-sheet__items">
          <button
            v-for="item in overflowItems"
            :key="item.id"
            v-press
            class="bnav-more-sheet__item"
            :class="{ 'bnav-more-sheet__item--active': ui.activeTab === item.id }"
            :aria-label="item.label"
            :aria-current="ui.activeTab === item.id ? 'page' : undefined"
            @click="selectOverflow(item.id)"
          >
            <span
              class="bnav-more-sheet__glyph"
              aria-hidden="true"
            >{{ item.glyph }}</span>
            <span class="bnav-more-sheet__label">{{ item.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Base: hidden on desktop ── */
.bottom-nav {
  display: none;
}

/* ── Mobile nav bar ── */
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

  /* Small dot on the More button when an overflow tab is active */
  .bottom-nav__dot {
    position: absolute;
    top: 8px;
    right: calc(50% - 16px);
    width: 6px;
    height: 6px;
    background: var(--accent);
    border-radius: 50%;
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

/* ── Overflow sheet (teleported to body, always in DOM) ── */
.bnav-more-wrap {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  /* Hidden by default */
  visibility: hidden;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease, visibility 0s 0.2s;
}

.bnav-more-wrap--open {
  visibility: visible;
  pointer-events: auto;
  opacity: 1;
  transition: opacity 0.2s ease;
}

.bnav-more-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
}

.bnav-more-sheet {
  position: relative;
  background: var(--surface2);
  border-top: 1px solid var(--border);
  border-radius: 20px 20px 0 0;
  padding: 0.85rem 1rem calc(60px + env(safe-area-inset-bottom, 0px) + 0.5rem);
  /* MOBILE-5: keep an overscroll at the sheet's edge from scrolling the
     dashboard behind it (or triggering pull-to-refresh). */
  overscroll-behavior: contain;
  /* Sheet slides up when the wrapper opens */
  transform: translateY(40px);
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}

.bnav-more-wrap--open .bnav-more-sheet {
  transform: translateY(0);
}

.bnav-more-sheet__eyebrow {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-family: var(--font-mono);
  margin-bottom: 0.65rem;
  padding: 0 0.2rem;
}

.bnav-more-sheet__items {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.bnav-more-sheet__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 1rem 0.5rem;
  background: var(--surface3);
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  color: var(--text);
  font-family: var(--font-body);
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.bnav-more-sheet__item--active {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
  color: var(--accent);
}

.bnav-more-sheet__item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.bnav-more-sheet__glyph {
  font-size: 24px;
  line-height: 1;
}

.bnav-more-sheet__label {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
</style>
