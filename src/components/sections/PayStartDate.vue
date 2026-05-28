<!--
  Module:   components/sections/PayStartDate.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 7)
  Updated:  May 2026 (RS-24) — "Rolls over in N days" countdown + manual
            "Close period now" button. The button is disabled when there's
            nothing to archive (purchases is empty AND the rollover anchor
            is already at the current period start).
  Summary:  Settings card to configure the bi-weekly pay cycle anchor date.
            Reads/writes budget.payStart via setPayStart().
            Shows the computed current period start, next period start,
            countdown to the next rollover, and a manual "Close period now"
            button that delegates to budget.closeCurrentPeriodManually().
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useUiStore } from '@/stores/ui';
import { getCurrentPeriodStart } from '@/utils/calculations';
import BaseButton from '@/components/ui/BaseButton.vue';

const budget = useBudgetStore();
const ui     = useUiStore();
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

// ─── RS-24: Countdown to next rollover ───────────────────────────────────────
/**
 * Whole-day countdown to the next bi-weekly rollover. Computed from the
 * current period start + 14 days, minus today (both normalised to midnight
 * to avoid time-of-day skew).
 *
 * - null when payStart is unconfigured
 * - 0 means "rolls over today"
 * - Negative values can occur briefly if today is past the period end but
 *   the rollover hasn't fired yet; we clamp to 0 in the display label.
 */
const daysUntilRollover = computed<number | null>(() => {
  if (!periodStart.value) return null;
  const next = new Date(periodStart.value + 'T00:00:00');
  next.setDate(next.getDate() + 14);
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const ms = next.getTime() - t.getTime();
  return Math.floor(ms / 86400000);
});

const rolloverCountdownLabel = computed<string | null>(() => {
  const d = daysUntilRollover.value;
  if (d === null) return null;
  if (d <= 0)  return 'today';
  if (d === 1) return '1 day';
  return `${d} days`;
});

/** True when the countdown is in the "imminent" window (≤ 2 days). */
const rolloverImminent = computed<boolean>(() => {
  const d = daysUntilRollover.value;
  return d !== null && d <= 2;
});

// ─── RS-24: Manual "Close period now" ────────────────────────────────────────
/**
 * The button is disabled when there's nothing meaningful to do — either
 * payStart isn't configured, OR there are no purchases AND the rollover
 * anchor is already at (or past) the current period start. In the latter
 * case, the current period is already a clean slate; clicking "Close"
 * would only stack an empty archive.
 */
const canManualClose = computed<boolean>(() => {
  if (!budget.payStart) return false;
  if (budget.purchases.length > 0) return true;
  // No purchases — only allow closing if the user hasn't already cleared
  // this window. lastArchivedPeriodStart === currentPeriodStart means
  // "first-run anchor set, nothing archived yet" — let the user close to
  // generate a contiguous empty archive if they want.
  if (!budget.lastArchivedPeriodStart) return false;
  if (!periodStart.value) return false;
  // If the anchor is already advanced past the current period start,
  // a manual close would be a no-op or stack an empty.
  return budget.lastArchivedPeriodStart <= periodStart.value;
});

function manualClose(): void {
  if (!canManualClose.value) return;
  const itemCount = budget.purchases.length;
  const msg = itemCount > 0
    ? `Close this pay period? ${itemCount} purchase${itemCount === 1 ? '' : 's'} will be archived to Spending History and budgets will reset.`
    : 'Close this empty pay period? An empty entry will be added to Spending History and the next period will begin.';
  if (!window.confirm(msg)) return;

  const archived = budget.closeCurrentPeriodManually(new Date());
  if (!archived) {
    toast.show('Nothing to close — this period is already archived.', 'info');
    return;
  }
  // Snap the Schedule nav to the new current period (mirrors auto-rollover).
  ui.resetToCurrentPayPeriod();
  toast.show('Pay period closed — new period started.', 'success');
}

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
      <!-- RS-24: countdown to rollover -->
      <div
        v-if="rolloverCountdownLabel"
        class="pay-start__preview-item pay-start__preview-item--countdown"
        :class="{ 'pay-start__preview-item--imminent': rolloverImminent }"
        data-testid="rollover-countdown"
      >
        <span
          class="pay-start__preview-dot"
          :class="rolloverImminent ? 'pay-start__preview-dot--imminent' : 'pay-start__preview-dot--countdown'"
        />
        <span class="pay-start__preview-key">Rolls over in</span>
        <span class="pay-start__preview-val">{{ rolloverCountdownLabel }}</span>
      </div>
    </div>

    <!-- RS-24: manual close affordance -->
    <div
      v-if="budget.payStart"
      class="pay-start__manual-close"
    >
      <BaseButton
        size="sm"
        variant="secondary"
        :disabled="!canManualClose"
        data-testid="close-period-btn"
        :title="canManualClose
          ? 'Archive the current period now and start the next'
          : 'Nothing to close — the current period is already a clean slate'"
        @click="manualClose"
      >
        Close period now
      </BaseButton>
      <span class="pay-start__manual-close-hint">
        Auto-rollover handles this for you when a period naturally ends — this is for the rare case
        where you want to force the period to close early.
      </span>
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
  padding: 0.65rem 0.85rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 10px;
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

.pay-start__preview-dot--current  { background: var(--accent, #5b3df5); }
.pay-start__preview-dot--next     { background: var(--muted, #8b8b95); }
.pay-start__preview-dot--countdown { background: var(--accent2-text, #4d7c0f); }
.pay-start__preview-dot--imminent  {
  background: var(--warn, #f59e0b);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--warn, #f59e0b) 25%, transparent);
}

/* Countdown row — emphasised when imminent (≤ 2 days) */
.pay-start__preview-item--countdown { padding-top: 0.2rem; }
.pay-start__preview-item--imminent .pay-start__preview-val {
  color: var(--warn, #f59e0b);
  font-weight: 700;
}

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
  padding: 0.75rem 0.85rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
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
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  padding: 0.35rem 0.6rem;
  font-size: 0.875rem;
  font-family: inherit;
  height: 32px;
  color-scheme: dark light;
  transition: border-color var(--transition-fast);
}

.pay-start__date-input:focus {
  outline: 2px solid var(--accent, #5b3df5);
  outline-offset: 2px;
}

/* ─── RS-24: Manual close affordance ─────────────────────────────── */
.pay-start__manual-close {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.65rem 0.85rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.pay-start__manual-close-hint {
  font-size: 0.75rem;
  color: var(--muted);
  line-height: 1.4;
  max-width: 56ch;
}
</style>
