/**
 * Module:   tests/components/sections/sections.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Vue 3 migration — Sprint 4)
 * Summary:  Mount-level tests for all 13 section SFCs. Each suite:
 *   - Verifies the component mounts without throwing
 *   - Checks empty-state render (class: .base-empty-state)
 *   - Asserts data-driven DOM elements when the store is populated
 *   - Confirms the primary add/edit modal opens (BaseModal is
 *     Teleported to document.body — search there, not in wrapper)
 *
 * Invariants:
 *   - DEFAULT_STATE pre-populates loans (2), creditCards (2),
 *     subscriptions (1), wishlist (1), savingsAccounts (2).
 *     Tests that need a blank slate clear the relevant array first.
 *   - Chart sub-components are stubbed via vi.mock so no canvas is
 *     required in jsdom.
 *   - afterEach cleans up document.body so Teleport DOM doesn't bleed.
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

// ─── Section SFCs under test ──────────────────────────────────────
import IncomeStreams      from '@/components/sections/IncomeStreams.vue';
import BudgetAllocation  from '@/components/sections/BudgetAllocation.vue';
import WantsTracker      from '@/components/sections/WantsTracker.vue';
import ExpenseCards      from '@/components/sections/ExpenseCards.vue';
import Loans             from '@/components/sections/Loans.vue';
import CreditCards       from '@/components/sections/CreditCards.vue';
import Subscriptions     from '@/components/sections/Subscriptions.vue';
import Savings           from '@/components/sections/Savings.vue';
import SavingsGoals      from '@/components/sections/SavingsGoals.vue';
import Wishlist          from '@/components/sections/Wishlist.vue';
import NetWorth          from '@/components/sections/NetWorth.vue';
import BudgetVsActual    from '@/components/sections/BudgetVsActual.vue';
import SpendingAnalytics from '@/components/sections/SpendingAnalytics.vue';
import RecurringCalendar from '@/components/sections/RecurringCalendar.vue';

// ─── Store access (after setActivePinia) ─────────────────────────
import { useBudgetStore } from '@/stores/budget';
import { useUiStore }     from '@/stores/ui';

// ─── Helpers ──────────────────────────────────────────────────────
/** Mount with body attachment so Teleport works correctly. */
function mountWith(Component: object) {
  return mount(Component as Parameters<typeof mount>[0], { attachTo: document.body });
}

/** Whether BaseModal is currently in the document (Teleport target). */
function modalOpen() {
  return !!document.body.querySelector('.base-modal');
}

