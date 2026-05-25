<!--
  Module:   components/ui/SectionPicker.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 13)
  Updated:  May 2026 (Sprint 18) — drag-to-reorder, collapse toggle,
            move up/down buttons (touch), reset order button
            May 2026 (Sprint 25) — dual-section support (Dashboard + Advanced);
            group separators; jump routes to correct tab; triggered by
            Option B floating handle instead of nav button
  Summary:  Dashboard + Advanced section manager — a slide-in panel that lets users:
              • Jump to any section (click the section name)
              • Collapse / expand any section (toggle button on the right)
              • Reorder sections by dragging the ⠿ handle (desktop)
              • Reorder sections via ↑ / ↓ buttons (touch / keyboard)
              • Reset section order to the default arrangement
            Sections are grouped by tab (Dashboard / Advanced) with a
            visual separator between the two groups.

  Usage:
    <SectionPicker v-model:open="pickerOpen" />
-->

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useUiStore } from '@/stores/ui';
import {
  SECTION_MAP,
  DEFAULT_SECTION_ORDER,
  DEFAULT_ADVANCED_ORDER,
} from '@/constants/dashboardSections';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>();

const ui = useUiStore();

// ─── Ordered section lists ────────────────────────────────────────

const orderedDashboard = computed(() =>
  ui.sectionOrder
    .map(id => SECTION_MAP[id])
    .filter(Boolean),
);

const orderedAdvanced = computed(() =>
  ui.advancedSectionOrder
    .map(id => SECTION_MAP[id])
    .filter(Boolean),
);

// ─── Jump to section ──────────────────────────────────────────────

function close(): void {
  emit('update:open', false);
}

