<!--
  Module:   components/sections/Savings.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Summary:  Savings accounts list with balance, monthly allocation, and
            a progress bar showing how much of the Savings budget is
            allocated. CRUD via BaseModal. Mirrors renderSavings().
-->

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useFormValidation, rules } from '@/composables/useFormValidation';
import { useAnalytics } from '@/composables/useAnalytics';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import ProgressBar from '@/components/ui/ProgressBar.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { fmt } from '@/utils/format';
import { toMonthKey } from '@/utils/date';

const budget  = useBudgetStore();
const toast   = useToast();
const { totalMonthlyIncome } = useAnalytics();

// ─── Current month key ────────────────────────────────────────────
const today    = new Date();
const monthKey = toMonthKey(today);

// ─── Helper: allocation for account in current month ─────────────
function getAllocForMonth(acct: { defaultAllocated: number; monthlyAllocations: Record<string, number> }): number {
  return acct.monthlyAllocations[monthKey] ?? acct.defaultAllocated;
}

// ─── Aggregate stats ──────────────────────────────────────────────
const savingsBudget = computed(() =>
  totalMonthlyIncome.value * (budget.allocation.savings / 100),
);

const totalAllocated = computed(() =>
  budget.savingsAccounts.reduce((s, a) => s + getAllocForMonth(a), 0),
);

const unallocated = computed(() => savingsBudget.value - totalAllocated.value);

const allocPct = computed(() =>
  savingsBudget.value > 0
    ? Math.min(100, (totalAllocated.value / savingsBudget.value) * 100)
    : 0,
);

const allocStatus = computed<'on-track' | 'caution' | 'over'>(() => {
  if (allocPct.value > 110) return 'over';
  if (allocPct.value > 100) return 'caution';
  return 'on-track';
});

// ─── Modal state — Add / Edit account ────────────────────────────
const showModal = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  name:             '',
  balance:          0,
  defaultAllocated: 0,
});

function resetForm(): void {
  form.name             = '';
  form.balance          = 0;
  form.defaultAllocated = 0;
  editingId.value       = null;
}

function openAdd(): void {
  resetForm();
  showModal.value = true;
}

function openEdit(id: string): void {
  const acct = budget.savingsAccounts.find(a => a.id === id);
  if (!acct) return;
  form.name             = acct.name;
  form.balance          = acct.balance || 0;
  form.defaultAllocated = acct.defaultAllocated;
  editingId.value       = id;
  showModal.value       = true;
}

const validation = useFormValidation(() => ({
  name:    rules.required(form.name, 'Account name'),
  balance: rules.nonNegativeNumber(form.balance, 'Balance'),
}));

function save(): void {
  validation.touchAll();
  if (!validation.isValid.value) return;
  if (editingId.value) {
    budget.updateSavingsAccount(editingId.value, {
      name:             form.name.trim(),
      balance:          form.balance,
      defaultAllocated: form.defaultAllocated,
    });
    toast.show('Account updated.', 'success');
  } else {
    budget.addSavingsAccount({
      name:               form.name.trim(),
      balance:            form.balance,
      defaultAllocated:   form.defaultAllocated,
      monthlyAllocations: {},
    });
    toast.show('Account added.', 'success');
  }
  showModal.value = false;
  resetForm();
  validation.reset();
}

function remove(id: string): void {
  const acct = budget.savingsAccounts.find(a => a.id === id);
  if (!acct) return;
  if (!window.confirm(`Delete "${acct.name}"? Any savings goals linked to it will also be removed.`)) return;
  budget.deleteSavingsAccount(id);
  toast.show('Account removed.', 'success');
}

// ─── Monthly allocation override modal ────────────────────────────
const showAllocModal  = ref(false);
const allocTargetId   = ref<string | null>(null);
const allocTargetName = ref('');
const allocAmount     = ref(0);

function openAllocate(id: string): void {
  const acct = budget.savingsAccounts.find(a => a.id === id);
  if (!acct) return;
  allocTargetId.value   = id;
  allocTargetName.value = acct.name;
  allocAmount.value     = getAllocForMonth(acct);
  showAllocModal.value  = true;
}

function saveAlloc(): void {
  if (!allocTargetId.value) return;
  budget.setSavingsAccountAllocation(allocTargetId.value, monthKey, allocAmount.value);
  toast.show('Allocation updated.', 'success');
  showAllocModal.value = false;
}
</script>

