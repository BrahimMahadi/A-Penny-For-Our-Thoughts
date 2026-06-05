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
//  3. EXPENSE CARDS  (former section #3 "WantsTracker" removed in RS-25)
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
//  Loans — RS-13 inline payment
// ─────────────────────────────────────────────────────────────────
describe('Loans — RS-13 inline payment', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  function setupLoan() {
    const budget = useBudgetStore();
    budget.loans = [];
    budget.addLoan({
      name: 'Car Loan', remaining: 5000, original: 12000,
      paymentAmount: 300, frequency: 'monthly', date: '2026-06-01',
      budgetType: 'needs', cardId: null,
    });
    return budget;
  }

  it('each loan card has a Pay button', async () => {
    setupLoan();
    const w = mountWith(Loans);
    await nextTick();
    const payBtn = w.findAll('button').find(b => b.text() === 'Pay');
    expect(payBtn).toBeDefined();
    w.unmount();
  });

  it('clicking Pay reveals the inline payment form', async () => {
    setupLoan();
    const w = mountWith(Loans);
    await nextTick();
    expect(w.find('.loan-inline-pay').exists()).toBe(false);
    await w.findAll('button').find(b => b.text() === 'Pay')!.trigger('click');
    await nextTick();
    expect(w.find('.loan-inline-pay').exists()).toBe(true);
    w.unmount();
  });

  it('inline form pre-fills with scheduled payment amount', async () => {
    setupLoan();
    const w = mountWith(Loans);
    await nextTick();
    await w.findAll('button').find(b => b.text() === 'Pay')!.trigger('click');
    await nextTick();
    const input = w.find('.loan-inline-pay__input');
    expect(Number((input.element as HTMLInputElement).value)).toBe(300);
    w.unmount();
  });

  it('confirming payment reduces loan remaining balance', async () => {
    const budget = setupLoan();
    const w = mountWith(Loans);
    await nextTick();
    await w.findAll('button').find(b => b.text() === 'Pay')!.trigger('click');
    await nextTick();
    const input = w.find('.loan-inline-pay__input');
    await input.setValue('300');
    await w.find('.loan-inline-pay__confirm').trigger('click');
    await nextTick();
    expect(budget.loans[0].remaining).toBe(4700);
    w.unmount();
  });

  it('payment is clamped to 0 (cannot go negative)', async () => {
    const budget = setupLoan();
    const w = mountWith(Loans);
    await nextTick();
    await w.findAll('button').find(b => b.text() === 'Pay')!.trigger('click');
    await nextTick();
    await w.find('.loan-inline-pay__input').setValue('99999');
    await w.find('.loan-inline-pay__confirm').trigger('click');
    await nextTick();
    expect(budget.loans[0].remaining).toBe(0);
    w.unmount();
  });

  it('clicking ✕ cancel closes the inline form', async () => {
    setupLoan();
    const w = mountWith(Loans);
    await nextTick();
    await w.findAll('button').find(b => b.text() === 'Pay')!.trigger('click');
    await nextTick();
    expect(w.find('.loan-inline-pay').exists()).toBe(true);
    await w.find('.loan-inline-pay__cancel').trigger('click');
    await nextTick();
    expect(w.find('.loan-inline-pay').exists()).toBe(false);
    w.unmount();
  });

  it('confirm button is disabled when amount is 0', async () => {
    setupLoan();
    const w = mountWith(Loans);
    await nextTick();
    await w.findAll('button').find(b => b.text() === 'Pay')!.trigger('click');
    await nextTick();
    await w.find('.loan-inline-pay__input').setValue('0');
    const confirmBtn = w.find('.loan-inline-pay__confirm').element as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
    w.unmount();
  });

  it('shows remaining-after preview that updates as amount changes', async () => {
    setupLoan();
    const w = mountWith(Loans);
    await nextTick();
    await w.findAll('button').find(b => b.text() === 'Pay')!.trigger('click');
    await nextTick();
    await w.find('.loan-inline-pay__input').setValue('500');
    await nextTick();
    expect(w.find('.loan-inline-pay__preview').text()).toContain('4,500');
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
//  CreditCards — RS-13 inline charge/pay
// ─────────────────────────────────────────────────────────────────
describe('CreditCards — RS-13 inline charge/pay', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  // DEFAULT_STATE: Visa with balance: 0, limit: 1000

  it('each card has a "+ Charge" and "✓ Pay" button', async () => {
    const w = mountWith(CreditCards);
    await nextTick();
    const btns = w.findAll('button').map(b => b.text());
    expect(btns.some(t => t.includes('Charge'))).toBe(true);
    expect(btns.some(t => t.includes('Pay'))).toBe(true);
    w.unmount();
  });

  it('clicking "+ Charge" reveals inline form with --charge class', async () => {
    const w = mountWith(CreditCards);
    await nextTick();
    expect(w.find('.cc-inline-form').exists()).toBe(false);
    await w.findAll('button').find(b => b.text().includes('Charge'))!.trigger('click');
    await nextTick();
    expect(w.find('.cc-inline-form').exists()).toBe(true);
    expect(w.find('.cc-inline-form--charge').exists()).toBe(true);
    w.unmount();
  });

  it('clicking "✓ Pay" reveals inline form with --pay class', async () => {
    const w = mountWith(CreditCards);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Pay'))!.trigger('click');
    await nextTick();
    expect(w.find('.cc-inline-form--pay').exists()).toBe(true);
    w.unmount();
  });

  it('confirming a charge increases balance', async () => {
    const budget = useBudgetStore();
    const w = mountWith(CreditCards);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Charge'))!.trigger('click');
    await nextTick();
    await w.find('.cc-inline-form__input').setValue('150');
    await w.find('.cc-inline-form__confirm').trigger('click');
    await nextTick();
    expect(+budget.creditCards[0].balance).toBe(150);
    w.unmount();
  });

  it('charge is capped at credit limit', async () => {
    const budget = useBudgetStore();
    const w = mountWith(CreditCards);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Charge'))!.trigger('click');
    await nextTick();
    await w.find('.cc-inline-form__input').setValue('9999');
    await w.find('.cc-inline-form__confirm').trigger('click');
    await nextTick();
    expect(+budget.creditCards[0].balance).toBe(1000); // capped at limit
    w.unmount();
  });

  it('confirming a payment decreases balance (clamped at 0)', async () => {
    const budget = useBudgetStore();
    // First set a positive balance
    budget.updateCreditCard(budget.creditCards[0].id, { balance: 400 });
    const w = mountWith(CreditCards);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Pay'))!.trigger('click');
    await nextTick();
    await w.find('.cc-inline-form__input').setValue('9999');
    await w.find('.cc-inline-form__confirm').trigger('click');
    await nextTick();
    expect(+budget.creditCards[0].balance).toBe(0);
    w.unmount();
  });

  it('cancel closes the inline form without modifying balance', async () => {
    const budget = useBudgetStore();
    const w = mountWith(CreditCards);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Charge'))!.trigger('click');
    await nextTick();
    await w.find('.cc-inline-form__input').setValue('200');
    await w.find('.cc-inline-form__cancel').trigger('click');
    await nextTick();
    expect(w.find('.cc-inline-form').exists()).toBe(false);
    expect(+budget.creditCards[0].balance).toBe(0);
    w.unmount();
  });

  it('confirm button is disabled when amount is 0', async () => {
    const w = mountWith(CreditCards);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Charge'))!.trigger('click');
    await nextTick();
    await w.find('.cc-inline-form__input').setValue('0');
    const confirmBtn = w.find('.cc-inline-form__confirm').element as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
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
//  Savings — RS-13 inline deposit/withdraw
// ─────────────────────────────────────────────────────────────────
describe('Savings — RS-13 inline deposit/withdraw', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  // DEFAULT_STATE: Emergency Fund + Investments with balance: 0

  it('each account has a "+ Deposit" and "− Withdraw" button', async () => {
    const w = mountWith(Savings);
    await nextTick();
    const btns = w.findAll('button').map(b => b.text());
    expect(btns.some(t => t.includes('Deposit'))).toBe(true);
    expect(btns.some(t => t.includes('Withdraw'))).toBe(true);
    w.unmount();
  });

  it('clicking "+ Deposit" reveals inline form with --deposit class', async () => {
    const w = mountWith(Savings);
    await nextTick();
    expect(w.find('.savings-inline-form').exists()).toBe(false);
    await w.findAll('button').find(b => b.text().includes('Deposit'))!.trigger('click');
    await nextTick();
    expect(w.find('.savings-inline-form--deposit').exists()).toBe(true);
    w.unmount();
  });

  it('clicking "− Withdraw" reveals inline form with --withdraw class', async () => {
    const w = mountWith(Savings);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Withdraw'))!.trigger('click');
    await nextTick();
    expect(w.find('.savings-inline-form--withdraw').exists()).toBe(true);
    w.unmount();
  });

  it('confirming a deposit increases account balance', async () => {
    const budget = useBudgetStore();
    const w = mountWith(Savings);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Deposit'))!.trigger('click');
    await nextTick();
    await w.find('.savings-inline-form__input').setValue('500');
    await w.find('.savings-inline-form__confirm').trigger('click');
    await nextTick();
    expect(budget.savingsAccounts[0].balance).toBe(500);
    w.unmount();
  });

  it('confirming a withdrawal decreases balance', async () => {
    const budget = useBudgetStore();
    // Pre-set a positive balance
    budget.updateSavingsAccount(budget.savingsAccounts[0].id, { balance: 1000 });
    const w = mountWith(Savings);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Withdraw'))!.trigger('click');
    await nextTick();
    await w.find('.savings-inline-form__input').setValue('250');
    await w.find('.savings-inline-form__confirm').trigger('click');
    await nextTick();
    expect(budget.savingsAccounts[0].balance).toBe(750);
    w.unmount();
  });

  it('withdrawal is clamped to 0 — balance cannot go negative', async () => {
    const budget = useBudgetStore();
    budget.updateSavingsAccount(budget.savingsAccounts[0].id, { balance: 100 });
    const w = mountWith(Savings);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Withdraw'))!.trigger('click');
    await nextTick();
    await w.find('.savings-inline-form__input').setValue('9999');
    await w.find('.savings-inline-form__confirm').trigger('click');
    await nextTick();
    expect(budget.savingsAccounts[0].balance).toBe(0);
    w.unmount();
  });

  it('cancel closes the inline form without modifying balance', async () => {
    const budget = useBudgetStore();
    const w = mountWith(Savings);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Deposit'))!.trigger('click');
    await nextTick();
    await w.find('.savings-inline-form__input').setValue('999');
    await w.find('.savings-inline-form__cancel').trigger('click');
    await nextTick();
    expect(w.find('.savings-inline-form').exists()).toBe(false);
    expect(budget.savingsAccounts[0].balance).toBe(0);
    w.unmount();
  });

  it('confirm button is disabled when amount is 0', async () => {
    const w = mountWith(Savings);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Deposit'))!.trigger('click');
    await nextTick();
    await w.find('.savings-inline-form__input').setValue('0');
    const confirmBtn = w.find('.savings-inline-form__confirm').element as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
    w.unmount();
  });

  it('new-balance preview reflects typed amount', async () => {
    const budget = useBudgetStore();
    budget.updateSavingsAccount(budget.savingsAccounts[0].id, { balance: 1000 });
    const w = mountWith(Savings);
    await nextTick();
    await w.findAll('button').find(b => b.text().includes('Deposit'))!.trigger('click');
    await nextTick();
    await w.find('.savings-inline-form__input').setValue('250');
    await nextTick();
    expect(w.find('.savings-inline-form__preview').text()).toContain('1,250');
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
    expect(w.find('.wish-grid').exists()).toBe(true);
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

  it('renders a link icon button when url is provided', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'Desk', icon: '🖥', url: 'https://example.com' });
    const w = mountWith(Wishlist);
    await nextTick();
    const link = w.find('.wish-link-btn');
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
//  SpendingAnalytics — RS-24 per-period budget vs spent rollup
// ─────────────────────────────────────────────────────────────────
describe('SpendingAnalytics — RS-24 rollup row', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  /** Open the analytics panel so the period list renders. */
  function openPanel() {
    const ui = useUiStore();
    ui.analyticsPanelOpen = true;
  }

  it('does NOT render the rollup row when archive has no budgets/spent fields (legacy)', async () => {
    openPanel();
    const budget = useBudgetStore();
    budget.spendingHistory = [{
      id: 'old-1', date: '2026-04-01', total: 100,
      items: [{ name: 'Coffee', amount: 100, category: 'Other' }],
    }] as any;
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    expect(w.find('[data-testid="period-rollup"]').exists()).toBe(false);
    w.unmount();
  });

  it('renders the rollup row when archive has budgets + spent', async () => {
    openPanel();
    const budget = useBudgetStore();
    budget.spendingHistory = [{
      id: 'new-1', date: '2026-05-01', total: 100,
      items: [{ name: 'Coffee', amount: 100, category: 'Other' }],
      budgets: { needs: 1000, wants: 600, savings: 400 },
      spent:   { wants: 100, needs: 0 },
    }] as any;
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    expect(w.find('[data-testid="period-rollup"]').exists()).toBe(true);
    w.unmount();
  });

  it('shows an "under" status when spent < budget', async () => {
    openPanel();
    const budget = useBudgetStore();
    budget.spendingHistory = [{
      id: 'p1', date: '2026-05-01', total: 100,
      items: [],
      budgets: { needs: 1000, wants: 600, savings: 400 },
      spent:   { wants: 100, needs: 0 },
    }] as any;
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    const row = w.find('[data-testid="rollup-wants"]');
    expect(row.text().toLowerCase()).toContain('under');
    expect(row.classes()).toContain('period-rollup-row--under');
    w.unmount();
  });

  it('shows an "over" status when spent > budget', async () => {
    openPanel();
    const budget = useBudgetStore();
    budget.spendingHistory = [{
      id: 'p1', date: '2026-05-01', total: 800,
      items: [],
      budgets: { needs: 1000, wants: 600, savings: 400 },
      spent:   { wants: 800, needs: 0 },
    }] as any;
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    const row = w.find('[data-testid="rollup-wants"]');
    expect(row.text().toLowerCase()).toContain('over');
    expect(row.classes()).toContain('period-rollup-row--over');
    w.unmount();
  });

  it('shows an "on target" status when spent == budget', async () => {
    openPanel();
    const budget = useBudgetStore();
    budget.spendingHistory = [{
      id: 'p1', date: '2026-05-01', total: 600,
      items: [],
      budgets: { needs: 0, wants: 600, savings: 0 },
      spent:   { wants: 600, needs: 0 },
    }] as any;
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    const row = w.find('[data-testid="rollup-wants"]');
    expect(row.text().toLowerCase()).toContain('on target');
    expect(row.classes()).toContain('period-rollup-row--on-target');
    w.unmount();
  });

  it('omits a type row when its spent AND budget are both zero', async () => {
    openPanel();
    const budget = useBudgetStore();
    // Only wants is populated; needs is fully zero → should NOT render a row.
    budget.spendingHistory = [{
      id: 'p1', date: '2026-05-01', total: 100,
      items: [],
      budgets: { needs: 0, wants: 600, savings: 400 },
      spent:   { wants: 100, needs: 0 },
    }] as any;
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    expect(w.find('[data-testid="rollup-wants"]').exists()).toBe(true);
    expect(w.find('[data-testid="rollup-needs"]').exists()).toBe(false);
    w.unmount();
  });

  it('renders both wants and needs rows when both have data', async () => {
    openPanel();
    const budget = useBudgetStore();
    budget.spendingHistory = [{
      id: 'p1', date: '2026-05-01', total: 800,
      items: [],
      budgets: { needs: 1000, wants: 600, savings: 400 },
      spent:   { wants: 100, needs: 500 },
    }] as any;
    const w = mountWith(SpendingAnalytics);
    await nextTick();
    expect(w.find('[data-testid="rollup-wants"]').exists()).toBe(true);
    expect(w.find('[data-testid="rollup-needs"]').exists()).toBe(true);
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
    // Pin "today" so the period window is always predictable regardless of
    // when this test runs. payStart anchors the period to May 19 – Jun 1.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T12:00:00'));
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
    vi.useRealTimers();
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
//  PurchasesThisPeriod — RS-12
// ─────────────────────────────────────────────────────────────────
import PurchasesThisPeriod from '@/components/sections/PurchasesThisPeriod.vue';

describe('PurchasesThisPeriod', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(PurchasesThisPeriod);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('shows empty state when no purchases and no deductions', async () => {
    const w = mountWith(PurchasesThisPeriod);
    await nextTick();
    expect(w.find('.ptp__empty').exists()).toBe(true);
    w.unmount();
  });

  it('renders donut + category list when purchases exist', async () => {
    const budget = useBudgetStore();
    budget.addPurchase({ name: 'Coffee', amount: 5, category: 'Food', cardId: null, budgetType: 'wants' });
    const w = mountWith(PurchasesThisPeriod);
    await nextTick();
    expect(w.find('.ptp__body').exists()).toBe(true);
    expect(w.find('.ptp__donut-wrap').exists()).toBe(true);
    expect(w.find('.ptp__categories').exists()).toBe(true);
    w.unmount();
  });

  it('shows a category row for each unique category', async () => {
    const budget = useBudgetStore();
    budget.addPurchase({ name: 'Coffee', amount: 5,  category: 'Food',  cardId: null, budgetType: 'wants' });
    budget.addPurchase({ name: 'Book',   amount: 15, category: 'Other', cardId: null, budgetType: 'wants' });
    const w = mountWith(PurchasesThisPeriod);
    await nextTick();
    expect(w.findAll('.ptp__cat-row').length).toBeGreaterThanOrEqual(2);
    w.unmount();
  });

  it('renders footer text', async () => {
    const w = mountWith(PurchasesThisPeriod);
    await nextTick();
    expect(w.find('.ptp__footer').exists()).toBe(true);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  RecurringSpend — RS-12
// ─────────────────────────────────────────────────────────────────
import RecurringSpend from '@/components/sections/RecurringSpend.vue';

describe('RecurringSpend', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(RecurringSpend);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('shows empty state when no expense cards', async () => {
    const budget = useBudgetStore();
    budget.expenseCards.length = 0;
    const w = mountWith(RecurringSpend);
    await nextTick();
    expect(w.find('.base-empty-state').exists()).toBe(true);
    w.unmount();
  });

  it('renders summary + card rows when expense cards exist', async () => {
    const budget = useBudgetStore();
    budget.addExpenseCard('Visa');
    budget.addExpenseCard('Mastercard');
    const w = mountWith(RecurringSpend);
    await nextTick();
    expect(w.find('.rs__summary').exists()).toBe(true);
    expect(w.find('.rs__cards').exists()).toBe(true);
    expect(w.findAll('.rs__card').length).toBe(2);
    w.unmount();
  });

  it('card is collapsed by default (no items visible)', async () => {
    const budget = useBudgetStore();
    budget.addExpenseCard('Visa');
    const w = mountWith(RecurringSpend);
    await nextTick();
    expect(w.find('.rs__card-items').exists()).toBe(false);
    w.unmount();
  });

  it('clicking card header expands and shows items', async () => {
    const budget = useBudgetStore();
    budget.addExpenseCard('Visa');
    const w = mountWith(RecurringSpend);
    await nextTick();
    await w.find('.rs__card-header').trigger('click');
    await nextTick();
    expect(w.find('.rs__card-items').exists()).toBe(true);
    w.unmount();
  });

  it('clicking card header again collapses it', async () => {
    const budget = useBudgetStore();
    budget.addExpenseCard('Visa');
    const w = mountWith(RecurringSpend);
    await nextTick();
    const header = w.find('.rs__card-header');
    await header.trigger('click');
    await nextTick();
    expect(w.find('.rs__card-items').exists()).toBe(true);
    await header.trigger('click');
    await nextTick();
    expect(w.find('.rs__card-items').exists()).toBe(false);
    w.unmount();
  });

  it('renders footer settings hint', async () => {
    const budget = useBudgetStore();
    budget.addExpenseCard('Visa');
    const w = mountWith(RecurringSpend);
    await nextTick();
    expect(w.find('.rs__footer').exists()).toBe(true);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  MoneyFlow — RS-12
// ─────────────────────────────────────────────────────────────────
import MoneyFlow from '@/components/sections/MoneyFlow.vue';

describe('MoneyFlow', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', () => {
    const w = mountWith(MoneyFlow);
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('renders the money-flow wrapper', async () => {
    const w = mountWith(MoneyFlow);
    await nextTick();
    expect(w.find('.money-flow').exists()).toBe(true);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  DashboardPage — RS-11 fixed grid layout
// ─────────────────────────────────────────────────────────────────
import DashboardPage from '@/components/pages/DashboardPage.vue';
import SectionPicker from '@/components/ui/SectionPicker.vue';
import { DEFAULT_SECTION_ORDER, DASHBOARD_SECTIONS } from '@/constants/dashboardSections';
import SpendingPage  from '@/components/pages/SpendingPage.vue';

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
    // 2 plain .kpi-card divs (due-in-7, needs-spent) + chequing-balance as BaseCard in the same row
    expect(w.findAll('.kpi-card')).toHaveLength(2);
    expect(w.find('.kpi-row #section-chequing-balance').exists()).toBe(true);
    w.unmount();
  });

  it('renders all 9 fixed section cards', async () => {
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

  it('renders the 2-col charts row with purchases and money-flow', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    expect(w.find('.dash-charts-row').exists()).toBe(true);
    expect(w.find('.dash-charts-row #section-purchases-this-period').exists()).toBe(true);
    expect(w.find('.dash-charts-row #section-money-flow').exists()).toBe(true);
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

  it('chequing balance is in the KPI row; subscriptions is full-width', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    // Chequing balance moved to the KPI row (no longer in a dash-2col-row)
    expect(w.find('.kpi-row #section-chequing-balance').exists()).toBe(true);
    expect(w.find('.dash-2col-row').exists()).toBe(false);
    // Subscriptions is now a standalone full-width card
    expect(w.find('#section-subscriptions').exists()).toBe(true);
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
    // 8 collapsible BaseCards: purchases-this-period, money-flow, expense-cards, loans,
    // savings-accounts, subscriptions, credit-cards, wishlist.
    // Chequing Balance is non-collapsible (now lives in the KPI row).
    expect(chevrons.length).toBe(8);
    w.unmount();
  });

  it('collapsing a section hides its body', async () => {
    const ui = useUiStore();
    const w = mountWith(DashboardPage);
    await nextTick();
    ui.toggleSection('subscriptions');
    await nextTick();
    const card = w.find('#section-subscriptions');
    // v-if removes body from DOM when collapsed (RS-17: switched from v-show to v-if + GSAP)
    const body = card.find('.base-card__body');
    expect(body.exists()).toBe(false);
    w.unmount();
  });

  it('renders the quick-add button in the header (RS-15: renamed to "Add purchase")', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    const btn = w.find('.btn-primary');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain('Add purchase');
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
//  SectionPicker — RS-22 (Dashboard-only, jump + collapse)
//
//  As of RS-22 the picker:
//    • Shows only Dashboard sections (Advanced group removed)
//    • No drag handles, no move-up/move-down buttons, no reset button
//    • Renders items in DASHBOARD_SECTIONS order (matches page layout)
//    • Each item has a jump button + a collapse toggle button
// ─────────────────────────────────────────────────────────────────
describe('SectionPicker — RS-22 jump + collapse', () => {
  beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('renders exactly one item per Dashboard section (9 items)', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const items = document.body.querySelectorAll('.section-picker-item');
    expect(items.length).toBe(DASHBOARD_SECTIONS.length);
    expect(items.length).toBe(9);
    w.unmount();
  });

  it('does NOT render any advanced sections', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const labels = Array.from(
      document.body.querySelectorAll('.section-picker-item__label'),
    ).map(el => el.textContent?.trim());
    // None of the advanced section labels should appear
    expect(labels).not.toContain('Spending Analytics');
    expect(labels).not.toContain('Budget vs. Actual');
    expect(labels).not.toContain('Net Worth');
    expect(labels).not.toContain('6-Month Spending Trend');
    w.unmount();
  });

  it('does NOT render drag handles', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    expect(document.body.querySelectorAll('.picker-drag-handle')).toHaveLength(0);
    w.unmount();
  });

  it('does NOT render move-up / move-down buttons', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    expect(document.body.querySelectorAll('.picker-move-btn')).toHaveLength(0);
    w.unmount();
  });

  it('does NOT render any reset-order button', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    expect(document.body.querySelectorAll('.picker-reset-inline')).toHaveLength(0);
    w.unmount();
  });

  it('renders one jump button per section', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    expect(document.body.querySelectorAll('.picker-jump-btn')).toHaveLength(9);
    w.unmount();
  });

  it('renders one collapse toggle per section', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    expect(document.body.querySelectorAll('.picker-collapse-btn')).toHaveLength(9);
    w.unmount();
  });

  it('renders sections in DASHBOARD_SECTIONS canonical order', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const labels = Array.from(
      document.body.querySelectorAll('.section-picker-item__label'),
    ).map(el => el.textContent?.trim());
    expect(labels).toEqual(DASHBOARD_SECTIONS.map(s => s.label));
    w.unmount();
  });

  it('renders Chequing Balance first (matches DashboardPage KPI row order)', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const firstLabel = document.body.querySelector('.section-picker-item__label');
    expect(firstLabel?.textContent?.trim()).toBe('Chequing Balance');
    w.unmount();
  });

  it('renders Wishlist last (matches DashboardPage bottom row)', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const labels = Array.from(
      document.body.querySelectorAll('.section-picker-item__label'),
    );
    expect(labels[labels.length - 1].textContent?.trim()).toBe('Wishlist');
    w.unmount();
  });

  it('clicking collapse toggle on the first item collapses the first dashboard section', async () => {
    const ui = useUiStore();
    expect(ui.isSectionCollapsed(DEFAULT_SECTION_ORDER[0])).toBe(false);
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const firstCollapseBtn = document.body.querySelectorAll('.picker-collapse-btn')[0] as HTMLElement;
    firstCollapseBtn.click();
    await nextTick();
    expect(ui.isSectionCollapsed(DEFAULT_SECTION_ORDER[0])).toBe(true);
    w.unmount();
  });

  it('clicking a jump button switches activeTab to dashboard and closes the picker', async () => {
    const ui = useUiStore();
    ui.setActiveTab('settings');
    const onUpdate = vi.fn();
    const w = mount(SectionPicker, {
      props: { open: true, 'onUpdate:open': onUpdate },
      attachTo: document.body,
    });
    await nextTick();
    const firstJumpBtn = document.body.querySelector('.picker-jump-btn') as HTMLElement;
    firstJumpBtn.click();
    await nextTick();
    expect(ui.activeTab).toBe('dashboard');
    expect(onUpdate).toHaveBeenCalledWith(false);
    w.unmount();
  });

  it('clicking a jump button expands the target section if it was collapsed', async () => {
    const ui = useUiStore();
    const firstId = DEFAULT_SECTION_ORDER[0];
    ui.toggleSection(firstId); // collapse it
    expect(ui.isSectionCollapsed(firstId)).toBe(true);
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    const firstJumpBtn = document.body.querySelector('.picker-jump-btn') as HTMLElement;
    firstJumpBtn.click();
    await nextTick();
    expect(ui.isSectionCollapsed(firstId)).toBe(false);
    w.unmount();
  });

  it('does NOT render a "Dashboard" or "Advanced" group header', async () => {
    const w = mount(SectionPicker, {
      props: { open: true },
      attachTo: document.body,
    });
    await nextTick();
    expect(document.body.querySelector('.picker-group-header')).toBeNull();
    expect(document.body.querySelector('.picker-group-divider')).toBeNull();
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
    // Pin "today" so the pay period window is always predictable.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T12:00:00'));
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
    vi.useRealTimers();
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

// ─────────────────────────────────────────────────────────────────
//  Wishlist — RS-14 price tracking & affordability
// ─────────────────────────────────────────────────────────────────
describe('Wishlist — RS-14 price tracking', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
  });
  afterEach(() => { document.body.innerHTML = ''; });

  it('shows price on an item that has one', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'AirPods', icon: '🎧', url: '', price: 249 });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('.wish-price').exists()).toBe(true);
    expect(w.find('.wish-price').text()).toContain('249');
    w.unmount();
  });

  it('does not show .wish-price when price is not set', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'Book', icon: '📚', url: '' });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('.wish-price').exists()).toBe(false);
    w.unmount();
  });

  it('shows "Affordable ✓" chip when price ≤ bi-weekly wants budget', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    // Set up income so bi-weekly wants budget is $300 (3000/mo × 20% wants / 2)
    budget.incomeStreams = [];
    budget.addIncomeStream({ name: 'Salary', amount: 3000, biweekly: false });
    budget.allocation = { needs: 50, wants: 20, savings: 30 };
    budget.addWishlistItem({ name: 'Game', icon: '🎮', url: '', price: 60 });
    const w = mountWith(Wishlist);
    await nextTick();
    const chip = w.find('.wish-chip--affordable');
    expect(chip.exists()).toBe(true);
    expect(chip.text()).toContain('Affordable');
    w.unmount();
  });

  it('does not show affordable chip when price > bi-weekly wants budget', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.incomeStreams = [];
    budget.addIncomeStream({ name: 'Salary', amount: 3000, biweekly: false });
    budget.allocation = { needs: 50, wants: 20, savings: 30 };
    // bi-weekly wants = 3000 × 0.20 / 2 = $300; price $500 > $300
    budget.addWishlistItem({ name: 'iPhone', icon: '📱', url: '', price: 500 });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('.wish-chip--affordable').exists()).toBe(false);
    w.unmount();
  });

  it('shows total value in header when priced items exist', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'A', icon: '🅰', url: '', price: 100 });
    budget.addWishlistItem({ name: 'B', icon: '🅱', url: '', price: 200 });
    const w = mountWith(Wishlist);
    await nextTick();
    const total = w.find('.wishlist-section__total');
    expect(total.exists()).toBe(true);
    expect(total.text()).toContain('300');
    w.unmount();
  });

  it('does not show total header when no items have prices', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'NoPrice', icon: '🛒', url: '' });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('.wishlist-section__total').exists()).toBe(false);
    w.unmount();
  });

  it('shows sort select when there are 2+ items', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'A', icon: '🅰', url: '' });
    budget.addWishlistItem({ name: 'B', icon: '🅱', url: '' });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('.wishlist-sort').exists()).toBe(true);
    w.unmount();
  });

  it('sort by price ascending orders items cheapest first', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'Expensive', icon: '💎', url: '', price: 999 });
    budget.addWishlistItem({ name: 'Cheap', icon: '🎯', url: '', price: 10 });
    const w = mountWith(Wishlist);
    await nextTick();
    await w.find('.wishlist-sort').setValue('price-asc');
    await nextTick();
    const names = w.findAll('.wish-name').map(el => el.text());
    expect(names[0]).toBe('Cheap');
    expect(names[1]).toBe('Expensive');
    w.unmount();
  });

  it('sort by price descending orders items most expensive first', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'Cheap', icon: '🎯', url: '', price: 10 });
    budget.addWishlistItem({ name: 'Expensive', icon: '💎', url: '', price: 999 });
    const w = mountWith(Wishlist);
    await nextTick();
    await w.find('.wishlist-sort').setValue('price-desc');
    await nextTick();
    const names = w.findAll('.wish-name').map(el => el.text());
    expect(names[0]).toBe('Expensive');
    expect(names[1]).toBe('Cheap');
    w.unmount();
  });

  it('price field appears in the add modal', async () => {
    const w = mount(Wishlist, { attachTo: document.body });
    await nextTick();
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Item'));
    await addBtn!.trigger('click');
    await nextTick();
    expect(document.body.querySelector('#wish-price')).not.toBeNull();
    w.unmount();
  });

  it('addWishlistItem correctly stores price', () => {
    const budget = useBudgetStore();
    budget.addWishlistItem({ name: 'Chair', icon: '🪑', url: '', price: 350 });
    const item = budget.wishlist.find(w => w.name === 'Chair');
    expect(item?.price).toBe(350);
  });

  it('updateWishlistItem can update price', () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    const item = budget.addWishlistItem({ name: 'Desk', icon: '🖥', url: '' });
    budget.updateWishlistItem(item.id, { price: 450 });
    expect(budget.wishlist.find(w => w.id === item.id)?.price).toBe(450);
  });

  // ── card grid & saved tracking ────────────────────────────────

  it('renders as a card grid (.wish-grid) not a list', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'Monitor', icon: '🖥', url: '' });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('.wish-grid').exists()).toBe(true);
    expect(w.find('.wish-card').exists()).toBe(true);
    w.unmount();
  });

  it('shows progress bar when item has a price', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'Keyboard', icon: '⌨️', url: '', price: 200 });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('.wish-card__progress-fill').exists()).toBe(true);
    w.unmount();
  });

  it('does not show progress bar when item has no price', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'Book', icon: '📚', url: '' });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('.wish-card__progress-fill').exists()).toBe(false);
    w.unmount();
  });

  it('shows ~N mo badge when income and savings rate are set', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.incomeStreams = [];
    budget.addIncomeStream({ name: 'Salary', amount: 3000, biweekly: false });
    budget.allocation = { needs: 50, wants: 30, savings: 20 };
    // Monthly savings = 3000 × 20% = $600/mo; price = $1200 → 2 months
    budget.addWishlistItem({ name: 'Laptop', icon: '💻', url: '', price: 1200 });
    const w = mountWith(Wishlist);
    await nextTick();
    const badge = w.find('.wish-card__months-badge');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain('2 mo');
    w.unmount();
  });

  it('shows ✓ Saved badge when item is fully saved for', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.incomeStreams = [];
    budget.addIncomeStream({ name: 'Salary', amount: 3000, biweekly: false });
    budget.allocation = { needs: 50, wants: 30, savings: 20 };
    budget.addWishlistItem({ name: 'Headphones', icon: '🎧', url: '', price: 100, saved: 100 });
    const w = mountWith(Wishlist);
    await nextTick();
    const badge = w.find('.wish-card__months-badge--done');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain('Saved');
    w.unmount();
  });

  it('progress bar width reflects saved/price ratio', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'Camera', icon: '📷', url: '', price: 400, saved: 200 });
    const w = mountWith(Wishlist);
    await nextTick();
    const bar = w.find('.wish-card__progress-fill');
    expect(bar.attributes('style')).toContain('50%');
    w.unmount();
  });

  it('addWishlistItem correctly stores saved amount', () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'TV', icon: '📺', url: '', price: 800, saved: 150 });
    const item = budget.wishlist.find(w => w.name === 'TV');
    expect(item?.saved).toBe(150);
  });

  it('updateWishlistItem can update saved', () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    const item = budget.addWishlistItem({ name: 'Chair', icon: '🪑', url: '', price: 300 });
    budget.updateWishlistItem(item.id, { saved: 75 });
    expect(budget.wishlist.find(w => w.id === item.id)?.saved).toBe(75);
  });

  it('shows "Add savings" button for priced items', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'Guitar', icon: '🎸', url: '', price: 500 });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('.wish-card__add-savings').exists()).toBe(true);
    w.unmount();
  });

  it('does not show "Add savings" button when item has no price', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'Idea', icon: '💡', url: '' });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('.wish-card__add-savings').exists()).toBe(false);
    w.unmount();
  });

  it('saved field appears in the edit modal', async () => {
    const w = mount(Wishlist, { attachTo: document.body });
    await nextTick();
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'Tablet', icon: '📱', url: '', price: 600, saved: 50 });
    await nextTick();
    // Open edit for first item
    const editBtns = w.findAll('button').filter(b => b.text().includes('Edit'));
    if (editBtns.length > 0) {
      await editBtns[0].trigger('click');
      await nextTick();
      expect(document.body.querySelector('#wish-saved')).not.toBeNull();
    }
    w.unmount();
  });

  it('header savings rate shown when income and savings rate set', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.incomeStreams = [];
    budget.addIncomeStream({ name: 'Salary', amount: 2000, biweekly: false });
    budget.allocation = { needs: 50, wants: 30, savings: 20 };
    budget.addWishlistItem({ name: 'Item', icon: '🎯', url: '', price: 500 });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('.wishlist-section__rate').exists()).toBe(true);
    expect(w.find('.wishlist-section__rate').text()).toContain('/mo');
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  Wishlist — RS-28 target month
//
//  These tests cover the integration between the new `targetMonth` field,
//  the per-card status chip + "By [Month]" badge, the required-rate hint,
//  and the new "Target ↑" sort option. The pure math is covered by
//  tests/utils/wishlistTarget.spec.ts.
// ─────────────────────────────────────────────────────────────────
describe('Wishlist — RS-28 target month', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
  });
  afterEach(() => { document.body.innerHTML = ''; });

  // Helper: compute a target month N months from now (YYYY-MM).
  function monthsFromNow(n: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 7);
  }

  // Helper: seed income + savings allocation so monthlySavingsRate is known.
  // 4000 monthly × 20% savings = 800/mo savings rate (default allocation).
  function seedSavingsRate() {
    const budget = useBudgetStore();
    budget.incomeStreams = [{ id: 'i1', name: 'Job', amount: 4000, biweekly: false }];
    // allocation.savings defaults to 20 in DEFAULT_STATE
  }

  // ── Form / modal ──────────────────────────────────────────────
  it('add/edit modal renders the target-month input', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    const w = mountWith(Wishlist);
    await nextTick();
    // Open Add modal
    const addBtn = w.findAll('button').find(b => b.text().includes('Add Item'));
    await addBtn!.trigger('click');
    await nextTick();
    expect(document.body.querySelector('[data-testid="wish-target-month-input"]')).not.toBeNull();
    w.unmount();
  });

  // ── Default badge preserved when no target ────────────────────
  it('shows the default "~N mo" badge when targetMonth is unset', async () => {
    seedSavingsRate();
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'Camera', icon: '📷', url: '', price: 1600 });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('[data-testid="wish-target-group"]').exists()).toBe(false);
    expect(w.find('.wish-card__months-badge').exists()).toBe(true);
    w.unmount();
  });

  // ── Target badge replaces months badge ────────────────────────
  it('replaces the months badge with "By [Month]" + status chip when targetMonth is set', async () => {
    seedSavingsRate();
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({
      name: 'Camera', icon: '📷', url: '', price: 1600,
      targetMonth: monthsFromNow(12),
    });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('[data-testid="wish-target-group"]').exists()).toBe(true);
    expect(w.find('.wish-card__months-badge').exists()).toBe(false);
    expect(w.find('.wish-card__target-badge').text()).toContain('By ');
    w.unmount();
  });

  // ── Status chip renders for each state ────────────────────────
  it('renders "On track" chip when current rate beats the target', async () => {
    seedSavingsRate();
    const budget = useBudgetStore();
    budget.wishlist = [];
    // 800/mo savings × 12 months = 9600 capacity; 1600 price → on track
    budget.addWishlistItem({
      name: 'Camera', icon: '📷', url: '', price: 1600,
      targetMonth: monthsFromNow(12),
    });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('[data-testid="wish-status-on-track"]').exists()).toBe(true);
    w.unmount();
  });

  it('renders "Behind" chip when target is too soon for the current rate', async () => {
    seedSavingsRate();
    const budget = useBudgetStore();
    budget.wishlist = [];
    // 800/mo savings × 1 month = 800; 1600 price → behind
    budget.addWishlistItem({
      name: 'Laptop', icon: '💻', url: '', price: 1600,
      targetMonth: monthsFromNow(1),
    });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('[data-testid="wish-status-behind"]').exists()).toBe(true);
    w.unmount();
  });

  it('renders "Complete" chip when saved >= price', async () => {
    seedSavingsRate();
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({
      name: 'Bookshelf', icon: '📚', url: '', price: 200, saved: 200,
      targetMonth: monthsFromNow(6),
    });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('[data-testid="wish-status-complete"]').exists()).toBe(true);
    w.unmount();
  });

  // ── Required-rate hint only when behind ───────────────────────
  it('shows "Need $X/mo" hint when behind', async () => {
    seedSavingsRate();
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({
      name: 'Laptop', icon: '💻', url: '', price: 1600,
      targetMonth: monthsFromNow(1),
    });
    const w = mountWith(Wishlist);
    await nextTick();
    const hint = w.find('[data-testid="wish-required-hint"]');
    expect(hint.exists()).toBe(true);
    expect(hint.text()).toContain('/mo');
    expect(hint.text()).toContain('hit your target');
    w.unmount();
  });

  it('does NOT show the required-rate hint when on track', async () => {
    seedSavingsRate();
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({
      name: 'Camera', icon: '📷', url: '', price: 1600,
      targetMonth: monthsFromNow(12),
    });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('[data-testid="wish-required-hint"]').exists()).toBe(false);
    w.unmount();
  });

  it('does NOT show the required-rate hint when complete', async () => {
    seedSavingsRate();
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({
      name: 'Bookshelf', icon: '📚', url: '', price: 200, saved: 200,
      targetMonth: monthsFromNow(6),
    });
    const w = mountWith(Wishlist);
    await nextTick();
    expect(w.find('[data-testid="wish-required-hint"]').exists()).toBe(false);
    w.unmount();
  });

  // ── Sort by Target ↑ ──────────────────────────────────────────
  it('sort dropdown includes the "Target ↑" option', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [
      { id: 'a', name: 'A', icon: '', url: '', price: 100 },
      { id: 'b', name: 'B', icon: '', url: '', price: 200 },
    ];
    const w = mountWith(Wishlist);
    await nextTick();
    const select = w.find('.wishlist-sort');
    expect(select.exists()).toBe(true);
    const options = (select.element as HTMLSelectElement).options;
    const values = Array.from(options).map(o => o.value);
    expect(values).toContain('target-asc');
    w.unmount();
  });

  it('sorting by Target ↑ puts soonest target first, undated last', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [
      { id: 'no-target', name: 'NoTarget', icon: '', url: '', price: 100 },
      { id: 'far',       name: 'Far',       icon: '', url: '', price: 100, targetMonth: '2028-01' },
      { id: 'near',      name: 'Near',      icon: '', url: '', price: 100, targetMonth: '2026-09' },
    ];
    const w = mountWith(Wishlist);
    await nextTick();
    const select = w.find('.wishlist-sort');
    await select.setValue('target-asc');
    await nextTick();
    const names = w.findAll('.wish-name').map(el => el.text());
    expect(names).toEqual(['Near', 'Far', 'NoTarget']);
    w.unmount();
  });

  // ── Store round-trip ──────────────────────────────────────────
  it('targetMonth is persisted on addWishlistItem and retrievable', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({
      name: 'Headphones', icon: '🎧', url: '', price: 300,
      targetMonth: '2027-03',
    });
    const added = budget.wishlist[budget.wishlist.length - 1];
    expect(added.targetMonth).toBe('2027-03');
  });

  it('targetMonth survives an update via updateWishlistItem', async () => {
    const budget = useBudgetStore();
    budget.wishlist = [];
    budget.addWishlistItem({ name: 'Camera', icon: '📷', url: '', price: 1600 });
    const id = budget.wishlist[budget.wishlist.length - 1].id;
    budget.updateWishlistItem(id, { targetMonth: '2026-12' });
    expect(budget.wishlist.find(w => w.id === id)?.targetMonth).toBe('2026-12');
  });
});

