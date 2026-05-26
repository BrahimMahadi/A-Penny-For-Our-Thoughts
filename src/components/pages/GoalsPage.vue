<!--
  Module:   components/pages/GoalsPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Redesign Sprint 2)
  Summary:  Goals tab — placeholder for Sprint 5 full implementation.
            Will house savings goals, wishlist items, and milestone
            tracking. Currently renders an empty-state holding card.
-->

<script setup lang="ts">
import EmptyState from '@/components/ui/EmptyState.vue';
</script>

<template>
  <div class="goals-page">
    <div class="goals-page__header">
      <p class="goals-page__eyebrow">Goals</p>
      <h1 class="goals-page__title">Your savings goals</h1>
    </div>

    <EmptyState
      icon="◎"
      title="Goals coming soon"
      hint="Track savings targets, wishlist items, and milestones — all in one place. Full implementation lands in Sprint 5."
    />
  </div>
</template>

<style scoped>
.goals-page {
  padding: 32px 0 80px;
}

.goals-page__eyebrow {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--muted);
  margin: 0 0 6px;
}

.goals-page__title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--text);
  margin: 0 0 32px;
}
</style>
