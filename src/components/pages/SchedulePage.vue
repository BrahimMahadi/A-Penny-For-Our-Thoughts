<!--
  Module:   components/pages/SchedulePage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Updated:  May 2026 (Sprint 4 — RecurringCalendar wired)
  Summary:  Schedule tab host. Wraps RecurringCalendar section.
-->

<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue';
import RecurringCalendar from '@/components/sections/RecurringCalendar.vue';
</script>

<template>
  <div class="page-schedule">
    <BaseCard title="Recurring Schedule">
      <RecurringCalendar />
    </BaseCard>
  </div>
</template>

<style scoped>
.page-schedule {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
