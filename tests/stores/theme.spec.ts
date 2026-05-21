import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useThemeStore, loadThemeFromStorage, applyThemeToDOM } from '@/stores/theme';

describe('theme store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to dark when nothing is persisted', () => {
    expect(loadThemeFromStorage()).toBe('dark');
  });

  it('reads "light" from localStorage', () => {
    localStorage.setItem('penny_theme', 'light');
    expect(loadThemeFromStorage()).toBe('light');
  });

  it('treats unknown values as dark (defensive default)', () => {
    localStorage.setItem('penny_theme', 'rainbow');
    expect(loadThemeFromStorage()).toBe('dark');
  });

  it('applyThemeToDOM writes data-theme attribute', () => {
    applyThemeToDOM('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('applyThemeToDOM persists to localStorage', () => {
    applyThemeToDOM('light');
    expect(localStorage.getItem('penny_theme')).toBe('light');
  });

  it('init() hydrates from localStorage and applies DOM attr', () => {
    localStorage.setItem('penny_theme', 'light');
    const store = useThemeStore();
    store.init();
    expect(store.mode).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggle() flips dark → light → dark', () => {
    const store = useThemeStore();
    expect(store.mode).toBe('dark');
    store.toggle();
    expect(store.mode).toBe('light');
    expect(store.isLight).toBe(true);
    store.toggle();
    expect(store.mode).toBe('dark');
    expect(store.isDark).toBe(true);
  });

  it('setTheme persists to localStorage', () => {
    const store = useThemeStore();
    store.setTheme('light');
    expect(localStorage.getItem('penny_theme')).toBe('light');
  });
});
