<!--
  Module:   components/pages/SettingsPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 7)
  Updated:  May 2026 (Sprint 19) — added CategoryManager; moved chequing
            balance to Dashboard (ChequingBalance.vue)
  Summary:  Settings tab. Hosts:
              • Pay Start Date — bi-weekly cycle anchor
              • Spending Categories — user-defined category CRUD
              • Transaction Rules — auto-categorisation CRUD
              • Budget Alerts — spending threshold CRUD
              • Danger Zone — clear all data
-->

<script setup lang="ts">
import { ref } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { isSupabaseConfigured } from '@/lib/supabase';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BudgetAllocation from '@/components/sections/BudgetAllocation.vue';
import PayStartDate from '@/components/sections/PayStartDate.vue';
import RulesEngine from '@/components/sections/RulesEngine.vue';
import BudgetAlerts from '@/components/sections/BudgetAlerts.vue';
import CategoryManager from '@/components/sections/CategoryManager.vue';

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

// ─── Danger zone ─────────────────────────────────────────────────────────────
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
    <!-- Budget Allocation ──────────────────────────────────────────── -->
    <BaseCard title="Budget Allocation (50/30/20)">
      <BudgetAllocation />
    </BaseCard>

    <!-- Pay Start Date ─────────────────────────────────────────────── -->
    <BaseCard title="Pay Period Anchor">
      <PayStartDate />
    </BaseCard>

    <!-- Spending Categories ────────────────────────────────────────── -->
    <BaseCard title="Spending Categories">
      <CategoryManager />
    </BaseCard>

    <!-- Transaction Rules ──────────────────────────────────────────── -->
    <BaseCard title="Transaction Rules">
      <RulesEngine />
    </BaseCard>

    <!-- Budget Alerts ──────────────────────────────────────────────── -->
    <BaseCard title="Budget Alerts">
      <BudgetAlerts />
    </BaseCard>

    <!-- Data Management ────────────────────────────────────────────── -->
    <BaseCard title="Data Management">
      <div class="data-mgmt">
        <p class="data-mgmt__desc">
          Export to CSV for spreadsheet analysis or JSON for a full backup.
          Imports replace all current data. The <kbd class="data-mgmt__kbd">E</kbd> key also exports CSV from anywhere.
        </p>
        <div class="data-mgmt__grid">
          <BaseButton
            variant="secondary"
            aria-label="Export CSV"
            @click="handleExportCSV"
          >
            ⬆ Export CSV
          </BaseButton>
          <BaseButton
            variant="secondary"
            aria-label="Import CSV"
            @click="openCSVImport"
          >
            ⬇ Import CSV
          </BaseButton>
          <BaseButton
            variant="ghost"
            size="sm"
            aria-label="Export JSON backup"
            @click="handleExportJSON"
          >
            📦 Export JSON
          </BaseButton>
          <BaseButton
            variant="ghost"
            size="sm"
            aria-label="Import JSON backup"
            @click="openJSONImport"
          >
            📂 Import JSON
          </BaseButton>
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
    </BaseCard>

    <!-- Account ─────────────────────────────────────────────────────── -->
    <BaseCard
      v-if="supabaseEnabled && auth.user"
      title="Account"
    >
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
    </BaseCard>

    <!-- Danger Zone ────────────────────────────────────────────────── -->
    <BaseCard title="Danger Zone">
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
    </BaseCard>
  </div>
</template>

<style scoped>
.page-settings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ─── Data management ────────────────────────────────────────────── */
.data-mgmt {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.data-mgmt__desc {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.5;
  max-width: 52ch;
}

.data-mgmt__kbd {
  display: inline-block;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.05rem 0.35rem;
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  color: var(--accent);
}

.data-mgmt__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
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
  line-height: 1.5;
  max-width: 52ch;
}

.settings-danger__action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
