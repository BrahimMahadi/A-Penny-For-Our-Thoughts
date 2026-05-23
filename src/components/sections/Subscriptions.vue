<!--
  Module:   components/sections/Subscriptions.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Summary:  Subscription list with stats header, budget impact bar,
            renewal alert banner, and CRUD. Mirrors renderSubscriptions().
-->

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useFormValidation, rules } from '@/composables/useFormValidation';
import { useAnalytics } from '@/composables/useAnalytics';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import ProgressBar from '@/components/ui/ProgressBar.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { fmt } from '@/utils/format';
import { daysUntil } from '@/utils/date';
import type { Frequency } from '@/types/budget';

const budget = useBudgetStore();
const toast  = useToast();
const { totalMonthlyIncome } = useAnalytics();

// ─── Frequency rate maps ──────────────────────────────────────────
// custom-days rate is variable (depends on how many days are selected), so it
// uses a per-occurrence sentinel of 1 here — actual cost is computed via helpers.
const MO_RATE: Record<Frequency, number> = { weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 1/3, yearly: 1/12, 'custom-days': 1 };
const YR_RATE: Record<Frequency, number> = { weekly: 52,   biweekly: 26,   monthly: 12, quarterly: 4,   yearly: 1,   'custom-days': 1 };
const FREQ_LABEL: Record<Frequency, string> = { weekly: '/wk', biweekly: '/2wk', monthly: '/mo', quarterly: '/qtr', yearly: '/yr', 'custom-days': '/day' };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Day-of-week helpers ──────────────────────────────────────────
const DOW_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DOW_MINI  = ['S','M','T','W','T','F','S'];
/** Average occurrences per month for a given set of weekdays (365.25/12/7 ≈ 4.348). */
const AVG_PER_WEEKDAY = 365.25 / 12 / 7;

function dayPatternLabel(days: number[]): string {
  if (!days || days.length === 0) return '—';
  return [...days].sort((a, b) => a - b).map(d => DOW_SHORT[d]).join(' · ');
}

/** Monthly cost for any subscription, accounting for custom-days variable rate. */
function subMonthlyAmount(sub: { amount: number; frequency: Frequency; daysOfWeek?: number[] }): number {
  if (sub.frequency === 'custom-days') {
    return (+sub.amount || 0) * (sub.daysOfWeek?.length ?? 0) * AVG_PER_WEEKDAY;
  }
  return (+sub.amount || 0) * (MO_RATE[sub.frequency ?? 'monthly'] ?? 1);
}

/** Annual cost for any subscription. */
function subAnnualAmount(sub: { amount: number; frequency: Frequency; daysOfWeek?: number[] }): number {
  if (sub.frequency === 'custom-days') {
    return (+sub.amount || 0) * (sub.daysOfWeek?.length ?? 0) * (365.25 / 7);
  }
  return (+sub.amount || 0) * (YR_RATE[sub.frequency ?? 'monthly'] ?? 12);
}

// ─── Aggregate stats ──────────────────────────────────────────────
const subs = computed(() => budget.subscriptions);

const totalMo = computed(() =>
  subs.value.reduce((s, sub) => s + subMonthlyAmount(sub), 0),
);
const totalYr = computed(() =>
  subs.value.reduce((s, sub) => s + subAnnualAmount(sub), 0),
);
const wantsMo = computed(() =>
  subs.value
    .filter(s => (s.budgetType || 'wants') !== 'needs')
    .reduce((s, sub) => s + subMonthlyAmount(sub), 0),
);
const wantsBudget = computed(() => totalMonthlyIncome.value * (budget.allocation.wants / 100));
const wantsPct    = computed(() =>
  wantsBudget.value > 0 ? Math.min(100, (wantsMo.value / wantsBudget.value) * 100) : 0,
);

const budgetBarStatus = computed<'on-track' | 'caution' | 'over'>(() => {
  if (wantsPct.value > 60) return 'over';
  if (wantsPct.value > 30) return 'caution';
  return 'on-track';
});

