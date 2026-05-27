<!--
  Module:   components/sections/BudgetAllocation.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Updated:  May 2026 (RS-7) — replaced modal with inline range sliders;
            Needs + Wants are independently adjustable, Savings is
            auto-calculated as the remainder. A Save row appears whenever
            the draft differs from the stored allocation.
  Summary:  Three allocation stat cards (Needs / Wants / Savings) with
            monthly/bi-weekly toggle and inline sliders for live editing.
-->

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useAnalytics } from '@/composables/useAnalytics';
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

// ─── Draft allocation (inline sliders) ───────────────────────────
const draftNeeds = ref(budget.allocation.needs);
const draftWants = ref(budget.allocation.wants);

/** Savings is always the remainder; always >= 0 because sliders are clamped. */
const draftSavings = computed(() => 100 - draftNeeds.value - draftWants.value);

/** Max value for the Needs slider — keeps Savings >= 0 */
const needsMax = computed(() => 100 - draftWants.value);

/** Max value for the Wants slider — keeps Savings >= 0 */
const wantsMax = computed(() => 100 - draftNeeds.value);

/**
 * When Needs changes, re-clamp Wants so Savings never goes below 0.
 * We wait for next tick so the model binding settles first.
 */
watch(draftNeeds, (newNeeds) => {
  if (newNeeds + draftWants.value > 100) {
    draftWants.value = 100 - newNeeds;
  }
});

watch(draftWants, (newWants) => {
  if (draftNeeds.value + newWants > 100) {
    draftNeeds.value = 100 - newWants;
  }
});

const isDirty = computed(() =>
  draftNeeds.value   !== budget.allocation.needs   ||
  draftWants.value   !== budget.allocation.wants   ||
  draftSavings.value !== budget.allocation.savings,
);

function saveDraft(): void {
  budget.setAllocation({
    needs:   draftNeeds.value,
    wants:   draftWants.value,
    savings: draftSavings.value,
  });
  toast.show('Budget allocation saved.', 'success');
}

function resetDraft(): void {
  draftNeeds.value = budget.allocation.needs;
  draftWants.value = budget.allocation.wants;
}

// Sync draft when the store changes externally (e.g. JSON import, clearAll)
watch(() => budget.allocation, (a) => {
  draftNeeds.value = a.needs;
  draftWants.value = a.wants;
}, { deep: true });

// ─── Allocation amounts ───────────────────────────────────────────
const needsAmt = computed(() => {
  const mo = totalMonthlyIncome.value * (draftNeeds.value / 100);
  return displayMode.value === 'biweekly' ? mo / 2 : mo;
});

const wantsAmt = computed(() => {
  const mo = totalMonthlyIncome.value * (draftWants.value / 100);
  return displayMode.value === 'biweekly' ? mo / 2 : mo;
});

