<!--
  Module:   components/pages/DashboardPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Updated:  May 2026 (Sprint 4)  — all section SFCs wired
            May 2026 (Sprint 13) — section IDs, group labels, collapsible
            May 2026 (Sprint 18) — dynamic ordering + drag-and-drop reorder
  Summary:  Dashboard tab host. Renders all financial section components in a
            user-configurable order persisted in the ui store. Each section card
            is collapsible and draggable. The order is controlled by
            ui.sectionOrder and can be changed by dragging cards or via the
            SectionPicker panel.
-->

<script setup lang="ts">
import { ref, computed, type Component } from 'vue';
import BaseCard  from '@/components/ui/BaseCard.vue';
import StatCard  from '@/components/ui/StatCard.vue';
import { useUiStore }    from '@/stores/ui';
import { useAnalytics }  from '@/composables/useAnalytics';
import { SECTION_MAP }   from '@/constants/dashboardSections';
import { fmt }           from '@/utils/format';

// ─── Section components ───────────────────────────────────────────
import IncomeStreams        from '@/components/sections/IncomeStreams.vue';
import BudgetAllocation    from '@/components/sections/BudgetAllocation.vue';
import WantsTracker        from '@/components/sections/WantsTracker.vue';
import ExpenseCards        from '@/components/sections/ExpenseCards.vue';
import Loans               from '@/components/sections/Loans.vue';
import CreditCards         from '@/components/sections/CreditCards.vue';
import Subscriptions       from '@/components/sections/Subscriptions.vue';
import Savings             from '@/components/sections/Savings.vue';
import SavingsGoals        from '@/components/sections/SavingsGoals.vue';
import GoalsTimeline       from '@/components/sections/GoalsTimeline.vue';
import NetWorth            from '@/components/sections/NetWorth.vue';
import BudgetVsActual      from '@/components/sections/BudgetVsActual.vue';
import SpendingAnalytics   from '@/components/sections/SpendingAnalytics.vue';
import Wishlist            from '@/components/sections/Wishlist.vue';
import SpendingTrendSection from '@/components/sections/SpendingTrendSection.vue';
import ChequingBalance      from '@/components/sections/ChequingBalance.vue';

/** Registry: section id → its Vue component */
const SECTION_COMPONENTS: Record<string, Component> = {
  'spending-trend':     SpendingTrendSection,
  'income-streams':     IncomeStreams,
  'budget-allocation':  BudgetAllocation,
  'wants-tracker':      WantsTracker,
  'budget-vs-actual':   BudgetVsActual,
  'expense-cards':      ExpenseCards,
  'subscriptions':      Subscriptions,
  'loans':              Loans,
  'credit-cards':       CreditCards,
  'savings-accounts':   Savings,
  'savings-goals':      SavingsGoals,
  'goals-timeline':     GoalsTimeline,
  'chequing-balance':   ChequingBalance,
  'net-worth':          NetWorth,
  'spending-analytics': SpendingAnalytics,
  'wishlist':           Wishlist,
};

// ─── Stores & analytics ───────────────────────────────────────────
const ui = useUiStore();
const {
  totalMonthlyIncome,
  currentMonthBudgeted,
  currentMonthActuals,
  prevMonthActuals,
  netWorth,
} = useAnalytics();

const needsDelta = computed(() =>
  prevMonthActuals.value.needs > 0
    ? currentMonthActuals.value.needs - prevMonthActuals.value.needs
    : null,
);
const wantsDelta = computed(() =>
  prevMonthActuals.value.wants > 0
    ? currentMonthActuals.value.wants - prevMonthActuals.value.wants
    : null,
);

// ─── Drag-and-drop state ──────────────────────────────────────────
/**
 * Index of the card currently being dragged (-1 = none).
 * Tracked so the dragged card can be visually dimmed.
 */
const dragIndex = ref<number>(-1);

/**
 * Index of the card the cursor is currently over (-1 = none).
 * A drop-indicator line is shown ABOVE this card.
 */
const dropIndex = ref<number>(-1);

// ─── DnD handlers ────────────────────────────────────────────────

/**
 * Called when drag starts on a section's ⠿ handle.
 * The event bubbles from the handle (inside BaseCard) up to the
 * outer .section-slot div where we listen.
 */
