<!--
  Module:   components/sections/ChequingBalance.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 19)
  Summary:  Dashboard section for tracking the chequing account balance.
            Moved from SettingsPage so it's visible at a glance.
            Shows current balance, last-updated date with a freshness
            indicator (green ≤7 days, amber >7 days), and an inline
            update form.
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import BaseButton from '@/components/ui/BaseButton.vue';

const budget = useBudgetStore();
const toast  = useToast();

// ─── Edit state ───────────────────────────────────────────────────
const editing    = ref(false);
const inputValue = ref<number>(0);

function openEdit(): void {
  inputValue.value = budget.fundsRemaining;
  editing.value    = true;
}

function cancelEdit(): void {
  editing.value = false;
}

function save(): void {
  const today = new Date().toISOString().split('T')[0];
  budget.setFundsRemaining(inputValue.value, today);
  toast.show('Chequing balance updated.', 'success');
  editing.value = false;
}

// ─── Freshness ────────────────────────────────────────────────────
/** Number of days since the balance was last updated, or null if never. */
const daysSinceUpdate = computed<number | null>(() => {
  if (!budget.fundsRemainingUpdated) return null;
  const updated = new Date(budget.fundsRemainingUpdated + 'T00:00:00');
  const today   = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - updated.getTime()) / 86_400_000);
});

const freshnessClass = computed(() => {
  const d = daysSinceUpdate.value;
  if (d === null) return 'freshness--unknown';
  if (d <= 7)    return 'freshness--fresh';
  return 'freshness--stale';
});

const freshnessLabel = computed(() => {
  const d = daysSinceUpdate.value;
  if (d === null) return 'Never updated';
  if (d === 0)   return 'Updated today';
  if (d === 1)   return 'Updated yesterday';
  return `Updated ${d} days ago`;
});

// ─── Formatting ───────────────────────────────────────────────────
function fmtCAD(n: number): string {
  return n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
}
</script>

<template>
  <div class="chequing-balance">
    <!-- Balance display row -->
    <div class="chq-display">
      <div class="chq-main">
        <span class="chq-label">Current balance</span>
        <span class="chq-amount">{{ fmtCAD(budget.fundsRemaining) }}</span>
      </div>

      <div class="chq-meta">
        <span
          class="freshness"
          :class="freshnessClass"
        >
          <span class="freshness__dot" />
          {{ freshnessLabel }}
        </span>
      </div>
    </div>

    <!-- Inline edit form -->
    <div
      v-if="editing"
      class="chq-form"
    >
      <input
        v-model.number="inputValue"
        type="number"
        min="0"
        step="0.01"
        inputmode="decimal"
        class="chq-input"
        aria-label="New chequing balance"
      >
      <BaseButton
        size="sm"
        @click="save"
      >
        Save
      </BaseButton>
      <BaseButton
        size="sm"
        variant="ghost"
        @click="cancelEdit"
      >
        Cancel
      </BaseButton>
    </div>

    <BaseButton
      v-else
      size="sm"
      variant="outline"
      class="chq-update-btn"
      @click="openEdit"
    >
      Update Balance
    </BaseButton>
  </div>
</template>

<style scoped>
.chequing-balance {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ─── Display row ────────────────────────────────────────────────── */
.chq-display {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chq-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.chq-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.chq-amount {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

/* ─── Freshness indicator ────────────────────────────────────────── */
.chq-meta {
  display: flex;
  align-items: center;
}

.freshness {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--muted);
}

.freshness__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--muted);
}

.freshness--fresh .freshness__dot  { background: var(--accent, #5b3df5); }
.freshness--fresh                  { color: var(--accent, #5b3df5); }

.freshness--stale .freshness__dot  { background: var(--warn, #fbbf24); }
.freshness--stale                  { color: var(--warn, #fbbf24); }

.freshness--unknown .freshness__dot { background: var(--muted); }

/* ─── Edit form ──────────────────────────────────────────────────── */
.chq-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chq-input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.35rem 0.6rem;
  font-size: 0.875rem;
  font-family: inherit;
  height: 32px;
  width: 140px;
}

.chq-input:focus {
  outline: 2px solid var(--accent, #5b3df5);
  outline-offset: 2px;
}

.chq-update-btn {
  align-self: flex-start;
}
</style>
