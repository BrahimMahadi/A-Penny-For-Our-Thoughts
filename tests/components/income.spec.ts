/**
 * Module:   tests/components/income.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  June 2026 (v2.37.0 — one-time income)
 * Summary:  Component tests for OneTimeIncomeModal and OneTimeIncomeSection.
 *           Verifies: form state, proportional allocation seeding, allocation
 *           constraint, save/cancel, list rendering, edit/delete flow.
 *
 * Note on Teleport: OneTimeIncomeModal wraps content inside <BaseModal>
 * which uses <Teleport to="body">. All modal DOM queries must target
 * document.body directly — wrapper.find() only searches the component's
 * own non-teleported DOM tree.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

// ─── Mock chart dependencies (avoid canvas in jsdom) ─────────────
vi.mock('vue-chartjs', () => ({
  Bar:      { template: '<canvas />' },
  Line:     { template: '<canvas />' },
  Doughnut: { template: '<canvas />' },
}));
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  registerables: [],
}));

import OneTimeIncomeModal   from '@/components/modals/OneTimeIncomeModal.vue';
import OneTimeIncomeSection from '@/components/sections/OneTimeIncomeSection.vue';
import { useBudgetStore } from '@/stores/budget';
import type { OneTimeIncome } from '@/types/budget';

// ─── Constants ────────────────────────────────────────────────────
const PAY_START      = '2026-06-02';
const TODAY          = '2026-06-06';
const IN_PERIOD_DATE = '2026-06-05';

// ─── Mount helpers ────────────────────────────────────────────────
// Note: no pinia plugin — rely on the active pinia from setActivePinia in beforeEach.

function mountModal(props: Record<string, unknown> = {}) {
  return mount(OneTimeIncomeModal, {
    props: { open: true, today: TODAY, ...props },
    attachTo: document.body,
  });
}

function mountSection() {
  return mount(OneTimeIncomeSection, {
    attachTo: document.body,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Is the BaseModal currently visible in the body? */
function modalOpen() { return !!document.body.querySelector('.base-modal'); }

// ─── OneTimeIncomeModal ───────────────────────────────────────────

describe('OneTimeIncomeModal — add mode', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-06T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('renders without throwing and opens BaseModal', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.allocation = { needs: 50, wants: 30, savings: 20 };
    const w = mountModal();
    await nextTick();
    expect(modalOpen()).toBe(true);
    w.unmount();
  });

  it('seeds allocation from the store 50/30/20 by default', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.allocation = { needs: 50, wants: 30, savings: 20 };
    const w = mountModal();
    await nextTick();

    const inputs = document.body.querySelectorAll<HTMLInputElement>('.oti-form__alloc-input');
    expect(inputs).toHaveLength(3);
    expect(inputs[0].value).toBe('50'); // needs
    expect(inputs[1].value).toBe('30'); // wants
    expect(inputs[2].value).toBe('20'); // savings
    w.unmount();
  });

  it('shows "Add income" as the submit button label', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.allocation = { needs: 50, wants: 30, savings: 20 };
    const w = mountModal();
    await nextTick();

    const submitBtn = document.body.querySelector<HTMLButtonElement>('.btn-primary');
    expect(submitBtn?.textContent?.trim()).toContain('Add income');
    w.unmount();
  });

  it('Add income button is disabled when form is invalid (empty label)', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.allocation = { needs: 50, wants: 30, savings: 20 };
    const w = mountModal();
    await nextTick();

    // Amount filled, label empty → should be disabled
    const amtInput = document.body.querySelector<HTMLInputElement>('.oti-form__input--amount');
    if (amtInput) {
      amtInput.value = '100';
      amtInput.dispatchEvent(new Event('input'));
    }
    await nextTick();

    const submitBtn = document.body.querySelector<HTMLButtonElement>('.btn-primary');
    expect(submitBtn?.disabled).toBe(true);
    w.unmount();
  });

  it('calls budget.addOneTimeIncome on valid submit', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.allocation = { needs: 50, wants: 30, savings: 20 };
    const spy = vi.spyOn(budget, 'addOneTimeIncome');

    const w = mountModal();
    await nextTick();

    // Fill label
    const labelInput = document.body.querySelector<HTMLInputElement>('.oti-form__input:not(.oti-form__input--amount)');
    if (labelInput) {
      labelInput.value = 'Tax refund';
      labelInput.dispatchEvent(new Event('input'));
    }
    // Fill amount
    const amtInput = document.body.querySelector<HTMLInputElement>('.oti-form__input--amount');
    if (amtInput) {
      amtInput.value = '200';
      amtInput.dispatchEvent(new Event('input'));
    }
    await nextTick();

    const submitBtn = document.body.querySelector<HTMLButtonElement>('.btn-primary');
    submitBtn?.click();
    await nextTick();

    expect(spy).toHaveBeenCalledOnce();
    const callArg = spy.mock.calls[0][0];
    expect(callArg.amount).toBe(200);
    expect(callArg.allocation.needs).toBe(50);
    expect(callArg.allocation.wants).toBe(30);
    expect(callArg.allocation.savings).toBe(20);
    w.unmount();
  });

  it('emits update:open=false on Cancel click', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.allocation = { needs: 50, wants: 30, savings: 20 };
    const w = mountModal();
    await nextTick();

    const cancelBtn = document.body.querySelector<HTMLButtonElement>('.btn-secondary');
    cancelBtn?.click();
    await nextTick();

    expect(w.emitted('update:open')).toBeTruthy();
    expect(w.emitted('update:open')![0]).toEqual([false]);
    w.unmount();
  });

  it('renders all 6 income type buttons', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.allocation = { needs: 50, wants: 30, savings: 20 };
    const w = mountModal();
    await nextTick();

    const typeBtns = document.body.querySelectorAll('.oti-form__type-btn');
    expect(typeBtns).toHaveLength(6);
    w.unmount();
  });

  it('date input is constrained to the current period (min=periodStart, max=today)', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.allocation = { needs: 50, wants: 30, savings: 20 };
    const w = mountModal();
    await nextTick();

    const dateInput = document.body.querySelector<HTMLInputElement>('input[type="date"]');
    expect(dateInput?.getAttribute('min')).toBe(PAY_START);
    expect(dateInput?.getAttribute('max')).toBe(TODAY);
    w.unmount();
  });
});

