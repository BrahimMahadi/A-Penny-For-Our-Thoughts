<!--
  Module:   components/sections/Loans.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Updated:  May 2026 (RS-13) — inline "Make Payment" row per loan card.
            Clicking "Pay" pre-fills the scheduled payment amount and
            lets you quickly reduce `remaining` without opening the modal.
  Summary:  Loan list showing remaining balance, payoff progress bar,
            and optional recurring payment info. CRUD via BaseModal.
            Inline payment via per-card quick-pay form.
-->

<script setup lang="ts">
import { ref, reactive, nextTick } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useFormValidation, rules } from '@/composables/useFormValidation';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import ProgressBar from '@/components/ui/ProgressBar.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { fmt } from '@/utils/format';
import { getNextRenewal } from '@/utils/calculations';
import type { Frequency } from '@/types/budget';

const budget = useBudgetStore();
const toast  = useToast();

// ─── Modal state ─────────────────────────────────────────────────
const showModal = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  name:          '',
  remaining:     0,
  original:      0,
  paymentAmount: 0,
  frequency:     'monthly' as Frequency,
  date:          '',
  budgetType:    'needs' as string,
  cardId:        null as string | null,
});

function resetForm(): void {
  form.name          = '';
  form.remaining     = 0;
  form.original      = 0;
  form.paymentAmount = 0;
  form.frequency     = 'monthly';
  form.date          = '';
  form.budgetType    = 'needs';
  form.cardId        = null;
  editingId.value    = null;
}

function openAdd(): void {
  resetForm();
  showModal.value = true;
}

function openEdit(id: string): void {
  const loan = budget.loans.find(l => l.id === id);
  if (!loan) return;
  form.name          = loan.name;
  form.remaining     = loan.remaining;
  form.original      = loan.original;
  form.paymentAmount = loan.paymentAmount;
  form.frequency     = loan.frequency || 'monthly';
  form.date          = loan.date || '';
  form.budgetType    = loan.budgetType || 'needs';
  form.cardId        = loan.cardId;
  editingId.value    = id;
  showModal.value    = true;
}

const validation = useFormValidation(() => ({
  name:      rules.required(form.name, 'Name'),
  remaining: rules.nonNegativeNumber(form.remaining, 'Remaining balance'),
  original:  rules.nonNegativeNumber(form.original, 'Original balance'),
}));

function save(): void {
  validation.touchAll();
  if (!validation.isValid.value) return;
  const payload = {
    name:          form.name.trim(),
    remaining:     form.remaining,
    original:      form.original,
    paymentAmount: form.paymentAmount,
    frequency:     form.frequency,
    date:          form.date,
    budgetType:    form.budgetType as 'needs' | 'wants',
    cardId:        form.cardId,
  };
  if (editingId.value) {
    budget.updateLoan(editingId.value, payload);
    toast.show('Loan updated.', 'success');
  } else {
    budget.addLoan(payload);
    toast.show('Loan added.', 'success');
  }
  showModal.value = false;
  resetForm();
}

function remove(id: string): void {
  const loan = budget.loans.find(l => l.id === id);
  if (!loan) return;
  if (!window.confirm(`Delete "${loan.name}"?`)) return;
  budget.deleteLoan(id);
  toast.show('Loan removed.', 'success');
}

// ─── Inline payment ───────────────────────────────────────────────
const inlineLoanId    = ref<string | null>(null);
const inlinePayAmount = ref(0);
const inlinePayInputEl = ref<HTMLInputElement | null>(null);

function openInlinePay(loanId: string): void {
  const loan = budget.loans.find(l => l.id === loanId);
  if (!loan) return;
  // Close any existing inline, then open this one
  inlineLoanId.value    = loanId;
  inlinePayAmount.value = loan.paymentAmount > 0 ? loan.paymentAmount : 0;
  nextTick(() => { const el = inlinePayInputEl.value; if (el && typeof el.focus === 'function') el.focus(); });
}

