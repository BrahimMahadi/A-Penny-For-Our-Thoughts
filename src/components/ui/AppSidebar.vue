<!--
  Module:   components/ui/AppSidebar.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Redesign Sprint 2)
  Updated:  May 2026 (Redesign Sprint 10) — hover-expand: 64px → 220px overlay panel
            June 2026 (feat/gsap-flip-toggles) — GSAP Flip nav indicator + icon theme pill
  Summary:  Slim sidebar with hover-expand behaviour.

  Layout pattern — two-element wrapper:
    <aside class="app-sidebar">            ← 64px ghost spacer, stays in flex flow
      <div class="app-sidebar__panel">    ← position:fixed, visually expands on hover

  Nav indicator: a 3px-wide absolutely-positioned bar that slides vertically
  between the active nav button using GSAP Flip (power3.inOut, 0.28s).

  Theme pill: two icon buttons (☾ moon / ☀ sun) with a sliding Flip background
  indicator (power2.inOut, 0.26s). No text label.

  Collapsed  → icon only (40×40 buttons, centred glyphs)
  Expanded   → icon + label, left-aligned, 220px wide
-->

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useUiStore }    from '@/stores/ui';
import { useThemeStore } from '@/stores/theme';
import { useAuthStore }  from '@/stores/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useFlipIndicator }     from '@/composables/useFlipIndicator';
import UserMenu from '@/components/ui/UserMenu.vue';
import type { TabId } from '@/types/state';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { prefersReducedMotion } from '@/composables/useGsap';

gsap.registerPlugin(Flip);

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

const navItems: NavItem[] = [
  { id: 'dashboard', glyph: '◧',  label: 'Dashboard' },
  { id: 'schedule',  glyph: '▥',  label: 'Schedule'  },
  { id: 'spending',  glyph: '◐',  label: 'Spending'  },
  { id: 'goals',     glyph: '◎',  label: 'Goals'     },
  { id: 'insights',  glyph: '📊', label: 'Insights'  },
  { id: 'docs',      glyph: '☰',  label: 'Docs'      },
  { id: 'settings',  glyph: '◆',  label: 'Settings'  },
];

// User initials for the avatar button (falls back to "B")
const userInitial = computed(() => {
  if (supabaseEnabled && auth.user?.email) {
    return auth.user.email[0].toUpperCase();
  }
  return 'B';
});

// ─── Nav indicator (vertical left-bar) ──────────────────────────
const navRef    = ref<HTMLElement | null>(null);
const navIndRef = ref<HTMLElement | null>(null);

const { move: moveNavInd, snap: snapNavInd } = useFlipIndicator(
  navRef,
  navIndRef,
  {
    activeSel: '.app-sidebar__btn--active',
    ease:      'power3.inOut',
    duration:  0.28,
    axis:      'y',
  },
);

// Re-run indicator on tab change
watch(() => ui.activeTab, () => {
  void moveNavInd();
});

// Reinit nav indicator after sidebar expand/collapse so the bar stays
// correctly positioned (the expand transition shifts button tops slightly).
let reinitTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleNavReinit(): void {
  if (reinitTimer) clearTimeout(reinitTimer);
  // 230ms matches the 220ms sidebar width transition + small buffer
  reinitTimer = setTimeout(snapNavInd, 230);
}

// ─── Theme pill indicator ────────────────────────────────────────
const themePillRef = ref<HTMLElement | null>(null);
const themeIndRef  = ref<HTMLElement | null>(null);

const { move: moveThemeInd, snap: snapThemeInd } = useFlipIndicator(
  themePillRef,
  themeIndRef,
  {
    activeSel: '.app-sidebar__theme-btn--active',
    ease:      'power2.inOut',
    duration:  0.26,
    axis:      'both',
  },
);

function toggleTheme(): void {
  theme.toggle();
  void moveThemeInd();
}

// Reinit theme pill after sidebar expand/collapse (pill position shifts)
function scheduleThemeReinit(): void {
  if (reinitTimer) clearTimeout(reinitTimer);
  reinitTimer = setTimeout(() => {
    snapNavInd();
    snapThemeInd();
  }, 230);
}