// ─────────────────────────────────────────────────────────────────
//  SpendingPage — RS-15 purchase type (want / need)
// ─────────────────────────────────────────────────────────────────

describe('SpendingPage — RS-15 purchase type', () => {
  beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts without throwing', async () => {
    const w = mountWith(SpendingPage);
    await nextTick();
    expect(w.exists()).toBe(true);
    w.unmount();
  });

  it('renders the page wrapper and table', async () => {
    const w = mountWith(SpendingPage);
    await nextTick();
    expect(w.find('.page-spending').exists()).toBe(true);
    expect(w.find('.purchases-table').exists()).toBe(true);
    w.unmount();
  });

  it('table has a "Type" column header', async () => {
    const w = mountWith(SpendingPage);
    await nextTick();
    const headers = w.findAll('.purchases-table thead th').map(th => th.text());
    expect(headers).toContain('Type');
    w.unmount();
  });

  it('shows "Want" badge for a wants purchase', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Coffee', amount: 5, category: 'other', cardId: null, budgetType: 'wants', date: new Date().toISOString().split('T')[0] as never });
    const w = mountWith(SpendingPage);
    await nextTick();
    const badges = w.findAll('.type-badge');
    expect(badges.some(b => b.text() === 'Want')).toBe(true);
    w.unmount();
  });

  it('shows "Need" badge for a needs purchase', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Rent', amount: 800, category: 'other', cardId: null, budgetType: 'needs', date: new Date().toISOString().split('T')[0] as never });
    const w = mountWith(SpendingPage);
    await nextTick();
    const badges = w.findAll('.type-badge');
    expect(badges.some(b => b.text() === 'Need')).toBe(true);
    w.unmount();
  });

  it('want badge has --wants CSS class, need badge has --needs CSS class', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    const today = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Coffee', amount: 5, category: 'other', cardId: null, budgetType: 'wants', date: today });
    budget.addPurchase({ name: 'Rent', amount: 800, category: 'other', cardId: null, budgetType: 'needs', date: today });
    const w = mountWith(SpendingPage);
    await nextTick();
    const wantBadge = w.find('.type-badge--wants');
    const needBadge = w.find('.type-badge--needs');
    expect(wantBadge.exists()).toBe(true);
    expect(needBadge.exists()).toBe(true);
    w.unmount();
  });

  it('type filter chips row renders with All / Wants / Needs', async () => {
    const w = mountWith(SpendingPage);
    await nextTick();
    const chips = w.findAll('.cat-chips--type .cat-chip');
    const labels = chips.map(c => c.text());
    expect(labels).toContain('All');
    expect(labels.some(l => l.includes('Wants'))).toBe(true);
    expect(labels.some(l => l.includes('Needs'))).toBe(true);
    w.unmount();
  });

  it('"Wants" filter shows only wants purchases', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    const today = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Coffee', amount: 5, category: 'other', cardId: null, budgetType: 'wants', date: today });
    budget.addPurchase({ name: 'Rent', amount: 800, category: 'other', cardId: null, budgetType: 'needs', date: today });
    const w = mountWith(SpendingPage);
    await nextTick();
    // Click the Wants filter chip
    const chips = w.findAll('.cat-chips--type .cat-chip');
    const wantsChip = chips.find(c => c.text().includes('Wants'));
    await wantsChip!.trigger('click');
    await nextTick();
    // Only the Want badge should remain
    const badges = w.findAll('.type-badge');
    expect(badges.every(b => b.text() === 'Want')).toBe(true);
    expect(badges).toHaveLength(1);
    w.unmount();
  });

  it('"Needs" filter shows only needs purchases', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    const today = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Coffee', amount: 5, category: 'other', cardId: null, budgetType: 'wants', date: today });
    budget.addPurchase({ name: 'Rent', amount: 800, category: 'other', cardId: null, budgetType: 'needs', date: today });
    const w = mountWith(SpendingPage);
    await nextTick();
    const chips = w.findAll('.cat-chips--type .cat-chip');
    const needsChip = chips.find(c => c.text().includes('Needs'));
    await needsChip!.trigger('click');
    await nextTick();
    const badges = w.findAll('.type-badge');
    expect(badges.every(b => b.text() === 'Need')).toBe(true);
    expect(badges).toHaveLength(1);
    w.unmount();
  });

  it('"All" filter resets after type filter applied', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    const today = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Coffee', amount: 5, category: 'other', cardId: null, budgetType: 'wants', date: today });
    budget.addPurchase({ name: 'Rent', amount: 800, category: 'other', cardId: null, budgetType: 'needs', date: today });
    const w = mountWith(SpendingPage);
    await nextTick();
    const chips = w.findAll('.cat-chips--type .cat-chip');
    // Click needs, then all
    await chips.find(c => c.text().includes('Needs'))!.trigger('click');
    await nextTick();
    await chips[0].trigger('click'); // All chip
    await nextTick();
    expect(w.findAll('.type-badge')).toHaveLength(2);
    w.unmount();
  });

  it('donut card has "Wants purchases only" subtitle', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Coffee', amount: 5, category: 'other', cardId: null, budgetType: 'wants', date: new Date().toISOString().split('T')[0] as never });
    const w = mountWith(SpendingPage);
    await nextTick();
    const hint = w.find('.spend-donut-hint');
    expect(hint.exists()).toBe(true);
    expect(hint.text()).toContain('Wants purchases only');
    w.unmount();
  });

  it('bar chart legend renders with wants and needs items', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Coffee', amount: 5, category: 'other', cardId: null, budgetType: 'wants', date: new Date().toISOString().split('T')[0] as never });
    const w = mountWith(SpendingPage);
    await nextTick();
    const legend = w.find('.spend-bars-legend');
    expect(legend.exists()).toBe(true);
    expect(legend.text()).toContain('Wants');
    expect(legend.text()).toContain('Needs');
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  DashboardPage — RS-15 quick-add modal updates
// ─────────────────────────────────────────────────────────────────

describe('DashboardPage — RS-15 quick-add modal', () => {
  beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('quick-add modal title is "Log a purchase" (not "wants purchase")', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    await w.find('.btn-primary').trigger('click');
    await nextTick();
    const modal = document.body.querySelector('.base-modal');
    expect(modal).not.toBeNull();
    expect(modal!.textContent).toContain('Log a purchase');
    expect(modal!.textContent).not.toContain('Log a wants purchase');
    w.unmount();
  });

  it('quick-add modal has Want and Need type buttons', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    await w.find('.btn-primary').trigger('click');
    await nextTick();
    // BaseModal is Teleported to document.body
    const typeBtns = document.body.querySelectorAll('.quick-add__type-btn');
    expect(typeBtns).toHaveLength(2);
    expect(typeBtns[0].textContent).toContain('Want');
    expect(typeBtns[1].textContent).toContain('Need');
    w.unmount();
  });

  it('Want type button is active by default', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    await w.find('.btn-primary').trigger('click');
    await nextTick();
    const wantBtn = document.body.querySelector('.quick-add__type-btn--wants');
    expect(wantBtn).not.toBeNull();
    w.unmount();
  });

  it('clicking Need type button activates it and updates preview label', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    await w.find('.btn-primary').trigger('click');
    await nextTick();
    const needBtn = document.body.querySelectorAll('.quick-add__type-btn')[1] as HTMLButtonElement;
    needBtn.click();
    await nextTick();
    expect(document.body.querySelector('.quick-add__type-btn--needs')).not.toBeNull();
    const label = document.body.querySelector('.quick-add__preview-label');
    expect(label!.textContent).toContain('NEEDS');
    w.unmount();
  });

  it('preview label switches to WANTS when Want button clicked', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    await w.find('.btn-primary').trigger('click');
    await nextTick();
    // Switch to needs then back to wants
    const typeBtns = document.body.querySelectorAll('.quick-add__type-btn');
    (typeBtns[1] as HTMLButtonElement).click();
    await nextTick();
    (typeBtns[0] as HTMLButtonElement).click();
    await nextTick();
    const label = document.body.querySelector('.quick-add__preview-label');
    expect(label!.textContent).toContain('WANTS');
    w.unmount();
  });

  it('submitting a needs purchase creates purchase with budgetType needs', async () => {
    const budget = useBudgetStore();
    const w = mountWith(DashboardPage);
    await nextTick();
    await w.find('.btn-primary').trigger('click');
    await nextTick();
    // Select Need type via DOM click (modal is teleported to body)
    const needBtn = document.body.querySelectorAll('.quick-add__type-btn')[1] as HTMLButtonElement;
    needBtn.click();
    await nextTick();
    // Fill in form (inputs are in the wrapper since it's attached to body)
    const nameInput = document.body.querySelector('.quick-add__input') as HTMLInputElement;
    const amtInput  = document.body.querySelector('.quick-add__input--amount') as HTMLInputElement;
    nameInput.value = 'Rent payment';
    nameInput.dispatchEvent(new Event('input'));
    amtInput.value  = '800';
    amtInput.dispatchEvent(new Event('input'));
    await nextTick();
    const addBtn = document.body.querySelector('.quick-add__footer .btn-primary') as HTMLButtonElement;
    addBtn.click();
    await nextTick();
    const added = budget.purchases.find(p => p.name === 'Rent payment');
    expect(added).toBeDefined();
    expect(added!.budgetType).toBe('needs');
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  SpendingPage — CRUD (filtered total + Add/Edit/Delete purchases)
// ─────────────────────────────────────────────────────────────────

describe('SpendingPage — CRUD', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let w: any;

  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    // Stub window.confirm — default: confirm = true
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    w?.unmount();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  // ── Filtered amount total ───────────────────────────────────────

  it('shows filtered amount total in purchases count area', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    const today = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Coffee', amount: 5,   category: 'other', cardId: null, budgetType: 'wants', date: today });
    budget.addPurchase({ name: 'Rent',   amount: 800, category: 'other', cardId: null, budgetType: 'needs', date: today });
    w = mountWith(SpendingPage);
    await nextTick();
    // Both purchases visible — total should be $805
    expect(w.find('.purchases-count__total').text()).toContain('$805.00');
  });

  it('filtered amount total updates when type filter is applied', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    const today = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Coffee', amount: 5,   category: 'other', cardId: null, budgetType: 'wants', date: today });
    budget.addPurchase({ name: 'Rent',   amount: 800, category: 'other', cardId: null, budgetType: 'needs', date: today });
    w = mountWith(SpendingPage);
    await nextTick();

    // Click "Wants" filter chip
    const chips = w.findAll('.cat-chips--type .cat-chip');
    await chips.find((c: ReturnType<typeof w.findAll>[number]) => c.text().includes('Wants'))!.trigger('click');
    await nextTick();

    // Only $5 coffee visible
    expect(w.find('.purchases-count__total').text()).toContain('$5.00');
  });

  it('filtered amount total updates when search filter is applied', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    const today = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Coffee', amount: 5,   category: 'other', cardId: null, budgetType: 'wants', date: today });
    budget.addPurchase({ name: 'Lunch',  amount: 12,  category: 'other', cardId: null, budgetType: 'wants', date: today });
    w = mountWith(SpendingPage);
    await nextTick();

    const searchInput = w.find('.search-input');
    await searchInput.setValue('coffee');
    await nextTick();

    expect(w.find('.purchases-count__total').text()).toContain('$5.00');
  });

  // ── Add purchase modal ──────────────────────────────────────────

  it('"+ Add" button opens the purchase modal', async () => {
    w = mountWith(SpendingPage);
    await nextTick();
    const addBtn = w.findAll('button').find((b: ReturnType<typeof w.findAll>[number]) => b.text().includes('Add'));
    await addBtn!.trigger('click');
    await nextTick();
    expect(document.body.querySelector('.base-modal')).not.toBeNull();
  });

  it('modal title is "Add Purchase" when adding a new purchase', async () => {
    w = mountWith(SpendingPage);
    await nextTick();
    const addBtn = w.findAll('button').find((b: ReturnType<typeof w.findAll>[number]) => b.text().includes('Add'));
    await addBtn!.trigger('click');
    await nextTick();
    const modal = document.body.querySelector('.base-modal');
    expect(modal!.textContent).toContain('Add Purchase');
  });

  it('modal has Want and Need type buttons', async () => {
    w = mountWith(SpendingPage);
    await nextTick();
    const addBtn = w.findAll('button').find((b: ReturnType<typeof w.findAll>[number]) => b.text().includes('Add'));
    await addBtn!.trigger('click');
    await nextTick();
    const typeBtns = document.body.querySelectorAll('.mf-type-btn');
    expect(typeBtns).toHaveLength(2);
    expect(typeBtns[0].textContent).toContain('Want');
    expect(typeBtns[1].textContent).toContain('Need');
  });

  it('save button is disabled when name is empty', async () => {
    w = mountWith(SpendingPage);
    await nextTick();
    const addBtn = w.findAll('button').find((b: ReturnType<typeof w.findAll>[number]) => b.text().includes('Add'));
    await addBtn!.trigger('click');
    await nextTick();
    const saveBtn = document.body.querySelector<HTMLButtonElement>('.base-modal [disabled]');
    expect(saveBtn).not.toBeNull();
  });

  it('save button is enabled when name and amount are valid', async () => {
    w = mountWith(SpendingPage);
    await nextTick();
    const addBtn = w.findAll('button').find((b: ReturnType<typeof w.findAll>[number]) => b.text().includes('Add'));
    await addBtn!.trigger('click');
    await nextTick();

    const nameInput = document.body.querySelector<HTMLInputElement>('#sp-name');
    const amtInput  = document.body.querySelector<HTMLInputElement>('#sp-amount');

    nameInput!.value = 'Groceries';
    nameInput!.dispatchEvent(new Event('input'));
    amtInput!.value  = '42';
    amtInput!.dispatchEvent(new Event('input'));
    await nextTick();

    // The disabled attr should be gone
    const disabledBtn = document.body.querySelector<HTMLButtonElement>('.base-modal [disabled]');
    expect(disabledBtn).toBeNull();
  });

  it('saving a new purchase adds it to the store', async () => {
    const budget = useBudgetStore();
    w = mountWith(SpendingPage);
    await nextTick();

    const addBtn = w.findAll('button').find((b: ReturnType<typeof w.findAll>[number]) => b.text().includes('Add'));
    await addBtn!.trigger('click');
    await nextTick();

    // Fill the form
    const nameInput = document.body.querySelector<HTMLInputElement>('#sp-name');
    const amtInput  = document.body.querySelector<HTMLInputElement>('#sp-amount');
    nameInput!.value = 'New coffee';
    nameInput!.dispatchEvent(new Event('input'));
    amtInput!.value  = '4.50';
    amtInput!.dispatchEvent(new Event('input'));
    await nextTick();

    // Click Save/Add button (the primary button in the modal footer)
    const allBtns = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.base-modal button'));
    const saveBtn = allBtns.find(b => b.textContent?.trim() === 'Add' && !b.disabled);
    saveBtn!.click();
    await nextTick();

    const found = budget.purchases.find(p => p.name === 'New coffee');
    expect(found).toBeDefined();
    expect(found!.amount).toBe(4.5);
  });

  it('adding a needs purchase sets budgetType to needs in the store', async () => {
    const budget = useBudgetStore();
    w = mountWith(SpendingPage);
    await nextTick();

    const addBtn = w.findAll('button').find((b: ReturnType<typeof w.findAll>[number]) => b.text().includes('Add'));
    await addBtn!.trigger('click');
    await nextTick();

    // Select "Need" type
    const needBtn = document.body.querySelectorAll<HTMLButtonElement>('.mf-type-btn')[1];
    needBtn.click();
    await nextTick();

    const nameInput = document.body.querySelector<HTMLInputElement>('#sp-name');
    const amtInput  = document.body.querySelector<HTMLInputElement>('#sp-amount');
    nameInput!.value = 'Electric bill';
    nameInput!.dispatchEvent(new Event('input'));
    amtInput!.value  = '75';
    amtInput!.dispatchEvent(new Event('input'));
    await nextTick();

    const allBtns = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.base-modal button'));
    const saveBtn = allBtns.find(b => b.textContent?.trim() === 'Add' && !b.disabled);
    saveBtn!.click();
    await nextTick();

    const found = budget.purchases.find(p => p.name === 'Electric bill');
    expect(found).toBeDefined();
    expect(found!.budgetType).toBe('needs');
  });

  // ── Edit purchase (row click → modal) ──────────────────────────

  it('clicking a purchase row opens modal with title "Edit Purchase"', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Coffee', amount: 5, category: 'other', cardId: null, budgetType: 'wants', date: new Date().toISOString().split('T')[0] as never });
    w = mountWith(SpendingPage);
    await nextTick();

    await w.find('.purchase-row--clickable').trigger('click');
    await nextTick();

    const modal = document.body.querySelector('.base-modal');
    expect(modal).not.toBeNull();
    expect(modal!.textContent).toContain('Edit Purchase');
  });

  it('clicking a row pre-fills the modal with the purchase values', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Sushi dinner', amount: 55, category: 'other', cardId: null, budgetType: 'wants', date: new Date().toISOString().split('T')[0] as never });
    w = mountWith(SpendingPage);
    await nextTick();

    await w.find('.purchase-row--clickable').trigger('click');
    await nextTick();

    const nameInput = document.body.querySelector<HTMLInputElement>('#sp-name');
    const amtInput  = document.body.querySelector<HTMLInputElement>('#sp-amount');
    expect(nameInput!.value).toBe('Sushi dinner');
    expect(Number(amtInput!.value)).toBe(55);
  });

  it('saving an edit via the row-click modal updates the purchase in the store', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Old name', amount: 10, category: 'other', cardId: null, budgetType: 'wants', date: new Date().toISOString().split('T')[0] as never });
    w = mountWith(SpendingPage);
    await nextTick();

    await w.find('.purchase-row--clickable').trigger('click');
    await nextTick();

    const nameInput = document.body.querySelector<HTMLInputElement>('#sp-name');
    nameInput!.value = 'New name';
    nameInput!.dispatchEvent(new Event('input'));
    await nextTick();

    const allBtns = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.base-modal button'));
    const updateBtn = allBtns.find(b => b.textContent?.trim() === 'Update' && !b.disabled);
    updateBtn!.click();
    await nextTick();

    expect(budget.purchases.find(p => p.name === 'New name')).toBeDefined();
    expect(budget.purchases.find(p => p.name === 'Old name')).toBeUndefined();
  });

  it('edit modal shows a Delete button', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Coffee', amount: 5, category: 'other', cardId: null, budgetType: 'wants', date: new Date().toISOString().split('T')[0] as never });
    w = mountWith(SpendingPage);
    await nextTick();

    await w.find('.purchase-row--clickable').trigger('click');
    await nextTick();

    const deleteBtn = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.base-modal button'))
      .find(b => b.textContent?.trim() === 'Delete');
    expect(deleteBtn).toBeDefined();
  });

  // ── Delete purchase (from modal) ────────────────────────────────

  it('Delete button in modal removes the purchase when confirm returns true', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Expense to delete', amount: 25, category: 'other', cardId: null, budgetType: 'wants', date: new Date().toISOString().split('T')[0] as never });
    w = mountWith(SpendingPage);
    await nextTick();

    expect(budget.purchases).toHaveLength(1);

    // Open edit modal by clicking the row
    await w.find('.purchase-row--clickable').trigger('click');
    await nextTick();

    // Click Delete inside the modal
    const deleteBtn = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.base-modal button'))
      .find(b => b.textContent?.trim() === 'Delete');
    deleteBtn!.click();
    await nextTick();

    expect(budget.purchases).toHaveLength(0);
    // Modal should close after delete
    expect(document.body.querySelector('.base-modal')).toBeNull();
  });

  it('Delete in modal does NOT remove purchase when confirm returns false', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Keep me', amount: 30, category: 'other', cardId: null, budgetType: 'wants', date: new Date().toISOString().split('T')[0] as never });
    w = mountWith(SpendingPage);
    await nextTick();

    await w.find('.purchase-row--clickable').trigger('click');
    await nextTick();

    const deleteBtn = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.base-modal button'))
      .find(b => b.textContent?.trim() === 'Delete');
    deleteBtn!.click();
    await nextTick();

    expect(budget.purchases).toHaveLength(1);
    // Modal stays open when delete is cancelled
    expect(document.body.querySelector('.base-modal')).not.toBeNull();
  });

  it('cancel button in modal closes it without saving', async () => {
    const budget = useBudgetStore();
    w = mountWith(SpendingPage);
    await nextTick();

    const addBtn = w.findAll('button').find((b: ReturnType<typeof w.findAll>[number]) => b.text().includes('Add'));
    await addBtn!.trigger('click');
    await nextTick();
    expect(document.body.querySelector('.base-modal')).not.toBeNull();

    const cancelBtn = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.base-modal button'))
      .find(b => b.textContent?.trim() === 'Cancel');
    cancelBtn!.click();
    await nextTick();

    expect(budget.purchases).toHaveLength(0);
    expect(document.body.querySelector('.base-modal')).toBeNull();
  });

  // ── Clickable rows ──────────────────────────────────────────────

  it('purchase rows have purchase-row--clickable class', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Groceries', amount: 60, category: 'other', cardId: null, budgetType: 'wants', date: new Date().toISOString().split('T')[0] as never });
    w = mountWith(SpendingPage);
    await nextTick();
    expect(w.find('.purchase-row--clickable').exists()).toBe(true);
  });

  it('clicking a purchase row opens the edit modal', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Lunch', amount: 15, category: 'other', cardId: null, budgetType: 'wants', date: new Date().toISOString().split('T')[0] as never });
    w = mountWith(SpendingPage);
    await nextTick();

    await w.find('.purchase-row--clickable').trigger('click');
    await nextTick();

    const modal = document.body.querySelector('.base-modal');
    expect(modal).not.toBeNull();
    expect(modal!.textContent).toContain('Edit Purchase');
  });

  it('clicking a row pre-fills the modal with the row\'s data', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Yoga class', amount: 22, category: 'other', cardId: null, budgetType: 'wants', date: new Date().toISOString().split('T')[0] as never });
    w = mountWith(SpendingPage);
    await nextTick();

    await w.find('.purchase-row--clickable').trigger('click');
    await nextTick();

    const nameInput = document.body.querySelector<HTMLInputElement>('#sp-name');
    expect(nameInput!.value).toBe('Yoga class');
  });
});