function closeInlinePay(): void {
  inlineLoanId.value    = null;
  inlinePayAmount.value = 0;
}

function confirmInlinePay(loanId: string): void {
  const amt = +inlinePayAmount.value;
  if (!(amt > 0)) return;
  const loan = budget.loans.find(l => l.id === loanId);
  if (!loan) return;
  const newRemaining = Math.max(0, loan.remaining - amt);
  budget.updateLoan(loanId, { remaining: newRemaining });
  toast.show(`Payment of ${fmt(amt)} applied to "${loan.name}".`, 'success');
  closeInlinePay();
}

// ─── Display helpers ──────────────────────────────────────────────
function progressPct(remaining: number, original: number): number {
  return original > 0 ? (remaining / original) * 100 : 0;
}

function progressStatus(pct: number): 'on-track' | 'caution' | 'over' {
  if (pct > 70) return 'over';
  if (pct > 40) return 'caution';
  return 'on-track';
}

function nextPayStr(loan: { date?: string; frequency?: string; paymentAmount: number }): string {
  if (!loan.paymentAmount || !loan.date) return '';
  const next = getNextRenewal(loan);
  if (!next) return '—';
  return new Date(next + 'T00:00:00').toLocaleDateString('en-CA', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });
}

function linkedCardLabel(cardId: string | null): string | null {
  if (!cardId) return null;
  return budget.expenseCards.find(c => c.id === cardId)?.label ?? null;
}

const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'biyearly', 'yearly'] as const;
const FREQ_DISPLAY: Record<string, string> = {
  weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly',
  quarterly: 'Quarterly', biyearly: 'Every 6 months', yearly: 'Yearly',
};
</script>

