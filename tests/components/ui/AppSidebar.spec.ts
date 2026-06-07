/**
 * Module:   tests/components/ui/AppSidebar.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 10 — sidebar hover-expand)
 * Summary:  Mount-level tests for the AppSidebar component.
 *           Covers:
 *             • Component mounts without errors
 *             • Ghost spacer (.app-sidebar) always present in DOM
 *             • Fixed panel (.app-sidebar__panel) always present
 *             • All 6 primary nav items rendered with glyph + label
 *             • Active tab gets --active modifier class
 *             • Clicking a nav item calls ui.setActiveTab()
 *             • Expanded class applied on mouseenter, removed on mouseleave
 *             • Labels are rendered in DOM (visible via CSS on hover)
 *             • Utility buttons (shortcuts, theme) are present
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import AppSidebar from '@/components/ui/AppSidebar.vue';
import { useUiStore } from '@/stores/ui';

// ─── Mock supabase — no backend in tests ─────────────────────────
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  supabase: null,
}));

// ─── Stub UserMenu — not under test here ─────────────────────────
vi.mock('@/components/ui/UserMenu.vue', () => ({
  default: { template: '<div data-testid="user-menu" />' },
}));

// ─── Helper ───────────────────────────────────────────────────────
function mountSidebar() {
  return mount(AppSidebar as Parameters<typeof mount>[0], {
    attachTo: document.body,
  });
}

// ─────────────────────────────────────────────────────────────────
//  AppSidebar
// ─────────────────────────────────────────────────────────────────
describe('AppSidebar', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ── Mount guard ─────────────────────────────────────────────────
  it('mounts without throwing', () => {
    const w = mountSidebar();
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  // ── DOM structure ────────────────────────────────────────────────
  it('renders the ghost spacer element', async () => {
    const w = mountSidebar();
    await nextTick();
    expect(w.find('.app-sidebar').exists()).toBe(true);
    w.unmount();
  });

  it('renders the fixed panel inside the spacer', async () => {
    const w = mountSidebar();
    await nextTick();
    expect(w.find('.app-sidebar__panel').exists()).toBe(true);
    w.unmount();
  });

  it('renders the brand logo glyph', async () => {
    const w = mountSidebar();
    await nextTick();
    expect(w.find('.app-sidebar__brand').exists()).toBe(true);
    expect(w.find('.app-sidebar__brand').text()).toBe('¢');
    w.unmount();
  });

  // ── Nav items ────────────────────────────────────────────────────
  // RS-27: tab count went from 6 → 7 with the addition of "Insights"
  // (formerly the keyboard-only "Advanced" tab). Insights sits between
  // Goals and Docs in the sidebar's visual order.
  it('renders exactly 7 nav buttons', async () => {
    const w = mountSidebar();
    await nextTick();
    const navBtns = w.findAll('.app-sidebar__nav .app-sidebar__btn');
    expect(navBtns).toHaveLength(7);
    w.unmount();
  });

  it('renders glyphs for all 7 nav items', async () => {
    const w = mountSidebar();
    await nextTick();
    const glyphs = w.findAll('.app-sidebar__nav .app-sidebar__glyph');
    expect(glyphs).toHaveLength(7);
    w.unmount();
  });

  it('renders labels for all 7 nav items', async () => {
    const w = mountSidebar();
    await nextTick();
    const labels = w.findAll('.app-sidebar__nav .app-sidebar__label');
    expect(labels).toHaveLength(7);
    w.unmount();
  });

  it('renders the expected nav labels (Insights between Goals and Docs)', async () => {
    const w = mountSidebar();
    await nextTick();
    const labels = w.findAll('.app-sidebar__nav .app-sidebar__label')
      .map(el => el.text());
    expect(labels).toEqual([
      'Dashboard',
      'Schedule',
      'Spending',
      'Goals',
      'Insights',
      'Docs',
      'Settings',
    ]);
    w.unmount();
  });

  // RS-27: explicit check that 'Advanced' label is gone — guards against
  // a regression that re-introduces the historical naming.
  it('does NOT render an "Advanced" label (renamed to Insights in RS-27)', async () => {
    const w = mountSidebar();
    await nextTick();
    const labels = w.findAll('.app-sidebar__nav .app-sidebar__label')
      .map(el => el.text());
    expect(labels).not.toContain('Advanced');
    w.unmount();
  });

  // ── Active state ─────────────────────────────────────────────────
  it('applies --active class to the button matching the active tab', async () => {
    const ui = useUiStore();
    ui.setActiveTab('goals');

    const w = mountSidebar();
    await nextTick();

    const activeBtns = w.findAll('.app-sidebar__btn--active');
    expect(activeBtns).toHaveLength(1);
    expect(activeBtns[0].attributes('aria-label')).toBe('Goals');
    w.unmount();
  });

  it('does not apply --active to non-active buttons', async () => {
    const ui = useUiStore();
    ui.setActiveTab('dashboard');

    const w = mountSidebar();
    await nextTick();

    // Only one active button
    expect(w.findAll('.app-sidebar__btn--active')).toHaveLength(1);
    w.unmount();
  });

  // ── Click handler ────────────────────────────────────────────────
  it('calls ui.setActiveTab when a nav button is clicked', async () => {
    const ui = useUiStore();
    const spy = vi.spyOn(ui, 'setActiveTab');

    const w = mountSidebar();
    await nextTick();

    const btns = w.findAll('.app-sidebar__nav .app-sidebar__btn');
    await btns[2].trigger('click'); // Spending

    expect(spy).toHaveBeenCalledWith('spending');
    w.unmount();
  });

  it('updates active tab to "schedule" when Schedule button is clicked', async () => {
    const ui = useUiStore();
    ui.setActiveTab('dashboard');

    const w = mountSidebar();
    await nextTick();

    const btns = w.findAll('.app-sidebar__nav .app-sidebar__btn');
    await btns[1].trigger('click'); // Schedule

    expect(ui.activeTab).toBe('schedule');
    w.unmount();
  });

  // RS-27: clicking the new Insights button (position 5 — between Goals and
  // Docs) routes activeTab to 'insights'.
  it('clicking the Insights button routes activeTab to "insights"', async () => {
    const ui = useUiStore();
    ui.setActiveTab('dashboard');

    const w = mountSidebar();
    await nextTick();

    const btns = w.findAll('.app-sidebar__nav .app-sidebar__btn');
    await btns[4].trigger('click'); // Insights — position 4 (0-indexed)

    expect(ui.activeTab).toBe('insights');
    w.unmount();
  });

  // ── Hover-expand behaviour ───────────────────────────────────────
  it('panel does NOT have --expanded class initially', async () => {
    const w = mountSidebar();
    await nextTick();
    expect(w.find('.app-sidebar__panel--expanded').exists()).toBe(false);
    w.unmount();
  });

  it('adds --expanded class to panel on mouseenter', async () => {
    const w = mountSidebar();
    await nextTick();

    await w.find('.app-sidebar__panel').trigger('mouseenter');

    expect(w.find('.app-sidebar__panel--expanded').exists()).toBe(true);
    w.unmount();
  });

  it('removes --expanded class from panel on mouseleave', async () => {
    const w = mountSidebar();
    await nextTick();

    const panel = w.find('.app-sidebar__panel');
    await panel.trigger('mouseenter');
    expect(w.find('.app-sidebar__panel--expanded').exists()).toBe(true);

    await panel.trigger('mouseleave');
    expect(w.find('.app-sidebar__panel--expanded').exists()).toBe(false);
    w.unmount();
  });

  // ── Utility buttons ──────────────────────────────────────────────
  it('renders the keyboard shortcuts button', async () => {
    const w = mountSidebar();
    await nextTick();
    const helpBtn = w.find('[aria-label="Keyboard shortcuts"]');
    expect(helpBtn.exists()).toBe(true);
    w.unmount();
  });

  // feat/gsap-flip-toggles: theme toggle replaced with icon pill.
  // The old single button (aria-label="Switch to ...") is now a two-button
  // pill: [aria-label="Light mode"] + [aria-label="Dark mode"], no text label.
  it('renders the theme toggle pill with light and dark mode buttons', async () => {
    const w = mountSidebar();
    await nextTick();
    expect(w.find('[aria-label="Theme"]').exists()).toBe(true);
    expect(w.find('[aria-label="Light mode"]').exists()).toBe(true);
    expect(w.find('[aria-label="Dark mode"]').exists()).toBe(true);
    w.unmount();
  });

  it('renders the shortcuts label inside the shortcuts button', async () => {
    const w = mountSidebar();
    await nextTick();
    const helpBtn = w.find('[aria-label="Keyboard shortcuts"]');
    const label = helpBtn.find('.app-sidebar__label');
    expect(label.exists()).toBe(true);
    expect(label.text()).toBe('Shortcuts');
    w.unmount();
  });

  it('exactly one theme pill button is active at a time', async () => {
    const w = mountSidebar();
    await nextTick();
    // The icon pill (light/dark) uses --active class; exactly one should be active.
    const activeBtns = w.findAll('.app-sidebar__theme-btn--active');
    expect(activeBtns).toHaveLength(1);
    w.unmount();
  });

  // ── Accessibility ────────────────────────────────────────────────
  it('nav has role="tablist"', async () => {
    const w = mountSidebar();
    await nextTick();
    expect(w.find('[role="tablist"]').exists()).toBe(true);
    w.unmount();
  });

  it('each nav button has role="tab"', async () => {
    const w = mountSidebar();
    await nextTick();
    const tabs = w.findAll('[role="tab"]');
    expect(tabs).toHaveLength(7); // RS-27: was 6, +Insights
    w.unmount();
  });

  it('active nav button has aria-selected="true"', async () => {
    const ui = useUiStore();
    ui.setActiveTab('spending');

    const w = mountSidebar();
    await nextTick();

    const selectedTabs = w.findAll('[aria-selected="true"]');
    expect(selectedTabs).toHaveLength(1);
    expect(selectedTabs[0].attributes('aria-label')).toBe('Spending');
    w.unmount();
  });

  it('inactive nav buttons have aria-selected="false"', async () => {
    const ui = useUiStore();
    ui.setActiveTab('dashboard');

    const w = mountSidebar();
    await nextTick();

    const notSelected = w.findAll('[aria-selected="false"]');
    // RS-27: 6 inactive out of 7 total (Insights added)
    expect(notSelected).toHaveLength(6);
    w.unmount();
  });

  // ── Avatar fallback ──────────────────────────────────────────────
  it('renders the avatar fallback when Supabase is not configured', async () => {
    const w = mountSidebar();
    await nextTick();
    // isSupabaseConfigured() is mocked to return false
    expect(w.find('.app-sidebar__avatar').exists()).toBe(true);
    w.unmount();
  });
});
