<!--
  Module:   components/pages/AdvancedPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 25) — new Advanced analytics tab
  Summary:  Advanced tab host. Renders the four analytics section components
            in a user-configurable order persisted in the ui store:
              • 6-Month Spending Trend
              • Spending Analytics
              • Budget vs. Actual
              • Net Worth

            Each section is collapsible and draggable (same drag-and-drop
            pattern as DashboardPage). Order is controlled by
            ui.advancedSectionOrder.
-->

<script setup lang="ts">
import { ref, type Component } from 'vue';
import BaseCard   from '@/components/ui/BaseCard.vue';
import { useUiStore } from '@/stores/ui';
import { SECTION_MAP } from '@/constants/dashboardSections';

// ─── Section components ───────────────────────────────────────────
import SpendingTrendSection from '@/components/sections/SpendingTrendSection.vue';
import SpendingAnalytics    from '@/components/sections/SpendingAnalytics.vue';
import BudgetVsActual       from '@/components/sections/BudgetVsActual.vue';
import NetWorth             from '@/components/sections/NetWorth.vue';

/** Registry: section id → its Vue component */
const SECTION_COMPONENTS: Record<string, Component> = {
  'spending-trend':     SpendingTrendSection,
  'spending-analytics': SpendingAnalytics,
  'budget-vs-actual':   BudgetVsActual,
  'net-worth':          NetWorth,
};

// ─── Stores ───────────────────────────────────────────────────────
const ui = useUiStore();

// ─── Drag-and-drop state ──────────────────────────────────────────
const dragIndex = ref<number>(-1);
const dropIndex = ref<number>(-1);

// ─── DnD handlers ────────────────────────────────────────────────

function onDragStart(event: DragEvent, index: number): void {
  dragIndex.value = index;
  event.dataTransfer?.setData('text/plain', String(index));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function onDragOver(event: DragEvent, index: number): void {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  dropIndex.value = index;
}

function onDragLeave(event: DragEvent, index: number): void {
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
  const newOrder = [...ui.advancedSectionOrder];
  const [moved] = newOrder.splice(from, 1);
  const insertAt = from < targetIndex ? targetIndex - 1 : targetIndex;
  newOrder.splice(insertAt, 0, moved);
  ui.setAdvancedSectionOrder(newOrder);
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
  <div class="page-advanced">
    <!-- ══ Dynamically ordered sections ══════════════════════════════ -->
    <template
      v-for="(sectionId, index) in ui.advancedSectionOrder"
      :key="sectionId"
    >
      <!-- Drop indicator above the target card -->
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

    <!-- Drop indicator at end of list -->
    <div
      v-if="
        dropIndex === ui.advancedSectionOrder.length &&
          dragIndex !== -1 &&
          dragIndex !== ui.advancedSectionOrder.length - 1
      "
      class="drop-indicator"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.page-advanced {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ─── Section slot (drag wrapper) ──────────────────────────────── */
.section-slot {
  position: relative;
  border-radius: 10px;
  transition: opacity 0.15s ease;
}

.section-slot--dragging {
  opacity: 0.35;
}

.section-slot--drag-active:not(.section-slot--dragging) {
  outline: 2px solid transparent;
  transition: outline-color 0.1s ease, opacity 0.15s ease;
}

.section-slot--drag-active:not(.section-slot--dragging):hover {
  outline-color: var(--accent, #5b3df5);
}

/* ─── Drop indicator line ──────────────────────────────────────── */
.drop-indicator {
  height: 3px;
  border-radius: 2px;
  background: var(--accent, #5b3df5);
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
  .section-slot   { transition: none; }
}
</style>
