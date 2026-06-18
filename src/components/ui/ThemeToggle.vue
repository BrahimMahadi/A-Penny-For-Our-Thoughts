<!--
  Module:   components/ui/ThemeToggle.vue
  Project:  A Penny For Our Thoughts
  Created:  June 2026 (v2.46.0 — mobile theme toggle)
  Summary:  Light/dark theme switch, wired to the theme store
            (setTheme / toggle / isDark). Two variants:
              • icon — a single 44px sun/moon button that toggles (shows the
                       icon for the theme you'd switch TO). Used in the
                       Dashboard header for one-tap access on mobile.
              • pill — a segmented Light | Dark control. Used in the Settings
                       "Appearance" panel as the canonical, discoverable home.
            The desktop sidebar pill and the `T` keyboard shortcut still work;
            this surfaces the same control where mobile users can reach it.

  Usage:
    <ThemeToggle variant="icon" />   <!-- dashboard header -->
    <ThemeToggle variant="pill" />   <!-- settings panel -->
-->

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme';

withDefaults(defineProps<{ variant?: 'icon' | 'pill' }>(), { variant: 'icon' });

const theme = useThemeStore();
</script>

<template>
  <!-- ICON — single button, toggles -->
  <button
    v-if="variant === 'icon'"
    class="theme-toggle__icon"
    type="button"
    :aria-label="theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :title="(theme.isDark ? 'Light mode' : 'Dark mode') + ' (T)'"
    @click="theme.toggle()"
  >
    <!-- show the icon for the theme you'd switch TO -->
    <svg
      v-if="theme.isDark"
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.5" y1="4.5" x2="6.5" y2="6.5" /><line x1="17.5" y1="17.5" x2="19.5" y2="19.5" />
      <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.5" y1="19.5" x2="6.5" y2="17.5" /><line x1="17.5" y1="6.5" x2="19.5" y2="4.5" />
    </svg>
    <svg
      v-else
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
    </svg>
  </button>

  <!-- PILL — segmented Light | Dark -->
  <div
    v-else
    class="theme-toggle__pill"
    role="group"
    aria-label="Theme"
  >
    <button
      class="theme-toggle__seg"
      type="button"
      :class="{ 'theme-toggle__seg--active': theme.isLight }"
      :aria-pressed="theme.isLight"
      @click="theme.setTheme('light')"
    >
      <svg
        width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
        <line x1="4.5" y1="4.5" x2="6.5" y2="6.5" /><line x1="17.5" y1="17.5" x2="19.5" y2="19.5" />
        <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
        <line x1="4.5" y1="19.5" x2="6.5" y2="17.5" /><line x1="17.5" y1="6.5" x2="19.5" y2="4.5" />
      </svg>
      Light
    </button>
    <button
      class="theme-toggle__seg"
      type="button"
      :class="{ 'theme-toggle__seg--active': theme.isDark }"
      :aria-pressed="theme.isDark"
      @click="theme.setTheme('dark')"
    >
      <svg
        width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
      </svg>
      Dark
    </button>
  </div>
</template>

<style scoped>
/* ── Icon variant ── */
.theme-toggle__icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--muted);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}
.theme-toggle__icon:hover  { color: var(--text); border-color: var(--text); }
.theme-toggle__icon:active { transform: scale(0.94); }

/* ── Pill variant ── */
.theme-toggle__pill {
  display: inline-flex;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px;
  gap: 2px;
}
.theme-toggle__seg {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 40px;
  padding: 0 1rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-weight: 700;
  font-size: 0.82rem;
  font-family: inherit;
  transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
}
.theme-toggle__seg--active { background: var(--accent); color: #fff; }
.theme-toggle__seg:active  { transform: scale(0.96); }

@media (prefers-reduced-motion: reduce) {
  .theme-toggle__icon,
  .theme-toggle__seg { transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast); }
  .theme-toggle__icon:active,
  .theme-toggle__seg:active { transform: none; }
}
</style>
