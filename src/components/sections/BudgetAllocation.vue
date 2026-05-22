<!--
  Module:   components/sections/BudgetAllocation.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Summary:  Three allocation stat cards (Needs / Wants / Savings) with
            monthly/bi-weekly toggle, a segmented progress bar, and an
            edit-allocation modal. Mirrors legacy renderIncome() output.
-->

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useAnalytics } from '@/composables/useAnalytics';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { fmt } from '@/utils/format';

const budget  = useBudgetStore();
const toast   = useToast();
const { totalMonthlyIncome, grandTotalExpenses } = useAnalytics();

// ─── Display mode toggle ─────────────────────────────────────────
type DisplayMode = 'monthly' | 'biweekly';
const displayMode = ref<DisplayMode>('monthly');

function toggleDisplay(): void {
  displayMode.value = displayMode.value === 'monthly' ? 'biweekly' : 'monthly';
}

// ─── Allocation amounts ───────────────────────────────────────────
const needsAmt = computed(() => {
  const mo = totalMonthlyIncome.value * (budget.allocation.needs / 100);
  return displayMode.value === 'biweekly' ? mo / 2 : mo;
});

const wantsAmt = computed(() => {
  const mo = totalMonthlyIncome.value * (budget.allocation.wants / 100);
  return displayMode.value === 'biweekly' ? mo / 2 : mo;
});

const savingsAmt = computed(() => {
  const mo = totalMonthlyIncome.value * (budget.allocation.savings / 100);
  return displayMode.value === 'biweekly' ? mo / 2 : mo;
});

const needsRemaining = computed(() => {
  const needsBudget = totalMonthlyIncome.value * (budget.allocation.needs / 100);
  return needsBudget - grandTotalExpenses.value;
});

const fundsLabel = computed(() => {
  const r = needsRemaining.value;
  if (r >= 0) return `${fmt(r)} remaining in Needs`;
  return `Over Needs budget by ${fmt(Math.abs(r))}`;
});

const suffix = computed(() => (displayMode.value === 'biweekly' ? '/pay' : '/mo'));

// ─── Edit modal ───────────────────────────────────────────────────
const showModal = ref(false);
const form = reactive({
  needs:   budget.allocation.needs,
  wants:   budget.allocation.wants,
  savings: budget.allocation.savings,
});

const formSum = computed(() => form.needs + form.wants + form.savings);
const formError = computed(() => {
  if (form.needs < 0 || form.wants < 0 || form.savings < 0) return 'Values cannot be negative.';
  if (formSum.value !== 100) return `Must sum to 100% (currently ${formSum.value}%).`;
  return '';
});

function openEdit(): void {
  form.needs   = budget.allocation.needs;
  form.wants   = budget.allocation.wants;
  form.savings = budget.allocation.savings;
  showModal.value = true;
}

function save(): void {
  if (formError.value) return;
  budget.setAllocation({ needs: form.needs, wants: form.wants, savings: form.savings });
  toast.show('Budget allocation updated.', 'success');
  showModal.value = false;
}
</script>