// ─── Lifecycle ───────────────────────────────────────────────────
onMounted(async () => {
  await nextTick();
  snapNavInd();
  snapThemeInd();
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
      @mouseenter="isExpanded = true; scheduleThemeReinit()"
      @mouseleave="isExpanded = false; scheduleThemeReinit()"
    >
      <!-- Brand logo -->
      <div
        class="app-sidebar__brand"
        aria-hidden="true"
      >¢</div>

      <!-- Primary nav -->
      <nav
        ref="navRef"
        role="tablist"
        aria-label="Main sections"
        class="app-sidebar__nav"
      >
        <!-- Sliding left-bar indicator (behind buttons, moved by GSAP Flip) -->
        <span
          ref="navIndRef"
          class="nav-ind"
          aria-hidden="true"
        />

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

      <!-- Theme pill — moon ☾ / sun ☀ icon buttons with Flip sliding indicator -->
      <div class="app-sidebar__theme-wrap">
        <div
          ref="themePillRef"
          class="app-sidebar__theme-pill"
          role="group"
          aria-label="Theme"
        >
          <!-- Sliding background indicator (GSAP Flip-controlled) -->
          <span
            ref="themeIndRef"
            class="app-sidebar__theme-ind"
            aria-hidden="true"
          />

          <!-- Sun (light mode) -->
          <button
            class="app-sidebar__theme-btn"
            :class="{ 'app-sidebar__theme-btn--active': !theme.isDark }"
            :aria-pressed="!theme.isDark"
            title="Switch to light mode (T)"
            aria-label="Light mode"
            @click="toggleTheme"
          >
            <!-- Sun SVG -->
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2"  x2="12" y2="6"  />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="4.22" y1="4.22"  x2="7.05" y2="7.05"   />
              <line x1="16.95" y1="16.95" x2="19.78" y2="19.78" />
              <line x1="2"  y1="12" x2="6"  y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
              <line x1="4.22" y1="19.78" x2="7.05" y2="16.95"  />
              <line x1="16.95" y1="7.05"  x2="19.78" y2="4.22"  />
            </svg>
          </button>

          <!-- Moon (dark mode) -->
          <button
            class="app-sidebar__theme-btn"
            :class="{ 'app-sidebar__theme-btn--active': theme.isDark }"
            :aria-pressed="theme.isDark"
            title="Switch to dark mode (T)"
            aria-label="Dark mode"
            @click="toggleTheme"
          >
            <!-- Moon SVG -->
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </div>
      </div>

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

/* ── Nav container — must be position:relative for the left-bar ─ */
.app-sidebar__nav {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  width: 100%;
}

/* ── Vertical left-bar nav indicator ────────────────────────────
   Absolutely positioned inside .app-sidebar__nav.
   GSAP Flip manages top + height; left/width are fixed.
   Starts hidden (opacity:0); revealed after first snap().
   ─────────────────────────────────────────────────────────────── */
.nav-ind {
  position: absolute;
  left: 0;
  width: 3px;
  border-radius: 999px;
  background: var(--accent);
  pointer-events: none;
  opacity: 0;
  z-index: 1;
  /* top and height are set by GSAP */
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
  border-radius: 0;
  position: relative; /* above the nav-ind */
  z-index: 2;
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

/* ── Theme pill wrapper ─────────────────────────────────────────
   Full-width container, centres the compact pill in the icon column.
   ─────────────────────────────────────────────────────────────── */
.app-sidebar__theme-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 0 4px;
  flex-shrink: 0;
}

/* ── Theme pill ─────────────────────────────────────────────────
   Pill container: relative for the abs indicator inside.
   ─────────────────────────────────────────────────────────────── */
.app-sidebar__theme-pill {
  position: relative;
  display: flex;
  padding: 2px;
  gap: 2px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 999px;
  transition: border-color var(--transition-fast);
}

/* ── Theme sliding indicator ─────────────────────────────────────
   Absolutely positioned behind buttons; GSAP Flip moves it.
   Starts hidden (opacity:0); revealed by the composable after snap().
   ─────────────────────────────────────────────────────────────── */
.app-sidebar__theme-ind {
  position: absolute;
  border-radius: 999px;
  background: var(--accent);
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  /* left / top / width / height all set by GSAP */
}

/* ── Theme icon buttons ─────────────────────────────────────────── */
.app-sidebar__theme-btn {
  position: relative;
  z-index: 1;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: 999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  transition: color var(--transition-fast);
  padding: 0;
}

.app-sidebar__theme-btn:hover {
  color: var(--text);
}

.app-sidebar__theme-btn--active {
  color: #fff;
}

.app-sidebar__theme-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
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