function onDragStart(event: DragEvent, index: number): void {
  dragIndex.value = index;
  // Required for Firefox — must set some drag data
  event.dataTransfer?.setData('text/plain', String(index));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function onDragOver(event: DragEvent, index: number): void {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  dropIndex.value = index;
}

function onDragLeave(event: DragEvent, index: number): void {
  // Only clear dropIndex when the cursor truly leaves this slot
  // (not when it enters a child element — check relatedTarget)
  const related = event.relatedTarget as HTMLElement | null;
  const slot = (event.currentTarget as HTMLElement);
  if (!related || !slot.contains(related)) {
    if (dropIndex.value === index) dropIndex.value = -1;
  }
}

function onDrop(event: DragEvent, targetIndex: number): void {
  event.preventDefault();
  const from = dragIndex.value;
  if (from === -1 || from === targetIndex) {
    cleanup();
    return;
  }
  // Reorder: splice out the dragged item, insert before targetIndex
  const newOrder = [...ui.sectionOrder];
  const [moved] = newOrder.splice(from, 1);
  // After the splice, if we were dragging forward (from < targetIndex),
  // targetIndex has shifted left by 1.
  const insertAt = from < targetIndex ? targetIndex - 1 : targetIndex;
  newOrder.splice(insertAt, 0, moved);
  ui.setSectionOrder(newOrder);
  cleanup();
}

function onDragEnd(): void {
  cleanup();
}

function cleanup(): void {
  dragIndex.value = -1;
  dropIndex.value = -1;
}
</script>

<template>
  <div class="page-dashboard">
    <!-- ══ Top stats row (fixed — not draggable) ══════════════════════ -->
    <div class="stats-row">
      <StatCard
        label="Monthly income"
        :value="fmt(totalMonthlyIncome)"
        variant="accent"
      />
      <StatCard
        label="Needs budget"
        :value="fmt(currentMonthBudgeted.needs)"
        :hint="`Spent: ${fmt(currentMonthActuals.needs)}`"
        :delta="needsDelta"
        delta-prefix="$"
        :invert-delta="true"
      />
      <StatCard
        label="Wants budget"
        :value="fmt(currentMonthBudgeted.wants)"
        :hint="`Spent: ${fmt(currentMonthActuals.wants)}`"
        :delta="wantsDelta"
        delta-prefix="$"
        :invert-delta="true"
      />
      <StatCard
        label="Net worth"
        :value="fmt(netWorth.netWorth)"
        :hint="`Assets: ${fmt(netWorth.totalAssets)} · Liabilities: ${fmt(netWorth.totalLiabilities)}`"
        :delta="netWorth.momChange"
        delta-prefix="$"
      />
    </div>

    <!-- ══ Dynamically ordered sections ══════════════════════════════ -->
    <template
      v-for="(sectionId, index) in ui.sectionOrder"
      :key="sectionId"
    >
      <!--
        Drop indicator — a thin accent line shown ABOVE the card at dropIndex.
        Hidden when:
          - not currently dragging
          - would be a no-op (dragging onto itself or one position after itself)
      -->
      <div
        v-if="
          dropIndex === index &&
          dragIndex !== -1 &&
          dragIndex !== index &&
          dragIndex !== index - 1
        "
        class="drop-indicator"
        aria-hidden="true"
      />

      <!--
        Section slot — the drop target for the whole card area.
        Drag events bubble from the ⠿ handle inside BaseCard.
      -->
      <div
        class="section-slot"
        :class="{
          'section-slot--dragging': dragIndex === index,
          'section-slot--drag-active': dragIndex !== -1,
        }"
        @dragstart="onDragStart($event, index)"
        @dragover="onDragOver($event, index)"
        @dragleave="onDragLeave($event, index)"
        @drop="onDrop($event, index)"
        @dragend="onDragEnd"
      >
        <BaseCard
          :title="SECTION_MAP[sectionId]?.title ?? sectionId"
          :section-id="sectionId"
          :collapsible="true"
          :draggable="true"
        >
          <component :is="SECTION_COMPONENTS[sectionId]" />
        </BaseCard>
      </div>
    </template>

    <!-- Drop indicator at the very end of the list -->
    <div
      v-if="
        dropIndex === ui.sectionOrder.length &&
        dragIndex !== -1 &&
        dragIndex !== ui.sectionOrder.length - 1
      "
      class="drop-indicator"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.page-dashboard {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ─── Stats row ────────────────────────────────────────────────── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

@media (max-width: 900px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 540px) {
  .stats-row { grid-template-columns: 1fr; }
}

/* ─── Section slot (drag wrapper) ──────────────────────────────── */
.section-slot {
  /* Explicit position context for future drop-zone pseudo overlays */
  position: relative;
  border-radius: 10px;
  transition: opacity 0.15s ease;
}

/* The card being dragged fades out to show the "ghost" */
.section-slot--dragging {
  opacity: 0.35;
}

/* While any drag is active, give non-dragged slots a subtle hover ring */
.section-slot--drag-active:not(.section-slot--dragging) {
  outline: 2px solid transparent;
  transition: outline-color 0.1s ease, opacity 0.15s ease;
}

.section-slot--drag-active:not(.section-slot--dragging):hover {
  outline-color: var(--accent, #4ade80);
}

/* ─── Drop indicator line ──────────────────────────────────────── */
.drop-indicator {
  height: 3px;
  border-radius: 2px;
  background: var(--accent, #4ade80);
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
  margin: -0.25rem 0;
  animation: drop-indicator-pulse 0.8s ease-in-out infinite alternate;
}

@keyframes drop-indicator-pulse {
  from { opacity: 0.7; }
  to   { opacity: 1;   }
}

@media (prefers-reduced-motion: reduce) {
  .drop-indicator { animation: none; }
  .section-slot { transition: none; }
}
</style>
