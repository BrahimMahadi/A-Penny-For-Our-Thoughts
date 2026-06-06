<!--
  Module:   components/modals/OneTimeIncomeModal.vue
  Project:  A Penny For Our Thoughts
  Created:  June 2026 (v2.37.0 — one-time income)
  Summary:  Add / edit a one-time income entry. Allocation defaults to the
            user's 50/30/20 split; each bucket is individually adjustable
            and locked so the three values always sum to 100.
-->

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useFormValidation, rules } from '@/composables/useFormValidation';
import { getCurrentPeriodStart } from '@/utils/calculations';
import { fmt } from '@/utils/format';
import BaseModal from '@/components/ui/BaseModal.vue';
import type { OneTimeIncome, IncomeSourceType, IncomeAllocation } from '@/types/budget';

// ─── Props / emits ────────────────────────────────────────────────

interface Props {
  open: boolean;
  /** When provided the modal edits the existing entry; otherwise it adds a new one. */
  income?: OneTimeIncome | null;
  /** ISO date string for today's date — injected so tests can override. */
  today?: string;
}

const props = withDefaults(defineProps<Props>(), {
  income: null,
  today: () => new Date().toISOString().split('T')[0],
});

const emit = defineEmits<{
  'update:open': [value: boolean];
  saved: [];
}>();

// ─── Store / composables ──────────────────────────────────────────

const budget = useBudgetStore();
const toast  = useToast();

// ─── Income source types ──────────────────────────────────────────

const SOURCE_TYPES: { value: IncomeSourceType; label: string; emoji: string }[] = [
  { value: 'gift',      label: 'Gift',       emoji: '🎁' },
  { value: 'freelance', label: 'Freelance',  emoji: '💼' },
  { value: 'refund',    label: 'Refund',     emoji: '↩️' },
  { value: 'bonus',     label: 'Bonus',      emoji: '🎉' },
  { value: 'sale',      label: 'Sale',       emoji: '🏷️' },
  { value: 'other',     label: 'Other',      emoji: '💰' },
];

// ─── Form state ───────────────────────────────────────────────────

const label     = ref('');
const amount    = ref('');
const date      = ref('');
const type      = ref<IncomeSourceType>('other');
const allocNeeds   = ref(0);
const allocWants   = ref(0);
const allocSavings = ref(0);

/** True when the user has manually touched an allocation field. */
const allocDirty = ref(false);

const isEditMode = computed(() => props.income !== null);

/** Dollar amounts derived from the current allocation percentages. */
const allocNeedsDollars   = computed(() => ((parseFloat(amount.value) || 0) * allocNeeds.value   / 100));
const allocWantsDollars   = computed(() => ((parseFloat(amount.value) || 0) * allocWants.value   / 100));
const allocSavingsDollars = computed(() => ((parseFloat(amount.value) || 0) * allocSavings.value / 100));

const allocTotal = computed(() => allocNeeds.value + allocWants.value + allocSavings.value);
const allocValid = computed(() => allocTotal.value === 100);

// ─── Date bounds: current period only ────────────────────────────

const periodDateMin = computed((): string => {
  if (!budget.payStart) return props.today;
  return getCurrentPeriodStart(budget.$state, new Date(props.today + 'T00:00:00')) ?? props.today;
});

const periodDateMax = computed((): string => props.today);

// ─── Validation ───────────────────────────────────────────────────

const validation = useFormValidation(() => ({
  label:  rules.required(label.value, 'Label'),
  amount: rules.positiveNumber(parseFloat(amount.value) || 0, 'Amount'),
}));

// ─── Allocation helpers ───────────────────────────────────────────

/** Seed allocation from the user's current 50/30/20 split. */
function seedAllocation(): void {
  allocNeeds.value   = budget.allocation.needs;
  allocWants.value   = budget.allocation.wants;
  allocSavings.value = budget.allocation.savings;
  allocDirty.value = false;
}

/**
 * When the user edits one bucket, auto-redistribute the remainder evenly
 * between the other two so the total stays at 100.
 */
function onAllocChange(changed: 'needs' | 'wants' | 'savings', raw: string): void {
  allocDirty.value = true;
  let val = Math.max(0, Math.min(100, parseInt(raw, 10) || 0));

  if (changed === 'needs') {
    allocNeeds.value = val;
    const rest = 100 - val;
    const w = Math.round(rest / 2);
    allocWants.value   = w;
    allocSavings.value = rest - w;
  } else if (changed === 'wants') {
    allocWants.value = val;
    const rest = 100 - val;
    const n = Math.round(rest / 2);
    allocNeeds.value   = n;
    allocSavings.value = rest - n;
  } else {
    allocSavings.value = val;
    const rest = 100 - val;
    const n = Math.round(rest / 2);
    allocNeeds.value = n;
    allocWants.value = rest - n;
  }
}

