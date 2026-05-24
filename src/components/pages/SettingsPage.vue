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
import { useToast } from '@/composables/useToast';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import PayStartDate from '@/components/sections/PayStartDate.vue';
import RulesEngine from '@/components/sections/RulesEngine.vue';
import BudgetAlerts from '@/components/sections/BudgetAlerts.vue';
import CategoryManager from '@/components/sections/CategoryManager.vue';

const budget = useBudgetStore();
const toast  = useToast();

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
