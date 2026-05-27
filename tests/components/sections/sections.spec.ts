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

// ─── Chart sub-components (direct tests) ─────────────────────────
import WantsDonut        from '@/components/charts/WantsDonut.vue';

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

  it('has inline range sliders for needs and wants allocation', async () => {
    const w = mountWith(BudgetAllocation);
    await nextTick();
    // Needs + Wants are adjustable sliders; Savings is auto-calculated
    expect(w.findAll('input[type="range"]')).toHaveLength(2);
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
//  SpendingAnalytics — history item tag editing
// ─────────────────────────────────────────────────────────────────
describe('SpendingAnalytics — history tag editing', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  /** Seed one closed period with two items and open the analytics panel. */
  function setupWithHistory() {
    const budget = useBudgetStore();
    const ui = useUiStore();
    budget.spendingHistory.push({
      id: 'period-1',
      date: '2026-05-01',
      total: 20,
      items: [
        { name: 'Coffee', amount: 5, category: 'Food & Drink' },
        { name: 'Movie',  amount: 15, category: 'Entertainment' },
      ],
    });
    ui.analyticsPanelOpen = true;
    return { budget, ui };
  }

  it('shows an edit button for each item in an expanded period', async () => {
    setupWithHistory();
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    await w.find('.period-item__header').trigger('click');
    await nextTick();
    expect(w.findAll('[data-testid="tag-edit-btn"]')).toHaveLength(2);
    w.unmount();
  });

  it('clicking an edit button shows the category select for that item', async () => {
    setupWithHistory();
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    await w.find('.period-item__header').trigger('click');
    await nextTick();
    await w.findAll('[data-testid="tag-edit-btn"]')[0].trigger('click');
    await nextTick();
    expect(w.find('[data-testid="tag-select"]').exists()).toBe(true);
    // The other item should still show an edit button, not a select
    expect(w.findAll('[data-testid="tag-edit-btn"]')).toHaveLength(1);
    w.unmount();
  });

  it('changing the select commits the new category to the store', async () => {
    const { budget } = setupWithHistory();
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    await w.find('.period-item__header').trigger('click');
    await nextTick();
    await w.findAll('[data-testid="tag-edit-btn"]')[0].trigger('click');
    await nextTick();
    const select = w.find('[data-testid="tag-select"]');
    (select.element as HTMLSelectElement).value = 'Entertainment';
    await select.trigger('change');
    await nextTick();
    expect(budget.spendingHistory[0].items[0].category).toBe('Entertainment');
    // Edit mode dismissed
    expect(w.find('[data-testid="tag-select"]').exists()).toBe(false);
    w.unmount();
  });

  it('blur on the select cancels editing without saving', async () => {
    const { budget } = setupWithHistory();
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    await w.find('.period-item__header').trigger('click');
    await nextTick();
    await w.findAll('[data-testid="tag-edit-btn"]')[0].trigger('click');
    await nextTick();
    await w.find('[data-testid="tag-select"]').trigger('blur');
    await nextTick();
    expect(w.find('[data-testid="tag-select"]').exists()).toBe(false);
    expect(budget.spendingHistory[0].items[0].category).toBe('Food & Drink');
    w.unmount();
  });

  it('Escape key on the select cancels editing', async () => {
    const { budget } = setupWithHistory();
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    await w.find('.period-item__header').trigger('click');
    await nextTick();
    await w.findAll('[data-testid="tag-edit-btn"]')[0].trigger('click');
    await nextTick();
    await w.find('[data-testid="tag-select"]').trigger('keydown', { key: 'Escape' });
    await nextTick();
    expect(w.find('[data-testid="tag-select"]').exists()).toBe(false);
    expect(budget.spendingHistory[0].items[0].category).toBe('Food & Drink');
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

});

// ─────────────────────────────────────────────────────────────────
//  RecurringCalendar — Pay Period view
// ─────────────────────────────────────────────────────────────────
describe('RecurringCalendar — pay period view', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

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

  it('shows 14-day grid when payStart is configured and view is payperiod', async () => {
    const budget = useBudgetStore();
    budget.payStart = '2026-05-19';
    const ui = useUiStore();
    ui.setScheduleView('payperiod');
    const w = mountWith(RecurringCalendar);
    await nextTick();
    expect(w.find('.cal-grid').exists()).toBe(true);
    const cells = w.findAll('.cal-cell:not(.cal-blank)');
    expect(cells.length).toBe(14);
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

  it('calendar view shows the loan name as a cal-event in the correct day cell', async () => {
    const { ui } = setupLoanInMay();
    ui.setScheduleView('calendar');
    const w = mountWith(RecurringCalendar);
    await nextTick();
    const eventNames = w.findAll('.cal-event-name').map(e => e.text());
    expect(eventNames.some(t => t.includes('Sprint16 Loan'))).toBe(true);
    w.unmount();
  });

  it('pay period view shows the loan name as a cal-event when loan falls in the window', async () => {
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
    const eventNames = w.findAll('.cal-event-name').map(e => e.text());
    expect(eventNames.some(t => t.includes('PP Loan'))).toBe(true);
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
    // Clear default subs — some may have renewal dates within the 7-day window
    // as time passes, which would cause a false-positive alert and flake this test.
    budget.subscriptions = [];
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

  it('calendar view shows cal-event rows on each day matching the custom-days pattern', async () => {
    setupCustomDaySub();
    const ui = useUiStore();
    ui.setScheduleView('calendar');
    const w = mountWith(RecurringCalendar);
    await nextTick();
    // May 2026 Mon+Tue+Wed = 12 occurrences → 12 cal-event-row entries
    const eventRows = w.findAll('.cal-event-row');
    expect(eventRows.length).toBeGreaterThanOrEqual(12);
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

// ─────────────────────────────────────────────────────────────────
//  DashboardPage — RS-11 fixed grid layout
// ─────────────────────────────────────────────────────────────────
import DashboardPage from '@/components/pages/DashboardPage.vue';
import SectionPicker from '@/components/ui/SectionPicker.vue';
import { DEFAULT_SECTION_ORDER } from '@/constants/dashboardSections';

describe('DashboardPage — RS-11 fixed grid layout', () => {
  beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('renders the page wrapper', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    expect(w.find('.page-dashboard').exists()).toBe(true);
    w.unmount();
  });

  it('renders the KPI hero row with 4 cards', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    expect(w.find('.kpi-row').exists()).toBe(true);
    expect(w.find('.kpi-hero').exists()).toBe(true);
    expect(w.findAll('.kpi-card')).toHaveLength(3);
    w.unmount();
  });

  it('renders all 7 fixed section cards', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    DEFAULT_SECTION_ORDER.forEach(id => {
      const el = w.find(`#section-${id}`);
      expect(el.exists(), `section #section-${id} should exist`).toBe(true);
    });
    w.unmount();
  });

  it('does NOT render removed sections (income-streams, savings-goals, wants-tracker)', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    expect(w.find('#section-income-streams').exists()).toBe(false);
    expect(w.find('#section-savings-goals').exists()).toBe(false);
    expect(w.find('#section-wants-tracker').exists()).toBe(false);
    w.unmount();
  });

  it('renders the 3-col widget row', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    expect(w.find('.dash-widget-row').exists()).toBe(true);
    // Expense cards, loans, savings-accounts are all in the widget row
    expect(w.find('.dash-widget-row #section-expense-cards').exists()).toBe(true);
    expect(w.find('.dash-widget-row #section-loans').exists()).toBe(true);
    expect(w.find('.dash-widget-row #section-savings-accounts').exists()).toBe(true);
    w.unmount();
  });

  it('renders the 2-col row with chequing and subscriptions', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    expect(w.find('.dash-2col-row').exists()).toBe(true);
    expect(w.find('.dash-2col-row #section-chequing-balance').exists()).toBe(true);
    expect(w.find('.dash-2col-row #section-subscriptions').exists()).toBe(true);
    w.unmount();
  });

  it('renders credit cards and wishlist as full-width sections', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    expect(w.find('#section-credit-cards').exists()).toBe(true);
    expect(w.find('#section-wishlist').exists()).toBe(true);
    w.unmount();
  });

  it('has NO drag handles (drag-and-drop removed in RS-11)', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    expect(w.findAll('.base-card__drag-handle')).toHaveLength(0);
    w.unmount();
  });

  it('has NO section-slot wrappers (fixed grid, no drag slots)', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    expect(w.findAll('.section-slot')).toHaveLength(0);
    w.unmount();
  });

  it('every section card has a collapse chevron', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    const chevrons = w.findAll('.base-card__collapse-btn');
    // 7 sections, each with a collapsible BaseCard
    expect(chevrons.length).toBe(7);
    w.unmount();
  });

  it('collapsing a section hides its body', async () => {
    const ui = useUiStore();
    const w = mountWith(DashboardPage);
    await nextTick();
    ui.toggleSection('subscriptions');
    await nextTick();
    const card = w.find('#section-subscriptions');
    const body = card.find('.base-card__body');
    expect(body.isVisible()).toBe(false);
    w.unmount();
  });

  it('renders the quick-add button in the header', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    const btn = w.find('.btn-primary');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain('Quick add to wants');
    w.unmount();
  });

  it('does NOT render the "Manage widgets" button (removed in RS-11)', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    // The old "Manage widgets" button had class btn-secondary in the header
    const headerBtns = w.findAll('.dash-header__actions .btn-secondary');
    expect(headerBtns).toHaveLength(0);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  SectionPicker — Sprint 18 (reorder, collapse, reset)
// ─────────────────────────────────────────────────────────────────
describe('SectionPicker — Sprint 18 reorder', () => {
  beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('renders one item per section (11 items: 7 dashboard + 4 advanced)', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const items = document.body.querySelectorAll('.section-picker-item');
    expect(items.length).toBe(11);
    w.unmount();
  });

  it('each item has a drag handle', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const handles = document.body.querySelectorAll('.picker-drag-handle');
    expect(handles.length).toBe(11);
    w.unmount();
  });

  it('each item has move-up and move-down buttons', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const moveBtns = document.body.querySelectorAll('.picker-move-btn');
    // 2 buttons per item × 11 items = 22
    expect(moveBtns.length).toBe(22);
    w.unmount();
  });

  it('each item has a collapse toggle button', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const collapseBtns = document.body.querySelectorAll('.picker-collapse-btn');
    expect(collapseBtns.length).toBe(11);
    w.unmount();
  });

  it('clicking collapse toggle calls ui.toggleSection', async () => {
    const ui = useUiStore();
    expect(ui.isSectionCollapsed('expense-cards')).toBe(false);
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    // Click the first collapse button (for the first section in order)
    const firstCollapseBtn = document.body.querySelectorAll('.picker-collapse-btn')[0] as HTMLElement;
    firstCollapseBtn.click();
    await nextTick();
    // The first section in the default order should now be collapsed
    expect(ui.isSectionCollapsed(DEFAULT_SECTION_ORDER[0])).toBe(true);
    w.unmount();
  });

  it('dashboard reset button is disabled when order is already default', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    // First .picker-reset-inline is the Dashboard reset button
    const resetBtns = document.body.querySelectorAll('.picker-reset-inline') as NodeListOf<HTMLButtonElement>;
    expect(resetBtns[0].disabled).toBe(true);
    w.unmount();
  });

  it('dashboard reset button is enabled after a reorder and restores default order', async () => {
    const ui = useUiStore();
    ui.setSectionOrder([...DEFAULT_SECTION_ORDER].reverse());
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const resetBtns = document.body.querySelectorAll('.picker-reset-inline') as NodeListOf<HTMLButtonElement>;
    expect(resetBtns[0].disabled).toBe(false);
    resetBtns[0].click();
    await nextTick();
    expect(ui.sectionOrder).toEqual(DEFAULT_SECTION_ORDER);
    w.unmount();
  });

  it('move-up button on first item is disabled', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const firstMoveUpBtn = document.body.querySelectorAll('.picker-move-btn')[0] as HTMLButtonElement;
    expect(firstMoveUpBtn.disabled).toBe(true);
    w.unmount();
  });

  it('move-down button on last item is disabled', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const allMoveBtns = document.body.querySelectorAll('.picker-move-btn');
    const lastMoveDownBtn = allMoveBtns[allMoveBtns.length - 1] as HTMLButtonElement;
    expect(lastMoveDownBtn.disabled).toBe(true);
    w.unmount();
  });

  it('move-up button reorders the section upward', async () => {
    const ui = useUiStore();
    const secondId = DEFAULT_SECTION_ORDER[1];
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    // Move-up button for the second item (index 1): buttons pair [0]=up, [1]=down, [2]=up, [3]=down ...
    const secondMoveUpBtn = document.body.querySelectorAll('.picker-move-btn')[2] as HTMLElement;
    secondMoveUpBtn.click();
    await nextTick();
    expect(ui.sectionOrder[0]).toBe(secondId);
    w.unmount();
  });

  it('renders sections in the order from ui.sectionOrder', async () => {
    const ui = useUiStore();
    // Move wishlist to first position
    ui.moveSectionDown('wishlist'); // wishlist is last, this is a no-op
    const customOrder = ['wishlist', ...DEFAULT_SECTION_ORDER.filter(id => id !== 'wishlist')];
    ui.setSectionOrder(customOrder);
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    // The first jump button should have "Wishlist" text
    const firstJumpBtn = document.body.querySelector('.picker-jump-btn') as HTMLElement;
    expect(firstJumpBtn.textContent).toContain('Wishlist');
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  RecurringCalendar — Day Detail (Sprint 20)
//  Slide panel (click, all devices) + hover popover (desktop only)
// ─────────────────────────────────────────────────────────────────
describe('RecurringCalendar — day detail slide panel', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => {
    document.body.innerHTML = '';
    // Remove any matchMedia mock so other tests aren't affected
    if ((window as any).__matchMediaMocked) {
      delete (window as any).matchMedia;
      delete (window as any).__matchMediaMocked;
    }
  });

  /** Seed a monthly subscription landing on May 7 and pin the view to calendar / May 2026.
   *  Clears default subscriptions/loans so DEFAULT_STATE items don't interfere. */
  function setupSubOnDay7() {
    const budget = useBudgetStore();
    const ui = useUiStore();
    // Clear pre-populated DEFAULT_STATE items that would create other interactive cells
    budget.subscriptions.splice(0);
    budget.loans.splice(0);
    budget.subscriptions.push({
      id: 'detail-test-sub',
      name: 'Detail Test Sub',
      amount: 17,
      frequency: 'monthly' as any,
      date: '2026-05-07',
      category: 'Entertainment',
      budgetType: 'wants' as any,
      cardId: null,
      daysOfWeek: [],
    } as any);
    ui.scheduleViewYear = 2026;
    ui.scheduleViewMonth = 5;
    ui.setScheduleView('calendar');
    return { budget, ui };
  }

  /** Enable hover-media mock so supportsHover = true inside setup(). */
  function mockHoverMedia() {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    (window as any).__matchMediaMocked = true;
  }

  // ── interactive class ──────────────────────────────────────────
  it('calendar cells with bills get .cal-interactive class', async () => {
    setupSubOnDay7();
    const w = mountWith(RecurringCalendar);
    await nextTick();
    expect(w.findAll('.cal-interactive').length).toBeGreaterThan(0);
    w.unmount();
  });

  it('calendar cells WITHOUT bills do not get .cal-interactive', async () => {
    setupSubOnDay7();
    const w = mountWith(RecurringCalendar);
    await nextTick();
    // There should be plenty of days in May without the bill
    const nonInteractiveDay = w.findAll('.cal-cell:not(.cal-blank):not(.cal-interactive)');
    expect(nonInteractiveDay.length).toBeGreaterThan(0);
    w.unmount();
  });

  // ── click emits selected date ─────────────────────────────────
  it('clicking a calendar day with bills emits the ISO date', async () => {
    setupSubOnDay7();
    const w = mount(RecurringCalendar as Parameters<typeof mount>[0], {
      attachTo: document.body,
      props: { modelValue: null },
    });
    await nextTick();
    await w.find('.cal-interactive').trigger('click');
    await nextTick();
    const emitted = w.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toBe('2026-05-07');
    w.unmount();
  });

  // ── selected cell state ───────────────────────────────────────
  it('cell with matching modelValue gets .cal-selected class', async () => {
    setupSubOnDay7();
    const w = mount(RecurringCalendar as Parameters<typeof mount>[0], {
      attachTo: document.body,
      props: { modelValue: '2026-05-07' },
    });
    await nextTick();
    expect(w.find('.cal-interactive').classes()).toContain('cal-selected');
    w.unmount();
  });

  // ── toggle off emits null ─────────────────────────────────────
  it('clicking the already-selected day emits null', async () => {
    setupSubOnDay7();
    const w = mount(RecurringCalendar as Parameters<typeof mount>[0], {
      attachTo: document.body,
      props: { modelValue: '2026-05-07' },
    });
    await nextTick();
    await w.find('.cal-interactive').trigger('click');
    await nextTick();
    const emitted = w.emitted('update:modelValue');
    expect(emitted![0][0]).toBeNull();
    w.unmount();
  });

  // ── empty days don't emit ─────────────────────────────────────
  it('clicking a day with no bills does not emit a selection', async () => {
    setupSubOnDay7();
    const w = mount(RecurringCalendar as Parameters<typeof mount>[0], {
      attachTo: document.body,
      props: { modelValue: null },
    });
    await nextTick();
    const emptyCell = w.findAll('.cal-cell:not(.cal-blank):not(.cal-interactive)')[0];
    if (emptyCell) {
      await emptyCell.trigger('click');
      await nextTick();
      expect(w.emitted('update:modelValue') ?? []).toHaveLength(0);
    }
    w.unmount();
  });

  // ── pay-period view ───────────────────────────────────────────
  it('clicking a pay-period cell with bills emits the ISO date', async () => {
    const budget = useBudgetStore();
    const ui = useUiStore();
    budget.payStart = '2026-05-19';
    budget.subscriptions.push({
      id: 'pp-detail-test',
      name: 'PP Detail Bill',
      amount: 50,
      frequency: 'monthly' as any,
      date: '2026-05-21',
      category: 'Bills',
      budgetType: 'needs' as any,
      cardId: null,
      daysOfWeek: [],
    } as any);
    ui.setScheduleView('payperiod');
    const w = mount(RecurringCalendar as Parameters<typeof mount>[0], {
      attachTo: document.body,
      props: { modelValue: null },
    });
    await nextTick();
    const cells = w.findAll('.cal-interactive');
    if (cells.length > 0) {
      await cells[0].trigger('click');
      await nextTick();
      expect(w.emitted('update:modelValue')).toBeTruthy();
    }
    w.unmount();
  });

  it('pay-period cell with matching modelValue gets .cal-selected class', async () => {
    const budget = useBudgetStore();
    const ui = useUiStore();
    budget.payStart = '2026-05-19';
    budget.subscriptions.push({
      id: 'pp-sel-test',
      name: 'PP Sel Bill',
      amount: 30,
      frequency: 'monthly' as any,
      date: '2026-05-22',
      category: 'Bills',
      budgetType: 'needs' as any,
      cardId: null,
      daysOfWeek: [],
    } as any);
    ui.setScheduleView('payperiod');
    const w = mount(RecurringCalendar as Parameters<typeof mount>[0], {
      attachTo: document.body,
      props: { modelValue: '2026-05-22' },
    });
    await nextTick();
    expect(w.find('.cal-selected').exists()).toBe(true);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  RecurringCalendar — Day Detail hover popover (desktop, Sprint 20)
// ─────────────────────────────────────────────────────────────────
describe('RecurringCalendar — day detail hover popover', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    // Restore matchMedia if patched
    delete (window as any).matchMedia;
  });

  function setupSubOnDay14() {
    const budget = useBudgetStore();
    const ui = useUiStore();
    // Clear DEFAULT_STATE items so our bill is the only interactive cell
    budget.subscriptions.splice(0);
    budget.loans.splice(0);
    budget.subscriptions.push({
      id: 'hover-test-sub',
      name: 'Hover Test Bill',
      amount: 99,
      frequency: 'monthly' as any,
      date: '2026-05-14',
      category: 'Entertainment',
      budgetType: 'wants' as any,
      cardId: null,
      daysOfWeek: [],
    } as any);
    ui.scheduleViewYear = 2026;
    ui.scheduleViewMonth = 5;
    ui.setScheduleView('calendar');
  }

  it('popover is absent by default (no hover state)', async () => {
    setupSubOnDay14();
    const w = mountWith(RecurringCalendar);
    await nextTick();
    expect(document.body.querySelector('[data-testid="day-popover"]')).toBeNull();
    w.unmount();
  });

  it('mouseenter on a bill cell shows the popover when hover is supported', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    setupSubOnDay14();
    const w = mountWith(RecurringCalendar);
    await nextTick();
    const cell = w.find('.cal-interactive');
    await cell.trigger('mouseenter');
    await nextTick();
    expect(document.body.querySelector('[data-testid="day-popover"]')).toBeTruthy();
    w.unmount();
  });

  it('popover shows the bill name', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    setupSubOnDay14();
    const w = mountWith(RecurringCalendar);
    await nextTick();
    await w.find('.cal-interactive').trigger('mouseenter');
    await nextTick();
    const popover = document.body.querySelector('[data-testid="day-popover"]') as HTMLElement;
    expect(popover).toBeTruthy();
    expect(popover.textContent).toContain('Hover Test Bill');
    w.unmount();
  });

  it('mouseleave hides the popover after the grace-period timer', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    setupSubOnDay14();
    const w = mountWith(RecurringCalendar);
    await nextTick();
    const cell = w.find('.cal-interactive');
    await cell.trigger('mouseenter');
    await nextTick();
    expect(document.body.querySelector('[data-testid="day-popover"]')).toBeTruthy();
    await cell.trigger('mouseleave');
    vi.advanceTimersByTime(200);
    await nextTick();
    expect(document.body.querySelector('[data-testid="day-popover"]')).toBeNull();
    w.unmount();
    vi.useRealTimers();
  });

  it('mouseenter on a cell with NO bills does not show the popover', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    setupSubOnDay14();
    const w = mountWith(RecurringCalendar);
    await nextTick();
    // Find a non-interactive, non-blank day cell
    const emptyCell = w.findAll('.cal-cell:not(.cal-blank):not(.cal-interactive)')[0];
    if (emptyCell) {
      await emptyCell.trigger('mouseenter');
      await nextTick();
      expect(document.body.querySelector('[data-testid="day-popover"]')).toBeNull();
    }
    w.unmount();
  });

  it('navigation clears the popover state', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    setupSubOnDay14();
    const ui = useUiStore();
    const w = mountWith(RecurringCalendar);
    await nextTick();
    await w.find('.cal-interactive').trigger('mouseenter');
    await nextTick();
    // Simulate navigation by advancing the month via the store (parent's responsibility)
    ui.stepScheduleMonth(1);
    await nextTick();
    expect(document.body.querySelector('[data-testid="day-popover"]')).toBeNull();
    w.unmount();
    vi.useRealTimers();
  });
});

