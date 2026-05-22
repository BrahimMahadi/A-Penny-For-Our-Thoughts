<!--
  Module:   components/sections/SavingsGoals.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Summary:  Savings goal tracker — per-account goals with progress bars,
            monthly savings needed, time remaining, and on-track status.
            CRUD via BaseModal. Mirrors renderGoals().
-->

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useAnalytics } from '@/composables/useAnalytics';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import ProgressBar from '@/components/ui/ProgressBar.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { fmt } from '@/utils/format';

const budget = useBudgetStore();
const toast  = useToast();
const { progressForGoal } = useAnalytics();

// ─── Modal state ─────────────────────────────────────────────────
const showModal = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  accountId:    '',
  targetAmount: 0,
  targetDate:   '',
});

function resetForm(): void {
  form.accountId    = budget.savingsAccounts[0]?.id ?? '';
  form.targetAmount = 0;
  form.targetDate   = '';
  editingId.value   = null;
}

function openAdd(): void {
  resetForm();
  showModal.value = true;
}

function openEdit(id: string): void {
  const goal = budget.goals.find(g => g.id === id);
  if (!goal) return;
  form.accountId    = goal.accountId;
  form.targetAmount = goal.targetAmount;
  form.targetDate   = goal.targetDate;
  editingId.value   = id;
  showModal.value   = true;
}

const formError = computed<string>(() => {
  if (!form.accountId)       return 'Please select an account.';
  if (form.targetAmount <= 0) return 'Target amount must be greater than zero.';
  if (!form.targetDate)       return 'Target date is required.';
  return '';
});

function save(): void {
  if (formError.value) return;
  if (editingId.value) {
    budget.updateGoal(editingId.value, {
      accountId:    form.accountId,
      targetAmount: form.targetAmount,
      targetDate:   form.targetDate,
    });
    toast.show('Goal updated.', 'success');
  } else {
    budget.addGoal({
      accountId:    form.accountId,
      targetAmount: form.targetAmount,
      targetDate:   form.targetDate,
    });
    toast.show('Goal added.', 'success');
  }
  showModal.value = false;
  resetForm();
}

function remove(id: string): void {
  if (!window.confirm('Delete this goal?')) return;
  budget.deleteGoal(id);
  toast.show('Goal removed.', 'success');
}

// ─── Status helpers ───────────────────────────────────────────────
function statusLabel(status: string): string {
  switch (status) {
    case 'on-track':  return '✓ On Track';
    case 'caution':   return '⚠ Caution';
    case 'complete':  return '✓ Complete';
    case 'missed':    return '✗ Missed';
    default:          return '✗ Off Track';
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'on-track':  return 'status-on-track';
    case 'caution':   return 'status-caution';
    case 'complete':  return 'status-complete';
    default:          return 'status-off-track';
  }
}

function progressBarStatus(status: string): 'on-track' | 'caution' | 'over' {
  if (status === 'on-track' || status === 'complete') return 'on-track';
  if (status === 'caution') return 'caution';
  return 'over';
}

// Current month YYYY-MM for date input min value
const minDate = new Date().toISOString().slice(0, 7);
</script>

