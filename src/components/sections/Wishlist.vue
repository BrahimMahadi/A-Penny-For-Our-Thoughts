<!--
  Module:   components/sections/Wishlist.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Updated:  May 2026 (RS-14) — price tracking, affordability chip,
            total-value header, sort toggle, and URL icon button.
  Summary:  Wishlist with optional per-item price. Items show an
            "Affordable ✓" chip when price ≤ one bi-weekly wants budget.
            Sort by default order, price ascending, or descending.
            CRUD via BaseModal. openAdd() exposed for parent CTAs.
-->

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useAnalytics } from '@/composables/useAnalytics';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { fmt } from '@/utils/format';

const budget = useBudgetStore();
const toast  = useToast();
const { totalMonthlyIncome } = useAnalytics();

// ─── Bi-weekly wants budget ───────────────────────────────────────
/** One bi-weekly wants envelope (monthly wants ÷ 2). */
const wantsBudgetPerPeriod = computed(() =>
  totalMonthlyIncome.value * ((budget.allocation.wants ?? 0) / 100) / 2,
);

// ─── Sort ─────────────────────────────────────────────────────────
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

// ─── Header stats ─────────────────────────────────────────────────
const pricedItems = computed(() => budget.wishlist.filter(w => w.price != null && w.price > 0));

const totalValue = computed(() =>
  pricedItems.value.reduce((s, w) => s + (w.price ?? 0), 0),
);

// ─── Affordability ────────────────────────────────────────────────
function isAffordable(price: number | undefined): boolean {
  if (price == null || price <= 0) return false;
  return wantsBudgetPerPeriod.value > 0 && price <= wantsBudgetPerPeriod.value;
}

// ─── Modal state ─────────────────────────────────────────────────
const showModal = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({ name: '', icon: '🛒', url: '', price: '' });

function resetForm(): void {
  form.name     = '';
  form.icon     = '🛒';
  form.url      = '';
  form.price    = '';
  editingId.value = null;
}

function openAdd(): void {
  resetForm();
  showModal.value = true;
}

function openEdit(id: string): void {
  const item = budget.wishlist.find(w => w.id === id);
  if (!item) return;
  form.name     = item.name;
  form.icon     = item.icon || '🛒';
  form.url      = item.url || '';
  form.price    = item.price != null ? String(item.price) : '';
  editingId.value = id;
  showModal.value = true;
}

const formError = computed<string>(() => {
  if (!form.name.trim()) return 'Name is required.';
  if (form.price.trim() !== '' && (isNaN(+form.price) || +form.price < 0)) {
    return 'Price must be a positive number.';
  }
  return '';
});

function save(): void {
  if (formError.value) return;
  const parsedPrice = form.price.trim() !== '' ? +form.price : undefined;
  const payload = {
    name:  form.name.trim(),
    icon:  form.icon || '🛒',
    url:   form.url.trim(),
    price: parsedPrice,
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

    <!-- Header -->
    <div class="wishlist-section__header">
      <div class="wishlist-section__meta">
        <span class="wishlist-section__count">
          {{ budget.wishlist.length }} item{{ budget.wishlist.length !== 1 ? 's' : '' }}
        </span>
        <span
          v-if="pricedItems.length > 0"
          class="wishlist-section__total"
        >
          Total: {{ fmt(totalValue) }}
        </span>
      </div>

      <div class="wishlist-section__controls">
        <!-- Sort toggle -->
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

    <!-- Empty state -->
    <EmptyState
      v-if="budget.wishlist.length === 0"
      icon="🛒"
      title="Wishlist is empty"
      hint="Add items you're saving up for — set a price to see if they fit your bi-weekly wants budget."
    />

    <!-- Wishlist -->
    <ul
      v-else
      class="wishlist-list"
    >
      <li
        v-for="item in sortedWishlist"
        :key="item.id"
        class="wish-item"
      >
        <span
          class="wish-icon"
          aria-hidden="true"
        >{{ item.icon || '🛒' }}</span>

        <div class="wish-body">
          <span class="wish-name">{{ item.name }}</span>
          <div
            v-if="item.price != null && item.price > 0"
            class="wish-chips"
          >
            <span class="wish-price">{{ fmt(item.price) }}</span>
            <span
              v-if="isAffordable(item.price)"
              class="wish-chip wish-chip--affordable"
              title="Within one bi-weekly wants budget"
            >
              Affordable ✓
            </span>
          </div>
        </div>

        <div class="wish-actions">
          <!-- URL icon button -->
          <a
            v-if="item.url"
            :href="item.url"
            target="_blank"
            rel="noopener"
            class="wish-link-btn"
            :aria-label="`View ${item.name} (opens in new tab)`"
            title="Open link"
          >
            🔗
          </a>
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
      </li>
    </ul>

    <!-- Add / Edit modal -->
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
              for="wish-name"
            >Item name</label>
            <input
              id="wish-name"
              v-model="form.name"
              class="form-input"
              type="text"
              placeholder="e.g. AirPods Pro"
            >
          </div>
        </div>

        <!-- Price + URL row -->
        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="wish-price"
            >Price (optional)</label>
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
        </div>

        <!-- Affordability hint (live) -->
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
  gap: 0.75rem;
}

/* ─── Header ──────────────────────────────────────────────────── */
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
}

.wishlist-section__count {
  font-size: 0.8rem;
  color: var(--muted);
}

.wishlist-section__total {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--accent2-text);
  font-variant-numeric: tabular-nums;
}

.wishlist-section__controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ─── Sort select ─────────────────────────────────────────────── */
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

/* ─── List ────────────────────────────────────────────────────── */
.wishlist-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.wish-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  flex-wrap: wrap;
}

.wish-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.wish-body {
  flex: 1;
  min-width: 80px;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.wish-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.wish-chips {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.wish-price {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.wish-chip {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 1px 7px;
  border-radius: 999px;
}

.wish-chip--affordable {
  background: color-mix(in srgb, var(--success) 12%, var(--surface));
  color: var(--success);
  border: 1px solid color-mix(in srgb, var(--success) 30%, var(--border));
}

/* ─── Actions ─────────────────────────────────────────────────── */
.wish-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
}

.wish-link-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 0.85rem;
  text-decoration: none;
  color: var(--text);
  transition: background var(--transition-fast), border-color var(--transition-fast);
  flex-shrink: 0;
}

.wish-link-btn:hover {
  background: var(--accent-soft);
  border-color: var(--accent);
}

/* ─── Modal form ──────────────────────────────────────────────── */
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

/* ─── Affordability hint ──────────────────────────────────────── */
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

.form-error {
  font-size: 0.8rem;
  color: var(--danger);
  margin: 0;
}
</style>
