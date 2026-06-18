/**
 * Module:   tests/components/pages/pages.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 7)
 * Updated:  May 2026 (RS-8) — added AppStatusBar suite
 * Summary:  Mount-level tests for the page-level SFCs added/replaced in Sprint 7:
 *             • DocsPage  — 5 sections, sidebar nav, mobile nav
 *             • SettingsPage — hosts 4 cards + danger zone
 *             • AppStatusBar — recent-purchases ticker + up-next bill (RS-8)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

// ─── Mock chart dependencies ──────────────────────────────────────
vi.mock('vue-chartjs', () => ({
  Bar:      { template: '<canvas data-testid="chart-bar" />' },
  Line:     { template: '<canvas data-testid="chart-line" />' },
  Doughnut: { template: '<canvas data-testid="chart-doughnut" />' },
  Chart:    { template: '<canvas data-testid="chart-generic" />' },
}));
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  registerables: [],
}));

// Mock heavy child sections inside SettingsPage to keep tests fast
vi.mock('@/components/sections/PayStartDate.vue',  () => ({ default: { template: '<div data-testid="pay-start-date" />' } }));
vi.mock('@/components/sections/RulesEngine.vue',   () => ({ default: { template: '<div data-testid="rules-engine" />' } }));
vi.mock('@/components/sections/BudgetAlerts.vue',  () => ({ default: { template: '<div data-testid="budget-alerts" />' } }));

// Mock GSAP Draggable composable (Draggable requires a real browser DOM)
vi.mock('@/composables/useDraggableList', () => ({
  useDraggableList: () => ({ reinit: vi.fn() }),
}));

// ─── Pages under test ─────────────────────────────────────────────
import DocsPage      from '@/components/pages/DocsPage.vue';
import SettingsPage  from '@/components/pages/SettingsPage.vue';
import AppStatusBar  from '@/components/ui/AppStatusBar.vue';

// ─── Store access ─────────────────────────────────────────────────
import { useBudgetStore } from '@/stores/budget';

// ─── Helpers ──────────────────────────────────────────────────────
function mountWith(Component: object) {
  return mount(Component as Parameters<typeof mount>[0], { attachTo: document.body });
}

// ─────────────────────────────────────────────────────────────────
//  1. DOCS PAGE
// ─────────────────────────────────────────────────────────────────
describe('DocsPage', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(DocsPage);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('renders the docs page wrapper', async () => {
    const w = mountWith(DocsPage);
    await nextTick();
    expect(w.find('.page-docs').exists()).toBe(true);
    w.unmount();
  });

  it('shows User Guide section by default', async () => {
    const w = mountWith(DocsPage);
    await nextTick();
    // The first section should be visible
    expect(w.find('.docs-section').exists()).toBe(true);
    expect(w.find('.docs-section-title').text()).toContain('User Guide');
    w.unmount();
  });

  it('renders sidebar with 5 navigation buttons', async () => {
    const w = mountWith(DocsPage);
    await nextTick();
    const navBtns = w.findAll('.docs-nav-btn');
    expect(navBtns).toHaveLength(5);
    w.unmount();
  });

  it('first sidebar button is active (User Guide)', async () => {
    const w = mountWith(DocsPage);
    await nextTick();
    const activeBtn = w.find('.docs-nav-btn--active');
    expect(activeBtn.exists()).toBe(true);
    expect(activeBtn.text()).toContain('User Guide');
    w.unmount();
  });

  it('switches to Release Notes section on sidebar click', async () => {
    const w = mountWith(DocsPage);
    await nextTick();

    const releaseBtn = w.findAll('.docs-nav-btn').find(b => b.text().includes('Release Notes'));
    await releaseBtn!.trigger('click');
    await nextTick();

    expect(w.find('.docs-section-title').text()).toContain('Release Notes');
    w.unmount();
  });

  it('switches to FAQ section on sidebar click', async () => {
    const w = mountWith(DocsPage);
    await nextTick();

    const faqBtn = w.findAll('.docs-nav-btn').find(b => b.text().includes('FAQ'));
    await faqBtn!.trigger('click');
    await nextTick();

    expect(w.find('.docs-section-title').text()).toContain('FAQ');
    w.unmount();
  });

  it('switches to Privacy & Data section on sidebar click', async () => {
    const w = mountWith(DocsPage);
    await nextTick();

    const privacyBtn = w.findAll('.docs-nav-btn').find(b => b.text().includes('Privacy'));
    await privacyBtn!.trigger('click');
    await nextTick();

    expect(w.find('.docs-section-title').text()).toContain('Privacy');
    w.unmount();
  });

  it('switches to CSV Reference section on sidebar click', async () => {
    const w = mountWith(DocsPage);
    await nextTick();

    const csvBtn = w.findAll('.docs-nav-btn').find(b => b.text().includes('CSV'));
    await csvBtn!.trigger('click');
    await nextTick();

    // Section heading is "CSV Format Reference" (nav label is shorter)
    expect(w.find('.docs-section-title').text()).toContain('CSV Format Reference');
    w.unmount();
  });

  it('active nav button updates when section changes', async () => {
    const w = mountWith(DocsPage);
    await nextTick();

    // Click FAQ
    const faqBtn = w.findAll('.docs-nav-btn').find(b => b.text().includes('FAQ'));
    await faqBtn!.trigger('click');
    await nextTick();

    expect(faqBtn!.classes()).toContain('docs-nav-btn--active');

    // Previously active (User Guide) is no longer active
    const userGuideBtn = w.findAll('.docs-nav-btn').find(b => b.text().includes('User Guide'));
    expect(userGuideBtn!.classes()).not.toContain('docs-nav-btn--active');
    w.unmount();
  });

  it('renders mobile nav toggle element', async () => {
    const w = mountWith(DocsPage);
    await nextTick();
    expect(w.find('.docs-mobile-nav').exists()).toBe(true);
    expect(w.find('.docs-mobile-toggle').exists()).toBe(true);
    w.unmount();
  });

  it('opens mobile dropdown on toggle click', async () => {
    const w = mountWith(DocsPage);
    await nextTick();

    // Mobile menu is rendered with v-show so it's in DOM but hidden
    expect(w.find('.docs-mobile-menu').isVisible()).toBe(false);

    await w.find('.docs-mobile-toggle').trigger('click');
    await nextTick();

    expect(w.find('.docs-mobile-menu').isVisible()).toBe(true);
    w.unmount();
  });

  it('mobile dropdown has 5 items', async () => {
    const w = mountWith(DocsPage);
    await nextTick();

    await w.find('.docs-mobile-toggle').trigger('click');
    await nextTick();

    expect(w.findAll('.docs-mobile-item')).toHaveLength(5);
    w.unmount();
  });

  it('switches section via mobile dropdown item click', async () => {
    const w = mountWith(DocsPage);
    await nextTick();

    // Open mobile dropdown
    await w.find('.docs-mobile-toggle').trigger('click');
    await nextTick();

    // Click Release Notes item
    const mobileItems = w.findAll('.docs-mobile-item');
    const releaseItem = mobileItems.find(i => i.text().includes('Release Notes'));
    await releaseItem!.trigger('click');
    await nextTick();

    expect(w.find('.docs-section-title').text()).toContain('Release Notes');
    w.unmount();
  });

  it('closes mobile dropdown after selecting an item', async () => {
    const w = mountWith(DocsPage);
    await nextTick();

    await w.find('.docs-mobile-toggle').trigger('click');
    await nextTick();
    expect(w.find('.docs-mobile-menu').isVisible()).toBe(true);

    const mobileItems = w.findAll('.docs-mobile-item');
    await mobileItems[1].trigger('click');
    await nextTick();

    expect(w.find('.docs-mobile-menu').isVisible()).toBe(false);
    w.unmount();
  });

  it('Release Notes section contains v1.6.0', async () => {
    const w = mountWith(DocsPage);
    await nextTick();

    await w.findAll('.docs-nav-btn').find(b => b.text().includes('Release Notes'))!.trigger('click');
    await nextTick();

    expect(w.find('.docs-section').text()).toContain('v1.6.0');
    w.unmount();
  });

  // ── RS-26: Release notes refreshed through v2.17.0 ─────────────
  // (Updated in v2.45.4 — Mobile MOBILE-2: breakpoint consolidation to sm/md/lg.)
  it('RS-26: Release Notes contains the latest v2.45.4 entry', async () => {
    const w = mountWith(DocsPage);
    await nextTick();
    await w.findAll('.docs-nav-btn').find(b => b.text().includes('Release Notes'))!.trigger('click');
    await nextTick();
    expect(w.find('.docs-section').text()).toContain('v2.45.4');
    w.unmount();
  });

  it('RS-26: Release Notes contains every shipped v2.x version (regression guard)', async () => {
    const w = mountWith(DocsPage);
    await nextTick();
    await w.findAll('.docs-nav-btn').find(b => b.text().includes('Release Notes'))!.trigger('click');
    await nextTick();
    const text = w.find('.docs-section').text();
    // Walk every tagged v2.x version we shipped — newest first
    const versions = [
      'v2.45.4', 'v2.45.3', 'v2.45.2', 'v2.45.1', 'v2.45.0', 'v2.44.3', 'v2.44.2', 'v2.44.1', 'v2.44.0', 'v2.43.0', 'v2.42.0', 'v2.41.0', 'v2.39.1', 'v2.39.0', 'v2.38.1', 'v2.38.0', 'v2.37.0', 'v2.36.0', 'v2.35.0', 'v2.34.0', 'v2.33.0', 'v2.32.0', 'v2.31.0', 'v2.30.0', 'v2.29.0', 'v2.28.0', 'v2.27.0', 'v2.26.0', 'v2.25.0', 'v2.24.0', 'v2.23.0', 'v2.22.0', 'v2.21.0', 'v2.20.1', 'v2.20.0', 'v2.19.1', 'v2.19.0', 'v2.18.0',
      'v2.17.0', 'v2.16.0', 'v2.15.0', 'v2.14.0', 'v2.13.0', 'v2.12.0',
      'v2.11.0', 'v2.10.1 – .3', 'v2.10.0',
      'v2.9.0', 'v2.8.0', 'v2.7.0', 'v2.6.0', 'v2.5.0',
      'v2.4.0', 'v2.3.0', 'v2.2.0', 'v2.1.0', 'v2.0.0',
    ];
    for (const v of versions) {
      expect(text, `release notes should mention ${v}`).toContain(v);
    }
    w.unmount();
  });

  it('RS-26: Release Notes still contains every legacy v1.x version (no regression)', async () => {
    const w = mountWith(DocsPage);
    await nextTick();
    await w.findAll('.docs-nav-btn').find(b => b.text().includes('Release Notes'))!.trigger('click');
    await nextTick();
    const text = w.find('.docs-section').text();
    const legacy = [
      'v1.19.0', 'v1.18.0', 'v1.17.0', 'v1.16.0', 'v1.15.0',
      'v1.14.0', 'v1.13.0', 'v1.12.0', 'v1.11.0', 'v1.10.0',
      'v1.9.0', 'v1.8.0', 'v1.7.0', 'v1.6.0', 'v1.5.0',
      'v1.4.0', 'v1.3.0', 'v1.2.0', 'v1.1.0', 'v1.0.0',
    ];
    for (const v of legacy) {
      expect(text, `release notes should still mention ${v}`).toContain(v);
    }
    w.unmount();
  });

  it('RS-26: Release Notes renders the "Vivid Modern" era divider', async () => {
    const w = mountWith(DocsPage);
    await nextTick();
    await w.findAll('.docs-nav-btn').find(b => b.text().includes('Release Notes'))!.trigger('click');
    await nextTick();
    const heading = w.find('[data-testid="release-series-vivid"]');
    expect(heading.exists()).toBe(true);
    expect(heading.text()).toContain('Vivid Modern');
  });

  it('RS-26: Release Notes mentions each major redesign sprint (RS-9 through RS-25)', async () => {
    const w = mountWith(DocsPage);
    await nextTick();
    await w.findAll('.docs-nav-btn').find(b => b.text().includes('Release Notes'))!.trigger('click');
    await nextTick();
    const text = w.find('.docs-section').text();
    // Spot-check that the redesign-sprint identifiers are documented
    for (const sprint of ['TECH-DEBT-1', 'BUG-032', 'RS-33', 'BUG-031', 'BUG-030', 'BUG-029', 'BUG-028', 'BUG-027', 'BUG-026', 'RS-32', 'BUG-025', 'BUG-023', 'BUG-024', 'RS-31', 'RS-30', 'RS-29', 'RS-28', 'RS-27', 'RS-25', 'RS-24', 'RS-23', 'RS-22', 'RS-21', 'RS-20', 'RS-19', 'RS-11', 'RS-1 through RS-9']) {
      expect(text, `release notes should reference ${sprint}`).toContain(sprint);
    }
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  2. SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────
describe('SettingsPage', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(SettingsPage);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('renders the settings page wrapper', async () => {
    const w = mountWith(SettingsPage);
    await nextTick();
    expect(w.find('.page-settings').exists()).toBe(true);
    w.unmount();
  });

  it('renders PayStartDate section (mocked)', async () => {
    const w = mountWith(SettingsPage);
    await nextTick();
    expect(w.find('[data-testid="pay-start-date"]').exists()).toBe(true);
    w.unmount();
  });

  it('renders RulesEngine section (mocked)', async () => {
    const w = mountWith(SettingsPage);
    await nextTick();
    expect(w.find('[data-testid="rules-engine"]').exists()).toBe(true);
    w.unmount();
  });

  it('renders BudgetAlerts section (mocked)', async () => {
    const w = mountWith(SettingsPage);
    await nextTick();
    expect(w.find('[data-testid="budget-alerts"]').exists()).toBe(true);
    w.unmount();
  });

  it('renders Spending Categories section (Sprint 19 — CategoryManager)', async () => {
    // The chequing balance section was moved to the Dashboard in Sprint 19 and
    // replaced in Settings with the new CategoryManager.
    const w = mountWith(SettingsPage);
    await nextTick();
    // CategoryManager renders a .cat-manager wrapper
    expect(w.find('.cat-manager').exists()).toBe(true);
    w.unmount();
  });

  it('does NOT render chequing balance section in Settings (moved to Dashboard in Sprint 19)', async () => {
    const w = mountWith(SettingsPage);
    await nextTick();
    // The old settings-funds CSS class should be gone
    expect(w.find('.settings-funds__label').exists()).toBe(false);
    expect(w.find('.settings-funds__form').exists()).toBe(false);
    w.unmount();
  });

  it('renders the Danger Zone card', async () => {
    const w = mountWith(SettingsPage);
    await nextTick();
    expect(w.find('.settings-danger').exists()).toBe(true);
    w.unmount();
  });

  it('shows "Clear All Data" button initially', async () => {
    const w = mountWith(SettingsPage);
    await nextTick();
    const btn = w.findAll('button').find(b => b.text().includes('Clear All Data'));
    expect(btn).toBeDefined();
    w.unmount();
  });

  it('first click shows confirmation message instead of clearing', async () => {
    const w = mountWith(SettingsPage);
    await nextTick();

    const clearBtn = w.findAll('button').find(b => b.text().includes('Clear All Data'));
    await clearBtn!.trigger('click');
    await nextTick();

    // Should show confirmation text, not clear yet
    const confirmBtn = w.find('.settings-danger__action').findAll('button')[0];
    expect(confirmBtn.text()).toContain('Click again to confirm');
    w.unmount();
  });

  it('second click actually clears all data', async () => {
    const budget = useBudgetStore();
    budget.addIncomeStream({ name: 'Salary', amount: 4000, biweekly: false });
    expect(budget.incomeStreams).toHaveLength(1);

    const w = mountWith(SettingsPage);
    await nextTick();

    // First click
    const clearBtn = w.findAll('button').find(b => b.text().includes('Clear All Data'));
    await clearBtn!.trigger('click');
    await nextTick();

    // Second click — now button says "Click again to confirm..."
    const confirmBtn = w.find('.settings-danger__action').findAll('button')[0];
    await confirmBtn.trigger('click');
    await nextTick();

    expect(budget.incomeStreams).toHaveLength(0);
    w.unmount();
  });

  it('shows Cancel button after first Danger Zone click', async () => {
    const w = mountWith(SettingsPage);
    await nextTick();

    await w.findAll('button').find(b => b.text().includes('Clear All Data'))!.trigger('click');
    await nextTick();

    const cancelBtn = w.findAll('button').find(b => b.text() === 'Cancel');
    expect(cancelBtn).toBeDefined();
    w.unmount();
  });

  it('cancels Danger Zone without clearing data', async () => {
    const budget = useBudgetStore();
    budget.addIncomeStream({ name: 'Salary', amount: 4000, biweekly: false });

    const w = mountWith(SettingsPage);
    await nextTick();

    // First click to arm
    await w.findAll('button').find(b => b.text().includes('Clear All Data'))!.trigger('click');
    await nextTick();

    // Cancel
    await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click');
    await nextTick();

    expect(budget.incomeStreams).toHaveLength(1);
    // Button should revert to "Clear All Data"
    expect(w.findAll('button').find(b => b.text().includes('Clear All Data'))).toBeDefined();
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  3. APP STATUS BAR  (RS-8)
// ─────────────────────────────────────────────────────────────────
describe('AppStatusBar', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(AppStatusBar);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('renders the status bar wrapper', async () => {
    const w = mountWith(AppStatusBar);
    await nextTick();
    expect(w.find('.app-status-bar').exists()).toBe(true);
    w.unmount();
  });

  it('renders two zones — ticker and bill', async () => {
    const w = mountWith(AppStatusBar);
    await nextTick();
    expect(w.find('.ticker-zone').exists()).toBe(true);
    expect(w.find('.bill-zone').exists()).toBe(true);
    w.unmount();
  });

  it('shows empty-state hint when no purchases exist (DEFAULT_STATE)', async () => {
    const w = mountWith(AppStatusBar);
    await nextTick();
    // Should find the "No recent purchases" fallback
    const emptyEl = w.find('.ticker-empty');
    expect(emptyEl.exists()).toBe(true);
    expect(emptyEl.text()).toContain('No recent purchases');
    w.unmount();
  });

  it('shows purchase name and amount in ticker when purchases exist', async () => {
    const budget = useBudgetStore();
    // Add a single purchase so the ticker renders it
    budget.addPurchase({
      name: 'Tim Hortons',
      amount: 4.75,
      category: 'other',
      cardId: null,
      budgetType: 'wants',
      date: new Date().toISOString().split('T')[0] as never,
    });

    const w = mountWith(AppStatusBar);
    await nextTick();

    expect(w.find('.ticker-item__name').text()).toContain('Tim Hortons');
    expect(w.find('.ticker-item__amt').text()).toContain('4.75');
    w.unmount();
  });

  it('shows "Nothing due soon" when no pay period forecast exists (DEFAULT_STATE)', async () => {
    // DEFAULT_STATE has payStart: null → payPeriodForecast is null → no upcoming bills
    const w = mountWith(AppStatusBar);
    await nextTick();
    const emptyEls = w.findAll('.ticker-empty');
    expect(emptyEls.some(el => el.text().includes('Nothing due soon'))).toBe(true);
    w.unmount();
  });

  it('renders all purchases in the scrolling ticker (original + duplicate pass)', async () => {
    const budget = useBudgetStore();
    const today = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Coffee',    amount: 5,  category: 'other', cardId: null, budgetType: 'wants', date: today });
    budget.addPurchase({ name: 'Lunch',     amount: 12, category: 'other', cardId: null, budgetType: 'wants', date: today });
    budget.addPurchase({ name: 'Groceries', amount: 45, category: 'other', cardId: null, budgetType: 'wants', date: today });

    const w = mountWith(AppStatusBar);
    await nextTick();

    // ticker-inner holds original + duplicate passes for seamless loop
    expect(w.find('.ticker-inner').exists()).toBe(true);
    // 3 purchases × 2 (original + duplicate) = 6 ticker-item elements
    expect(w.findAll('.ticker-item')).toHaveLength(6);
    w.unmount();
  });

  it('renders the bill ticker zone with "UPCOMING" label', async () => {
    const w = mountWith(AppStatusBar);
    await nextTick();
    expect(w.find('.bill-zone').exists()).toBe(true);
    // New scrolling-ticker structure: static label + scroll window
    expect(w.find('.bill-label').exists()).toBe(true);
    expect(w.find('.bill-label').text()).toContain('UPCOMING');
    w.unmount();
  });
});