// ─── Open / reset ─────────────────────────────────────────────────

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    validation.reset();
    allocDirty.value = false;

    if (props.income) {
      // Edit mode — populate from existing entry
      label.value          = props.income.label;
      amount.value         = String(props.income.amount);
      date.value           = props.income.date;
      type.value           = props.income.type;
      allocNeeds.value     = props.income.allocation.needs;
      allocWants.value     = props.income.allocation.wants;
      allocSavings.value   = props.income.allocation.savings;
    } else {
      // Add mode — clear form, seed allocation from current split
      label.value  = '';
      amount.value = '';
      date.value   = props.today;
      type.value   = 'other';
      seedAllocation();
    }
  },
  { immediate: true },
);

// ─── Submit ───────────────────────────────────────────────────────

function submit(): void {
  validation.touchAll();
  if (!validation.isValid.value || !allocValid.value) return;

  const allocation: IncomeAllocation = {
    needs:   allocNeeds.value,
    wants:   allocWants.value,
    savings: allocSavings.value,
  };

  if (isEditMode.value && props.income) {
    budget.updateOneTimeIncome(props.income.id, {
      label:      label.value.trim(),
      amount:     parseFloat(amount.value),
      date:       date.value,
      type:       type.value,
      allocation,
    });
    toast.show(`Updated "${label.value.trim()}".`, 'success');
  } else {
    const entry = budget.addOneTimeIncome({
      label:      label.value.trim(),
      amount:     parseFloat(amount.value),
      date:       date.value,
      type:       type.value,
      allocation,
    });
    toast.show(`Added ${fmt(entry.amount)} windfall income.`, 'success');
  }

  emit('update:open', false);
  emit('saved');
}

function close(): void {
  emit('update:open', false);
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="isEditMode ? 'Edit income' : 'Log windfall income'"
    size="sm"
    @update:open="$emit('update:open', $event)"
  >
    <div class="oti-form">
      <p class="oti-form__eyebrow">
        ONE-TIME INCOME
      </p>

      <!-- Type selector -->
      <label class="oti-form__label">Income type</label>
      <div class="oti-form__type-row">
        <button
          v-for="src in SOURCE_TYPES"
          :key="src.value"
          class="oti-form__type-btn"
          :class="{ 'oti-form__type-btn--active': type === src.value }"
          type="button"
          @click="type = src.value"
        >
          <span aria-hidden="true">{{ src.emoji }}</span>
          {{ src.label }}
        </button>
      </div>

      <!-- Label -->
      <label class="oti-form__label">Description</label>
      <input
        v-model="label"
        class="oti-form__input"
        :class="{ 'form-input--error': validation.errors.value.label }"
        placeholder='e.g. "E-transfer from Dad"'
        @blur="validation.touch('label')"
        @keydown.enter="submit"
        @keydown.esc="close"
      >
      <p
        v-if="validation.errors.value.label"
        class="oti-form__field-error"
      >
        {{ validation.errors.value.label }}
      </p>

      <!-- Amount -->
      <label class="oti-form__label">Amount</label>
      <div class="oti-form__amount-wrap">
        <span class="oti-form__dollar">$</span>
        <input
          v-model="amount"
          class="oti-form__input oti-form__input--amount"
          :class="{ 'form-input--error': validation.errors.value.amount }"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          @blur="validation.touch('amount')"
          @keydown.enter="submit"
          @keydown.esc="close"
        >
      </div>
      <p
        v-if="validation.errors.value.amount"
        class="oti-form__field-error"
      >
        {{ validation.errors.value.amount }}
      </p>

      <!-- Date (current period only) -->
      <label class="oti-form__label">Date received</label>
      <input
        v-model="date"
        class="oti-form__input"
        type="date"
        :min="periodDateMin"
        :max="periodDateMax"
      >

      <!-- Allocation -->
      <div class="oti-form__alloc-header">
        <span class="oti-form__label">Budget allocation</span>
        <span
          class="oti-form__alloc-total"
          :class="{ 'oti-form__alloc-total--invalid': !allocValid }"
        >
          {{ allocTotal }}% total
        </span>
      </div>
      <p class="oti-form__alloc-hint">
        How should this income boost your envelopes?
      </p>

      <div class="oti-form__alloc-grid">
        <!-- Needs -->
        <div class="oti-form__alloc-row">
          <div class="oti-form__alloc-label-wrap">
            <span class="oti-form__alloc-emoji">🏠</span>
            <span class="oti-form__alloc-name">Needs</span>
          </div>
          <div class="oti-form__alloc-controls">
            <input
              :value="allocNeeds"
              class="oti-form__alloc-input"
              type="number"
              min="0"
              max="100"
              step="1"
              aria-label="Needs allocation percentage"
              @change="onAllocChange('needs', ($event.target as HTMLInputElement).value)"
            >
            <span class="oti-form__alloc-pct">%</span>
            <span class="oti-form__alloc-dollars">{{ fmt(allocNeedsDollars) }}</span>
          </div>
        </div>

        <!-- Wants -->
        <div class="oti-form__alloc-row">
          <div class="oti-form__alloc-label-wrap">
            <span class="oti-form__alloc-emoji">🛍</span>
            <span class="oti-form__alloc-name">Wants</span>
          </div>
          <div class="oti-form__alloc-controls">
            <input
              :value="allocWants"
              class="oti-form__alloc-input"
              type="number"
              min="0"
              max="100"
              step="1"
              aria-label="Wants allocation percentage"
              @change="onAllocChange('wants', ($event.target as HTMLInputElement).value)"
            >
            <span class="oti-form__alloc-pct">%</span>
            <span class="oti-form__alloc-dollars">{{ fmt(allocWantsDollars) }}</span>
          </div>
        </div>

        <!-- Savings -->
        <div class="oti-form__alloc-row">
          <div class="oti-form__alloc-label-wrap">
            <span class="oti-form__alloc-emoji">🏦</span>
            <span class="oti-form__alloc-name">Savings</span>
          </div>
          <div class="oti-form__alloc-controls">
            <input
              :value="allocSavings"
              class="oti-form__alloc-input"
              type="number"
              min="0"
              max="100"
              step="1"
              aria-label="Savings allocation percentage"
              @change="onAllocChange('savings', ($event.target as HTMLInputElement).value)"
            >
            <span class="oti-form__alloc-pct">%</span>
            <span class="oti-form__alloc-dollars">{{ fmt(allocSavingsDollars) }}</span>
          </div>
        </div>
      </div>

      <p
        v-if="allocDirty && !allocValid"
        class="oti-form__field-error"
      >
        Allocation must add up to 100% (currently {{ allocTotal }}%)
      </p>

      <!-- Footer -->
      <div class="oti-form__footer">
        <button
          class="btn-secondary"
          type="button"
          @click="close"
        >
          Cancel
        </button>
        <button
          class="btn-primary"
          type="button"
          :disabled="!validation.isValid.value || !allocValid"
          @click="submit"
        >
          {{ isEditMode ? 'Save changes' : 'Add income' }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.oti-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.oti-form__eyebrow {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--accent);
  margin: 0 0 0.25rem;
}

.oti-form__label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
}

