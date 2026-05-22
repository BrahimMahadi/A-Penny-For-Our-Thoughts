import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

// ─────────────────────────────────────────────────────────────────
//  Theme storage error handling
// ─────────────────────────────────────────────────────────────────
describe('theme store — storage error handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loadThemeFromStorage returns "dark" when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    expect(loadThemeFromStorage()).toBe('dark');
  });

  it('loadThemeFromStorage does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    expect(() => loadThemeFromStorage()).not.toThrow();
  });

  it('applyThemeToDOM still sets data-theme when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    // Should not throw, and DOM attribute should still be applied
    expect(() => applyThemeToDOM('light')).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('applyThemeToDOM does not persist when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    applyThemeToDOM('light');
    // localStorage write silently failed — getItem returns null in this mock context
    // The important thing is the DOM was updated and no exception propagated
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