describe('OneTimeIncomeModal — edit mode', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-06T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  const existingIncome: OneTimeIncome = {
    id: 'test-id',
    label: 'Existing bonus',
    amount: 500,
    date: IN_PERIOD_DATE,
    type: 'bonus',
    allocation: { needs: 60, wants: 25, savings: 15 },
    periodStart: PAY_START,
    createdAt: new Date().toISOString(),
  };

  it('populates amount field from the existing income', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.allocation = { needs: 50, wants: 30, savings: 20 };

    const w = mountModal({ income: existingIncome });
    await nextTick();

    const amtInput = document.body.querySelector<HTMLInputElement>('.oti-form__input--amount');
    expect(amtInput?.value).toBe('500');
    w.unmount();
  });

  it('shows the existing allocation (not the store default)', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.allocation = { needs: 50, wants: 30, savings: 20 };

    const w = mountModal({ income: existingIncome });
    await nextTick();

    const inputs = document.body.querySelectorAll<HTMLInputElement>('.oti-form__alloc-input');
    expect(inputs[0].value).toBe('60'); // needs (from entry, not store default 50)
    expect(inputs[1].value).toBe('25'); // wants
    expect(inputs[2].value).toBe('15'); // savings
    w.unmount();
  });

  it('shows "Save changes" as the submit button label', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.allocation = { needs: 50, wants: 30, savings: 20 };

    const w = mountModal({ income: existingIncome });
    await nextTick();

    const submitBtn = document.body.querySelector<HTMLButtonElement>('.btn-primary');
    expect(submitBtn?.textContent?.trim()).toContain('Save changes');
    w.unmount();
  });

  it('calls updateOneTimeIncome on save', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.allocation = { needs: 50, wants: 30, savings: 20 };
    const spy = vi.spyOn(budget, 'updateOneTimeIncome');

    const w = mountModal({ income: existingIncome });
    await nextTick();

    const submitBtn = document.body.querySelector<HTMLButtonElement>('.btn-primary');
    submitBtn?.click();
    await nextTick();

    expect(spy).toHaveBeenCalledWith('test-id', expect.objectContaining({
      amount: 500,
    }));
    w.unmount();
  });
});

// ─── OneTimeIncomeSection ─────────────────────────────────────────

