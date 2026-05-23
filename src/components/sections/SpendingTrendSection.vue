<!--
  Module:   components/sections/SpendingTrendSection.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Sprint 18)
  Summary:  Self-contained wrapper for SpendingTrendChart so it can be
            registered in the dynamic section component map and rendered
            without DashboardPage needing to pass data as a prop.
            Internally calls useAnalytics() just like every other section.
-->

<script setup lang="ts">
import SpendingTrendChart from '@/components/charts/SpendingTrendChart.vue';
import { useAnalytics } from '@/composables/useAnalytics';

const { spendingTrend } = useAnalytics();
</script>

<template>
  <SpendingTrendChart :rows="spendingTrend" />
</template>
