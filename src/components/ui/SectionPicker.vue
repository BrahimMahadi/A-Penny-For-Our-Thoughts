<!--
  Module:   components/ui/SectionPicker.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 13)
  Updated:  May 2026 (Sprint 18) — drag-to-reorder, collapse toggle,
            move up/down buttons (touch), reset order button
  Summary:  Dashboard section manager — a slide-in panel that lets users:
              • Jump to any section (click the section name)
              • Collapse / expand any section (toggle button on the right)
              • Reorder sections by dragging the ⠿ handle (desktop)
              • Reorder sections via ↑ / ↓ buttons (touch / keyboard)
              • Reset section order to the default arrangement

  Usage:
    <SectionPicker v-model:open="pickerOpen" />
-->

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useUiStore } from '@/stores/ui';
import { SECTION_MAP, DEFAULT_SECTION_ORDER } from '@/constants/dashboardSections';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>();

const ui = useUiStore();

// ─── Ordered section list (mirrors ui.sectionOrder) ──────────────

const orderedSections = computed(() =>
  ui.sectionOrder
    .map(id => SECTION_MAP[id])
    .filter(Boolean),
);

// ─── Jump to section ──────────────────────────────────────────────

function close(): void {
  emit('update:open', false);
}

function jumpTo(sectionId: string): void {
  close();
  if (ui.activeTab !== 'dashboard') ui.setActiveTab('dashboard');
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

function resetOrder(): void {
  ui.resetSectionOrder();
}

const isDefaultOrder = computed(
  () => ui.sectionOrder.join(',') === DEFAULT_SECTION_ORDER.join(','),
);

// ─── Move up / down (touch-friendly) ─────────────────────────────

function moveUp(sectionId: string): void {
  ui.moveSectionUp(sectionId);
}

function moveDown(sectionId: string): void {
  ui.moveSectionDown(sectionId);
}

// ─── Drag-and-drop (desktop) ──────────────────────────────────────

const dragIndex  = ref<number>(-1);
const dropIndex  = ref<number>(-1);

function onPickerDragStart(event: DragEvent, index: number): void {
  dragIndex.value = index;
  event.dataTransfer?.setData('text/plain', String(index));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function onPickerDragOver(event: DragEvent, index: number): void {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  dropIndex.value = index;
}

function onPickerDragleave(event: DragEvent, index: number): void {
  const related = event.relatedTarget as HTMLElement | null;
  const slot = event.currentTarget as HTMLElement;
  if (!related || !slot.contains(related)) {
    if (dropIndex.value === index) dropIndex.value = -1;
  }
}

function onPickerDrop(event: DragEvent, targetIndex: number): void {
  event.preventDefault();
  const from = dragIndex.value;
  if (from === -1 || from === targetIndex) {
    pickerCleanup();
    return;
  }
  const newOrder = [...ui.sectionOrder];
  const [moved] = newOrder.splice(from, 1);
  const insertAt = from < targetIndex ? targetIndex - 1 : targetIndex;
  newOrder.splice(insertAt, 0, moved);
  ui.setSectionOrder(newOrder);
  pickerCleanup();
}

function onPickerDragEnd(): void {
  pickerCleanup();
}

function pickerCleanup(): void {
  dragIndex.value = -1;
  dropIndex.value = -1;
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

          <!-- ── Section list ───────────────────────────────────── -->
          <div class="section-picker-body">
            <!-- Drag hint -->
            <p class="section-picker-hint">
              Drag ⠿ to reorder · click name to jump · ⊕/⊖ to collapse
            </p>

            <template
              v-for="(section, index) in orderedSections"
              :key="section.id"
            >
              <!-- Drop indicator in picker -->
              <div
                v-if="
                  dropIndex === index &&
                    dragIndex !== -1 &&
                    dragIndex !== index &&
                    dragIndex !== index - 1
                "
                class="picker-drop-indicator"
                aria-hidden="true"
              />

              <div
                class="section-picker-item"
                :class="{
                  'section-picker-item--dragging': dragIndex === index,
                  'section-picker-item--drag-active': dragIndex !== -1,
                }"
                @dragover="onPickerDragOver($event, index)"
                @dragleave="onPickerDragleave($event, index)"
                @drop="onPickerDrop($event, index)"
                @dragend="onPickerDragEnd"
              >
                <!-- Drag handle -->
                <span
                  class="picker-drag-handle"
                  draggable="true"
                  title="Drag to reorder"
                  aria-label="Drag to reorder"
                  @dragstart="onPickerDragStart($event, index)"
                  @click.stop
                >⠿</span>

                <!-- Jump-to button -->
                <button
                  class="picker-jump-btn"
                  :title="`Jump to ${section.label}`"
                  @click="jumpTo(section.id)"
                >
                  <span class="section-picker-item__icon">{{ section.icon }}</span>
                  <span class="section-picker-item__label">{{ section.label }}</span>
                </button>

                <!-- Move up / down (touch / keyboard) -->
                <div class="picker-move-btns">
                  <button
                    class="picker-move-btn"
                    :disabled="index === 0"
                    aria-label="Move up"
                    title="Move up"
                    @click.stop="moveUp(section.id)"
                  >
                    ▲
                  </button>
                  <button
                    class="picker-move-btn"
                    :disabled="index === orderedSections.length - 1"
                    aria-label="Move down"
                    title="Move down"
                    @click.stop="moveDown(section.id)"
                  >
                    ▼
                  </button>
                </div>

                <!-- Collapse toggle -->
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

            <!-- Drop indicator at end of list -->
            <div
              v-if="
                dropIndex === orderedSections.length &&
                  dragIndex !== -1 &&
                  dragIndex !== orderedSections.length - 1
              "
              class="picker-drop-indicator"
              aria-hidden="true"
            />
          </div>

          <!-- ── Footer: reset order ─────────────────────────────── -->
          <div class="section-picker-footer">
            <button
              class="picker-reset-btn"
              :disabled="isDefaultOrder"
              @click="resetOrder"
            >
              ↺ Reset to default order
            </button>
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

.picker-drag-handle:hover {
  color: var(--text, #e3e6ee);
}

.picker-drag-handle:active {
  cursor: grabbing;
}

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

.picker-jump-btn:hover {
  color: var(--accent, #4ade80);
}

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

.picker-collapse-btn:hover {
  color: var(--text, #e3e6ee);
}

.picker-collapse-btn:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

/* ─── Footer ─────────────────────────────────────────────────────── */
.section-picker-footer {
  flex-shrink: 0;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border, #2a3041);
}

.picker-reset-btn {
  width: 100%;
  background: transparent;
  border: 1px solid var(--border, #2a3041);
  border-radius: 6px;
  color: var(--muted, #5a7a63);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.4rem 0.75rem;
  font-family: inherit;
  transition: color 0.15s, border-color 0.15s;
}

.picker-reset-btn:hover:not(:disabled) {
  color: var(--text, #e3e6ee);
  border-color: var(--text, #e3e6ee);
}

.picker-reset-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.picker-reset-btn:focus-visible {
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
