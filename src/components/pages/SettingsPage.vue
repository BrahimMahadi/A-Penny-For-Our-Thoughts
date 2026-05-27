<!--
  Module:   components/pages/SettingsPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 7)
  Updated:  May 2026 (Sprint 19) — added CategoryManager; moved chequing
            balance to Dashboard (ChequingBalance.vue)
            May 2026 (RS-7)     — deep rebuild: two-column grid layout,
            settings-panel cards with title + subtitle, inline Income
            Sources and Expense Cards (full CRUD), BudgetAllocation with
            inline sliders, lower 3-col grid for Categories / Rules /
            Alerts.
  Summary:  Settings tab. Layout:
              Left col  — Budget Rules (50/30/20 sliders) + Pay Period
              Right col — Income Sources (full CRUD) + Expense Cards (full CRUD)
              Lower grid — Spending Categories + Transaction Rules + Budget Alerts
              Full-width  — Data Management + Account + Danger Zone
-->

<script setup lang="ts">
import { ref } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { isSupabaseConfigured } from '@/lib/supabase';
import BaseButton from '@/components/ui/BaseButton.vue';
import BudgetAllocation from '@/components/sections/BudgetAllocation.vue';
import PayStartDate from '@/components/sections/PayStartDate.vue';
import RulesEngine from '@/components/sections/RulesEngine.vue';
import BudgetAlerts from '@/components/sections/BudgetAlerts.vue';
import CategoryManager from '@/components/sections/CategoryManager.vue';
import IncomeStreams from '@/components/sections/IncomeStreams.vue';
import ExpenseCards from '@/components/sections/ExpenseCards.vue';

const budget = useBudgetStore();
const auth   = useAuthStore();
const toast  = useToast();
const supabaseEnabled = isSupabaseConfigured();

// ─── Data management ──────────────────────────────────────────────────────────
const csvFileInputRef  = ref<HTMLInputElement | null>(null);
const jsonFileInputRef = ref<HTMLInputElement | null>(null);

function handleExportCSV(): void {
  try {
    budget.exportCSV();
    toast.show('CSV exported.', 'success');
  } catch (err) {
    toast.show('Export failed: ' + (err instanceof Error ? err.message : String(err)), 'danger');
  }
}

function openCSVImport(): void { csvFileInputRef.value?.click(); }

function handleCSVFile(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file  = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      if (!window.confirm('Import this CSV? This will replace all current data.')) {
        input.value = '';
        return;
      }
      budget.importCSV(text);
      toast.show('CSV imported successfully.', 'success');
    } catch (err) {
      toast.show('Import failed: ' + (err instanceof Error ? err.message : String(err)), 'danger');
    } finally { input.value = ''; }
  };
  reader.onerror = () => { toast.show('Could not read the file.', 'danger'); input.value = ''; };
  reader.readAsText(file);
}

function handleExportJSON(): void {
  try {
    budget.exportJSON();
    toast.show('JSON backup downloaded.', 'success');
  } catch (err) {
    toast.show('Export failed: ' + (err instanceof Error ? err.message : String(err)), 'danger');
  }
}

function openJSONImport(): void { jsonFileInputRef.value?.click(); }

function handleJSONFile(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file  = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      if (!window.confirm('Import this JSON backup? This will replace all current data.')) {
        input.value = '';
        return;
      }
      budget.importJSON(text);
      toast.show('JSON backup imported successfully.', 'success');
    } catch (err) {
      toast.show('Import failed: ' + (err instanceof Error ? err.message : String(err)), 'danger');
    } finally { input.value = ''; }
  };
  reader.onerror = () => { toast.show('Could not read the file.', 'danger'); input.value = ''; };
  reader.readAsText(file);
}

// ─── Danger zone ─────────────────────────────────────────────────
const confirmClear = ref(false);

function handleClearAll(): void {
  if (!confirmClear.value) {
    confirmClear.value = true;
    return;
  }
  budget.clearAll();
  confirmClear.value = false;
  toast.show('All data cleared.', 'success');
}
</script>

