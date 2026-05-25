<!--
  Module:   components/pages/DocsPage.vue
  Project:  A Penny For Our Thoughts
  Created:  May 2026 (Vue 3 migration — Sprint 7)
  Summary:  Documentation tab. Five sections: User Guide, Release Notes,
            FAQ, Privacy & Data, CSV Reference. Desktop sidebar nav +
            mobile dropdown. Content ported from index.legacy.html.
-->

<script setup lang="ts">
import { ref } from 'vue';

type DocSection = 'user-guide' | 'release-notes' | 'faq' | 'privacy' | 'csv-reference';

const activeSection = ref<DocSection>('user-guide');

const sections: { id: DocSection; label: string; icon: string }[] = [
  { id: 'user-guide',    label: 'User Guide',      icon: '📖' },
  { id: 'release-notes', label: 'Release Notes',   icon: '🚀' },
  { id: 'faq',           label: 'FAQ',             icon: '❓' },
  { id: 'privacy',       label: 'Privacy & Data',  icon: '🔒' },
  { id: 'csv-reference', label: 'CSV Reference',   icon: '📋' },
];

function goTo(id: DocSection): void {
  activeSection.value = id;
  // On mobile the dropdown closes after selection
  mobileOpen.value = false;
}

// Mobile dropdown
const mobileOpen = ref(false);
const activeLabel = () => sections.find(s => s.id === activeSection.value)?.label ?? '';
</script>