describe('OneTimeIncomeSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-06T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('shows empty state when no incomes exist', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;

    const w = mountSection();
    await nextTick();

    expect(w.find('.oti-section__empty').exists()).toBe(true);
    expect(w.find('.oti-section__empty-text').text()).toContain('No windfall income');
    w.unmount();
  });

  it('renders income entries for the current period', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.oneTimeIncomes.push({
      id: 'a',
      label: 'Birthday gift',
      amount: 150,
      date: IN_PERIOD_DATE,
      type: 'gift',
      allocation: { needs: 0, wants: 100, savings: 0 },
      periodStart: PAY_START,
      createdAt: new Date().toISOString(),
    });

    const w = mountSection();
    await nextTick();

    const items = w.findAll('.oti-section__item');
    expect(items).toHaveLength(1);
    expect(w.find('.oti-section__item-label').text()).toBe('Birthday gift');
    expect(w.find('.oti-section__item-amount').text()).toContain('150');
    w.unmount();
  });

  it('does NOT render entries from previous periods', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.oneTimeIncomes.push({
      id: 'old',
      label: 'Old freelance',
      amount: 500,
      date: '2026-05-20',
      type: 'freelance',
      allocation: { needs: 50, wants: 30, savings: 20 },
      periodStart: '2026-05-19',   // previous period
      createdAt: new Date().toISOString(),
    });

    const w = mountSection();
    await nextTick();

    expect(w.find('.oti-section__empty').exists()).toBe(true);
    expect(w.findAll('.oti-section__item')).toHaveLength(0);
    w.unmount();
  });

  it('shows total windfall when entries exist', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.oneTimeIncomes.push(
      { id: 'a', label: 'Gift',  amount: 100, date: IN_PERIOD_DATE, type: 'gift',
        allocation: { needs: 0, wants: 100, savings: 0 }, periodStart: PAY_START,
        createdAt: new Date().toISOString() },
      { id: 'b', label: 'Bonus', amount: 200, date: IN_PERIOD_DATE, type: 'bonus',
        allocation: { needs: 50, wants: 30, savings: 20 }, periodStart: PAY_START,
        createdAt: new Date().toISOString() },
    );

    const w = mountSection();
    await nextTick();

    expect(w.find('.oti-section__total').exists()).toBe(true);
    expect(w.find('.oti-section__total-value').text()).toContain('300');
    w.unmount();
  });

  it('clicking delete shows confirmation inline', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.oneTimeIncomes.push({
      id: 'a', label: 'Sale', amount: 75, date: IN_PERIOD_DATE, type: 'sale',
      allocation: { needs: 0, wants: 0, savings: 100 }, periodStart: PAY_START,
      createdAt: new Date().toISOString(),
    });

    const w = mountSection();
    await nextTick();

    expect(w.find('.oti-section__confirm').exists()).toBe(false);
    await w.find('.oti-section__action-btn--danger').trigger('click');
    await nextTick();
    expect(w.find('.oti-section__confirm').exists()).toBe(true);
    w.unmount();
  });

  it('confirming delete removes the entry from the store', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.oneTimeIncomes.push({
      id: 'a', label: 'Sale', amount: 75, date: IN_PERIOD_DATE, type: 'sale',
      allocation: { needs: 0, wants: 0, savings: 100 }, periodStart: PAY_START,
      createdAt: new Date().toISOString(),
    });

    const w = mountSection();
    await nextTick();

    await w.find('.oti-section__action-btn--danger').trigger('click');
    await nextTick();
    await w.find('.btn-danger').trigger('click');
    await nextTick();

    expect(budget.oneTimeIncomes).toHaveLength(0);
    w.unmount();
  });

  it('cancelling delete keeps the entry intact and hides confirm panel', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.oneTimeIncomes.push({
      id: 'a', label: 'Refund', amount: 30, date: IN_PERIOD_DATE, type: 'refund',
      allocation: { needs: 100, wants: 0, savings: 0 }, periodStart: PAY_START,
      createdAt: new Date().toISOString(),
    });

    const w = mountSection();
    await nextTick();

    await w.find('.oti-section__action-btn--danger').trigger('click');
    await nextTick();
    // Click cancel inside the confirm panel
    await w.find('.oti-section__confirm .btn-secondary').trigger('click');
    await nextTick();

    expect(budget.oneTimeIncomes).toHaveLength(1);
    expect(w.find('.oti-section__confirm').exists()).toBe(false);
    w.unmount();
  });

  it('renders the "Log income" add button', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    const w = mountSection();
    await nextTick();

    expect(w.find('.oti-section__add-btn').exists()).toBe(true);
    expect(w.find('.oti-section__add-btn').text()).toContain('Log income');
    w.unmount();
  });

  it('shows allocation chips for each non-zero bucket', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.oneTimeIncomes.push({
      id: 'a', label: 'Gift', amount: 300, date: IN_PERIOD_DATE, type: 'gift',
      allocation: { needs: 50, wants: 30, savings: 20 },
      periodStart: PAY_START, createdAt: new Date().toISOString(),
    });

    const w = mountSection();
    await nextTick();

    const chips = w.findAll('.oti-section__chip');
    expect(chips).toHaveLength(3); // all three buckets are non-zero
    w.unmount();
  });

  it('only shows chips for non-zero buckets', async () => {
    const budget = useBudgetStore();
    budget.payStart = PAY_START;
    budget.oneTimeIncomes.push({
      id: 'a', label: 'Cash gift', amount: 200, date: IN_PERIOD_DATE, type: 'gift',
      allocation: { needs: 0, wants: 100, savings: 0 }, // only wants
      periodStart: PAY_START, createdAt: new Date().toISOString(),
    });

    const w = mountSection();
    await nextTick();

    const chips = w.findAll('.oti-section__chip');
    expect(chips).toHaveLength(1);
    expect(chips[0].classes()).toContain('oti-section__chip--wants');
    w.unmount();
  });
});
