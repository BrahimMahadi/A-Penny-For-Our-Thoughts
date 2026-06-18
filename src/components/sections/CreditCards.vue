<!--
  Module:   components/sections/CreditCards.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Updated:  May 2026 (RS-11) — removed CcBar chart; progress bars are sufficient.
            May 2026 (RS-13) — inline Charge / Pay buttons per card. Instantly
            adjusts balance without opening the full Edit modal.
  Summary:  Credit-card list with utilisation progress bars and totals.
            CRUD via BaseModal. Inline charge/pay interaction.
-->

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useFormValidation, rules } from '@/composables/useFormValidation';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { fmt } from '@/utils/format';

const budget = useBudgetStore();
const toast  = useToast();

// ─── Aggregate totals ─────────────────────────────────────────────
const totalBalance = computed(() => budget.creditCards.reduce((s, c) => s + +c.balance, 0));
const totalLimit   = computed(() => budget.creditCards.reduce((s, c) => s + +c.limit,   0));
const totalUsePct  = computed(() => totalLimit.value > 0 ? (totalBalance.value / totalLimit.value) * 100 : 0);

// ─── Modal state ─────────────────────────────────────────────────
const showModal = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({ name: '', balance: 0, limit: 1000 });

function resetForm(): void {
  form.name    = '';
  form.balance = 0;
  form.limit   = 1000;
  editingId.value = null;
}

function openAdd(): void {
  resetForm();
  showModal.value = true;
}

function openEdit(id: string): void {
  const cc = budget.creditCards.find(c => c.id === id);
  if (!cc) return;
  form.name    = cc.name;
  form.balance = cc.balance;
  form.limit   = cc.limit;
  editingId.value = id;
  showModal.value = true;
}

const validation = useFormValidation(() => ({
  name:    rules.required(form.name, 'Card name'),
  limit:   rules.positiveNumber(form.limit, 'Credit limit'),
  balance: rules.nonNegativeNumber(form.balance, 'Balance'),
}));

function save(): void {
  validation.touchAll();
  if (!validation.isValid.value) return;
  if (editingId.value) {
    budget.updateCreditCard(editingId.value, {
      name: form.name.trim(), balance: form.balance, limit: form.limit,
    });
    toast.show('Credit card updated.', 'success');
  } else {
    budget.addCreditCard({
      name: form.name.trim(), balance: form.balance, limit: form.limit,
    });
    toast.show('Credit card added.', 'success');
  }
  showModal.value = false;
  resetForm();
  validation.reset();
}

function remove(id: string): void {
  const cc = budget.creditCards.find(c => c.id === id);
  if (!cc) return;
  if (!window.confirm(`Delete "${cc.name}"?`)) return;
  budget.deleteCreditCard(id);
  toast.show('Credit card removed.', 'success');
}

// ─── Inline charge / pay ──────────────────────────────────────────
type CCInlineMode = 'charge' | 'pay';

const inlineCcId     = ref<string | null>(null);
const inlineCcMode   = ref<CCInlineMode>('pay');
const inlineCcAmount = ref(0);
const inlineCcInputEl = ref<HTMLInputElement | null>(null);

function openCcInline(id: string, mode: CCInlineMode): void {
  inlineCcId.value     = id;
  inlineCcMode.value   = mode;
  inlineCcAmount.value = 0;
  nextTick(() => { const el = inlineCcInputEl.value; if (el && typeof el.focus === 'function') el.focus(); });
}

function closeCcInline(): void {
  inlineCcId.value     = null;
  inlineCcAmount.value = 0;
}

function confirmCcInline(id: string): void {
  const amt = +inlineCcAmount.value;
  if (!(amt > 0)) return;
  const cc = budget.creditCards.find(c => c.id === id);
  if (!cc) return;
  const currentBal = +cc.balance;
  const newBalance = inlineCcMode.value === 'charge'
    ? Math.min(cc.limit, currentBal + amt)
    : Math.max(0, currentBal - amt);
  budget.updateCreditCard(id, { balance: newBalance });
  const action = inlineCcMode.value === 'charge' ? 'Charged' : 'Payment of';
  toast.show(`${action} ${fmt(amt)} on "${cc.name}".`, 'success');
  closeCcInline();
}

// ─── Colour helpers ───────────────────────────────────────────────
function useColour(balance: number, limit: number): string {
  const p = limit > 0 ? (balance / limit) * 100 : 0;
  if (p > 50) return 'var(--danger)';
  if (p > 30) return 'var(--warn)';
  return 'var(--accent2-text)';
}

function chipClass(balance: number, limit: number): string {
  const p = limit > 0 ? (balance / limit) * 100 : 0;
  return p > 30 ? 'chip-red' : 'chip-green';
}
</script>