<template>
  <div class="budget-alloc">
    <!-- Controls row -->
    <div class="budget-alloc__controls">
      <button
        class="display-toggle"
        :class="{ active: displayMode === 'biweekly' }"
        @click="toggleDisplay"
      >
        {{ displayMode === 'monthly' ? 'Monthly' : 'Bi-weekly' }}
      </button>
      <BaseButton
        size="sm"
        variant="secondary"
        @click="openEdit"
      >
        Edit %
      </BaseButton>
    </div>

    <!-- Three allocation cards -->
    <div class="alloc-cards">
      <div class="alloc-card alloc-card--needs">
        <div class="alloc-card__pct">
          {{ budget.allocation.needs }}%
        </div>
        <div class="alloc-card__label">
          Needs
        </div>
        <div class="alloc-card__amount">
          {{ fmt(needsAmt) }}{{ suffix }}
        </div>
      </div>

      <div class="alloc-card alloc-card--wants">
        <div class="alloc-card__pct">
          {{ budget.allocation.wants }}%
        </div>
        <div class="alloc-card__label">
          Wants
        </div>
        <div class="alloc-card__amount">
          {{ fmt(wantsAmt) }}{{ suffix }}
        </div>
      </div>

      <div class="alloc-card alloc-card--savings">
        <div class="alloc-card__pct">
          {{ budget.allocation.savings }}%
        </div>
        <div class="alloc-card__label">
          Savings
        </div>
        <div class="alloc-card__amount">
          {{ fmt(savingsAmt) }}{{ suffix }}
        </div>
      </div>
    </div>

    <!-- Segmented progress bar -->
    <div
      class="alloc-bar"
      role="img"
      :aria-label="`Needs ${budget.allocation.needs}%, Wants ${budget.allocation.wants}%, Savings ${budget.allocation.savings}%`"
    >
      <div
        class="alloc-bar__segment alloc-bar__segment--needs"
        :style="{ width: `${budget.allocation.needs}%` }"
      />
      <div
        class="alloc-bar__segment alloc-bar__segment--wants"
        :style="{ width: `${budget.allocation.wants}%` }"
      />
      <div
        class="alloc-bar__segment alloc-bar__segment--savings"
        :style="{ width: `${budget.allocation.savings}%` }"
      />
    </div>

    <!-- Needs remaining hint -->
    <p
      v-if="totalMonthlyIncome > 0"
      class="alloc-hint"
      :class="{ 'alloc-hint--danger': needsRemaining < 0 }"
    >
      {{ fundsLabel }}
    </p>

    <!-- Edit allocation modal -->
    <BaseModal
      v-model:open="showModal"
      title="Edit Budget Allocation"
      size="sm"
    >
      <div class="modal-form">
        <p class="modal-note">
          Enter percentages for Needs, Wants, and Savings. They must sum to exactly 100%.
        </p>

        <div class="form-row">
          <label
            class="form-label"
            for="alloc-needs"
          >Needs %</label>
          <input
            id="alloc-needs"
            v-model.number="form.needs"
            class="form-input"
            type="number"
            min="0"
            max="100"
            step="1"
          >
        </div>

        <div class="form-row">
          <label
            class="form-label"
            for="alloc-wants"
          >Wants %</label>
          <input
            id="alloc-wants"
            v-model.number="form.wants"
            class="form-input"
            type="number"
            min="0"
            max="100"
            step="1"
          >
        </div>

        <div class="form-row">
          <label
            class="form-label"
            for="alloc-savings"
          >Savings %</label>
          <input
            id="alloc-savings"
            v-model.number="form.savings"
            class="form-input"
            type="number"
            min="0"
            max="100"
            step="1"
          >
        </div>

        <div
          class="form-sum"
          :class="{ 'form-sum--ok': formSum === 100, 'form-sum--bad': formSum !== 100 }"
        >
          Total: {{ formSum }}%
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
          @click="showModal = false"
        >
          Cancel
        </BaseButton>
        <BaseButton
          :disabled="!!formError"
          @click="save"
        >
          Save
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.budget-alloc {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.budget-alloc__controls {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
}

.display-toggle {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.display-toggle.active,
.display-toggle:hover {
  background: var(--accent);
  color: var(--surface);
  border-color: var(--accent);
}

.alloc-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

@media (max-width: 480px) {
  .alloc-cards {
    grid-template-columns: 1fr;
  }
}

.alloc-card {
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface2);
  text-align: center;
}

.alloc-card__pct {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.alloc-card--needs .alloc-card__pct  { color: var(--accent-text, var(--accent)); }
.alloc-card--wants .alloc-card__pct  { color: var(--accent2, #60a5fa); }
.alloc-card--savings .alloc-card__pct { color: var(--warn, #fbbf24); }

.alloc-card__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 2px;
}

.alloc-card__amount {
  font-size: 0.85rem;
  font-weight: 600;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

/* Segmented bar */
.alloc-bar {
  height: 8px;
  border-radius: 4px;
  display: flex;
  overflow: hidden;
  background: var(--surface2);
  border: 1px solid var(--border);
  gap: 2px;
}

.alloc-bar__segment {
  height: 100%;
  border-radius: 2px;
  transition: width 0.35s ease;
}

.alloc-bar__segment--needs   { background: var(--accent-text, var(--accent)); }
.alloc-bar__segment--wants   { background: var(--accent2, #60a5fa); }
.alloc-bar__segment--savings { background: var(--warn, #fbbf24); }

.alloc-hint {
  font-size: 0.8rem;
  color: var(--muted);
  margin: 0;
  text-align: center;
}

.alloc-hint--danger {
  color: var(--danger);
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

.form-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  width: 70px;
}

.form-input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.45rem 0.65rem;
  font-size: 0.9rem;
  color: var(--text);
  flex: 1;
  transition: border-color 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.form-sum {
  font-size: 0.85rem;
  font-weight: 700;
  text-align: right;
  padding: 4px 8px;
  border-radius: 4px;
}

.form-sum--ok  { color: var(--accent); }
.form-sum--bad { color: var(--danger); }

.form-error {
  font-size: 0.8rem;
  color: var(--danger);
  margin: 0;
}
</style>