<template>
  <div class="savings-section">
    <!-- Stats header -->
    <div class="savings-stats">
      <div class="savings-stat">
        <div class="savings-stat__label">
          Budget
        </div>
        <div class="savings-stat__value">
          {{ fmt(savingsBudget) }}/mo
        </div>
      </div>
      <div class="savings-stat">
        <div class="savings-stat__label">
          Allocated
        </div>
        <div class="savings-stat__value">
          {{ fmt(totalAllocated) }}/mo
        </div>
      </div>
      <div
        class="savings-stat"
        :class="{ 'savings-stat--danger': unallocated < 0 }"
      >
        <div class="savings-stat__label">
          Unallocated
        </div>
        <div class="savings-stat__value">
          {{ fmt(unallocated) }}
        </div>
      </div>
    </div>

    <!-- Allocation progress bar -->
    <div class="savings-alloc-bar-row">
      <span class="savings-alloc-pct">{{ allocPct.toFixed(0) }}% allocated</span>
      <ProgressBar
        :percent="allocPct"
        :status="allocStatus"
        size="sm"
        aria-label="Savings allocation progress"
      />
    </div>

    <!-- Header with add button -->
    <div class="savings-section__header">
      <span class="savings-section__count">
        {{ budget.savingsAccounts.length }} account{{ budget.savingsAccounts.length !== 1 ? 's' : '' }}
      </span>
      <BaseButton
        size="sm"
        @click="openAdd"
      >
        + Add Account
      </BaseButton>
    </div>

    <!-- Empty state (nudge variant for first-run) -->
    <EmptyState
      v-if="budget.savingsAccounts.length === 0"
      icon="🏦"
      title="No savings accounts"
      :hint="budget.hasOnboarded
        ? 'Add an account below to start allocating your savings budget.'
        : 'Savings accounts let you split your 20% savings bucket across goals like an emergency fund, investments, or a vacation fund.'"
    >
      <BaseButton
        v-if="!budget.hasOnboarded"
        size="sm"
        @click="openAdd"
      >
        Add your first savings account
      </BaseButton>
    </EmptyState>

    <!-- Accounts list -->
    <ul
      v-else
      class="savings-list"
    >
      <li
        v-for="acct in budget.savingsAccounts"
        :key="acct.id"
        class="savings-acct-item"
      >
        <span class="savings-acct-dot" />
        <span class="savings-acct-name">{{ acct.name }}</span>
        <div class="savings-acct-details">
          <span class="savings-acct-balance">Balance: {{ fmt(acct.balance || 0) }}</span>
          <span class="savings-acct-monthly">Monthly: {{ fmt(getAllocForMonth(acct)) }}</span>
        </div>
        <div class="savings-acct-actions">
          <BaseButton
            size="xs"
            variant="secondary"
            @click="openAllocate(acct.id)"
          >
            Allocate
          </BaseButton>
          <BaseButton
            size="xs"
            variant="secondary"
            @click="openEdit(acct.id)"
          >
            Edit
          </BaseButton>
          <BaseButton
            size="xs"
            variant="danger"
            @click="remove(acct.id)"
          >
            Delete
          </BaseButton>
        </div>
      </li>
    </ul>

    <!-- Add / Edit account modal -->
    <BaseModal
      v-model:open="showModal"
      :title="editingId ? 'Edit Account' : 'Add Savings Account'"
      size="sm"
    >
      <div class="modal-form">
        <div class="form-group">
          <label
            class="form-label"
            for="sa-name"
          >Account name</label>
          <input
            id="sa-name"
            v-model="form.name"
            class="form-input"
            :class="{ 'form-input--error': validation.errors.value.name }"
            type="text"
            placeholder="e.g. Emergency Fund"
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
              for="sa-balance"
            >Current balance ($)</label>
            <input
              id="sa-balance"
              v-model.number="form.balance"
              class="form-input"
              :class="{ 'form-input--error': validation.errors.value.balance }"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              @blur="validation.touch('balance')"
            >
            <p
              v-if="validation.errors.value.balance"
              class="field-error"
            >
              {{ validation.errors.value.balance }}
            </p>
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="sa-alloc"
            >Default monthly allocation ($)</label>
            <input
              id="sa-alloc"
              v-model.number="form.defaultAllocated"
              class="form-input"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
            >
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

    <!-- Monthly allocation override modal -->
    <BaseModal
      v-model:open="showAllocModal"
      :title="`Allocate — ${allocTargetName}`"
      size="sm"
    >
      <div class="modal-form">
        <p class="modal-note">
          Override the monthly allocation for <strong>{{ monthKey }}</strong>.
        </p>
        <div class="form-group">
          <label
            class="form-label"
            for="sa-alloc-override"
          >Monthly amount ($)</label>
          <input
            id="sa-alloc-override"
            v-model.number="allocAmount"
            class="form-input"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
          >
        </div>
      </div>
      <template #footer>
        <BaseButton
          variant="secondary"
          @click="showAllocModal = false"
        >
          Cancel
        </BaseButton>
        <BaseButton @click="saveAlloc">
          Save
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.savings-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.savings-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.savings-stat {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  text-align: center;
}

.savings-stat--danger .savings-stat__value {
  color: var(--danger);
}

.savings-stat__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.savings-stat__value {
  font-size: 1rem;
  font-weight: 700;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

.savings-alloc-bar-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.savings-alloc-pct {
  font-size: 0.75rem;
  color: var(--muted);
  text-align: right;
}

.savings-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.savings-section__count {
  font-size: 0.8rem;
  color: var(--muted);
}

.savings-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.savings-acct-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  flex-wrap: wrap;
}

.savings-acct-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent2);
  flex-shrink: 0;
}

.savings-acct-name {
  font-weight: 600;
  font-size: 0.9rem;
  flex: 1;
  min-width: 80px;
}

.savings-acct-details {
  display: flex;
  gap: 0.75rem;
  font-size: 0.78rem;
  color: var(--muted);
  flex-wrap: wrap;
}

.savings-acct-balance,
.savings-acct-monthly {
  font-variant-numeric: tabular-nums;
}

.savings-acct-actions {
  display: flex;
  gap: 0.35rem;
  margin-left: auto;
}

/* Modal */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal-note {
  font-size: 0.8rem;
  color: var(--muted);
  margin: 0;
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

@media (max-width: 400px) {
  .form-row-2 { grid-template-columns: 1fr; }
  .savings-stats { grid-template-columns: 1fr 1fr; }
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
