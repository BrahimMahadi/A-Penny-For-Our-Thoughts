<!--
  Module:   components/ui/SectionPicker.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 13)
  Updated:  May 2026 (Sprint 18) — drag-to-reorder, collapse toggle,
            move up/down buttons (touch), reset order button
            May 2026 (Sprint 25) — dual-section support (Dashboard + Advanced);
            group separators; jump routes to correct tab; triggered by
            Option B floating handle instead of nav button
            May 2026 (RS-22)     — Dashboard-only picker. Advanced group removed
            entirely (the Advanced tab remains routable via keyboard shortcut 7
            and manages its own ordering inside its own page).
            Drag/reorder UI stripped from Dashboard sections since the dashboard
            is a fixed grid (RS-11) — the reorder buttons never actually moved
            anything on the page, so the picker is now a focused jump + collapse
            tool. Section list is sourced directly from DASHBOARD_SECTIONS so the
            picker order always mirrors the page layout.
  Summary:  Dashboard section manager — a slide-in panel that lets users:
              • Jump to any dashboard section (click the section name)
              • Collapse / expand any dashboard section (toggle button on the right)
            Order matches DashboardPage.vue render order exactly.

  Usage:
    <SectionPicker v-model:open="pickerOpen" />
-->

<script setup lang="ts">
import { computed, nextTick } from 'vue';
import { useUiStore } from '@/stores/ui';
import { DASHBOARD_SECTIONS } from '@/constants/dashboardSections';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>();

const ui = useUiStore();

// ─── Section list ─────────────────────────────────────────────────
// Sourced directly from the canonical DASHBOARD_SECTIONS constant so the
// picker always reflects the actual page layout. There is no user-customisable
// order — the dashboard is a fixed grid.

const dashboardSections = computed(() => DASHBOARD_SECTIONS);

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
        aria-label="Manage dashboard sections"
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

          <!-- ── Section list ──────────────────────────────────── -->
          <div class="section-picker-body">
            <p class="section-picker-hint">
              Click a name to jump · ⊕/⊖ to collapse
            </p>

            <div
              v-for="section in dashboardSections"
              :key="section.id"
              class="section-picker-item"
            >
              <button
                class="picker-jump-btn"
                :title="`Jump to ${section.label}`"
                @click="jumpTo(section.id)"
              >
                <span class="section-picker-item__icon">{{ section.icon }}</span>
                <span class="section-picker-item__label">{{ section.label }}</span>
              </button>

              <button
                class="picker-collapse-btn"
                :title="ui.isSectionCollapsed(section.id) ? 'Expand section' : 'Collapse section'"
                :aria-label="ui.isSectionCollapsed(section.id) ? `Expand ${section.label}` : `Collapse ${section.label}`"
                @click.stop="toggleCollapse(section.id)"
              >
                {{ ui.isSectionCollapsed(section.id) ? '⊕' : '⊖' }}
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
  background: var(--surface, #16161e);
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
  background: var(--surface, #16161e);
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
  color: var(--muted, #8b8b95);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
  transition: color 0.15s;
}

.section-picker-close:hover { color: var(--text, #e3e6ee); }
.section-picker-close:focus-visible {
  outline: 2px solid var(--accent, #5b3df5);
  outline-offset: 2px;
}

/* ─── Body ───────────────────────────────────────────────────────── */
.section-picker-body {
  overflow-y: auto;
  flex: 1;
  padding: 0.5rem 0.75rem 0.75rem;
}

.section-picker-hint {
  font-size: 0.68rem;
  color: var(--muted, #8b8b95);
  letter-spacing: 0.03em;
  margin: 0.4rem 0 0.6rem 0.25rem;
}

/* ─── Item row ───────────────────────────────────────────────────── */
.section-picker-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 7px;
  padding: 0.3rem 0.35rem;
  transition: background 0.12s ease;
  min-height: 2.5rem;
}

.section-picker-item:hover {
  background: var(--surface2, #1a1a24);
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
  padding: 0.35rem 0.5rem;
  cursor: pointer;
  text-align: left;
  color: var(--text, #e3e6ee);
  font-family: inherit;
  font-size: 0.9rem;
  min-width: 0;
}

.picker-jump-btn:hover { color: var(--accent, #5b3df5); }

.picker-jump-btn:focus-visible {
  outline: 2px solid var(--accent, #5b3df5);
  outline-offset: -2px;
}

.section-picker-item__icon {
  font-size: 1.05rem;
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

/* ─── Collapse toggle ────────────────────────────────────────────── */
.picker-collapse-btn {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: var(--muted, #8b8b95);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.3rem 0.45rem;
  border-radius: 4px;
  line-height: 1;
  transition: color 0.12s, background 0.12s;
}

.picker-collapse-btn:hover {
  color: var(--text, #e3e6ee);
  background: var(--surface2, #1a1a24);
}

.picker-collapse-btn:focus-visible {
  outline: 2px solid var(--accent, #5b3df5);
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
@media (max-width: 480px) {
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

@media (max-width: 480px) {
  .section-picker-hint { font-size: 0.72rem; }
}
</style>
