<!--
  Module:   components/ui/SectionPicker.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 13)
  Summary:  Dashboard section picker — a slide-in panel that lists every
            dashboard section grouped by category. Clicking a section:
              1. Emits 'close' so the parent dismisses the panel
              2. Switches to the Dashboard tab (if not already there)
              3. Smooth-scrolls to the section's HTML element

  Usage:
    <SectionPicker v-model:open="pickerOpen" />
-->

<script setup lang="ts">
import { nextTick, computed } from 'vue';
import { useUiStore } from '@/stores/ui';
import { DASHBOARD_SECTIONS, SECTION_GROUPS } from '@/constants/dashboardSections';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>();

const ui = useUiStore();

function close(): void {
  emit('update:open', false);
}

/** Group sections by their group label */
const groupedSections = computed(() =>
  SECTION_GROUPS.map(group => ({
    group,
    sections: DASHBOARD_SECTIONS.filter(s => s.group === group),
  })),
);

function jumpTo(sectionId: string): void {
  close();
  // Ensure we're on the Dashboard tab
  if (ui.activeTab !== 'dashboard') {
    ui.setActiveTab('dashboard');
  }
  // Expand the section if it is collapsed before scrolling
  ui.expandSection(sectionId);
  // Wait for DOM to update (tab switch + expand), then scroll
  nextTick(() => {
    const el = document.getElementById(`section-${sectionId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/** Close on backdrop click */
function onBackdropClick(event: MouseEvent): void {
  if ((event.target as HTMLElement).classList.contains('section-picker-backdrop')) {
    close();
  }
}

/** Close on Escape */
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
        aria-label="Jump to section"
        @click="onBackdropClick"
        @keydown="onKeydown"
      >
        <div class="section-picker-panel">
          <!-- Header -->
          <div class="section-picker-header">
            <span class="section-picker-title">Jump to section</span>
            <button
              class="section-picker-close"
              aria-label="Close section picker"
              @click="close"
            >
              ✕
            </button>
          </div>

          <!-- Section list -->
          <div class="section-picker-body">
            <div
              v-for="grp in groupedSections"
              :key="grp.group"
              class="section-picker-group"
            >
              <p class="section-picker-group-label">
                {{ grp.group }}
              </p>
              <button
                v-for="section in grp.sections"
                :key="section.id"
                class="section-picker-item"
                @click="jumpTo(section.id)"
              >
                <span class="section-picker-item__icon">{{ section.icon }}</span>
                <span class="section-picker-item__label">{{ section.label }}</span>
                <span
                  v-if="ui.isSectionCollapsed(section.id)"
                  class="section-picker-item__collapsed-chip"
                >collapsed</span>
                <span class="section-picker-item__arrow">→</span>
              </button>
            </div>
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

.section-picker-close:hover {
  color: var(--text, #e3e6ee);
}

.section-picker-close:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: 2px;
}

/* ─── Body ───────────────────────────────────────────────────────── */
.section-picker-body {
  overflow-y: auto;
  flex: 1;
  padding: 0.5rem 0 1rem;
}

/* ─── Group ──────────────────────────────────────────────────────── */
.section-picker-group {
  padding: 0 0.75rem;
  margin-bottom: 0.25rem;
}

.section-picker-group-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted, #5a7a63);
  margin: 0.85rem 0 0.3rem 0.5rem;
}

/* ─── Item ───────────────────────────────────────────────────────── */
.section-picker-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  background: transparent;
  border: none;
  border-radius: 7px;
  padding: 0.5rem 0.6rem;
  cursor: pointer;
  text-align: left;
  color: var(--text, #e3e6ee);
  font-family: inherit;
  font-size: 0.875rem;
  transition: background 0.12s ease;
}

.section-picker-item:hover {
  background: var(--surface2, #0f2018);
}

.section-picker-item:focus-visible {
  outline: 2px solid var(--accent, #4ade80);
  outline-offset: -2px;
}

.section-picker-item__icon {
  font-size: 1rem;
  width: 1.5rem;
  text-align: center;
  flex-shrink: 0;
}

.section-picker-item__label {
  flex: 1;
  line-height: 1.3;
}

.section-picker-item__collapsed-chip {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--muted, #5a7a63);
  background: var(--surface2, #0f2018);
  border: 1px solid var(--border, #2a3041);
  border-radius: 3px;
  padding: 0.1rem 0.35rem;
  text-transform: uppercase;
}

.section-picker-item__arrow {
  color: var(--muted, #5a7a63);
  font-size: 0.8rem;
  flex-shrink: 0;
  transition: transform 0.12s ease, color 0.12s ease;
}

.section-picker-item:hover .section-picker-item__arrow {
  transform: translateX(3px);
  color: var(--accent, #4ade80);
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
  .picker-leave-active .section-picker-panel {
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