const budgetBarLabel = computed(() => {
  if (!subs.value.length) return 'No subscriptions tracked yet';
  if (wantsBudget.value > 0) {
    return `${fmt(wantsMo.value)}/mo in subscriptions · ${wantsPct.value.toFixed(1)}% of ${fmt(wantsBudget.value)} Wants budget`;
  }
  return 'Add income streams to see budget impact';
});

// ─── Renewal alerts (≤ 7 days) ───────────────────────────────────
const upcomingRenewals = computed(() =>
  [...subs.value]
    .filter(s => {
      if (s.frequency === 'custom-days') return false; // recurring daily pattern — no countdown
      const d = daysUntil(s.date || '');
      return d >= 0 && d <= 7;
    })
    .sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime()),
);

function renewalDateLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days === 0) return 'today';
  const [, sm, sd] = dateStr.split('-');
  return `${MONTHS[+sm - 1]} ${+sd}`;
}

// ─── Sorted subscription list ─────────────────────────────────────
const sortedSubs = computed(() =>
  [...subs.value].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : Infinity;
    const db = b.date ? new Date(b.date).getTime() : Infinity;
    return da - db;
  }),
);

function chipClass(sub: { date: string; frequency: Frequency; daysOfWeek?: number[] }): string {
  if (sub.frequency === 'custom-days') return 'chip-custom';
  const d = daysUntil(sub.date);
  if (d < 0)  return 'chip-red';
  if (d < 60) return 'chip-warn';
  return 'chip-green';
}

function chipText(sub: { date: string; frequency: Frequency; daysOfWeek?: number[] }): string {
  if (sub.frequency === 'custom-days') {
    const n = sub.daysOfWeek?.length ?? 0;
    return n ? sub.daysOfWeek!.map(d => DOW_MINI[d]).join('') : '—';
  }
  const d = daysUntil(sub.date);
  if (d < 0)   return 'Expired';
  if (d === 0) return 'Today!';
  return `${d}d`;
}

function annualNote(sub: { amount: number; frequency: Frequency; daysOfWeek?: number[] }): string {
  if (!sub.amount || sub.frequency === 'yearly') return '';
  const yr = subAnnualAmount(sub);
  return `· ${fmt(yr)}/yr`;
}

function displayDate(sub: { date: string; frequency: Frequency; daysOfWeek?: number[] }): string {
  if (sub.frequency === 'custom-days') {
    return `Every ${dayPatternLabel(sub.daysOfWeek ?? [])}`;
  }
  if (!sub.date) return '—';
  const [sy, sm, sd] = sub.date.split('-');
  return `${MONTHS[+sm - 1]} ${+sd}, ${sy}`;
}

function cardLabel(cardId: string | null | undefined): string | null {
  if (!cardId) return null;
  return budget.expenseCards.find(c => c.id === cardId)?.label ?? null;
}

// ─── Modal state ─────────────────────────────────────────────────
const showModal = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  name:       '',
  amount:     0,
  frequency:  'monthly' as Frequency,
  date:       '',
  category:   'Other',
  budgetType: 'wants',
  cardId:     null as string | null,
  daysOfWeek: [] as number[],
});

const FREQUENCIES_SUB: Frequency[] = ['monthly', 'quarterly', 'yearly', 'biweekly', 'weekly', 'custom-days'];
const FREQ_DISPLAY: Record<Frequency, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly',
  biweekly: 'Bi-weekly', weekly: 'Weekly', 'custom-days': 'Custom days',
};

/** Estimated monthly cost for the current form values. */
const formMonthlyCost = computed(() => {
  if (form.frequency === 'custom-days') {
    return form.amount * (form.daysOfWeek.length) * AVG_PER_WEEKDAY;
  }
  return form.amount * (MO_RATE[form.frequency] ?? 1);
});

function toggleDay(dow: number): void {
  const idx = form.daysOfWeek.indexOf(dow);
  if (idx === -1) form.daysOfWeek.push(dow);
  else form.daysOfWeek.splice(idx, 1);
}

function resetForm(): void {
  form.name       = '';
  form.amount     = 0;
  form.frequency  = 'monthly';
  form.date       = '';
  form.category   = 'Other';
  form.budgetType = 'wants';
  form.cardId     = null;
  form.daysOfWeek = [];
  editingId.value = null;
}

