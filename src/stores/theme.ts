/**
 * Module:   stores/theme.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 1)
 * Summary:  Theme state (dark/light) with localStorage persistence.
 *           Applies the `data-theme` attribute to <html> so the
 *           existing CSS variables system continues to work.
 *           Replaces legacy state.js theme helpers.
 */

import { defineStore } from 'pinia';
import { STORAGE_KEYS } from '@/types/state';
import type { ThemeMode } from '@/types/budget';

interface ThemeStateShape {
  mode: ThemeMode;
}

/** Read the persisted theme preference, defaulting to 'dark'. */
export function loadThemeFromStorage(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME);
  return saved === 'light' ? 'light' : 'dark';
}

/** Write the theme attribute to <html> and persist to localStorage. */
export function applyThemeToDOM(mode: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem(STORAGE_KEYS.THEME, mode);
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeStateShape => ({
    mode: 'dark',
  }),

  getters: {
    isDark: (state) => state.mode === 'dark',
    isLight: (state) => state.mode === 'light',
  },

  actions: {
    /** Hydrate from localStorage and apply to DOM. Call once at app startup. */
    init(): void {
      this.mode = loadThemeFromStorage();
      applyThemeToDOM(this.mode);
    },

    setTheme(mode: ThemeMode): void {
      this.mode = mode;
      applyThemeToDOM(mode);
    },

    toggle(): void {
      this.setTheme(this.mode === 'dark' ? 'light' : 'dark');
    },
  },
});
