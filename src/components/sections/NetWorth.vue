<!--
  Module:   components/sections/NetWorth.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 4)
  Summary:  Net worth tracker: 4 stat tiles, liquid savings breakdown,
            manual asset categories with CRUD, auto liabilities, and
            the NetWorthChart. Mirrors renderNetWorth().
-->

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useToast } from '@/composables/useToast';
import { useAnalytics } from '@/composables/useAnalytics';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import NetWorthChart from '@/components/charts/NetWorthChart.vue';
import { fmt } from '@/utils/format';
import { ASSET_CATEGORIES } from '@/data/categories';
import type { AssetCategoryKey } from '@/types/budget';

const budget = useBudgetStore();
const toast  = useToast();
const { netWorth } = useAnalytics();

// ─── Stat tiles ───────────────────────────────────────────────────
const nwColor = computed(() => netWorth.value.netWorth >= 0 ? 'var(--accent2)' : 'var(--danger)');
const momChange = computed(() => netWorth.value.momChange);
const momSign   = computed(() => (momChange.value ?? 0) >= 0 ? '+' : '');
const momColor  = computed(() => (momChange.value ?? 0) >= 0 ? 'var(--accent2)' : 'var(--danger)');
const momArrow  = computed(() => (momChange.value ?? 0) >= 0 ? '▲' : '▼');

// ─── Asset modal ─────────────────────────────────────────────────
const showAssetModal = ref(false);
const editingAssetId = ref<string | null>(null);
const activeCategory = ref<AssetCategoryKey>('investment');

const assetForm = reactive({
  name:     '',
  value:    0,
  category: 'investment' as AssetCategoryKey,
});

function resetAssetForm(): void {
  assetForm.name     = '';
  assetForm.value    = 0;
  assetForm.category = activeCategory.value;
  editingAssetId.value = null;
}

function openAddAsset(catKey: AssetCategoryKey): void {
  activeCategory.value   = catKey;
  assetForm.category     = catKey;
  assetForm.name         = '';
  assetForm.value        = 0;
  editingAssetId.value   = null;
  showAssetModal.value   = true;
}

function openEditAsset(id: string): void {
  const asset = budget.assets.find(a => a.id === id);
  if (!asset) return;
  assetForm.name       = asset.name;
  assetForm.value      = asset.value;
  assetForm.category   = asset.category as AssetCategoryKey;
  editingAssetId.value = id;
  showAssetModal.value = true;
}

const assetFormError = computed<string>(() => {
  if (!assetForm.name.trim()) return 'Name is required.';
  if (assetForm.value < 0)    return 'Value must be ≥ 0.';
  return '';
});

function saveAsset(): void {
  if (assetFormError.value) return;
  if (editingAssetId.value) {
    budget.updateAsset(editingAssetId.value, {
      name:     assetForm.name.trim(),
      value:    assetForm.value,
      category: assetForm.category,
    });
    toast.show('Asset updated.', 'success');
  } else {
    budget.addAsset({
      name:     assetForm.name.trim(),
      value:    assetForm.value,
      category: assetForm.category,
    });
    toast.show('Asset added.', 'success');
  }
  showAssetModal.value = false;
  resetAssetForm();
}

function removeAsset(id: string): void {
  if (!window.confirm('Delete this asset?')) return;
  budget.deleteAsset(id);
  toast.show('Asset removed.', 'success');
}

// ─── Assets grouped by category ──────────────────────────────────
const byCategory = computed(() => netWorth.value.byCategory);

// ─── Record snapshot ──────────────────────────────────────────────
function recordSnapshot(): void {
  budget.recordNetWorthSnapshot(new Date());
  toast.show('Net worth snapshot recorded for this month.', 'success');
}

// ─── Category meta lookup ─────────────────────────────────────────
function catMeta(key: string) {
  return ASSET_CATEGORIES.find(c => c.key === key);
}
</script>

