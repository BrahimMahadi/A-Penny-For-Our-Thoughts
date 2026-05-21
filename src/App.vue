<!--
  Module:   App.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 0)
  Summary:  Root component. Placeholder during scaffolding; gets
            replaced with the real header / tabs / sections in Sprint 2.
-->

<script setup lang="ts">
import { ref } from 'vue';

const appName = ref('A Penny For Our Thoughts');
const sprint = ref('Sprint 0 — Foundation');
</script>

<template>
  <div class="vue-scaffold">
    <header class="vue-scaffold__header">
      <h1>{{ appName }}</h1>
      <p class="vue-scaffold__tagline">
        Vue 3 + TypeScript Migration
      </p>
    </header>

    <main class="vue-scaffold__main">
      <section class="vue-scaffold__card">
        <h2>🚧 Migration in progress</h2>
        <p>
          You're looking at the empty Vue 3 scaffold for
          <code>feat/vue3-migration</code>. The legacy app remains
          deployable on <code>main</code> until cutover.
        </p>
        <p>
          <strong>Current phase:</strong> {{ sprint }}
        </p>
      </section>

      <section class="vue-scaffold__card">
        <h3>Sprint 0 checklist</h3>
        <ul>
          <li>✅ Branch off <code>main</code></li>
          <li>✅ Install Vue 3 + TypeScript + Pinia + vue-chartjs</li>
          <li>✅ Configure <code>tsconfig.json</code> + <code>vite.config.ts</code></li>
          <li>✅ ESLint with <code>no-undef</code> enforced</li>
          <li>✅ Scaffold <code>main.ts</code> + <code>App.vue</code></li>
          <li>⏳ Update GitHub Actions CI</li>
          <li>⏳ Verify build pipeline green</li>
        </ul>
      </section>

      <section class="vue-scaffold__card">
        <h3>Next: Sprint 1 — State foundation</h3>
        <p>
          Define typed <code>BudgetState</code> + <code>UiState</code>
          interfaces, build the Pinia stores, port pure calculation
          helpers from <code>analytics.js</code>.
        </p>
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
</style>