<template>
  <div class="loans-section">
    <!-- Header -->
    <div class="loans-section__header">
      <span class="loans-section__count">
        {{ budget.loans.length }} loan{{ budget.loans.length !== 1 ? 's' : '' }} tracked
      </span>
      <BaseButton
        size="sm"
        @click="openAdd"
      >
        + Add Loan
      </BaseButton>
    </div>

    <!-- Empty state (nudge variant for first-run) -->
    <EmptyState
      v-if="budget.loans.length === 0"
      icon="🏦"
      title="No loans tracked"
      :hint="budget.hasOnboarded
        ? 'Add a loan to monitor your remaining balance and payoff progress.'
        : 'Tracking loans here keeps your net worth accurate and helps you see how debt fits into your 50/30/20 Needs budget.'"
    >
      <BaseButton
        v-if="!budget.hasOnboarded"
        size="sm"
        @click="openAdd"
      >
        Add your first loan
      </BaseButton>
    </EmptyState>

    <!-- Loan list -->
    <div
      v-else
      class="loans-grid"
    >
      <div
        v-for="loan in budget.loans"
        :key="loan.id"
        class="loan-card"
      >
        <div class="loan-card__header">
          <span class="loan-card__name">{{ loan.name }}</span>
          <div class="loan-card__actions">
            <BaseButton
              size="xs"
              @click="openInlinePay(loan.id)"
            >
              Pay
            </BaseButton>
            <BaseButton
              size="xs"
              variant="secondary"
              @click="openEdit(loan.id)"
            >
              Edit
            </BaseButton>
            <BaseButton
              size="xs"
              variant="danger"
              @click="remove(loan.id)"
            >
              Delete
            </BaseButton>
          </div>
        </div>

        <!-- Linked expense card tag -->
        <div
          v-if="linkedCardLabel(loan.cardId)"
          class="loan-card__tag"
        >
          💳 {{ linkedCardLabel(loan.cardId) }}
        </div>

        <!-- Amounts -->
        <div class="loan-card__amounts">
          <span>{{ fmt(loan.remaining) }} remaining</span>
          <span class="loan-card__pct">{{ progressPct(loan.remaining, loan.original).toFixed(1) }}%</span>
        </div>

        <!-- Progress bar -->
        <ProgressBar
          :percent="progressPct(loan.remaining, loan.original)"
          :status="progressStatus(progressPct(loan.remaining, loan.original))"
          :aria-label="`${loan.name} payoff progress`"
          size="sm"
        />

        <div class="loan-card__original">
          of {{ fmt(loan.original) }} original
        </div>

        <!-- Payment info -->
        <div
          v-if="loan.paymentAmount > 0 && loan.date"
          class="loan-card__payment"
        >
          <div class="loan-card__payment-detail">
            <span class="loan-card__payment-label">Payment</span>
            <span class="loan-card__payment-amount">{{ fmt(loan.paymentAmount) }}</span>
            <span class="loan-card__payment-freq">{{ loan.frequency }}</span>
          </div>
          <span class="loan-card__payment-next">Next: {{ nextPayStr(loan) }}</span>
        </div>

        <!-- Inline payment form -->
        <div
          v-if="inlineLoanId === loan.id"
          class="loan-inline-pay"
        >
          <span class="loan-inline-pay__label">Payment amount</span>
          <div class="loan-inline-pay__row">
            <div class="loan-inline-pay__input-wrap">
              <span class="loan-inline-pay__dollar">$</span>
              <input
                ref="inlinePayInputEl"
                v-model.number="inlinePayAmount"
                class="loan-inline-pay__input"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                @keydown.enter="confirmInlinePay(loan.id)"
                @keydown.esc="closeInlinePay()"
              >
            </div>
            <button
              class="loan-inline-pay__confirm"
              type="button"
              :disabled="!(inlinePayAmount > 0)"
              @click="confirmInlinePay(loan.id)"
            >
              ✓ Confirm
            </button>
            <button
              class="loan-inline-pay__cancel"
              type="button"
              @click="closeInlinePay()"
            >
              ✕
            </button>
          </div>
          <p
            v-if="loan.remaining > 0"
            class="loan-inline-pay__preview"
          >
            Remaining after: {{ fmt(Math.max(0, loan.remaining - (inlinePayAmount || 0))) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Add / Edit modal -->
    <BaseModal
      v-model:open="showModal"
      :title="editingId ? 'Edit Loan' : 'Add Loan'"
    >
      <div class="modal-form">
        <div class="form-group">
          <label
            class="form-label"
            for="loan-name"
          >Name</label>
          <input
            id="loan-name"
            v-model="form.name"
            class="form-input"
            :class="{ 'form-input--error': validation.errors.value.name }"
            type="text"
            placeholder="e.g. Car Loan"
            @blur="validation.touch('name')"
          >
          <p
            v-if="validation.errors.value.name"
            class="field-error"
          >
            {{ validation.errors.value.name }}
          </p>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="loan-remaining"
            >Remaining ($)</label>
            <input
              id="loan-remaining"
              v-model.number="form.remaining"
              class="form-input"
              :class="{ 'form-input--error': validation.errors.value.remaining }"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              @blur="validation.touch('remaining')"
            >
            <p
              v-if="validation.errors.value.remaining"
              class="field-error"
            >
              {{ validation.errors.value.remaining }}
            </p>
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="loan-original"
            >Original ($)</label>
            <input
              id="loan-original"
              v-model.number="form.original"
              class="form-input"
              :class="{ 'form-input--error': validation.errors.value.original }"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              @blur="validation.touch('original')"
            >
            <p
              v-if="validation.errors.value.original"
              class="field-error"
            >
              {{ validation.errors.value.original }}
            </p>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Payment Schedule (optional)</label>
        </div>

        <div class="form-row-3">
          <div class="form-group">
            <label
              class="form-label"
              for="loan-payment"
            >Amount ($)</label>
            <input
              id="loan-payment"
              v-model.number="form.paymentAmount"
              class="form-input"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
            >
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="loan-freq"
            >Frequency</label>
            <select
              id="loan-freq"
              v-model="form.frequency"
              class="form-input"
            >
              <option
                v-for="f in FREQUENCIES"
                :key="f"
                :value="f"
              >
                {{ FREQ_DISPLAY[f] ?? f }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="loan-date"
            >Next date</label>
            <input
              id="loan-date"
              v-model="form.date"
              class="form-input"
              type="date"
            >
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="loan-budget-type"
            >Budget type</label>
            <select
              id="loan-budget-type"
              v-model="form.budgetType"
              class="form-input"
            >
              <option value="needs">
                Needs
              </option>
              <option value="wants">
                Wants
              </option>
            </select>
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="loan-card"
            >Payment card</label>
            <select
              id="loan-card"
              v-model="form.cardId"
              class="form-input"
            >
              <option :value="null">
                None
              </option>
              <option
                v-for="card in budget.expenseCards"
                :key="card.id"
                :value="card.id"
              >
                {{ card.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton
          variant="secondary"
          @click="showModal = false; resetForm(); validation.reset()"
        >
          Cancel
        </BaseButton>
        <BaseButton
          @click="save"
        >
          {{ editingId ? 'Update' : 'Add' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.loans-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.loans-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.loans-section__count {
  font-size: 0.8rem;
  color: var(--muted);
}

.loans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
}

.loan-card {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.loan-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.loan-card__name {
  font-weight: 700;
  font-size: 0.95rem;
}

.loan-card__actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.loan-card__tag {
  font-size: 0.75rem;
  color: var(--muted);
}

.loan-card__amounts {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  font-weight: 600;
}

.loan-card__pct {
  color: var(--muted);
  font-size: 0.8rem;
}

.loan-card__original {
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: -2px;
}

.loan-card__payment {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  font-size: 0.8rem;
  padding-top: 0.4rem;
  border-top: 1px solid var(--border);
  margin-top: 0.25rem;
}

.loan-card__payment-detail {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.loan-card__payment-label {
  color: var(--muted);
}

.loan-card__payment-amount {
  font-weight: 700;
  color: var(--accent2-text);
}

.loan-card__payment-freq {
  color: var(--muted);
}

.loan-card__payment-next {
  color: var(--muted);
  font-size: 0.75rem;
}

/* Modal form */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.form-input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.45rem 0.65rem;
  font-size: 0.9rem;
  color: var(--text);
  width: 100%;
  transition: border-color 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-row-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 480px) {
  .form-row-2,
  .form-row-3 {
    grid-template-columns: 1fr;
  }
}

.form-input--error {
  border-color: var(--danger);
}

.form-input--error:focus {
  border-color: var(--danger);
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
}

.field-error {
  font-size: 0.78rem;
  color: var(--danger);
  margin: 0.15rem 0 0;
}

/* ─── Inline payment form ──────────────────────────────────────── */
.loan-inline-pay {
  margin-top: 0.1rem;
  padding: 0.6rem 0.75rem;
  background: color-mix(in srgb, var(--accent) 6%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.loan-inline-pay__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent);
}

.loan-inline-pay__row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.loan-inline-pay__input-wrap {
  position: relative;
  flex: 1;
  min-width: 100px;
}

.loan-inline-pay__dollar {
  position: absolute;
  left: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
  color: var(--muted);
  pointer-events: none;
}

.loan-inline-pay__input {
  width: 100%;
  padding: 0.4rem 0.6rem 0.4rem 1.4rem;
  font-size: 0.9rem;
  font-family: var(--font-mono);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.loan-inline-pay__input:focus {
  border-color: var(--accent);
}

.loan-inline-pay__confirm {
  padding: 0.4rem 0.75rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.loan-inline-pay__confirm:hover:not(:disabled) {
  opacity: 0.88;
}

.loan-inline-pay__confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.loan-inline-pay__cancel {
  padding: 0.4rem 0.6rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.loan-inline-pay__cancel:hover {
  background: var(--surface2);
}

.loan-inline-pay__preview {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted);
  font-family: var(--font-mono);
}
</style>
