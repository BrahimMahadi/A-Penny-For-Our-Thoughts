/**
 * Module:   tests/components/pages/pages.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 7)
 * Summary:  Mount-level tests for the page-level SFCs added/replaced in Sprint 7:
 *             • DocsPage  — 5 sections, sidebar nav, mobile nav
 *             • SettingsPage — hosts 4 cards + danger zone
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

// ─── Pages under test ─────────────────────────────────────────────
import DocsPage     from '@/components/pages/DocsPage.vue';
import SettingsPage from '@/components/pages/SettingsPage.vue';

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

  it('Release Notes section contains v3.0', async () => {
    const w = mountWith(DocsPage);
    await nextTick();

    await w.findAll('.docs-nav-btn').find(b => b.text().includes('Release Notes'))!.trigger('click');
    await nextTick();

    expect(w.find('.docs-section').text()).toContain('v3.0');
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

  it('renders Chequing Balance card with current balance', async () => {
    // DEFAULT_STATE.fundsRemaining = 0 — just verify the card renders
    const w = mountWith(SettingsPage);
    await nextTick();
    // The balance label should be present
    expect(w.find('.settings-funds__label').exists()).toBe(true);
    expect(w.find('.settings-funds__label').text()).toContain('Current balance');
    w.unmount();
  });

  it('shows Update Balance button when not editing', async () => {
    const w = mountWith(SettingsPage);
    await nextTick();
    const btn = w.findAll('button').find(b => b.text().includes('Update Balance'));
    expect(btn).toBeDefined();
    w.unmount();
  });

  it('opens balance edit form when Update Balance is clicked', async () => {
    const w = mountWith(SettingsPage);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Update Balance'))!.trigger('click');
    await nextTick();
    expect(w.find('.settings-funds__form').exists()).toBe(true);
    expect(w.find('.settings-funds__input').exists()).toBe(true);
    w.unmount();
  });

  it('saves the balance when Save is clicked', async () => {
    const budget = useBudgetStore();
    const w = mountWith(SettingsPage);
    await nextTick();

    await w.findAll('button').find(b => b.text().includes('Update Balance'))!.trigger('click');
    await nextTick();

    const input = w.find('.settings-funds__input');
    await input.setValue(3500);
    await nextTick();

    const saveBtn = w.findAll('button').find(b => b.text() === 'Save');
    await saveBtn!.trigger('click');
    await nextTick();

    expect(budget.fundsRemaining).toBe(3500);
    expect(w.find('.settings-funds__form').exists()).toBe(false);
    w.unmount();
  });

  it('cancels balance edit without saving', async () => {
    const budget = useBudgetStore();
    const initialBalance = budget.fundsRemaining;
    const w = mountWith(SettingsPage);
    await nextTick();

    await w.findAll('button').find(b => b.text().includes('Update Balance'))!.trigger('click');
    await nextTick();

    const cancelBtn = w.findAll('button').find(b => b.text() === 'Cancel');
    await cancelBtn!.trigger('click');
    await nextTick();

    expect(budget.fundsRemaining).toBe(initialBalance);
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