// ─────────────────────────────────────────────────────────────────
//  SpendingPage — donut uses wants-only data (BUG fix)
// ─────────────────────────────────────────────────────────────────

describe('SpendingPage — donut wants-only fix', () => {
  beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()); document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  it('donut total shows only wants spending, not the full total', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    const today = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name: 'Coffee',  amount: 10,  category: 'other', cardId: null, budgetType: 'wants', date: today });
    budget.addPurchase({ name: 'Rent',    amount: 900, category: 'other', cardId: null, budgetType: 'needs', date: today });
    const w = mountWith(SpendingPage);
    await nextTick();

    const total = w.find('.spend-donut-total');
    // Should show $10 (wants only), NOT $910 (all purchases)
    expect(total.text()).toContain('$10.00');
    expect(total.text()).not.toContain('$910.00');
    w.unmount();
  });

  it('usedPct (donut %) is based on wants spending vs wants budget', async () => {
    const budget = useBudgetStore();
    // Set income so wants budget = $300/period (monthly $2000 × 30% / 2)
    budget.addIncomeStream({ name: 'Salary', amount: 2000, biweekly: false });
    budget.allocation = { needs: 50, wants: 30, savings: 20 };
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    const today = new Date().toISOString().split('T')[0] as never;
    // Add $150 wants — should be 50% of the $300 wants budget
    budget.addPurchase({ name: 'Shopping', amount: 150, category: 'other', cardId: null, budgetType: 'wants', date: today });
    // Add $500 needs — should NOT inflate the % shown in the donut
    budget.addPurchase({ name: 'Rent',     amount: 500, category: 'other', cardId: null, budgetType: 'needs', date: today });

    const w = mountWith(SpendingPage);
    await nextTick();

    // The donut centre shows the wants-only % — should be ~50%, not ~217%
    const centre = w.find('.wants-donut-centre');
    expect(centre.exists()).toBe(true);
    const pctText = centre.text();
    // 50% ± rounding — definitely not > 100
    const pct = parseInt(pctText);
    expect(pct).toBeLessThanOrEqual(55);
    expect(pct).toBeGreaterThanOrEqual(45);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  SpendingPage — RS-16 donut type toggle (Wants / Needs)
// ─────────────────────────────────────────────────────────────────

describe('SpendingPage — RS-16 donut toggle', () => {
  beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()); document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  function addPurchase(
    budget: ReturnType<typeof useBudgetStore>,
    name: string, amount: number, budgetType: 'wants' | 'needs',
  ) {
    const today = new Date().toISOString().split('T')[0] as never;
    budget.addPurchase({ name, amount, category: 'other', cardId: null, budgetType, date: today });
  }

  it('donut card renders a Wants toggle button', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    addPurchase(budget, 'Coffee', 5, 'wants');
    const w = mountWith(SpendingPage);
    await nextTick();
    const btn = w.findAll('.dtt-btn').find((b: ReturnType<typeof w.findAll>[number]) => b.text().includes('Wants'));
    expect(btn).toBeDefined();
    w.unmount();
  });

  it('donut card renders a Needs toggle button', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    addPurchase(budget, 'Coffee', 5, 'wants');
    const w = mountWith(SpendingPage);
    await nextTick();
    const btn = w.findAll('.dtt-btn').find((b: ReturnType<typeof w.findAll>[number]) => b.text().includes('Needs'));
    expect(btn).toBeDefined();
    w.unmount();
  });

  it('Wants toggle button is active by default', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    addPurchase(budget, 'Coffee', 5, 'wants');
    const w = mountWith(SpendingPage);
    await nextTick();
    const wantsBtn = w.findAll('.dtt-btn')[0];
    expect(wantsBtn.classes()).toContain('dtt-btn--active');
    w.unmount();
  });

  it('clicking Needs activates the Needs button', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    addPurchase(budget, 'Coffee', 5, 'wants');
    const w = mountWith(SpendingPage);
    await nextTick();
    const needsBtn = w.findAll('.dtt-btn')[1];
    await needsBtn.trigger('click');
    await nextTick();
    expect(needsBtn.classes()).toContain('dtt-btn--active');
    w.unmount();
  });

  it('donut hint text changes to "Needs purchases only" when Needs is selected', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    addPurchase(budget, 'Rent', 800, 'needs');
    const w = mountWith(SpendingPage);
    await nextTick();

    await w.findAll('.dtt-btn')[1].trigger('click'); // Needs
    await nextTick();

    expect(w.find('.spend-donut-hint').text()).toContain('Needs purchases only');
    w.unmount();
  });

  it('donut hint reverts to "Wants purchases only" when Wants re-selected', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    addPurchase(budget, 'Coffee', 5, 'wants');
    const w = mountWith(SpendingPage);
    await nextTick();

    const [wantsBtn, needsBtn] = w.findAll('.dtt-btn');
    await needsBtn.trigger('click');
    await nextTick();
    await wantsBtn.trigger('click');
    await nextTick();

    expect(w.find('.spend-donut-hint').text()).toContain('Wants purchases only');
    w.unmount();
  });

  it('donut total reflects only wants spending when Wants selected', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    addPurchase(budget, 'Coffee', 10, 'wants');
    addPurchase(budget, 'Rent',  900, 'needs');
    const w = mountWith(SpendingPage);
    await nextTick();

    // Default is Wants — total should be $10 only
    expect(w.find('.spend-donut-total').text()).toContain('$10.00');
    w.unmount();
  });

  it('donut total reflects only needs spending when Needs selected', async () => {
    const budget = useBudgetStore();
    budget.payStart = new Date().toISOString().split('T')[0] as never;
    addPurchase(budget, 'Coffee', 10, 'wants');
    addPurchase(budget, 'Rent',  900, 'needs');
    const w = mountWith(SpendingPage);
    await nextTick();

    await w.findAll('.dtt-btn')[1].trigger('click'); // Needs
    await nextTick();

    expect(w.find('.spend-donut-total').text()).toContain('$900.00');
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  DashboardPage — RS-16 shared type toggle
// ─────────────────────────────────────────────────────────────────

describe('DashboardPage — RS-16 shared type toggle', () => {
  beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()); document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  it('hero card has Wants and Needs toggle buttons', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    const btns = w.findAll('.htt-btn');
    expect(btns).toHaveLength(2);
    expect(btns[0].text()).toContain('Wants');
    expect(btns[1].text()).toContain('Needs');
    w.unmount();
  });

  it('Wants toggle is active by default', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    expect(w.findAll('.htt-btn')[0].classes()).toContain('htt-btn--active');
    w.unmount();
  });

  it('clicking Needs activates the Needs button', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    const needsBtn = w.findAll('.htt-btn')[1];
    await needsBtn.trigger('click');
    await nextTick();
    expect(needsBtn.classes()).toContain('htt-btn--active');
    w.unmount();
  });

  it('hero subtitle changes to "Bi-weekly needs" when Needs is selected', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    await w.findAll('.htt-btn')[1].trigger('click');
    await nextTick();
    expect(w.find('.kpi-hero__subtitle').text()).toContain('needs');
    w.unmount();
  });

  it('hero subtitle shows "wants" when Wants is re-selected', async () => {
    const w = mountWith(DashboardPage);
    await nextTick();
    const [wantsBtn, needsBtn] = w.findAll('.htt-btn');
    await needsBtn.trigger('click');
    await nextTick();
    await wantsBtn.trigger('click');
    await nextTick();
    expect(w.find('.kpi-hero__subtitle').text()).toContain('wants');
    w.unmount();
  });

  it('hero remaining changes when switching to Needs with different spend', async () => {
    const budget = useBudgetStore();
    budget.addIncomeStream({ name: 'Salary', amount: 3000, biweekly: false });
    budget.allocation = { needs: 50, wants: 30, savings: 20 };
    const today = new Date().toISOString().split('T')[0] as never;
    // Add a wants purchase and a needs purchase
    budget.addPurchase({ name: 'Coffee',  amount: 50,  category: 'other', cardId: null, budgetType: 'wants', date: today });
    budget.addPurchase({ name: 'Rent',    amount: 200, category: 'other', cardId: null, budgetType: 'needs', date: today });

    const w = mountWith(DashboardPage);
    await nextTick();

    // Record wants remaining amount
    const wantsAmountText = w.find('.kpi-hero__amount').text();

    // Switch to needs
    await w.findAll('.htt-btn')[1].trigger('click');
    await nextTick();

    const needsAmountText = w.find('.kpi-hero__amount').text();
    // The two views should show different numbers
    expect(needsAmountText).not.toBe(wantsAmountText);
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────
//  BUG-024 — Dashboard + PurchasesThisPeriod period date filter
//
//  Before the fix `biWeeklySpent` and `filteredPurchases` summed ALL
//  purchases in `budget.purchases` with no date boundary. After a
//  device-B load scenario (BUG-023), stale purchases from the previous
//  period would be present and would inflate the hero-card totals.
//
//  The fix: both components date-filter `budget.purchases` to the
//  current bi-weekly window [periodStart, periodEnd] exactly as
//  SpendingPage does. Tests below pin "today" with fake timers so the
//  period window is predictable.
// ─────────────────────────────────────────────────────────────────

describe('BUG-024 — DashboardPage hero KPI only counts current-period purchases', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    // Pin today to 2026-05-25. payStart = 2026-05-19 → period: May 19 – Jun 1.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T12:00:00'));
  });
  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('hero card only sums wants purchases within the current period window', async () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-19');

    // In-period purchase (May 22 is inside May 19 – Jun 1)
    budget.addPurchase({ name: 'InPeriod',    amount: 50, category: 'Food', cardId: null, budgetType: 'wants', date: '2026-05-22' });
    // Out-of-period purchase (May 3 is in the PREVIOUS period)
    budget.addPurchase({ name: 'OutOfPeriod', amount: 999, category: 'Food', cardId: null, budgetType: 'wants', date: '2026-05-03' });

    const w = mountWith(DashboardPage);
    await nextTick();

    // The hero card amount text should NOT contain 999 (old period) or 1049 (sum of both)
    const heroText = w.find('.kpi-hero__amount').text();
    expect(heroText).not.toContain('999');
    expect(heroText).not.toContain('1,049');
    // It should reflect only the in-period purchase ($50)
    expect(heroText).toContain('50');
    w.unmount();
  });

  it('hero card shows $0 when the only purchases are from a previous period', async () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-19');

    // All purchases pre-date the current period window
    budget.addPurchase({ name: 'Old1', amount: 100, category: 'Food', cardId: null, budgetType: 'wants', date: '2026-05-01' });
    budget.addPurchase({ name: 'Old2', amount: 200, category: 'Food', cardId: null, budgetType: 'wants', date: '2026-05-10' });

    const w = mountWith(DashboardPage);
    await nextTick();

    const heroText = w.find('.kpi-hero__amount').text();
    // Old-period purchases must not appear in the hero spent/remaining display
    expect(heroText).not.toContain('100');
    expect(heroText).not.toContain('200');
    expect(heroText).not.toContain('300');
    w.unmount();
  });

  it('undated purchases are excluded from the period total (no date = not in window)', async () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-19');

    budget.addPurchase({ name: 'Undated', amount: 77, category: 'Other', cardId: null, budgetType: 'wants' });
    budget.addPurchase({ name: 'Dated',   amount: 10, category: 'Other', cardId: null, budgetType: 'wants', date: '2026-05-22' });

    const w = mountWith(DashboardPage);
    await nextTick();

    const heroText = w.find('.kpi-hero__amount').text();
    // Undated purchase ($77) must not inflate the total
    expect(heroText).not.toContain('77');
    expect(heroText).not.toContain('87');
    w.unmount();
  });
});

