/* ═══════════════════════════════════════════════════════════════
   Module:   main.ts
   Project:  A Penny For Our Thoughts
   Created:  May 2026 (Vue 3 migration — Sprint 0)
   Modified: May 2026 — Sprint 1 (Pinia stores + auto-persist)
   Summary:  Vue 3 entry point. Bootstraps Pinia, hydrates the
             budget + theme stores from localStorage, mounts App.vue,
             and wires up auto-persist on budget mutations.
═══════════════════════════════════════════════════════════════ */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

// ─── CSS imports (carried over from legacy app) ───────────────────
import './styles.css';
import './css/tokens.css';
import './css/layout.css';
import './css/forms.css';
import './css/features.css';
import './css/ui.css';
import './css/docs.css';
import './css/responsive.css';
import './css/extras.css';

// ─── Stores ──────────────────────────────────────────────────────
import { useBudgetStore, saveStateToStorage } from './stores/budget';
import { useThemeStore } from './stores/theme';

// ─── App bootstrap ───────────────────────────────────────────────
const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

// Stores must be created AFTER pinia is mounted, but BEFORE mount() so
// initial render sees hydrated state.
const budgetStore = useBudgetStore();
const themeStore = useThemeStore();

// Hydrate from localStorage with v1 migrations applied
budgetStore.loadFromStorage();
themeStore.init();

// Auto-persist budget mutations.
// Pinia's $subscribe fires on every mutation; we forward the current
// state to localStorage. The flushed-sync option ensures we don't
// race with rapid sequential updates.
budgetStore.$subscribe((_mutation, state) => {
  saveStateToStorage(state);
});

app.mount('#app');
