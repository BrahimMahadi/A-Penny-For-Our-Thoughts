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
  gap: 0;
}

/* ── Eyebrow ──────────────────────────────────────────── */
.oti-form__eyebrow {
  margin: 0 0 0.75rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--muted);
  font-family: var(--font-mono);
}

/* ── Labels ───────────────────────────────────────────── */
.oti-form__label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  font-family: var(--font-mono);
  margin-bottom: 0.3rem;
}

/* ── Inputs ───────────────────────────────────────────── */
.oti-form__input {
  width: 100%;
  padding: 0.65rem 0.8rem;
  font-size: 0.9rem;
  font-family: inherit;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 10px;
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--transition-fast);
  margin-bottom: 1rem;
}
.oti-form__input:focus {
  border-color: var(--accent);
}
.oti-form__input.form-input--error {
  border-color: var(--danger);
}

/* Per-field error — negative top margin pulls message close to the input */
.oti-form__field-error {
  font-size: 0.75rem;
  color: var(--danger, #f87171);
  margin: -0.65rem 0 0.75rem;
}

/* ── Amount wrap ──────────────────────────────────────── */
.oti-form__amount-wrap {
  position: relative;
  margin-bottom: 1rem;
}
.oti-form__dollar {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 0.9rem;
  pointer-events: none;
}
.oti-form__input--amount {
  padding-left: 1.6rem;
  margin-bottom: 0;
  font-family: var(--font-mono);
}

/* ── Type chip row ────────────────────────────────────── */
.oti-form__type-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.oti-form__type-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  font-family: inherit;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}
.oti-form__type-btn:hover:not(.oti-form__type-btn--active) {
  border-color: var(--text);
  color: var(--text);
}
.oti-form__type-btn--active {
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}

/* ── Allocation block ─────────────────────────────────── */
.oti-form__alloc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.3rem;
}
/* Label inside flex row needs no bottom margin */
.oti-form__alloc-header .oti-form__label {
  margin-bottom: 0;
}

.oti-form__alloc-total {
  font-size: 0.72rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--accent);
}
.oti-form__alloc-total--invalid {
  color: var(--danger);
}

.oti-form__alloc-hint {
  font-size: 0.72rem;
  color: var(--muted);
  font-family: var(--font-mono);
  letter-spacing: 0.02em;
  margin: 0 0 0.5rem;
}

.oti-form__alloc-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.85rem 1rem;
  background: var(--bg);
  border-radius: 10px;
  border: 1px solid var(--border);
  margin-bottom: 1rem;
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
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 600;
  font-family: var(--font-mono);
  text-align: center;
  outline: none;
  transition: border-color var(--transition-fast);
}
.oti-form__alloc-input:focus {
  border-color: var(--accent);
}

.oti-form__alloc-pct {
  font-size: 0.8rem;
  color: var(--muted);
  min-width: 0.75rem;
}

.oti-form__alloc-dollars {
  font-size: 0.8rem;
  font-family: var(--font-mono);
  color: var(--muted);
  min-width: 3rem;
  text-align: right;
}

/* ── Footer ───────────────────────────────────────────── */
.oti-form__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

/* ── Buttons (co-located so scoped attribute guarantees delivery
       through BaseModal's Teleport boundary) ──────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 1.1rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 2px 10px color-mix(in srgb, var(--accent) 40%, transparent);
  transition: opacity var(--transition-fast), box-shadow var(--transition-fast);
}
.btn-primary:hover    { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

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