describe('BUG-024 — PurchasesThisPeriod only counts current-period purchases', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T12:00:00'));
  });
  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('donut total reflects only current-period purchases', async () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-19');

    // In-period
    budget.addPurchase({ name: 'InPeriod', amount: 40, category: 'Food', cardId: null, budgetType: 'wants', date: '2026-05-22' });
    // Out-of-period (stale — simulates BUG-023 scenario on Device B)
    budget.addPurchase({ name: 'Stale',    amount: 500, category: 'Food', cardId: null, budgetType: 'wants', date: '2026-05-01' });

    const w = mountWith(PurchasesThisPeriod);
    await nextTick();

    const captionText = w.find('.ptp__donut-caption').text();
    // Caption shows "totalSpent / budget". Should reflect $40 not $540.
    expect(captionText).toContain('$40');
    expect(captionText).not.toContain('540');
    w.unmount();
  });

  it('shows empty state when only out-of-period purchases exist', async () => {
    const budget = useBudgetStore();
    budget.setPayStart('2026-05-19');

    // Only old purchases — none in the current window
    budget.addPurchase({ name: 'OldPurchase', amount: 200, category: 'Food', cardId: null, budgetType: 'wants', date: '2026-05-01' });

    const w = mountWith(PurchasesThisPeriod);
    await nextTick();

    expect(w.find('.ptp__empty').exists()).toBe(true);
    w.unmount();
  });
});