<template>
  <div class="net-worth">
    <!-- 4 stat tiles -->
    <div class="nw-stat-tiles">
      <div class="nw-stat-tile nw-stat-tile--main">
        <div class="nw-stat-tile__label">
          Net Worth
        </div>
        <div
          class="nw-stat-tile__value nw-stat-tile__value--lg"
          :style="{ color: nwColor }"
        >
          {{ fmt(netWorth.netWorth) }}
        </div>
      </div>
      <div class="nw-stat-tile">
        <div class="nw-stat-tile__label">
          Total Assets
        </div>
        <div class="nw-stat-tile__value">
          {{ fmt(netWorth.totalAssets) }}
        </div>
      </div>
      <div class="nw-stat-tile">
        <div class="nw-stat-tile__label">
          Total Liabilities
        </div>
        <div
          class="nw-stat-tile__value"
          style="color: var(--danger)"
        >
          {{ fmt(netWorth.totalLiabilities) }}
        </div>
      </div>
      <div class="nw-stat-tile">
        <div class="nw-stat-tile__label">
          MoM Change
        </div>
        <div
          v-if="momChange !== null"
          class="nw-stat-tile__value"
          :style="{ color: momColor }"
        >
          {{ momArrow }} {{ momSign }}{{ fmt(momChange ?? 0) }}
        </div>
        <div
          v-else
          class="nw-stat-tile__value nw-stat-tile__value--muted"
        >
          No prior data
        </div>
      </div>
    </div>

    <!-- Net worth chart -->
    <NetWorthChart :history="netWorth.history" />

    <!-- Snapshot button -->
    <div class="nw-snapshot-row">
      <span class="nw-snapshot-hint">
        Record a snapshot to track your net worth over time.
      </span>
      <BaseButton
        size="sm"
        variant="secondary"
        @click="recordSnapshot"
      >
        Record Snapshot
      </BaseButton>
    </div>

    <!-- Assets section -->
    <div class="nw-section-title">
      Assets
    </div>

    <!-- Liquid savings (auto from savings accounts) -->
    <div class="nw-breakdown-card">
      <div class="nw-breakdown-header">
        <span>💵 Liquid Savings</span>
        <span class="nw-breakdown-total">{{ fmt(netWorth.liquidAssets) }}</span>
      </div>
      <div
        v-if="budget.savingsAccounts.length === 0"
        class="nw-breakdown-empty"
      >
        No savings accounts
      </div>
      <div
        v-for="acct in budget.savingsAccounts"
        :key="acct.id"
        class="nw-breakdown-row"
      >
        <span class="nw-breakdown-name">{{ acct.name }}</span>
        <span class="nw-breakdown-val">{{ fmt(acct.balance || 0) }}</span>
      </div>
    </div>

    <!-- Manual asset categories -->
    <div
      v-for="cat in byCategory"
      :key="cat.key"
      class="nw-breakdown-card"
    >
      <div class="nw-breakdown-header">
        <span>{{ catMeta(cat.key)?.icon }} {{ cat.label }}</span>
        <div class="nw-breakdown-header-right">
          <span class="nw-breakdown-total">{{ fmt(cat.total) }}</span>
          <BaseButton
            size="xs"
            @click="openAddAsset(cat.key as AssetCategoryKey)"
          >
            + Add
          </BaseButton>
        </div>
      </div>

      <div
        v-if="cat.items.length === 0"
        class="nw-breakdown-empty"
      >
        None added
      </div>

      <div
        v-for="asset in cat.items"
        :key="asset.id"
        class="nw-breakdown-row"
      >
        <span class="nw-breakdown-name">{{ asset.name }}</span>
        <div class="nw-breakdown-row-right">
          <span class="nw-breakdown-val">{{ fmt(asset.value) }}</span>
          <BaseButton
            size="xs"
            variant="secondary"
            @click="openEditAsset(asset.id)"
          >
            Edit
          </BaseButton>
          <BaseButton
            size="xs"
            variant="danger"
            @click="removeAsset(asset.id)"
          >
            Delete
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Liabilities section -->
    <div class="nw-section-title">
      Liabilities
    </div>

    <!-- Loans -->
    <div class="nw-breakdown-card">
      <div class="nw-breakdown-header">
        <span>🏦 Loans</span>
        <span
          class="nw-breakdown-total"
          style="color: var(--danger)"
        >{{ fmt(netWorth.totalLoans) }}</span>
      </div>
      <div
        v-if="budget.loans.length === 0"
        class="nw-breakdown-empty"
      >
        No loans
      </div>
      <div
        v-for="loan in budget.loans"
        :key="loan.id"
        class="nw-breakdown-row"
      >
        <span class="nw-breakdown-name">{{ loan.name }}</span>
        <span
          class="nw-breakdown-val"
          style="color: var(--danger)"
        >{{ fmt(loan.remaining) }}</span>
      </div>
    </div>

    <!-- Credit cards -->
    <div class="nw-breakdown-card">
      <div class="nw-breakdown-header">
        <span>💳 Credit Cards</span>
        <span
          class="nw-breakdown-total"
          style="color: var(--danger)"
        >{{ fmt(netWorth.totalCC) }}</span>
      </div>
      <div
        v-if="budget.creditCards.length === 0"
        class="nw-breakdown-empty"
      >
        No credit cards
      </div>
      <div
        v-for="cc in budget.creditCards"
        :key="cc.id"
        class="nw-breakdown-row"
      >
        <span class="nw-breakdown-name">{{ cc.name }}</span>
        <span
          class="nw-breakdown-val"
          style="color: var(--danger)"
        >{{ fmt(cc.balance) }}</span>
      </div>
    </div>

    <!-- Add / Edit asset modal -->
    <BaseModal
      v-model:open="showAssetModal"
      :title="editingAssetId ? 'Edit Asset' : 'Add Asset'"
      size="sm"
    >
      <div class="modal-form">
        <div class="form-group">
          <label
            class="form-label"
            for="asset-cat"
          >Category</label>
          <select
            id="asset-cat"
            v-model="assetForm.category"
            class="form-input"
          >
            <option
              v-for="cat in ASSET_CATEGORIES"
              :key="cat.key"
              :value="cat.key"
            >
              {{ cat.icon }} {{ cat.label }}
            </option>
          </select>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label
              class="form-label"
              for="asset-name"
            >Name</label>
            <input
              id="asset-name"
              v-model="assetForm.name"
              class="form-input"
              type="text"
              placeholder="e.g. TFSA"
            >
          </div>
          <div class="form-group">
            <label
              class="form-label"
              for="asset-value"
            >Value ($)</label>
            <input
              id="asset-value"
              v-model.number="assetForm.value"
              class="form-input"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
            >
          </div>
        </div>

        <p
          v-if="assetFormError"
          class="form-error"
        >
          {{ assetFormError }}
        </p>
      </div>

      <template #footer>
        <BaseButton
          variant="secondary"
          @click="showAssetModal = false; resetAssetForm()"
        >
          Cancel
        </BaseButton>
        <BaseButton
          :disabled="!!assetFormError"
          @click="saveAsset"
        >
          {{ editingAssetId ? 'Update' : 'Add' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.net-worth {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Stat tiles */
.nw-stat-tiles {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 0.5rem;
}

@media (max-width: 700px) {
  .nw-stat-tiles { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 400px) {
  .nw-stat-tiles { grid-template-columns: 1fr; }
}

.nw-stat-tile {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem;
}

.nw-stat-tile--main {
  border-left: 3px solid var(--accent2);
}

.nw-stat-tile__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.nw-stat-tile__value {
  font-size: 1.1rem;
  font-weight: 700;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

.nw-stat-tile__value--lg {
  font-size: 1.4rem;
}

.nw-stat-tile__value--muted {
  color: var(--muted);
  font-size: 0.875rem;
}

/* Snapshot */
.nw-snapshot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.nw-snapshot-hint {
  font-size: 0.78rem;
  color: var(--muted);
}

/* Section title */
.nw-section-title {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  padding-top: 0.25rem;
}

/* Breakdown cards */
.nw-breakdown-card {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.nw-breakdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.nw-breakdown-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nw-breakdown-total {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.nw-breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.82rem;
  gap: 0.5rem;
}

.nw-breakdown-row-right {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.nw-breakdown-name {
  color: var(--muted);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nw-breakdown-val {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.nw-breakdown-empty {
  font-size: 0.78rem;
  color: var(--muted);
  font-style: italic;
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
