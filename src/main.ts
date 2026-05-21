/* ═══════════════════════════════════════════════════════════════
   Module:   main.ts
   Project:  A Penny For Our Thoughts
   Created:  May 2026 (Vue 3 migration — Sprint 0)
   Summary:  Vue 3 entry point. Bootstraps Pinia store, mounts the
             root App.vue component, and loads all CSS modules.
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

// ─── App bootstrap ────────────────────────────────────────────────
const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount('#app');