<template>
  <div class="cc-section">
    <!-- Totals header -->
    <div
      v-if="budget.creditCards.length > 0"
      class="cc-section__totals"
    >
      <span class="cc-total-bal">{{ fmt(totalBalance) }}</span>
      <span class="cc-total-sep">/</span>
      <span class="cc-total-lim">{{ fmt(totalLimit) }}</span>
      <span
        class="cc-chip"
        :class="chipClass(totalBalance, totalLimit)"
      >
        {{ totalUsePct.toFixed(1) }}% total
      </span>
      <BaseButton
        size="sm"
        class="cc-section__add"
        @click="openAdd"
      >
        + Add Card
      </BaseButton>
    </div>
    <div
      v-else
      class="cc-section__add-row"
    >
      <BaseButton
        size="sm"
        @click="openAdd"
      >
        + Add Card
      </BaseButton>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-if="budget.creditCards.length === 0"
      icon="💳"
      title="No credit cards tracked"
      hint="Add a card to monitor your balance and utilization rate."
    />

    <!-- Individual card bars -->
    <div
      v-else
      class="cc-bars"
    >
      <div
        v-for="cc in budget.creditCards"
        :key="cc.id"
        class="cc-bar-wrap"
      >
        <div class="cc-bar-header">
          <span class="cc-bar-name">{{ cc.name }}</span>
          <div class="cc-bar-right">
            <span class="cc-bar-amounts">
              {{ fmt(cc.balance) }} / {{ fmt(cc.limit) }}
            </span>
            <span
              class="cc-chip"
              :class="chipClass(cc.balance, cc.limit)"
            >
              {{ cc.limit > 0 ? ((cc.balance / cc.limit) * 100).toFixed(0) : '0' }}%
            </span>
            <BaseButton
              size="xs"
              @click="openCcInline(cc.id, 'charge')"
            >
              + Charge
            </BaseButton>
            <BaseButton
              size="xs"
              variant="secondary"
              @click="openCcInline(cc.id, 'pay')"
            >
              ✓ Pay
            </BaseButton>
            <BaseButton
              size="xs"
              variant="secondary"
              @click="openEdit(cc.id)"
            >
              Edit
            </BaseButton>
            <BaseButton
              size="xs"
              variant="danger"
              @click="remove(cc.id)"
            >
              Delete
            </BaseButton>
          </div>
        </div>
        <div class="cc-bar-track">
          <div
            class="cc-bar-fill"
            :style="{
              width: `${Math.min(100, cc.limit > 0 ? (cc.balance / cc.limit) * 100 : 0).toFixed(1)}%`,
              background: useColour(cc.balance, cc.limit),
            }"
          />
          <div class="cc-bar-threshold" />
        </div>

        <!-- Inline charge / pay form -->
        <div
          v-if="inlineCcId === cc.id"
          class="cc-inline-form"
          :class="`cc-inline-form--${inlineCcMode}`"
        >
          <span class="cc-inline-form__label">
            {{ inlineCcMode === 'charge' ? '+ Charge to' : '✓ Pay off' }} {{ cc.name }}
          </span>
          <div class="cc-inline-form__row">
            <div class="cc-inline-form__input-wrap">
              <span class="cc-inline-form__dollar">$</span>
              <input
                ref="inlineCcInputEl"
                v-model.number="inlineCcAmount"
                class="cc-inline-form__input"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                @keydown.enter="confirmCcInline(cc.id)"
                @keydown.esc="closeCcInline()"
              >
            </div>
            <button
              class="cc-inline-form__confirm"
              type="button"
              :disabled="!(inlineCcAmount > 0)"
              @click="confirmCcInline(cc.id)"
            >
              ✓ Confirm
            </button>
            <button
              class="cc-inline-form__cancel"
              type="button"
              @click="closeCcInline()"
            >
              ✕
            </button>
          </div>
          <p class="cc-inline-form__preview">
            New balance:
            {{ fmt(inlineCcMode === 'charge'
              ? Math.min(cc.limit, +cc.balance + (inlineCcAmount || 0))
              : Math.max(0, +cc.balance - (inlineCcAmount || 0))) }}
            / {{ fmt(cc.limit) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Add / Edit modal -->
    <BaseModal
      v-model:open="showModal"
      :title="editingId ? 'Edit Credit Card' : 'Add Credit Card'"
      size="sm"
    >
      <div class="modal-form">
        <div class="form-group">
          <label
            class="form-label"
            for="cc-name"
          >Card name</label>
          <input
            id="cc-name"
            v-model="form.name"
            class="form-input"
            :class="{ 'form-input--error': validation.errors.value.name }"
            type="text"
            placeholder="e.g. Visa"
            @blur="validation.touch('name')"
          >
          <p
            v-if="validation.errors.value.name"
            class="field-error"
          >
            {{ validation.errors.value.name }}
          </p>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="cc-balance"
            >Balance ($)</label>
            <input
              id="cc-balance"
              v-model.number="form.balance"
              class="form-input"
              :class="{ 'form-input--error': validation.errors.value.balance }"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              @blur="validation.touch('balance')"
            >
            <p
              v-if="validation.errors.value.balance"
              class="field-error"
            >
              {{ validation.errors.value.balance }}
            </p>
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="cc-limit"
            >Credit limit ($)</label>
            <input
              id="cc-limit"
              v-model.number="form.limit"
              class="form-input"
              :class="{ 'form-input--error': validation.errors.value.limit }"
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              @blur="validation.touch('limit')"
            >
            <p
              v-if="validation.errors.value.limit"
              class="field-error"
            >
              {{ validation.errors.value.limit }}
            </p>
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton
          variant="secondary"
          @click="showModal = false; resetForm(); validation.reset()"
        >
          Cancel
        </BaseButton>
        <BaseButton
          @click="save"
        >
          {{ editingId ? 'Update' : 'Add' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.cc-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cc-section__totals {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.cc-section__add {
  margin-left: auto;
}

.cc-section__add-row {
  display: flex;
  justify-content: flex-end;
}

.cc-total-bal {
  font-size: 1.1rem;
  font-weight: 700;
}

.cc-total-sep {
  color: var(--muted);
}

.cc-total-lim {
  font-size: 0.9rem;
  color: var(--muted);
}

.cc-chip {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
}

.chip-green {
  background: rgba(74, 222, 128, 0.12);
  color: var(--accent2-text);
}

.chip-red {
  background: rgba(248, 113, 113, 0.12);
  color: var(--danger);
}

.cc-bars {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.cc-bar-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.cc-bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.cc-bar-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.cc-bar-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.cc-bar-amounts {
  font-size: 0.8rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.cc-bar-track {
  position: relative;
  height: 8px;
  background: var(--surface2);
  border-radius: 4px;
  overflow: visible;
  border: 1px solid var(--border);
}

.cc-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.35s ease;
}

/* 30% utilisation threshold marker */
.cc-bar-threshold {
  position: absolute;
  top: -2px;
  left: 30%;
  width: 2px;
  height: calc(100% + 4px);
  background: var(--warn);
  opacity: 0.6;
}

/* Modal */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.form-input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.45rem 0.65rem;
  font-size: 0.9rem;
  color: var(--text);
  width: 100%;
  transition: border-color 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 480px) {
  .form-row-2 { grid-template-columns: 1fr; }
}

.form-input--error {
  border-color: var(--danger);
}

.form-input--error:focus {
  border-color: var(--danger);
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
}

.field-error {
  font-size: 0.78rem;
  color: var(--danger);
  margin: 0.15rem 0 0;
}

/* ─── Inline charge / pay form ────────────────────────────────── */
.cc-inline-form {
  margin-top: 0.35rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border: 1px solid;
}

.cc-inline-form--charge {
  background: color-mix(in srgb, var(--danger) 6%, var(--surface));
  border-color: color-mix(in srgb, var(--danger) 25%, var(--border));
}

.cc-inline-form--pay {
  background: color-mix(in srgb, var(--accent2) 8%, var(--surface));
  border-color: color-mix(in srgb, var(--accent2) 35%, var(--border));
}

.cc-inline-form__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.cc-inline-form--charge .cc-inline-form__label {
  color: var(--danger);
}

.cc-inline-form--pay .cc-inline-form__label {
  color: var(--accent2-text);
}

.cc-inline-form__row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.cc-inline-form__input-wrap {
  position: relative;
  flex: 1;
  min-width: 100px;
}

.cc-inline-form__dollar {
  position: absolute;
  left: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
  color: var(--muted);
  pointer-events: none;
}

.cc-inline-form__input {
  width: 100%;
  padding: 0.4rem 0.6rem 0.4rem 1.4rem;
  font-size: 0.9rem;
  font-family: var(--font-mono);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.cc-inline-form__input:focus {
  border-color: var(--accent);
}

.cc-inline-form__confirm {
  padding: 0.4rem 0.75rem;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.cc-inline-form--charge .cc-inline-form__confirm {
  background: var(--danger);
}

.cc-inline-form--pay .cc-inline-form__confirm {
  background: var(--accent2-text);
}

.cc-inline-form__confirm:hover:not(:disabled) {
  opacity: 0.88;
}

.cc-inline-form__confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cc-inline-form__cancel {
  padding: 0.4rem 0.6rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.cc-inline-form__cancel:hover {
  background: var(--surface2);
}

.cc-inline-form__preview {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted);
  font-family: var(--font-mono);
}
</style>
