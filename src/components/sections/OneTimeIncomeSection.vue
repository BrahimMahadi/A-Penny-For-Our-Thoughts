<!--
  Module:   components/sections/OneTimeIncomeSection.vue
  Project:  A Penny For Our Thoughts
  Created:  June 2026 (v2.37.0 — one-time income)
  Summary:  Lists one-time income entries for the current period with
            per-entry edit / delete controls and a running total.
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

// ─── Delete with confirm ──────────────────────────────────────────

const pendingDelete = ref<string | null>(null);

function requestDelete(id: string): void {
  pendingDelete.value = id;
}

function confirmDelete(): void {
  if (!pendingDelete.value) return;
  const entry = budget.oneTimeIncomes.find(i => i.id === pendingDelete.value);
  budget.deleteOneTimeIncome(pendingDelete.value);
  toast.show(`Removed "${entry?.label ?? 'income entry'}".`, 'success');
  pendingDelete.value = null;
}

function cancelDelete(): void {
  pendingDelete.value = null;
}

// ─── Source type display ──────────────────────────────────────────

const TYPE_META: Record<IncomeSourceType, { emoji: string; label: string }> = {
  gift:      { emoji: '🎁', label: 'Gift' },
  freelance: { emoji: '💼', label: 'Freelance' },
  refund:    { emoji: '↩️', label: 'Refund' },
  bonus:     { emoji: '🎉', label: 'Bonus' },
  sale:      { emoji: '🏷️', label: 'Sale' },
  other:     { emoji: '💰', label: 'Other' },
};

function typeEmoji(t: IncomeSourceType): string {
  return TYPE_META[t]?.emoji ?? '💰';
}

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
        No windfall income logged this period yet.
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
      >
        <!-- Left: emoji + details -->
        <div class="oti-section__item-left">
          <span
            class="oti-section__type-badge"
            :title="typeLabel(entry.type)"
          >
            {{ typeEmoji(entry.type) }}
          </span>
          <div class="oti-section__item-details">
            <p class="oti-section__item-label">
              {{ entry.label }}
            </p>
            <p class="oti-section__item-meta">
              {{ typeLabel(entry.type) }} · {{ fmtDate(entry.date) }}
            </p>
            <!-- Allocation chips -->
            <div class="oti-section__alloc-chips">
              <span
                v-if="entry.allocation.needs > 0"
                class="oti-section__chip oti-section__chip--needs"
              >
                🏠 {{ entry.allocation.needs }}% needs ({{ fmt(entry.amount * entry.allocation.needs / 100) }})
              </span>
              <span
                v-if="entry.allocation.wants > 0"
                class="oti-section__chip oti-section__chip--wants"
              >
                🛍 {{ entry.allocation.wants }}% wants ({{ fmt(entry.amount * entry.allocation.wants / 100) }})
              </span>
              <span
                v-if="entry.allocation.savings > 0"
                class="oti-section__chip oti-section__chip--savings"
              >
                🏦 {{ entry.allocation.savings }}% savings ({{ fmt(entry.amount * entry.allocation.savings / 100) }})
              </span>
            </div>
          </div>
        </div>

        <!-- Right: amount + actions -->
        <div class="oti-section__item-right">
          <span class="oti-section__item-amount">
            +{{ fmt(entry.amount) }}
          </span>
          <div class="oti-section__item-actions">
            <button
              class="oti-section__action-btn"
              title="Edit"
              aria-label="Edit income entry"
              @click="openEdit(entry)"
            >
              ✏️
            </button>
            <button
              class="oti-section__action-btn oti-section__action-btn--danger"
              title="Delete"
              aria-label="Delete income entry"
              @click="requestDelete(entry.id)"
            >
              🗑️
            </button>
          </div>
        </div>
      </li>
    </ul>

    <!-- Running total -->
    <div
      v-if="!isEmpty"
      class="oti-section__total"
    >
      <span class="oti-section__total-label">Total windfall this period</span>
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

    <!-- Delete confirmation inline -->
    <div
      v-if="pendingDelete"
      class="oti-section__confirm"
      role="alert"
    >
      <p class="oti-section__confirm-text">
        Remove this income entry? This cannot be undone.
      </p>
      <div class="oti-section__confirm-actions">
        <button
          class="btn-secondary"
          type="button"
          @click="cancelDelete"
        >
          Cancel
        </button>
        <button
          class="btn-danger"
          type="button"
          @click="confirmDelete"
        >
          Remove
        </button>
      </div>
    </div>

    <!-- Add / Edit modal -->
    <OneTimeIncomeModal
      v-model:open="showModal"
      :income="editingEntry"
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
  color: var(--text-muted);
  margin: 0;
}

/* ── List ────────────────────────────────────────────── */
.oti-section__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.oti-section__item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: 0.6rem;
  border: 1px solid var(--border);
  background: var(--surface);
}

.oti-section__item-left {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  flex: 1;
  min-width: 0;
}

.oti-section__type-badge {
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 0.05rem;
}

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
  color: var(--text-muted);
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
  border-radius: 99px;
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

/* ── Right column ────────────────────────────────────── */
.oti-section__item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
  flex-shrink: 0;
}

.oti-section__item-amount {
  font-size: 0.95rem;
  font-weight: 700;
  color: #34d399;
}

.oti-section__item-actions {
  display: flex;
  gap: 0.25rem;
}

.oti-section__action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem;
  font-size: 0.85rem;
  opacity: 0.6;
  transition: opacity 0.15s;
}
.oti-section__action-btn:hover {
  opacity: 1;
}
.oti-section__action-btn--danger:hover {
  color: var(--danger);
}

/* ── Total ───────────────────────────────────────────── */
.oti-section__total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, #34d399 8%, transparent);
  border: 1px solid color-mix(in srgb, #34d399 25%, transparent);
}

.oti-section__total-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.oti-section__total-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: #34d399;
}

/* ── Add button ──────────────────────────────────────── */
.oti-section__add-btn {
  align-self: flex-start;
}

/* ── Delete confirm ──────────────────────────────────── */
.oti-section__confirm {
  padding: 0.75rem;
  border-radius: 0.6rem;
  border: 1px solid var(--danger);
  background: color-mix(in srgb, var(--danger) 8%, transparent);
}

.oti-section__confirm-text {
  font-size: 0.82rem;
  color: var(--text);
  margin: 0 0 0.5rem;
}

.oti-section__confirm-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