function openAdd(): void {
  resetForm();
  showModal.value = true;
}

function openEdit(id: string): void {
  const sub = budget.subscriptions.find(s => s.id === id);
  if (!sub) return;
  form.name       = sub.name;
  form.amount     = +sub.amount || 0;
  form.frequency  = sub.frequency || 'monthly';
  form.date       = sub.date || '';
  form.category   = sub.category || 'Other';
  form.budgetType = sub.budgetType || 'wants';
  form.cardId     = sub.cardId ?? null;
  form.daysOfWeek = [...(sub.daysOfWeek ?? [])];
  editingId.value = id;
  showModal.value = true;
}

const validation = useFormValidation(() => ({
  name: rules.required(form.name, 'Name'),
  // date is required only for non-custom-days frequencies; null = no error
  date: form.frequency !== 'custom-days' ? rules.required(form.date, 'Renewal date') : null,
  // custom-days requires at least one day selected; null = no error
  daysOfWeek: form.frequency === 'custom-days' && form.daysOfWeek.length === 0
    ? 'Select at least one day'
    : null,
}));

function save(): void {
  validation.touchAll();
  if (!validation.isValid.value) return;

  // For custom-days, default the effective-from date to today if not set
  const date = (form.frequency === 'custom-days' && !form.date)
    ? new Date().toISOString().split('T')[0]
    : form.date;

  const payload = {
    name:       form.name.trim(),
    amount:     form.amount,
    frequency:  form.frequency,
    date,
    category:   form.category,
    budgetType: form.budgetType as 'needs' | 'wants',
    cardId:     form.cardId,
    daysOfWeek: form.frequency === 'custom-days' ? [...form.daysOfWeek].sort((a, b) => a - b) : [],
  };
  if (editingId.value) {
    budget.updateSubscription(editingId.value, payload);
    toast.show('Subscription updated.', 'success');
  } else {
    budget.addSubscription(payload);
    toast.show('Subscription added.', 'success');
  }
  showModal.value = false;
  resetForm();
  validation.reset();
}

function remove(id: string): void {
  const sub = budget.subscriptions.find(s => s.id === id);
  if (!sub) return;
  if (!window.confirm(`Delete "${sub.name}"?`)) return;
  budget.deleteSubscription(id);
  toast.show('Subscription removed.', 'success');
}
</script>

