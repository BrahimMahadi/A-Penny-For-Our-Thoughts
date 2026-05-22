<!--
  Module:   components/pages/DocsPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Summary:  User Guide tab. Static reference docs migrated from
            the legacy docs partial. Sprint 4 will port the full
            content; this is the scaffold + nav skeleton.
-->

<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
</script>

<template>
  <div class="page-docs">
    <BaseCard title="User Guide">
      <EmptyState
        icon="📖"
        title="Docs content migrates in Sprint 4"
        hint="Full user guide content gets ported from index.legacy.html."
      />
    </BaseCard>
  </div>
</template>

<style scoped>
.page-docs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
