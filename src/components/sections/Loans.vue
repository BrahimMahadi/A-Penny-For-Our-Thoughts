<!--
  Module:   components/sections/Loans.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Summary:  Loan list showing remaining balance, payoff progress bar,
            and optional recurring payment info. CRUD via BaseModal.
-->

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
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

const formError = computed<string>(() => {
  if (!form.name.trim())  return 'Name is required.';
  if (form.remaining < 0) return 'Remaining must be ≥ 0.';
  if (form.original < 0)  return 'Original must be ≥ 0.';
  return '';
});

function save(): void {
  if (formError.value) return;
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

const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] as const;
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

    <!-- Empty state -->
    <EmptyState
      v-if="budget.loans.length === 0"
      icon="🏦"
      title="No loans tracked"
      hint="Add a loan to monitor your remaining balance and payoff progress."
    />

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
            type="text"
            placeholder="e.g. Car Loan"
          >
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
              type="number"
              min="0"
              step="0.01"
            >
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
              type="number"
              min="0"
              step="0.01"
            >
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
                {{ f }}
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

        <p
          v-if="formError"
          class="form-error"
        >
          {{ formError }}
        </p>
      </div>

      <template #footer>
        <BaseButton
          variant="secondary"
          @click="showModal = false; resetForm()"
        >
          Cancel
        </BaseButton>
        <BaseButton
          :disabled="!!formError"
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
  color: var(--accent2);
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

.form-error {
  font-size: 0.8rem;
  color: var(--danger);
  margin: 0;
}
</style>