<template>
  <div class="subs-section">
    <!-- Stats header -->
    <div class="subs-stats">
      <div class="subs-stat">
        <div class="subs-stat__label">
          Monthly total
        </div>
        <div class="subs-stat__value">
          {{ subs.length ? fmt(totalMo) + '/mo' : '—' }}
        </div>
      </div>
      <div class="subs-stat">
        <div class="subs-stat__label">
          Annual total
        </div>
        <div class="subs-stat__value">
          {{ subs.length ? fmt(totalYr) + '/yr' : '—' }}
        </div>
      </div>
      <div class="subs-stat">
        <div class="subs-stat__label">
          % of Wants budget
        </div>
        <div
          class="subs-stat__value"
          :class="{
            'text-danger': wantsPct > 60,
            'text-warn': wantsPct > 30 && wantsPct <= 60,
          }"
        >
          {{ subs.length && wantsBudget > 0 ? wantsPct.toFixed(1) + '%' : '—' }}
        </div>
      </div>
    </div>

    <!-- Budget impact bar -->
    <div class="subs-budget-bar">
      <ProgressBar
        :percent="wantsPct"
        :status="budgetBarStatus"
        size="sm"
        aria-label="Subscription budget impact"
      />
      <p class="subs-budget-bar__label">
        {{ budgetBarLabel }}
      </p>
    </div>

    <!-- Renewal alert -->
    <div
      v-if="upcomingRenewals.length > 0"
      class="subs-renewal-alert"
    >
      ⚠&nbsp; Renewing within 7 days —
      <span
        v-for="(sub, i) in upcomingRenewals"
        :key="sub.id"
      >
        <strong>{{ sub.name }}</strong>
        <span class="renewal-date">{{ renewalDateLabel(sub.date || '') }}</span>
        <span v-if="i < upcomingRenewals.length - 1"> · </span>
      </span>
    </div>

    <!-- List header + add button -->
    <div class="subs-section__header">
      <span class="subs-section__count">
        {{ subs.length }} subscription{{ subs.length !== 1 ? 's' : '' }}
      </span>
      <BaseButton
        size="sm"
        @click="openAdd"
      >
        + Add Subscription
      </BaseButton>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-if="subs.length === 0"
      icon="📺"
      title="No subscriptions tracked"
      hint="Add recurring services like Netflix or Spotify to monitor your monthly costs."
    />

    <!-- Subscription list -->
    <ul
      v-else
      class="subs-list"
    >
      <li
        v-for="sub in sortedSubs"
        :key="sub.id"
        class="sub-item"
        :aria-label="`${sub.name} subscription`"
      >
        <div class="sub-row-1">
          <span class="sub-name">{{ sub.name }}</span>
          <span
            class="sub-chip"
            :class="chipClass(sub)"
            :title="sub.frequency === 'custom-days' ? dayPatternLabel(sub.daysOfWeek ?? []) : undefined"
          >
            {{ chipText(sub) }}
          </span>
        </div>
        <div class="sub-row-2">
          <span
            class="sub-budget-badge"
            :class="sub.budgetType === 'needs' ? 'badge-needs' : 'badge-wants'"
          >
            {{ sub.budgetType === 'needs' ? 'Needs' : 'Wants' }}
          </span>
          <span
            v-if="cardLabel(sub.cardId)"
            class="sub-card-chip"
          >
            💳 {{ cardLabel(sub.cardId) }}
          </span>
          <span
            v-else
            class="sub-no-card-chip"
          >⚠ No card</span>
          <span class="sub-amount">
            {{ sub.amount > 0 ? fmt(+sub.amount) + (FREQ_LABEL[sub.frequency || 'monthly'] || '/mo') : '—' }}
            <span class="sub-annual-note">{{ annualNote(sub) }}</span>
          </span>
        </div>
        <div class="sub-row-3">
          <span class="sub-date">{{ sub.frequency === 'custom-days' ? displayDate(sub) : 'Renews ' + displayDate(sub) }}</span>
          <div class="sub-actions">
            <BaseButton
              size="xs"
              variant="secondary"
              @click="openEdit(sub.id)"
            >
              Edit
            </BaseButton>
            <BaseButton
              size="xs"
              variant="danger"
              @click="remove(sub.id)"
            >
              Delete
            </BaseButton>
          </div>
        </div>
      </li>
    </ul>

    <!-- Add / Edit modal -->
    <BaseModal
      v-model:open="showModal"
      :title="editingId ? 'Edit Subscription' : 'Add Subscription'"
    >
      <div class="modal-form">
        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="sub-name"
            >Name</label>
            <input
              id="sub-name"
              v-model="form.name"
              class="form-input"
              :class="{ 'form-input--error': validation.errors.value.name }"
              type="text"
              placeholder="e.g. Netflix"
              @blur="validation.touch('name')"
            >
            <p
              v-if="validation.errors.value.name"
              class="field-error"
            >
              {{ validation.errors.value.name }}
            </p>
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="sub-amount"
            >Amount ($)</label>
            <input
              id="sub-amount"
              v-model.number="form.amount"
              class="form-input"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
            >
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="sub-freq"
            >Frequency</label>
            <select
              id="sub-freq"
              v-model="form.frequency"
              class="form-input"
            >
              <option
                v-for="f in FREQUENCIES_SUB"
                :key="f"
                :value="f"
              >
                {{ FREQ_DISPLAY[f] }}
              </option>
            </select>
          </div>
          <!-- Date picker: hidden for custom-days (uses day-of-week instead) -->
          <div
            v-if="form.frequency !== 'custom-days'"
            class="form-group"
          >
            <label
              class="form-label"
              for="sub-date"
            >Next renewal date</label>
            <input
              id="sub-date"
              v-model="form.date"
              class="form-input"
              :class="{ 'form-input--error': validation.errors.value.date }"
              type="date"
              @blur="validation.touch('date')"
            >
            <p
              v-if="validation.errors.value.date"
              class="field-error"
            >
              {{ validation.errors.value.date }}
            </p>
          </div>
        </div>

        <!-- Day-of-week picker (custom-days only) -->
        <div
          v-if="form.frequency === 'custom-days'"
          class="form-group"
        >
          <label class="form-label">Repeats on</label>
          <div class="dow-picker">
            <button
              v-for="(label, idx) in DOW_FULL"
              :key="idx"
              type="button"
              class="dow-btn"
              :class="{ 'dow-btn--active': form.daysOfWeek.includes(idx) }"
              :title="label"
              @click="toggleDay(idx)"
            >
              {{ DOW_MINI[idx] }}
            </button>
          </div>
          <p
            v-if="validation.errors.value.daysOfWeek"
            class="field-error"
          >
            {{ validation.errors.value.daysOfWeek }}
          </p>
          <p
            v-if="form.daysOfWeek.length > 0"
            class="form-hint"
          >
            ≈ {{ fmt(formMonthlyCost) }}/mo ({{ (form.daysOfWeek.length * AVG_PER_WEEKDAY).toFixed(1) }} days avg)
          </p>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="sub-budget-type"
            >Budget type</label>
            <select
              id="sub-budget-type"
              v-model="form.budgetType"
              class="form-input"
            >
              <option value="wants">
                Wants
              </option>
              <option value="needs">
                Needs
              </option>
            </select>
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="sub-card"
            >Payment card</label>
            <select
              id="sub-card"
              v-model="form.cardId"
              class="form-input"
            >
              <option :value="null">
                No card
              </option>
              <option
                v-for="card in budget.expenseCards"
                :key="card.id"
                :value="card.id"
              >
                {{ card.label }}
              </option>
            </select>
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
.subs-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.subs-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