.oti-form__input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 0.5rem;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.9rem;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.oti-form__input:focus {
  outline: none;
  border-color: var(--accent);
}
.oti-form__input.form-input--error {
  border-color: var(--danger);
}

.oti-form__field-error {
  font-size: 0.75rem;
  color: var(--danger);
  margin: 0.1rem 0 0;
}

.oti-form__amount-wrap {
  position: relative;
}
.oti-form__dollar {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 0.9rem;
  pointer-events: none;
}
.oti-form__input--amount {
  padding-left: 1.75rem;
}

/* ── Type buttons ─────────────────────────────────────── */
.oti-form__type-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 0.25rem;
}

.oti-form__type-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.65rem;
  border-radius: 99px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.oti-form__type-btn:hover {
  border-color: var(--accent);
  color: var(--text);
}
.oti-form__type-btn--active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  font-weight: 600;
}

/* ── Allocation grid ──────────────────────────────────── */
.oti-form__alloc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.oti-form__alloc-total {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
}
.oti-form__alloc-total--invalid {
  color: var(--danger);
}

.oti-form__alloc-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0 0 0.5rem;
}

.oti-form__alloc-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--surface-alt, var(--surface));
  border-radius: 0.6rem;
  border: 1px solid var(--border);
}

.oti-form__alloc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.oti-form__alloc-label-wrap {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 5rem;
}

.oti-form__alloc-emoji {
  font-size: 1rem;
}

.oti-form__alloc-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
}

.oti-form__alloc-controls {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.oti-form__alloc-input {
  width: 3.5rem;
  padding: 0.3rem 0.4rem;
  border-radius: 0.4rem;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
}
.oti-form__alloc-input:focus {
  outline: none;
  border-color: var(--accent);
}

.oti-form__alloc-pct {
  font-size: 0.8rem;
  color: var(--text-muted);
  min-width: 0.75rem;
}

.oti-form__alloc-dollars {
  font-size: 0.8rem;
  color: var(--text-muted);
  min-width: 3rem;
  text-align: right;
}

/* ── Footer ───────────────────────────────────────────── */
.oti-form__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}
</style>
