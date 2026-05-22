<!--
  Module:   components/pages/SettingsPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 7)
  Summary:  Settings tab. Hosts:
              • Pay Start Date — bi-weekly cycle anchor
              • Transaction Rules — auto-categorisation CRUD
              • Budget Alerts — spending threshold CRUD
              • Danger Zone — clear all data
-->

<script setup lang="ts">
import { ref } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import PayStartDate from '@/components/sections/PayStartDate.vue';
import RulesEngine from '@/components/sections/RulesEngine.vue';
import BudgetAlerts from '@/components/sections/BudgetAlerts.vue';

const budget = useBudgetStore();
const toast  = useToast();

// ─── Funds remaining ─────────────────────────────────────────────────────────
const fundsInput    = ref<number>(budget.fundsRemaining);
const fundsEditing  = ref(false);

function openFundsEdit(): void {
  fundsInput.value  = budget.fundsRemaining;
  fundsEditing.value = true;
}

function saveFunds(): void {
  const today = new Date().toISOString().split('T')[0];
  budget.setFundsRemaining(fundsInput.value, today);
  toast.show('Account balance updated.', 'success');
  fundsEditing.value = false;
}

// ─── Danger zone ─────────────────────────────────────────────────────────────
const confirmClear = ref(false);

function handleClearAll(): void {
  if (!confirmClear.value) {
    confirmClear.value = true;
    return;
  }
  budget.clearAll();
  confirmClear.value = false;
  toast.show('All data cleared.', 'success');
}
</script>

<template>
  <div class="page-settings">
    <!-- Pay Start Date ─────────────────────────────────────────────── -->
    <BaseCard title="Pay Period Anchor">
      <PayStartDate />
    </BaseCard>

    <!-- Transaction Rules ──────────────────────────────────────────── -->
    <BaseCard title="Transaction Rules">
      <RulesEngine />
    </BaseCard>

    <!-- Budget Alerts ──────────────────────────────────────────────── -->
    <BaseCard title="Budget Alerts">
      <BudgetAlerts />
    </BaseCard>

    <!-- Chequing Balance ───────────────────────────────────────────── -->
    <BaseCard title="Chequing Balance">
      <div class="settings-funds">
        <div class="settings-funds__info">
          <span class="settings-funds__label">Current balance</span>
          <span class="settings-funds__value">
            {{ budget.fundsRemaining.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' }) }}
          </span>
          <span
            v-if="budget.fundsRemainingUpdated"
            class="settings-funds__updated"
          >
            Last updated {{ budget.fundsRemainingUpdated }}
          </span>
        </div>

        <div
          v-if="fundsEditing"
          class="settings-funds__form"
        >
          <input
            v-model.number="fundsInput"
            type="number"
            min="0"
            step="0.01"
            class="settings-funds__input"
            inputmode="decimal"
            aria-label="Chequing balance"
          >
          <BaseButton
            size="sm"
            @click="saveFunds"
          >
            Save
          </BaseButton>
          <BaseButton
            size="sm"
            variant="ghost"
            @click="fundsEditing = false"
          >
            Cancel
          </BaseButton>
        </div>
        <BaseButton
          v-else
          size="sm"
          variant="outline"
          @click="openFundsEdit"
        >
          Update Balance
        </BaseButton>
      </div>
    </BaseCard>

    <!-- Danger Zone ────────────────────────────────────────────────── -->
    <BaseCard title="Danger Zone">
      <div class="settings-danger">
        <p class="settings-danger__desc">
          Permanently clear all budget data — income, expenses, loans, savings, history,
          and settings. This cannot be undone. Export a CSV backup first.
        </p>
        <div class="settings-danger__action">
          <BaseButton
            variant="danger"
            @click="handleClearAll"
          >
            {{ confirmClear ? '⚠ Click again to confirm — this cannot be undone' : 'Clear All Data' }}
          </BaseButton>
          <BaseButton
            v-if="confirmClear"
            variant="ghost"
            size="sm"
            @click="confirmClear = false"
          >
            Cancel
          </BaseButton>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.page-settings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ─── Funds card ─────────────────────────────────────────────────── */
.settings-funds {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.settings-funds__info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.settings-funds__label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.settings-funds__value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.settings-funds__updated {
  font-size: 0.72rem;
  color: var(--muted);
}

.settings-funds__form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.settings-funds__input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.35rem 0.6rem;
  font-size: 0.875rem;
  font-family: inherit;
  height: 32px;
  width: 120px;
}

.settings-funds__input:focus {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

/* ─── Danger zone ────────────────────────────────────────────────── */
.settings-danger {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.settings-danger__desc {
  font-size: 0.82rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
  max-width: 52ch;
}

.settings-danger__action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
