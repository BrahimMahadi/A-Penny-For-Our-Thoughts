<!--
  Module:   components/sections/Wishlist.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Updated:  May 2026 (RS-14) — full card-grid redesign: price tracking,
            per-item saved progress, months-to-goal badge, affordability chip,
            inline "Add savings" interaction, sort toggle, and URL icon button.
  Summary:  Wishlist rendered as a responsive card grid. Each card shows:
              - Emoji icon in a violet box
              - "~N mo" months-to-goal badge (derived from monthly savings rate)
              - Item name and target price
              - Progress bar + "$X saved · Y%"
              - "Add savings" inline form (RS-13 style)
            Header shows total wishlist value + savings rate.
            CRUD via BaseModal. openAdd() exposed for parent CTAs.
-->

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useAnalytics } from '@/composables/useAnalytics';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { fmt } from '@/utils/format';
import type { WishlistItem } from '@/types/budget';

const budget = useBudgetStore();
const toast  = useToast();
const { totalMonthlyIncome } = useAnalytics();

// ─── Budget maths ─────────────────────────────────────────────────────────────

/** Monthly savings envelope (income × savings%) */
const monthlySavingsRate = computed(() =>
  totalMonthlyIncome.value * ((budget.allocation.savings ?? 0) / 100),
);

/** One bi-weekly wants envelope (monthly wants ÷ 2) */
const wantsBudgetPerPeriod = computed(() =>
  totalMonthlyIncome.value * ((budget.allocation.wants ?? 0) / 100) / 2,
);

// ─── Header stats ─────────────────────────────────────────────────────────────

const pricedItems = computed(() => budget.wishlist.filter(w => w.price != null && w.price > 0));

const totalValue = computed(() =>
  pricedItems.value.reduce((s, w) => s + (w.price ?? 0), 0),
);

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortKey = 'default' | 'price-asc' | 'price-desc';
const sortKey = ref<SortKey>('default');

const sortedWishlist = computed(() => {
  const items = [...budget.wishlist];
  if (sortKey.value === 'price-asc') {
    items.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  } else if (sortKey.value === 'price-desc') {
    items.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
  }
  return items;
});

// ─── Per-card helpers ──────────────────────────────────────────────────────────

/** Months until item is fully saved for, based on monthly savings rate. */
function monthsToGoal(item: WishlistItem): number | null {
  if (!item.price || item.price <= 0 || monthlySavingsRate.value <= 0) return null;
  const remaining = Math.max(0, item.price - (item.saved ?? 0));
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / monthlySavingsRate.value);
}

/** Progress percentage (saved / price), clamped to 0–100. */
function progressPct(item: WishlistItem): number {
  if (!item.price || item.price <= 0) return 0;
  return Math.min(100, Math.round(((item.saved ?? 0) / item.price) * 100));
}

/** True when the item price fits within one bi-weekly wants envelope. */
function isAffordable(price: number | undefined): boolean {
  if (price == null || price <= 0) return false;
  return wantsBudgetPerPeriod.value > 0 && price <= wantsBudgetPerPeriod.value;
}

// ─── Inline "Add savings" (RS-13 pattern) ─────────────────────────────────────

const inlineWishId  = ref<string | null>(null);
const inlineAmount  = ref('');

function openInlineSavings(id: string): void {
  inlineWishId.value = id;
  inlineAmount.value = '';
  // Bug fix: refs inside v-for become arrays in Composition API — use getElementById
  // instead so we target the correct per-item input regardless of list length.
  nextTick(() => {
    const el = document.getElementById(`wish-inline-${id}`) as HTMLInputElement | null;
    if (el && typeof el.focus === 'function') el.focus();
  });
}

function closeInlineSavings(): void {
  inlineWishId.value = null;
  inlineAmount.value = '';
}

function applyInlineSavings(id: string): void {
  const amount = parseFloat(inlineAmount.value);
  if (isNaN(amount) || amount <= 0) { closeInlineSavings(); return; }
  const item = budget.wishlist.find(w => w.id === id);
  if (!item) return;
  budget.updateWishlistItem(id, { saved: (item.saved ?? 0) + amount });
  toast.show(`+${fmt(amount)} saved toward "${item.name}"`, 'success');
  closeInlineSavings();
}