<template>
  <div class="page-settings">

    <!-- ── Page header ───────────────────────────────────────────── -->
    <div class="settings-page-header">
      <div class="settings-eyebrow">Settings</div>
      <h1 class="settings-page-title">Configure A Penny For Our Thoughts</h1>
      <p class="settings-page-subtitle">
        Manage your financial setup and preferences
      </p>
    </div>

    <!-- ── Main two-column grid ──────────────────────────────────── -->
    <div class="settings-main-grid">

      <!-- Left column: Budget Rules + Pay Period -->
      <div class="settings-col">

        <div class="settings-panel">
          <div class="settings-panel__header">
            <h2 class="settings-panel__title">Budget Rules</h2>
            <p class="settings-panel__subtitle">Your 50/30/20 split — drag to adjust</p>
          </div>
          <BudgetAllocation />
        </div>

        <div class="settings-panel">
          <div class="settings-panel__header">
            <h2 class="settings-panel__title">Pay Period</h2>
            <p class="settings-panel__subtitle">Set your bi-weekly cycle anchor</p>
          </div>
          <PayStartDate />
        </div>

      </div><!-- /left col -->

      <!-- Right column: Income Sources + Expense Cards -->
      <div class="settings-col">

        <div class="settings-panel">
          <div class="settings-panel__header">
            <h2 class="settings-panel__title">Income Sources</h2>
            <p class="settings-panel__subtitle">Your paycheques and other income</p>
          </div>
          <IncomeStreams />
        </div>

        <div class="settings-panel">
          <div class="settings-panel__header">
            <h2 class="settings-panel__title">Expense Cards</h2>
            <p class="settings-panel__subtitle">Organize recurring bills by account</p>
          </div>
          <ExpenseCards />
        </div>

      </div><!-- /right col -->

    </div><!-- /main grid -->

    <!-- ── Lower 3-column grid ───────────────────────────────────── -->
    <div class="settings-lower-grid">

      <div class="settings-panel">
        <div class="settings-panel__header">
          <h2 class="settings-panel__title">Spending Categories</h2>
          <p class="settings-panel__subtitle">Labels for your wants purchases</p>
        </div>
        <CategoryManager />
      </div>

      <div class="settings-panel">
        <div class="settings-panel__header">
          <h2 class="settings-panel__title">Transaction Rules</h2>
          <p class="settings-panel__subtitle">Auto-categorise purchases as you type</p>
        </div>
        <RulesEngine />
      </div>

      <div class="settings-panel">
        <div class="settings-panel__header">
          <h2 class="settings-panel__title">Budget Alerts</h2>
          <p class="settings-panel__subtitle">Warnings when a category overspends</p>
        </div>
        <BudgetAlerts />
      </div>

    </div><!-- /lower grid -->

    <!-- ── Data Management ───────────────────────────────────────── -->
    <div class="settings-panel">
      <div class="settings-panel__header">
        <h2 class="settings-panel__title">Data Management</h2>
        <p class="settings-panel__subtitle">Export, import, or back up your budget data</p>
      </div>

      <div class="data-mgmt">
        <p class="data-mgmt__desc">
          Export to CSV for spreadsheet analysis or JSON for a full backup.
          Imports replace all current data. The <kbd class="data-mgmt__kbd">E</kbd> key also exports CSV from anywhere.
        </p>

        <div class="data-mgmt__groups">
          <!-- CSV group -->
          <div class="data-mgmt__group">
            <span class="data-mgmt__group-label">CSV</span>
            <div class="data-mgmt__group-btns">
              <BaseButton
                variant="secondary"
                aria-label="Export CSV"
                @click="handleExportCSV"
              >
                ⬆ Export
              </BaseButton>
              <BaseButton
                variant="secondary"
                aria-label="Import CSV"
                @click="openCSVImport"
              >
                ⬇ Import
              </BaseButton>
            </div>
          </div>

          <div class="data-mgmt__divider" aria-hidden="true" />

          <!-- JSON group -->
          <div class="data-mgmt__group">
            <span class="data-mgmt__group-label">JSON backup</span>
            <div class="data-mgmt__group-btns">
              <BaseButton
                variant="ghost"
                size="sm"
                aria-label="Export JSON backup"
                @click="handleExportJSON"
              >
                📦 Export
              </BaseButton>
              <BaseButton
                variant="ghost"
                size="sm"
                aria-label="Import JSON backup"
                @click="openJSONImport"
              >
                📂 Import
              </BaseButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Hidden file inputs triggered programmatically -->
      <input
        ref="csvFileInputRef"
        type="file"
        accept=".csv"
        class="settings-file-input"
        aria-hidden="true"
        tabindex="-1"
        @change="handleCSVFile"
      >
      <input
        ref="jsonFileInputRef"
        type="file"
        accept=".json"
        class="settings-file-input"
        aria-hidden="true"
        tabindex="-1"
        @change="handleJSONFile"
      >
    </div>

    <!-- ── Account ───────────────────────────────────────────────── -->
    <div
      v-if="supabaseEnabled && auth.user"
      class="settings-panel"
    >
      <div class="settings-panel__header">
        <h2 class="settings-panel__title">Account</h2>
      </div>
      <div class="settings-account">
        <p class="settings-account__email">
          Signed in as <strong>{{ auth.userEmail }}</strong>
        </p>
        <BaseButton
          variant="secondary"
          size="sm"
          @click="auth.signOut()"
        >
          Sign out
        </BaseButton>
      </div>
    </div>

    <!-- ── Danger Zone ───────────────────────────────────────────── -->
    <div
      class="settings-panel settings-panel--danger"
      id="danger-zone"
    >
      <div class="settings-panel__header">
        <h2 class="settings-panel__title settings-panel__title--danger">
          Danger Zone
        </h2>
        <p class="settings-panel__subtitle">Irreversible actions — proceed with care</p>
      </div>

      <div class="settings-danger">
        <p class="settings-danger__desc">
          Permanently clear all budget data — income, expenses, loans, savings, history,
          and settings. This cannot be undone. Export a CSV backup first.
        </p>
        <div class="settings-danger__action">
          <BaseButton
            variant="danger"
            @click="handleClearAll"
          >
            {{ confirmClear ? '⚠ Click again to confirm — this cannot be undone' : 'Clear All Data' }}
          </BaseButton>
          <BaseButton
            v-if="confirmClear"
            variant="ghost"
            size="sm"
            @click="confirmClear = false"
          >
            Cancel
          </BaseButton>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.page-settings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ─── Page header ────────────────────────────────────────────────── */
