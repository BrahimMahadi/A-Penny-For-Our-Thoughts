<!--
  Module:   components/sections/OneTimeIncomeSection.vue
  Project:  A Penny For Our Thoughts
  Created:  June 2026 (v2.37.0 — one-time income)
  Modified: June 2026 — row UX redesigned to match purchases table:
              click row → opens edit modal; delete via modal Remove button.
  Summary:  Lists one-time income entries for the current period with
            click-to-edit rows and a running total.
            Used in both SpendingPage and SettingsPage.
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { fmt } from '@/utils/format';
import OneTimeIncomeModal from '@/components/modals/OneTimeIncomeModal.vue';
import type { OneTimeIncome, IncomeSourceType } from '@/types/budget';

const budget = useBudgetStore();
const toast  = useToast();

// ─── Modal state ──────────────────────────────────────────────────

const showModal    = ref(false);
const editingEntry = ref<OneTimeIncome | null>(null);

function openAdd(): void {
  editingEntry.value = null;
  showModal.value    = true;
}

function openEdit(entry: OneTimeIncome): void {
  editingEntry.value = entry;
  showModal.value    = true;
}

// ─── Delete — triggered by the modal's Remove button ─────────────

function handleDelete(): void {
  if (!editingEntry.value) return;
  const entry = editingEntry.value;
  if (!window.confirm(`Remove "${entry.label}"?`)) return;
  budget.deleteOneTimeIncome(entry.id);
  toast.show(`Removed "${entry.label}".`, 'success');
  showModal.value    = false;
  editingEntry.value = null;
}

// ─── Source type display ──────────────────────────────────────────

const TYPE_META: Record<IncomeSourceType, { label: string }> = {
  gift:      { label: 'Gift' },
  freelance: { label: 'Freelance' },
  refund:    { label: 'Refund' },
  bonus:     { label: 'Bonus' },
  sale:      { label: 'Sale' },
  other:     { label: 'Other' },
};

function typeLabel(t: IncomeSourceType): string {
  return TYPE_META[t]?.label ?? 'Other';
}

// ─── Derived data ─────────────────────────────────────────────────

const entries = computed(() => budget.currentPeriodIncomes);
const total   = computed(() => budget.currentPeriodWindfallTotal);
const isEmpty = computed(() => entries.value.length === 0);

/** Format a short date string for display (e.g. "Jun 3"). */
function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-CA', {
    month: 'short',
    day:   'numeric',
  });
}
</script>

<template>
  <div class="oti-section">

    <!-- Empty state -->
    <div
      v-if="isEmpty"
      class="oti-section__empty"
    >
      <p class="oti-section__empty-text">
        No additional income logged this period yet.
      </p>
    </div>

    <!-- Entry list -->
    <ul
      v-else
      class="oti-section__list"
    >
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="oti-section__item"
        role="button"
        tabindex="0"
        :aria-label="`Edit income entry: ${entry.label}`"
        @click="openEdit(entry)"
        @keydown.enter.prevent="openEdit(entry)"
        @keydown.space.prevent="openEdit(entry)"
      >
        <!-- Details -->
        <div class="oti-section__item-details">
          <p class="oti-section__item-label">
            {{ entry.label }}
          </p>
          <p class="oti-section__item-meta">
            {{ typeLabel(entry.type) }} · {{ fmtDate(entry.date) }}
          </p>
          <!-- Allocation chips (no emojis) -->
          <div class="oti-section__alloc-chips">
            <span
              v-if="entry.allocation.needs > 0"
              class="oti-section__chip oti-section__chip--needs"
            >
              {{ entry.allocation.needs }}% needs ({{ fmt(entry.amount * entry.allocation.needs / 100) }})
            </span>
            <span
              v-if="entry.allocation.wants > 0"
              class="oti-section__chip oti-section__chip--wants"
            >
              {{ entry.allocation.wants }}% wants ({{ fmt(entry.amount * entry.allocation.wants / 100) }})
            </span>
            <span
              v-if="entry.allocation.savings > 0"
              class="oti-section__chip oti-section__chip--savings"
            >
              {{ entry.allocation.savings }}% savings ({{ fmt(entry.amount * entry.allocation.savings / 100) }})
            </span>
          </div>
        </div>

        <!-- Amount -->
        <span class="oti-section__item-amount">
          +{{ fmt(entry.amount) }}
        </span>
      </li>
    </ul>

    <!-- Running total -->
    <div
      v-if="!isEmpty"
      class="oti-section__total"
    >
      <span class="oti-section__total-label">Total additional income this period</span>
      <span class="oti-section__total-value">+{{ fmt(total) }}</span>
    </div>

    <!-- Add button -->
    <button
      class="btn-secondary oti-section__add-btn"
      type="button"
      @click="openAdd"
    >
      <span aria-hidden="true">+</span> Log income
    </button>

    <!-- Add / Edit modal -->
    <OneTimeIncomeModal
      v-model:open="showModal"
      :income="editingEntry"
      @delete="handleDelete"
    />
  </div>
</template>

<style scoped>
.oti-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ── Empty ───────────────────────────────────────────── */
.oti-section__empty {
  padding: 1rem;
  text-align: center;
}
.oti-section__empty-text {
  font-size: 0.85rem;
  color: var(--muted);
  margin: 0;
}

/* ── List ────────────────────────────────────────────── */
.oti-section__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Row — matches purchase-row--clickable pattern ───── */
.oti-section__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.oti-section__item:last-child {
  border-bottom: none;
}

.oti-section__item:hover {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
  box-shadow: inset 3px 0 0 var(--accent);
}

.oti-section__item:focus-visible {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  box-shadow: inset 3px 0 0 var(--accent);
  outline: none;
}

/* ── Item details ────────────────────────────────────── */
.oti-section__item-details {
  flex: 1;
  min-width: 0;
}

.oti-section__item-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.oti-section__item-meta {
  font-size: 0.73rem;
  color: var(--muted);
  margin: 0 0 0.35rem;
}

/* ── Allocation chips ────────────────────────────────── */
.oti-section__alloc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.oti-section__chip {
  font-size: 0.68rem;
  font-weight: 500;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.oti-section__chip--needs {
  background: color-mix(in srgb, #60a5fa 12%, transparent);
  color: #60a5fa;
}
.oti-section__chip--wants {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}
.oti-section__chip--savings {
  background: color-mix(in srgb, #34d399 12%, transparent);
  color: #34d399;
}

/* ── Amount ──────────────────────────────────────────── */
.oti-section__item-amount {
  font-size: 0.95rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: #34d399;
  flex-shrink: 0;
}

/* ── Total ───────────────────────────────────────────── */
.oti-section__total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  background: color-mix(in srgb, #34d399 8%, transparent);
  border: 1px solid color-mix(in srgb, #34d399 25%, transparent);
}

.oti-section__total-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
}

.oti-section__total-value {
  font-size: 0.95rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: #34d399;
}

/* ── Add button ──────────────────────────────────────── */
.oti-section__add-btn {
  align-self: flex-start;
}

/* ── btn-secondary co-located for Teleport delivery ─── */
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 1rem;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}
.btn-secondary:hover { background: var(--surface2); }
</style>