// ─── Modal CRUD ────────────────────────────────────────────────────────────────

const showModal = ref(false);
const editingId  = ref<string | null>(null);

const form = reactive({ name: '', icon: '🛒', url: '', price: '', saved: '' });

function resetForm(): void {
  form.name  = '';
  form.icon  = '🛒';
  form.url   = '';
  form.price = '';
  form.saved = '';
  editingId.value = null;
}

function openAdd(): void {
  resetForm();
  showModal.value = true;
}

function openEdit(id: string): void {
  const item = budget.wishlist.find(w => w.id === id);
  if (!item) return;
  form.name  = item.name;
  form.icon  = item.icon || '🛒';
  form.url   = item.url || '';
  form.price = item.price != null ? String(item.price) : '';
  form.saved = item.saved != null ? String(item.saved) : '';
  editingId.value = id;
  showModal.value = true;
}

const formError = computed<string>(() => {
  // Bug fix: Vue 3 v-model on <input type="number"> coerces the reactive field
  // from string → number after the first user keystroke. Wrap with String() so
  // .trim() is always safe regardless of which type the field currently holds.
  if (!form.name.trim()) return 'Name is required.';
  const priceStr = String(form.price ?? '').trim();
  const savedStr = String(form.saved ?? '').trim();
  if (priceStr !== '' && (isNaN(+priceStr) || +priceStr < 0)) {
    return 'Price must be a positive number.';
  }
  if (savedStr !== '' && (isNaN(+savedStr) || +savedStr < 0)) {
    return 'Saved amount must be a positive number.';
  }
  if (savedStr !== '' && priceStr !== '' && +savedStr > +priceStr) {
    return 'Saved amount cannot exceed the price.';
  }
  return '';
});

function save(): void {
  if (formError.value) return;
  const priceStr = String(form.price ?? '').trim();
  const savedStr = String(form.saved ?? '').trim();
  const parsedPrice = priceStr !== '' ? +priceStr : undefined;
  const parsedSaved = savedStr !== '' ? +savedStr : undefined;
  const payload = {
    name:  form.name.trim(),
    icon:  form.icon || '🛒',
    url:   form.url.trim(),
    price: parsedPrice,
    saved: parsedSaved,
  };
  if (editingId.value) {
    budget.updateWishlistItem(editingId.value, payload);
    toast.show('Wishlist item updated.', 'success');
  } else {
    budget.addWishlistItem(payload);
    toast.show('Item added to wishlist.', 'success');
  }
  showModal.value = false;
  resetForm();
}

function remove(id: string): void {
  const item = budget.wishlist.find(w => w.id === id);
  if (!item) return;
  if (!window.confirm(`Remove "${item.name}" from wishlist?`)) return;
  budget.deleteWishlistItem(id);
  toast.show('Item removed.', 'success');
}

// Allow the parent page to trigger the Add modal from a header CTA
defineExpose({ openAdd });
</script>