<template>
  <div class="page-docs">
    <!-- ── Mobile section picker ──────────────────────────────────── -->
    <div class="docs-mobile-nav">
      <button
        class="docs-mobile-toggle"
        :aria-expanded="mobileOpen"
        @click="mobileOpen = !mobileOpen"
      >
        <span>{{ sections.find(s => s.id === activeSection)?.icon }} {{ activeLabel() }}</span>
        <span class="docs-mobile-toggle__chevron">{{ mobileOpen ? '▲' : '▼' }}</span>
      </button>
      <div
        v-show="mobileOpen"
        class="docs-mobile-menu"
        role="menu"
      >
        <button
          v-for="s in sections"
          :key="s.id"
          class="docs-mobile-item"
          :class="{ 'docs-mobile-item--active': activeSection === s.id }"
          role="menuitem"
          @click="goTo(s.id)"
        >
          {{ s.icon }} {{ s.label }}
        </button>
      </div>
    </div>

    <!-- ── Layout ─────────────────────────────────────────────────── -->
    <div class="docs-layout">
      <!-- Desktop sidebar -->
      <nav
        class="docs-sidebar"
        aria-label="Documentation sections"
      >
        <button
          v-for="s in sections"
          :key="s.id"
          class="docs-nav-btn"
          :class="{ 'docs-nav-btn--active': activeSection === s.id }"
          @click="goTo(s.id)"
        >
          {{ s.icon }} {{ s.label }}
        </button>
      </nav>

      <!-- Content -->
      <div class="docs-content">
        <!-- ─── User Guide ─────────────────────────────────────── -->
        <section
          v-if="activeSection === 'user-guide'"
          class="docs-section"
        >
          <h2 class="docs-section-title">
            User Guide
          </h2>
          <p class="docs-intro">
            A Penny For Our Thoughts is a personal finance dashboard built on the 50/30/20 budget rule.
            Everything runs in your browser — no account, no server, no internet required after the first load.
          </p>

          <h3
            id="ug-income"
            class="docs-h3"
          >
            💰 Income Streams
          </h3>
          <p>Add every source of income under <strong>Income Streams</strong>. Each stream has a name, a monthly dollar amount, and an optional <em>bi-weekly</em> toggle for pay cheques received every two weeks.</p>
          <ul class="docs-list">
            <li>Click <strong>+ Add Stream</strong> to create a new income source.</li>
            <li>Enable <strong>Bi-wk</strong> for pay cheques — the app tracks spending against 2-week pay periods.</li>
            <li>The <strong>Monthly Income</strong> stat card updates instantly and drives all budget calculations.</li>
          </ul>

          <h3
            id="ug-allocation"
            class="docs-h3"
          >
            📊 Budget Allocation
          </h3>
          <p>The coloured bar below the income cards shows your 50/30/20 split. Click <strong>Edit %</strong> to adjust — percentages must always sum to 100%.</p>
          <ul class="docs-list">
            <li><strong>Needs</strong> — rent, groceries, utilities, insurance.</li>
            <li><strong>Wants</strong> — dining, entertainment, hobbies.</li>
            <li><strong>Savings</strong> — emergency fund, investments, retirement.</li>
          </ul>
          <p>The <strong>Budget vs. Actual</strong> panel shows how actual spending compares to each allocation this month, with green / amber / red status indicators.</p>

          <h3
            id="ug-wants"
            class="docs-h3"
          >
            🛍 Wants Tracker
          </h3>
          <p>Track discretionary spending against your Wants envelope. Each entry is a purchase with a name, amount, and category.</p>
          <ul class="docs-list">
            <li>The donut chart shows spending by category for the current bi-weekly period.</li>
            <li>Use <strong>Close Period</strong> to archive the current period and start fresh.</li>
            <li>The envelope resets based on your <strong>Pay Period Anchor</strong> date (set in Settings).</li>
            <li>If you have Transaction Rules, the category auto-fills as you type the purchase name.</li>
          </ul>

          <h3
            id="ug-expenses"
            class="docs-h3"
          >
            💳 Expense Cards
          </h3>
          <p>Model your fixed monthly bills by payment method. Each card (e.g. Visa, bank account) holds a list of expense items.</p>
          <ul class="docs-list">
            <li>Click <strong>+ Add Card</strong> to create a new payment method.</li>
            <li>Enable <strong>Bi-wk</strong> for expenses charged every two weeks.</li>
            <li>Set an optional <strong>Due Day</strong> (1–31) so items appear in the Recurring Schedule.</li>
          </ul>

          <h3
            id="ug-subscriptions"
            class="docs-h3"
          >
            🔄 Subscriptions
          </h3>
          <p>Track recurring services. Supported frequencies: weekly, bi-weekly, monthly, quarterly, yearly.</p>
          <ul class="docs-list">
            <li>Set <strong>Budget Type</strong> to Needs or Wants so the renewal counts against the right category.</li>
            <li>A renewal countdown chip shows days until the next renewal date.</li>
            <li>The <strong>⚠ No card</strong> chip flags subscriptions that aren't linked to a payment card.</li>
          </ul>

          <h3
            id="ug-savings"
            class="docs-h3"
          >
            🏦 Savings &amp; Goals
          </h3>
          <p>Track savings account balances and set targets for each account.</p>
          <ul class="docs-list">
            <li>Each account has a <strong>Balance</strong> and a <strong>Default Monthly Allocation</strong>.</li>
            <li>Click <strong>+ Add Goal</strong> to set a target amount and target month for an account.</li>
            <li>Goals show progress %, monthly savings needed, and on-track / caution / off-track status.</li>
          </ul>

          <h3
            id="ug-loans"
            class="docs-h3"
          >
            🏛 Loans &amp; Credit Cards
          </h3>
          <p>Track outstanding debt for visibility in your net worth calculation.</p>
          <ul class="docs-list">
            <li><strong>Loans:</strong> remaining balance, original amount, payment amount, and frequency.</li>
            <li><strong>Credit Cards:</strong> current balance and credit limit to track utilisation.</li>
            <li>Both feed into the Liabilities side of the Net Worth tracker automatically.</li>
          </ul>

          <h3
            id="ug-wishlist"
            class="docs-h3"
          >
            🎯 Wishlist
          </h3>
          <p>A simple list of items to save up for. Add an icon, name, and optional URL. Purely a reference list — no budget calculations.</p>

          <h3
            id="ug-networth"
            class="docs-h3"
          >
            📈 Net Worth
          </h3>
          <p>Your net worth is calculated automatically from your assets and liabilities.</p>
          <ul class="docs-list">
            <li><strong>Assets:</strong> savings balances (auto-listed), plus manual investments, property, vehicles, and other assets.</li>
            <li><strong>Liabilities:</strong> loan balances and credit card balances — pulled in automatically.</li>
            <li>A snapshot is recorded once per calendar month. Click <strong>Record Snapshot</strong> to save one manually.</li>
            <li>The Net Worth stat card shows a <strong>MoM delta chip</strong> — positive = green (wealth grew), negative = red.</li>
          </ul>

          <h3
            id="ug-goals-timeline"
            class="docs-h3"
          >
            🎯 Goals Timeline
          </h3>
          <p>The Goals Timeline card ranks all your savings goals and projects their completion dates based on current allocations.</p>
          <ul class="docs-list">
            <li>Each row shows: progress bar, target date, projected date, and months late (if behind).</li>
            <li>Active goals appear first (on-track → caution → off-track), then complete, then missed.</li>
            <li>A goal is "on-track" when your current monthly allocation ≥ the monthly savings needed to hit the target.</li>
          </ul>

          <h3
            id="ug-trend-chart"
            class="docs-h3"
          >
            📊 Spending Trend Chart
          </h3>
          <p>The 6-Month Spending Trend chart sits at the top of the dashboard and shows your macro spending picture at a glance.</p>
          <ul class="docs-list">
            <li>Stacked bars: Needs (red) / Wants (amber) / Savings (green) per calendar month.</li>
            <li>Dashed income reference line shows your total monthly income.</li>
            <li>Current month bars are full opacity; past months are dimmed.</li>
            <li>Hover any bar for a tooltip breakdown.</li>
          </ul>

          <h3
            id="ug-forecast"
            class="docs-h3"
          >
            📉 Envelope Forecast
          </h3>
          <p>Below the Wants Tracker progress bar, a colour-coded forecast chip projects your end-of-period spend at the current daily rate.</p>
          <ul class="docs-list">
            <li><strong>Green</strong> — on track (projected &lt; 90% of budget).</li>
            <li><strong>Amber</strong> — caution (projected 90–99% of budget).</li>
            <li><strong>Red</strong> — over budget projection (projected ≥ 100%).</li>
            <li>The chip only appears after at least one purchase has been logged in the current period.</li>
          </ul>

          <h3
            id="ug-schedule"
            class="docs-h3"
          >
            📅 Recurring Schedule
          </h3>
          <p>The Schedule tab shows a 6-month forecast and a calendar view of all bills with due dates. Toggle between List and Calendar views with the ☰ / ⊞ buttons. Click any of the 6 month cards to jump directly to that month.</p>

          <h3
            id="ug-rules"
            class="docs-h3"
          >
            ⚙️ Transaction Rules
          </h3>
          <p>Rules auto-categorise wants purchases as you type the name. Set them up in <strong>Settings → Transaction Rules</strong>. Three match modes:</p>
          <ul class="docs-list">
            <li><strong>Contains</strong> — name includes the pattern anywhere.</li>
            <li><strong>Starts with</strong> — name begins with the pattern.</li>
            <li><strong>Exact</strong> — name matches exactly.</li>
          </ul>
          <p>Rules are tested in order — first match wins. Use the live test field in Settings to verify your rules before saving.</p>

          <h3
            id="ug-onboarding"
            class="docs-h3"
          >
            👋 Onboarding &amp; What's New
          </h3>
          <p>First-time users see a 4-step guided wizard covering income, pay period, and budget split. Once completed or skipped, it never appears again.</p>
          <ul class="docs-list">
            <li>When a new app version ships, a dismissible <strong>What's New</strong> banner appears at the top of the dashboard.</li>
            <li>Click <strong>×</strong> to dismiss — it won't reappear until the next version.</li>
          </ul>

          <h3
            id="ug-csv"
            class="docs-h3"
          >
            📤 Import &amp; Export
          </h3>
          <p>All data can be exported to a single CSV file and re-imported later.</p>
          <ul class="docs-list">
            <li>Click <strong>⬆ Export</strong> in the header toolbar to download <code>penny-export.csv</code>.</li>
            <li>Click <strong>⬇ Import</strong> and select a <code>.csv</code> file to restore. <em>This replaces all current data.</em></li>
            <li>Keyboard shortcut: press <kbd>E</kbd> to export quickly.</li>
          </ul>
        </section>

        <!-- ─── Release Notes ──────────────────────────────────── -->
        <section
          v-else-if="activeSection === 'release-notes'"
          class="docs-section"
        >
          <h2 class="docs-section-title">
            Release Notes
          </h2>
          <p class="docs-intro">
            A record of every feature, fix, and improvement shipped to A Penny For Our Thoughts.
          </p>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.18.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 25 — Supabase Auth (Magic Link + Google OAuth)
            </p>
            <ul class="docs-list">
              <li><strong>Magic link authentication</strong> — enter your email and receive a one-click sign-in link; no password required. The Supabase client handles the PKCE token exchange automatically when you return to the app.</li>
              <li><strong>Google OAuth</strong> — one-click "Sign in with Google" using the official OAuth 2.0 PKCE flow via Supabase; redirects back to the app and sets a persistent session.</li>
              <li><strong>Hard auth gate</strong> — when Supabase is configured, the full app shell is only shown after a verified session is established; unauthenticated visitors see only the <code>LoginPage</code>.</li>
              <li><strong>Row Level Security</strong> — all 18 Supabase tables now enforce RLS policies (<code>auth.uid() = user_id</code>); the anon key replaces the service key so each user can only read and write their own rows.</li>
              <li><strong>User menu &amp; Settings sign-out</strong> — an avatar chip in the toolbar and a "Sign out" button in Settings both call <code>auth.signOut()</code>, which triggers the <code>onAuthStateChange</code> handler that resets the budget store and clears localStorage.</li>
              <li><strong>887 tests</strong> across 27 spec files — +16 in <code>tests/stores/auth.spec.ts</code> (init, magic link, Google OAuth, sign-out, clearError, getters).</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.17.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 24 — Supabase DB Integration
            </p>
            <ul class="docs-list">
              <li><strong>Supabase Postgres backend</strong> — all 18 data tables (income, purchases, subscriptions, expense cards, loans, credit cards, savings, goals, assets, net worth, rules, alerts, categories) now persist to a real database, replacing localStorage as the primary store.</li>
              <li><strong>One-time localStorage → Supabase migration</strong> — <code>migrateIfNeeded()</code> runs once on first load, reading the existing <code>penny_state_v2</code> blob and inserting every entity into Supabase in FK-dependency order; sets a <code>penny_migrated_to_supabase</code> flag so it never re-runs.</li>
              <li><strong>Optimistic update pattern</strong> — every CRUD action updates local Pinia state instantly, then fires a background <code>syncDb()</code> call; UI never waits for the network.</li>
              <li><strong>Graceful offline fallback</strong> — <code>initStore()</code> falls back to <code>loadFromStorage()</code> if Supabase is unconfigured or returns an error; localStorage remains fully functional as a standalone offline mode.</li>
              <li><strong>camelCase ↔ snake_case adapter layer</strong> — <code>src/lib/db.ts</code> maps all domain types to/from Postgres column names; no snake_case ever leaks into components or the Pinia store.</li>
              <li><strong>26 new unit tests</strong> — <code>tests/lib/db.spec.ts</code> (13 tests: fetch mapping, insert payloads, update/delete, upsertProfile) and <code>tests/lib/migrateLocalStorage.spec.ts</code> (13 tests: skip conditions, success, flag behaviour, per-entity migration). 871 tests total across 26 spec files.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.16.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 23 — Retroactive Category Editing on Archived Purchases
            </p>
            <ul class="docs-list">
              <li><strong>Inline category editor on spending history</strong> — hover any line item in a closed spending period and click the ✏ pencil icon to reassign its category without altering the period total or any other data.</li>
              <li><strong>Live category colour sync</strong> — the spending history donut chart immediately reflects the updated category assignment, pulling from your custom <code>spendingCategories</code> palette.</li>
              <li><strong>Keyboard accessible</strong> — the inline edit control is fully reachable via Tab and operable with Enter/Space.</li>
              <li>871 tests across 26 spec files.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.15.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 21–22 — Search, Sort &amp; Filter for Purchases and Subscriptions
            </p>
            <ul class="docs-list">
              <li><strong>Purchase filter toolbar</strong> — live search, expandable filter drawer (category / budget type / expense card), sort by date, amount or name; active filter count badge; animated drawer; "no results" empty state; hidden when no purchases exist.</li>
              <li><strong>Subscription filter toolbar</strong> — identical Option B toolbar; sort by renewal date, monthly cost, amount or name; same animated filter drawer pattern.</li>
              <li><strong><code>useListFilter</code> composable</strong> — shared search/filter/sort state (search, catFilter, typeFilter, cardFilter, sortKey, drawerOpen) extracted into a generic, reusable composable.</li>
              <li><strong>Bug fix</strong> — WantsDonut chart now reads colours live from <code>budget.spendingCategories</code> instead of a stale hard-coded map; custom category colours are reflected immediately.</li>
              <li><strong>Bug fix</strong> — ProgressBar labels rendered as siblings of the track, no longer inside the <code>overflow:hidden</code> container that was clipping long label text.</li>
              <li>835 tests across 24 spec files — +29 new tests (13 WantsTracker toolbar, 12 Subscriptions toolbar, 4 WantsDonut/categoryColors integration).</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.14.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 20 — Calendar Day Detail (Slide Panel &amp; Hover Popover)
            </p>
            <ul class="docs-list">
              <li><strong>Slide panel</strong> — click any calendar or pay-period cell with bills to reveal an animated panel showing bill name, type, amount, frequency, and card; colour-coded by type (blue/purple/amber).</li>
              <li><strong>Hover popover</strong> — on desktop, hovering a cell shows a fixed popover with a bill preview; 150 ms grace period keeps it open while moving the mouse to it.</li>
              <li>Touch devices use only the slide panel; popover is suppressed on <code>hover: none</code> media.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.13.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 19 — Category Manager, Bi-Yearly Frequency &amp; Chequing Balance
            </p>
            <ul class="docs-list">
              <li><strong>Category Manager</strong> — create, rename, recolour and delete custom spending categories used across purchases, subscriptions and the donut chart.</li>
              <li><strong>Bi-Yearly frequency</strong> — subscriptions and loans can now recur every 6 months in addition to monthly, weekly, etc.</li>
              <li><strong>Chequing balance dashboard card</strong> — shows current chequing balance as a standalone stat alongside income and savings.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.12.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 18 — Collapsible Sections &amp; Drag-and-Drop Reorder
            </p>
            <ul class="docs-list">
              <li><strong>Collapsible sections</strong> — every dashboard section can be collapsed to a header bar to reduce clutter; state persists between sessions.</li>
              <li><strong>Drag-and-drop reorder</strong> — drag section cards to reorder them to your preference; order persists via <code>ui.sectionOrder</code>.</li>
              <li><strong>Section Picker</strong> — settings panel with move-up/move-down buttons and a reset-to-default option for accessibility-first reordering.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.11.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 17 — Custom-Days Subscriptions
            </p>
            <ul class="docs-list">
              <li><strong>Custom-days frequency</strong> — subscriptions can now be set to repeat on specific days of the week (e.g., every Mon &amp; Wed).</li>
              <li>Recurring Calendar correctly maps custom-day subscriptions to all matching days in the month and pay-period views.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.10.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 16 — Loans on the Schedule Tab
            </p>
            <ul class="docs-list">
              <li><strong>Loans in the Recurring Calendar</strong> — loan payments now appear as bill entries in the calendar alongside subscriptions and fixed expenses.</li>
              <li>Loan bills show an amber <code>bill-badge--loan</code> colour band and the correct frequency label in the slide panel.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.9.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 15 — Pay-Period Schedule View
            </p>
            <ul class="docs-list">
              <li><strong>14-day pay-period view</strong> — a compact calendar covering the current pay period showing all bills due within it; controlled by your pay-anchor date.</li>
              <li>Bills in the period deducted from the Wants envelope to give an accurate remaining-budget forecast.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.8.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 14 — Dashboard Polish &amp; Analytics
            </p>
            <ul class="docs-list">
              <li>Visual polish pass across all sections — tighter spacing, improved typography hierarchy, and consistent card shadows.</li>
              <li>Analytics enhancements: category breakdown table, spending velocity indicator, and improved tooltip formatting on all Chart.js instances.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.7.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 13 — Dashboard Polish, Form Validation &amp; JSON Backup
            </p>
            <ul class="docs-list">
              <li><strong>JSON backup / restore</strong> — export a full <code>.json</code> snapshot of your state and re-import it on any device.</li>
              <li><strong>Form validation</strong> — inline real-time validation with error messages on all add/edit forms; invalid submissions are blocked.</li>
              <li>Improved number formatting and edge-case handling throughout (zero-income guard, overspend badges).</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.6.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 12 — Spending Trend Chart &amp; Goals Timeline
            </p>
            <ul class="docs-list">
              <li><strong>6-Month Spending Trend Chart</strong> — stacked bar (Needs/Wants/Savings) with income reference line; lazy-rendered; current month at full opacity.</li>
              <li><strong>Goals Timeline</strong> — ranked projection card showing projected completion dates and months late for all savings goals.</li>
              <li>508 tests across 21 spec files — 38 new tests for <code>getSpendingTrend</code> and <code>getGoalsTimeline</code>.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.5.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 11 — Envelope Forecast &amp; MoM Stat Deltas
            </p>
            <ul class="docs-list">
              <li><strong>Envelope Forecast</strong> — "At this pace, $X by end of period" projection chip in Wants Tracker; green / amber / red status.</li>
              <li><strong>MoM Stat Deltas</strong> — ▲/▼ chips on Needs, Wants, and Net Worth dashboard stat cards vs. prior month.</li>
              <li>GitHub Pages deploy confirmed live at <code>brahimmahadi.github.io/A-Penny-For-Our-Thoughts/</code>.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.4.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 10 — Onboarding Flow
            </p>
            <ul class="docs-list">
              <li><strong>First-Run Wizard</strong> — 4-step guided onboarding for new users (income, pay period, budget split). Shows once, never again.</li>
              <li><strong>What's New banner</strong> — dismissible version-gated highlights for returning users on each release.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.3.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 9 — Mobile UX Pass
            </p>
            <ul class="docs-list">
              <li><strong>Swipe navigation</strong> — swipe left/right on the main content area to switch tabs on touch devices.</li>
              <li>Mobile responsiveness fixes: stats row collapses gracefully, modals scroll correctly, touch targets audited.</li>
              <li><code>useSwipe</code> composable — reusable, tested, threshold-guarded.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.2.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 8 — Error Handling, Lazy Charts &amp; Architecture Docs
            </p>
            <ul class="docs-list">
              <li><strong>Storage error handling</strong> — graceful try/catch on all localStorage operations; "Storage is full" danger toast with export reminder.</li>
              <li><strong>Lazy chart rendering</strong> — charts use <code>IntersectionObserver</code> to render only when visible; shimmer skeleton placeholder while off-screen.</li>
              <li>Full <code>docs/ARCHITECTURE.md</code> rewrite for Vue 3 + TypeScript stack.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.1.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Sprint 7 — Settings, Rules Engine &amp; Budget Alerts
            </p>
            <ul class="docs-list">
              <li><strong>Settings tab</strong> — pay period anchor, chequing balance, danger zone (clear all data).</li>
              <li><strong>Transaction Rules Engine</strong> — keyword → category auto-classification; three match modes (contains / starts with / exact).</li>
              <li><strong>Budget Alerts</strong> — per-category spending thresholds; alert chip appears in Wants Tracker when exceeded.</li>
              <li>448 tests covering all new sections.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">v1.0.0</span>
              <span class="release-date">May 2026</span>
            </div>
            <p class="release-tagline">
              Vue 3 + TypeScript migration complete
            </p>
            <ul class="docs-list">
              <li>Full rewrite from vanilla JS to <strong>Vue 3 + Pinia + TypeScript</strong>. All features preserved and extended.</li>
              <li>346-test Vitest suite covering stores, composables, calculations, CSV, and all section components.</li>
              <li>CSV import / export in the header toolbar (⬆ / ⬇) on every tab; keyboard shortcuts: <kbd>?</kbd> help, <kbd>1</kbd>–<kbd>4</kbd> tabs, <kbd>E</kbd> export, <kbd>T</kbd> theme.</li>
              <li>All 8 Chart.js chart SFCs with automatic theme-aware re-colouring.</li>
              <li>localStorage error handling, <code>prefers-reduced-motion</code> support throughout.</li>
            </ul>
          </div>

          <div class="release-block">
            <div class="release-header">
              <span class="release-version">Legacy</span>
              <span class="release-date">2025 – early 2026</span>
            </div>
            <p class="release-tagline">
              Vanilla JS era (v1.0 – v2.4)
            </p>
            <ul class="docs-list">
              <li>50/30/20 budget allocation, income streams, bi-weekly wants envelope, expense cards, loans, credit cards, subscriptions, wishlist, CSV import/export.</li>
              <li>Budget vs. Actual, Savings Goal Tracker, Net Worth tracker, Recurring Expense Calendar, MoM analytics, Transaction Rules, Budget Alerts.</li>
              <li>Vite + Tailwind CSS v4 migration; CSS modularisation (8 focused files).</li>
            </ul>
          </div>
        </section>

        <!-- ─── FAQ ───────────────────────────────────────────── -->
        <section
          v-else-if="activeSection === 'faq'"
          class="docs-section"
        >
          <h2 class="docs-section-title">
            FAQ &amp; Troubleshooting
          </h2>

          <div class="faq-item">
            <h3 class="faq-q">
              Is my data safe?
            </h3>
            <p>
              Yes. All data is stored locally in your browser's <code>localStorage</code>. Nothing is ever sent to a server.
              See the
              <button
                class="docs-inline-link"
                @click="goTo('privacy')"
              >
                Privacy &amp; Data
              </button>
              section for full details.
            </p>
          </div>

          <div class="faq-item">
            <h3 class="faq-q">
              Will clearing my browser history delete my data?
            </h3>
            <p>Yes. Clearing cookies and site data removes localStorage. Export a CSV backup regularly to avoid data loss.</p>
          </div>

          <div class="faq-item">
            <h3 class="faq-q">
              The Wants Tracker shows "Set a pay start date in Settings"
            </h3>
            <p>Go to <strong>Settings → Pay Period Anchor</strong> and set a recent pay date. The bi-weekly cycle repeats every 14 days from that anchor.</p>
          </div>

          <div class="faq-item">
            <h3 class="faq-q">
              How does the bi-weekly wants budget work?
            </h3>
            <p>The monthly Wants budget is divided by 2 to get the bi-weekly envelope. Each 14-day period starts from your pay anchor date. Subscriptions and loans due in the period are deducted from the envelope automatically.</p>
          </div>

          <div class="faq-item">
            <h3 class="faq-q">
              Import fails with "Invalid CSV format"
            </h3>
            <p>
              Common causes: (1) The file was not exported from this app — only Penny CSV format is supported.
              (2) The file was manually edited and a column was added, removed, or renamed.
              (3) A value contains a comma that wasn't quoted properly.
              Try re-exporting a fresh backup and importing that. See the
              <button
                class="docs-inline-link"
                @click="goTo('csv-reference')"
              >
                CSV Reference
              </button>
              for the expected structure.
            </p>
          </div>

          <div class="faq-item">
            <h3 class="faq-q">
              Can I use the app on multiple devices?
            </h3>
            <p>Not automatically — data is device-local. To sync between devices, export a CSV on device A and import it on device B.</p>
          </div>

          <div class="faq-item">
            <h3 class="faq-q">
              The charts look wrong after toggling the theme
            </h3>
            <p>Charts re-colour on theme toggle. If a chart looks off, switch to another tab and back — this triggers a re-render.</p>
          </div>

          <div class="faq-item">
            <h3 class="faq-q">
              How do I reset everything?
            </h3>
            <p>Go to <strong>Settings → Danger Zone</strong> and click <strong>Clear All Data</strong>. Export a backup first — this cannot be undone.</p>
          </div>
        </section>

        <!-- ─── Privacy & Data ─────────────────────────────────── -->
        <section
          v-else-if="activeSection === 'privacy'"
          class="docs-section"
        >
          <h2 class="docs-section-title">
            Privacy &amp; Data
          </h2>
          <p class="docs-intro">
            Your financial data never leaves your device. Here's exactly how it works.
          </p>

          <h3 class="docs-h3">
            Where is my data stored?
          </h3>
          <p>All data is saved in your browser's <code>localStorage</code> under the key <code>penny_state_v2</code>. It exists only in the browser on the device you used to enter it.</p>

          <h3 class="docs-h3">
            Does the app make network requests?
          </h3>
          <p>No. After the initial page load, the app makes zero network requests. There is no backend, no database, no analytics tracking, and no third-party scripts that phone home.</p>

          <h3 class="docs-h3">
            What happens if I clear my browser data?
          </h3>
          <p>Clearing cookies, site data, or localStorage will permanently delete all app data. Always keep a CSV export as a backup. You can re-import it at any time.</p>

          <h3 class="docs-h3">
            How can I back up my data?
          </h3>
          <p>Click the <strong>⬆ Export</strong> button in the header toolbar. Save the downloaded <code>penny-export.csv</code> somewhere safe. To restore, click <strong>⬇ Import</strong> and select the file.</p>

          <h3 class="docs-h3">
            Can I delete my data?
          </h3>
          <p>Go to <strong>Settings → Danger Zone → Clear All Data</strong>. This wipes all localStorage data and resets the app to its default state. Alternatively, clear your browser's site data for this page via your browser's privacy settings.</p>

          <h3 class="docs-h3">
            Is this app open source?
          </h3>
          <p>The codebase is available to review locally. No minification or obfuscation — you can audit exactly what runs in your browser.</p>
        </section>

        <!-- ─── CSV Reference ──────────────────────────────────── -->
        <section
          v-else-if="activeSection === 'csv-reference'"
          class="docs-section"
        >
          <h2 class="docs-section-title">
            CSV Format Reference
          </h2>
          <p class="docs-intro">
            The export file is a plain-text CSV divided into named sections.
            Each section begins with a <code>SECTION:name</code> header row,
            followed by a column-name row, then data rows.
            Sections are separated by a blank line.
          </p>

          <h3 class="docs-h3">
            File structure
          </h3>
          <pre class="docs-code">SECTION:meta