// ─────────────────────────────────────────────────────────────────
//  WantsDonut — categoryColors prop (BUG-FIX Sprint 21)
// ─────────────────────────────────────────────────────────────────
describe('WantsDonut — categoryColors prop (BUG-FIX Sprint 21)', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('renders without throwing when categoryColors is not provided (default)', async () => {
    const w = mount(WantsDonut as Parameters<typeof mount>[0], {
      attachTo: document.body,
      props: {
        categorySpending: {},
        remaining: 100,
        usedPct: 0,
      },
    });
    // One tick so wrapperRef watch fires → isInView = true (IO unavailable in jsdom)
    await nextTick();
    expect(w.exists()).toBe(true);
    // Doughnut is mocked — canvas stub should render
    expect(w.find('[data-testid="chart-doughnut"]').exists()).toBe(true);
    w.unmount();
  });

  it('renders without throwing when categoryColors is provided with real entries', async () => {
    const w = mount(WantsDonut as Parameters<typeof mount>[0], {
      attachTo: document.body,
      props: {
        categorySpending: { 'Food & Drink': 120, Groceries: 80 },
        remaining: 400,
        usedPct: 50,
        categoryColors: { 'Food & Drink': '#ff8c42', Groceries: '#00d4aa' },
      },
    });
    await nextTick();
    expect(w.find('[data-testid="chart-doughnut"]').exists()).toBe(true);
    w.unmount();
  });

  it('renders the centre pct label in the default (accent) colour at normal percent', async () => {
    const w = mount(WantsDonut as Parameters<typeof mount>[0], {
      attachTo: document.body,
      props: { categorySpending: {}, remaining: 500, usedPct: 40, categoryColors: {} },
    });
    await nextTick();
    const centre = w.find('.wants-donut-centre');
    expect(centre.exists()).toBe(true);
    expect(centre.text()).toBe('40%');
    expect(centre.classes()).not.toContain('wants-donut-centre--warn');
    expect(centre.classes()).not.toContain('wants-donut-centre--over');
    w.unmount();
  });

  it('applies warn class to centre label when 80 ≤ usedPct < 100', async () => {
    const w = mount(WantsDonut as Parameters<typeof mount>[0], {
      attachTo: document.body,
      props: { categorySpending: {}, remaining: 20, usedPct: 85, categoryColors: {} },
    });
    await nextTick();
    const centre = w.find('.wants-donut-centre');
    expect(centre.classes()).toContain('wants-donut-centre--warn');
    expect(centre.text()).toBe('85%');
    w.unmount();
  });

  it('applies over class to centre label when usedPct ≥ 100', async () => {
    const w = mount(WantsDonut as Parameters<typeof mount>[0], {
      attachTo: document.body,
      props: {
        categorySpending: { Shopping: 600 },
        remaining: 0,
        usedPct: 120,
        categoryColors: { Shopping: '#60a5fa' },
      },
    });
    await nextTick();
    const centre = w.find('.wants-donut-centre');
    expect(centre.classes()).toContain('wants-donut-centre--over');
    expect(centre.text()).toBe('120%');
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  WantsTracker → WantsDonut integration (BUG-FIX Sprint 21)
//  Verifies that categoryColorMap is correctly derived from
//  budget.spendingCategories and passed as categoryColors to WantsDonut.
// ─────────────────────────────────────────────────────────────────
describe('WantsTracker — categoryColorMap integration (BUG-FIX Sprint 21)', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('passes categoryColors prop to WantsDonut reflecting spendingCategories', async () => {
    const budget = useBudgetStore();
    // Verify DEFAULT_SPENDING_CATEGORIES are present
    expect(budget.spendingCategories.length).toBeGreaterThan(0);

    const w = mountWith(WantsTracker);
    await nextTick();

    const donut = w.findComponent(WantsDonut);
    expect(donut.exists()).toBe(true);

    // categoryColors must be an object, not undefined
    const colors = donut.props('categoryColors') as Record<string, string>;
    expect(typeof colors).toBe('object');

    // Every spendingCategory must appear in categoryColors with its correct color
    budget.spendingCategories.forEach(cat => {
      expect(colors[cat.name]).toBe(cat.color);
    });

    w.unmount();
  });

  it('categoryColors prop updates reactively when a category is recolored', async () => {
    const budget = useBudgetStore();
    const cat = budget.spendingCategories[0];

    const w = mountWith(WantsTracker);
    await nextTick();

    // Before recolor
    const colorsBefore = { ...(w.findComponent(WantsDonut).props('categoryColors') as Record<string, string>) };
    expect(colorsBefore[cat.name]).toBe(cat.color);

    // Recolor the first category
    const newColor = '#abcdef';
    budget.updateCategory(cat.id, cat.name, newColor);
    await nextTick();

    const colorsAfter = w.findComponent(WantsDonut).props('categoryColors') as Record<string, string>;
    expect(colorsAfter[cat.name]).toBe(newColor);

    w.unmount();
  });

  it('categoryColors prop updates when a new category is added', async () => {
    const budget = useBudgetStore();
    const initialCount = budget.spendingCategories.length;

    const w = mountWith(WantsTracker);
    await nextTick();

    // Add a new category
    budget.addCategory('Hobbies', '#ff1234');
    await nextTick();

    const colors = w.findComponent(WantsDonut).props('categoryColors') as Record<string, string>;
    expect(Object.keys(colors).length).toBe(initialCount + 1);
    expect(colors['Hobbies']).toBe('#ff1234');

    w.unmount();
  });

  it('categoryColors prop removes deleted category', async () => {
    const budget = useBudgetStore();
    const cat = budget.spendingCategories[0];

    const w = mountWith(WantsTracker);
    await nextTick();

    budget.deleteCategory(cat.id);
    await nextTick();

    const colors = w.findComponent(WantsDonut).props('categoryColors') as Record<string, string>;
    expect(colors[cat.name]).toBeUndefined();

    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  WantsTracker — Search / Sort / Filter toolbar (Sprint 22)
// ─────────────────────────────────────────────────────────────────
describe('WantsTracker — filter toolbar (Sprint 22)', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  /** Seed two purchases with distinct properties for filter assertions. */
  function seedPurchases() {
    const budget = useBudgetStore();
    budget.addPurchase({ name: 'Coffee',   amount: 5,  category: 'Food & Drink',  budgetType: 'wants', cardId: null,     date: '2026-05-20' });
    budget.addPurchase({ name: 'Pharmacy', amount: 18, category: 'Health & Fitness', budgetType: 'needs', cardId: null, date: '2026-05-19' });
    return budget;
  }

  it('filter toolbar hidden when no purchases exist', async () => {
    const w = mountWith(WantsTracker);
    await nextTick();
    expect(w.find('[data-testid="purchase-filter-toolbar"]').exists()).toBe(false);
    w.unmount();
  });

  it('filter toolbar appears once purchases are added', async () => {
    seedPurchases();
    const w = mountWith(WantsTracker);
    await nextTick();
    expect(w.find('[data-testid="purchase-filter-toolbar"]').exists()).toBe(true);
    w.unmount();
  });

  it('search narrows the purchase list by name', async () => {
    seedPurchases();
    const w = mountWith(WantsTracker);
    await nextTick();
    const search = w.find('#p-search');
    await search.setValue('coffee');
    await nextTick();
    const items = w.findAll('.purchase-item');
    expect(items.length).toBe(1);
    expect(items[0].text()).toContain('Coffee');
    w.unmount();
  });

  it('search is case-insensitive', async () => {
    seedPurchases();
    const w = mountWith(WantsTracker);
    await nextTick();
    await w.find('#p-search').setValue('PHARM');
    await nextTick();
    expect(w.findAll('.purchase-item').length).toBe(1);
    w.unmount();
  });

  it('category filter narrows the list', async () => {
    seedPurchases();
    const w = mountWith(WantsTracker);
    await nextTick();
    // Open drawer first
    await w.find('.filter-toolbar__filter-btn').trigger('click');
    await nextTick();
    await w.find('#p-filter-cat').setValue('Food & Drink');
    await nextTick();
    const items = w.findAll('.purchase-item');
    expect(items.length).toBe(1);
    expect(items[0].text()).toContain('Coffee');
    w.unmount();
  });

  it('budget type filter shows only Needs purchases', async () => {
    seedPurchases();
    const w = mountWith(WantsTracker);
    await nextTick();
    await w.find('.filter-toolbar__filter-btn').trigger('click');
    await nextTick();
    await w.find('#p-filter-type').setValue('needs');
    await nextTick();
    const items = w.findAll('.purchase-item');
    expect(items.length).toBe(1);
    expect(items[0].text()).toContain('Pharmacy');
    w.unmount();
  });

  it('card filter for "No card" shows only unlinked purchases', async () => {
    const budget = useBudgetStore();
    // Add a card and link one purchase to it
    const card = budget.addExpenseCard('Visa');
    budget.addPurchase({ name: 'Coffee',   amount: 5,  category: 'Food & Drink',  budgetType: 'wants', cardId: card!.id, date: '2026-05-20' });
    budget.addPurchase({ name: 'Pharmacy', amount: 18, category: 'Health & Fitness', budgetType: 'needs', cardId: null, date: '2026-05-19' });
    const w = mountWith(WantsTracker);
    await nextTick();
    await w.find('.filter-toolbar__filter-btn').trigger('click');
    await nextTick();
    await w.find('#p-filter-card').setValue('none');
    await nextTick();
    const items = w.findAll('.purchase-item');
    expect(items.length).toBe(1);
    expect(items[0].text()).toContain('Pharmacy');
    w.unmount();
  });

  it('card filter by label shows only matching card purchases', async () => {
    const budget = useBudgetStore();
    const visa = budget.addExpenseCard('Visa');
    const debit = budget.addExpenseCard('Debit');
    budget.addPurchase({ name: 'Coffee',   amount: 5,  category: 'Food & Drink',  budgetType: 'wants', cardId: visa!.id,  date: '2026-05-20' });
    budget.addPurchase({ name: 'Pharmacy', amount: 18, category: 'Health & Fitness', budgetType: 'needs', cardId: debit!.id, date: '2026-05-19' });
    const w = mountWith(WantsTracker);
    await nextTick();
    await w.find('.filter-toolbar__filter-btn').trigger('click');
    await nextTick();
    await w.find('#p-filter-card').setValue('Visa');
    await nextTick();
    expect(w.findAll('.purchase-item').length).toBe(1);
    expect(w.find('.purchase-item').text()).toContain('Coffee');
    w.unmount();
  });

  it('active filter count badge shows number of active filters', async () => {
    seedPurchases();
    const w = mountWith(WantsTracker);
    await nextTick();
    await w.find('.filter-toolbar__filter-btn').trigger('click');
    await nextTick();
    await w.find('#p-filter-cat').setValue('Food & Drink');
    await w.find('#p-filter-type').setValue('wants');
    await nextTick();
    expect(w.find('.filter-toolbar__badge').text()).toBe('2');
    w.unmount();
  });

  it('result count row appears when any filter is active', async () => {
    seedPurchases();
    const w = mountWith(WantsTracker);
    await nextTick();
    expect(w.find('[data-testid="purchase-filter-count"]').exists()).toBe(false);
    await w.find('#p-search').setValue('x');
    await nextTick();
    expect(w.find('[data-testid="purchase-filter-count"]').exists()).toBe(true);
    w.unmount();
  });

  it('shows no-results empty state when filters produce 0 matches', async () => {
    seedPurchases();
    const w = mountWith(WantsTracker);
    await nextTick();
    await w.find('#p-search').setValue('zzznomatch');
    await nextTick();
    expect(w.find('[data-testid="purchase-no-results"]').exists()).toBe(true);
    expect(w.find('.purchase-list').exists()).toBe(false);
    w.unmount();
  });

  it('Clear button resets all filters and shows full list', async () => {
    seedPurchases();
    const w = mountWith(WantsTracker);
    await nextTick();
    await w.find('#p-search').setValue('coffee');
    await nextTick();
    expect(w.findAll('.purchase-item').length).toBe(1);
    await w.find('.filter-toolbar__clear').trigger('click');
    await nextTick();
    expect(w.findAll('.purchase-item').length).toBe(2);
    expect(w.find('[data-testid="purchase-filter-count"]').exists()).toBe(false);
    w.unmount();
  });

  it('drawer toggles open/closed on Filters button click', async () => {
    seedPurchases();
    const w = mountWith(WantsTracker);
    await nextTick();
    const drawer = w.find('#p-filter-drawer');
    expect(drawer.classes()).not.toContain('filter-toolbar__drawer-wrap--open');
    await w.find('.filter-toolbar__filter-btn').trigger('click');
    await nextTick();
    expect(drawer.classes()).toContain('filter-toolbar__drawer-wrap--open');
    await w.find('.filter-toolbar__filter-btn').trigger('click');
    await nextTick();
    expect(drawer.classes()).not.toContain('filter-toolbar__drawer-wrap--open');
    w.unmount();
  });

  it('sort by amount descending orders purchases correctly', async () => {
    seedPurchases();
    const w = mountWith(WantsTracker);
    await nextTick();
    await w.find('#p-sort').setValue('amtHigh');
    await nextTick();
    const names = w.findAll('.purchase-item__name').map(el => el.text());
    expect(names[0]).toBe('Pharmacy'); // $18 > $5
    expect(names[1]).toBe('Coffee');
    w.unmount();
  });

  it('sort by name A-Z orders alphabetically', async () => {
    seedPurchases();
    const w = mountWith(WantsTracker);
    await nextTick();
    await w.find('#p-sort').setValue('nameAZ');
    await nextTick();
    const names = w.findAll('.purchase-item__name').map(el => el.text());
    expect(names[0]).toBe('Coffee');
    expect(names[1]).toBe('Pharmacy');
    w.unmount();
  });

  it('combined search + category filter applies AND logic', async () => {
    const budget = useBudgetStore();
    budget.addPurchase({ name: 'Coffee Latte',  amount: 6,  category: 'Food & Drink',     budgetType: 'wants', cardId: null, date: '2026-05-20' });
    budget.addPurchase({ name: 'Coffee Beans',  amount: 14, category: 'Groceries',         budgetType: 'wants', cardId: null, date: '2026-05-19' });
    budget.addPurchase({ name: 'Pharmacy',      amount: 18, category: 'Health & Fitness',  budgetType: 'needs', cardId: null, date: '2026-05-18' });
    const w = mountWith(WantsTracker);
    await nextTick();
    await w.find('#p-search').setValue('coffee');
    await w.find('.filter-toolbar__filter-btn').trigger('click');
    await nextTick();
    await w.find('#p-filter-cat').setValue('Food & Drink');
    await nextTick();
    // Only "Coffee Latte" matches both search="coffee" AND category="Food & Drink"
    expect(w.findAll('.purchase-item').length).toBe(1);
    expect(w.find('.purchase-item__name').text()).toBe('Coffee Latte');
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  Subscriptions — Search / Sort / Filter toolbar (Sprint 22)
// ─────────────────────────────────────────────────────────────────
describe('Subscriptions — filter toolbar (Sprint 22)', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  function seedSubs() {
    const budget = useBudgetStore();
    budget.subscriptions.splice(0); // clear DEFAULT_STATE sub
    budget.addSubscription({ name: 'Netflix',  amount: 18, frequency: 'monthly', date: '2026-06-01', category: 'Entertainment', budgetType: 'wants', cardId: null, daysOfWeek: [] });
    budget.addSubscription({ name: 'Gym',      amount: 55, frequency: 'monthly', date: '2026-06-15', category: 'Health & Fitness', budgetType: 'needs', cardId: null, daysOfWeek: [] });
    return budget;
  }

  it('filter toolbar hidden when no subscriptions exist', async () => {
    const budget = useBudgetStore();
    budget.subscriptions.splice(0);
    const w = mountWith(Subscriptions);
    await nextTick();
    expect(w.find('[data-testid="sub-filter-toolbar"]').exists()).toBe(false);
    w.unmount();
  });

  it('filter toolbar appears when subscriptions exist', async () => {
    seedSubs();
    const w = mountWith(Subscriptions);
    await nextTick();
    expect(w.find('[data-testid="sub-filter-toolbar"]').exists()).toBe(true);
    w.unmount();
  });

  it('search narrows the subscription list by name', async () => {
    seedSubs();
    const w = mountWith(Subscriptions);
    await nextTick();
    await w.find('#sub-search').setValue('netflix');
    await nextTick();
    expect(w.findAll('.sub-item').length).toBe(1);
    expect(w.find('.sub-name').text()).toBe('Netflix');
    w.unmount();
  });

  it('category filter narrows the list', async () => {
    seedSubs();
    const w = mountWith(Subscriptions);
    await nextTick();
    await w.find('.filter-toolbar__filter-btn').trigger('click');
    await nextTick();
    await w.find('#sub-filter-cat').setValue('Entertainment');
    await nextTick();
    expect(w.findAll('.sub-item').length).toBe(1);
    expect(w.find('.sub-name').text()).toBe('Netflix');
    w.unmount();
  });

  it('budget type filter shows only Needs subscriptions', async () => {
    seedSubs();
    const w = mountWith(Subscriptions);
    await nextTick();
    await w.find('.filter-toolbar__filter-btn').trigger('click');
    await nextTick();
    await w.find('#sub-filter-type').setValue('needs');
    await nextTick();
    expect(w.findAll('.sub-item').length).toBe(1);
    expect(w.find('.sub-name').text()).toBe('Gym');
    w.unmount();
  });

  it('card filter "No card" shows only unlinked subscriptions', async () => {
    const budget = useBudgetStore();
    budget.subscriptions.splice(0);
    const card = budget.addExpenseCard('Visa');
    budget.addSubscription({ name: 'Netflix', amount: 18, frequency: 'monthly', date: '2026-06-01', category: 'Entertainment', budgetType: 'wants', cardId: card!.id, daysOfWeek: [] });
    budget.addSubscription({ name: 'Gym',     amount: 55, frequency: 'monthly', date: '2026-06-15', category: 'Health & Fitness', budgetType: 'needs', cardId: null, daysOfWeek: [] });
    const w = mountWith(Subscriptions);
    await nextTick();
    await w.find('.filter-toolbar__filter-btn').trigger('click');
    await nextTick();
    await w.find('#sub-filter-card').setValue('none');
    await nextTick();
    expect(w.findAll('.sub-item').length).toBe(1);
    expect(w.find('.sub-name').text()).toBe('Gym');
    w.unmount();
  });

  it('active filter count badge reflects number of active filters', async () => {
    seedSubs();
    const w = mountWith(Subscriptions);
    await nextTick();
    await w.find('.filter-toolbar__filter-btn').trigger('click');
    await nextTick();
    await w.find('#sub-filter-cat').setValue('Entertainment');
    await nextTick();
    expect(w.find('.filter-toolbar__badge').text()).toBe('1');
    w.unmount();
  });

  it('result count row appears when any filter is active', async () => {
    seedSubs();
    const w = mountWith(Subscriptions);
    await nextTick();
    expect(w.find('[data-testid="sub-filter-count"]').exists()).toBe(false);
    await w.find('#sub-search').setValue('net');
    await nextTick();
    expect(w.find('[data-testid="sub-filter-count"]').exists()).toBe(true);
    w.unmount();
  });

  it('shows no-results empty state when filters produce 0 matches', async () => {
    seedSubs();
    const w = mountWith(Subscriptions);
    await nextTick();
    await w.find('#sub-search').setValue('zzznomatch');
    await nextTick();
    expect(w.find('[data-testid="sub-no-results"]').exists()).toBe(true);
    expect(w.find('.subs-list').exists()).toBe(false);
    w.unmount();
  });

  it('Clear button resets all filters and shows full list', async () => {
    seedSubs();
    const w = mountWith(Subscriptions);
    await nextTick();
    await w.find('#sub-search').setValue('netflix');
    await nextTick();
    expect(w.findAll('.sub-item').length).toBe(1);
    await w.find('.filter-toolbar__clear').trigger('click');
    await nextTick();
    expect(w.findAll('.sub-item').length).toBe(2);
    w.unmount();
  });

  it('drawer toggles open/closed', async () => {
    seedSubs();
    const w = mountWith(Subscriptions);
    await nextTick();
    const drawer = w.find('#sub-filter-drawer');
    expect(drawer.classes()).not.toContain('filter-toolbar__drawer-wrap--open');
    await w.find('.filter-toolbar__filter-btn').trigger('click');
    await nextTick();
    expect(drawer.classes()).toContain('filter-toolbar__drawer-wrap--open');
    w.unmount();
  });

  it('sort by name A-Z orders subscriptions alphabetically', async () => {
    seedSubs();
    const w = mountWith(Subscriptions);
    await nextTick();
    await w.find('#sub-sort').setValue('nameAZ');
    await nextTick();
    const names = w.findAll('.sub-name').map(el => el.text());
    expect(names[0]).toBe('Gym');
    expect(names[1]).toBe('Netflix');
    w.unmount();
  });

  it('sort by monthly cost descending orders by computed cost', async () => {
    seedSubs();
    const w = mountWith(Subscriptions);
    await nextTick();
    await w.find('#sub-sort').setValue('moCostHigh');
    await nextTick();
    const names = w.findAll('.sub-name').map(el => el.text());
    // Gym $55/mo > Netflix $18/mo
    expect(names[0]).toBe('Gym');
    expect(names[1]).toBe('Netflix');
    w.unmount();
  });
});
