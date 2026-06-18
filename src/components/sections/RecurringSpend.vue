<!--
  Module:   components/sections/RecurringSpend.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (RS-12)
  Summary:  Read-only dashboard view of recurring fixed expenses.
            Groups line-items by expense card with an expand/collapse
            toggle per card. Subscriptions and loans linked to each
            card appear as sub-rows with due-this-month badges.
            All edits live in Settings → Expenses.
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useAnalytics } from '@/composables/useAnalytics';
import EmptyState from '@/components/ui/EmptyState.vue';
import { fmt } from '@/utils/format';
import { monthlyAmount } from '@/utils/date';
import { getRenewalDatesBetween, getNextRenewal } from '@/utils/calculations';

const budget = useBudgetStore();
const { grandTotalExpenses, totalMonthlyIncome } = useAnalytics();

const today        = new Date();
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const endOfMonth   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
startOfMonth.setHours(0, 0, 0, 0);
endOfMonth.setHours(23, 59, 59, 999);

// ─── Interfaces ────────────────────────────────────────────────────
interface LinkedSubRow {
  id: string;
  name: string;
  amount: number;
  isDue: boolean;
  nextStr: string;
}

interface LinkedLoanRow {
  id: string;
  name: string;
  paymentAmount: number;
  isDue: boolean;
  nextStr: string;
}