key,value
payStart,2026-05-01
exportedAt,2026-05-22T10:00:00.000Z

SECTION:allocation
needs,wants,savings
50,30,20

SECTION:incomeStreams
id,name,amount,biweekly
abc123,Paycheque,3500,false

...</pre>

          <h3 class="docs-h3">
            Section reference
          </h3>
          <div class="csv-table-wrap">
            <table class="csv-table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Columns</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>meta</code></td>
                  <td>key, value</td>
                  <td>payStart (YYYY-MM-DD), exportedAt (ISO datetime)</td>
                </tr>
                <tr>
                  <td><code>allocation</code></td>
                  <td>needs, wants, savings</td>
                  <td>Integer percentages summing to 100</td>
                </tr>
                <tr>
                  <td><code>incomeStreams</code></td>
                  <td>id, name, amount, biweekly</td>
                  <td>biweekly: true/false</td>
                </tr>
                <tr>
                  <td><code>expenseCards</code></td>
                  <td>cardId, cardLabel, itemId, itemName, itemAmount, itemBiweekly, itemDueDay</td>
                  <td>One row per item; itemDueDay blank when undated</td>
                </tr>
                <tr>
                  <td><code>purchases</code></td>
                  <td>id, name, amount, category, cardId, budgetType, date</td>
                  <td>Current period purchases</td>
                </tr>
                <tr>
                  <td><code>spendingHistory</code></td>
                  <td>periodId, periodDate, periodLabel, periodTotal, itemId, itemName, itemAmount, itemCategory, itemDate</td>
                  <td>One row per item; blank periodTotal row precedes items</td>
                </tr>
                <tr>
                  <td><code>loans</code></td>
                  <td>id, name, remaining, original, paymentAmount, frequency, date, budgetType, cardId</td>
                  <td />
                </tr>
                <tr>
                  <td><code>creditCards</code></td>
                  <td>id, name, balance, limit</td>
                  <td />
                </tr>
                <tr>
                  <td><code>subscriptions</code></td>
                  <td>id, name, amount, frequency, date, category, budgetType, cardId</td>
                  <td />
                </tr>
                <tr>
                  <td><code>wishlist</code></td>
                  <td>id, icon, name, url</td>
                  <td />
                </tr>
                <tr>
                  <td><code>savingsAccounts</code></td>
                  <td>id, name, balance, defaultAllocated, monthlyAllocations</td>
                  <td>monthlyAllocations: JSON object {"YYYY-MM": amount}</td>
                </tr>
                <tr>
                  <td><code>goals</code></td>
                  <td>id, accountId, targetAmount, targetDate</td>
                  <td>targetDate: YYYY-MM</td>
                </tr>
                <tr>
                  <td><code>assets</code></td>
                  <td>id, name, category, value</td>
                  <td>category: investment / real_estate / vehicle / other</td>
                </tr>
                <tr>
                  <td><code>netWorthHistory</code></td>
                  <td>id, date, netWorth, totalAssets, totalLiabilities</td>
                  <td>date: YYYY-MM</td>
                </tr>
                <tr>
                  <td><code>rules</code></td>
                  <td>id, pattern, matchType, category</td>
                  <td>matchType: contains / startsWith / exact</td>
                </tr>
                <tr>
                  <td><code>budgetAlerts</code></td>
                  <td>id, category, threshold</td>
                  <td />
                </tr>
                <tr>
                  <td><code>budgetDisplayMode</code></td>
                  <td>needs, wants, savings</td>
                  <td>Values: monthly / biweekly</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="docs-h3">
            Notes on backward compatibility
          </h3>
          <ul class="docs-list">
            <li>Unknown sections are silently ignored during import.</li>
            <li>Old 4-column loans (without paymentAmount / frequency) are imported with defaults.</li>
            <li>Old 3-column subscriptions (without budgetType / cardId) are imported with <code>budgetType: wants</code> and <code>cardId: null</code>.</li>
            <li>Savings accounts exported before the monthlyAllocations column was added import with <code>monthlyAllocations: {}</code>.</li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-docs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ─── Layout ─────────────────────────────────────────────────────── */