function jumpTo(sectionId: string, tab: 'dashboard' | 'advanced'): void {
  close();
  if (ui.activeTab !== tab) ui.setActiveTab(tab);
  ui.expandSection(sectionId);
  nextTick(() => {
    const el = document.getElementById(`section-${sectionId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// ─── Collapse toggle ──────────────────────────────────────────────

function toggleCollapse(sectionId: string): void {
  ui.toggleSection(sectionId);
}

// ─── Reset order ─────────────────────────────────────────────────

function resetDashboardOrder(): void {
  ui.resetSectionOrder();
}

function resetAdvancedOrder(): void {
  ui.resetAdvancedSectionOrder();
}

const isDefaultDashboardOrder = computed(
  () => ui.sectionOrder.join(',') === DEFAULT_SECTION_ORDER.join(','),
);

const isDefaultAdvancedOrder = computed(
  () => ui.advancedSectionOrder.join(',') === DEFAULT_ADVANCED_ORDER.join(','),
);

// ─── Dashboard: move up / down ────────────────────────────────────

function moveDashboardUp(sectionId: string): void {
  ui.moveSectionUp(sectionId);
}

function moveDashboardDown(sectionId: string): void {
  ui.moveSectionDown(sectionId);
}

// ─── Advanced: move up / down ─────────────────────────────────────

function moveAdvancedUp(sectionId: string): void {
  ui.moveAdvancedSectionUp(sectionId);
}

function moveAdvancedDown(sectionId: string): void {
  ui.moveAdvancedSectionDown(sectionId);
}

// ─── Dashboard drag-and-drop ──────────────────────────────────────

const dashDragIndex = ref<number>(-1);
const dashDropIndex = ref<number>(-1);

function onDashDragStart(event: DragEvent, index: number): void {
  dashDragIndex.value = index;
  event.dataTransfer?.setData('text/plain', String(index));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function onDashDragOver(event: DragEvent, index: number): void {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  dashDropIndex.value = index;
}

function onDashDragleave(event: DragEvent, index: number): void {
  const related = event.relatedTarget as HTMLElement | null;
  const slot = event.currentTarget as HTMLElement;
  if (!related || !slot.contains(related)) {
    if (dashDropIndex.value === index) dashDropIndex.value = -1;
  }
}

function onDashDrop(event: DragEvent, targetIndex: number): void {
  event.preventDefault();
  const from = dashDragIndex.value;
  if (from === -1 || from === targetIndex) { dashCleanup(); return; }
  const newOrder = [...ui.sectionOrder];
  const [moved] = newOrder.splice(from, 1);
  const insertAt = from < targetIndex ? targetIndex - 1 : targetIndex;
  newOrder.splice(insertAt, 0, moved);
  ui.setSectionOrder(newOrder);
  dashCleanup();
}

function onDashDragEnd(): void { dashCleanup(); }

function dashCleanup(): void {
  dashDragIndex.value = -1;
  dashDropIndex.value = -1;
}

// ─── Advanced drag-and-drop ───────────────────────────────────────

const advDragIndex = ref<number>(-1);
const advDropIndex = ref<number>(-1);

function onAdvDragStart(event: DragEvent, index: number): void {
  advDragIndex.value = index;
  event.dataTransfer?.setData('text/plain', String(index));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function onAdvDragOver(event: DragEvent, index: number): void {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  advDropIndex.value = index;
}

function onAdvDragleave(event: DragEvent, index: number): void {
  const related = event.relatedTarget as HTMLElement | null;
  const slot = event.currentTarget as HTMLElement;
  if (!related || !slot.contains(related)) {
    if (advDropIndex.value === index) advDropIndex.value = -1;
  }
}

function onAdvDrop(event: DragEvent, targetIndex: number): void {
  event.preventDefault();
  const from = advDragIndex.value;
  if (from === -1 || from === targetIndex) { advCleanup(); return; }
  const newOrder = [...ui.advancedSectionOrder];
  const [moved] = newOrder.splice(from, 1);
  const insertAt = from < targetIndex ? targetIndex - 1 : targetIndex;
  newOrder.splice(insertAt, 0, moved);
  ui.setAdvancedSectionOrder(newOrder);
  advCleanup();
}

function onAdvDragEnd(): void { advCleanup(); }

function advCleanup(): void {
  advDragIndex.value = -1;
  advDropIndex.value = -1;
}

// ─── Backdrop / keyboard close ────────────────────────────────────

function onBackdropClick(event: MouseEvent): void {
  if ((event.target as HTMLElement).classList.contains('section-picker-backdrop')) {
    close();
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close();
}
</script>

<template>
  <Teleport to="body">
    <Transition name="picker">
      <div
        v-if="open"
        class="section-picker-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Manage sections"
        @click="onBackdropClick"
        @keydown="onKeydown"
      >
        <div class="section-picker-panel">
          <!-- ── Header ─────────────────────────────────────────── -->
          <div class="section-picker-header">
            <span class="section-picker-title">Manage sections</span>
            <button
              class="section-picker-close"
              aria-label="Close section picker"
              @click="close"
            >
              ✕
            </button>
          </div>

          <!-- ── Section lists ─────────────────────────────────── -->
          <div class="section-picker-body">
            <p class="section-picker-hint">
              Drag ⠿ to reorder · click name to jump · ⊕/⊖ to collapse
            </p>

            <!-- ── Dashboard group ─────────────────────────────── -->
            <div class="picker-group-header">
              <span class="picker-group-label">Dashboard</span>
              <button
                class="picker-reset-inline"
                :disabled="isDefaultDashboardOrder"
                title="Reset Dashboard order"
                @click="resetDashboardOrder"
              >
                ↺ Reset
              </button>
            </div>

            <template
              v-for="(section, index) in orderedDashboard"
              :key="section.id"
            >
              <div
                v-if="
                  dashDropIndex === index &&
                    dashDragIndex !== -1 &&
                    dashDragIndex !== index &&
                    dashDragIndex !== index - 1
                "
                class="picker-drop-indicator"
                aria-hidden="true"
              />

              <div
                class="section-picker-item"
                :class="{
                  'section-picker-item--dragging': dashDragIndex === index,
                  'section-picker-item--drag-active': dashDragIndex !== -1,
                }"
                @dragover="onDashDragOver($event, index)"
                @dragleave="onDashDragleave($event, index)"
                @drop="onDashDrop($event, index)"
                @dragend="onDashDragEnd"
              >
                <span
                  class="picker-drag-handle"
                  draggable="true"
                  title="Drag to reorder"
                  aria-label="Drag to reorder"
                  @dragstart="onDashDragStart($event, index)"
                  @click.stop
                >⠿</span>

                <button
                  class="picker-jump-btn"
                  :title="`Jump to ${section.label}`"
                  @click="jumpTo(section.id, 'dashboard')"
                >
                  <span class="section-picker-item__icon">{{ section.icon }}</span>
                  <span class="section-picker-item__label">{{ section.label }}</span>
                </button>

                <div class="picker-move-btns">
                  <button
                    class="picker-move-btn"
                    :disabled="index === 0"
                    aria-label="Move up"
                    title="Move up"
                    @click.stop="moveDashboardUp(section.id)"
                  >▲</button>
                  <button
                    class="picker-move-btn"
                    :disabled="index === orderedDashboard.length - 1"
                    aria-label="Move down"
                    title="Move down"
                    @click.stop="moveDashboardDown(section.id)"
                  >▼</button>
                </div>

                <button
                  class="picker-collapse-btn"
                  :title="ui.isSectionCollapsed(section.id) ? 'Expand section' : 'Collapse section'"
                  :aria-label="ui.isSectionCollapsed(section.id) ? `Expand ${section.label}` : `Collapse ${section.label}`"
                  @click.stop="toggleCollapse(section.id)"
                >
                  {{ ui.isSectionCollapsed(section.id) ? '⊕' : '⊖' }}
                </button>
              </div>
            </template>

            <!-- Drop indicator at end of dashboard list -->
            <div
              v-if="
                dashDropIndex === orderedDashboard.length &&
                  dashDragIndex !== -1 &&
                  dashDragIndex !== orderedDashboard.length - 1
              "
              class="picker-drop-indicator"
              aria-hidden="true"
            />

            <!-- ── Advanced group ──────────────────────────────── -->
            <div class="picker-group-divider" />

            <div class="picker-group-header">
              <span class="picker-group-label">Advanced</span>
              <button
                class="picker-reset-inline"
                :disabled="isDefaultAdvancedOrder"
                title="Reset Advanced order"
                @click="resetAdvancedOrder"
              >
                ↺ Reset
              </button>
            </div>

            <template
              v-for="(section, index) in orderedAdvanced"
              :key="section.id"
            >
              <div
                v-if="
                  advDropIndex === index &&
                    advDragIndex !== -1 &&
                    advDragIndex !== index &&
                    advDragIndex !== index - 1
                "
                class="picker-drop-indicator"
                aria-hidden="true"
              />

              <div
                class="section-picker-item"
                :class="{
                  'section-picker-item--dragging': advDragIndex === index,
                  'section-picker-item--drag-active': advDragIndex !== -1,
                }"
                @dragover="onAdvDragOver($event, index)"
                @dragleave="onAdvDragleave($event, index)"
                @drop="onAdvDrop($event, index)"
                @dragend="onAdvDragEnd"
              >
                <span
                  class="picker-drag-handle picker-drag-handle--advanced"
                  draggable="true"
                  title="Drag to reorder"
                  aria-label="Drag to reorder"
                  @dragstart="onAdvDragStart($event, index)"
                  @click.stop
                >⠿</span>

                <button
                  class="picker-jump-btn picker-jump-btn--advanced"
                  :title="`Jump to ${section.label}`"
                  @click="jumpTo(section.id, 'advanced')"
                >
                  <span class="section-picker-item__icon">{{ section.icon }}</span>
                  <span class="section-picker-item__label">{{ section.label }}</span>
                </button>

                <div class="picker-move-btns">
                  <button
                    class="picker-move-btn"
                    :disabled="index === 0"
                    aria-label="Move up"
                    title="Move up"
                    @click.stop="moveAdvancedUp(section.id)"
                  >▲</button>
                  <button
                    class="picker-move-btn"
                    :disabled="index === orderedAdvanced.length - 1"
                    aria-label="Move down"
                    title="Move down"
                    @click.stop="moveAdvancedDown(section.id)"
                  >▼</button>
                </div>

                <button
                  class="picker-collapse-btn"
                  :title="ui.isSectionCollapsed(section.id) ? 'Expand section' : 'Collapse section'"
                  :aria-label="ui.isSectionCollapsed(section.id) ? `Expand ${section.label}` : `Collapse ${section.label}`"
                  @click.stop="toggleCollapse(section.id)"
                >
                  {{ ui.isSectionCollapsed(section.id) ? '⊕' : '⊖' }}
                </button>
              </div>
            </template>

            <!-- Drop indicator at end of advanced list -->
            <div
              v-if="
                advDropIndex === orderedAdvanced.length &&
                  advDragIndex !== -1 &&
                  advDragIndex !== orderedAdvanced.length - 1
              "
              class="picker-drop-indicator"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ─── Backdrop ───────────────────────────────────────────────────── */
.section-picker-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  z-index: 200;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
}

/* ─── Panel ──────────────────────────────────────────────────────── */
.section-picker-panel {
  width: min(340px, 92vw);
  height: 100%;
  background: var(--surface, #0a1810);
  border-left: 1px solid var(--border, #2a3041);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Header ─────────────────────────────────────────────────────── */
.section-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border, #2a3041);
  background: var(--surface, #0a1810);
  flex-shrink: 0;
}

.section-picker-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text, #e3e6ee);
  letter-spacing: 0.01em;
}

.section-picker-close {
  background: transparent;
  border: none;
  color: var(--muted, #5a7a63);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
  transition: color 0.15s;
}

.section-picker-close:hover { color: var(--text, #e3e6ee); }
.section-picker-close:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

/* ─── Body ───────────────────────────────────────────────────────── */
.section-picker-body {
  overflow-y: auto;
  flex: 1;
  padding: 0.5rem 0.75rem 0.5rem;
}

.section-picker-hint {
  font-size: 0.68rem;
  color: var(--muted, #5a7a63);
  letter-spacing: 0.03em;
  margin: 0.4rem 0 0.6rem 0.25rem;
}

/* ─── Group header ───────────────────────────────────────────────── */
.picker-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.35rem 0.2rem;
  margin-bottom: 0.15rem;
}

.picker-group-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent, #4ade80);
}

/* ─── Group divider ──────────────────────────────────────────────── */
.picker-group-divider {
  height: 1px;
  background: var(--border, #2a3041);
  margin: 0.6rem 0.35rem;
}

/* ─── Inline reset button ────────────────────────────────────────── */
.picker-reset-inline {
  background: transparent;
  border: none;
  color: var(--muted, #5a7a63);
  font-size: 0.68rem;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-family: inherit;
  transition: color 0.12s;
}

.picker-reset-inline:hover:not(:disabled) {
  color: var(--text, #e3e6ee);
}

.picker-reset-inline:disabled {
  opacity: 0.3;
  cursor: default;
}

.picker-reset-inline:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

/* ─── Drop indicator (picker) ────────────────────────────────────── */
.picker-drop-indicator {
  height: 2px;
  border-radius: 2px;
  background: var(--accent, #4ade80);
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.5);
  margin: 1px 0;
}

/* ─── Item row ───────────────────────────────────────────────────── */
.section-picker-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 7px;
  padding: 0.3rem 0.35rem;
  transition: background 0.12s ease, opacity 0.12s ease;
  min-height: 2.5rem;
}

.section-picker-item:hover {
  background: var(--surface2, #0f2018);
}

.section-picker-item--dragging {
  opacity: 0.35;
}

/* ─── Drag handle ────────────────────────────────────────────────── */
.picker-drag-handle {
  flex-shrink: 0;
  color: var(--muted, #5a7a63);
  font-size: 1rem;
  cursor: grab;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
  line-height: 1;
  user-select: none;
  transition: color 0.12s;
}

.picker-drag-handle:hover { color: var(--text, #e3e6ee); }
.picker-drag-handle:active { cursor: grabbing; }

/* Advanced handle uses accent2 colour to distinguish groups */
.picker-drag-handle--advanced:hover { color: var(--accent2, #60a5fa); }

/* ─── Jump button ────────────────────────────────────────────────── */
.picker-jump-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  border-radius: 5px;
  padding: 0.25rem 0.35rem;
  cursor: pointer;
  text-align: left;
  color: var(--text, #e3e6ee);
  font-family: inherit;
  font-size: 0.85rem;
  min-width: 0;
}

.picker-jump-btn:hover { color: var(--accent, #4ade80); }
.picker-jump-btn--advanced:hover { color: var(--accent2, #60a5fa); }

.picker-jump-btn:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: -2px;
}

.section-picker-item__icon {
  font-size: 1rem;
  width: 1.3rem;
  text-align: center;
  flex-shrink: 0;
}

.section-picker-item__label {
  flex: 1;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── Move up/down buttons ───────────────────────────────────────── */
.picker-move-btns {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
}

.picker-move-btn {
  background: transparent;
  border: none;
  color: var(--muted, #5a7a63);
  font-size: 0.6rem;
  cursor: pointer;
  padding: 0.1rem 0.25rem;
  border-radius: 3px;
  line-height: 1;
  transition: color 0.12s;
}

.picker-move-btn:hover:not(:disabled) {
  color: var(--text, #e3e6ee);
  background: var(--surface2, #0f2018);
}

.picker-move-btn:disabled {
  opacity: 0.25;
  cursor: default;
}

.picker-move-btn:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

/* ─── Collapse toggle ────────────────────────────────────────────── */
.picker-collapse-btn {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: var(--muted, #5a7a63);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.2rem 0.3rem;
  border-radius: 4px;
  line-height: 1;
  transition: color 0.12s;
}

.picker-collapse-btn:hover { color: var(--text, #e3e6ee); }

.picker-collapse-btn:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

/* ─── Slide-in/out transition ────────────────────────────────────── */
.picker-enter-active,
.picker-leave-active {
  transition: opacity 0.2s ease;
}

.picker-enter-active .section-picker-panel,
.picker-leave-active .section-picker-panel {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.picker-enter-from,
.picker-leave-to {
  opacity: 0;
}

.picker-enter-from .section-picker-panel,
.picker-leave-to .section-picker-panel {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .picker-enter-active,
  .picker-leave-active,
  .picker-enter-active .section-picker-panel,
  .picker-leave-active .section-picker-panel,
  .section-picker-item {
    transition: none;
  }
}

/* ─── Mobile: full-width bottom sheet ───────────────────────────── */
@media (max-width: 540px) {
  .section-picker-backdrop {
    align-items: flex-end;
    justify-content: center;
  }

  .section-picker-panel {
    width: 100%;
    height: auto;
    max-height: 80dvh;
    border-left: none;
    border-top: 1px solid var(--border, #2a3041);
    border-radius: 16px 16px 0 0;
  }

  .picker-enter-from .section-picker-panel,
  .picker-leave-to .section-picker-panel {
    transform: translateY(100%);
  }
}
</style>
