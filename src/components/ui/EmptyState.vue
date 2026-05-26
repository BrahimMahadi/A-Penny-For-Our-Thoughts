<!--
  Module:   components/ui/EmptyState.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Summary:  Empty-state panel used inside section bodies when no
            data exists yet. Replaces the legacy `emptyState()` HTML
            helper in render.js.
-->

<script setup lang="ts">
interface Props {
  /** Emoji or short symbol (e.g. '💳') */
  icon?: string;
  /** Primary message */
  title: string;
  /** Optional secondary line of muted text */
  hint?: string;
}

withDefaults(defineProps<Props>(), {
  icon: '📭',
  hint: '',
});
</script>

<template>
  <div class="base-empty-state">
    <div
      class="base-empty-state__icon"
      aria-hidden="true"
    >
      {{ icon }}
    </div>
    <div class="base-empty-state__title">
      {{ title }}
    </div>
    <div
      v-if="hint"
      class="base-empty-state__hint"
    >
      {{ hint }}
    </div>
    <div
      v-if="$slots.default"
      class="base-empty-state__actions"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.base-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem 1rem;
  color: var(--muted, #8b8b95);
}

.base-empty-state__icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  opacity: 0.7;
}

.base-empty-state__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text, #e3e6ee);
  margin-bottom: 0.25rem;
}

.base-empty-state__hint {
  font-size: 0.85rem;
  line-height: 1.5;
  max-width: 28ch;
}

.base-empty-state__actions {
  margin-top: 1rem;
}
</style>