<template>
  <div class="wishlist-section">

    <!-- ── Header ──────────────────────────────────────────────── -->
    <div class="wishlist-section__header">
      <div class="wishlist-section__meta">
        <span class="wishlist-section__count">
          {{ budget.wishlist.length }} item{{ budget.wishlist.length !== 1 ? 's' : '' }}
        </span>
        <span
          v-if="pricedItems.length > 0"
          class="wishlist-section__total"
        >
          {{ fmt(totalValue) }}
          <span
            v-if="monthlySavingsRate > 0"
            class="wishlist-section__rate"
          >
            · at {{ fmt(monthlySavingsRate) }}/mo savings rate
          </span>
        </span>
      </div>

      <div class="wishlist-section__controls">
        <select
          v-if="budget.wishlist.length > 1"
          v-model="sortKey"
          class="wishlist-sort"
          aria-label="Sort wishlist"
        >
          <option value="default">Default order</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
        </select>
        <BaseButton
          size="sm"
          @click="openAdd"
        >
          + Add Item
        </BaseButton>
      </div>
    </div>

    <!-- ── Empty state ─────────────────────────────────────────── -->
    <EmptyState
      v-if="budget.wishlist.length === 0"
      icon="🛒"
      title="Wishlist is empty"
      hint="Add items you're saving up for — set a price to track your progress."
    />

    <!-- ── Card grid ───────────────────────────────────────────── -->
    <div
      v-else
      class="wish-grid"
    >
      <div
        v-for="item in sortedWishlist"
        :key="item.id"
        class="wish-card"
      >
        <!-- Icon + months badge -->
        <div class="wish-card__top">
          <div class="wish-card__icon-box">
            <span
              class="wish-icon"
              aria-hidden="true"
            >{{ item.icon || '🛒' }}</span>
          </div>

          <!-- Months-to-goal badge -->
          <span
            v-if="monthsToGoal(item) !== null && monthsToGoal(item)! > 0"
            class="wish-card__months-badge"
            :title="`~${monthsToGoal(item)} months to save up at ${fmt(monthlySavingsRate)}/mo`"
          >
            ~{{ monthsToGoal(item) }} mo
          </span>
          <span
            v-else-if="monthsToGoal(item) === 0"
            class="wish-card__months-badge wish-card__months-badge--done"
          >
            ✓ Saved
          </span>
        </div>

        <!-- Name -->
        <span class="wish-name">{{ item.name }}</span>

        <!-- Price -->
        <span
          v-if="item.price != null && item.price > 0"
          class="wish-price"
        >
          {{ fmt(item.price) }}
        </span>

        <!-- Progress bar (only when price set) -->
        <template v-if="item.price != null && item.price > 0">
          <div class="wish-card__progress-wrap">
            <div
              class="wish-card__progress-fill"
              :style="{ width: progressPct(item) + '%' }"
              :aria-valuenow="progressPct(item)"
              aria-valuemin="0"
              aria-valuemax="100"
              role="progressbar"
            />
          </div>

          <div class="wish-card__saved-row">
            <span class="wish-card__saved-text">{{ fmt(item.saved ?? 0) }} saved</span>
            <span class="wish-card__pct">{{ progressPct(item) }}%</span>
            <span
              v-if="isAffordable(item.price)"
              class="wish-chip wish-chip--affordable"
              title="Within one bi-weekly wants budget"
            >
              Affordable ✓
            </span>
          </div>
        </template>

        <!-- Inline "Add savings" form -->
        <div
          v-if="inlineWishId === item.id"
          class="wish-card__inline"
        >
          <div class="wish-inline-wrap">
            <span class="wish-inline-prefix">$</span>
            <input
              :id="`wish-inline-${item.id}`"
              v-model="inlineAmount"
              class="wish-inline-input"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              @keyup.enter="applyInlineSavings(item.id)"
              @keyup.escape="closeInlineSavings"
            >
          </div>
          <div class="wish-inline-btns">
            <button
              class="wish-inline-confirm"
              @click="applyInlineSavings(item.id)"
            >
              + Add
            </button>
            <button
              class="wish-inline-cancel"
              @click="closeInlineSavings"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Action row -->
        <div class="wish-actions">
          <button
            v-if="item.price != null && item.price > 0 && inlineWishId !== item.id"
            class="wish-card__add-savings"
            @click="openInlineSavings(item.id)"
          >
            + Add savings
          </button>
          <a
            v-if="item.url"
            :href="item.url"
            target="_blank"
            rel="noopener"
            class="wish-link-btn"
            :aria-label="`View ${item.name} (opens in new tab)`"
            title="Open link"
          >🔗</a>
          <BaseButton
            size="xs"
            variant="secondary"
            @click="openEdit(item.id)"
          >
            Edit
          </BaseButton>
          <BaseButton
            size="xs"
            variant="danger"
            @click="remove(item.id)"
          >
            Delete
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- ── Add / Edit modal ───────────────────────────────────── -->
    <BaseModal
      v-model:open="showModal"
      :title="editingId ? 'Edit Wishlist Item' : 'Add to Wishlist'"
      size="sm"
    >
      <div class="modal-form">
        <!-- Icon + Name row -->
        <div class="form-row-icon">
          <div class="form-group icon-group">
            <label
              class="form-label"
              for="wish-icon"
            >Icon</label>
            <input
              id="wish-icon"
              v-model="form.icon"
              class="form-input icon-input"
              type="text"
              maxlength="4"
              placeholder="🛒"
            >
          </div>
          <div class="form-group name-group">
            <label
              class="form-label"
              for="wish-name-input"
            >Item name</label>
            <input
              id="wish-name-input"
              v-model="form.name"
              class="form-input"
              type="text"
              placeholder="e.g. AirPods Pro"
            >
          </div>
        </div>

        <!-- Price + Saved row -->
        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="wish-price"
            >Target price (optional)</label>
            <div class="form-input-wrap">
              <span class="form-input-prefix">$</span>
              <input
                id="wish-price"
                v-model="form.price"
                class="form-input form-input--prefixed"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
              >
            </div>
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="wish-saved"
            >Amount saved (optional)</label>
            <div class="form-input-wrap">
              <span class="form-input-prefix">$</span>
              <input
                id="wish-saved"
                v-model="form.saved"
                class="form-input form-input--prefixed"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
              >
            </div>
          </div>
        </div>

        <!-- URL field -->
        <div class="form-group">
          <label
            class="form-label"
            for="wish-url"
          >URL (optional)</label>
          <input
            id="wish-url"
            v-model="form.url"
            class="form-input"
            type="url"
            placeholder="https://..."
          >
        </div>

        <!-- Live affordability hint -->
        <p
          v-if="form.price && +form.price > 0 && wantsBudgetPerPeriod > 0"
          class="wish-afford-hint"
          :class="isAffordable(+form.price) ? 'wish-afford-hint--yes' : 'wish-afford-hint--no'"
        >
          {{ isAffordable(+form.price)
            ? `✓ Fits within your ${fmt(wantsBudgetPerPeriod)} bi-weekly wants budget.`
            : `✗ Over your ${fmt(wantsBudgetPerPeriod)} bi-weekly wants budget by ${fmt(+form.price - wantsBudgetPerPeriod)}.`
          }}
        </p>

        <!-- Live months-to-goal hint -->
        <p
          v-if="form.price && +form.price > 0 && monthlySavingsRate > 0"
          class="wish-months-hint"
        >
          {{
            (() => {
              const remaining = Math.max(0, +form.price - (+form.saved || 0));
              if (remaining <= 0) return '✓ Already saved enough!';
              const months = Math.ceil(remaining / monthlySavingsRate);
              return `~${months} month${months !== 1 ? 's' : ''} to save up at ${fmt(monthlySavingsRate)}/mo`;
            })()
          }}
        </p>

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
.wishlist-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ─── Header ───────────────────────────────────────────────────── */
.wishlist-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.wishlist-section__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.wishlist-section__count {
  font-size: 0.8rem;
  color: var(--muted);
}

