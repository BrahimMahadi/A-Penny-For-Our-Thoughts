/**
 * Module:   tests/components/ui/ThemeToggle.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (v2.46.0 — mobile theme toggle)
 * Summary:  ThemeToggle drives the theme store in both variants:
 *             • icon — single button, toggles dark↔light
 *             • pill — explicit Light / Dark segments with active state
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { useThemeStore } from '@/stores/theme';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';

describe('ThemeToggle', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  // ── icon variant ─────────────────────────────────────────────────
  it('icon variant toggles the theme on click', async () => {
    const theme = useThemeStore();
    theme.setTheme('dark');
    const w = mount(ThemeToggle, { props: { variant: 'icon' } });

    await w.find('button').trigger('click');
    expect(theme.mode).toBe('light');

    await w.find('button').trigger('click');
    expect(theme.mode).toBe('dark');
    w.unmount();
  });

  it('icon variant defaults to icon when no variant prop is passed', () => {
    const w = mount(ThemeToggle);
    expect(w.find('.theme-toggle__icon').exists()).toBe(true);
    expect(w.find('.theme-toggle__pill').exists()).toBe(false);
    w.unmount();
  });

  it('icon variant has an accessible label that reflects the next action', async () => {
    const theme = useThemeStore();
    theme.setTheme('dark');
    const w = mount(ThemeToggle, { props: { variant: 'icon' } });
    expect(w.find('button').attributes('aria-label')).toBe('Switch to light mode');

    theme.setTheme('light');
    await w.vm.$nextTick();
    expect(w.find('button').attributes('aria-label')).toBe('Switch to dark mode');
    w.unmount();
  });

  // ── pill variant ─────────────────────────────────────────────────
  it('pill variant renders two segments and marks the active theme', async () => {
    const theme = useThemeStore();
    theme.setTheme('dark');
    const w = mount(ThemeToggle, { props: { variant: 'pill' } });

    const segs = w.findAll('.theme-toggle__seg');
    expect(segs).toHaveLength(2);
    // segment order: Light, Dark
    expect(segs[0].classes()).not.toContain('theme-toggle__seg--active');
    expect(segs[1].classes()).toContain('theme-toggle__seg--active');
    expect(segs[1].attributes('aria-pressed')).toBe('true');
    w.unmount();
  });

  it('pill variant sets the chosen theme explicitly (idempotent, not a toggle)', async () => {
    const theme = useThemeStore();
    theme.setTheme('dark');
    const w = mount(ThemeToggle, { props: { variant: 'pill' } });
    const [light, dark] = w.findAll('.theme-toggle__seg');

    await light.trigger('click');
    expect(theme.mode).toBe('light');
    // clicking Light again keeps it light (explicit set, not toggle)
    await light.trigger('click');
    expect(theme.mode).toBe('light');

    await dark.trigger('click');
    expect(theme.mode).toBe('dark');
    w.unmount();
  });
});