const savingsAmt = computed(() => {
  const mo = totalMonthlyIncome.value * (draftSavings.value / 100);
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
    </div>

    <!-- Three allocation slider-cards -->
    <div class="alloc-cards">
      <!-- Needs -->
      <div class="alloc-card alloc-card--needs">
        <div class="alloc-card__pct">
          {{ draftNeeds }}%
        </div>
        <div class="alloc-card__label">
          Needs
        </div>
        <div class="alloc-card__amount">
          {{ fmt(needsAmt) }}{{ suffix }}
        </div>
        <input
          v-model.number="draftNeeds"
          type="range"
          min="0"
          :max="needsMax"
          step="1"
          class="alloc-slider alloc-slider--needs"
          :aria-label="`Needs allocation: ${draftNeeds}%`"
        >
      </div>

      <!-- Wants -->
      <div class="alloc-card alloc-card--wants">
        <div class="alloc-card__pct">
          {{ draftWants }}%
        </div>
        <div class="alloc-card__label">
          Wants
        </div>
        <div class="alloc-card__amount">
          {{ fmt(wantsAmt) }}{{ suffix }}
        </div>
        <input
          v-model.number="draftWants"
          type="range"
          min="0"
          :max="wantsMax"
          step="1"
          class="alloc-slider alloc-slider--wants"
          :aria-label="`Wants allocation: ${draftWants}%`"
        >
      </div>

      <!-- Savings (auto-calculated) -->
      <div class="alloc-card alloc-card--savings">
        <div class="alloc-card__pct">
          {{ draftSavings }}%
        </div>
        <div class="alloc-card__label">
          Savings
        </div>
        <div class="alloc-card__amount">
          {{ fmt(savingsAmt) }}{{ suffix }}
        </div>
        <div class="alloc-slider-auto">
          Auto
        </div>
      </div>
    </div>

    <!-- Segmented progress bar -->
    <div
      class="alloc-bar"
      role="img"
      :aria-label="`Needs ${draftNeeds}%, Wants ${draftWants}%, Savings ${draftSavings}%`"
    >
      <div
        class="alloc-bar__segment alloc-bar__segment--needs"
        :style="{ width: `${draftNeeds}%` }"
      />
      <div
        class="alloc-bar__segment alloc-bar__segment--wants"
        :style="{ width: `${draftWants}%` }"
      />
      <div
        class="alloc-bar__segment alloc-bar__segment--savings"
        :style="{ width: `${draftSavings}%` }"
      />
    </div>

    <!-- Save row (visible when draft differs from saved allocation) -->
    <div
      v-if="isDirty"
      class="alloc-save-row"
    >
      <span class="alloc-save-hint">Unsaved changes</span>
      <div class="alloc-save-actions">
        <BaseButton
          size="sm"
          variant="ghost"
          @click="resetDraft"
        >
          Cancel
        </BaseButton>
        <BaseButton
          size="sm"
          @click="saveDraft"
        >
          Save
        </BaseButton>
      </div>
    </div>

    <!-- Needs remaining hint -->
    <p
      v-if="totalMonthlyIncome > 0"
      class="alloc-hint"
      :class="{ 'alloc-hint--danger': needsRemaining < 0 }"
    >
      {{ fundsLabel }}
    </p>
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
  color: #fff;
  border-color: var(--accent);
}

/* ─── Allocation cards ───────────────────────────────────────────── */
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
  padding: 0.85rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface2);
  text-align: center;
  border-top-width: 3px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.alloc-card--needs   { border-top-color: var(--accent); }
.alloc-card--wants   { border-top-color: var(--accent2); }
.alloc-card--savings { border-top-color: var(--warn); }

.alloc-card__pct {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.alloc-card--needs .alloc-card__pct   { color: var(--accent); }
.alloc-card--wants .alloc-card__pct   { color: var(--accent2-text); }
.alloc-card--savings .alloc-card__pct { color: var(--warn); }

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

/* ─── Range sliders ─────────────────────────────────────────────── */
.alloc-slider {
  width: 100%;
  margin-top: 0.55rem;
  height: 4px;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  outline: none;
}

/* Track */
.alloc-slider::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: var(--border);
}
.alloc-slider::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: var(--border);
}

/* Thumb */
.alloc-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--surface);
  margin-top: -6px;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.alloc-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--surface);
  cursor: pointer;
}
.alloc-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

/* Color the thumb per category */
.alloc-slider--needs::-webkit-slider-thumb { background: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent); }
.alloc-slider--needs::-moz-range-thumb     { background: var(--accent); }
.alloc-slider--wants::-webkit-slider-thumb { background: var(--accent2); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent2) 20%, transparent); }
.alloc-slider--wants::-moz-range-thumb     { background: var(--accent2); }

/* Auto label for savings (no slider) */
.alloc-slider-auto {
  margin-top: 0.85rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.1rem 0.55rem;
}

/* ─── Segmented bar ─────────────────────────────────────────────── */
.alloc-bar {
  height: 10px;
  border-radius: 5px;
  display: flex;
  overflow: hidden;
  background: var(--surface2);
  border: 1px solid var(--border);
  gap: 2px;
}

.alloc-bar__segment {
  height: 100%;
  border-radius: 2px;
  transition: width 0.25s ease;
}

.alloc-bar__segment--needs   { background: var(--accent); }
.alloc-bar__segment--wants   { background: var(--accent2); }
.alloc-bar__segment--savings { background: var(--warn); }

/* ─── Save row ──────────────────────────────────────────────────── */
.alloc-save-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  background: color-mix(in srgb, var(--accent) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  border-radius: 8px;
  animation: fade-in 0.15s ease;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.alloc-save-hint {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--accent);
}

.alloc-save-actions {
  display: flex;
  gap: 0.4rem;
}

/* ─── Needs remaining hint ──────────────────────────────────────── */
.alloc-hint {
  font-size: 0.8rem;
  color: var(--muted);
  margin: 0;
  text-align: center;
}

.alloc-hint--danger {
  color: var(--danger);
}
</style>
