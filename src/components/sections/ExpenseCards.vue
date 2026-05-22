<!--
  Module:   components/sections/ExpenseCards.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Summary:  Expense-card list with items, linked subscription/loan rows,
            per-card totals, and a grand total. Mirrors renderExpenseCards().
-->

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useAnalytics } from '@/composables/useAnalytics';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { fmt } from '@/utils/format';
import { monthlyAmount } from '@/utils/date';
import { getRenewalDatesBetween, getNextRenewal } from '@/utils/calculations';

const budget = useBudgetStore();
const toast  = useToast();
const { grandTotalExpenses, totalMonthlyIncome } = useAnalytics();

const today      = new Date();
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const endOfMonth   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
startOfMonth.setHours(0, 0, 0, 0);
endOfMonth.setHours(23, 59, 59, 999);

// ─── Per-card computed data ───────────────────────────────────────
interface LinkedSubRow {
  id: string;
  name: string;
  frequency: string;
  amount: number;
  isDue: boolean;
  nextStr: string;
}

interface LinkedLoanRow {
  id: string;
  name: string;
  frequency: string;
  paymentAmount: number;
  isDue: boolean;
  nextStr: string;
}

function getLinkedSubs(cardId: string): LinkedSubRow[] {
  return budget.subscriptions
    .filter(s => s.cardId === cardId)
    .map(s => {
      const renewals = getRenewalDatesBetween(s, startOfMonth, endOfMonth);
      const isDue = renewals.length > 0;
      const nextDate = isDue ? null : getNextRenewal(s);
      const nextStr  = nextDate
        ? new Date(nextDate + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
        : '—';
      return { id: s.id, name: s.name, frequency: s.frequency || 'monthly', amount: +s.amount || 0, isDue, nextStr };
    });
}

function getLinkedLoans(cardId: string): LinkedLoanRow[] {
  return budget.loans
    .filter(l => l.cardId === cardId && l.paymentAmount > 0 && l.date)
    .map(l => {
      const renewals = getRenewalDatesBetween(l, startOfMonth, endOfMonth);
      const isDue = renewals.length > 0;
      const nextDate = isDue ? null : getNextRenewal(l);
      const nextStr  = nextDate
        ? new Date(nextDate + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
        : '—';
      return { id: l.id, name: l.name, frequency: l.frequency || 'monthly', paymentAmount: l.paymentAmount, isDue, nextStr };
    });
}

function cardTotal(cardId: string): number {
  const card = budget.expenseCards.find(c => c.id === cardId);
  if (!card) return 0;
  const itemsTotal = card.items.reduce((s, i) => s + monthlyAmount(i), 0);
  const subTotal   = getLinkedSubs(cardId).filter(s => s.isDue).reduce((s, r) => s + r.amount, 0);
  const loanTotal  = getLinkedLoans(cardId).filter(l => l.isDue).reduce((s, r) => s + r.paymentAmount, 0);
  return itemsTotal + subTotal + loanTotal;
}

// ─── Needs budget summary ─────────────────────────────────────────
const needsBudget = computed(() => totalMonthlyIncome.value * (budget.allocation.needs / 100));

const needsRemaining = computed(() => needsBudget.value - grandTotalExpenses.value);

// ─── Card CRUD modal ──────────────────────────────────────────────
const showCardModal = ref(false);
const editingCardId = ref<string | null>(null);
const cardForm = reactive({ label: '' });

function openAddCard(): void {
  cardForm.label = '';
  editingCardId.value = null;
  showCardModal.value = true;
}

function openEditCard(id: string): void {
  const card = budget.expenseCards.find(c => c.id === id);
  if (!card) return;
  cardForm.label = card.label;
  editingCardId.value = id;
  showCardModal.value = true;
}

const cardFormError = computed(() => (!cardForm.label.trim() ? 'Name is required.' : ''));

function saveCard(): void {
  if (cardFormError.value) return;
  if (editingCardId.value) {
    budget.renameExpenseCard(editingCardId.value, cardForm.label.trim());
    toast.show('Card renamed.', 'success');
  } else {
    budget.addExpenseCard(cardForm.label.trim());
    toast.show('Expense card added.', 'success');
  }
  showCardModal.value = false;
}

function removeCard(id: string): void {
  const card = budget.expenseCards.find(c => c.id === id);
  if (!card) return;
  if (!window.confirm(`Delete "${card.label}" and all its expenses?`)) return;
  budget.deleteExpenseCard(id);
  toast.show('Expense card removed.', 'success');
}

// ─── Item CRUD modal ──────────────────────────────────────────────
const showItemModal    = ref(false);
const editingItemCardId = ref<string | null>(null);
const editingItemId     = ref<string | null>(null);

const itemForm = reactive({
  name:      '',
  amount:    0,
  biweekly:  false,
});

function resetItemForm(): void {
  itemForm.name      = '';
  itemForm.amount    = 0;
  itemForm.biweekly  = false;
  editingItemCardId.value = null;
  editingItemId.value     = null;
}

function openAddItem(cardId: string): void {
  resetItemForm();
  editingItemCardId.value = cardId;
  showItemModal.value = true;
}

function openEditItem(cardId: string, itemId: string): void {
  const card = budget.expenseCards.find(c => c.id === cardId);
  const item = card?.items.find(i => i.id === itemId);
  if (!item) return;
  itemForm.name      = item.name;
  itemForm.amount    = item.amount;
  itemForm.biweekly  = item.biweekly;
  editingItemCardId.value = cardId;
  editingItemId.value     = itemId;
  showItemModal.value = true;
}

const itemFormError = computed<string>(() => {
  if (!itemForm.name.trim()) return 'Name is required.';
  if (itemForm.amount <= 0)  return 'Amount must be greater than zero.';
  return '';
});

function saveItem(): void {
  if (itemFormError.value || !editingItemCardId.value) return;
  if (editingItemId.value) {
    budget.updateExpenseItem(editingItemCardId.value, editingItemId.value, {
      name:     itemForm.name.trim(),
      amount:   itemForm.amount,
      biweekly: itemForm.biweekly,
    });
    toast.show('Expense updated.', 'success');
  } else {
    budget.addExpenseItem(editingItemCardId.value, {
      name:     itemForm.name.trim(),
      amount:   itemForm.amount,
      biweekly: itemForm.biweekly,
    });
    toast.show('Expense added.', 'success');
  }
  showItemModal.value = false;
  resetItemForm();
}

function removeItem(cardId: string, itemId: string): void {
  const card = budget.expenseCards.find(c => c.id === cardId);
  const item = card?.items.find(i => i.id === itemId);
  if (!item) return;
  if (!window.confirm(`Delete "${item.name}"?`)) return;
  budget.deleteExpenseItem(cardId, itemId);
  toast.show('Expense removed.', 'success');
}
</script>

<template>
  <div class="expense-cards">
    <!-- Grand total summary -->
    <div class="expense-cards__summary">
      <div class="expense-cards__summary-stat">
        <div class="expense-cards__summary-label">
          Grand Total
        </div>
        <div class="expense-cards__summary-value">
          {{ fmt(grandTotalExpenses) }}/mo
        </div>
      </div>
      <div
        class="expense-cards__summary-stat"
        :class="{ 'stat-danger': needsRemaining < 0 }"
      >
        <div class="expense-cards__summary-label">
          Needs Remaining
        </div>
        <div class="expense-cards__summary-value">
          {{ fmt(needsRemaining) }}
        </div>
      </div>
      <div class="expense-cards__summary-stat">
        <div class="expense-cards__summary-label">
          Needs Budget
        </div>
        <div class="expense-cards__summary-value">
          {{ fmt(needsBudget) }}/mo
        </div>
      </div>
      <BaseButton
        size="sm"
        class="expense-cards__add"
        @click="openAddCard"
      >
        + Add Card
      </BaseButton>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-if="budget.expenseCards.length === 0"
      icon="💳"
      title="No payment cards added"
      hint="Create expense cards to organize your recurring bills by account."
    />

    <!-- Expense card grid -->
    <div
      v-else
      class="expense-cards__grid"
    >
      <div
        v-for="card in budget.expenseCards"
        :key="card.id"
        class="expense-card"
      >
        <!-- Card header -->
        <div class="expense-card__header">
          <span class="expense-card__label">{{ card.label }}</span>
          <div class="expense-card__actions">
            <BaseButton
              size="xs"
              variant="secondary"
              @click="openEditCard(card.id)"
            >
              Rename
            </BaseButton>
            <BaseButton
              size="xs"
              variant="danger"
              @click="removeCard(card.id)"
            >
              Delete
            </BaseButton>
          </div>
        </div>

        <!-- Item list -->
        <ul class="expense-card__items">
          <li
            v-for="item in card.items"
            :key="item.id"
            class="expense-item"
          >
            <div class="expense-item__row-1">
              <span class="expense-item__name">{{ item.name }}</span>
              <span class="expense-item__amount">{{ fmt(monthlyAmount(item)) }}</span>
            </div>
            <div class="expense-item__row-2">
              <span
                v-if="item.biweekly"
                class="expense-item__badge"
              >bi-wk ×2</span>
              <span class="expense-item__row-spacer" />
              <BaseButton
                size="xs"
                variant="secondary"
                @click="openEditItem(card.id, item.id)"
              >
                Edit
              </BaseButton>
              <BaseButton
                size="xs"
                variant="danger"
                @click="removeItem(card.id, item.id)"
              >
                Delete
              </BaseButton>
            </div>
          </li>

          <!-- Linked subscription rows (read-only) -->
          <li
            v-for="sub in getLinkedSubs(card.id)"
            :key="`sub-${sub.id}`"
            class="expense-item linked-sub"
            :class="{ 'linked-inactive': !sub.isDue }"
          >
            <div class="expense-item__row-1">
              <span class="linked-icon">↻</span>
              <span class="expense-item__name">{{ sub.name }}</span>
              <span class="linked-freq-badge">{{ sub.frequency }}</span>
              <span
                v-if="sub.isDue"
                class="expense-item__amount"
              >{{ fmt(sub.amount) }}</span>
              <span
                v-else
                class="expense-item__amount linked-next"
              >Next: {{ sub.nextStr }}</span>
            </div>
          </li>

          <!-- Linked loan rows (read-only) -->
          <li
            v-for="loan in getLinkedLoans(card.id)"
            :key="`loan-${loan.id}`"
            class="expense-item linked-loan"
            :class="{ 'linked-inactive': !loan.isDue }"
          >
            <div class="expense-item__row-1">
              <span class="linked-icon">🏦</span>
              <span class="expense-item__name">{{ loan.name }}</span>
              <span class="linked-freq-badge">{{ loan.frequency }}</span>
              <span
                v-if="loan.isDue"
                class="expense-item__amount"
              >{{ fmt(loan.paymentAmount) }}</span>
              <span
                v-else
                class="expense-item__amount linked-next"
              >Next: {{ loan.nextStr }}</span>
            </div>
          </li>
        </ul>

        <!-- Card total footer -->
        <div class="expense-card__footer">
          <span class="expense-card__footer-label">TOTAL</span>
          <span class="expense-card__footer-total">{{ fmt(cardTotal(card.id)) }}</span>
        </div>

        <!-- Add item inline -->
        <BaseButton
          size="sm"
          variant="secondary"
          class="expense-card__add-item"
          @click="openAddItem(card.id)"
        >
          + Add Expense
        </BaseButton>
      </div>
    </div>

    <!-- Add / Rename card modal -->
    <BaseModal
      v-model:open="showCardModal"
      :title="editingCardId ? 'Rename Card' : 'Add Expense Card'"
      size="sm"
    >
      <div class="modal-form">
        <div class="form-group">
          <label
            class="form-label"
            for="card-label"
          >Card name</label>
          <input
            id="card-label"
            v-model="cardForm.label"
            class="form-input"
            type="text"
            placeholder="e.g. TD Debit"
          >
        </div>
        <p
          v-if="cardFormError"
          class="form-error"
        >
          {{ cardFormError }}
        </p>
      </div>
      <template #footer>
        <BaseButton
          variant="secondary"
          @click="showCardModal = false"
        >
          Cancel
        </BaseButton>
        <BaseButton
          :disabled="!!cardFormError"
          @click="saveCard"
        >
          {{ editingCardId ? 'Rename' : 'Add' }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Add / Edit item modal -->
    <BaseModal
      v-model:open="showItemModal"
      :title="editingItemId ? 'Edit Expense' : 'Add Expense'"
      size="sm"
    >
      <div class="modal-form">
        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="item-name"
            >Name</label>
            <input
              id="item-name"
              v-model="itemForm.name"
              class="form-input"
              type="text"
              placeholder="e.g. Rent"
            >
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="item-amount"
            >Amount ($)</label>
            <input
              id="item-amount"
              v-model.number="itemForm.amount"
              class="form-input"
              type="number"
              min="0"
              step="0.01"
            >
          </div>
        </div>

        <label class="toggle-row">
          <span class="toggle-info">
            <span class="toggle-label">Bi-weekly pay</span>
            <span class="toggle-sublabel">Amount per paycheque (×2 monthly)</span>
          </span>
          <input
            v-model="itemForm.biweekly"
            type="checkbox"
            class="toggle-checkbox"
          >
        </label>

        <p
          v-if="itemFormError"
          class="form-error"
        >
          {{ itemFormError }}
        </p>
      </div>
      <template #footer>
        <BaseButton
          variant="secondary"
          @click="showItemModal = false; resetItemForm()"
        >
          Cancel
        </BaseButton>
        <BaseButton
          :disabled="!!itemFormError"
          @click="saveItem"
        >
          {{ editingItemId ? 'Update' : 'Add' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.expense-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.expense-cards__summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.expense-cards__summary-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.expense-cards__summary-stat.stat-danger .expense-cards__summary-value {
  color: var(--danger);
}

.expense-cards__summary-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.expense-cards__summary-value {
  font-size: 1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.expense-cards__add {
  margin-left: auto;
}

.expense-cards__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
}

.expense-card {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.expense-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.expense-card__label {
  font-weight: 700;
  font-size: 0.95rem;
}

.expense-card__actions {
  display: flex;
  gap: 0.35rem;
}

.expense-card__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.expense-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--border);
}

.expense-item:last-child {
  border-bottom: none;
}

.expense-item__row-1 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.expense-item__row-2 {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.expense-item__row-spacer {
  flex: 1;
}

.expense-item__name {
  font-size: 0.875rem;
  font-weight: 600;
  flex: 1;
}

.expense-item__amount {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
  margin-left: auto;
}

.expense-item__badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(74, 222, 128, 0.12);
  color: var(--accent);
}

/* Linked rows */
.linked-sub,
.linked-loan {
  opacity: 1;
}

.linked-inactive {
  opacity: 0.55;
}

.linked-icon {
  font-size: 0.9rem;
  color: var(--accent);
  flex-shrink: 0;
}

.linked-loan .linked-icon {
  color: var(--warn);
}

.linked-freq-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--surface);
  color: var(--muted);
}

.linked-next {
  font-size: 0.75rem;
  color: var(--muted);
}

/* Card footer */
.expense-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);
  margin-top: 0.25rem;
}

.expense-card__footer-label {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.expense-card__footer-total {
  font-weight: 800;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}

.expense-card__add-item {
  width: 100%;
}

/* Modal */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 400px) {
  .form-row-2 { grid-template-columns: 1fr; }
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

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  cursor: pointer;
  padding: 0.25rem 0;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.toggle-label {
  font-size: 0.875rem;
  font-weight: 600;
}

.toggle-sublabel {
  font-size: 0.73rem;
  color: var(--muted);
}

.toggle-checkbox {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: var(--accent);
  flex-shrink: 0;
}

.form-error {
  font-size: 0.8rem;
  color: var(--danger);
  margin: 0;
}
</style>