.docs-layout {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 1.5rem;
  align-items: start;
}

/* ─── Desktop sidebar ────────────────────────────────────────────── */
.docs-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  position: sticky;
  top: calc(var(--header-height, 70px) + 1.25rem);
}

.docs-nav-btn {
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  padding: 0.45rem 0.7rem;
  text-align: left;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}

.docs-nav-btn:hover {
  background: var(--surface2);
  color: var(--text);
}

.docs-nav-btn--active {
  background: var(--surface2);
  color: var(--accent, #4ade80);
  font-weight: 600;
}

/* ─── Mobile nav ─────────────────────────────────────────────────── */
.docs-mobile-nav {
  display: none;
  position: relative;
}

.docs-mobile-toggle {
  width: 100%;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.6rem 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.docs-mobile-toggle__chevron {
  font-size: 0.7rem;
  color: var(--muted);
}

.docs-mobile-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  z-index: 20;
}

.docs-mobile-item {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-family: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.6rem 0.9rem;
  text-align: left;
}

.docs-mobile-item:last-child { border-bottom: none; }

.docs-mobile-item--active {
  color: var(--accent, #4ade80);
  font-weight: 600;
}

/* ─── Section content ────────────────────────────────────────────── */
.docs-content {
  min-width: 0;
}

.docs-section-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  color: var(--text);
}

.docs-intro {
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.6;
  margin: 0 0 1.25rem;
}

.docs-h3 {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
  margin: 1.25rem 0 0.4rem;
}

.docs-h3:first-of-type {
  margin-top: 0;
}

p {
  font-size: 0.875rem;
  color: var(--text);
  line-height: 1.6;
  margin: 0 0 0.5rem;
}

.docs-list {
  font-size: 0.875rem;
  color: var(--text);
  line-height: 1.6;
  padding-left: 1.4rem;
  margin: 0 0 0.75rem;
}

.docs-list li { margin-bottom: 0.25rem; }

code {
  font-family: ui-monospace, monospace;
  font-size: 0.82em;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 0.1em 0.35em;
  color: var(--accent, #4ade80);
}

kbd {
  display: inline-block;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.1rem 0.4rem;
  font-family: ui-monospace, monospace;
  font-size: 0.8em;
  color: var(--accent, #4ade80);
}

/* ─── Inline link button ─────────────────────────────────────────── */
.docs-inline-link {
  background: none;
  border: none;
  color: var(--accent, #4ade80);
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ─── Release notes ──────────────────────────────────────────────── */
.release-block {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
}

.release-block:last-child { border-bottom: none; }

.release-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.2rem;
}

.release-version {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--accent, #4ade80);
}

.release-date {
  font-size: 0.78rem;
  color: var(--muted);
}

.release-tagline {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--muted);
  margin: 0 0 0.4rem;
}

/* ─── FAQ ────────────────────────────────────────────────────────── */
.faq-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
}

.faq-item:last-child { border-bottom: none; }

.faq-q {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 0.35rem;
}

/* ─── CSV reference ──────────────────────────────────────────────── */
.docs-code {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
  color: var(--text);
  overflow-x: auto;
  line-height: 1.6;
  margin: 0.5rem 0 1rem;
  white-space: pre;
}

.csv-table-wrap {
  overflow-x: auto;
  margin: 0.5rem 0 1rem;
}

.csv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.csv-table th,
.csv-table td {
  text-align: left;
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
  line-height: 1.4;
}

.csv-table th {
  color: var(--muted);
  font-weight: 600;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.csv-table tr:last-child td { border-bottom: none; }

/* ─── Responsive ─────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .docs-layout {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .docs-sidebar { display: none; }
  .docs-mobile-nav { display: block; }
}
</style>
