<!--
  Module:   components/sections/PayStartDate.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 7)
  Summary:  Settings card to configure the bi-weekly pay cycle anchor date.
            Reads/writes budget.payStart via setPayStart().
            Shows the computed current period start and next period start.
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { getCurrentPeriodStart } from '@/utils/calculations';
import BaseButton from '@/components/ui/BaseButton.vue';

const budget = useBudgetStore();
const toast  = useToast();

const today = new Date();

// ─── Derived period info ──────────────────────────────────────────────────────
const periodStart = computed(() => getCurrentPeriodStart(budget.$state, today));

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-CA', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    year:    'numeric',
  });
}

const currentPeriodLabel = computed(() =>
  periodStart.value ? fmtDate(periodStart.value) : null,
);

const nextPeriodLabel = computed(() =>
  periodStart.value ? fmtDate(addDays(periodStart.value, 14)) : null,
);

// ─── Edit form ────────────────────────────────────────────────────────────────
const editing = ref(false);
const draftDate = ref<string>('');

function openEdit(): void {
  draftDate.value = budget.payStart ?? '';
  editing.value = true;
}

function cancelEdit(): void {
  editing.value = false;
  draftDate.value = '';
}

function saveEdit(): void {
  const val = draftDate.value.trim();
  if (!val) {
    toast.show('Please choose a date.', 'warning');
    return;
  }
  budget.setPayStart(val);
  toast.show('Pay start date updated.', 'success');
  editing.value = false;
}

function clearDate(): void {
  budget.setPayStart(null);
  toast.show('Pay start date cleared.', 'success');
}
</script>

<template>
  <div class="pay-start">
    <!-- Current status row -->
    <div class="pay-start__status">
      <div class="pay-start__info">
        <div class="pay-start__label">
          Current pay cycle anchor
        </div>
        <div
          v-if="budget.payStart"
          class="pay-start__value"
        >
          {{ fmtDate(budget.payStart) }}
        </div>
        <div
          v-else
          class="pay-start__unset"
        >
          Not configured — Wants Tracker periods won't track correctly until this is set.
        </div>
      </div>

      <div class="pay-start__actions">
        <BaseButton
          size="sm"
          variant="outline"
          @click="openEdit"
        >
          {{ budget.payStart ? 'Change' : 'Set Date' }}
        </BaseButton>
        <BaseButton
          v-if="budget.payStart"
          size="sm"
          variant="ghost"
          @click="clearDate"
        >
          Clear
        </BaseButton>
      </div>
    </div>

    <!-- Period preview (only when configured) -->
    <div
      v-if="budget.payStart && currentPeriodLabel && nextPeriodLabel"
      class="pay-start__preview"
    >
      <div class="pay-start__preview-item">
        <span class="pay-start__preview-dot pay-start__preview-dot--current" />
        <span class="pay-start__preview-key">Current period starts</span>
        <span class="pay-start__preview-val">{{ currentPeriodLabel }}</span>
      </div>
      <div class="pay-start__preview-item">
        <span class="pay-start__preview-dot pay-start__preview-dot--next" />
        <span class="pay-start__preview-key">Next period starts</span>
        <span class="pay-start__preview-val">{{ nextPeriodLabel }}</span>
      </div>
    </div>

    <!-- Inline edit form -->
    <div
      v-if="editing"
      class="pay-start__form"
    >
      <label
        class="pay-start__form-label"
        for="pay-start-date-input"
      >
        Select a recent pay date (the cycle repeats every 14 days from this anchor):
      </label>
      <div class="pay-start__form-row">
        <input
          id="pay-start-date-input"
          v-model="draftDate"
          type="date"
          class="pay-start__date-input"
          aria-label="Pay start date"
        >
        <BaseButton
          size="sm"
          @click="saveEdit"
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
    </div>
  </div>
</template>

<style scoped>
.pay-start {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ─── Status row ─────────────────────────────────────────────────── */
.pay-start__status {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.pay-start__info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.pay-start__label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.pay-start__value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

.pay-start__unset {
  font-size: 0.85rem;
  color: var(--warn, #f59e0b);
  max-width: 38ch;
  line-height: 1.45;
}

.pay-start__actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

/* ─── Period preview ─────────────────────────────────────────────── */
.pay-start__preview {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.6rem 0.75rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.82rem;
}

.pay-start__preview-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pay-start__preview-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pay-start__preview-dot--current { background: var(--accent, #4ade80); }
.pay-start__preview-dot--next    { background: var(--muted, #5a7a63); }

.pay-start__preview-key {
  color: var(--muted);
  width: 16ch;
  flex-shrink: 0;
}

.pay-start__preview-val {
  font-weight: 600;
  color: var(--text);
}

/* ─── Inline edit form ───────────────────────────────────────────── */
.pay-start__form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.pay-start__form-label {
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.4;
}

.pay-start__form-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pay-start__date-input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.35rem 0.6rem;
  font-size: 0.875rem;
  font-family: inherit;
  height: 32px;
  color-scheme: dark light;
}

.pay-start__date-input:focus {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}
</style>