.wishlist-section__total {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.wishlist-section__rate {
  font-weight: 400;
  color: var(--muted);
}

.wishlist-section__controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ─── Sort select ──────────────────────────────────────────────── */
.wishlist-sort {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.3rem 0.55rem;
  font-size: 0.75rem;
  color: var(--text);
  font-family: inherit;
  cursor: pointer;
  height: 28px;
}

.wishlist-sort:focus {
  outline: none;
  border-color: var(--accent);
}

/* ─── Card grid ────────────────────────────────────────────────── */
.wish-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

/* ─── Individual card ─────────────────────────────────────────── */
.wish-card {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.wish-card:hover {
  border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
  transform: translateY(-2px);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--accent) 8%, transparent);
}

/* ─── Card top: icon box + months badge ───────────────────────── */
.wish-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.wish-card__icon-box {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wish-icon {
  font-size: 1.4rem;
  line-height: 1;
}

/* ─── Months badge ────────────────────────────────────────────── */
.wish-card__months-badge {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
  white-space: nowrap;
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 2px;
}

.wish-card__months-badge--done {
  background: color-mix(in srgb, var(--success) 12%, var(--surface));
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 25%, var(--border));
}

/* ─── Name + price ────────────────────────────────────────────── */
.wish-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text);
  line-height: 1.3;
}

