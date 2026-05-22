/**
 * Module:   tests/components/sections/settings.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 7)
 * Summary:  Mount-level tests for the three new Settings section SFCs:
 *             • PayStartDate
 *             • RulesEngine
 *             • BudgetAlerts
 *           Also tests the WantsTracker additions from Sprint 7:
 *             • Alert banner when a budget alert is triggered
 *             • Auto-categorise purchase name via rules watcher
 *
 * Invariants:
 *   - DEFAULT_STATE has payStart: null, rules: [], budgetAlerts: []
 *   - afterEach cleans document.body so Teleport DOM doesn't bleed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

// ─── Mock chart dependencies (avoid canvas in jsdom) ─────────────
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

// ─── SFCs under test ──────────────────────────────────────────────
import PayStartDate  from '@/components/sections/PayStartDate.vue';
import RulesEngine   from '@/components/sections/RulesEngine.vue';
import BudgetAlerts  from '@/components/sections/BudgetAlerts.vue';
import WantsTracker  from '@/components/sections/WantsTracker.vue';

// ─── Store access ─────────────────────────────────────────────────
import { useBudgetStore } from '@/stores/budget';

// ─── Helpers ──────────────────────────────────────────────────────
function mountWith(Component: object) {
  return mount(Component as Parameters<typeof mount>[0], { attachTo: document.body });
}

function modalOpen() {
  return !!document.body.querySelector('.base-modal');
}

// ─────────────────────────────────────────────────────────────────
//  1. PAY START DATE
// ─────────────────────────────────────────────────────────────────
describe('PayStartDate', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(PayStartDate);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('shows unset warning when payStart is null (DEFAULT_STATE)', async () => {
    const w = mountWith(PayStartDate);
    await nextTick();
    expect(w.find('.pay-start__unset').exists()).toBe(true);
    expect(w.find('.pay-start__unset').text()).toContain('Not configured');
    w.unmount();
  });

  it('hides unset warning when payStart is set', async () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-01');
    const w = mountWith(PayStartDate);
    await nextTick();
    expect(w.find('.pay-start__unset').exists()).toBe(false);
    expect(w.find('.pay-start__value').exists()).toBe(true);
    w.unmount();
  });

  it('shows period preview when payStart is set', async () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-01');
    const w = mountWith(PayStartDate);
    await nextTick();
    expect(w.find('.pay-start__preview').exists()).toBe(true);
    // Preview should show two rows: current and next period
    expect(w.findAll('.pay-start__preview-item')).toHaveLength(2);
    w.unmount();
  });

  it('hides period preview when payStart is null', async () => {
    const w = mountWith(PayStartDate);
    await nextTick();
    expect(w.find('.pay-start__preview').exists()).toBe(false);
    w.unmount();
  });

  it('shows "Set Date" button when payStart is null', async () => {
    const w = mountWith(PayStartDate);
    await nextTick();
    const btn = w.findAll('button').find(b => b.text().includes('Set Date'));
    expect(btn).toBeDefined();
    w.unmount();
  });

  it('shows "Change" and "Clear" buttons when payStart is set', async () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-01');
    const w = mountWith(PayStartDate);
    await nextTick();
    const changeBtn = w.findAll('button').find(b => b.text().includes('Change'));
    const clearBtn  = w.findAll('button').find(b => b.text().includes('Clear'));
    expect(changeBtn).toBeDefined();
    expect(clearBtn).toBeDefined();
    w.unmount();
  });

  it('opens edit form when "Set Date" is clicked', async () => {
    const w = mountWith(PayStartDate);
    await nextTick();
    const setBtn = w.findAll('button').find(b => b.text().includes('Set Date'));
    await setBtn!.trigger('click');
    await nextTick();
    expect(w.find('.pay-start__form').exists()).toBe(true);
    expect(w.find('input[type="date"]').exists()).toBe(true);
    w.unmount();
  });

  it('saves a new date when Save is clicked with a valid date', async () => {
    const budget = useBudgetStore();
    const w = mountWith(PayStartDate);
    await nextTick();

    // Open form
    const setBtn = w.findAll('button').find(b => b.text().includes('Set Date'));
    await setBtn!.trigger('click');
    await nextTick();

    // Set date value
    const input = w.find('input[type="date"]');
    await input.setValue('2026-05-09');

    // Click Save
    const saveBtn = w.findAll('button').find(b => b.text() === 'Save');
    await saveBtn!.trigger('click');
    await nextTick();

    expect(budget.payStart).toBe('2026-05-09');
    expect(w.find('.pay-start__form').exists()).toBe(false); // form closes
    w.unmount();
  });

  it('cancels edit form without saving when Cancel is clicked', async () => {
    const budget = useBudgetStore();
    const w = mountWith(PayStartDate);
    await nextTick();

    await w.findAll('button').find(b => b.text().includes('Set Date'))!.trigger('click');
    await nextTick();

    const cancelBtn = w.findAll('button').find(b => b.text() === 'Cancel');
    await cancelBtn!.trigger('click');
    await nextTick();

    expect(budget.payStart).toBeNull();
    expect(w.find('.pay-start__form').exists()).toBe(false);
    w.unmount();
  });

  it('clears payStart when Clear is clicked', async () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-01');
    const w = mountWith(PayStartDate);
    await nextTick();

    const clearBtn = w.findAll('button').find(b => b.text() === 'Clear');
    await clearBtn!.trigger('click');
    await nextTick();

    expect(budget.payStart).toBeNull();
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  2. RULES ENGINE
// ─────────────────────────────────────────────────────────────────
describe('RulesEngine', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(RulesEngine);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('shows empty state when no rules (DEFAULT_STATE)', async () => {
    const w = mountWith(RulesEngine);
    await nextTick();
    expect(w.find('.base-empty-state').exists()).toBe(true);
    w.unmount();
  });

  it('renders rules list when store has rules', async () => {
    const budget = useBudgetStore();
    budget.addRule({ pattern: 'tim hortons', matchType: 'contains', category: 'Food & Drink' });
    const w = mountWith(RulesEngine);
    await nextTick();
    expect(w.find('.rules-engine__list').exists()).toBe(true);
    expect(w.find('.rules-engine__pattern').text()).toBe('tim hortons');
    w.unmount();
  });

  it('shows correct category in rules list', async () => {
    const budget = useBudgetStore();
    budget.addRule({ pattern: 'netflix', matchType: 'exact', category: 'Entertainment' });
    const w = mountWith(RulesEngine);
    await nextTick();
    expect(w.find('.rules-engine__category').text()).toBe('Entertainment');
    w.unmount();
  });

  it('shows priority numbers starting at 1', async () => {
    const budget = useBudgetStore();
    budget.addRule({ pattern: 'a', matchType: 'contains', category: 'Food & Drink' });
    budget.addRule({ pattern: 'b', matchType: 'contains', category: 'Shopping' });
    const w = mountWith(RulesEngine);
    await nextTick();
    const priorities = w.findAll('.rules-engine__priority').map(el => el.text());
    expect(priorities).toContain('1');
    expect(priorities).toContain('2');
    w.unmount();
  });

  it('opens add modal on "+ Add Rule" click', async () => {
    const w = mountWith(RulesEngine);
    await nextTick();
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Rule'));
    await addBtn!.trigger('click');
    await nextTick();
    expect(modalOpen()).toBe(true);
    w.unmount();
  });

  it('modal title is "Add Rule" when adding', async () => {
    const w = mountWith(RulesEngine);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Add Rule'))!.trigger('click');
    await nextTick();
    const modal = document.body.querySelector('.base-modal');
    expect(modal?.textContent).toContain('Add Rule');
    w.unmount();
  });

  it('saves a new rule via the modal', async () => {
    const budget = useBudgetStore();
    const w = mountWith(RulesEngine);
    await nextTick();

    // Open modal
    await w.findAll('button').find(b => b.text().includes('Add Rule'))!.trigger('click');
    await nextTick();

    // Fill in pattern via v-model input (id="rule-pattern")
    const patternInput = document.body.querySelector<HTMLInputElement>('#rule-pattern');
    if (patternInput) {
      patternInput.value = 'starbucks';
      patternInput.dispatchEvent(new Event('input'));
    }
    await nextTick();

    // Click save button inside modal
    const saveBtn = Array.from(document.body.querySelectorAll('button'))
      .find(b => b.textContent?.trim() === 'Add Rule' && !b.classList.contains('rules-engine__icon-btn'));
    saveBtn?.click();
    await nextTick();

    expect(budget.rules).toHaveLength(1);
    expect(budget.rules[0].pattern).toBe('starbucks');
    w.unmount();
  });

  it('opens edit modal when edit button is clicked', async () => {
    const budget = useBudgetStore();
    budget.addRule({ pattern: 'walmart', matchType: 'contains', category: 'Shopping' });
    const w = mountWith(RulesEngine);
    await nextTick();

    const editBtn = w.find('[aria-label="Edit rule"]');
    await editBtn.trigger('click');
    await nextTick();

    expect(modalOpen()).toBe(true);
    const modal = document.body.querySelector('.base-modal');
    expect(modal?.textContent).toContain('Edit Rule');
    w.unmount();
  });

  it('deletes a rule when delete button is clicked', async () => {
    const budget = useBudgetStore();
    budget.addRule({ pattern: 'uber', matchType: 'contains', category: 'Transportation' });
    expect(budget.rules).toHaveLength(1);

    const w = mountWith(RulesEngine);
    await nextTick();

    const deleteBtn = w.find('[aria-label="Delete rule"]');
    await deleteBtn.trigger('click');
    await nextTick();

    expect(budget.rules).toHaveLength(0);
    w.unmount();
  });

  it('shows live test input when rules exist', async () => {
    const budget = useBudgetStore();
    budget.addRule({ pattern: 'tim', matchType: 'contains', category: 'Food & Drink' });
    const w = mountWith(RulesEngine);
    await nextTick();
    expect(w.find('.rules-engine__test').exists()).toBe(true);
    expect(w.find('#rules-test-input').exists()).toBe(true);
    w.unmount();
  });

  it('hides live test input when no rules', async () => {
    const w = mountWith(RulesEngine);
    await nextTick();
    expect(w.find('.rules-engine__test').exists()).toBe(false);
    w.unmount();
  });

  it('shows matched category in live test', async () => {
    const budget = useBudgetStore();
    budget.addRule({ pattern: 'tim hortons', matchType: 'contains', category: 'Food & Drink' });
    const w = mountWith(RulesEngine);
    await nextTick();

    const input = w.find('#rules-test-input');
    await input.setValue('Tim Hortons Coffee');
    await nextTick();

    expect(w.find('.rules-engine__test-match').text()).toContain('Food & Drink');
    w.unmount();
  });

  it('shows "No match" in live test when no rule matches', async () => {
    const budget = useBudgetStore();
    budget.addRule({ pattern: 'netflix', matchType: 'exact', category: 'Entertainment' });
    const w = mountWith(RulesEngine);
    await nextTick();

    const input = w.find('#rules-test-input');
    await input.setValue('random purchase');
    await nextTick();

    expect(w.find('.rules-engine__test-no-match').exists()).toBe(true);
    expect(w.find('.rules-engine__test-no-match').text()).toContain('No match');
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  3. BUDGET ALERTS
// ─────────────────────────────────────────────────────────────────
describe('BudgetAlerts', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(BudgetAlerts);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('shows empty state when no alerts (DEFAULT_STATE)', async () => {
    const w = mountWith(BudgetAlerts);
    await nextTick();
    expect(w.find('.base-empty-state').exists()).toBe(true);
    w.unmount();
  });

  it('renders alerts list when store has alerts', async () => {
    const budget = useBudgetStore();
    budget.addBudgetAlert({ category: 'Food & Drink', threshold: 100 });
    const w = mountWith(BudgetAlerts);
    await nextTick();
    expect(w.find('.budget-alerts__list').exists()).toBe(true);
    expect(w.find('.budget-alerts__category').text()).toBe('Food & Drink');
    w.unmount();
  });

  it('renders threshold value', async () => {
    const budget = useBudgetStore();
    budget.addBudgetAlert({ category: 'Shopping', threshold: 250 });
    const w = mountWith(BudgetAlerts);
    await nextTick();
    expect(w.find('.budget-alerts__threshold').text()).toContain('250');
    w.unmount();
  });

  it('opens add modal on "+ Add Alert" click', async () => {
    const w = mountWith(BudgetAlerts);
    await nextTick();
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Alert'));
    await addBtn!.trigger('click');
    await nextTick();
    expect(modalOpen()).toBe(true);
    w.unmount();
  });

  it('modal title is "Add Alert" when adding', async () => {
    const w = mountWith(BudgetAlerts);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Add Alert'))!.trigger('click');
    await nextTick();
    const modal = document.body.querySelector('.base-modal');
    expect(modal?.textContent).toContain('Add Alert');
    w.unmount();
  });

  it('saves a new alert via the modal', async () => {
    const budget = useBudgetStore();
    const w = mountWith(BudgetAlerts);
    await nextTick();

    // Open modal
    await w.findAll('button').find(b => b.text().includes('Add Alert'))!.trigger('click');
    await nextTick();

    // Set threshold value
    const thresholdInput = document.body.querySelector<HTMLInputElement>('#alert-threshold');
    if (thresholdInput) {
      thresholdInput.value = '150';
      thresholdInput.dispatchEvent(new Event('input'));
    }
    await nextTick();

    // Click save button
    const saveBtn = Array.from(document.body.querySelectorAll('button'))
      .find(b => b.textContent?.trim() === 'Add Alert' && !b.classList.contains('budget-alerts__icon-btn'));
    saveBtn?.click();
    await nextTick();

    expect(budget.budgetAlerts).toHaveLength(1);
    expect(budget.budgetAlerts[0].threshold).toBe(150);
    w.unmount();
  });

  it('opens edit modal when edit button is clicked', async () => {
    const budget = useBudgetStore();
    budget.addBudgetAlert({ category: 'Groceries', threshold: 200 });
    const w = mountWith(BudgetAlerts);
    await nextTick();

    const editBtn = w.find('[aria-label="Edit alert"]');
    await editBtn.trigger('click');
    await nextTick();

    expect(modalOpen()).toBe(true);
    const modal = document.body.querySelector('.base-modal');
    expect(modal?.textContent).toContain('Edit Alert');
    w.unmount();
  });

  it('deletes an alert when delete button is clicked', async () => {
    const budget = useBudgetStore();
    budget.addBudgetAlert({ category: 'Transportation', threshold: 75 });
    expect(budget.budgetAlerts).toHaveLength(1);

    const w = mountWith(BudgetAlerts);
    await nextTick();

    const deleteBtn = w.find('[aria-label="Delete alert"]');
    await deleteBtn.trigger('click');
    await nextTick();

    expect(budget.budgetAlerts).toHaveLength(0);
    w.unmount();
  });

  it('shows 🟢 status dot for non-firing alerts', async () => {
    const budget = useBudgetStore();
    // Add alert with high threshold — won't fire with $0 spending
    budget.addBudgetAlert({ category: 'Shopping', threshold: 9999 });
    const w = mountWith(BudgetAlerts);
    await nextTick();
    const dot = w.find('.budget-alerts__firing-dot');
    expect(dot.text()).toBe('🟢');
    w.unmount();
  });

  it('shows 🔴 status dot for firing alerts', async () => {
    const budget = useBudgetStore();
    // Add alert with very low threshold
    budget.addBudgetAlert({ category: 'Food & Drink', threshold: 1 });
    // Add purchase that exceeds threshold
    budget.addPurchase({
      name:       'Coffee',
      amount:     5,
      category:   'Food & Drink',
      date:       new Date().toISOString().split('T')[0],
      cardId:     null,
      budgetType: 'wants',
    });
    const w = mountWith(BudgetAlerts);
    await nextTick();
    const dot = w.find('.budget-alerts__firing-dot');
    expect(dot.text()).toBe('🔴');
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  4. WANTS TRACKER — Sprint 7 additions
// ─────────────────────────────────────────────────────────────────
describe('WantsTracker — Sprint 7', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('renders no alert banner when no budget alerts are triggered', async () => {
    const w = mountWith(WantsTracker);
    await nextTick();
    expect(w.find('.wants-tracker__alerts').exists()).toBe(false);
    w.unmount();
  });

  it('renders alert banner when an alert is triggered', async () => {
    const budget = useBudgetStore();
    // Alert fires when spending > threshold
    budget.addBudgetAlert({ category: 'Food & Drink', threshold: 1 });
    budget.addPurchase({
      name:       'Lunch',
      amount:     15,
      category:   'Food & Drink',
      date:       new Date().toISOString().split('T')[0],
      cardId:     null,
      budgetType: 'wants',
    });
    const w = mountWith(WantsTracker);
    await nextTick();
    expect(w.find('.wants-tracker__alerts').exists()).toBe(true);
    w.unmount();
  });

  it('alert banner contains category name when triggered', async () => {
    const budget = useBudgetStore();
    budget.addBudgetAlert({ category: 'Shopping', threshold: 5 });
    budget.addPurchase({
      name:       'T-shirt',
      amount:     50,
      category:   'Shopping',
      date:       new Date().toISOString().split('T')[0],
      cardId:     null,
      budgetType: 'wants',
    });
    const w = mountWith(WantsTracker);
    await nextTick();
    expect(w.find('.wants-tracker__alerts').text()).toContain('Shopping');
    w.unmount();
  });

  it('alert banner has role="alert" for accessibility', async () => {
    const budget = useBudgetStore();
    budget.addBudgetAlert({ category: 'Entertainment', threshold: 1 });
    budget.addPurchase({
      name:       'Movie',
      amount:     18,
      category:   'Entertainment',
      date:       new Date().toISOString().split('T')[0],
      cardId:     null,
      budgetType: 'wants',
    });
    const w = mountWith(WantsTracker);
    await nextTick();
    const alerts = w.find('.wants-tracker__alerts');
    expect(alerts.attributes('role')).toBe('alert');
    w.unmount();
  });

  it('auto-fills category when purchase name matches a rule', async () => {
    const budget = useBudgetStore();
    budget.addRule({ pattern: 'tim hortons', matchType: 'contains', category: 'Food & Drink' });

    const w = mountWith(WantsTracker);
    await nextTick();

    // Open add purchase modal
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Purchase'));
    await addBtn!.trigger('click');
    await nextTick();

    // Type into the name field (id="p-name" in WantsTracker template)
    const nameInput = document.body.querySelector<HTMLInputElement>('#p-name');
    if (nameInput) {
      nameInput.value = 'Tim Hortons Medium Coffee';
      nameInput.dispatchEvent(new Event('input'));
    }
    await nextTick();
    await nextTick(); // allow watcher to run

    // Category should have been auto-filled (id="p-cat" in WantsTracker template)
    const categorySelect = document.body.querySelector<HTMLSelectElement>('#p-cat');
    expect(categorySelect?.value).toBe('Food & Drink');
    w.unmount();
  });
});
