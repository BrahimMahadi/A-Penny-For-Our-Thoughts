<!--
  Module:   components/ui/BaseCard.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Modified: May 2026 (Sprint 13) — sectionId + collapsible support
            May 2026 (Sprint 18) — draggable prop + drag handle
  Summary:  Surface container with optional title + actions slot.
            Replaces the legacy `.card` markup used across every section.

  Props:
    sectionId   — When set, renders `id="section-{sectionId}"` on the root
                  element so the SectionPicker can smooth-scroll to it.
    collapsible — When true (and sectionId is set), a toggle chevron appears
                  in the header. Collapsed state persists via the ui store.
    draggable   — When true, a ⠿ drag handle appears on the left of the header.
                  The handle is the only element with `draggable="true"` — it
                  emits native dragstart/dragend events that bubble to the parent.
-->

<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '@/stores/ui';

interface Props {
  /** Card title; rendered in the section header */
  title?: string;
  /** Render with no border / background — useful for nested cards */
  bare?: boolean;
  /** Compact padding variant */
  compact?: boolean;
  /**
   * Unique slug for this section. Renders as `id="section-{sectionId}"`.
   * Required for SectionPicker jump-to support.
   */
  sectionId?: string;
  /**
   * When true (and sectionId is set), a collapse toggle appears in the header.
   * The collapsed state is persisted in the ui store.
   */
  collapsible?: boolean;
  /**
   * When true, a ⠿ drag handle is shown on the left of the header.
   * The handle carries `draggable="true"` so drag events bubble to the parent
   * container (DashboardPage) without making the whole card draggable.
   */
  draggable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  bare: false,
  compact: false,
  sectionId: '',
  collapsible: false,
  draggable: false,
});

const ui = useUiStore();

const isCollapsed = computed(() =>
  props.collapsible && !!props.sectionId && ui.isSectionCollapsed(props.sectionId),
);

function toggleCollapse(): void {
  if (props.sectionId) ui.toggleSection(props.sectionId);
}
</script>

<template>
  <section
    class="base-card"
    :class="{ 'base-card--bare': bare, 'base-card--compact': compact }"
    v-bind="sectionId ? { id: `section-${sectionId}` } : {}"
  >
    <header
      v-if="title || $slots.actions || $slots.header || collapsible || draggable"
      class="base-card__header"
      :class="{ 'base-card__header--collapsible': collapsible && sectionId }"
      @click="collapsible && sectionId ? toggleCollapse() : undefined"
    >
      <!-- Drag handle (far left — only visible when card is draggable) -->
      <span
        v-if="draggable"
        class="base-card__drag-handle"
        draggable="true"
        aria-label="Drag to reorder section"
        title="Drag to reorder"
        @click.stop
      >⠿</span>

      <slot name="header">
        <h3
          v-if="title"
          class="base-card__title"
        >
          {{ title }}
        </h3>
      </slot>

      <div class="base-card__header-right">
        <div
          v-if="$slots.actions"
          class="base-card__actions"
          @click.stop
        >
          <slot name="actions" />
        </div>

        <!-- Collapse toggle chevron -->
        <button
          v-if="collapsible && sectionId"
          class="base-card__collapse-btn"
          :aria-label="isCollapsed ? `Expand ${title}` : `Collapse ${title}`"
          :aria-expanded="!isCollapsed"
          @click.stop="toggleCollapse"
        >
          <span
            class="base-card__chevron"
            :class="{ 'base-card__chevron--collapsed': isCollapsed }"
          >▼</span>
        </button>
      </div>
    </header>

    <div
      v-show="!isCollapsed"
      class="base-card__body"
    >
      <slot />
    </div>

    <footer
      v-if="$slots.footer && !isCollapsed"
      class="base-card__footer"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.base-card {
  background: var(--surface, #16161e);
  border: 1px solid var(--border, #2a3041);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  color: var(--text, #e3e6ee);
}

.base-card--bare {
  background: transparent;
  border-color: transparent;
  padding: 0;
}

.base-card--compact {
  padding: 0.85rem 1rem;
}

.base-card__header {
  /* Override legacy global `header { ... }` rule from layout.css.
     `<header>` outside Vue components remains styled; inside, we reset. */
  background: transparent;
  border-bottom: 0;
  padding: 0;
  position: static;
  top: auto;
  z-index: auto;

  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.base-card__header--collapsible {
  cursor: pointer;
  user-select: none;
}

/* ─── Drag handle ──────────────────────────────────────────────── */
.base-card__drag-handle {
  flex-shrink: 0;
  color: var(--muted, #8b8b95);
  font-size: 1rem;
  line-height: 1;
  cursor: grab;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  transition: color 0.12s ease, background 0.12s ease;
  /* prevent the drag handle click from toggling collapse */
  user-select: none;
}

.base-card__drag-handle:hover {
  color: var(--text, #e3e6ee);
  background: var(--surface2, #1a1a24);
}

.base-card__drag-handle:active {
  cursor: grabbing;
}

.base-card__header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.base-card__collapse-btn {
  background: transparent;
  border: none;
  color: var(--muted, #8b8b95);
  cursor: pointer;
  padding: 0.2rem 0.3rem;
  font-size: 0.7rem;
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  transition: color 0.15s ease;
}

.base-card__collapse-btn:hover {
  color: var(--text, #e3e6ee);
}

.base-card__collapse-btn:focus-visible {
  outline: 2px solid var(--accent, #5b3df5);
  outline-offset: 2px;
}

.base-card__chevron {
  display: inline-block;
  transition: transform 0.2s ease;
}

.base-card__chevron--collapsed {
  transform: rotate(-90deg);
}

@media (prefers-reduced-motion: reduce) {
  .base-card__chevron { transition: none; }
}

.base-card__title {
  margin: 0;
  font-size: 1rem;
  letter-spacing: 0.02em;
  font-weight: 600;
  color: var(--text, #e3e6ee);
}

.base-card__actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.base-card__body {
  /* No additional styling — let children control their own layout */
}

.base-card__footer {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border, #2a3041);
}
</style>
