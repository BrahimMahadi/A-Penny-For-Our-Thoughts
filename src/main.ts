/* ═══════════════════════════════════════════════════════════════
   Module:   main.ts
   Project:  A Penny For Our Thoughts
   Created:  May 2026 (Vue 3 migration — Sprint 0)
   Modified: May 2026 — Sprint 1 (Pinia stores + auto-persist)
             May 2026 — Sprint 8 (localStorage error handling)
   Summary:  Vue 3 entry point. Bootstraps Pinia, hydrates the
             budget + theme stores from localStorage, mounts App.vue,
             and wires up auto-persist on budget mutations.
             Storage failures surface as user-visible toast warnings.
═══════════════════════════════════════════════════════════════ */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

// ─── Chart.js global registration ────────────────────────────────
// Register all Chart.js components once at app startup so vue-chartjs
// wrappers in any SFC can be used without per-file ChartJS.register() calls.
import { Chart as ChartJS, registerables } from 'chart.js';
ChartJS.register(...registerables);

// ─── CSS imports (carried over from legacy app) ───────────────────
import './styles.css';
import './css/tokens.css';
import './css/layout.css';
import './css/forms.css';
import './css/features.css';
import './css/ui.css';
import './css/responsive.css';
import './css/extras.css';
import './css/card-hover.css';

// ─── Stores & composables ─────────────────────────────────────────
import { useBudgetStore, saveStateToStorage } from './stores/budget';
import { useAuthStore } from './stores/auth';
import { useThemeStore } from './stores/theme';
// useToast is module-scoped (not component-scoped), so it's safe to call
// here in main.ts before the Vue app mounts. Toasts queued before mount
// are rendered as soon as <ToastContainer /> initialises.
import { useToast } from './composables/useToast';
// MOBILE-5: registers the minimal service worker that makes the app
// installable on Android. No-op in dev and on browsers without SW support.
import { registerServiceWorker } from './lib/registerSW';
// MOBILE-5: `v-press` tactile feedback, registered globally so any template
// can mark a touch target pressable without a local import.
import { vPress } from './directives/vPress';

// ─── App bootstrap ───────────────────────────────────────────────
const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.directive('press', vPress);

// Stores must be created AFTER pinia is mounted, but BEFORE mount() so
// initial render sees hydrated state.
const authStore  = useAuthStore();
const budgetStore = useBudgetStore();
const themeStore = useThemeStore();

// Auth init: establishes the onAuthStateChange listener which in turn
// calls budgetStore.initStore(userId) once the session resolves.
// In localStorage-only mode (no Supabase env vars) this falls through
// to loadFromStorage() immediately and sets loading = false.
authStore.init();
themeStore.init();

// Auto-persist budget mutations.
// Pinia's $subscribe fires on every mutation; we forward the current
// state to localStorage. If the write fails (e.g. quota exceeded in
// private-mode Safari), we surface a danger toast so the user knows
// to export a CSV backup before closing the tab.
budgetStore.$subscribe((_mutation, state) => {
  const ok = saveStateToStorage(state);
  if (!ok) {
    useToast().show(
      'Storage is full — your changes were not saved. Export a CSV backup to avoid data loss.',
      'danger',
    );
  }
});

app.mount('#app');

registerServiceWorker();
