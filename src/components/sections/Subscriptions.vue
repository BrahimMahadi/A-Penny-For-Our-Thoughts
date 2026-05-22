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
const MO_RATE: Record<Frequency, number> = { weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 1/3, yearly: 1/12 };
const YR_RATE: Record<Frequency, number> = { weekly: 52,   biweekly: 26,   monthly: 12, quarterly: 4,   yearly: 1  };
const FREQ_LABEL: Record<Frequency, string> = { weekly: '/wk', biweekly: '/2wk', monthly: '/mo', quarterly: '/qtr', yearly: '/yr' };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Aggregate stats ──────────────────────────────────────────────
const subs = computed(() => budget.subscriptions);

const totalMo = computed(() =>
  subs.value.reduce((s, sub) => s + (+sub.amount || 0) * (MO_RATE[sub.frequency || 'monthly'] ?? 1), 0),
);
const totalYr = computed(() =>
  subs.value.reduce((s, sub) => s + (+sub.amount || 0) * (YR_RATE[sub.frequency || 'monthly'] ?? 12), 0),
);
const wantsMo = computed(() =>
  subs.value
    .filter(s => (s.budgetType || 'wants') !== 'needs')
    .reduce((s, sub) => s + (+sub.amount || 0) * (MO_RATE[sub.frequency || 'monthly'] ?? 1), 0),
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

function chipClass(dateStr: string): string {
  const d = daysUntil(dateStr);
  if (d < 0)  return 'chip-red';
  if (d < 60) return 'chip-warn';
  return 'chip-green';
}

function chipText(dateStr: string): string {
  const d = daysUntil(dateStr);
  if (d < 0)   return 'Expired';
  if (d === 0) return 'Today!';
  return `${d}d`;
}

function annualNote(amount: number, freq: Frequency): string {
  if (!amount || freq === 'yearly') return '';
  const yr = amount * (YR_RATE[freq] ?? 12);
  return `· ${fmt(yr)}/yr`;
}

function displayDate(dateStr: string): string {
  if (!dateStr) return '—';
  const [sy, sm, sd] = dateStr.split('-');
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
});

const FREQUENCIES_SUB: Frequency[] = ['monthly', 'quarterly', 'yearly', 'biweekly', 'weekly'];

function resetForm(): void {
  form.name       = '';
  form.amount     = 0;
  form.frequency  = 'monthly';
  form.date       = '';
  form.category   = 'Other';
  form.budgetType = 'wants';
  form.cardId     = null;
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
  editingId.value = id;
  showModal.value = true;
}

const formError = computed<string>(() => {
  if (!form.name.trim()) return 'Name is required.';
  if (!form.date)        return 'Renewal date is required.';
  return '';
});

function save(): void {
  if (formError.value) return;
  const payload = {
    name:       form.name.trim(),
    amount:     form.amount,
    frequency:  form.frequency,
    date:       form.date,
    category:   form.category,
    budgetType: form.budgetType as 'needs' | 'wants',
    cardId:     form.cardId,
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
            :class="chipClass(sub.date || '')"
          >
            {{ chipText(sub.date || '') }}
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
            <span class="sub-annual-note">{{ annualNote(+sub.amount, sub.frequency || 'monthly') }}</span>
          </span>
        </div>
        <div class="sub-row-3">
          <span class="sub-date">Renews {{ displayDate(sub.date || '') }}</span>
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
              type="text"
              placeholder="e.g. Netflix"
            >
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
                {{ f }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="sub-date"
            >Next renewal date</label>
            <input
              id="sub-date"
              v-model="form.date"
              class="form-input"
              type="date"
            >
          </div>
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

        <p
          v-if="formError"
          class="form-error"
        >
          {{ formError }}
        </p>
      </div>

      <template #footer>
        <BaseButton
          variant="secondary"
          @click="showModal = false; resetForm()"
        >
          Cancel
        </BaseButton>
        <BaseButton
          :disabled="!!formError"
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

.chip-green { background: rgba(74, 222, 128, 0.12); color: var(--accent2); }
.chip-warn  { background: rgba(251, 191, 36, 0.12);  color: var(--warn); }
.chip-red   { background: rgba(248, 113, 113, 0.12); color: var(--danger); }

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

.form-error {
  font-size: 0.8rem;
  color: var(--danger);
  margin: 0;
}
</style>