.settings-page-header {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.settings-eyebrow {
  font-size: 0.72rem;
  color: var(--muted);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.settings-page-title {
  margin: 0 0 0.3rem;
  font-size: clamp(1.3rem, 3.5vw, 1.6rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--text);
}

.settings-page-subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
}

/* ─── Main two-column grid ───────────────────────────────────────── */
.settings-main-grid {
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: 1rem;
  align-items: start;
}

@media (max-width: 860px) {
  .settings-main-grid {
    grid-template-columns: 1fr;
  }
}

.settings-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ─── Lower 3-column grid ────────────────────────────────────────── */
.settings-lower-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  align-items: start;
}

@media (max-width: 1024px) {
  .settings-lower-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .settings-lower-grid {
    grid-template-columns: 1fr;
  }
}

/* ─── Settings panel card ────────────────────────────────────────── */
.settings-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1.1rem 1.2rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.settings-panel__header {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid var(--border);
}

.settings-panel__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text);
}

.settings-panel__title--danger {
  color: var(--danger);
}

.settings-panel__subtitle {
  margin: 0;
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.4;
}

/* Danger zone panel variant */
.settings-panel--danger {
  background: color-mix(in srgb, var(--danger) 3%, var(--surface));
  border-color: color-mix(in srgb, var(--danger) 15%, transparent);
}

/* ─── Data management ────────────────────────────────────────────── */
.data-mgmt {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.data-mgmt__desc {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.55;
  max-width: 52ch;
}

.data-mgmt__kbd {
  display: inline-block;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 0.05rem 0.4rem;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  color: var(--text);
  font-weight: 600;
}

.data-mgmt__groups {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.data-mgmt__group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.data-mgmt__group-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}

.data-mgmt__group-btns {
  display: flex;
  gap: 0.4rem;
}

.data-mgmt__divider {
  width: 1px;
  height: 28px;
  background: var(--border);
  flex-shrink: 0;
}

.settings-file-input {
  display: none;
}

/* ─── Account ────────────────────────────────────────────────────── */
.settings-account {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.settings-account__email {
  margin: 0;
  font-size: 0.87rem;
  color: var(--muted);
}

.settings-account__email strong {
  color: var(--text);
}

/* ─── Danger zone ────────────────────────────────────────────────── */
.settings-danger {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.settings-danger__desc {
  font-size: 0.82rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.55;
  max-width: 52ch;
}

.settings-danger__action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* ─── Responsive tweaks ─────────────────────────────────────────── */
@media (max-width: 480px) {
  .data-mgmt__groups {
    flex-direction: column;
    align-items: flex-start;
  }
  .data-mgmt__divider {
    width: 100%;
    height: 1px;
  }
}
</style>
