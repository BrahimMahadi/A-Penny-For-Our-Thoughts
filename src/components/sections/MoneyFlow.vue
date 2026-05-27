<!--
  Module:   components/sections/MoneyFlow.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (RS-12)
  Summary:  Dashboard chart — last 12 months of income, needs, wants
            and savings stacked bars with an income reference line.
            Read-only. Wraps SpendingTrendChart with a 12-month window.
-->

<script setup lang="ts">
import { computed } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import SpendingTrendChart from '@/components/charts/SpendingTrendChart.vue';
import { getSpendingTrend } from '@/utils/calculations';

const budget = useBudgetStore();

/** 12 months of Needs / Wants / Savings actuals, oldest first. */
const rows = computed(() => getSpendingTrend(budget.$state, 12));
</script>

<template>
  <div class="money-flow">
    <SpendingTrendChart :rows="rows" />
  </div>
</template>

<style scoped>
.money-flow {
  /* SpendingTrendChart handles its own 260px height */
  width: 100%;
}
</style>