// ─── Per-card data helpers ─────────────────────────────────────────
function getLinkedSubs(cardId: string): LinkedSubRow[] {
  return budget.subscriptions
    .filter(s => s.cardId === cardId)
    .map(s => {
      const renewals = getRenewalDatesBetween(s, startOfMonth, endOfMonth);
      const isDue    = renewals.length > 0;
      const nextDate = isDue ? null : getNextRenewal(s);
      const nextStr  = nextDate
        ? new Date(nextDate + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
        : '—';
      return { id: s.id, name: s.name, amount: +s.amount || 0, isDue, nextStr };
    });
}

function getLinkedLoans(cardId: string): LinkedLoanRow[] {
  return budget.loans
    .filter(l => l.cardId === cardId && l.paymentAmount > 0 && l.date)
    .map(l => {
      const renewals = getRenewalDatesBetween(l, startOfMonth, endOfMonth);
      const isDue    = renewals.length > 0;
      const nextDate = isDue ? null : getNextRenewal(l);
      const nextStr  = nextDate
        ? new Date(nextDate + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
        : '—';
      return { id: l.id, name: l.name, paymentAmount: l.paymentAmount, isDue, nextStr };
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

// ─── Needs budget summary ──────────────────────────────────────────
const needsBudget    = computed(() => totalMonthlyIncome.value * (budget.allocation.needs / 100));
const needsRemaining = computed(() => needsBudget.value - grandTotalExpenses.value);

// ─── Expand / collapse per card ────────────────────────────────────
const expandedCards = ref(new Set<string>());

function toggleCard(id: string): void {
  if (expandedCards.value.has(id)) {
    expandedCards.value.delete(id);
  } else {
    expandedCards.value.add(id);
  }
  // trigger reactivity
  expandedCards.value = new Set(expandedCards.value);
}

function isExpanded(id: string): boolean {
  return expandedCards.value.has(id);
}
</script>

<template>
  <div class="rs">
    <!-- Empty state ────────────────────────────────────────────── -->
    <EmptyState
      v-if="budget.expenseCards.length === 0"
      icon="📋"
      title="No expense cards set up"
      hint="Add cards in Settings → Expenses to track recurring spend."
    />

    <template v-else>
      <!-- Summary bar ─────────────────────────────────────────── -->
      <div class="rs__summary">
        <div class="rs__summary-stat">
          <span class="rs__summary-label">Total / mo</span>
          <span class="rs__summary-value">{{ fmt(grandTotalExpenses) }}</span>
        </div>
        <div
          class="rs__summary-stat"
          :class="{ 'rs__summary-stat--danger': needsRemaining < 0 }"
        >
          <span class="rs__summary-label">Needs remaining</span>
          <span class="rs__summary-value">{{ fmt(needsRemaining) }}</span>
        </div>
      </div>

      <!-- Card rows ───────────────────────────────────────────── -->
      <div class="rs__cards">
        <div
          v-for="card in budget.expenseCards"
          :key="card.id"
          class="rs__card"
        >
          <!-- Card header (click to expand/collapse) -->
          <button
            class="rs__card-header"
            type="button"
            :aria-expanded="isExpanded(card.id)"
            @click="toggleCard(card.id)"
          >
            <span
              class="rs__card-chevron"
              :class="{ 'rs__card-chevron--open': isExpanded(card.id) }"
            >›</span>
            <span class="rs__card-name">{{ card.label }}</span>
            <span class="rs__card-total">{{ fmt(cardTotal(card.id)) }}/mo</span>
          </button>

          <!-- Expanded content -->
          <div
            v-if="isExpanded(card.id)"
            class="rs__card-items"
          >
            <!-- Direct expense items -->
            <div
              v-for="item in card.items"
              :key="item.id"
              class="rs__item-row"
            >
              <span class="rs__item-icon">📋</span>
              <span class="rs__item-name">{{ item.name }}</span>
              <span
                v-if="item.biweekly"
                class="rs__item-freq"
              >2×/mo</span>
              <span class="rs__item-amount">{{ fmt(monthlyAmount(item)) }}/mo</span>
            </div>

            <!-- Linked subscriptions -->
            <div
              v-for="sub in getLinkedSubs(card.id)"
              :key="'sub-' + sub.id"
              class="rs__item-row"
              :class="{ 'rs__item-row--due': sub.isDue }"
            >
              <span class="rs__item-icon">🔄</span>
              <span class="rs__item-name">{{ sub.name }}</span>
              <span
                v-if="sub.isDue"
                class="rs__item-badge rs__item-badge--due"
              >Due</span>
              <span
                v-else
                class="rs__item-next"
              >next {{ sub.nextStr }}</span>
              <span class="rs__item-amount">{{ fmt(sub.amount) }}</span>
            </div>

            <!-- Linked loans -->
            <div
              v-for="loan in getLinkedLoans(card.id)"
              :key="'loan-' + loan.id"
              class="rs__item-row"
              :class="{ 'rs__item-row--due': loan.isDue }"
            >
              <span class="rs__item-icon">🏦</span>
              <span class="rs__item-name">{{ loan.name }}</span>
              <span
                v-if="loan.isDue"
                class="rs__item-badge rs__item-badge--due"
              >Due</span>
              <span
                v-else
                class="rs__item-next"
              >next {{ loan.nextStr }}</span>
              <span class="rs__item-amount">{{ fmt(loan.paymentAmount) }}</span>
            </div>

            <!-- Empty card -->
            <p
              v-if="card.items.length === 0 && getLinkedSubs(card.id).length === 0 && getLinkedLoans(card.id).length === 0"
              class="rs__card-empty"
            >
              No items linked to this card.
            </p>
          </div>
        </div>
      </div>

      <!-- Settings link ───────────────────────────────────────── -->
      <p class="rs__footer">
        Edit in Settings → Expenses
      </p>
    </template>
  </div>
</template>

<style scoped>
.rs {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

/* ─── Summary bar ─────────────────────────────────────────────── */
.rs__summary {
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.rs__summary-stat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.rs__summary-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.rs__summary-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.rs__summary-stat--danger .rs__summary-value {
  color: var(--danger);
}

/* ─── Card list ───────────────────────────────────────────────── */
.rs__cards {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.rs__card {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

/* ─── Card header ─────────────────────────────────────────────── */
.rs__card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background: var(--surface2);
  border: none;
  padding: 0.55rem 0.75rem;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background var(--transition-fast);
}

.rs__card-header:hover {
  background: color-mix(in srgb, var(--accent) 8%, var(--surface2));
}

.rs__card-chevron {
  font-size: 1.1rem;
  color: var(--muted);
  display: inline-block;
  transition: transform 180ms ease;
  transform: rotate(0deg);
  line-height: 1;
  flex-shrink: 0;
}

.rs__card-chevron--open {
  transform: rotate(90deg);
}

.rs__card-name {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

.rs__card-total {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* ─── Expanded items ──────────────────────────────────────────── */
.rs__card-items {
  display: flex;
  flex-direction: column;
  padding: 0.35rem 0.75rem 0.5rem;
  gap: 0.3rem;
  background: var(--surface);
}

.rs__item-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--border);
}

.rs__item-row:last-child {
  border-bottom: none;
}

.rs__item-row--due {
  background: color-mix(in srgb, var(--accent) 5%, transparent);
  border-radius: 4px;
  padding-left: 0.3rem;
  padding-right: 0.3rem;
}

.rs__item-icon {
  font-size: 0.8rem;
  flex-shrink: 0;
}

.rs__item-name {
  flex: 1;
  color: var(--text);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rs__item-freq {
  font-size: 0.7rem;
  color: var(--muted);
  padding: 1px 5px;
  background: var(--surface2);
  border-radius: 3px;
  flex-shrink: 0;
}

.rs__item-badge {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 700;
}

.rs__item-badge--due {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
}

.rs__item-next {
  font-size: 0.72rem;
  color: var(--muted);
  flex-shrink: 0;
}

.rs__item-amount {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text);
  font-weight: 600;
  flex-shrink: 0;
  text-align: right;
  min-width: 4.5rem;
}

.rs__card-empty {
  margin: 0.25rem 0;
  font-size: 0.78rem;
  color: var(--muted);
  font-style: italic;
}

/* ─── Footer ──────────────────────────────────────────────────── */
.rs__footer {
  margin: 0;
  font-size: 0.72rem;
  color: var(--muted);
  border-top: 1px solid var(--border);
  padding-top: 0.5rem;
}

@media (max-width: 480px) {
  .rs__summary-label { font-size: 0.72rem; }
}
</style>
