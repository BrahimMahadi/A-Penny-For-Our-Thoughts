<!--
  Module:   App.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 0)
  Modified: May 2026 — Sprint 1 (wired to budget + theme stores)
  Summary:  Root placeholder. Shows migration progress, theme toggle,
            and a live income demo proving Pinia reactivity works
            end-to-end. Gets replaced with the real header / tabs /
            sections in Sprint 2.
-->

<script setup lang="ts">
import { ref } from 'vue';
import { useBudgetStore } from '@/stores/budget';
import { useThemeStore } from '@/stores/theme';
import { fmt } from '@/utils/format';

const appName = ref('A Penny For Our Thoughts');
const sprint = ref('Sprint 1 — Typed state foundation');

const budget = useBudgetStore();
const theme = useThemeStore();

// Demo: add a test income stream to prove reactivity
function addDemoIncome(): void {
  budget.addIncomeStream({
    name: `Demo income ${budget.incomeStreams.length + 1}`,
    amount: 1000,
    biweekly: false,
  });
}

function clearDemoIncome(): void {
  budget.incomeStreams = [];
}
</script>

<template>
  <div class="vue-scaffold">
    <header class="vue-scaffold__header">
      <div>
        <h1>{{ appName }}</h1>
        <p class="vue-scaffold__tagline">
          Vue 3 + TypeScript Migration
        </p>
      </div>
      <button
        class="vue-scaffold__theme-btn"
        :title="`Currently ${theme.mode}`"
        @click="theme.toggle()"
      >
        {{ theme.isDark ? '🌙' : '☀️' }}
      </button>
    </header>

    <main class="vue-scaffold__main">
      <section class="vue-scaffold__card">
        <h2>🚧 Migration in progress</h2>
        <p>
          You're looking at the Vue 3 scaffold for
          <code>feat/vue3-migration</code>. The legacy app remains
          deployable on <code>main</code> until cutover.
        </p>
        <p>
          <strong>Current phase:</strong> {{ sprint }}
        </p>
      </section>

      <section class="vue-scaffold__card">
        <h3>Sprint 1 checklist</h3>
        <ul>
          <li>✅ Typed schema (<code>BudgetState</code>, <code>UiState</code>)</li>
          <li>✅ Utils ported (<code>fmt</code>, <code>csv</code>, <code>date</code>, <code>id</code>)</li>
          <li>✅ Pinia stores (<code>budget</code>, <code>ui</code>, <code>theme</code>)</li>
          <li>✅ Auto-persist on mutation</li>
          <li>✅ v1 → v2 migration logic + tests</li>
          <li>⏳ Port <code>analytics.js</code> calculations</li>
        </ul>
      </section>

      <section class="vue-scaffold__card">
        <h3>🧪 Reactivity demo</h3>
        <p>Income streams (auto-persisted to localStorage):</p>
        <ul v-if="budget.incomeStreams.length">
          <li
            v-for="stream in budget.incomeStreams"
            :key="stream.id"
          >
            {{ stream.name }} — {{ fmt(stream.amount) }} ({{ stream.biweekly ? 'biweekly' : 'monthly' }})
          </li>
        </ul>
        <p
          v-else
          class="muted"
        >
          No income streams yet.
        </p>
        <p>
          <strong>Total monthly:</strong> {{ fmt(budget.totalMonthlyIncome) }}
        </p>
        <div class="demo-buttons">
          <button
            class="btn"
            @click="addDemoIncome"
          >
            + Add demo income
          </button>
          <button
            class="btn btn-secondary"
            @click="clearDemoIncome"
          >
            Clear all
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.vue-scaffold {
  max-width: 760px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  font-family: var(--font-body, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
}

.vue-scaffold__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--border, #2a3041);
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
}

.vue-scaffold__header h1 {
  font-size: 1.75rem;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--text, #e3e6ee);
}

.vue-scaffold__tagline {
  margin: 0.25rem 0 0;
  color: var(--text-muted, #8b95ad);
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.vue-scaffold__theme-btn {
  background: var(--card, #161b2b);
  border: 1px solid var(--border, #2a3041);
  border-radius: 8px;
  width: 44px;
  height: 44px;
  font-size: 1.4rem;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.2s ease;
}
.vue-scaffold__theme-btn:hover {
  transform: scale(1.05);
}

.vue-scaffold__main {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.vue-scaffold__card {
  background: var(--card, #161b2b);
  border: 1px solid var(--border, #2a3041);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  color: var(--text, #e3e6ee);
}

.vue-scaffold__card h2,
.vue-scaffold__card h3 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  letter-spacing: -0.01em;
}

.vue-scaffold__card p {
  line-height: 1.55;
  margin: 0.5rem 0;
}

.vue-scaffold__card ul {
  line-height: 1.8;
  padding-left: 1.25rem;
  margin: 0.5rem 0;
}

.vue-scaffold__card code {
  background: var(--card-2, #1f2435);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
}

.muted {
  color: var(--text-muted, #8b95ad);
  font-style: italic;
}

.demo-buttons {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn {
  background: var(--accent, #4ade80);
  color: var(--card, #161b2b);
  border: 0;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s ease;
}
.btn:hover {
  filter: brightness(1.1);
}
.btn-secondary {
  background: var(--card-2, #1f2435);
  color: var(--text, #e3e6ee);
  border: 1px solid var(--border, #2a3041);
}
</style>
