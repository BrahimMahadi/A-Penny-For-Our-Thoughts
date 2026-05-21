<!--
  Module:   components/pages/SchedulePage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 2)
  Summary:  Schedule tab host. Recurring expense calendar + 6-month
            forecast bar chart plug in during Sprint 4.
-->

<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { useUiStore } from '@/stores/ui';
import { computed } from 'vue';

const ui = useUiStore();

const monthLabel = computed(() => {
  const d = new Date(ui.scheduleViewYear, ui.scheduleViewMonth - 1, 1);
  return d.toLocaleString('en-CA', { month: 'long', year: 'numeric' });
});
</script>

<template>
  <div class="page-schedule">
    <BaseCard>
      <template #header>
        <div class="schedule-toolbar">
          <BaseButton
            variant="secondary"
            size="sm"
            aria-label="Previous month"
            @click="ui.stepScheduleMonth(-1)"
          >
            ←
          </BaseButton>
          <h3 class="schedule-toolbar__title">
            {{ monthLabel }}
          </h3>
          <BaseButton
            variant="secondary"
            size="sm"
            aria-label="Next month"
            @click="ui.stepScheduleMonth(1)"
          >
            →
          </BaseButton>
          <BaseButton
            variant="ghost"
            size="sm"
            @click="ui.resetScheduleToToday"
          >
            Today
          </BaseButton>
        </div>
      </template>
      <template #actions>
        <BaseButton
          variant="secondary"
          size="sm"
          :aria-label="`Switch to ${ui.scheduleView === 'list' ? 'calendar' : 'list'} view`"
          @click="ui.setScheduleView(ui.scheduleView === 'list' ? 'calendar' : 'list')"
        >
          {{ ui.scheduleView === 'list' ? '⊞ Calendar' : '☰ List' }}
        </BaseButton>
      </template>

      <EmptyState
        icon="📅"
        title="Recurring calendar migrates in Sprint 4"
        hint="Month grid + list view + 6-month forecast bar chart."
      />
    </BaseCard>
  </div>
</template>

<style scoped>
.page-schedule {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.schedule-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.schedule-toolbar__title {
  margin: 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  min-width: 12ch;
  text-align: center;
}
</style>