<template>
  <div class="goals-section">
    <!-- Header -->
    <div class="goals-section__header">
      <span class="goals-section__count">
        {{ budget.goals.length }} goal{{ budget.goals.length !== 1 ? 's' : '' }}
      </span>
      <BaseButton
        size="sm"
        @click="openAdd"
      >
        + Add Goal
      </BaseButton>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-if="budget.goals.length === 0"
      icon="🎯"
      title="No goals set"
      hint="Add a goal to track your progress toward a savings target."
    />

    <!-- Goal list -->
    <div
      v-else
      class="goals-list"
    >
      <div
        v-for="goal in budget.goals"
        :key="goal.id"
        class="goal-item"
        :class="statusClass(progressForGoal(goal)?.status ?? 'off-track')"
      >
        <template v-if="progressForGoal(goal) as any">
          <!-- Goal header -->
          <div class="goal-item__header">
            <div class="goal-item__title-group">
              <span class="goal-item__account">{{ progressForGoal(goal)!.accountName }}</span>
              <span class="goal-item__target">
                {{ fmt(progressForGoal(goal)!.targetAmount) }} by {{ progressForGoal(goal)!.targetDate }}
              </span>
            </div>
            <div class="goal-item__actions">
              <BaseButton
                size="xs"
                variant="secondary"
                @click="openEdit(goal.id)"
              >
                Edit
              </BaseButton>
              <BaseButton
                size="xs"
                variant="danger"
                @click="remove(goal.id)"
              >
                Delete
              </BaseButton>
            </div>
          </div>

          <!-- Progress bar -->
          <ProgressBar
            :percent="progressForGoal(goal)!.progressPercent"
            :status="progressBarStatus(progressForGoal(goal)!.status)"
            size="md"
            :label="`${fmt(progressForGoal(goal)!.currentAmount)} / ${fmt(progressForGoal(goal)!.targetAmount)}`"
            :aria-label="`Goal progress for ${progressForGoal(goal)!.accountName}`"
          />

          <!-- Stats grid -->
          <div class="goal-item__stats">
            <div class="goal-stat">
              <span class="goal-stat__label">Monthly Needed</span>
              <span class="goal-stat__value">
                {{ progressForGoal(goal)!.monthsRemaining > 0 ? fmt(progressForGoal(goal)!.monthlySavingsNeeded) : '—' }}
              </span>
            </div>
            <div class="goal-stat">
              <span class="goal-stat__label">Time Remaining</span>
              <span class="goal-stat__value">
                {{ progressForGoal(goal)!.monthsRemaining > 0
                  ? `${progressForGoal(goal)!.monthsRemaining} mo`
                  : progressForGoal(goal)!.monthsRemaining === 0 ? 'Due now' : 'Past due' }}
              </span>
            </div>
            <div class="goal-stat">
              <span class="goal-stat__label">Status</span>
              <span
                class="goal-status-badge"
                :class="statusClass(progressForGoal(goal)!.status)"
              >
                {{ statusLabel(progressForGoal(goal)!.status) }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Add / Edit modal -->
    <BaseModal
      v-model:open="showModal"
      :title="editingId ? 'Edit Goal' : 'Add Savings Goal'"
      size="sm"
    >
      <div class="modal-form">
        <div class="form-group">
          <label
            class="form-label"
            for="goal-account"
          >Account</label>
          <select
            id="goal-account"
            v-model="form.accountId"
            class="form-input"
          >
            <option value="">
              — select account —
            </option>
            <option
              v-for="acct in budget.savingsAccounts"
              :key="acct.id"
              :value="acct.id"
            >
              {{ acct.name }}
            </option>
          </select>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="goal-target"
            >Target amount ($)</label>
            <input
              id="goal-target"
              v-model.number="form.targetAmount"
              class="form-input"
              type="number"
              min="1"
              step="0.01"
            >
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="goal-date"
            >Target month (YYYY-MM)</label>
            <input
              id="goal-date"
              v-model="form.targetDate"
              class="form-input"
              type="month"
              :min="minDate"
            >
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
.goals-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.goals-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goals-section__count {
  font-size: 0.8rem;
  color: var(--muted);
}

.goals-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.goal-item {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border-left: 4px solid var(--border);
}

.goal-item.status-on-track  { border-left-color: var(--accent2); }
.goal-item.status-caution   { border-left-color: var(--warn); }
.goal-item.status-complete  { border-left-color: var(--accent); }
.goal-item.status-off-track { border-left-color: var(--danger); }

.goal-item__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.goal-item__title-group {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
}

.goal-item__account {
  font-weight: 700;
  font-size: 0.95rem;
}

.goal-item__target {
  font-size: 0.78rem;
  color: var(--muted);
}

.goal-item__actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.goal-item__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 0.25rem;
}

@media (max-width: 480px) {
  .goal-item__stats { grid-template-columns: 1fr 1fr; }
}

.goal-stat {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.goal-stat__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.goal-stat__value {
  font-size: 0.9rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.goal-status-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-on-track  { background: rgba(96, 165, 250, 0.12); color: var(--accent2); }
.status-caution   { background: rgba(251, 191, 36, 0.12); color: var(--warn); }
.status-complete  { background: rgba(74, 222, 128, 0.12); color: var(--accent); }
.status-off-track { background: rgba(248, 113, 113, 0.12); color: var(--danger); }

/* Modal */
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

@media (max-width: 400px) {
  .form-row-2 { grid-template-columns: 1fr; }
}

.form-error {
  font-size: 0.8rem;
  color: var(--danger);
  margin: 0;
}
</style>
