/**
 * Tests: App.vue — Sprint 5
 *
 * Covers:
 *  - CSV toolbar buttons render
 *  - Export button calls budget.exportCSV()
 *  - Import file input is hidden
 *  - Shortcut help modal opens via ? button
 *  - Shortcut help modal lists expected shortcuts
 *  - Keyboard shortcut: 1/2/3 switch tabs
 *  - Keyboard shortcut: ? toggles help panel
 *  - Keyboard shortcut: E triggers export
 *  - Keyboard shortcut: T toggles theme
 *  - a11y: toolbar buttons have aria-label
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Mock heavy child pages so the App renders quickly
vi.mock('@/components/pages/DashboardPage.vue', () => ({ default: { template: '<div data-testid="dashboard-page" />' } }));
vi.mock('@/components/pages/SchedulePage.vue',  () => ({ default: { template: '<div data-testid="schedule-page" />' } }));
vi.mock('@/components/pages/DocsPage.vue',       () => ({ default: { template: '<div data-testid="docs-page" />' } }));
vi.mock('@/components/pages/SettingsPage.vue',   () => ({ default: { template: '<div data-testid="settings-page" />' } }));

// Return false so the auth gate is bypassed and the app shell always renders.
// These tests pre-date Sprint 25 auth and only cover toolbar/keyboard UX.
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(false),
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
    },
  },
}));

import App from '@/App.vue';
import { useBudgetStore } from '@/stores/budget';
import { useUiStore } from '@/stores/ui';
import { useThemeStore } from '@/stores/theme';

// ─── Shared wrapper tracking ──────────────────────────────────────────────────
// Each test mounts via mountApp(), which stores the wrapper here.
// afterEach always unmounts before clearing the DOM — this prevents the
// "insertBefore on null" crash that occurs when Vue's Teleport (ToastContainer,
// BaseModal) tries to update body after body.innerHTML has been reset.

let w: VueWrapper | null = null;

function mountApp(): VueWrapper {
  w = mount(App as Parameters<typeof mount>[0], { attachTo: document.body });
  return w;
}

function fireKey(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function modalOpen(): boolean {
  return !!document.body.querySelector('.base-modal');
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(async () => {
  if (w) {
    w.unmount();       // let Vue clean up Teleport hooks first
    w = null;
  }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ─── Toolbar rendering ────────────────────────────────────────────────────────

// Import/Export buttons have moved to Settings → Data Management.
// The toolbar now only has the shortcut-help button, theme toggle, and UserMenu.
describe('App toolbar', () => {
  it('renders the keyboard-shortcut help button', () => {
    mountApp();
    expect(document.body.querySelector('[aria-label="Keyboard shortcuts"]')).not.toBeNull();
  });

  it('toolbar has no CSV or JSON action buttons', () => {
    mountApp();
    // Export/Import buttons now live in SettingsPage → Data Management card
    expect(document.body.querySelector('[aria-label="Export CSV"]')).toBeNull();
    expect(document.body.querySelector('[aria-label="Import CSV"]')).toBeNull();
    expect(document.body.querySelector('[aria-label="Export JSON backup"]')).toBeNull();
  });

  it('no hidden file inputs exist in the app toolbar', () => {
    mountApp();
    // File inputs are now inside SettingsPage, not App.vue
    expect(document.body.querySelector('input[type="file"]')).toBeNull();
  });
});

// ─── Shortcut help modal ───────────────────────────────────────────────────────

describe('App shortcut help modal', () => {
  it('opens when the ? button is clicked', async () => {
    const ww = mountApp();
    expect(modalOpen()).toBe(false);

    await ww.find('[aria-label="Keyboard shortcuts"]').trigger('click');

    expect(modalOpen()).toBe(true);
  });

  it('shows the known shortcuts in the table', async () => {
    const ww = mountApp();
    await ww.find('[aria-label="Keyboard shortcuts"]').trigger('click');

    const modal = document.body.querySelector('.base-modal')!;
    const kbds = Array.from(modal.querySelectorAll('.shortcut-kbd')).map((el) => el.textContent?.trim());
    expect(kbds).toContain('?');
    expect(kbds).toContain('1');
    expect(kbds).toContain('E');
    expect(kbds).toContain('T');
  });

  it('closes when the modal close button is clicked', async () => {
    const ww = mountApp();
    await ww.find('[aria-label="Keyboard shortcuts"]').trigger('click');
    expect(modalOpen()).toBe(true);

    const closeBtn = document.body.querySelector<HTMLButtonElement>('.base-modal__close');
    closeBtn?.click();
    await ww.vm.$nextTick();

    expect(modalOpen()).toBe(false);
  });
});

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

describe('App keyboard shortcuts', () => {
  it('? key opens the shortcut help panel', async () => {
    const ww = mountApp();
    expect(modalOpen()).toBe(false);

    fireKey('?');
    await ww.vm.$nextTick();

    expect(modalOpen()).toBe(true);
  });

  it('? key closes the shortcut help panel when already open', async () => {
    const ww = mountApp();
    // Open via button so state is definitely open
    await ww.find('[aria-label="Keyboard shortcuts"]').trigger('click');
    expect(modalOpen()).toBe(true);

    // Close via keyboard
    fireKey('?');
    await ww.vm.$nextTick();

    expect(modalOpen()).toBe(false);
  });

  it('1 key switches to Dashboard tab', async () => {
    const ui = useUiStore();
    ui.setActiveTab('schedule');
    const ww = mountApp();

    fireKey('1');
    await ww.vm.$nextTick();

    expect(ui.activeTab).toBe('dashboard');
  });

  it('2 key switches to Schedule tab', async () => {
    const ui = useUiStore();
    const ww = mountApp();

    fireKey('2');
    await ww.vm.$nextTick();

    expect(ui.activeTab).toBe('schedule');
  });

  it('3 key switches to Spending tab', async () => {
    const ui = useUiStore();
    const ww = mountApp();

    fireKey('3');
    await ww.vm.$nextTick();

    expect(ui.activeTab).toBe('spending');
  });

  it('E key calls budget.exportCSV()', async () => {
    const budget = useBudgetStore();
    const spy = vi.spyOn(budget, 'exportCSV').mockReturnValue(undefined as unknown as void);
    const ww = mountApp();

    fireKey('e');
    await ww.vm.$nextTick();

    expect(spy).toHaveBeenCalledOnce();
  });

  it('T key toggles the theme', async () => {
    const theme = useThemeStore();
    const initialDark = theme.isDark;
    const ww = mountApp();

    fireKey('t');
    await ww.vm.$nextTick();

    expect(theme.isDark).toBe(!initialDark);
  });
});

// ─── Tab navigation ───────────────────────────────────────────────────────────

describe('App tab navigation', () => {
  it('renders the active page based on ui.activeTab', async () => {
    const ui = useUiStore();
    const ww = mountApp();

    ui.setActiveTab('dashboard');
    await ww.vm.$nextTick();
    expect(ww.find('[data-testid="dashboard-page"]').exists()).toBe(true);

    ui.setActiveTab('schedule');
    await ww.vm.$nextTick();
    expect(ww.find('[data-testid="schedule-page"]').exists()).toBe(true);

    ui.setActiveTab('docs');
    await ww.vm.$nextTick();
    expect(ww.find('[data-testid="docs-page"]').exists()).toBe(true);
  });

  it('marks the active tab with aria-selected=true', async () => {
    const ui = useUiStore();
    const ww = mountApp();

    ui.setActiveTab('schedule');
    await ww.vm.$nextTick();

    const tabs = ww.findAll('[role="tab"]');
    const scheduleTab = tabs.find((t) => t.text().includes('Schedule'));
    expect(scheduleTab?.attributes('aria-selected')).toBe('true');
  });

  it('renders the Settings page when ui.activeTab is "settings"', async () => {
    const ui = useUiStore();
    const ww = mountApp();

    ui.setActiveTab('settings');
    await ww.vm.$nextTick();

    expect(ww.find('[data-testid="settings-page"]').exists()).toBe(true);
  });

  it('Settings tab renders in the tab bar', () => {
    const ww = mountApp();
    const tabs = ww.findAll('[role="tab"]');
    const settingsTab = tabs.find((t) => t.text().includes('Settings'));
    expect(settingsTab).toBeDefined();
  });
});

// ─── Sprint 7: Settings tab keyboard shortcut ─────────────────────────────────

describe('App Sprint 7 — Settings shortcut', () => {
  it('4 key switches to Docs tab', async () => {
    const ui = useUiStore();
    const ww = mountApp();

    fireKey('4');
    await ww.vm.$nextTick();

    expect(ui.activeTab).toBe('docs');
  });

  it('Settings tab shows aria-selected=true when active', async () => {
    const ui = useUiStore();
    const ww = mountApp();

    ui.setActiveTab('settings');
    await ww.vm.$nextTick();

    const tabs = ww.findAll('[role="tab"]');
    const settingsTab = tabs.find((t) => t.text().includes('Settings'));
    expect(settingsTab?.attributes('aria-selected')).toBe('true');
  });

  it('shortcut help modal lists the 4 key shortcut', async () => {
    const ww = mountApp();
    await ww.find('[aria-label="Keyboard shortcuts"]').trigger('click');

    const modal = document.body.querySelector('.base-modal')!;
    const kbds = Array.from(modal.querySelectorAll('.shortcut-kbd')).map((el) => el.textContent?.trim());
    expect(kbds).toContain('4');
  });
});