// ─────────────────────────────────────────────────────────────────
//  1. INCOME STREAMS
// ─────────────────────────────────────────────────────────────────
describe('IncomeStreams', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(IncomeStreams);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('shows empty state when no streams (DEFAULT_STATE has none)', async () => {
    // DEFAULT_STATE.incomeStreams is already empty
    const w = mountWith(IncomeStreams);
    await nextTick();
    expect(w.find('.base-empty-state').exists()).toBe(true);
    w.unmount();
  });

  it('renders stream list when store has data', async () => {
    const budget = useBudgetStore();
    budget.addIncomeStream({ name: 'Salary', amount: 4000, biweekly: false });
    const w = mountWith(IncomeStreams);
    await nextTick();
    expect(w.find('.income-streams__list').exists()).toBe(true);
    expect(w.find('.income-stream-item__name').text()).toBe('Salary');
    w.unmount();
  });

  it('shows bi-weekly chip for biweekly streams', async () => {
    const budget = useBudgetStore();
    budget.addIncomeStream({ name: 'Paycheque', amount: 2000, biweekly: true });
    const w = mountWith(IncomeStreams);
    await nextTick();
    expect(w.find('.income-stream-item__chip').text()).toBe('bi-wk');
    w.unmount();
  });

  it('opens add modal when "+ Add Stream" is clicked', async () => {
    const w = mountWith(IncomeStreams);
    await nextTick();
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Stream'));
    await addBtn!.trigger('click');
    await nextTick();
    expect(modalOpen()).toBe(true);
    w.unmount();
  });

  it('displays the correct monthly total', async () => {
    const budget = useBudgetStore();
    budget.addIncomeStream({ name: 'Job', amount: 3500, biweekly: false });
    const w = mountWith(IncomeStreams);
    await nextTick();
    expect(w.find('.income-streams__total').text()).toContain('$3,500.00');
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  2. BUDGET ALLOCATION
// ─────────────────────────────────────────────────────────────────
describe('BudgetAllocation', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(BudgetAllocation);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('shows the three allocation cards', async () => {
    const w = mountWith(BudgetAllocation);
    await nextTick();
    expect(w.findAll('.alloc-card')).toHaveLength(3);
    w.unmount();
  });

  it('displays default 50/30/20 allocation', async () => {
    const w = mountWith(BudgetAllocation);
    await nextTick();
    const text = w.text();
    expect(text).toContain('50');
    expect(text).toContain('30');
    expect(text).toContain('20');
    w.unmount();
  });

  it('toggles to bi-weekly display on button click', async () => {
    const w = mountWith(BudgetAllocation);
    await nextTick();
    const toggleBtn = w.find('.display-toggle');
    expect(toggleBtn.text()).toBe('Monthly');
    await toggleBtn.trigger('click');
    await nextTick();
    expect(toggleBtn.text()).toBe('Bi-weekly');
    w.unmount();
  });

  it('opens edit modal on "Edit %" click', async () => {
    const w = mountWith(BudgetAllocation);
    await nextTick();
    const editBtn = w.findAll('button').find(b => b.text().includes('Edit'));
    await editBtn!.trigger('click');
    await nextTick();
    expect(modalOpen()).toBe(true);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  3. WANTS TRACKER
// ─────────────────────────────────────────────────────────────────
describe('WantsTracker', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(WantsTracker);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('renders the wants-tracker wrapper', async () => {
    const w = mountWith(WantsTracker);
    await nextTick();
    expect(w.find('.wants-tracker').exists()).toBe(true);
    w.unmount();
  });

  it('shows the bi-weekly budget amount based on income', async () => {
    const budget = useBudgetStore();
    // Add income so budget is non-zero
    budget.addIncomeStream({ name: 'Pay', amount: 4000, biweekly: false });
    // Default allocation is 30% wants → $4000 × 0.30 / 2 = $600
    const w = mountWith(WantsTracker);
    await nextTick();
    // Budget value appears in the stats column
    expect(w.find('.wants-stat-value.accent').text()).toContain('600.00');
    w.unmount();
  });

  it('shows empty purchase list when no purchases (DEFAULT_STATE)', async () => {
    // DEFAULT_STATE.purchases = [] — empty state renders
    const w = mountWith(WantsTracker);
    await nextTick();
    expect(w.find('.base-empty-state').exists()).toBe(true);
    w.unmount();
  });

  it('opens add purchase modal on button click', async () => {
    const w = mountWith(WantsTracker);
    await nextTick();
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Purchase'));
    expect(addBtn).toBeDefined();
    await addBtn!.trigger('click');
    await nextTick();
    expect(modalOpen()).toBe(true);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  4. EXPENSE CARDS
// ─────────────────────────────────────────────────────────────────
describe('ExpenseCards', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(ExpenseCards);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('shows empty state when no cards exist', async () => {
    // DEFAULT_STATE has no expense cards
    const w = mountWith(ExpenseCards);
    await nextTick();
    expect(w.find('.base-empty-state').exists()).toBe(true);
    w.unmount();
  });

  it('renders expense cards from the store', async () => {
    const budget = useBudgetStore();
    budget.addExpenseCard('Household');
    const w = mountWith(ExpenseCards);
    await nextTick();
    expect(w.find('.expense-card').exists()).toBe(true);
    expect(w.find('.expense-card__label').text()).toBe('Household');
    w.unmount();
  });

  it('opens add-card modal on "+ Add Card" click', async () => {
    const w = mountWith(ExpenseCards);
    await nextTick();
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Card'));
    expect(addBtn).toBeDefined();
    await addBtn!.trigger('click');
    await nextTick();
    expect(modalOpen()).toBe(true);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  5. LOANS
// ─────────────────────────────────────────────────────────────────
describe('Loans', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(Loans);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('shows empty state when no loans', async () => {
    const budget = useBudgetStore();
    budget.loans = []; // DEFAULT_STATE has 2 loans — clear them
    const w = mountWith(Loans);
    await nextTick();
    expect(w.find('.base-empty-state').exists()).toBe(true);
    w.unmount();
  });

  it('renders loan cards from the store', async () => {
    // DEFAULT_STATE already has loans; just verify they render
    const w = mountWith(Loans);
    await nextTick();
    expect(w.find('.loans-grid').exists()).toBe(true);
    expect(w.findAll('.loan-card').length).toBeGreaterThan(0);
    w.unmount();
  });

  it('shows correct loan name', async () => {
    const budget = useBudgetStore();
    budget.loans = [];
    budget.addLoan({
      name: 'Car Loan',
      remaining: 8000,
      original: 12000,
      paymentAmount: 350,
      frequency: 'monthly',
      date: '2026-06-01',
      budgetType: 'needs',
      cardId: null,
    });
    const w = mountWith(Loans);
    await nextTick();
    expect(w.find('.loan-card__name').text()).toBe('Car Loan');
    w.unmount();
  });

  it('shows progress percentage for each loan', async () => {
    const budget = useBudgetStore();
    budget.loans = []; // clear defaults first
    budget.addLoan({
      name: 'Mortgage',
      remaining: 50000,
      original: 200000,
      paymentAmount: 1200,
      frequency: 'monthly',
      date: '2026-06-01',
      budgetType: 'needs',
      cardId: null,
    });
    const w = mountWith(Loans);
    await nextTick();
    // remaining/original = 25% remaining → 25.0%
    expect(w.find('.loan-card__pct').text()).toContain('25.0%');
    w.unmount();
  });

  it('opens add modal on "+ Add Loan" click', async () => {
    const w = mountWith(Loans);
    await nextTick();
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Loan'));
    expect(addBtn).toBeDefined();
    await addBtn!.trigger('click');
    await nextTick();
    expect(modalOpen()).toBe(true);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  6. CREDIT CARDS
// ─────────────────────────────────────────────────────────────────
describe('CreditCards', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(CreditCards);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('shows empty state when no credit cards', async () => {
    const budget = useBudgetStore();
    budget.creditCards = []; // DEFAULT_STATE has 2 cards — clear them
    const w = mountWith(CreditCards);
    await nextTick();
    expect(w.find('.base-empty-state').exists()).toBe(true);
    w.unmount();
  });

  it('renders credit card section from the store (DEFAULT_STATE has cards)', async () => {
    const w = mountWith(CreditCards);
    await nextTick();
    expect(w.find('.cc-section').exists()).toBe(true);
    expect(w.text()).toContain('Visa');
    w.unmount();
  });

  it('opens add modal on "+ Add Card" click', async () => {
    const w = mountWith(CreditCards);
    await nextTick();
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Card'));
    expect(addBtn).toBeDefined();
    await addBtn!.trigger('click');
    await nextTick();
    expect(modalOpen()).toBe(true);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  7. SUBSCRIPTIONS
// ─────────────────────────────────────────────────────────────────
describe('Subscriptions', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(Subscriptions);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('shows empty state when no subscriptions', async () => {
    const budget = useBudgetStore();
    budget.subscriptions = []; // DEFAULT_STATE has 1 sub — clear it
    const w = mountWith(Subscriptions);
    await nextTick();
    expect(w.find('.base-empty-state').exists()).toBe(true);
    w.unmount();
  });

  it('renders subscription from the store (DEFAULT_STATE has Netflix)', async () => {
    // DEFAULT_STATE already has Netflix
    const w = mountWith(Subscriptions);
    await nextTick();
    expect(w.find('.subs-list').exists()).toBe(true);
    expect(w.text()).toContain('Netflix');
    w.unmount();
  });

  it('shows aggregate stat cards', async () => {
    const w = mountWith(Subscriptions);
    await nextTick();
    expect(w.find('.subs-stats').exists()).toBe(true);
    expect(w.findAll('.subs-stat').length).toBeGreaterThanOrEqual(3);
    w.unmount();
  });

  it('opens add modal on "+ Add Subscription" click', async () => {
    const w = mountWith(Subscriptions);
    await nextTick();
    const addBtn = w.findAll('button').find(b =>
      b.text().includes('Add') && b.text().includes('Subscription'),
    );
    expect(addBtn).toBeDefined();
    await addBtn!.trigger('click');
    await nextTick();
    expect(modalOpen()).toBe(true);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  8. SAVINGS
// ─────────────────────────────────────────────────────────────────
describe('Savings', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(Savings);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('renders the savings stats header', async () => {
    const w = mountWith(Savings);
    await nextTick();
    expect(w.find('.savings-section').exists()).toBe(true);
    expect(w.find('.savings-stats').exists()).toBe(true);
    w.unmount();
  });

  it('shows empty state when no savings accounts', async () => {
    const budget = useBudgetStore();
    budget.savingsAccounts = []; // DEFAULT_STATE has 2 accounts — clear them
    const w = mountWith(Savings);
    await nextTick();
    expect(w.find('.base-empty-state').exists()).toBe(true);
    w.unmount();
  });

  it('renders accounts from the store (DEFAULT_STATE has Emergency Fund)', async () => {
    // DEFAULT_STATE has Emergency Fund and Investments
    const w = mountWith(Savings);
    await nextTick();
    expect(w.text()).toContain('Emergency Fund');
    w.unmount();
  });

  it('opens add account modal on click', async () => {
    const w = mountWith(Savings);
    await nextTick();
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Account'));
    expect(addBtn).toBeDefined();
    await addBtn!.trigger('click');
    await nextTick();
    expect(modalOpen()).toBe(true);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  9. SAVINGS GOALS
// ─────────────────────────────────────────────────────────────────
describe('SavingsGoals', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(SavingsGoals);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('shows empty state when no goals (DEFAULT_STATE has none)', async () => {
    // DEFAULT_STATE.goals = [] already
    const w = mountWith(SavingsGoals);
    await nextTick();
    expect(w.find('.base-empty-state').exists()).toBe(true);
    w.unmount();
  });

  it('renders goals from the store when account exists', async () => {
    const budget = useBudgetStore();
    // DEFAULT_STATE already has savings accounts — use the first one
    const accountId = budget.savingsAccounts[0].id;
    budget.addGoal({ accountId, targetAmount: 20000, targetDate: '2027-12' });
    const w = mountWith(SavingsGoals);
    await nextTick();
    expect(w.find('.goals-list').exists()).toBe(true);
    // Goal links to "Emergency Fund" (first DEFAULT_STATE account)
    expect(w.text()).toContain('Emergency Fund');
    w.unmount();
  });

  it('opens add goal modal on click', async () => {
    const w = mountWith(SavingsGoals);
    await nextTick();
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Goal'));
    expect(addBtn).toBeDefined();
    await addBtn!.trigger('click');
    await nextTick();
    expect(modalOpen()).toBe(true);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  10. WISHLIST
// ─────────────────────────────────────────────────────────────────
describe('Wishlist', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(Wishlist);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('shows empty state when wishlist is cleared', async () => {
    const budget = useBudgetStore();
    budget.wishlist = []; // DEFAULT_STATE has 1 item — clear it
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('.base-empty-state').exists()).toBe(true);
    w.unmount();
  });

  it('renders DEFAULT_STATE wishlist item on fresh store', async () => {
    // DEFAULT_STATE has "🎯 My first wishlist item"
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('.wishlist-list').exists()).toBe(true);
    expect(w.find('.wish-icon').text()).toBe('🎯');
    expect(w.find('.wish-name').text()).toBe('My first wishlist item');
    w.unmount();
  });

  it('renders a specific added item after clearing defaults', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'MacBook Pro', icon: '💻', url: '' });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('.wish-name').text()).toBe('MacBook Pro');
    expect(w.find('.wish-icon').text()).toBe('💻');
    w.unmount();
  });

  it('renders a link when url is provided', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'Desk', icon: '🖥', url: 'https://example.com' });
    const w = mountWith(Wishlist);
    await nextTick();
    const link = w.find('.wish-link');
    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toBe('https://example.com');
    w.unmount();
  });

  it('opens add modal on click', async () => {
    const w = mountWith(Wishlist);
    await nextTick();
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Item'));
    expect(addBtn).toBeDefined();
    await addBtn!.trigger('click');
    await nextTick();
    expect(modalOpen()).toBe(true);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  11. NET WORTH
// ─────────────────────────────────────────────────────────────────
describe('NetWorth', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(NetWorth);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('renders all four stat tiles', async () => {
    const w = mountWith(NetWorth);
    await nextTick();
    expect(w.findAll('.nw-stat-tile').length).toBeGreaterThanOrEqual(4);
    w.unmount();
  });

  it('shows net worth from assets minus liabilities', async () => {
    const budget = useBudgetStore();
    budget.addAsset({ name: 'Investment', value: 30000, category: 'investment' });
    budget.loans = [];
    budget.addLoan({
      name: 'Car',
      remaining: 5000,
      original: 20000,
      paymentAmount: 400,
      frequency: 'monthly',
      date: '2026-06-01',
      budgetType: 'needs',
      cardId: null,
    });
    const w = mountWith(NetWorth);
    await nextTick();
    // Net worth = $30,000 asset − $5,000 liability = $25,000
    expect(w.text()).toContain('$25,000.00');
    w.unmount();
  });

  it('shows "No prior data" for MoM change when no history', async () => {
    const w = mountWith(NetWorth);
    await nextTick();
    const tiles = w.findAll('.nw-stat-tile');
    const momTile = tiles.find(t => t.text().includes('MoM'));
    expect(momTile?.text()).toContain('No prior data');
    w.unmount();
  });

  it('shows assets grouped by category', async () => {
    const budget = useBudgetStore();
    budget.addAsset({ name: 'RRSP', value: 15000, category: 'investment' });
    const w = mountWith(NetWorth);
    await nextTick();
    expect(w.text()).toContain('RRSP');
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  12. BUDGET VS ACTUAL
// ─────────────────────────────────────────────────────────────────
describe('BudgetVsActual', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(BudgetVsActual);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('renders the three category cards (Needs, Wants, Savings)', async () => {
    const w = mountWith(BudgetVsActual);
    await nextTick();
    const cards = w.findAll('.bva-card');
    expect(cards).toHaveLength(3);
    w.unmount();
  });

  it('shows row labels for each budget category', async () => {
    const w = mountWith(BudgetVsActual);
    await nextTick();
    const text = w.text();
    expect(text).toContain('Needs');
    expect(text).toContain('Wants');
    expect(text).toContain('Savings');
    w.unmount();
  });

  it('renders a chart component', async () => {
    const w = mountWith(BudgetVsActual);
    await nextTick();
    // BudgetVsActualChart renders a mocked canvas
    expect(w.find('canvas').exists()).toBe(true);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  13. SPENDING ANALYTICS
// ─────────────────────────────────────────────────────────────────
describe('SpendingAnalytics', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(SpendingAnalytics);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('renders the analytics wrapper', async () => {
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    expect(w.find('.analytics-section').exists()).toBe(true);
    w.unmount();
  });

  it('shows analytics panel when ui.analyticsPanelOpen is true', async () => {
    const ui = useUiStore();
    ui.analyticsPanelOpen = true;
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    expect(w.find('.analytics-panel').exists()).toBe(true);
    w.unmount();
  });

  it('hides analytics panel when ui.analyticsPanelOpen is false', async () => {
    const ui = useUiStore();
    ui.analyticsPanelOpen = false;
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    expect(w.find('.analytics-panel').exists()).toBe(false);
    w.unmount();
  });

  it('toggle button text reflects panel state', async () => {
    const ui = useUiStore();
    ui.analyticsPanelOpen = false;
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    // Button text when panel is closed
    expect(w.find('button').text()).toContain('Show');
    // Click to open
    await w.find('button').trigger('click');
    await nextTick();
    expect(ui.analyticsPanelOpen).toBe(true);
    expect(w.find('button').text()).toContain('Hide');
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  14. RECURRING CALENDAR
// ─────────────────────────────────────────────────────────────────
describe('RecurringCalendar', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(RecurringCalendar);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('renders the calendar wrapper', async () => {
    const w = mountWith(RecurringCalendar);
    await nextTick();
    expect(w.find('.recurring-calendar').exists()).toBe(true);
    w.unmount();
  });

  it('renders exactly 6 month summary cards', async () => {
    const w = mountWith(RecurringCalendar);
    await nextTick();
    expect(w.findAll('.summary-card')).toHaveLength(6);
    w.unmount();
  });

  it('shows bill count in each summary card', async () => {
    const w = mountWith(RecurringCalendar);
    await nextTick();
    const countEl = w.find('.summary-card__count');
    expect(countEl.exists()).toBe(true);
    expect(countEl.text()).toMatch(/\d+ bills?/);
    w.unmount();
  });

  it('switches to calendar grid view on ⊞ button click', async () => {
    const w = mountWith(RecurringCalendar);
    await nextTick();
    // Title is "Calendar view" (capital C)
    const calBtn = w.findAll('.view-toggle-btn').find(b =>
      b.attributes('title')?.toLowerCase().includes('calendar'),
    );
    expect(calBtn).toBeDefined();
    await calBtn!.trigger('click');
    await nextTick();
    expect(w.find('.cal-grid').exists()).toBe(true);
    w.unmount();
  });

  it('navigates to next month on Next button click', async () => {
    const ui = useUiStore();
    const initialMonth = ui.scheduleViewMonth;  // correct property name
    const w = mountWith(RecurringCalendar);
    await nextTick();
    const nextBtn = w.findAll('button').find(b => b.text().includes('Next'));
    expect(nextBtn).toBeDefined();
    await nextBtn!.trigger('click');
    await nextTick();
    // Month should have advanced by 1 (with year rollover handled)
    const expectedMonth = initialMonth === 12 ? 1 : initialMonth + 1;
    expect(ui.scheduleViewMonth).toBe(expectedMonth);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  RecurringCalendar — Pay Period view
// ─────────────────────────────────────────────────────────────────
describe('RecurringCalendar — pay period view', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('renders the 2W toggle button', async () => {
    const w = mountWith(RecurringCalendar);
    await nextTick();
    const ppBtn = w.findAll('.view-toggle-btn').find(b =>
      b.attributes('title')?.includes('Pay period'),
    );
    expect(ppBtn).toBeDefined();
    w.unmount();
  });

  it('shows pay-period empty state when payStart is null', async () => {
    const budget = useBudgetStore();
    budget.payStart = null;
    const ui = useUiStore();
    ui.setScheduleView('payperiod');
    const w = mountWith(RecurringCalendar);
    await nextTick();
    expect(w.text()).toContain('Settings');
    w.unmount();
  });

  it('switches to payperiod view when 2W is clicked', async () => {
    const ui = useUiStore();
    const w = mountWith(RecurringCalendar);
    await nextTick();
    const ppBtn = w.findAll('.view-toggle-btn').find(b =>
      b.attributes('title')?.includes('Pay period'),
    );
    await ppBtn!.trigger('click');
    await nextTick();
    expect(ui.scheduleView).toBe('payperiod');
    w.unmount();
  });

  it('shows 14-day grid when payStart is configured and 2W clicked', async () => {
    const budget = useBudgetStore();
    budget.payStart = '2026-05-19';
    const w = mountWith(RecurringCalendar);
    await nextTick();
    const ppBtn = w.findAll('.view-toggle-btn').find(b =>
      b.attributes('title')?.includes('Pay period'),
    );
    await ppBtn!.trigger('click');
    await nextTick();
    expect(w.find('.cal-grid').exists()).toBe(true);
    // 14 day cells + header cells + blanks, grid must be present
    const cells = w.findAll('.cal-cell:not(.cal-blank)');
    expect(cells.length).toBe(14);
    w.unmount();
  });

  it('PREV in pay period view steps offset back', async () => {
    const budget = useBudgetStore();
    budget.payStart = '2026-05-19';
    const ui = useUiStore();
    ui.setScheduleView('payperiod');
    const w = mountWith(RecurringCalendar);
    await nextTick();
    const prevBtn = w.findAll('button').find(b => b.text().includes('Prev'));
    await prevBtn!.trigger('click');
    await nextTick();
    expect(ui.schedulePayPeriodOffset).toBe(-1);
    // Month should NOT have changed (pay period navigation is independent)
    w.unmount();
  });

  it('NEXT in pay period view steps offset forward', async () => {
    const budget = useBudgetStore();
    budget.payStart = '2026-05-19';
    const ui = useUiStore();
    ui.setScheduleView('payperiod');
    const w = mountWith(RecurringCalendar);
    await nextTick();
    const nextBtn = w.findAll('button').find(b => b.text().includes('Next'));
    await nextBtn!.trigger('click');
    await nextTick();
    expect(ui.schedulePayPeriodOffset).toBe(1);
    w.unmount();
  });

  it('clicking a month card in payperiod view switches to list view', async () => {
    const budget = useBudgetStore();
    budget.payStart = '2026-05-19';
    const ui = useUiStore();
    ui.setScheduleView('payperiod');
    const w = mountWith(RecurringCalendar);
    await nextTick();
    await w.find('.summary-card').trigger('click');
    await nextTick();
    expect(ui.scheduleView).toBe('list');
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  RecurringCalendar — Loan badges (Sprint 16)
// ─────────────────────────────────────────────────────────────────
describe('RecurringCalendar — loan badges', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  /** Helper: add a loan fixture that lands in May 2026 and force the ui to May 2026. */
  function setupLoanInMay(loanOverrides: Record<string, unknown> = {}) {
    const budget = useBudgetStore();
    const ui = useUiStore();
    budget.loans.push({
      id: 'loan-sprint16',
      name: 'Sprint16 Loan',
      paymentAmount: 350,
      date: '2026-05-15' as any,
      frequency: 'monthly' as any,
      budgetType: 'needs' as any,
      cardId: null,
      remaining: 5000,
      original: 10000,
      ...loanOverrides,
    } as any);
    // Pin the displayed month so the loan's date is definitely in scope
    ui.scheduleViewYear = 2026;
    ui.scheduleViewMonth = 5;
    return { budget, ui };
  }

  it('list view shows a .bill-badge--loan for a monthly loan due this month', async () => {
    const { ui } = setupLoanInMay();
    ui.setScheduleView('list');
    const w = mountWith(RecurringCalendar);
    await nextTick();
    expect(w.find('.bill-badge--loan').exists()).toBe(true);
    w.unmount();
  });

  it('list view loan badge text is "loan"', async () => {
    const { ui } = setupLoanInMay();
    ui.setScheduleView('list');
    const w = mountWith(RecurringCalendar);
    await nextTick();
    expect(w.find('.bill-badge--loan').text()).toBe('loan');
    w.unmount();
  });

  it('calendar view shows a .cal-badge--loan on the correct day cell', async () => {
    const { ui } = setupLoanInMay();
    ui.setScheduleView('calendar');
    const w = mountWith(RecurringCalendar);
    await nextTick();
    expect(w.find('.cal-badge--loan').exists()).toBe(true);
    w.unmount();
  });

  it('pay period view shows a .cal-badge--loan when loan falls in the window', async () => {
    const budget = useBudgetStore();
    const ui = useUiStore();
    // Pay period: May 19 – Jun 1; loan on May 22 is inside the window
    budget.payStart = '2026-05-19' as any;
    budget.loans.push({
      id: 'loan-pp',
      name: 'PP Loan',
      paymentAmount: 300,
      date: '2026-05-22' as any,
      frequency: 'monthly' as any,
      budgetType: 'needs' as any,
      cardId: null,
      remaining: 3000,
      original: 6000,
    } as any);
    ui.setScheduleView('payperiod');
    ui.resetToCurrentPayPeriod();
    const w = mountWith(RecurringCalendar);
    await nextTick();
    expect(w.find('.cal-badge--loan').exists()).toBe(true);
    w.unmount();
  });

  it('loan badge does NOT appear when paymentAmount is 0', async () => {
    setupLoanInMay({ paymentAmount: 0 });
    const ui = useUiStore();
    ui.setScheduleView('list');
    const w = mountWith(RecurringCalendar);
    await nextTick();
    // The loan with 0 payment should be filtered — only the default empty loans exist
    expect(w.find('.bill-badge--loan').exists()).toBe(false);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  Subscriptions — custom-days (Sprint 17)
// ─────────────────────────────────────────────────────────────────
describe('Subscriptions — custom-days', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('shows day-of-week picker when Custom days is selected', async () => {
    const w = mountWith(Subscriptions);
    await nextTick();
    // Open modal
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Subscription'));
    await addBtn!.trigger('click');
    await nextTick();
    // Change frequency to custom-days
    const freqSelect = document.body.querySelector('#sub-freq') as HTMLSelectElement;
    freqSelect.value = 'custom-days';
    freqSelect.dispatchEvent(new Event('change'));
    await nextTick();
    // Day picker should appear
    expect(document.body.querySelector('.dow-picker')).not.toBeNull();
    w.unmount();
  });

  it('does NOT show day picker for monthly frequency', async () => {
    const w = mountWith(Subscriptions);
    await nextTick();
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Subscription'));
    await addBtn!.trigger('click');
    await nextTick();
    expect(document.body.querySelector('.dow-picker')).toBeNull();
    w.unmount();
  });

  it('renders custom-days subscription with chip-custom class', async () => {
    const budget = useBudgetStore();
    budget.subscriptions.push({
      id: 'cd1', name: 'Parking', amount: 8,
      frequency: 'custom-days' as any, date: '2026-01-01',
      category: 'Transport', budgetType: 'needs' as any,
      cardId: null, daysOfWeek: [1, 2, 3],
    } as any);
    const w = mountWith(Subscriptions);
    await nextTick();
    expect(w.find('.chip-custom').exists()).toBe(true);
    w.unmount();
  });

  it('renders "Every Mon · Tue · Wed" in the date row for custom-days sub', async () => {
    const budget = useBudgetStore();
    budget.subscriptions.push({
      id: 'cd2', name: 'Parking', amount: 8,
      frequency: 'custom-days' as any, date: '2026-01-01',
      category: 'Transport', budgetType: 'needs' as any,
      cardId: null, daysOfWeek: [1, 2, 3],
    } as any);
    const w = mountWith(Subscriptions);
    await nextTick();
    expect(w.text()).toContain('Every Mon · Tue · Wed');
    w.unmount();
  });

  it('does not include custom-days sub in renewal alert', async () => {
    const budget = useBudgetStore();
    // Add a custom-days sub with today's date (would trigger renewal if not filtered)
    budget.subscriptions.push({
      id: 'cd3', name: 'Parking', amount: 8,
      frequency: 'custom-days' as any,
      date: new Date().toISOString().split('T')[0],
      category: 'Transport', budgetType: 'needs' as any,
      cardId: null, daysOfWeek: [1],
    } as any);
    const w = mountWith(Subscriptions);
    await nextTick();
    // Renewal alert should NOT show (custom-days are excluded)
    expect(w.find('.subs-renewal-alert').exists()).toBe(false);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  RecurringCalendar — custom-days in list view (Sprint 17)
// ─────────────────────────────────────────────────────────────────
describe('RecurringCalendar — custom-days list view', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  function setupCustomDaySub() {
    const budget = useBudgetStore();
    const ui = useUiStore();
    budget.subscriptions.push({
      id: 'park1', name: 'Parking', amount: 8,
      frequency: 'custom-days' as any,
      date: '2026-01-01',
      category: 'Transport', budgetType: 'needs' as any,
      cardId: null, daysOfWeek: [1, 2, 3],
    } as any);
    ui.scheduleViewYear = 2026;
    ui.scheduleViewMonth = 5;
    ui.setScheduleView('list');
    return { budget, ui };
  }

  it('shows "Weekly recurring pattern" section label in list view', async () => {
    setupCustomDaySub();
    const w = mountWith(RecurringCalendar);
    await nextTick();
    expect(w.text()).toContain('Weekly recurring pattern');
    w.unmount();
  });

  it('shows .bill-badge--custom badge with day pattern', async () => {
    setupCustomDaySub();
    const w = mountWith(RecurringCalendar);
    await nextTick();
    const badge = w.find('.bill-badge--custom');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain('Mon');
    w.unmount();
  });

  it('shows occurrence count in list view', async () => {
    setupCustomDaySub();
    const w = mountWith(RecurringCalendar);
    await nextTick();
    // May 2026 Mon+Tue+Wed = 12 occurrences
    expect(w.text()).toContain('×12');
    w.unmount();
  });

  it('shows .cal-badge--sub badge on each matching calendar day', async () => {
    setupCustomDaySub();
    const ui = useUiStore();
    ui.setScheduleView('calendar');
    const w = mountWith(RecurringCalendar);
    await nextTick();
    // Calendar grid should have multiple sub badges
    const badges = w.findAll('.cal-badge--sub');
    expect(badges.length).toBeGreaterThanOrEqual(12);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  Subscriptions — BUG-015 regression (save silently blocked)
//  Root cause: conditional validation returned '' instead of null
//  for no-error cases, making isValid permanently false.
// ─────────────────────────────────────────────────────────────────
describe('Subscriptions — BUG-015 save regression', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  async function openAddModal(w: ReturnType<typeof mountWith>) {
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Subscription'));
    await addBtn!.trigger('click');
    await nextTick();
  }

  async function fillBasicForm(nameValue = 'Netflix', dateValue = '2026-12-01') {
    const nameInput = document.body.querySelector('#sub-name') as HTMLInputElement;
    const amountInput = document.body.querySelector('#sub-amount') as HTMLInputElement;
    const dateInput = document.body.querySelector('#sub-date') as HTMLInputElement;
    nameInput.value = nameValue;
    nameInput.dispatchEvent(new Event('input'));
    amountInput.value = '15';
    amountInput.dispatchEvent(new Event('input'));
    if (dateInput) {
      dateInput.value = dateValue;
      dateInput.dispatchEvent(new Event('input'));
    }
    await nextTick();
  }

  it('BUG-015: adding a standard monthly subscription calls addSubscription', async () => {
    const budget = useBudgetStore();
    const initialCount = budget.subscriptions.length;
    const w = mountWith(Subscriptions);
    await nextTick();

    await openAddModal(w);
    await fillBasicForm('Netflix', '2026-12-01');

    // Click the Add / Update button inside the modal
    const saveBtn = [...document.body.querySelectorAll('button')]
      .find(b => b.textContent?.trim() === 'Add');
    expect(saveBtn).toBeTruthy();
    saveBtn!.dispatchEvent(new Event('click'));
    await nextTick();

    // Subscription should have been added
    expect(budget.subscriptions.length).toBe(initialCount + 1);
    expect(budget.subscriptions.at(-1)!.name).toBe('Netflix');
    w.unmount();
  });

  it('BUG-015: editing an existing subscription calls updateSubscription', async () => {
    const budget = useBudgetStore();
    // Ensure a subscription exists to edit
    if (budget.subscriptions.length === 0) {
      budget.addSubscription({ name: 'Spotify', amount: 10, frequency: 'monthly', date: '2026-11-01', category: 'Entertainment', budgetType: 'wants', cardId: null, daysOfWeek: [] });
    }
    const sub = budget.subscriptions[0];
    const w = mountWith(Subscriptions);
    await nextTick();

    // Click Edit on the first subscription
    const editBtn = w.findAll('button').find(b => b.text().includes('Edit'));
    await editBtn!.trigger('click');
    await nextTick();

    // Change the name field
    const nameInput = document.body.querySelector('#sub-name') as HTMLInputElement;
    nameInput.value = 'Spotify Updated';
    nameInput.dispatchEvent(new Event('input'));
    await nextTick();

    // Click Update button
    const updateBtn = [...document.body.querySelectorAll('button')]
      .find(b => b.textContent?.trim() === 'Update');
    expect(updateBtn).toBeTruthy();
    updateBtn!.dispatchEvent(new Event('click'));
    await nextTick();

    // Subscription name should have been updated
    const updated = budget.subscriptions.find(s => s.id === sub.id);
    expect(updated?.name).toBe('Spotify Updated');
    w.unmount();
  });

  it('BUG-015: custom-days subscription with days selected can be saved', async () => {
    const budget = useBudgetStore();
    const initialCount = budget.subscriptions.length;
    const w = mountWith(Subscriptions);
    await nextTick();

    await openAddModal(w);

    // Set name and amount
    const nameInput = document.body.querySelector('#sub-name') as HTMLInputElement;
    const amountInput = document.body.querySelector('#sub-amount') as HTMLInputElement;
    nameInput.value = 'Parking';
    nameInput.dispatchEvent(new Event('input'));
    amountInput.value = '8';
    amountInput.dispatchEvent(new Event('input'));
    await nextTick();

    // Switch to custom-days
    const freqSelect = document.body.querySelector('#sub-freq') as HTMLSelectElement;
    freqSelect.value = 'custom-days';
    freqSelect.dispatchEvent(new Event('change'));
    await nextTick();

    // Click Monday button (index 1)
    const dowBtns = document.body.querySelectorAll('.dow-btn');
    expect(dowBtns.length).toBe(7); // 7 days
    (dowBtns[1] as HTMLElement).click(); // Monday
    await nextTick();

    // Click Add
    const saveBtn = [...document.body.querySelectorAll('button')]
      .find(b => b.textContent?.trim() === 'Add');
    saveBtn!.dispatchEvent(new Event('click'));
    await nextTick();

    expect(budget.subscriptions.length).toBe(initialCount + 1);
    const added = budget.subscriptions.at(-1)!;
    expect(added.name).toBe('Parking');
    expect(added.frequency).toBe('custom-days');
    w.unmount();
  });

  it('BUG-015: custom-days with no days selected fails validation (does not save)', async () => {
    const budget = useBudgetStore();
    const initialCount = budget.subscriptions.length;
    const w = mountWith(Subscriptions);
    await nextTick();

    await openAddModal(w);

    // Fill name, set custom-days, but select no days
    const nameInput = document.body.querySelector('#sub-name') as HTMLInputElement;
    nameInput.value = 'Parking';
    nameInput.dispatchEvent(new Event('input'));
    const freqSelect = document.body.querySelector('#sub-freq') as HTMLSelectElement;
    freqSelect.value = 'custom-days';
    freqSelect.dispatchEvent(new Event('change'));
    await nextTick();

    // Click Add without selecting any day
    const saveBtn = [...document.body.querySelectorAll('button')]
      .find(b => b.textContent?.trim() === 'Add');
    saveBtn!.dispatchEvent(new Event('click'));
    await nextTick();

    // Should NOT have been added
    expect(budget.subscriptions.length).toBe(initialCount);
    // Error message should be visible
    expect(document.body.textContent).toContain('Select at least one day');
    w.unmount();
  });

  it('BUG-015: standard monthly sub fails validation when name is empty', async () => {
    const budget = useBudgetStore();
    const initialCount = budget.subscriptions.length;
    const w = mountWith(Subscriptions);
    await nextTick();

    await openAddModal(w);
    // Do NOT fill name — just click Add
    const saveBtn = [...document.body.querySelectorAll('button')]
      .find(b => b.textContent?.trim() === 'Add');
    saveBtn!.dispatchEvent(new Event('click'));
    await nextTick();

    expect(budget.subscriptions.length).toBe(initialCount);
    expect(document.body.textContent).toContain('required');
    w.unmount();
  });
});