.wish-price {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

/* ─── Progress bar ────────────────────────────────────────────── */
.wish-card__progress-wrap {
  height: 6px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.wish-card__progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
  transition: width 0.4s ease;
  min-width: 0;
}

/* ─── Saved row: amount + pct + affordable chip ───────────────── */
.wish-card__saved-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.wish-card__saved-text {
  font-size: 0.78rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.wish-card__pct {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.wish-chip {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 1px 6px;
  border-radius: 999px;
}

.wish-chip--affordable {
  background: color-mix(in srgb, var(--success) 12%, var(--surface));
  color: var(--success);
  border: 1px solid color-mix(in srgb, var(--success) 30%, var(--border));
}

/* ─── Inline savings form ─────────────────────────────────────── */
.wish-card__inline {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem;
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: 8px;
}

.wish-inline-wrap {
  position: relative;
}

.wish-inline-prefix {
  position: absolute;
  left: 0.55rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.82rem;
  color: var(--muted);
  pointer-events: none;
}

.wish-inline-input {
  width: 100%;
  padding: 0.35rem 0.55rem 0.35rem 1.4rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.88rem;
  color: var(--text);
  box-sizing: border-box;
  font-family: inherit;
}

.wish-inline-input:focus {
  outline: none;
  border-color: var(--accent);
}

.wish-inline-btns {
  display: flex;
  gap: 0.4rem;
}

.wish-inline-confirm,
.wish-inline-cancel {
  flex: 1;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  border: 1px solid;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}

.wish-inline-confirm {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.wish-inline-confirm:hover {
  background: color-mix(in srgb, var(--accent) 85%, black);
}

.wish-inline-cancel {
  background: transparent;
  color: var(--muted);
  border-color: var(--border);
}

.wish-inline-cancel:hover {
  background: var(--surface2);
  color: var(--text);
}

/* ─── Actions row ─────────────────────────────────────────────── */
.wish-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 0.25rem;
  border-top: 1px solid var(--border);
}

.wish-card__add-savings {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
  border-radius: 6px;
  padding: 2px 8px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.wish-card__add-savings:hover {
  background: color-mix(in srgb, var(--accent) 18%, var(--surface));
  border-color: var(--accent);
}

.wish-link-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 0.8rem;
  text-decoration: none;
  color: var(--text);
  transition: background 0.15s, border-color 0.15s;
  flex-shrink: 0;
  margin-left: auto;
}

.wish-link-btn:hover {
  background: var(--accent-soft);
  border-color: var(--accent);
}

/* ─── Modal form ───────────────────────────────────────────────── */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-row-icon {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 0.75rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 400px) {
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
  box-sizing: border-box;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.form-input-wrap {
  position: relative;
}

.form-input-prefix {
  position: absolute;
  left: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
  color: var(--muted);
  pointer-events: none;
}

.form-input--prefixed {
  padding-left: 1.4rem;
}

.icon-input {
  text-align: center;
  font-size: 1.25rem;
}

/* ─── Hints ────────────────────────────────────────────────────── */
.wish-afford-hint {
  font-size: 0.78rem;
  font-weight: 600;
  margin: 0;
  padding: 0.45rem 0.65rem;
  border-radius: 6px;
}

.wish-afford-hint--yes {
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
  color: var(--success);
  border: 1px solid color-mix(in srgb, var(--success) 25%, var(--border));
}

.wish-afford-hint--no {
  background: color-mix(in srgb, var(--warn) 8%, var(--surface));
  color: var(--warn);
  border: 1px solid color-mix(in srgb, var(--warn) 25%, var(--border));
}

.wish-months-hint {
  font-size: 0.78rem;
  font-weight: 600;
  margin: 0;
  padding: 0.4rem 0.65rem;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--border));
}

.form-error {
  font-size: 0.8rem;
  color: var(--danger);
  margin: 0;
}

/* ─── Responsive ────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .wish-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}
</style>