@media (max-width: 480px) {
  .subs-stats { grid-template-columns: 1fr 1fr; }
}

.subs-stat {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  text-align: center;
}

.subs-stat__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.subs-stat__value {
  font-size: 1rem;
  font-weight: 700;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

.text-danger { color: var(--danger); }
.text-warn   { color: var(--warn); }

.subs-budget-bar {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.subs-budget-bar__label {
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0;
}

.subs-renewal-alert {
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.25);
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  font-size: 0.8rem;
  color: var(--warn);
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: baseline;
}

.renewal-date {
  opacity: 0.75;
  margin-left: 0.25rem;
}

.subs-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.subs-section__count {
  font-size: 0.8rem;
  color: var(--muted);
}

.subs-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sub-item {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sub-row-1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.sub-name {
  font-weight: 700;
  font-size: 0.9rem;
}

.sub-chip {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
}

.chip-green  { background: rgba(74, 222, 128, 0.12);  color: var(--accent2); }
.chip-warn   { background: rgba(251, 191, 36, 0.12);  color: var(--warn); }
.chip-red    { background: rgba(248, 113, 113, 0.12); color: var(--danger); }
.chip-custom { background: rgba(167, 139, 250, 0.12); color: #a78bfa; letter-spacing: 0.02em; }

.sub-row-2 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.sub-budget-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
}

.badge-needs { background: rgba(74, 222, 128, 0.12); color: var(--accent); }
.badge-wants { background: rgba(96, 165, 250, 0.12); color: var(--accent2); }

.sub-card-chip {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(167, 139, 250, 0.12);
  color: #a78bfa;
}

.sub-no-card-chip {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(251, 191, 36, 0.12);
  color: var(--warn);
}

.sub-amount {
  margin-left: auto;
  font-weight: 700;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.sub-annual-note {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 400;
}

.sub-row-3 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.sub-date {
  font-size: 0.75rem;
  color: var(--muted);
}

.sub-actions {
  display: flex;
  gap: 0.35rem;
}

/* Modal */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 420px) {
  .form-row-2 { grid-template-columns: 1fr; }
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

/* Day-of-week picker */
.dow-picker {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.dow-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.dow-btn:hover {
  border-color: #a78bfa;
  color: #a78bfa;
}

.dow-btn--active {
  background: rgba(167, 139, 250, 0.18);
  border-color: #a78bfa;
  color: #a78bfa;
}

.form-hint {
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0.25rem 0 0;
}
</style>
