<!--
  Module:   components/sections/IncomeStreams.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Summary:  CRUD list of income streams. Each stream shows its name,
            bi-weekly chip (when applicable), and monthly amount.
            Add / Edit use a shared BaseModal form.
-->

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useFormValidation, rules } from '@/composables/useFormValidation';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { fmt } from '@/utils/format';

interface Props {
  readonly?: boolean
}
const props = withDefaults(defineProps<Props>(), { readonly: false });

const budget = useBudgetStore();
const toast  = useToast();

// ─── Modal state ─────────────────────────────────────────────────
const showModal  = ref(false);
const editingId  = ref<string | null>(null);

const form = reactive({
  name:      '',
  amount:    0,
  biweekly:  false,
});

function resetForm(): void {
  form.name     = '';
  form.amount   = 0;
  form.biweekly = false;
  editingId.value = null;
}

function openAdd(): void {
  resetForm();
  showModal.value = true;
}

function openEdit(id: string): void {
  const stream = budget.incomeStreams.find(s => s.id === id);
  if (!stream) return;
  form.name      = stream.name;
  form.amount    = stream.amount;
  form.biweekly  = stream.biweekly;
  editingId.value = id;
  showModal.value = true;
}

function closeModal(): void {
  showModal.value = false;
  resetForm();
  validation.reset();
}

// ─── Validation ───────────────────────────────────────────────────
const validation = useFormValidation(() => ({
  name:   rules.required(form.name, 'Name'),
  amount: rules.positiveNumber(form.amount, 'Amount'),
}));

// ─── CRUD ─────────────────────────────────────────────────────────
function save(): void {
  validation.touchAll();
  if (!validation.isValid.value) return;

  if (editingId.value) {
    budget.updateIncomeStream(editingId.value, {
      name:     form.name.trim(),
      amount:   form.amount,
      biweekly: form.biweekly,
    });
    toast.show('Income stream updated.', 'success');
  } else {
    budget.addIncomeStream({
      name:     form.name.trim(),
      amount:   form.amount,
      biweekly: form.biweekly,
    });
    toast.show('Income stream added.', 'success');
  }
  closeModal();
}

function remove(id: string): void {
  const stream = budget.incomeStreams.find(s => s.id === id);
  if (!stream) return;
  if (!window.confirm(`Delete "${stream.name}"?`)) return;
  budget.deleteIncomeStream(id);
  toast.show('Income stream removed.', 'success');
}

// ─── Display helpers ──────────────────────────────────────────────
function monthlyAmt(amount: number, biweekly: boolean): number {
  return biweekly ? amount * 2 : amount;
}
</script>

<template>
  <div class="income-streams">
    <!-- Header with total + add button -->
    <div class="income-streams__header">
      <span class="income-streams__total">
        Total: <strong>{{ fmt(budget.totalMonthlyIncome) }}</strong>/mo
      </span>
      <BaseButton
        v-if="!props.readonly"
        size="sm"
        @click="openAdd"
      >
        + Add Stream
      </BaseButton>
    </div>

    <!-- Empty state (nudge variant for first-run) -->
    <EmptyState
      v-if="budget.incomeStreams.length === 0"
      icon="💵"
      title="No income streams yet"
      :hint="budget.hasOnboarded
        ? 'Add a paycheque or other income source to get started.'
        : 'Your income is the foundation of your budget. Adding it here unlocks the 50/30/20 breakdown, savings goals, and spending envelope.'"
    >
      <BaseButton
        v-if="!budget.hasOnboarded && !props.readonly"
        size="sm"
        @click="openAdd"
      >
        Add your first income stream
      </BaseButton>
    </EmptyState>

    <!-- Stream list -->
    <ul
      v-else
      class="income-streams__list"
    >
      <li
        v-for="stream in budget.incomeStreams"
        :key="stream.id"
        class="income-stream-item"
      >
        <div class="income-stream-item__left">
          <span class="income-stream-item__name">{{ stream.name }}</span>
          <span
            v-if="stream.biweekly"
            class="income-stream-item__chip"
          >bi-wk</span>
        </div>
        <div class="income-stream-item__right">
          <span class="income-stream-item__amount">
            {{ fmt(monthlyAmt(stream.amount, stream.biweekly)) }}/mo
          </span>
          <span
            v-if="stream.biweekly"
            class="income-stream-item__sub-amount"
          >
            {{ fmt(stream.amount) }} per cheque
          </span>
          <div
            v-if="!props.readonly"
            class="income-stream-item__actions"
          >
            <BaseButton
              size="xs"
              variant="secondary"
              @click="openEdit(stream.id)"
            >
              Edit
            </BaseButton>
            <BaseButton
              size="xs"
              variant="danger"
              @click="remove(stream.id)"
            >
              Delete
            </BaseButton>
          </div>
        </div>
      </li>
    </ul>

    <!-- Add / Edit modal -->
    <BaseModal
      v-model:open="showModal"
      :title="editingId ? 'Edit Income Stream' : 'Add Income Stream'"
      size="sm"
      @close="closeModal"
    >
      <div class="modal-form">
        <div class="form-group">
          <label
            class="form-label"
            for="is-name"
          >Name</label>
          <input
            id="is-name"
            v-model="form.name"
            class="form-input"
            :class="{ 'form-input--error': validation.errors.value.name }"
            type="text"
            placeholder="e.g. Paycheque"
            @blur="validation.touch('name')"
          >
          <p
            v-if="validation.errors.value.name"
            class="field-error"
          >
            {{ validation.errors.value.name }}
          </p>
        </div>

        <div class="form-group">
          <label
            class="form-label"
            for="is-amount"
          >Amount ($)</label>
          <input
            id="is-amount"
            v-model.number="form.amount"
            class="form-input"
            :class="{ 'form-input--error': validation.errors.value.amount }"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            @blur="validation.touch('amount')"
          >
          <p
            v-if="validation.errors.value.amount"
            class="field-error"
          >
            {{ validation.errors.value.amount }}
          </p>
        </div>

        <label class="toggle-row">
          <span class="toggle-info">
            <span class="toggle-label">Bi-weekly pay</span>
            <span class="toggle-sublabel">Amount shown is per paycheque (×2 monthly)</span>
          </span>
          <input
            v-model="form.biweekly"
            type="checkbox"
            class="toggle-checkbox"
          >
        </label>
      </div>

      <template #footer>
        <BaseButton
          variant="secondary"
          @click="closeModal"
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
.income-streams {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.income-streams__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.income-streams__total {
  font-size: 0.85rem;
  color: var(--muted);
}

.income-streams__total strong {
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.income-streams__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.income-stream-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  background: var(--surface2);
  border-radius: 8px;
  border: 1px solid var(--border);
  gap: 0.5rem;
}

.income-stream-item__left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
}

.income-stream-item__name {
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.income-stream-item__chip {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--accent);
  white-space: nowrap;
}

.income-stream-item__right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.income-stream-item__amount {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 0.95rem;
}

.income-stream-item__sub-amount {
  font-size: 0.75rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.income-stream-item__actions {
  display: flex;
  gap: 0.35rem;
}

/* Modal form */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.form-input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  font-size: 0.9rem;
  color: var(--text);
  width: 100%;
  transition: border-color 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  cursor: pointer;
  padding: 0.5rem 0;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.toggle-label {
  font-size: 0.875rem;
  font-weight: 600;
}

.toggle-sublabel {
  font-size: 0.75rem;
  color: var(--muted);
}

.toggle-checkbox {
  width: 1.2rem;
  height: 1.2rem;
  accent-color: var(--accent);
  flex-shrink: 0;
  margin-top: 0.1rem;
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
</style>
