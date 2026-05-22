<!--
  Module:   components/ui/BaseCard.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Summary:  Surface container with optional title + actions slot.
            Replaces the legacy `.card` markup used across every section.
-->

<script setup lang="ts">
interface Props {
  /** Card title; rendered in the section header */
  title?: string;
  /** Render with no border / background — useful for nested cards */
  bare?: boolean;
  /** Compact padding variant */
  compact?: boolean;
}

withDefaults(defineProps<Props>(), {
  title: '',
  bare: false,
  compact: false,
});
</script>

<template>
  <section
    class="base-card"
    :class="{ 'base-card--bare': bare, 'base-card--compact': compact }"
  >
    <header
      v-if="title || $slots.actions || $slots.header"
      class="base-card__header"
    >
      <slot name="header">
        <h3
          v-if="title"
          class="base-card__title"
        >
          {{ title }}
        </h3>
      </slot>
      <div
        v-if="$slots.actions"
        class="base-card__actions"
      >
        <slot name="actions" />
      </div>
    </header>

    <div class="base-card__body">
      <slot />
    </div>

    <footer
      v-if="$slots.footer"
      class="base-card__footer"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.base-card {
  background: var(--surface, #0a1810);
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
