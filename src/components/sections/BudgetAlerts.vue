<!--
  Module:   components/sections/BudgetAlerts.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 7)
  Summary:  CRUD for budget spending alerts.
            Each alert has a category and a dollar threshold.
            When spending in that category exceeds the threshold,
            a warning banner appears in the Wants Tracker.
-->

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useAnalytics } from '@/composables/useAnalytics';
import { useToast } from '@/composables/useToast';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { fmt } from '@/utils/format';
import type { BudgetAlert } from '@/types/budget';

const budget  = useBudgetStore();
const toast   = useToast();
const { triggeredAlerts } = useAnalytics();

// ─── Live category list from store (reflects user-defined categories) ─────────
const categoryNames = computed(() => budget.spendingCategories.map(c => c.name));

const alerts = computed(() => budget.budgetAlerts);

// ─── Add / Edit modal ─────────────────────────────────────────────────────────
const showModal = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  category:  budget.spendingCategories[0]?.name ?? '',
  threshold: 0,
});

function openAdd(): void {
  editingId.value   = null;
  form.category     = categoryNames.value[0] ?? '';
  form.threshold    = 0;
  showModal.value   = true;
}

function openEdit(alert: BudgetAlert): void {
  editingId.value   = alert.id;
  form.category     = alert.category;
  form.threshold    = alert.threshold;
  showModal.value   = true;
}

function saveAlert(): void {
  if (form.threshold <= 0) {
    toast.show('Threshold must be greater than zero.', 'warning');
    return;
  }
  if (editingId.value) {
    budget.updateBudgetAlert(editingId.value, {
      category:  form.category,
      threshold: form.threshold,
    });
    toast.show('Alert updated.', 'success');
  } else {
    budget.addBudgetAlert({ category: form.category, threshold: form.threshold });
    toast.show('Alert added.', 'success');
  }
  showModal.value = false;
}

function deleteAlert(id: string): void {
  budget.deleteBudgetAlert(id);
  toast.show('Alert deleted.', 'success');
}

// ─── Is a given alert currently firing? ──────────────────────────────────────
function isFiring(alertId: string): boolean {
  return triggeredAlerts.value.some(a => a.id === alertId);
}
</script>

<template>
  <div class="budget-alerts">
    <!-- Header row -->
    <div class="budget-alerts__header">
      <p class="budget-alerts__desc">
        Get a warning in the Wants Tracker when spending in a category exceeds a set amount.
      </p>
      <BaseButton
        size="sm"
        @click="openAdd"
      >
        + Add Alert
      </BaseButton>
    </div>

    <!-- Alerts list -->
    <div
      v-if="alerts.length"
      class="budget-alerts__list"
    >
      <div
        v-for="alert in alerts"
        :key="alert.id"
        class="budget-alerts__row"
        :class="{ 'budget-alerts__row--firing': isFiring(alert.id) }"
      >
        <span
          class="budget-alerts__firing-dot"
          :title="isFiring(alert.id) ? 'Currently triggered' : 'Not triggered'"
        >{{ isFiring(alert.id) ? '🔴' : '🟢' }}</span>
        <span class="budget-alerts__category">{{ alert.category }}</span>
        <span class="budget-alerts__arrow">≥</span>
        <span class="budget-alerts__threshold">{{ fmt(alert.threshold) }}</span>
        <div class="budget-alerts__row-actions">
          <button
            class="budget-alerts__icon-btn"
            aria-label="Edit alert"
            title="Edit"
            @click="openEdit(alert)"
          >
            ✎
          </button>
          <button
            class="budget-alerts__icon-btn budget-alerts__icon-btn--danger"
            aria-label="Delete alert"
            title="Delete"
            @click="deleteAlert(alert.id)"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="🔔"
      title="No alerts set"
      hint="Add alerts to be notified when spending in a category exceeds a threshold."
    />

    <!-- Add / Edit Modal -->
    <BaseModal
      v-model:open="showModal"
      :title="editingId ? 'Edit Alert' : 'Add Alert'"
      size="sm"
    >
      <div class="alerts-modal__form">
        <div class="alerts-modal__field">
          <label
            class="alerts-modal__label"
            for="alert-category"
          >Category</label>
          <select
            id="alert-category"
            v-model="form.category"
            class="alerts-modal__select"
          >
            <option
              v-for="cat in categoryNames"
              :key="cat"
              :value="cat"
            >
              {{ cat }}
            </option>
          </select>
        </div>

        <div class="alerts-modal__field">
          <label
            class="alerts-modal__label"
            for="alert-threshold"
          >Alert when spending exceeds ($)</label>
          <input
            id="alert-threshold"
            v-model.number="form.threshold"
            type="number"
            min="1"
            step="1"
            class="alerts-modal__input"
            inputmode="numeric"
            placeholder="e.g. 150"
            aria-required="true"
          >
        </div>

        <div class="alerts-modal__actions">
          <BaseButton @click="saveAlert">
            {{ editingId ? 'Update' : 'Add Alert' }}
          </BaseButton>
          <BaseButton
            variant="ghost"
            @click="showModal = false"
          >
            Cancel
          </BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.budget-alerts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.budget-alerts__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  /* Wrap button below description on narrow screens so it's never crushed */
  flex-wrap: wrap;
}

.budget-alerts__desc {
  font-size: 0.82rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.45;
  max-width: 44ch;
}

/* ─── Alerts list ────────────────────────────────────────────────── */
.budget-alerts__list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.budget-alerts__row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  font-size: 0.82rem;
  border-bottom: 1px solid var(--border);
  transition: background 0.12s;
}

.budget-alerts__row:last-child {
  border-bottom: none;
}

.budget-alerts__row:hover {
  background: var(--surface2);
}

.budget-alerts__row--firing {
  background: rgba(245, 158, 11, 0.06);
}

.budget-alerts__firing-dot {
  font-size: 0.65rem;
  flex-shrink: 0;
}

.budget-alerts__category {
  font-weight: 600;
  flex: 1;
}

.budget-alerts__arrow {
  color: var(--muted);
  flex-shrink: 0;
}

.budget-alerts__threshold {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--accent, #4ade80);
  flex-shrink: 0;
  min-width: 5rem;
  text-align: right;
}

.budget-alerts__row-actions {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  margin-left: auto;
  flex-shrink: 0;
}

.budget-alerts__icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--muted);
  font-size: 1rem;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.12s, background 0.12s;
}

.budget-alerts__icon-btn:hover {
  color: var(--text);
  background: rgba(255,255,255,0.06);
}

.budget-alerts__icon-btn--danger:hover {
  color: var(--danger, #f87171);
}

/* ─── Modal form ─────────────────────────────────────────────────── */
.alerts-modal__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.alerts-modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.alerts-modal__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.alerts-modal__input,
.alerts-modal__select {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.45rem 0.6rem;
  font-size: 0.875rem;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.alerts-modal__input:focus,
.alerts-modal__select:focus {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

.alerts-modal__actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.25rem;
}
</style>
