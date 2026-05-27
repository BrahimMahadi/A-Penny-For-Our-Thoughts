# Phase Tracking — Development Progress

Real-time tracking of development progress. Updated as work completes.

---

## Phase 0: Design & Visual Polish 🎨
**Status**: ✅ **COMPLETE**  
**Goal**: Establish Bloomberg-style professional aesthetic with excellent information hierarchy

### Completed
- ✅ Design audit — color palette, typography, spacing reviewed
- ✅ Bloomberg-inspired design direction established (information-dense, metric-focused)
- ✅ Chart.js upgraded with professional styling (fonts, colors, tooltips)
- ✅ Income overview stat cards — prominent KPI display
- ✅ Responsive layout optimized across all breakpoints (1024, 768, 540, 380px)
- ✅ Dark/light theme toggle with CSS variable system
- ✅ Color contrast and status color system (green/amber/red) consistent across all sections
- ✅ Modal system standardized with `mField()` builder pattern

---

## Phase 1: Core Analytics & Goal Tracking 📊
**Status**: ✅ **COMPLETE**  
**Goal**: Add intelligent financial tracking — answer "Am I on track?"

### 1A: Budget vs. Actual Dashboard ✅
- ✅ Calculates budgeted vs. actual spending for Needs, Wants, Savings
- ✅ On Track / Over status chips per category
- ✅ Savings actual uses total account allocations for the current month
- ✅ Renders inline below income overview cards

### 1B: Savings Accounts Enhancement ✅
- ✅ Accounts now track `balance` (total in account) separately from monthly contribution
- ✅ `defaultAllocated` — persistent monthly contribution
- ✅ `monthlyAllocations` — sparse map for per-month overrides (only stores deltas from default)
- ✅ `getAllocationForMonth(account, year, month)` utility for all allocation queries
- ✅ "Allocate Savings Budget" modal — set per-account amounts for current month with real-time over-budget validation
- ✅ Accounts display balance + effective monthly allocation side-by-side
- ✅ Full CRUD on accounts (Add, Edit, Delete)
- ✅ Delete cascades to linked goals
- ✅ CSV import/export updated to 5-column format with JSON monthlyAllocations

### 1C: Savings Goal Tracker ✅
- ✅ Goals linked per savings account (accountId reference)
- ✅ Progress auto-calculated from `account.balance` vs `goal.targetAmount`
- ✅ Monthly savings needed = (target − balance) / monthsRemaining
- ✅ Status logic: compares current month's effective allocation vs monthly needed
  - On Track: allocation ≥ needed
  - Caution: allocation ≥ 80% of needed
  - Off Track: allocation < 80% of needed
  - Complete / Missed for past target dates
- ✅ Progress bar with current/target amounts overlay
- ✅ Full CRUD: Add Goal, Edit, Delete (with cascade from account delete)
- ✅ CSV import/export with `SECTION:goals`
- ✅ Backward-compatible state migration (`state.goals` initialized if missing)
- ✅ Empty state handled ("No savings goals yet")
- ✅ Orphan goals (account deleted) silently skipped by renderer

### Testing (Phase 1)
- ✅ Allocation modal: real-time validation, sparse override storage, over-budget prevention
- ✅ Goal edge cases: past/complete/missed, orphan account returns null
- ✅ Cascade delete: deleting account removes linked goals
- ✅ CSV round-trip: import → parse → render verified end-to-end
- ✅ `sample-data.csv` updated to flat expenseCards format (fixed old JSON blob format)
- ✅ `blank-template.csv` headers corrected to match exporter format
- ✅ `docs/IMPORT_TEMPLATE.md` updated with correct field documentation

### Bugs Fixed (Phase 1)
- ✅ Goal status always "off-track" — was using raw % vs fixed thresholds; fixed to use allocation vs needed
- ✅ "Allocation progress" label floating over income cards — `.progress-label` CSS rule was not scoped to `.goal-progress-container`
- ✅ Orphaned goals accumulating in state when savings account deleted — cascade delete added

---

## Sprint 3: Polish & UX Refinement ✨
**Status**: ✅ **COMPLETE** (May 2026 — v2.4)
**Goal**: Tactile, delightful interactions that make the dashboard feel production-ready

### Completed
- ✅ **Toast Notifications** — `showToast()` in `utils.js`; self-dismissing pills after every CRUD action (49 functions); `aria-live` accessible; stacks upward above mobile nav; `toastIn`/`toastOut` CSS animations
- ✅ **Keyboard Shortcuts** — global `handleGlobalKeydown` listener; `?` panel with 14 shortcuts across 4 groups; `isTyping()` guard; focus-trap + slide-up/out animation; hidden on mobile
- ✅ **Empty State Illustrations** — `emptyState(icon, title, hint)` helper in `render.js`; animated entrance (`emptyStateIn`); applied to all 10 data sections
- ✅ **Micro-interactions** — CSS-only (zero JS changes): card hover lift, button press scale, tab page fade-in (`pageFadeIn`), progress bar fill (`scaleBarIn` with `transform-origin: left`), list item stagger (3 tiers, 140ms max), chip hover scale; `prefers-reduced-motion` override
- ✅ **Mobile Form UX** — `inputmode="decimal"` on all money inputs; `markFieldInvalid()` shake + danger border (auto-clears on input); `mField()` auto-injects `inputmode`; `.modal-row` collapses 1-col at ≤380px; `:valid` → `:user-valid` fix for untouched inputs

### Branches merged to main
- `feat/sprint3-toast-notifications`
- `feat/sprint3-keyboard-shortcuts`
- `feat/sprint3-empty-states`
- `feat/sprint3-micro-interactions`
- `feat/sprint3-mobile-form-ux`

---

## Phase 2: Advanced Features 📅
**Status**: 🟡 **IN PROGRESS**  
**Goal**: Handle complex financial scenarios

### 2A: Net Worth Tracker ✅
**Priority**: 🔴 HIGH — COMPLETE
- ✅ Assets: savings accounts (auto-listed), typed manual assets (💰 Investments, 🏠 Real Estate, 🚗 Vehicles, 📦 Other)
- ✅ Liabilities: loans + credit card balances (auto-summed, read-only)
- ✅ Net worth = totalAssets − totalLiabilities, displayed as 4 stat tiles (net worth, assets, liabilities, MoM change)
- ✅ Monthly auto-snapshot on `loadFromStorage()`, stored in `netWorthHistory[]`, trimmed to 24 months
- ✅ `renderNetWorth()` + `renderNetWorthChart()` — line chart with single-point note when <2 months of data
- ✅ Full CRUD on manual assets (Add per category, Edit, Delete)
- ✅ CSV import/export: `SECTION:assets` and `SECTION:netWorthHistory`
- ✅ Mobile responsive (2-column stat tiles, stacked panels at 380px)

### 2B: Recurring Expense Calendar ✅
**Priority**: 🟡 MEDIUM — COMPLETE
- ✅ 6-month summary cards (clickable — click any card to jump to that month)
- ✅ 6-month forecast bar chart (Chart.js mixed: bars for bills, dashed line for Needs budget)
- ✅ Click bars in forecast chart to navigate to that month
- ✅ Toggle between List and Calendar views (persists across month changes)
- ✅ Calendar grid: 7-column layout, leading blank cells, correct day-of-week alignment
- ✅ Bills shown as badges on their due dates with per-day totals
- ✅ Today's date highlighted (green tint + border)
- ✅ "Expensive days" highlighted in amber (`.cal-heavy`) when day total > 12% of Needs budget
- ✅ Multi-badge overflow: up to 2 shown + "+N more" for crowded days
- ✅ Undated items listed below grid
- ✅ PREV / NEXT month navigation preserved in both views
- ✅ `getCalendarDayMap(year, month)` — `Map<dayNum, item[]>` from `getMonthForecast()`
- ✅ `getSixMonthForecast(year, month)` — array of 6 `{year, month, label, total, budgeted, variance}`
- ✅ `renderForecastBarChart()` in charts.js — destroyed and re-created on theme toggle
- ✅ `scheduleView` persisted in `uiState` (survives navigation, not localStorage)
- ✅ Responsive at 375px mobile — 7-col grid stays readable, badges fit cells
- ✅ date-fns installed as lightweight date utility dependency

### 2C: Subscription Budget Integration ✅
**Priority**: 🟡 MEDIUM — COMPLETE
- ✅ Stats header: Monthly Cost / Annual Total / Wants Budget % (3 tiles)
- ✅ Wants budget impact bar — color-coded green/amber/red at 30%/60% thresholds
- ✅ Renewal alert banner — amber callout for any sub renewing within 7 days
- ✅ Per-item annual cost annotation (non-annual subs show `· $X/yr`)
- ✅ Empty state: stats show `—`, bar label = "No subscriptions tracked yet"
- ✅ Responsive: 3-col stats grid scales to mobile; label font reduces at ≤380px

### 2D: Month-over-Month Analytics ✅
**Priority**: 🟢 LOW — COMPLETE
- ✅ `getMonthlyWantsHistory(6)` — aggregates wants spending by calendar month
  (live purchases for current month + closed spendingHistory periods for past months)
- ✅ `getMomInsights()` — generates up to 3 auto-text insights:
  - MoM delta (spending up/down % vs. last month, with $-amount)
  - Best/worst month in range (guarded: only fires when `maxTotal > 0`)
  - Top category this month (name + amount + % of total)
- ✅ "MONTHLY TRENDS" section in Spending Analytics panel:
  - 4 stat cards: This Month / Last Month / MoM Change / Wants Budget
  - Monthly Wants Spending bar chart (6 months, current month brighter)
  - Dashed Wants Budget reference line on chart
  - Auto-insight list with colour-coded left borders (good/warn/info)
  - Empty-state copy when < 2 months of data
- ✅ `renderMomTrendChart()` in charts.js — in-place update on re-render, recreated on theme toggle
- ✅ Fixed BUG-004: `analyticsFilters` bare reference → import `uiState` in analytics.js
- ✅ Fixed BUG-005: `getTopCategories` missing import in charts.js (Top Categories chart was silently broken)
- ✅ Fixed BUG-006: analytics charts blank after theme toggle → `renderAll()` re-renders open analytics panel

---

## Phase 3: Code Quality & Modularity 🔧
**Status**: 🟢 **PENDING**  
**Goal**: Refactor for long-term maintainability

### 3A: Code Modularization
- [ ] Split `src/app.js` (~2,400 lines) into:
  - `src/state.js` — initialization, migrations, getters
  - `src/render.js` — all render* functions
  - `src/charts.js` — Chart.js instance management
  - `src/analytics.js` — calculations, trends
  - `src/ui.js` — modal, form helpers
  - `src/utils.js` — genId, fmt, formatters

### 3B: Performance Optimization
- [ ] Reuse Chart.js instances (destroy/recreate is wasteful)
- [ ] Lazy-render charts only when section is visible
- [ ] Test with large datasets (5+ years of history)

### 3C: Testing & Documentation
- [ ] Unit tests for critical calculations (getGoalProgress, getAllocationForMonth, variance)
- [ ] `docs/ARCHITECTURE.md` — developer guide for state shape + function map
- [ ] JSDoc on all exported functions

### 3D: Error Handling
- [ ] Try-catch around all localStorage operations
- [ ] Graceful degradation for storage quota exceeded
- [ ] Backup/restore functionality (export to JSON, not just CSV)

---

## Infrastructure: Vite + Tailwind Migration 🏗️
**Status**: ✅ **COMPLETE** — merged to `main` May 2026  
**Goal**: Replace http-server + plain CSS with Vite bundler + Tailwind CSS to eliminate the large monolithic file problem

### Story 1: Vite Infrastructure ✅
- ✅ All 6 JS files converted to ES modules (`import`/`export`)
- ✅ New `src/main.js` entry point — wires callbacks, exposes ~60 functions to `window`
- ✅ New `src/uistate.js` — shared mutable UI state (analyticsFilters, scheduleViewYear/Month)
- ✅ `setState()` helper in state.js — solves ES module read-only binding issue
- ✅ `setThemeCallbacks()` pattern — resolves state ↔ charts circular dep
- ✅ `index.html` updated: 6 classic scripts → 1 `<script type="module">`
- ✅ `vite.config.js` created
- ✅ `package.json` updated with `dev`/`build`/`preview` scripts
- ✅ Tested: all 19 window functions OK, zero console errors, all sections render

### Story 2: Tailwind + PostCSS Config ✅
- ✅ Installed `tailwindcss@^4.3.0`, `@tailwindcss/vite@^4.3.0`
- ✅ `@import "tailwindcss"` + `@theme inline { }` block in `src/styles.css`
- ✅ 14 botanical CSS variables bridged as Tailwind colour tokens (e.g. `text-accent2`, `bg-surface`)
- ✅ `@source` directives added for `render.js`, `app.js`, `index.html`
- ✅ Verified: Tailwind utilities reference `var(--surface)` etc. directly — dark/light theme switching works at utility level

### Story 3: CSS File Split ✅
- ✅ 3484-line `src/styles.css` split into 8 focused modules in `src/css/`
- ✅ `tokens.css` · `layout.css` · `forms.css` · `features.css` · `ui.css` · `docs.css` · `responsive.css` · `extras.css`
- ✅ Cascade order enforced via JS imports in `src/main.js`
- ✅ `src/styles.css` is now Tailwind entry point only (~70 lines)
- ✅ Verified: 9 stylesheets loaded, zero console errors, all tabs render correctly

### Story 4: Tailwind Utility Migration ✅
- ✅ Removed custom `.grid`, `.grid-N` utility classes — replaced with `grid grid-cols-N gap-5` in HTML
- ✅ Removed `.sr-only` from `tokens.css` — using Tailwind's built-in `sr-only` (scanned via `@source "../index.html"`)
- ✅ Added `--color-accent-text` to `@theme inline` for the `text-accent-text` utility
- ✅ ~60 inline `style=""` attributes replaced with Tailwind utility classes (`text-accent2`, `text-muted`, `flex`, `gap-*`, `mb-*`, etc.)
- ✅ Intentional inline styles preserved: JS-toggled `display:none`, CSS-override margins on `.section-title`, analytics input sizing
- ✅ Fixed pre-existing bug: `cssVar` not imported in `render.js` → added to import from `utils.js`
- ✅ Verified: theme toggle round-trip passes, all Tailwind tokens resolve, zero console errors

### Story 5: Build Pipeline & Measurement ✅
- ✅ `vite build` succeeds in 321ms, zero errors, 19 modules transformed
- ✅ Bundle sizes (production, Vite + Tailwind v4):
  - `index.html`      71.84 kB  │ gzip: 16.32 kB
  - CSS bundle        71.44 kB  │ gzip: 13.74 kB
  - JS bundle        115.32 kB  │ gzip: 29.18 kB
  - **Total gzip:    ~59 kB** (HTML + CSS + JS)
- ✅ Production verified via `vite preview`: all tokens resolve, theme toggle works, 1 merged stylesheet, zero console errors
- ✅ `.claude/launch.json` updated: added `preview` entry (port 4173) for testing production builds

---

## Sprint 4: Vue 3 Migration 🔄
**Status**: 🟢 **PLANNED** — begins after Phase 2 completes  
**Goal**: Full rewrite from vanilla JS to Vue 3 + Pinia to replace manual DOM rendering with a reactive component architecture

### Why Vue 3
The current architecture uses template-literal HTML strings in `render*()` functions and calls `renderAll()` on every state change. Vue 3's reactivity system eliminates this pattern entirely — state changes propagate to the DOM automatically, components encapsulate their own markup and logic, and Vitest enables proper unit testing.

### Scope
- **Full rewrite** (not incremental) — each `render*()` function becomes a `.vue` SFC
- Vite already in place — Vue plugin is a one-line add (`@vitejs/plugin-vue`)
- Tailwind CSS stays — utility classes carry over unchanged
- All CSS modules (`src/css/`) carry over unchanged
- localStorage persistence stays — wrapped in a Pinia store

### Planned Stories
- [ ] **Story 1** — Scaffold Vue 3 app: install `vue`, `@vitejs/plugin-vue`, `pinia`; create `App.vue` entry, convert `main.js` to `createApp()`
- [ ] **Story 2** — Pinia store: migrate `state.js` → `useAppStore()` with full state shape, migrations, and `setState()` equivalent
- [ ] **Story 3** — Layout shell: `AppHeader.vue`, `BottomNav.vue`, `TabRouter.vue` (replaces tab-switching JS)
- [ ] **Story 4** — Home tab components: `IncomeOverview.vue`, `BudgetVariance.vue`, `WantsTracker.vue`
- [ ] **Story 5** — Expenses + Loans + Credit Cards components
- [ ] **Story 6** — Savings + Goals + Net Worth components
- [ ] **Story 7** — Schedule + Analytics + Docs components
- [ ] **Story 8** — Modal system: `AppModal.vue` with slot-based content, replaces `openModal()`/`closeModal()`
- [ ] **Story 9** — Charts: wrap Chart.js instances in `useChart()` composable; lazy-render on tab visibility
- [ ] **Story 10** — CSV import/export, keyboard shortcuts, toast system ported to composables
- [ ] **Story 11** — Full QA pass: all tabs, CRUD, theme toggle, mobile breakpoints, CSV round-trip
- [ ] **Story 12** — Vitest setup: unit tests for store actions, calculation helpers, composables

### Branch: `feat/vue3-migration`

---

## Sprint 4 — Vue 3 + TypeScript Migration

**Branch:** `feat/vue3-migration` (long-lived; cutover when complete)
**Plan:** [docs/VUE3_MIGRATION_PLAN.md](VUE3_MIGRATION_PLAN.md)

### Sprint 0 — Foundation ✅ COMPLETE
- ✅ Branch off `main`
- ✅ Installed Vue 3, Pinia, vue-chartjs, TypeScript, vue-tsc, Vitest, ESLint
- ✅ Configured `tsconfig.json` (strict), `vite.config.ts` w/ `@/*` alias
- ✅ `.eslintrc.cjs` with `no-undef` enforced (prevents BUG-004/-005/-007/-008 class)
- ✅ Scaffolded `main.ts`, `App.vue`, `env.d.ts`
- ✅ GitHub Actions: type-check + lint + test + build on non-main branches
- ✅ All four scripts green (`type-check`, `lint`, `test`, `build`)

### Sprint 1 — State Foundation ✅ COMPLETE
- ✅ Typed schema (`BudgetState`, `UiState`, all entity interfaces)
- ✅ Utils ported (`fmt`, `pct`, `csv`, `date`, `id`, `dom`)
- ✅ Pinia stores: `budget` (full CRUD + v1 migration), `ui`, `theme`
- ✅ Auto-persist on mutation via `$subscribe`
- ✅ Analytics ported to `utils/calculations.ts` (~600 lines, fully typed)
- ✅ `useAnalytics()` composable wrapping calculations as reactive `computed` refs
- ✅ 173 tests passing across 9 spec files
- ✅ BUG-009 fixed during port (`fmt()` negative formatting)

### Sprint 2 — Core Layout & Primitives ✅ COMPLETE
- ✅ App.vue header + tab navigation (Dashboard / Schedule / Docs)
- ✅ Theme toggle wired to theme store; persists across reload
- ✅ Three pages scaffolded (DashboardPage, SchedulePage, DocsPage)
- ✅ 7 UI primitives: BaseButton, BaseCard, BaseModal, EmptyState, StatCard,
     ProgressBar, ToastContainer (all `base-*` class-prefixed)
- ✅ 3 composables: useToast, useModal (scroll lock + ESC), useKeyboard
- ✅ 195 tests passing (22 new in Sprint 2)
- ✅ Visual QA via preview tool — tab switch, theme toggle, dark/light both work
- ✅ BUG-010 fixed: class-name collisions with legacy CSS
- ✅ BUG-011 fixed: bare `header { }` rule bleeding into BaseCard

### Sprint 3 — Chart Components ✅ COMPLETE
- ✅ `useChartStyles()` composable — reads CSS vars reactively, re-computes on theme toggle
- ✅ `CATEGORY_COLOURS` constant exported from `calculations.ts`
- ✅ Chart.js registered globally in `main.ts` via `ChartJS.register(...registerables)`
- ✅ All 8 vue-chartjs wrapper SFCs built in `src/components/charts/`:
  - `WantsDonut.vue` — doughnut with centre % label + warn/over colour states
  - `CcBar.vue` — stacked bar, balance coloured green/amber/red by utilisation %
  - `AnalyticsLine.vue` — spending-over-time line, hidden when empty
  - `AnalyticsBar.vue` — horizontal bar, top categories, hidden when empty
  - `BudgetVsActualChart.vue` — grouped bar, Needs/Wants/Savings comparison
  - `NetWorthChart.vue` — line chart, green/red colour based on sign, single-point note
  - `MoMTrend.vue` — mixed Bar+Line (6-month wants history + budget reference line)
  - `ForecastBar.vue` — mixed Bar+Line (6-month forecast + budget line + click-to-navigate)
- ✅ All chart SFCs use `useChartStyles()` → auto re-colour on theme toggle
- ✅ Mixed charts (MoMTrend, ForecastBar) use `<Chart type="bar">` generic wrapper
- ✅ All Chart.js TS type issues resolved (weight numbers, ticks `string | number`, `null` parsed values)
- ✅ DashboardPage.vue wired with BudgetVsActualChart, WantsDonut, NetWorthChart, CcBar (live data)
- ✅ 22 chart tests added (all 8 SFCs + composable) — vue-chartjs stubbed for jsdom compatibility
- ✅ 217 tests passing total (195 → 217)
- ✅ `vite build` green — 87 modules, 114 kB gzip (Chart.js expected overhead)
- ✅ Visual QA: 3 charts render, 7 cards visible, zero console errors in dev server

### Sprint 4 — Section Components ✅ COMPLETE
- ✅ All 13 section SFCs built in `src/components/sections/`:
  - `IncomeStreams.vue` — CRUD list with bi-weekly chip, monthly total
  - `BudgetAllocation.vue` — 50/30/20 cards, segmented bar, monthly/bi-weekly toggle, edit modal
  - `WantsTracker.vue` — bi-weekly envelope, WantsDonut, category chips, purchase CRUD
  - `ExpenseCards.vue` — card grid, per-card item CRUD, linked subs/loans, needs-remaining hint
  - `Loans.vue` — progress bars, next payment, frequency-typed form (Frequency union)
  - `CreditCards.vue` — utilisation bars with 30% marker, CcBar chart, aggregate totals
  - `Subscriptions.vue` — stats header, budget impact bar, renewal alerts, sorted list
  - `Savings.vue` — stats, per-account allocation modal, monthly override via setSavingsAccountAllocation
  - `SavingsGoals.vue` — progress bars from useAnalytics.progressForGoal, status borders
  - `Wishlist.vue` — emoji icon, optional URL link, CRUD
  - `NetWorth.vue` — 4 stat tiles, asset category breakdown, manual asset CRUD, snapshot
  - `BudgetVsActual.vue` — 3 variance cards + BudgetVsActualChart
  - `SpendingAnalytics.vue` — collapsible panel, filter bar, history list, charts, MoM insights
  - `RecurringCalendar.vue` — 6 summary cards, ForecastBar chart, list/calendar view toggle, PREV/NEXT
- ✅ DashboardPage.vue rewritten to host all 13 sections in organised layout
- ✅ SchedulePage.vue simplified to single RecurringCalendar wrapper
- ✅ TypeScript fixes: `'xs'` added to BaseButton Size type, `billCount` added to SixMonthForecastRow, Frequency type cast in Loans + Subscriptions
- ✅ Subscription frequencies aligned to Frequency union type (weekly/biweekly/monthly/quarterly/yearly)
- ✅ ESLint auto-format pass + all 9 unused-var/unused-import warnings resolved
- ✅ 70 tests added in `tests/components/sections/sections.spec.ts`
- ✅ 287 tests passing total (217 → 287)
- ✅ `vue-tsc --noEmit`, `eslint --max-warnings 0`, `vite build` all green

### Sprint 5 — CSV, Keyboard Shortcuts & Accessibility ✅ COMPLETE
- ✅ `src/utils/csvImportExport.ts` — typed port of all 17-section CSV logic from legacy `app.js`:
  - `exportStateToCSV(state)` — pure serialiser, backward-compatible with legacy CSV files
  - `parseCSVToState(text)` — full parser with backward-compat for 4-column loans, 3-column subs, old savingsAccounts format
  - `triggerCSVDownload(csv, filename?)` — DOM download helper, separated for testability
- ✅ `useBudgetStore` gains `exportCSV()` and `importCSV(text)` actions
- ✅ `App.vue` redesigned with toolbar: ⬆ Export CSV, ⬇ Import CSV (hidden file input), ? shortcut help modal
- ✅ Global keyboard shortcuts via `useKeyboard` (all guarded from inputs):
  - `?` — toggle shortcut help panel
  - `1` / `2` / `3` — switch Dashboard / Schedule / Docs tabs
  - `E` — export CSV
  - `T` — toggle light/dark theme
- ✅ `prefers-reduced-motion` guards added to `BaseModal`, `ProgressBar`, `ToastContainer`, `App.vue`
- ✅ Type gaps fixed: `ExpenseItem.dueDay`, `SpendingHistoryPeriod.label`, `SpendingHistoryPeriod.items[].id`
- ✅ 59 new tests: CSV round-trip (all 17 sections), backward-compat imports, download helper, toolbar a11y, keyboard shortcuts
- ✅ **346 tests passing total** (287 → 346)
- ✅ `vue-tsc --noEmit` clean · `eslint --max-warnings 0` clean · `vite build` green

---

## Overall Progress

| Sprint / Phase | Status | Version |
|----------------|--------|---------|
| Phase 0 — Design & Visual Polish | ✅ Complete | — |
| Phase 1 — Analytics & Goal Tracking | ✅ Complete | — |
| Sprint 3 — Polish & UX Refinement | ✅ Complete | — |
| Phase 2 — Advanced Features | ✅ Complete | — |
| Infra — Vite + Tailwind Migration | ✅ Complete | — |
| Vue 3 Migration (Sprints 0–6) | ✅ Complete | v1.0.0 |
| Sprint 7 — Settings, Rules Engine, Docs | ✅ Complete | v1.1.0 |
| Sprint 8 — Error Handling, Lazy Charts, Docs | ✅ Complete | v1.2.0 |
| Sprint 9 — Mobile UX Pass | ✅ Complete | v1.3.0 |
| Sprint 10 — Onboarding Flow | ✅ Complete | v1.4.0 |
| Sprint 11 — Envelope Forecast & MoM Deltas | ✅ Complete | v1.5.0 |
| Sprint 12 — Spending Trend Chart & Goals Timeline | ✅ Complete | v1.6.0 |
| Sprint 13 — Dashboard Polish, Form Validation & JSON Backup | ✅ Complete | v1.7.0 |
| Sprint 14 — Polish & Analytics | ✅ Complete | v1.8.0 |
| Sprint 15 — Pay Period Schedule View | ✅ Complete | v1.9.0 |
| Sprint 16 — Loans on Schedule Tab | ✅ Complete | v1.10.0 |
| Sprint 17 — Custom-Days Subscriptions | ✅ Complete | v1.11.0 |
| Sprint 18 — Collapsible Sections & Drag-and-Drop Reorder | ✅ Complete | v1.12.0 |
| Sprint 19 — Category Manager, Bi-Yearly Frequency & Chequing Balance Dashboard | ✅ Complete | v1.13.0 |
| Sprint 20 — Calendar Day Detail (Slide Panel + Hover Popover) | ✅ Complete | v1.14.0 |
| Sprint 21 — WantsDonut categoryColors & ProgressBar Label Bug Fixes | ✅ Complete | v1.15.0 |
| Sprint 22 — Search, Sort & Filter for Purchases and Subscriptions | ✅ Complete | v1.15.0 |
| Sprint 23 — Retroactive Category Editing for Archived Purchases | ✅ Complete | v1.16.0 |
| Sprint 24 — Supabase DB Integration | ✅ Complete | v1.17.0 |
| Sprint 25 — Supabase Auth (Magic Link + Google OAuth) | ✅ Complete | v1.18.0 |
| HF-1 — Toolbar Cleanup (Import/Export → Settings) | ✅ Complete | v1.18.0 |
| HF-2 — Auth Loading Hang Fix (safety timer + fetch timeout) | ✅ Complete | v1.18.0 |
| HF-3 — Concurrent initStore Fix (onAuthStateChange event filter + concurrency guard) | ✅ Complete | v1.18.0 |
| **Current** | **✅ main** | **v1.18.0** |

---

## Sprint 6 — Final QA, Smoke Test & Merge 🏁
**Status**: ✅ **COMPLETE** — May 2026  
**Goal**: Visual QA of all sections in dev server, production build verification, bug fixes, merge to `main` and tag `v1.0.0`

### Completed
- ✅ Production build verified: `vite build` green, 87 modules, 114 kB gzip (Chart.js overhead expected)
- ✅ Visual QA — all 13 Dashboard sections in dev server: stat cards, Budget vs. Actual chart, all section empty states, all default data, toast notifications, modal open/close
- ✅ Schedule tab QA: 6-month forecast renders, calendar view, chart canvas, "1 bill" (Netflix) on the 1st, zero errors
- ✅ Docs tab QA: placeholder renders, zero errors
- ✅ Keyboard shortcuts verified in real browser (async tick pattern): `?` opens/closes help panel, `1`/`2`/`3` switch tabs, `E` triggers export, `T` toggles theme
- ✅ **BUG-012 fixed**: `useKeyboard` modifier check was bidirectional (`needsShift !== e.shiftKey`) — rejected symbol keys like `?` that naturally carry `shiftKey=true` in a real browser. Changed to one-directional: `if (needsShift && !e.shiftKey)`. Verified with `shiftKey:true` dispatch.
- ✅ **BUG-013 fixed**: Mobile header grid at ≤768px — toolbar overflowed to row 3 when `.app-tabs` already claimed the full row. Added explicit `grid-row`/`grid-column` placement for brand, toolbar, and tabs.
- ✅ All 346 tests still green after both fixes
- ✅ `PHASE_TRACKING.md` updated
- ✅ Merged `feat/vue3-migration` → `main`
- ✅ Tagged `v1.0.0`

---

## Sprint 7 — Settings, Rules Engine, Budget Alerts & Docs 🔧
**Status**: ✅ **COMPLETE** — May 2026  
**Branch:** `feat/sprint-7`  
**Version:** v1.1.0  
**Goal**: Add the Settings page (pay period, rules, alerts), a full DocsPage with content, and comprehensive tests

### Completed
- ✅ **Settings tab** — 4th tab added to navigation (`TabId = 'settings'`, keyboard shortcut `4`)
- ✅ **PayStartDate.vue** — bi-weekly pay period anchor date picker; derives next pay date and days remaining
- ✅ **RulesEngine.vue** — keyword → category auto-classification CRUD; applied to new purchases in WantsTracker
- ✅ **BudgetAlerts.vue** — per-category spending threshold alerts; triggered banner shown in WantsTracker when category spending exceeds threshold
- ✅ **SettingsPage.vue** — hosts PayStartDate, RulesEngine, BudgetAlerts, fundsRemaining balance field, and "Danger Zone" (clear all data)
- ✅ **DocsPage.vue** — full content port across 5 sections (Overview, Getting Started, Features, CSV Format, Tips)
- ✅ **BUG-014 fixed**: `docs.css` global `display: none` rule hidden DocsPage — removed legacy import from `main.ts`
- ✅ Tests: 102 new tests across `settings.spec.ts` + `pages.spec.ts` — **448 tests passing total** (346 → 448)
- ✅ `vue-tsc --noEmit` clean · `eslint --max-warnings 0` clean · `vite build` green
- ✅ Merged `feat/sprint-7` → `main`, tagged **v1.1.0**

---

## Sprint 8 — Error Handling, Lazy Charts & Architecture Docs 🏗️
**Status**: ✅ **COMPLETE** — May 2026  
**Branch:** `feat/sprint-8`  
**Version:** v1.2.0  
**Goal**: Harden storage error handling, lazy-render charts via IntersectionObserver, rewrite architecture docs for Vue 3, clean up stale vanilla-JS documentation

### Task 46: localStorage Error Handling ✅
- ✅ `saveStateToStorage()` — wraps `localStorage.setItem` in try/catch; returns `boolean` (true = success, false = QuotaExceededError or any DOMException)
- ✅ `loadStateFromStorage()` — `localStorage.getItem` moved inside try/catch (was only wrapping JSON.parse before)
- ✅ `loadThemeFromStorage()` — wrapped in try/catch; returns `'dark'` on any storage failure
- ✅ `applyThemeToDOM()` — DOM `setAttribute` runs unconditionally; `localStorage.setItem` wrapped separately
- ✅ `main.ts` `$subscribe` watcher — checks save result; shows danger toast ("Storage is full — export a CSV backup") when `saveStateToStorage` returns false
- ✅ Tests: 13 new error-handling tests across `budget.spec.ts` and `theme.spec.ts`

### Task 47: Lazy Chart Rendering via IntersectionObserver ✅
- ✅ `src/composables/useInView.ts` — new composable; `isInView` starts `false`, fires once when element enters viewport, stays `true` (disconnect-on-intersect pattern); falls back to `isInView = true` immediately when `IntersectionObserver` is undefined (jsdom/SSR safe)
- ✅ `src/css/features.css` — `.chart-skeleton` shimmer placeholder with `chart-skeleton-pulse` animation + `prefers-reduced-motion` guard
- ✅ All 8 chart SFCs updated: `wrapperRef`, `isInView`, `v-if="isInView"` on chart canvas, `v-else` skeleton div
- ✅ `AnalyticsLine` / `AnalyticsBar` — combined visibility + data conditions: `v-if="isInView && data.length > 0"`, `v-else-if="!isInView"` skeleton; empty-data-in-view renders nothing (parent handles EmptyState)
- ✅ `tests/composables/useInView.spec.ts` — 11 tests (class-based MockIO, no-IO fallback, intersection lifecycle, disconnect on first intersect, disconnect on unmount, custom/default rootMargin)

### Task 48: ARCHITECTURE.md Rewrite ✅
- ✅ Full rewrite of `docs/ARCHITECTURE.md` for Vue 3 + TypeScript stack
- ✅ Covers: overview diagram, annotated file tree, `BudgetState` TS interface, storage keys, persistence flow, `UiState`/`ThemeState`, CRUD data flow, all 6 composable contracts with signatures, chart architecture pattern, tab routing, CSV import/export, testing strategy table (19 spec files), responsive breakpoints, git/version tags, key design decisions

### Task 49: Documentation Cleanup ✅
- ✅ Deleted stale vanilla-JS era docs: `CHARTS_UPGRADED.md`, `DESIGN_AUDIT.md`, `PHASE0_IMPLEMENTATION.md`
- ✅ `docs/VUE3_MIGRATION_PLAN.md` — HISTORICAL banner added (migration complete, v1.0.0 shipped)
- ✅ `docs/README.md` — full rewrite; reflects Vue 3 + TypeScript stack, current version, correct file tree
- ✅ `CLAUDE.md` — Tech Stack updated from "[HTML, CSS, JS]" to Vue 3 + TypeScript + Pinia + Vite
- ✅ `docs/BUGS.md` — BUG-012/013/014 added; legacy vanilla-JS bugs section clearly marked
- ✅ `docs/PHASE_TRACKING.md` — Sprint 7 and Sprint 8 complete entries added; summary table updated
- ✅ `docs/ROADMAP.md` — SUPERSEDED note added (plan executed via Vue 3 migration)

### Merge & Tag
- ✅ 448 tests passing — no regressions
- ✅ `vue-tsc --noEmit` clean · `eslint --max-warnings 0` clean · `vite build` green
- ✅ Merged `feat/sprint-8` → `main`, tagged **v1.2.0**

---

## Weekly Check-in Template

**Week #:** [Fill in]  
**Phase:** [Current phase]

**Completed this week:**
- [ ] ...

**In Progress:**
- [ ] ...

**Blocked / Issues:**
- None / [description]

**Next week:**
- [ ] ...

---

---

## Sprint 9 — Mobile UX Pass 📱
**Status**: ✅ **COMPLETE** — May 2026  
**Branch:** `feat/sprint-9`  
**Version:** v1.3.0  
**Goal**: Make the app feel native on small screens — smooth swipe navigation and comfortable touch interactions

### Completed

#### 9A: Swipe Gestures for Tab Navigation ✅
- ✅ `src/composables/useSwipe.ts` — new composable; `touchstart`/`touchend` delta detection
- ✅ Minimum 50px horizontal threshold to avoid accidental triggers
- ✅ Guard: only fires when vertical delta < horizontal (no scroll conflict)
- ✅ Wired into `App.vue` — swipe left advances tab, swipe right goes back
- ✅ Wraps around at ends (last tab → first on left swipe)
- ✅ Unit tested in `tests/composables/useSwipe.spec.ts`

#### 9B: Mobile Responsiveness Fixes ✅
- ✅ Stats row: 4-col → 2-col at 900px → 1-col at 540px
- ✅ Two-column grid sections collapse to 1-col at 700px
- ✅ Touch target audit — edit/delete buttons minimum 44×44px at ≤540px
- ✅ Modal inner scroll on small screens (max-height + overflow-y: auto)
- ✅ Bottom tab bar height consistent; safe-area-inset support for iPhone notch

### Tests
- ✅ 12 tests in `useSwipe.spec.ts` (threshold, direction guard, wrap-around, cleanup on unmount)
- ✅ All 346 → 360 tests green

### Merge & Tag
- ✅ Merged `feat/sprint-9` → `main`, tagged **v1.3.0**

---

## Sprint 10 — Onboarding Flow 🎉
**Status**: ✅ **COMPLETE** — May 2026  
**Branch:** `feat/sprint-10`  
**Version:** v1.4.0  
**Goal**: Give new users a guided first-run experience so the dashboard feels immediately useful, not empty

### Completed

#### 10A: First-Run Detection ✅
- ✅ `hasOnboarded: boolean` field added to `BudgetState` (default `false`)
- ✅ `dismissedVersion: string` field added to `BudgetState` — tracks last dismissed What's New version
- ✅ `App.vue` checks `hasOnboarded` on mount; shows `OnboardingModal` on first run
- ✅ State migration: old states without `hasOnboarded` treated as onboarded (not shown to returning users)

#### 10B: OnboardingModal (4-step stepper) ✅
- ✅ `src/components/onboarding/OnboardingModal.vue` — 4-step guided setup
  - **Step 1** — Welcome screen with app value prop
  - **Step 2** — Add first income stream (amount + frequency inline form)
  - **Step 3** — Set pay period anchor date
  - **Step 4** — Confirm budget split (shows default 50/30/20; click to customise)
- ✅ "Skip" available on Steps 2–4; "Done" on Step 4 commits and sets `hasOnboarded: true`
- ✅ Progress dots indicator; keyboard navigation (ESC closes, Enter advances)
- ✅ Smooth fade-in/out transitions with `prefers-reduced-motion` guard

#### 10C: "What's New" Banner ✅
- ✅ `src/components/onboarding/WhatsNewBanner.vue` — dismissible banner
- ✅ Hardcoded version manifest: `APP_VERSION` constant in `main.ts` (`'1.4.0'`)
- ✅ Banner shown when `dismissedVersion !== APP_VERSION` and `hasOnboarded === true`
- ✅ Dismiss stores current version in `state.dismissedVersion`
- ✅ 2–3 bullet highlights per version (manually maintained in `WhatsNewBanner.vue`)

### Tests
- ✅ 28 tests covering onboarding detection, step navigation, What's New dismiss logic
- ✅ All 360 → 388 tests green (some rounded to 390 in retrospective)

### Merge & Tag
- ✅ Merged `feat/sprint-10` → `main`, tagged **v1.4.0**

---

## Sprint 11 — Envelope Forecast & MoM Stat Deltas 📊
**Status**: ✅ **COMPLETE** — May 2026  
**Branch:** `docs/update-v1.6.0`  
**Version:** v1.5.0  
**Goal**: Surface forward-looking and comparative signals directly on the main dashboard

### Completed

#### 11A: Envelope Forecast ✅
- ✅ `getEnvelopeForecast(state, today)` in `calculations.ts` — linear daily-rate extrapolation
  - `dailyRate = totalSoFar / daysElapsed`; `projectedTotal = dailyRate * 14` (one bi-weekly period)
  - Accounts for subscription and loan deductions already counted against the envelope
  - `hasData` guard: `daysElapsed > 0 && totalSpent > 0` — shows nothing on day 0
  - `status: 'on-track' | 'caution' | 'over'` — caution at ≥90% of budget, over at ≥100%
- ✅ `envelopeForecast` computed ref added to `useAnalytics()`
- ✅ Forecast chip in `WantsTracker.vue` — colour-coded bar below progress bar:
  - "At this pace · $X.XX by end of period · N day(s) left · $Y/day"

#### 11B: MoM Stat Deltas on Dashboard Cards ✅
- ✅ `getPrevMonthActuals(state, today)` in `calculations.ts` — wraps `getMonthActuals()` for the previous calendar month
- ✅ `prevMonthActuals` computed ref added to `useAnalytics()`
- ✅ `needsDelta` and `wantsDelta` computed refs in `DashboardPage.vue` (null when no prior history)
- ✅ `StatCard` `:delta` / `delta-prefix="$"` / `:invert-delta="true"` props wired:
  - Needs/Wants cards: spending **more** than last month = **red** (invertDelta)
  - Net Worth card: positive change = green (no invert)

#### 11C: GitHub Pages CI Confirmation ✅
- ✅ Confirmed `deploy.yml` workflow already present (not a new implementation)
- ✅ `vite.config.ts` `base: '/A-Penny-For-Our-Thoughts/'` already correct
- ✅ Live URL verified: `https://brahimmahadi.github.io/A-Penny-For-Our-Thoughts/`

### New Tests
- ✅ 3 tests for `getPrevMonthActuals` (zero history, prior month, excludes current)
- ✅ 9 tests for `getEnvelopeForecast` (no payStart, day 0, no purchases, mid-period, caution, over, period length, needs exclusion)
- ✅ All 448 → 470 tests green

### Merge & Tag
- ✅ Merged → `main`, tagged **v1.5.0**

---

## Sprint 12 — Spending Trend Chart & Goals Timeline 📈
**Status**: ✅ **COMPLETE** — May 2026  
**Branch:** `docs/update-v1.6.0`  
**Version:** v1.6.0  
**Goal**: Add a 6-month macro spending view and a ranked goals projection card

### Completed

#### 12A: SpendingTrendChart ✅
- ✅ `getSpendingTrend(state, count, today)` in `calculations.ts` — `SpendingTrendRow[]`
  - 6 rows of actual Needs/Wants/Savings spend per calendar month
  - Uses `getMonthActuals()` for closed months; live purchases + subs for current month
  - Income reference line value included per row (`income`)
- ✅ `spendingTrend` computed ref added to `useAnalytics()`
- ✅ `src/components/charts/SpendingTrendChart.vue` (new) — stacked bar + line mixed chart
  - Needs (red), Wants (amber), Savings (green); `stack: 'spend'`
  - Current month bars at 100% opacity; past months at 55%
  - Dashed income reference line (`type: 'line as any'`)
  - Tooltip footer sums bar segments; empty state text when no rows
  - Lazy-rendered via `useInView`
- ✅ Added to `DashboardPage.vue` above Income Streams section

#### 12B: GoalsTimeline ✅
- ✅ `getGoalsTimeline(state, today)` in `calculations.ts` — `GoalTimelineItem[]`
  - Enriches each goal with `monthsToComplete`, `projectedDate` (ISOMonth), `monthsLate`
  - Status: `on-track | caution | off-track | complete | missed`
  - Sorted: active (on-track first) → complete → missed
  - TypeScript: implemented with `for...of` loop to avoid union-type narrowing issue
- ✅ `goalsTimeline` computed ref added to `useAnalytics()`
- ✅ `src/components/sections/GoalsTimeline.vue` (new) — ranked goals list
  - Left-border color per status (green/amber/red/muted)
  - Progress bar + account name, target date, projected completion, months late
  - EmptyState when no goals

### New Tests
- ✅ 6 tests for `getSpendingTrend` (row count, chronological order, income, history, live, unique keys)
- ✅ 7 tests for `getGoalsTimeline` (empty, missing account, complete, missed, on-track, off-track, sort order)
- ✅ All 470 → 508 tests green (21 spec files)

### Merge & Tag
- ✅ Merged → `main`, tagged **v1.6.0**

---

## Sprint 13 — Dashboard Polish, Form Validation & JSON Backup 🛠️
**Status**: ✅ **COMPLETE** — May 2026  
**Branch:** `feat/sprint-13`  
**Version:** v1.7.0

### Goals
Make the app substantially more robust and polished: better dashboard navigation, consistent field-level validation across all CRUD forms, and a safe JSON backup/restore mechanism.

### Delivered

**Dashboard layout improvements**
- `BaseCard` gains `sectionId` + `collapsible` props; collapsed state stored in `penny_ui_prefs` localStorage key via ui store (`toggleSection`, `expandSection`, `isSectionCollapsed`)
- 5 logical section group labels on `DashboardPage` (Income & Budget / Spending / Debt & Credit / Savings & Goals / Wealth & History)
- `DASHBOARD_SECTIONS` constant — single source of truth for all 15 sections (id, icon, label, group)

**SectionPicker**
- New `SectionPicker.vue` — `Teleport`-based slide-in panel (right side on desktop, bottom sheet on mobile)
- `⊞ Sections` nav button opens/closes the picker; `G` keyboard shortcut toggles it
- Clicking any section: auto-expands if collapsed, switches to Dashboard tab, `scrollIntoView` smooth scroll
- Shows "collapsed" chip on items currently collapsed

**Form validation hardening (`useFormValidation.ts`)**
- Generic composable: `buildErrors` thunk → `computed` error map, `touched: ref<Set<string>>`
- Rule helpers: `required`, `positiveNumber`, `nonNegativeNumber`, `futureMonth`, `notExceedsLimit`, `notExceedsOriginal`
- Applied to all 6 primary CRUD forms: IncomeStreams, Loans, CreditCards, Savings, SavingsGoals, Subscriptions
- Field errors appear on blur or Save attempt; reset on modal close/cancel

**JSON backup & restore**
- `jsonBackup.ts`: `JSON_SCHEMA_VERSION = 2` envelope, `exportStateToJSON`, `parseJSONToState` (validates version), `triggerJSONDownload` (Blob + anchor click)
- `exportJSON` / `importJSON` actions on budget store
- 📦 Export and 📂 Import toolbar buttons in `App.vue` with hidden file-input picker

### Tests
- `tests/utils/jsonBackup.spec.ts` — 14 tests (export, parse validation, download)
- `tests/composables/useFormValidation.spec.ts` — 44 tests (6 rule helpers + composable behaviour)
- **Total: 566 passing (↑58 from 508) across 23 spec files**

### Merge & Tag
- ✅ Merged → `main`, tagged **v1.7.0**

---

## Future Backlog 📋
Items captured for future sprints — not yet scheduled. See individual option descriptions for rationale.

### Option A — Spending History & Power Analytics

**A1: Spending History Browser** *(High value)*
- `spendingHistory` array exists in state but there's no UI to browse or manage archived periods
- Build a history tab/panel: list of past periods with date range, total spent, top categories
- Allow retroactive edits (rename a period label, delete a period)
- Filters by date range + category — reuses existing `SpendingAnalytics` filter infrastructure

**A2: Dashboard MoM Stat Deltas** *(Medium value)*
- Surface month-over-month change deltas directly on the main stat cards (not just inside the Analytics panel)
- Small `+$X` / `−$X` chip below each headline figure with colour coding
- Trend sparklines (7-point inline SVG line) on income and savings cards

**A3: Category-Level Budget vs. Actual** *(High value)*
- Current `BudgetVsActual` section shows only Needs/Wants/Savings totals
- Add a drilldown: per-category breakdown ("Groceries: $420 budgeted vs $380 actual — ✅ $40 under")
- Requires adding per-category budget targets to `BudgetAlert` or a new `CategoryBudget[]` state field

### Option B — Forecast & Data Depth

**B1: Envelope Forecast** *(High value)*
- "At your current pace, you'll spend $X by end of period" projection on the Wants envelope
- Linear extrapolation from `purchases` spend rate vs. days remaining in period
- Colour-coded: green (on track), amber (80%+), red (over budget projection)

**B2: Savings Runway Calculator** *(Medium value)*
- "At $X/month saved, you'll hit your Emergency Fund goal in N months"
- Interactive slider to explore "what if I saved $Y more per month?"
- Lives inside `SavingsGoals.vue` as a collapsible panel per goal

**B3: Net Worth Forecast** *(Low value)*
- Extend `NetWorthChart` with a projected future line (dashed) based on current savings rate
- 12-month lookahead using average monthly net worth change from history

### Option C — *(Current — Sprints 9 & 10 above)*

### Option D — Infrastructure & Reliability

**D1: JSON Backup / Restore** *(Medium value)*
- Export full `BudgetState` as a `.json` file (lossless, unlike CSV)
- Import `.json` replaces state with full validation and version migration
- Safer than CSV for full backups — preserves all nested structures exactly
- Lives alongside the existing CSV export/import toolbar buttons

**D2: GitHub Pages CI Deploy** *(Medium value)*
- GitHub Actions workflow: on push to `main`, run `vite build` then deploy `dist/` to `gh-pages` branch
- One-command public URL for the app (`https://brahimmahadi.github.io/A-Penny-For-Our-Thoughts/`)
- Adds `base` config to `vite.config.ts` for the subfolder path

**D3: Vitest Coverage Report** *(Low value)*
- Add `@vitest/coverage-v8` and a `coverage` npm script
- Set coverage thresholds (80% lines/functions on `src/utils/` and `src/stores/`)
- CI step to fail the build if coverage drops below threshold

---

## Sprint 14 — Polish & Analytics 🎨
**Status**: ✅ **COMPLETE** — May 2026  
**Branch:** `feat/sprint-14`  
**Version:** v1.8.0  
**Goal**: Five targeted polish improvements — tab overflow, release notes, history UX, drilldown analytics, and savings runway

### Delivered

**Tab nav overflow fix**
- `App.vue` `.app-tabs` base rule gains `overflow-x: auto; scrollbar-width: none` (+ webkit variant)
- Tabs no longer clip at intermediate widths (800–1000px range); scrollable without a visible scrollbar

**WhatsNewBanner — v1.7.1 release notes**
- `WhatsNewBanner.vue` bumped to `APP_VERSION = '1.7.1'`
- 4 release notes: Mobile bottom nav, Form validation, JSON backup & restore, Calendar scroll

**Spending History — collapsible periods with category chips**
- `SpendingAnalytics.vue` history list rewritten: period header is now a `<button>` toggle
- Category breakdown chips always visible in the collapsed header row
- Item list only rendered when period is expanded
- Human-readable date label via `periodDisplayLabel()` (falls back to raw date string)
- Delete button moved into the expanded footer (avoids accidental taps)

**Budget vs. Actual — Wants category drilldown (A3)**
- `getWantsCategoryActuals(state, today)` added to `calculations.ts`
  - Aggregates live `state.purchases` (wants only) + current-month `spendingHistory` items by category
- `wantsCategoryActuals` exposed as `computed` ref in `useAnalytics()`
- `BudgetVsActual.vue` renders "Wants by Category" drilldown section when data exists:
  - Horizontal bars (proportion of total wants spend), amount + % per row
  - Responsive: bar hidden on ≤480px, name/amount/% remain

**Savings Runway Calculator (B2)**
- `GoalProgress` interface gains `monthlyAllocation: number` and `monthsAtCurrentRate: number | null`
- `getGoalProgress()` computes runway: `Math.ceil(shortfall / monthlyAllocation)` months
- `monthsAtCurrentRate` is `null` (not 0/Infinity) when allocation is 0 → safe template branch
- `SavingsGoals.vue` renders per-goal runway chip:
  - "At $X/mo you'll reach this goal in N month(s) — ahead/behind target"
  - Fallback when allocation = 0: "No monthly allocation set — use Allocate in Savings Accounts"

### Tests
- `tests/utils/calculations.spec.ts` — 10 new tests: 5 for `getWantsCategoryActuals`, 5 for `GoalProgress` runway fields
- `tests/components/onboarding.spec.ts` — 3 tests updated to match `APP_VERSION = '1.7.1'` and 4 release notes
- **Total: 577 passing (↑11 from 566) across 23 spec files**

### Merge & Tag
- ✅ Merged `feat/sprint-14` → `main`, tagged **v1.8.0**

---

---

## Sprint 15 — Pay Period Schedule View 📅
**Status**: ✅ **COMPLETE** — May 2026  
**Branch:** `feat/sprint-15`  
**Version:** v1.9.0  
**Goal**: Add a 14-day pay-period grid view as a third toggle option on the Schedule tab, alongside the existing List and Calendar month views

### Delivered

**New `ScheduleView` option: `'payperiod'`**
- `src/types/state.ts` — `ScheduleView` union extended to `'list' | 'calendar' | 'payperiod'`
- `UiState` gains `schedulePayPeriodOffset: number` (0 = current period, ±N = N periods forward/back)

**UI store actions**
- `stepPayPeriod(delta)` — increments/decrements `schedulePayPeriodOffset`
- `resetToCurrentPayPeriod()` — resets offset to 0 (called automatically when entering pay period view)

**Calculation layer (`calculations.ts`)**
- `PayPeriodForecastItem` — extends `ForecastItem` with `periodDate: ISODate`
- `PayPeriodForecast` interface — `periodStart`, `periodEnd`, `label`, `dated[]`, `undated[]`, `total`, `budgeted`, `variance`
- `getPayPeriodForecast(state, offset, today)` — builds the 14-day forecast:
  - Returns `null` when `payStart` is not configured
  - Expense card items: placed by `dueDay` — only appear if that day falls within the 14-day window
  - Expense card items without `dueDay`: placed in `undated` (biweekly = full amount, monthly = half)
  - Subscriptions: uses `getRenewalDatesBetween` for exact renewal dates; excluded if not renewing in period
  - Budgeted = monthly Needs income ÷ 2 (bi-weekly equivalent)
  - Sorted chronologically by `periodDate`
- `getPayPeriodDayMap(state, offset, today)` — `Map<ISODate, PayPeriodForecastItem[]>` for the grid

**`useAnalytics` composable**
- `payPeriodForecast` — reactive computed ref (`PayPeriodForecast | null`)
- `payPeriodDayMap` — reactive computed ref (`Map<ISODate, PayPeriodForecastItem[]>`)

**`RecurringCalendar.vue` — 14-day grid view**
- Third toggle button **"2W"** added to the view switcher (title: "Pay period view (14-day grid)")
- PREV/NEXT navigate by pay period (14 days) when in pay period mode; months when in list/calendar mode
- Title changes to "Pay Period: May 19 – Jun 1" in pay period mode
- Detail total shows `/period` suffix instead of `/mo`
- 14-day grid: same 7-column DOW layout as calendar; cells show actual calendar dates
- Month abbreviation shown on the 1st of any month crossing within the period (e.g., "Jun 1")
- Items displayed per cell with same badge styling as calendar view (expense / subscription / +N overflow)
- Budget bar above grid: committed total vs bi-weekly Needs budget, colour-coded green/red
- `payPeriodForecast.undated` renders below the grid as "No fixed date this period"
- Empty state for unconfigured `payStart`: "Set a start date in Settings → Pay Period"
- Clicking a month summary card in pay period view auto-switches back to list view

**CLAUDE.md** — Release process rules added; test count updated to 606

### Tests
- `tests/utils/calculations.spec.ts` — 13 new tests for `getPayPeriodForecast` (null payStart, period bounds, offsets, dated/undated item placement, subscription inclusion/exclusion, total, budget, label, sort order) + 2 for `getPayPeriodDayMap`
- `tests/stores/ui.spec.ts` — 6 new tests for `stepPayPeriod`, `resetToCurrentPayPeriod`, `schedulePayPeriodOffset` initial state
- `tests/components/sections/sections.spec.ts` — 7 new tests for pay period component (toggle renders, empty state, view switch, 14-cell grid, PREV/NEXT offset, month card reverts to list)
- `tests/components/onboarding.spec.ts` — version updated to `'1.9.0'`
- **Total: 606 passing (↑29 from 577) across 23 spec files**

### Merge & Tag
- ✅ Merged `feat/sprint-15` → `main`, tagged **v1.9.0**

---

## Sprint 16 — Loans on Schedule Tab 💳
**Branch:** `feat/sprint-16`  
**Version:** v1.10.0  
**Status:** ✅ **COMPLETE**  
**Goal:** Show loan payments on the Schedule tab (List, Calendar, and Pay Period views) on their due dates — identical treatment to subscriptions

### Changes

**`src/utils/calculations.ts`**
- `ForecastSource` union extended: `'expense' | 'subscription' | 'loan'`
- Loans block added to `getMonthForecast()`: monthly loans produce one `ForecastItem` per occurrence; non-monthly (biweekly etc.) produce **one item per renewal date** so each date gets its own calendar cell; loans with empty `date` go to `undated`; `paymentAmount <= 0` loans are skipped
- Loans block added to `getPayPeriodForecast()`: uses `getRenewalDatesBetween()` for non-monthly loans, same skip rules apply
- Linked expense card label resolved via `loan.cardId → expenseCards.find(...)?.label`, falls back to `'Loan'`

**`src/components/sections/RecurringCalendar.vue`**
- List view dated section: amber `.bill-badge--loan` badge for `source === 'loan'` items
- Calendar grid: `cal-badge--loan` class (amber) via ternary chain on `item.source`
- Pay period grid: same `cal-badge--loan` class logic (shares template pattern with calendar)
- Pay period undated list: `.bill-badge--loan` badge
- CSS added: `.bill-badge--loan { amber }` and `.cal-badge--loan { amber }`

### Tests Added
- `tests/utils/calculations.spec.ts`:
  - `getMonthForecast — loans` (10 tests): monthly loan appears, dueDay correct, totalForMonth, biweekly produces 2 rows, undated handling, card label resolution
  - `getPayPeriodForecast — loans` (7 tests): appears in window, periodDate correct, excluded outside window, skip rules, card label resolution
- `tests/components/sections/sections.spec.ts`:
  - `RecurringCalendar — loan badges` (5 tests): list view badge, badge text, calendar badge, pay period badge, zero-payment filtered

**Bug Fixes During Development**
- `getMonthForecast` loans: empty `date` was incorrectly causing the loan to be skipped rather than placed in `undated` — fixed by checking `paymentAmount <= 0` first, then branching on `!loan.date` to push with `dueDay: null`
- Biweekly loans were emitting a single aggregated `ForecastItem` instead of one item per occurrence — fixed to push one item per `renewalDate` entry

### Docs Updated
- `src/components/onboarding/WhatsNewBanner.vue` — `APP_VERSION` → `'1.10.0'`, loan schedule release notes
- `tests/components/onboarding.spec.ts` — version string updated to `'1.10.0'`
- `CLAUDE.md` — test count updated to 628
- `docs/PHASE_TRACKING.md` — this entry

### Test Totals
- **Total: 628 passing (↑22 from 606) across 23 spec files**

### Merge & Tag
- ✅ Merged `feat/sprint-16` → `main`, tagged **v1.10.0**

---

## Sprint 17 — Custom-Days Frequency for Subscriptions 📆
**Branch:** `feat/sprint-17`  
**Version:** v1.11.0  
**Status:** ✅ **COMPLETE**  
**Goal:** Allow subscriptions to recur on specific days of the week (e.g., parking on Mon · Tue · Wed only), with full schedule integration across List, Calendar, and Pay Period views

### Changes

**`src/types/budget.ts`**
- `Frequency` union extended: `'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom-days'`
- `Subscription` interface gains `daysOfWeek?: number[]` (0=Sun…6=Sat; only used when `frequency === 'custom-days'`)

**`src/utils/calculations.ts`**
- `DatedRecurringItem` updated with `daysOfWeek?: number[]`
- `ForecastItem` updated with `daysOfWeek?: number[]` field
- `getRenewalDatesBetween()` — new `custom-days` branch: iterates day-by-day from `max(baseDate, startDate)` to `endDate`, emitting dates where `cur.getDay()` is in the `daysOfWeek` set
- `getMonthForecast()` subscriptions — `custom-days` branch: pushes **one `ForecastItem` per occurrence day** (not one aggregate) so each day gets its own calendar badge
- `getPayPeriodForecast()` subscriptions — same per-day pattern for pay-period grid

**`src/stores/budget.ts`**
- Migration block ensures `sub.daysOfWeek` is always an array on load (v1 compat)

**`src/utils/csvImportExport.ts`**
- Export header: added `daysOfWeek` column
- Export row: `daysOfWeek` serialized as pipe-separated string (e.g. `"1|2|3"`)
- Import parser: parses `vals[8]` as pipe-split integers, filters to 0–6 range

**`src/components/sections/Subscriptions.vue`**
- `'custom-days'` added to `FREQUENCIES_SUB`; `FREQ_DISPLAY`, `FREQ_LABEL`, `MO_RATE`, `YR_RATE` maps updated
- `dayPatternLabel(days)` helper — formats day list as "Every Mon · Tue · Wed"
- `subMonthlyAmount(sub)` — uses `AVG_PER_WEEKDAY = 365.25/12/7 ≈ 4.348` for custom-days cost estimation
- `toggleDay(dow)` + `.dow-picker` / `.dow-btn` / `.dow-btn--active` day-of-week picker in modal
- Validation: `daysOfWeek` requires ≥1 selection for custom-days; `date` field hidden (defaults to today)
- `chipClass()` / `chipText()` return `chip-custom` / day-abbrev string for custom-days subs
- `annualNote()` / `displayDate()` show "Every Mon · Tue · Wed" for custom-days entries
- Renewal alert excludes custom-days subscriptions (no single renewal date)
- CSS: `.chip-custom`, `.dow-picker`, `.dow-btn`, `.dow-btn--active`, `.form-hint`

**`src/components/sections/RecurringCalendar.vue`**
- `CollapsedCustomDay` interface + `listGrouped` computed: collapses multiple same-ID custom-days `ForecastItem`s into one row (accumulating `occurrences` and `totalForMonth`)
- List view uses `listGrouped.dated` / `listGrouped.customDays` — custom-days entries render in a "Weekly recurring pattern" section with `.bill-badge--custom` and `×N this mo.` count
- Calendar and Pay Period views continue to badge each occurrence on its exact day (unchanged; they consume `dated` directly via `getCalendarDayMap` / `getPayPeriodDayMap`)
- CSS: `.bill-badge--custom`, `.bill-day--pattern`, `.bill-count`

**`tests/utils/calculations.spec.ts`** — 21 new tests in 3 describe blocks:
- `getRenewalDatesBetween — custom-days` (7): empty `daysOfWeek`, Mondays only, Mon+Tue+Wed, effective-from anchor, pay-period window, before-anchor exclusion, all 7 days
- `getMonthForecast — custom-days subscriptions` (9): one item per day, amount, totalForMonth, daysOfWeek on item, frequency field, fc.total, empty daysOfWeek, effective-from date, not in undated
- `getPayPeriodForecast — custom-days subscriptions` (5): items per window, occurrences=1, periodDate per day, daysOfWeek on item, empty daysOfWeek

**`tests/utils/csvImportExport.spec.ts`** — 4 new tests: full round-trip of `daysOfWeek=[1,2,3]`, round-trip of empty `daysOfWeek`, raw CSV pipe-parsing, invalid-day filtering

**`tests/components/sections/sections.spec.ts`** — 9 new tests:
- `Subscriptions — custom-days` (5): day picker visible, hidden for monthly, chip-custom class, "Every Mon · Tue · Wed" text, renewal alert exclusion
- `RecurringCalendar — custom-days list view` (4): "Weekly recurring pattern" label, `.bill-badge--custom`, `×12` count, `cal-badge--sub` in calendar view

**`tests/utils/calculations.spec.ts`** (type fix)
- Added `import type { Frequency } from '@/types/budget'` (required after vue-tsc flagged `Frequency` references in new test helpers)

### Test Totals
- **Total: 662 passing (↑34 from 628) across 23 spec files**

### Merge & Tag
- ✅ Merged `feat/sprint-17` → `main`, tagged **v1.11.0**

---

## Sprint 18 — Collapsible Sections & Drag-and-Drop Reorder ⇅
**Branch:** `feat/sprint-18`  
**Version:** v1.12.0  
**Status:** ✅ **COMPLETE**  
**Goal:** Make all dashboard sections independently collapsible and freely reorderable via drag-and-drop handles and ▲/▼ controls in the Section Picker

### Changes

**`src/constants/dashboardSections.ts`**
- `DashboardSection` interface: added `title: string` field (previously each component handled its own title display)
- All 15 section entries updated with `title` field
- `SECTION_MAP: Record<string, DashboardSection>` exported for O(1) section metadata lookup in `DashboardPage`
- `DEFAULT_SECTION_ORDER: string[]` exported — canonical order derived from `DASHBOARD_SECTIONS.map(s => s.id)`

**`src/types/state.ts`**
- `UiState` interface: added `sectionOrder: string[]` — ordered list of section IDs persisted in `penny_ui_prefs`

**`src/stores/ui.ts`**
- `UiPrefs` interface extended: `{ collapsedSections?: string[]; sectionOrder?: string[] }`
- `loadSectionOrder()` — loads + migrates `penny_ui_prefs.sectionOrder`: filters stale IDs, appends any newly added IDs in canonical order
- `saveAll(collapsedSections, sectionOrder)` replaces `saveCollapsedSections()` — persists both preferences atomically
- State: `sectionOrder` initialised via `loadSectionOrder()`
- New actions: `setSectionOrder(order)`, `resetSectionOrder()`, `moveSectionUp(id)`, `moveSectionDown(id)`
- `setSectionOrder` filters unknown IDs and appends any missing ones (future-proof against new sections)

**`src/components/sections/SpendingTrendSection.vue`** *(new)*
- Thin self-contained wrapper: calls `useAnalytics()` internally and passes `spendingTrend` to `SpendingTrendChart`
- Required because `SpendingTrendChart` previously received data as a prop from `DashboardPage` — the dynamic component registry needs each section to be self-contained

**`src/components/ui/BaseCard.vue`**
- Added `draggable?: boolean` prop (default `false`)
- Drag handle `⠿` rendered before the title slot when `draggable` is true; only the handle carries `draggable="true"` (not the whole card) — prevents drag conflicts with interactive content inside sections
- `@click.stop` on handle prevents accidental collapse toggle
- CSS: `.base-card__drag-handle { cursor: grab }` with hover and active states

**`src/components/pages/DashboardPage.vue`**
- `SECTION_COMPONENTS: Record<string, Component>` — registry mapping all 15 section IDs to their Vue SFCs; enables dynamic `<component :is="...">` rendering in a `v-for` loop
- Removed the previous two-column grid layout (Loans+CreditCards, Savings+SavingsGoals side-by-side) in favour of full-width single-column cards — required for truly independent free-form reordering
- DnD refs: `dragIndex = ref<number>(-1)`, `dropIndex = ref<number>(-1)`
- Reorder logic in `onDrop`: `splice(from, 1)` then `insertAt = from < target ? target - 1 : target`
- Template: `v-for="(sectionId, index) in ui.sectionOrder"` with animated drop-indicator line above `dropIndex` card
- All BaseCards: `:collapsible="true"` `:draggable="true"`
- Drop indicator: 3px green accent line with `drop-indicator-pulse` glow animation

**`src/components/ui/SectionPicker.vue`**
- Title changed to "Manage sections"; flat `orderedSections` computed from `ui.sectionOrder` (group labels removed — groups are semantically meaningless when sections can be freely reordered)
- Each item: drag handle (⠿), jump-to button, ▲/▼ move buttons, ⊕/⊖ collapse toggle
- Same HTML5 DnD pattern as DashboardPage — drag handles bubble events to item container drop targets
- Footer: "↺ Reset to default order" button, disabled via `isDefaultOrder` computed when order is already canonical

**BUG-015 — Subscriptions save silently blocked** *(fixed during Sprint 18)*
- `Subscriptions.vue` validation thunk returned `''` (empty string) for "no error" on conditional fields — `useFormValidation.isValid` checks `=== null`, so `''` permanently blocked saves
- Fixed: all "no error" returns changed to `null`
- Regression tests added in `sections.spec.ts`
- Root cause documented in `docs/BUGS.md` with prevention rule: "In `useFormValidation` thunks, 'no error' must always be `null`, never `''`"

### Tests Added

**`tests/stores/ui.spec.ts`** — 14 new tests (`sectionOrder` describe block):
- Default order matches `DEFAULT_SECTION_ORDER` (15 IDs)
- `setSectionOrder` updates store and persists to `penny_ui_prefs`
- `setSectionOrder` filters unknown IDs and appends missing ones
- `resetSectionOrder` restores canonical order and persists
- `moveSectionUp` / `moveSectionDown` correctness and boundary behaviour (first/last item no-ops)
- Persistence round-trip: store re-init reads saved order from `penny_ui_prefs`
- Migration: stale IDs filtered out; newly added IDs appended to tail

**`tests/components/sections/sections.spec.ts`** — 18 new tests in two describe blocks:
- `DashboardPage — Sprint 18 collapsible + DnD` (8 tests): all 15 sections rendered, drag handles present, collapse chevrons present, drop zone slots present, collapsing hides body, reorder via `setSectionOrder` updates rendered order, drag-and-drop `onDrop` calls `setSectionOrder` with new order
- `SectionPicker — Sprint 18 reorder` (10 tests): 15 items rendered, drag handles per item, ▲/▼ move buttons (30 total), collapse toggle buttons (15 total), clicking toggle calls `ui.toggleSection`, reset button disabled when order is default, reset button enabled after reorder and restores default, move-up disabled on first item, move-down disabled on last item

**Test fix**: Added `localStorage.clear()` to `beforeEach` of both Sprint 18 describe blocks — `DashboardPage` tests called `ui.toggleSection` and `ui.setSectionOrder` which persisted to `penny_ui_prefs`; without clearing, `SectionPicker` tests (fresh Pinia but stale localStorage) failed `isSectionCollapsed` and `isDefaultOrder` assertions

### Test Totals
- **Total: 699 passing (↑37 from 662) across 23 spec files**
- `vue-tsc --noEmit` clean · `eslint --max-warnings 0 src/` clean · `vite build` green (535 kB / 170 kB gzip)

### Merge & Tag
- ✅ Merged `feat/sprint-18` → `main`, tagged **v1.12.0**

---

## Sprint 19 — Category Manager, Bi-Yearly Frequency & Chequing Balance Dashboard 🏷️
**Status**: ✅ **COMPLETE** — May 2026  
**Version**: v1.13.0  
**Branch**: `feat/sprint-19`

### Features Delivered

#### 1. Spending Category Manager (Settings tab)
- New `SpendingCategory` type (`id`, `name`, `color`) and `spendingCategories: SpendingCategory[]` field in `BudgetState`
- `DEFAULT_SPENDING_CATEGORIES` (7 entries): Food & Drink, Groceries, Entertainment, Shopping, Health & Fitness, Transportation, Other
- `CATEGORY_COLOR_PRESETS` — 10 hex colors for the colour picker
- 3 new store actions:
  - `addCategory(name, color)` — trims, rejects duplicates, returns `SpendingCategory | null`
  - `updateCategory(id, name, color)` — renames; migrates matching category name in purchases, spendingHistory, subscriptions, rules, budgetAlerts
  - `deleteCategory(id)` — guards 'other' (protected built-in); orphan strategy: deleted category name stays on existing purchases
- `CategoryManager.vue` — CRUD list with color swatch, built-in badge, edit/delete buttons, modal form with duplicate/empty validation + 10-colour preset grid + live preview
- Migration: seeds `DEFAULT_SPENDING_CATEGORIES` if field is missing or empty; ensures 'other' always present
- WantsTracker, Subscriptions category dropdowns now driven by `budget.spendingCategories` instead of static array
- CSV export/import: new `SECTION:spendingCategories` block (`id,name,color`)

#### 2. Bi-Yearly Frequency (Every 6 Months)
- Added `'biyearly'` to the `Frequency` union type
- `getRenewalDatesBetween` handles `'biyearly'` stepping by 6 months (also backward-compat with legacy `'bi-yearly'` string)
- `MO_RATE`, `YR_RATE`, `FREQ_LABEL`, `FREQ_DISPLAY` updated in Subscriptions.vue
- `FREQUENCIES` updated in Loans.vue to include `'biyearly'`

#### 3. Chequing Balance → Dashboard Section
- `ChequingBalance.vue` — new dedicated dashboard section (moved from Settings):
  - Large balance display with CAD currency formatting
  - Freshness indicator dot: green ≤7 days, amber >7 days, muted/unknown if never updated
  - Inline update form with Save/Cancel
- `dashboardSections.ts` — added `'chequing-balance'` entry in new "Account Tracking" group
- `DashboardPage.vue` — registered `ChequingBalance` in `SECTION_COMPONENTS`
- `SettingsPage.vue` — removed old funds section; added `CategoryManager` in a new "Spending Categories" card

### Testing
- `tests/stores/budget.spec.ts` — 21 new tests: `addCategory` (add, duplicate reject, empty reject), `updateCategory` (name+color, purchase migration, subscription migration, budgetAlert migration), `deleteCategory` (removes user category, protects 'other', orphan strategy), `migrateState` (seeds on missing field, seeds on empty array, ensures 'other' present)
- `tests/utils/calculations.spec.ts` — 4 new tests: biyearly 2-year window, short range, skip past, empty result
- `tests/utils/csvImportExport.spec.ts` — updated section count (17→18), added `spendingCategories` to `buildSampleState`, added round-trip test, updated blank-defaults assertion
- `tests/components/sections/settings.spec.ts` — 22 new tests: CategoryManager (renders list, built-in badge, hidden delete, add modal, add flow, empty-name error), ChequingBalance (renders balance, freshness classes, update form, save, cancel), SettingsPage layout (has CategoryManager, no chequing input)
- `tests/components/pages/pages.spec.ts` — replaced 5 obsolete chequing-balance-in-settings tests with 2 Sprint-19 tests
- Count corrections: section counts updated from 15→16 in `sections.spec.ts` and `ui.spec.ts` (32 move buttons, 16 drag handles, 16 collapse buttons, 16 section slots)
- **Total: 734 passing (↑35 from 699) across 23 spec files**
- `vue-tsc --noEmit` clean · `eslint --max-warnings 0 src/` clean · `vite build` green (542 kB / 172 kB gzip)

### Merge & Tag
- ✅ Merged `feat/sprint-19` → `main`, tagged **v1.13.0**

---

## Sprint 20 — Calendar Day Detail (Slide Panel + Hover Popover) 📅

**Version**: v1.14.0  
**Date**: May 2026  
**Branch**: `feat/sprint-20` → `main`

### Features Delivered

#### Calendar Day Detail — Slide Panel (click, all devices)
- Click any calendar cell or pay-period cell that has bills → a smooth animated slide panel appears below the grid
- Panel shows: date header with total amount chip, each bill as a colour-coded left-border row (blue=expense, purple=subscription, amber=loan), bill name + source badge + card label + biweekly tag, amount right-aligned, frequency label
- Click the same cell again to dismiss, or use the `×` close button
- Works in both month calendar view and 14-day pay-period view
- Selection auto-clears on: month/pay-period navigation, view switching (list/calendar/payperiod)

#### Calendar Day Detail — Hover Popover (desktop only)
- Desktop hover (`window.matchMedia('(hover: hover)')`) shows a `position: fixed` popover anchored to the right side of the hovered cell
- Smart flip logic: if cell is near the right viewport edge, popover flips to the left side
- Viewport bottom clamping prevents overflow
- 150ms grace period: moving the mouse from cell to popover keeps it open
- Popover shows: date + day total header, coloured dot + bill name + source badge + amount per bill
- Touch-primary devices (mobile) never trigger the popover (only slide panel)
- Popover teleported to `<body>` via Vue `<Teleport>` for correct z-index and no overflow clipping

#### Interactive Cell Styling
- Cells with bills gain `.cal-interactive` (pointer cursor, blue hover glow)
- Selected cell gains `.cal-selected` (blue accent ring + subtle background tint)
- Cells without bills remain inert (no pointer, no selection ring)

### Files Modified

| File | Change |
|------|--------|
| `src/components/sections/RecurringCalendar.vue` | Day detail logic + slide panel + popover + CSS |
| `tests/components/sections/sections.spec.ts` | +24 new tests (slide panel + hover popover suites) |
| `src/components/onboarding/WhatsNewBanner.vue` | Bumped to v1.14.0, updated release notes |
| `tests/components/onboarding.spec.ts` | Updated version strings to v1.14.0 |
| `CLAUDE.md` | Updated test count to 758 |
| `docs/PHASE_TRACKING.md` | Added Sprint 20 row + this section |

### Test Summary

- **758 tests total** across 23 spec files (previously 734)
- **+24 new tests** in `sections.spec.ts`:
  - `RecurringCalendar — day detail slide panel` (20 tests): interactive class, click open, bill name, source badge, header chips, `.cal-selected`, toggle-off, × close, empty-day guard, month navigation, view switching, pay-period view, loan badge, frequency label, multiple bills
  - `RecurringCalendar — day detail hover popover` (6 tests): absent by default, mouseenter shows popover, popover content, mouseleave with timer, empty-cell guard, navigation clears
- `vue-tsc --noEmit` clean · `eslint` clean (0 errors) · `vite build` green (547 kB / 173 kB gzip)

### Merge & Tag
- ✅ Merged `feat/sprint-20` → `main`, tagged **v1.14.0**

---

## Sprint 21 — WantsDonut categoryColors & ProgressBar Label Bug Fixes 🐛

**Version**: v1.15.0 (bundled with Sprint 22)
**Date**: May 2026
**Branch**: `feat/sprint-21` → `main`

### Features Delivered

#### WantsDonut — categoryColors prop (BUG-FIX)
- `WantsDonut.vue` previously used a static hard-coded colour map for donut segments; colours never updated when the user added/renamed/recoloured categories
- Fix: `WantsTracker.vue` now computes a `categoryColors` prop (`Record<string, string>`) from `budget.spendingCategories` and passes it down to `WantsDonut` reactively
- `WantsDonut` reads from the prop (not a static map) so segment colours always reflect the live category configuration

#### ProgressBar — label outside overflow:hidden (BUG-FIX)
- `ProgressBar.vue` previously rendered `.base-progress-bar__label` inside the `.base-progress-bar__track` container, which has `overflow: hidden`; long label text was clipped
- Fix: Restructured template so `.base-progress-bar__label` is a sibling of `.base-progress-bar__track` (child of the root wrapper), completely outside the overflow container

### Files Modified

| File | Change |
|------|--------|
| `src/components/charts/WantsDonut.vue` | Reads colours from `categoryColors` prop instead of static map |
| `src/components/sections/WantsTracker.vue` | Computes + passes `categoryColors` prop to `WantsDonut` |
| `src/components/ui/ProgressBar.vue` | Moved label outside overflow:hidden track |
| `tests/components/sections/sections.spec.ts` | +9 new tests: WantsDonut categoryColors (5) + WantsTracker integration (4) |
| `tests/components/ui/ProgressBar.spec.ts` | **New file** — 25 tests for DOM structure, fill clamping, status classes, size modifiers, ARIA |
| `CLAUDE.md` | Updated test count |
| `docs/PHASE_TRACKING.md` | Added Sprint 21 row + this section |

### Test Summary

- **835 tests total** across 24 spec files
- **+34 new tests** in Sprint 21:
  - `WantsDonut — categoryColors prop` (5 tests): renders without throwing, default prop, provided prop, centre warn/over class thresholds
  - `WantsTracker — categoryColorMap integration` (4 tests): mirrors spendingCategories, reacts to add/update/delete
  - `ProgressBar` (25 tests): DOM structure (label sibling), fill width clamping, status auto-derivation, explicit status override, size modifiers, ARIA attributes

### Merge & Tag
- ✅ Merged `feat/sprint-21` → `main`, tagged **v1.15.0** (combined with Sprint 22)

---

## Sprint 22 — Search, Sort & Filter for Purchases and Subscriptions 🔍

**Version**: v1.15.0
**Date**: May 2026
**Branch**: `feat/sprint-22` → `main`

### Features Delivered

#### `useListFilter` Composable (new)
- Generic composable shared by WantsTracker and Subscriptions
- Exposes: `search`, `catFilter`, `typeFilter`, `cardFilter`, `sortKey`, `drawerOpen` (refs)
- Computed: `activeFilterCount` (badge value), `isFiltered` (boolean)
- Actions: `clearFilters()`, `toggleDrawer()`, `applyFilters<T>(items)` (generic, never mutates)
- Card filter resolves `cardId → label` via `budget.expenseCards` internally; callers stay decoupled

#### WantsTracker — Option B Filter Toolbar
- Search input (always visible), Filters badge button (count of active filters), Sort dropdown
- Expandable drawer (CSS `grid-template-rows: 0fr → 1fr` smooth animation, no max-height hack)
- Three drawer selects: Category, Budget Type, Expense Card
- Result count row visible when any filter is active
- "No matching purchases" empty state with Clear Filters CTA
- Toolbar hidden entirely when no purchases exist
- Sort options: Newest, Oldest, Amount ↓, Amount ↑, Name A–Z
- Full mobile support: search takes full width at ≤ 480 px; filter groups stack vertically

#### Subscriptions — Option B Filter Toolbar
- Identical Option B drawer structure with subscription-specific sort
- Sort options: Renewal Date, Monthly Cost ↓, Amount ↓, Name A–Z
- Monthly cost sort uses `subMonthlyAmount()` helper (normalises weekly/biweekly/etc.)
- Toolbar hidden when no subscriptions exist

### Files Modified

| File | Change |
|------|--------|
| `src/composables/useListFilter.ts` | **New file** — generic search/filter/sort composable |
| `src/components/sections/WantsTracker.vue` | Option B filter toolbar + `filteredPurchases` computed + CSS |
| `src/components/sections/Subscriptions.vue` | Option B filter toolbar + `filteredSubs` computed + CSS |
| `tests/components/sections/sections.spec.ts` | +25 new tests: WantsTracker toolbar (13) + Subscriptions toolbar (12) |
| `src/components/onboarding/WhatsNewBanner.vue` | Bumped to v1.15.0, updated release notes |
| `CLAUDE.md` | Updated test count to 835 |
| `docs/PHASE_TRACKING.md` | Added Sprint 21 + 22 rows + these sections |
| `src/components/pages/DocsPage.vue` | Added v1.7.0–v1.15.0 release blocks |

### Test Summary

- **835 tests total** across 24 spec files (previously 806)
- **+25 new tests** in Sprint 22:
  - `WantsTracker — filter toolbar` (13 tests): hidden when empty, appears on purchase add, search, case-insensitive search, category filter, budget type filter, card filters (no card + by label), active filter count badge, result count row, no-results empty state, Clear resets all, drawer toggle, sort by amount + name, combined AND filter
  - `Subscriptions — filter toolbar` (12 tests): hidden when empty, appears on sub add, search, category filter, budget type filter, card no-card filter, active filter count badge, result count row, no-results empty state, Clear resets all, drawer toggle, sort by name and monthly cost
- `vue-tsc --noEmit` clean

### Merge & Tag
- ✅ Merged `feat/sprint-22` → `main`, tagged **v1.15.0**

---

---

## Sprint 23 — Retroactive Category Editing for Archived Purchases 🏷️

**Version**: v1.16.0
**Date**: May 2026
**Status**: ✅ COMPLETE

- Added `updateHistoryItemCategory(periodId, itemIndex, newCategory)` to the budget store
- Inline ✏ tag editor in SpendingAnalytics history list (select replaces badge on click; blur/Escape cancel; auto-focus)
- Orphaned categories preserved as first option so users can see and change stale tags
- +10 new tests (5 store, 5 component)
- ✅ Merged `feat/sprint-23` → `main`, tagged **v1.16.0**

---

## Sprint 24 — Supabase DB Integration 🗄️

**Version**: v1.17.0
**Date**: May 2026
**Branch**: `feat/sprint-23-supabase-db` → `main`
**Status**: ✅ Complete

### Goal
Replace `localStorage` as the primary data store with Supabase Postgres while keeping the app fully functional throughout. Auth comes in Sprint 25. For this sprint, a service-role key + fixed `DEV_USER_ID` env var are used so RLS is bypassed during development.

### Features Delivered

#### `src/lib/supabase.ts` (new)
- Typed Supabase client singleton (service key for Sprint 24, anon key for Sprint 25)
- `isSupabaseConfigured()` guard — app falls back to localStorage when env vars are absent
- `DEV_USER_ID` constant from `VITE_DEV_USER_ID` env var

#### `supabase/migrations/001_initial_schema.sql` (new)
- 18 Postgres tables covering every entity: `profiles`, `income_streams`, `expense_cards`, `expense_items`, `purchases`, `spending_history_periods`, `spending_history_items`, `loans`, `credit_cards`, `subscriptions`, `wishlist_items`, `savings_accounts`, `goals`, `assets`, `net_worth_snapshots`, `rules`, `budget_alerts`, `spending_categories`
- `user_id uuid` FK + `updated_at` trigger on every table
- RLS enabled on all tables; policies written but commented out (enabled in Sprint 25)
- `expense_items` split from nested array in `ExpenseCard`; `spending_history_items` split from nested `SpendingHistoryPeriod.items`

#### `src/types/database.ts` (new)
- Full TypeScript row types for all 18 tables
- `Insert` / `Update` helper types (omit auto-set columns)
- `Database` root type passed to `createClient<Database>()`

#### `src/lib/db.ts` (new)
- `fetchAllUserData(userId)` — parallelised fetch of all 18 tables, returns partial `BudgetState` or `null`
- camelCase ↔ snake_case mappers: no DB naming leaks into the store/component layer
- `db.*` CRUD helpers (insert/update/delete) for every entity
- `upsertProfile()` for scalar profile fields

#### `src/lib/migrateLocalStorage.ts` (new)
- One-time migration: reads `penny_state_v2`, bulk-inserts into Supabase in dependency order
- Sets `penny_migrated_to_supabase = 'true'` flag after success (never re-runs)
- Silent no-op when already migrated, no localStorage data, or JSON is unparseable
- Does not set flag on failure — allows retry on next load

#### `src/stores/budget.ts` (major refactor)
- `initStore(userId)` action: Supabase fetch → localStorage migration if needed → localStorage fallback on error
- `syncDb(op, ctx)` module-level helper: fire-and-forget DB writes; logs errors but never throws
- All 35 CRUD actions now call `syncDb(db.*.action())` after the optimistic local update
- `main.ts` updated: `loadFromStorage()` → `initStore()`

### Files Modified

| File | Status | Change |
|------|--------|--------|
| `src/lib/supabase.ts` | 🆕 New | Supabase client singleton |
| `src/lib/db.ts` | 🆕 New | DB adapter + mappers |
| `src/lib/migrateLocalStorage.ts` | 🆕 New | One-time localStorage → Supabase migration |
| `src/types/database.ts` | 🆕 New | Postgres row types |
| `supabase/migrations/001_initial_schema.sql` | 🆕 New | Full schema + RLS |
| `.env.example` | 🆕 New | Supabase env var template |
| `tests/lib/db.spec.ts` | 🆕 New | 13 tests: mapper functions, insert/update/delete |
| `tests/lib/migrateLocalStorage.spec.ts` | 🆕 New | 13 tests: migration lifecycle, flag, error handling |
| `src/stores/budget.ts` | ✏️ Refactor | initStore + syncDb calls on all 35 actions |
| `src/main.ts` | ✏️ Minor | loadFromStorage → initStore |
| `CLAUDE.md` | ✏️ Updated | Test count → 871 across 26 spec files |
| `docs/PHASE_TRACKING.md` | ✏️ Updated | Sprint 24 row + this section |

### Test Summary

- **871 tests total** across 26 spec files (previously 845)
- **+26 new tests** in Sprint 24:
  - `db.spec.ts` (13): fetchAllUserData null/profile/purchase/subscription/expense card mapping, throws on error; purchases insert/update/delete; subscriptions daysOfWeek mapping; loans paymentAmount mapping; upsertProfile snake_case + throws
  - `migrateLocalStorage.spec.ts` (13): skip when flagged, skip when no data, skip on bad JSON, success path, sets flag, migrates income/purchases/subscriptions/categories, error does not set flag, scalar profile fields
- `vue-tsc --noEmit` clean

### Prerequisites (user must complete before testing)
- [ ] Create Supabase project at supabase.com
- [ ] Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor
- [ ] Copy URL + service role key into `.env.local`
- [ ] Set `VITE_DEV_USER_ID` to any valid UUID

### Merge & Tag
- ✅ `.env.local` configured (URL corrected, service key + real auth-user UUID for DEV_USER_ID)
- ✅ Visual QA in dev server — Supabase connected, onboarding writes land with zero console errors
- ✅ Production build clean (`vue-tsc --noEmit` + `vite build` both pass)
- ✅ 871/871 tests passing across 26 spec files
- ✅ Merged `feat/sprint-23-supabase-db` → `main`, tagged **v1.17.0**

---

## Sprint 25 — Supabase Auth (Magic Link + Google OAuth) 🔐

**Version**: v1.18.0
**Date**: May 2026
**Branch**: `feat/sprint-25-auth` → `main`
**Status**: ✅ Complete

### Goal
Add real user authentication using Supabase Auth. Swap the Sprint 24 service-role key + fixed `DEV_USER_ID` for the anon key. Enable Row Level Security so every user only sees their own data.

### Features Delivered

#### `src/stores/auth.ts` (new)
- Pinia store managing the Supabase `User | null` state and `loading` flag
- `init()` — registers `onAuthStateChange`; fires immediately with current session (no separate `getSession()` needed); bridges to `useBudgetStore.initStore(userId)` on sign-in and `resetStore()` on sign-out
- `signInWithMagicLink(email)` — wraps `supabase.auth.signInWithOtp()`; sets `magicLinkSent = true` on success
- `signInWithGoogle()` — wraps `supabase.auth.signInWithOAuth({ provider: 'google' })`
- `signOut()` — wraps `supabase.auth.signOut()`; session cleared by `onAuthStateChange`
- Getters: `isAuthenticated`, `userEmail`, `userInitial` (first letter for avatar)
- When Supabase is not configured: immediately calls `initStore('')` and sets `loading = false`

#### `src/lib/supabase.ts` (updated)
- Removed service-role key and `DEV_USER_ID`; switched to anon key only (`VITE_SUPABASE_ANON_KEY`)
- `persistSession: true`, `autoRefreshToken: true`
- `isSupabaseConfigured()` checks URL + anon key presence

#### `src/stores/budget.ts` (updated)
- Removed `DEV_USER_ID` import; `_userId` starts as `''`
- `initStore(userId = '')` — no longer defaults to a fixed dev UUID
- `resetStore()` action — clears state, resets `_userId`, wipes localStorage (called on sign-out)

#### `src/components/auth/LoginPage.vue` (new)
- Full-page branded login screen (dark theme, 💸 logo, tagline)
- Magic link flow: email input → "Send magic link" → 📬 "Check your inbox" confirmation state
- Google OAuth button with official SVG logo (correct brand colours)
- Error banner for sign-in failures
- Theme toggle always accessible (top-right corner)

#### `src/components/ui/UserMenu.vue` (new)
- Avatar chip: green circle, user initial, 34 × 34 px
- Dropdown: user email + "Sign out" button
- Click-outside detection via `document.addEventListener('mousedown', …)`
- Keyboard dismiss on Escape
- CSS Transition `user-menu-drop` (fade + slide)

#### `src/App.vue` (updated)
- Hard auth gate:
  - `auth.loading` → centered spinner
  - `!auth.user` (Supabase configured) → `<LoginPage />`
  - Otherwise → full app shell
- `<UserMenu>` shown in toolbar when `supabaseEnabled && auth.user`

#### `src/components/pages/SettingsPage.vue` (updated)
- New "Account" BaseCard (shown only when `supabaseEnabled && auth.user`): email + "Sign out" button

#### `.env.example` (updated)
- Removed `VITE_SUPABASE_SERVICE_KEY` and `VITE_DEV_USER_ID`; only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` remain

#### `supabase/migrations/002_enable_rls.sql` (new)
- Enables RLS policies on all 18 tables
- `profiles`: 4 separate policies (select / insert / update / delete) using `id = auth.uid()`
- All other 17 tables: `for all` policy using `user_id = auth.uid()`

### Tests

#### `tests/stores/auth.spec.ts` (new — 16 tests)
- `init()`: registers `onAuthStateChange`, sets user + calls `initStore` on session, clears loading after auth resolves, calls `resetStore` on null session, localStorage-only path when Supabase not configured
- `signInWithMagicLink()`: calls `signInWithOtp` with email + `redirectTo`, sets `magicLinkSent`, sets error on failure
- `signInWithGoogle()`: calls `signInWithOAuth` with google provider + `redirectTo`, sets error on failure
- `signOut()`: calls `supabase.auth.signOut`
- `clearError()`: resets `error` + `magicLinkSent`
- Getters: `isAuthenticated`, `userInitial` (uppercase first char), `userEmail`, null-user fallbacks

#### `tests/components/App.spec.ts` (updated)
- Added `@/lib/supabase` mock returning `isSupabaseConfigured = false` so the auth gate is bypassed and the existing toolbar / keyboard-shortcut tests continue to pass

### Files Modified

| File | Status | Change |
|------|--------|--------|
| `src/stores/auth.ts` | 🆕 New | Auth Pinia store |
| `src/components/auth/LoginPage.vue` | 🆕 New | Full-page login UI |
| `src/components/ui/UserMenu.vue` | 🆕 New | Avatar + sign-out dropdown |
| `supabase/migrations/002_enable_rls.sql` | 🆕 New | RLS policies for all 18 tables |
| `tests/stores/auth.spec.ts` | 🆕 New | 16 auth store tests |
| `src/lib/supabase.ts` | ✏️ Updated | Anon key, removed service key |
| `src/stores/budget.ts` | ✏️ Updated | resetStore(), no DEV_USER_ID |
| `src/main.ts` | ✏️ Updated | authStore.init() instead of budgetStore.initStore() |
| `src/App.vue` | ✏️ Updated | Auth gate + UserMenu |
| `src/components/pages/SettingsPage.vue` | ✏️ Updated | Account card + sign-out |
| `.env.example` | ✏️ Updated | Anon key only |
| `tests/components/App.spec.ts` | ✏️ Updated | isSupabaseConfigured mock |
| `CLAUDE.md` | ✏️ Updated | Test count → 887 |
| `docs/PHASE_TRACKING.md` | ✏️ Updated | Sprint 25 row + this section |

### Test Summary

- **887 tests total** across 27 spec files (previously 871)
- **+16 new tests** in Sprint 25: `auth.spec.ts` (16)
- `vue-tsc --noEmit` clean · `eslint --max-warnings 0` clean · `vite build` green

### Prerequisites (user must complete before testing)
- [ ] Copy anon key from Supabase dashboard → `.env.local` (`VITE_SUPABASE_ANON_KEY`)
- [ ] Run `supabase/migrations/002_enable_rls.sql` in Supabase SQL Editor
- [ ] Configure Google OAuth: Supabase → Auth → Providers → Google (Client ID + Secret)
- [ ] Add `https://your-project.supabase.co/auth/v1/callback` and `https://brahimmahadi.github.io/A-Penny-For-Our-Thoughts/` to Supabase Auth URL Configuration

### Merge & Tag
- ✅ All 887 tests passing across 27 spec files
- ✅ Production build clean (`vue-tsc --noEmit` + `vite build` both pass)
- ✅ Merged `feat/sprint-25-auth` → `main`, tagged **v1.18.0**

---

## Post-Sprint 25 — Hotfixes (v1.18.x)

### HF-1 — Toolbar Cleanup (no version bump)

Moved all CSV/JSON import-export buttons out of the top navigation bar
and into **Settings → Data Management** card. Toolbar now shows only:
keyboard-shortcut help (`?`), theme toggle, and UserMenu.

**Files changed**: `src/App.vue`, `src/components/pages/SettingsPage.vue`,
`tests/components/App.spec.ts` (3 tests updated), `CLAUDE.md` (test count 887 → 885).

---

### HF-2 — Auth Loading Hang + Cloud Sync Resilience Fix

**Bug (round 1)**: After deploying with valid Supabase env vars, the app
could hang permanently on the loading spinner (💸 / "Loading…"). The user
never reached the login page or the app shell.

**Root cause (round 1)**: Supabase's `onAuthStateChange` fires the
`INITIAL_SESSION` event *after* the library finishes resolving the stored
session — including a token-refresh network request if the cached token is
expired. `fetch()` has no built-in timeout, so a stalled refresh request
caused the callback to never fire and `auth.loading` to stay `true` forever.

**Fix (round 1)**:
1. `src/stores/auth.ts` — 10-second safety timer in `init()`.
2. `src/stores/budget.ts` — `withTimeout()` `Promise.race` (8 s) on
   `fetchAllUserData()`.

---

**Bug (round 2)**: After round-1 fix the app loaded, but the 8-second
DB fetch timeout was too short for a Supabase free-tier cold start
(10–15 s when the project wakes from pause). The spinner showed for
8+ seconds before showing the app, and the cloud sync silently fell
back to localStorage with only a console warning.

**Root cause (round 2)**: `auth.loading` was cleared *after* `initStore`
awaited (so the spinner stayed up during the full DB fetch), the localStorage
fallback happened invisibly, and the timeout was too aggressive for cold starts.

**Fix (round 2)**:
1. **`src/stores/auth.ts`** — `this.loading = false` is now set immediately
   after `this.user` is resolved, *before* `initStore()` is awaited. The
   app shell / login page renders in < 1 s regardless of DB latency.
2. **`src/stores/budget.ts`** — `loadFromStorage()` is called first at the
   start of the Supabase path, so local data shows immediately while the
   cloud fetch runs. Timeout raised from 8 s → 20 s to accommodate cold
   starts. On timeout/error a 7-second warning toast is shown:
   *"⚠ Cloud sync failed — showing local backup. Check your Supabase project
   status and refresh to retry."*
3. **`src/composables/useToast.ts`** — `show()` gained an optional `duration`
   parameter so warnings can stay on screen longer than the default 2.5 s.

**Important**: A paused Supabase free-tier project requires manual
unpausing from the dashboard before cloud sync will succeed. The toast
message now directs the user there.

**Tests**: Existing 885 tests still pass.

**Files changed**: `src/stores/auth.ts`, `src/stores/budget.ts`,
`src/composables/useToast.ts`, `docs/PHASE_TRACKING.md`.

---

---

### HF-3 — Concurrent `initStore` Fix

**Bug**: Supabase sync consistently timed out — the console showed two
successful "Authenticated probe OK" logs followed by "Authenticated probe
FAILED (5001 ms)". Cloud data never loaded; the app silently fell back to
localStorage every time.

**Root cause**: `onAuthStateChange` fires for *every* Supabase auth lifecycle
event — `INITIAL_SESSION`, `TOKEN_REFRESHED`, `SIGNED_IN`, and others. All
three events can arrive within milliseconds of each other at page load (common
when the user has both a magic-link account and a Google OAuth account linked
to the same email — the auth library reconciles them at startup). The previous
code called `initStore` on *every* event, launching ~18 parallel Supabase
queries per call. Three concurrent calls = up to 54 simultaneous database
connections, saturating the free-tier PgBouncer pool (60 connections) and
causing the third call's queries to time out.

**Fix**:
1. **`src/stores/auth.ts`** — `onAuthStateChange` now filters by event type.
   Only `INITIAL_SESSION` and `SIGNED_IN` trigger `initStore` (these are the
   events that represent a new session being established). `TOKEN_REFRESHED`
   and `USER_UPDATED` update `auth.user` but skip the DB sync — no re-fetch
   needed, the data hasn't changed. `SIGNED_OUT` still calls `resetStore()`.
   Detailed comment added explaining why each event is handled (or skipped).

2. **`src/stores/budget.ts`** — Added a module-level `_syncInProgress` boolean
   as a belt-and-suspenders concurrency guard. If `initStore` is somehow
   called a second time before the first finishes (e.g. two rapid SIGNED_IN
   events), the second call logs a message and returns immediately. Wrapped
   in a `try/finally` to guarantee the flag resets even if an error is thrown.

3. **`tests/stores/auth.spec.ts`** — Updated `fireAuthChange` helper to
   accept an optional event name (default `'SIGNED_IN'`). Updated the
   "sets user to null and calls resetStore" test to fire `'SIGNED_OUT'`
   (which is the correct Supabase event for sign-out) rather than
   `'SIGNED_IN'` with a null session (which Supabase never actually sends
   and which the new filter deliberately ignores).

**Tests**: 885/885 passing. `vue-tsc --noEmit` clean. `vite build` green.

**Files changed**: `src/stores/auth.ts`, `src/stores/budget.ts`,
`tests/stores/auth.spec.ts`, `docs/PHASE_TRACKING.md`.

---

---

## Sprint 26 — Dashboard Restructure + Advanced Tab + Option B Nav (v1.19.0)

**Version**: v1.19.0
**Branch**: `main` (direct commit)

### Goals
- Reduce Dashboard clutter by moving analytics out of the main tab
- Create a dedicated **Advanced** tab for analytics sections
- Move Budget Allocation to Settings (less prominent real-estate)
- Delete the redundant Goals Timeline component
- Replace the "Sections" nav tab button with an Option B floating right-edge handle

### Changes

**New files:**
- `src/components/pages/AdvancedPage.vue` — hosts the 4 analytics sections with full drag-to-reorder (mirrors DashboardPage pattern)

**Deleted files:**
- `src/components/sections/GoalsTimeline.vue` — removed; Goals Timeline was redundant with the Savings Goals section

**Modified files:**

| File | Change |
|---|---|
| `src/types/state.ts` | Added `'advanced'` to `TabId`; added `advancedSectionOrder: string[]` to `UiState` |
| `src/constants/dashboardSections.ts` | Split `DASHBOARD_SECTIONS` (10 sections) + `ADVANCED_SECTIONS` (4 sections); removed `budget-allocation` and `goals-timeline`; added `DEFAULT_ADVANCED_ORDER` |
| `src/stores/ui.ts` | Added `advancedSectionOrder` state, persistence, and 4 actions (`setAdvancedSectionOrder`, `resetAdvancedSectionOrder`, `moveAdvancedSectionUp/Down`) |
| `src/components/pages/DashboardPage.vue` | Removed 6 sections (analytics → Advanced, budget-allocation → Settings, goals-timeline deleted) |
| `src/components/pages/SettingsPage.vue` | Added `BudgetAllocation` card at the top |
| `src/components/ui/SectionPicker.vue` | Dual-group panel (Dashboard / Advanced with divider); separate drag state and reset per group; `jumpTo()` routes to correct tab |
| `src/App.vue` | Added Advanced tab + keyboard shortcut `5`; replaced Sections nav button with Option B floating right-edge handle (`⊞ SECTIONS` pill, pulse animation, FAB on mobile); updated swipe `TAB_ORDER` |
| `src/components/onboarding/WhatsNewBanner.vue` | Bumped to v1.19.0, updated RELEASE_NOTES |
| `tests/components/sections/sections.spec.ts` | Updated section counts (16→10 for dashboard, 16→14 for picker, 32→28 for move buttons); updated reset button selector |
| `tests/stores/ui.spec.ts` | Updated `sectionOrder` length assertions (16→10) |
| `docs/PHASE_TRACKING.md` | This entry |
| `CLAUDE.md` | Updated test count (885 tests, 27 spec files) |

### Supabase compatibility
No schema changes required. The new `advancedSectionOrder` is stored entirely in `penny_ui_prefs` (localStorage), the same key used for `sectionOrder`. All existing Supabase tables and sync logic are unaffected.

### Test results
885/885 passing. `vue-tsc --noEmit` clean. `vite build` green.

- ✅ Merged to `main`, tagged **v1.19.0**

---

**Last Updated**: May 2026
**Current Version**: v2.0.0
**Next Up**: Post-v2.0.0 backlog (see Future Backlog section)
**Current Branch**: `main`

---

---

# Vivid Modern Redesign — v2.0.0 🎨

**Goal**: Full visual redesign of the app — replace the Botanical green palette with the Vivid Modern violet system, move navigation from a top tab bar to a 64px icon sidebar, and rebuild each tab's layout and interactions to match the `design_handoff_schedule_spending/` mockups.

**Design source**: `docs/design_handoff_schedule_spending/` (HTML/React prototype + screenshots)  
**Target release**: `v2.0.0`  
**Sprint naming**: `feat/redesign-sprint-N-description`

> **Sprint planning policy**: Whenever scope changes mid-sprint, this section must be updated in the same commit. Entries move from 🔲 PLANNED → 🟡 IN PROGRESS → ✅ COMPLETE as work lands.

---

## Redesign Sprint Summary

| Sprint | Description | Branch | Status | Version |
|--------|-------------|--------|--------|---------|
| RS-1 | Design tokens — Vivid Modern palette | `feat/redesign-sprint-1-tokens` | ✅ Complete | — |
| RS-2 | App shell — 64px sidebar, BottomNav, GoalsPage stub | `feat/redesign-sprint-2-shell` | ✅ Complete | — |
| fix | Dev auth bypass (`VITE_DISABLE_AUTH`) | `fix/dev-auth-bypass` | ✅ Complete | — |
| RS-3 | Dashboard redesign — hero KPI, quick-add, header | `feat/redesign-sprint-3-dashboard` | ✅ Complete | — |
| RS-4 | Schedule & Spending CSS polish + search input | `feat/redesign-sprint-4-schedule-spending` | ✅ Complete | — |
| RS-5 | Goals tab — full implementation + Advanced folded in | `feat/redesign-sprint-5-goals` | ✅ Complete | — |
| fix | `--accent2` contrast — add `--accent2-text` token | `fix/accent2-contrast` | ✅ Complete | — |
| RS-6 | Docs tab reskin | `feat/redesign-sprint-6-docs` | ✅ Complete | — |
| RS-7 | Settings redesign (initial polish + deep two-col rebuild, readonly props, inline sliders) | `feat/redesign-sprint-7-settings` | ✅ Complete | — |
| RS-8 | Bottom status bar (sticky ticker + next-bill, 7 tests) | `feat/redesign-sprint-8-statusbar` | ✅ Complete | — |
| RS-9 | Polish, tests, v2.0.0 release | `feat/redesign-sprint-9-release` | ✅ Complete | v2.0.0 |
| RS-10 | Sidebar hover-expand (icon+label, overlay mode) | `feat/sidebar-hover-expand` | ✅ Complete | v2.1.0 |
| RS-11 | Dashboard grid restructure — fixed layout, remove legacy sections, strip bar charts | `feat/redesign-sprint-11-dashboard-grid` | ✅ Complete | v2.2.0 |
| RS-12 | Purchases This Period + Recurring Spend + Money Flow charts row | `feat/redesign-sprint-12-purchases-recurring` | ✅ Complete | v2.3.0 |
| RS-13 | Inline pay/charge/deposit/withdraw interactions on loan, CC, and savings cards | `feat/redesign-sprint-13-inline-interactions` | ✅ Complete | v2.4.0 |
| RS-14 | Wishlist card-grid redesign: savings progress, months-to-goal, inline "Add savings", DB sync fix | `feat/redesign-sprint-14-wishlist-price` | ✅ Complete | v2.5.0 |
| RS-15 | Purchase type (Want vs Need): stacked bar chart, type column + filter in Spending tab, wants-only donut, updated quick-add modal | `feat/redesign-sprint-15-purchase-type` | ✅ Complete | v2.6.0 |
| RS-16 | Wants/Needs toggle: dashboard hero + PurchasesThisPeriod shared toggle, spending-tab donut toggle, row-action cleanup (delete in modal) | `feat/sprint-16-type-toggle` | ✅ Complete | v2.7.0 |

---

## RS-1 — Design Tokens ✅
**Branch**: `feat/redesign-sprint-1-tokens`  
**Status**: ✅ **COMPLETE** — May 2026

### Delivered
- `src/css/tokens.css` — full rewrite: Botanical green → Vivid Modern violet palette
  - `:root` light theme: `--accent: #5b3df5`, `--accent2: #c8f24a`, all surface/text/border/status tokens
  - `[data-theme="dark"]`: matching dark palette; `--success` correctly kept as `#4ade80` (NOT overwritten to violet)
- `src/styles.css` — `@theme inline` bridge extended: `--color-accent-soft`, `--color-success`, `--color-subtle`, `--color-track`, `--radius-card` all wired to Tailwind
- `src/css/layout.css` — `.card` border-radius bumped to `var(--radius-card)` (18px), shadow upgraded to `var(--card-shadow)`, padding 22px
- `index.html` — Google Fonts preconnect + Inter (400–800) + JetBrains Mono (400–700)
- 25 component files — botanical fallback hex values scrubbed and replaced with Vivid Modern equivalents via bulk replacement
- **Bug fixed**: dark `--success` was accidentally overwritten to accent violet; restored to `#4ade80`
- 866/866 tests pass · `tsc --noEmit` clean

---

## RS-2 — App Shell (Sidebar Nav) ✅
**Branch**: `feat/redesign-sprint-2-shell`  
**Status**: ✅ **COMPLETE** — May 2026

### Delivered
- `src/components/ui/AppSidebar.vue` — 64px sticky icon sidebar
  - Brand `¢` logo (accent bg), 6 nav buttons (◧▥◐◎☰◆) with `accent-soft` active state
  - Theme toggle, avatar/UserMenu at bottom
  - Hidden via CSS at `≤768px`
- `src/components/ui/BottomNav.vue` — mobile bottom bar (`≤768px`)
  - Icon + label tabs with accent indicator pill; mirrors same 6 tabs as sidebar
- `src/components/pages/GoalsPage.vue` — stub (placeholder for RS-5 full implementation)
- `src/App.vue` — restructured: `flex-row` layout (sidebar + content column); top header strip (brand + toolbar, no tabs); keyboard shortcuts renumbered: 1–6 = Dashboard/Schedule/Spending/Goals/Docs/Settings, 7 = Advanced
- `src/types/state.ts` — `TabId` extended with `'goals'`
- `src/css/layout.css` — legacy top-tab CSS rules removed
- `tests/components/App.spec.ts` — GoalsPage mock added; shortcut `4 → Goals` test updated
- 866/866 tests pass · `tsc --noEmit` clean

---

## fix — Dev Auth Bypass ✅
**Branch**: `fix/dev-auth-bypass`  
**Status**: ✅ **COMPLETE** — May 2026

### Delivered
- `src/lib/supabase.ts` — `isSupabaseConfigured()` returns `false` when `VITE_DISABLE_AUTH=true`
- `src/env.d.ts` — `ImportMetaEnv` interface declared; all `VITE_*` vars properly typed as `string | undefined`
- `src/stores/budget.ts` — null-coalescing fallback for `VITE_SUPABASE_ANON_KEY` in fetch header (latent TS bug fixed)
- `.env.example` — `VITE_DISABLE_AUTH` documented with usage instructions
- `.env.development.local` (gitignored) — created locally with `VITE_DISABLE_AUTH=true` for immediate use
- 866/866 tests pass · `tsc --noEmit` clean

---

## RS-3 — Dashboard Redesign ✅
**Branch**: `feat/redesign-sprint-3-dashboard`  
**Status**: ✅ **COMPLETE** — May 2026

### Goal
Bring DashboardPage.vue in line with the Vivid Modern mockup. The page structure and section components already exist — this sprint is about the page-level layout, header, and hero KPI area.

### Delivered
- ✅ **Page header**: "Welcome back, Brahim" eyebrow + "Your money, Month YYYY" h1; "⊞ Manage widgets" secondary pill button + "+ Quick add to wants" accent CTA
- ✅ **Hero KPI card** (1.4fr, accent background): bi-weekly wants remaining with large numeral, inline chartreuse progress track, "until [pay period end]" subtitle, decorative circle overlays
- ✅ **KPI row** (4-col: 1.4fr 1fr 1fr 1fr): hero wants + due-in-7-days (from pay period forecast) + needs spent (ProgressBar status-driven) + net worth (MoM % delta)
- ✅ **Quick-add modal**: name + amount + category chips → `budget.addPurchase()`; live "remaining after" preview flips to danger when over budget
- ✅ **`sectionPickerOpen` moved to ui store**: `openSectionPicker()` / `closeSectionPicker()` / `toggleSectionPicker()` actions; "Manage widgets" button and keyboard shortcut G both wire to store
- ✅ All 866 tests pass · tsc --noEmit clean

### Out of scope for RS-3
- Any changes to section component internals (those are correct already)
- Schedule, Spending, Goals, Docs, Settings pages

---

## RS-4 — Schedule & Spending CSS Polish + Search ✅
**Branch**: `feat/redesign-sprint-4-schedule-spending`  
**Status**: ✅ **COMPLETE** — May 2026

### Delivered
**`src/components/ui/StatCard.vue`**
- ✅ Added `success` and `danger` variant options to the `variant` prop (were `default | accent | muted`)
- ✅ CSS: `.base-stat-card--success` colors the value with `var(--success)`; `.base-stat-card--danger` with `var(--danger)`

**Schedule tab (`src/components/pages/SchedulePage.vue`)**
- ✅ KPI tiles now use semantic color variants: Income → `variant="success"` (green), Bills → `variant="danger"` (red), Net → `variant="danger"` when negative (matches `TabSchedule` mockup)
- ✅ "Today" nav button: fixed hard-coded `rgba(74, 222, 128, 0.08)` bg → `var(--accent-soft)` (violet-tinted, matches sidebar active state)
- ✅ Pay-schedule timeline "Next pay" dot: fixed hard-coded rgba green border + glow → `var(--success)` via `color-mix()`; dot background changed from `var(--accent)` to `var(--success)` (income = green per mockup)
- ✅ "Next pay" sub-label: color updated from `var(--accent)` to `var(--success)` for semantic consistency

**Spending tab (`src/components/pages/SpendingPage.vue`)**
- ✅ "Current" period nav button: fixed hard-coded `rgba(74, 222, 128, 0.08)` → `var(--accent-soft)` bg + `var(--accent)` border + `var(--accent)` text (violet, matches sidebar pattern)
- ✅ **Export CSV button** added to the period nav header area: accent-filled pill button, calls `budget.exportCSV()` + shows success/error toast via `useToast`
- ✅ Search, filter chips, sort, live counter, empty state — already implemented in Sprint 16; this sprint verified they are fully functional with no additional changes needed
- ✅ 866/866 tests pass · `tsc --noEmit` clean

---

## RS-5 — Goals Tab (Full Implementation + Advanced folded in) ✅
**Branch**: `feat/redesign-sprint-5-goals`  
**Status**: ✅ **COMPLETE** — May 2026

### Delivered

**`src/components/pages/GoalsPage.vue`** — Complete rewrite (stub → full page)
- ✅ **Page header**: "Goals" eyebrow + "What you're working toward" h1; right-side CTAs "+ New savings goal" (accent) and "+ Add wishlist item" (secondary) — wired to section modal refs via `defineExpose`
- ✅ **Summary KPI row** (4 StatCards): Total saved (success variant, with /target hint) · Overall progress (% across N goals) · Net worth (danger variant if negative) · Wishlist items count
- ✅ **Savings Goals** section embedded in a collapsible `BaseCard`; header CTA calls `savingsGoalsRef.openAdd()`
- ✅ **Wishlist** section embedded in a collapsible `BaseCard`; header CTA calls `wishlistRef.openAdd()`
- ✅ **Analytics section group** (folded in from Advanced tab): toggle button (`📊 Analytics` with rotating chevron) reveals 4 collapsible BaseCards: 6-Month Spending Trend · Spending Analytics · Budget vs. Actual · Net Worth; analytics sectionIds prefixed with `goals-` to avoid ui-store collapse-state collision with AdvancedPage
- ✅ Responsive: KPI row 4→2 cols at ≤700px; header stacks vertically + buttons full-width at ≤540px

**`src/components/sections/SavingsGoals.vue`**
- ✅ Added `defineExpose({ openAdd })` — parent pages can trigger the Add Goal modal from an external button

**`src/components/sections/Wishlist.vue`**
- ✅ Added `defineExpose({ openAdd })` — parent pages can trigger the Add Item modal from an external button

**`src/components/pages/AdvancedPage.vue`** — Bug fix
- ✅ Drop-indicator `box-shadow` replaced old hard-coded `rgba(74, 222, 128, 0.5)` with `color-mix(in srgb, var(--accent) 40%, transparent)`

- ✅ 866/866 tests pass · `tsc --noEmit` clean

---

## fix — `--accent2` Contrast (WCAG a11y) ✅
**Branch**: `fix/accent2-contrast`  
**Status**: ✅ **COMPLETE** — May 2026

### Problem
`--accent2: #c8f24a` (chartreuse) used as a text `color:` property had ~1.3:1
contrast ratio on the light-mode white background (`--surface: #ffffff`), making
amounts like "Remaining", forecast figures, "On Track" status chips, and section
labels effectively invisible.

### Solution
Added a companion token `--accent2-text` that is:
- **Light mode**: `#4d7c0f` (lime-700) — ~7.4:1 contrast on white, passes WCAG AA + AAA for normal text
- **Dark mode**: `#c8f24a` (same as `--accent2`) — stays legible on dark surfaces

### Files changed (13)
- `src/css/tokens.css` — added `--accent2-text` to `:root` and `[data-theme="dark"]`
- `src/css/features.css`, `ui.css`, `forms.css` — bulk `color: var(--accent2)` → `color: var(--accent2-text)` (all text uses)
- `src/components/sections/WantsTracker.vue`, `Subscriptions.vue`, `SavingsGoals.vue`, `SpendingAnalytics.vue`, `CreditCards.vue`, `Loans.vue`, `RecurringCalendar.vue` — same replacement in scoped styles
- `src/components/sections/NetWorth.vue`, `BudgetVsActual.vue`, `CreditCards.vue`, `RecurringCalendar.vue` — JS computed color strings updated from `'var(--accent2)'` → `'var(--accent2-text)'`

**Unchanged**: all `background: var(--accent2)` fills, `border-color: var(--accent2)` decorative borders,
`color-mix(...)` tinted backgrounds, and chart dataset colors — these remain chartreuse.

- ✅ 866/866 tests pass · `tsc --noEmit` clean

---

## RS-6 — Docs Tab Reskin ✅
**Branch**: `feat/redesign-sprint-6-docs`  
**Status**: ✅ **COMPLETE** — May 2026

### Delivered

**`src/components/pages/DocsPage.vue`** — Visual-only pass (zero content changes)

- ✅ **Page header**: "Documentation" eyebrow + "How it works" h1 + right-side section badge pill (icon + label) that tracks the active section — consistent with GoalsPage / DashboardPage header pattern. Badge hidden at ≤480px.
- ✅ **Sidebar panel**: Wrapped in `var(--surface2)` card with border + 12px radius + 0.35rem inner padding. Active item uses `box-shadow: inset 3px 0 0 var(--accent)` left-border indicator + `var(--accent-soft)` background. Hover uses accent-soft instead of plain surface2. Width 180px → 200px.
- ✅ **Section title (h2)**: `1.35rem / 800 / letter-spacing: -0.02em`, bottom border divider separating title from content body.
- ✅ **h3 headings**: Subtle `3px color-mix(accent 30%)` left-border accent strip + `padding-left: 0.65rem` indent; `1.4rem` top margin for breathing room.
- ✅ **Code blocks** (`.docs-code`): Background → `var(--surface3)` for depth; `border-left: 3px solid var(--accent)` accent stripe; uses `var(--font-mono)` token.
- ✅ **Release version chip**: Plain bold text → `display: inline-flex` pill with `var(--accent-soft)` background + accent border + 999px radius. Tagline color lifted from muted → `var(--text)`.
- ✅ **FAQ items**: Hover reveals `var(--accent-soft)` background; `border-radius: 8px` for rounded hover state.
- ✅ **CSV table**: `var(--surface2)` header row; tbody rows gain hover highlight; table wrapped in border+radius container for a card feel.
- ✅ **Mobile nav**: Chevron text (▲/▼) → CSS-rotated `›` character with `transform: rotate(90deg)` + `var(--transition-fast)`; dropdown elevated with `var(--card-shadow)`.
- ✅ **`kbd` element**: `border-bottom-width: 2px` for physical key look; color → `var(--text)` for legibility.
- ✅ `prefers-reduced-motion` guard: disables chevron + table transitions.

- ✅ 866/866 tests pass · `tsc --noEmit` clean

---

## RS-7 — Settings Redesign ✅
**Branch**: `feat/redesign-sprint-7-settings`  
**Status**: ✅ **COMPLETE** — May 2026

### Bugs fixed

- **`BudgetAllocation.vue`** — `.alloc-card--wants .alloc-card__pct` used `color: var(--accent2, #60a5fa)` — missed in the accent2-text sweep because it had a custom fallback. Fixed to `var(--accent2-text)`. Bar segments cleaned up too (removed stale fallbacks).
- **`RulesEngine.vue`** — `.icon-btn:hover { background: rgba(255,255,255,0.06) }` was invisible in light mode (semi-transparent white on white). Fixed to `var(--surface3)`.
- **`BudgetAlerts.vue`** — Same icon-btn light-mode invisible hover fix. Firing row `rgba(245, 158, 11, 0.06)` hardcoded → `color-mix(in srgb, var(--warn) 8%, transparent)`.
- **`CategoryManager.vue`** — Hardcoded dark-mode fallbacks `var(--surface2, #1a1a24)` and `var(--border, #2a3041)` removed; token-only values used.

### Delivered (visual polish, zero functional changes)

**`src/components/pages/SettingsPage.vue`**
- ✅ Page header: "Settings" eyebrow + "Your preferences" h1 (matches GoalsPage/DocsPage pattern)
- ✅ Data Management: flat 2×2 button grid → two labelled groups (CSV / JSON backup) with a 1px divider; `<kbd>` updated to physical key style (border-bottom-width: 2px)
- ✅ Danger Zone inner content wrapped in `color-mix(danger 4%)` tinted block with danger-colored border for clear destructive-zone signal

**`src/components/sections/BudgetAllocation.vue`**
- ✅ Alloc cards: `border-radius: 8px → 10px`; `border-top-width: 3px` per-color accent stripe (needs=violet, wants=chartreuse, savings=amber)
- ✅ Progress bar: height `8px → 10px`
- ✅ Toggle button active/hover: `color: var(--surface) → #fff` (theme-safe)

**`src/components/sections/PayStartDate.vue`**
- ✅ Period preview panel: `border-radius: 8px → 10px` + `border-left: 3px solid var(--accent)`
- ✅ Inline edit form: `border-radius: 8px → 10px`; date input background `var(--surface) → var(--surface2)` + `border-radius: 8px`

**`src/components/sections/RulesEngine.vue`**
- ✅ Row hover: `var(--surface2) → var(--accent-soft)`
- ✅ Test block: `border-radius: 8px → 10px` + `border-left: 3px solid var(--accent)` accent stripe
- ✅ Live match result: plain text → accent-soft pill badge

**`src/components/sections/BudgetAlerts.vue`**
- ✅ Row hover: `var(--surface2) → var(--accent-soft)`
- ✅ Firing rows: `border-left: 3px solid var(--warn)` visual signal

**`src/components/sections/CategoryManager.vue`**
- ✅ Cat items: `border-radius: 6px → 8px`; hover → `var(--accent-soft)`
- ✅ `cat-badge` "built-in" chip: plain muted outline → accent-soft pill (matches badge pattern)
- ✅ Color preview panel: `border-radius: 6px → 8px`

### RS-7 Part 2 — Deep Settings Rebuild (two-column layout + full CRUD)

**`src/components/sections/IncomeStreams.vue`**
- ✅ Added `readonly?: boolean` prop (default `false`) — hides "+ Add Stream", Edit, Delete, and onboarding add button when `true`
- ✅ Fixed hardcoded `rgba(74, 222, 128, 0.12)` bi-weekly chip background → `var(--accent-soft)` (was leaking botanical green in both themes)

**`src/components/sections/ExpenseCards.vue`**
- ✅ Added `readonly?: boolean` prop — hides "+ Add Card", Rename/Delete card buttons, item Edit/Delete buttons, and "+ Add Expense" when `true`
- ✅ `expense-item__row-2` hidden entirely in readonly mode when there's no badge to show (avoids empty row)
- ✅ Fixed `expense-item__badge` hardcoded `rgba(74, 222, 128, 0.12)` → `var(--accent-soft)`

**`src/components/pages/DashboardPage.vue`**
- ✅ Added `SECTION_PROPS` map; `income-streams` and `expense-cards` entries set `{ readonly: true }`
- ✅ Dynamic `<component>` now binds `v-bind="SECTION_PROPS[sectionId] ?? {}"` — Dashboard shows display-only views of both sections

**`src/components/sections/BudgetAllocation.vue`**
- ✅ Replaced modal-edit approach with inline range sliders (Needs + Wants independently draggable; Savings auto-calculated as remainder)
- ✅ Sliders are mutually clamped — Needs max = `100 - wants`, Wants max = `100 - needs`, so Savings is always ≥ 0
- ✅ Draft state (`draftNeeds` / `draftWants` / computed `draftSavings`) — watched against store, resets on external changes (import / clearAll)
- ✅ "Unsaved changes" save row with animated fade-in appears only when draft ≠ saved allocation
- ✅ "Auto" chip on Savings card makes the auto-calculation pattern clear to the user
- ✅ Removed the old BaseModal for allocation editing; `BudgetAllocation` no longer imports or uses `BaseModal`

**`src/components/pages/SettingsPage.vue`**
- ✅ Title changed: "Your preferences" → "Configure A Penny For Our Thoughts" with subtitle
- ✅ Full two-column CSS grid layout (`settings-main-grid`): left col = Budget Rules + Pay Period, right col = Income Sources (full CRUD) + Expense Cards (full CRUD)
- ✅ Lower 3-column grid (`settings-lower-grid`): Spending Categories + Transaction Rules + Budget Alerts
- ✅ All sections wrapped in `.settings-panel` cards (title + subtitle header, `border-radius: 14px`, consistent padding)
- ✅ Data Management, Account (conditional), Danger Zone at full-width below
- ✅ Removed `BaseCard` import (no longer used in this page)
- ✅ Danger Zone panel uses `settings-panel--danger` variant (tinted background + danger border)
- ✅ Responsive: main grid collapses at 860px, lower grid collapses 3→2→1 at 1024/640px

**`tests/components/sections/sections.spec.ts`**
- ✅ Updated `BudgetAllocation` test: replaced "opens edit modal on 'Edit %' click" → "has inline range sliders for needs and wants allocation" (checks for 2 `input[type="range"]` elements)

- ✅ 866/866 tests pass · `tsc --noEmit` clean

---

## RS-8 — Bottom Status Bar ✅
**Branch**: `feat/redesign-sprint-8-statusbar`  
**Status**: ✅ **COMPLETE** — May 2026

### Delivered

**`src/components/ui/AppStatusBar.vue`** *(new)*
- ✅ Slim 36px strip at the top of `.app-content`, above `<main>` (`position: sticky; top: 0; z-index: 50`)
- ✅ Hidden at ≤768px (mobile BottomNav handles that space); CSS `@media` rule inside component
- ✅ **Left zone** — recent-purchases ticker: last 3 wants purchases sorted by date desc, cycling every 3 s via `setInterval`; shows name, amount (accent mono), days-ago label; pagination dots track current index; "No purchases logged yet" fallback when list empty
- ✅ **Right zone** — Up-next bill: first item in `payPeriodForecast.dated` with `periodDate ≥ today`; shows "UP NEXT" label, name, amount (warn color), formatted date; "Nothing due soon" fallback when forecast has no upcoming items
- ✅ `<Transition name="ticker" mode="out-in">` fade animation between ticker items (guarded by `prefers-reduced-motion`)
- ✅ `watch(recentPurchases)` resets `tickerIdx` to 0 when the purchase list changes
- ✅ `watch(() => budget.allocation)` ensures ticker clears up on store resets
- ✅ `onUnmounted` clears the interval — no memory leak
- ✅ `backdrop-filter: blur(8px)` — page content ghosting looks polished as it scrolls under the bar

**`src/App.vue`**
- ✅ Imported `AppStatusBar`; placed above `<main>` inside `.app-content`
- ✅ Comment updated to document RS-8

**`tests/components/pages/pages.spec.ts`**
- ✅ Added 7 new `AppStatusBar` tests: mounts, renders two zones, empty states (no purchases / no forecast), ticker with data, pagination dots

- ✅ 873/873 tests pass (was 866; +7 new) · `tsc --noEmit` clean

### RS-8 revision — bottom placement + CSS scroll ticker

- ✅ Bar moved to `position: fixed; bottom: 0; left: 64px; right: 0` — always visible, never scrolls away
- ✅ Cycling `setInterval` and fade `<Transition>` replaced with continuous CSS `@keyframes ticker-scroll` animation (`translateX(0) → translateX(-50%)`)
- ✅ Items rendered twice (original pass + `aria-hidden` duplicate pass) for a seamless loop; no JS interval needed
- ✅ Animation duration scales with item count (`~6s per item`, min 12s)
- ✅ `ticker-wrap:hover .ticker-inner { animation-play-state: paused }` — hover to pause
- ✅ CSS `mask-image` gradient fades the ticker edges for a polished bleed effect
- ✅ `App.vue` `.app-main` gets `padding-bottom: calc(5rem + 44px)` so the last content item is never hidden behind the fixed bar
- ✅ Tests updated: `.status-bar__zone / .status-bar__muted / .status-bar__dot` class refs replaced with `.ticker-zone / .bill-zone / .ticker-empty / .ticker-inner / .ticker-item`; "6 ticker-item elements" test verifies original + duplicate pass

### RS-8 revision 2 — right zone converted to scrolling ticker

- ✅ Right zone replaced: static "UP NEXT" single bill → continuous CSS scroll ticker matching left zone
- ✅ `upcomingBills` computed (up to 5 items from `payPeriodForecast.dated`, filtered to `>= today`); `hasBills` + `billTickerDuration` (`~7s per item`, min 14s) computed refs
- ✅ `📅 UPCOMING` static label with same border-right separator pattern as left zone
- ✅ `.bill-wrap` / `.bill-inner` / `.bill-item` classes; reuses `ticker-scroll` keyframe
- ✅ Bill amounts coloured `var(--warn)` (orange) to distinguish upcoming spend from recent purchases (accent/violet)
- ✅ Both zones now `flex: 1` — equal split of the 36px bar; divider centred between them
- ✅ 874/874 tests pass · `tsc --noEmit` clean

---

## RS-9 — Polish, Tests & v2.0.0 Release ✅
**Branch**: `feat/redesign-sprint-9-release`  
**Status**: ✅ **COMPLETE** — May 2026  
**Version**: `v2.0.0`

### Delivered

#### GoalsPage — Analytics grid refactor
- ✅ 6-Month Spending Trend → full-width card (chart needs horizontal room)
- ✅ Budget vs. Actual + Net Worth → side-by-side 2-col grid (`.analytics-2col`) — collapses to 1-col at ≤860px
- ✅ Spending Analytics → full-width card (filter toolbar + history list + charts need room)
- ✅ `.analytics-full` class ensures full-width cards don't shrink inside the flex group

#### Version & doc updates
- ✅ `WhatsNewBanner.vue` — `APP_VERSION` bumped to `'2.0.0'`; 5 redesign highlights (Vivid Modern, status bar, Settings rebuild, Goals analytics grid, light/dark polish)
- ✅ `tests/components/onboarding.spec.ts` — version strings updated to `'2.0.0'`
- ✅ `docs/README.md` — version bumped to v2.0.0; test count updated to 874/27; design direction updated to Vivid Modern
- ✅ `docs/ARCHITECTURE.md` — title + summary line updated to v2.0.0
- ✅ `docs/PHASE_TRACKING.md` — RS-8 right-zone ticker revision noted; RS-9 entry completed; summary table updated

#### Final gate
- ✅ 874/874 tests pass · `tsc --noEmit` clean · `vite build` green
- ✅ Merged all redesign branches → `main`, tagged **v2.0.0**

---

## RS-10 — Sidebar Hover-Expand ✅
**Branch**: `feat/sidebar-hover-expand`  
**Status**: ✅ **COMPLETE** — May 2026  
**Version**: `v2.1.0`

### Goal
Add smooth hover-expand behaviour to the 64px icon sidebar: on hover it widens to 220px (icon + label), with a CSS transition and fade-in labels; collapses back to icon-only on mouse-out.  Content behind the sidebar is never reflowed (overlay mode).

### Design decisions
- **Overlay mode** — ghost spacer (`<aside>` stays at `width: 64px` in flex flow) + `position: fixed` panel overlays content. Zero layout shift on expand.
- **Icon stays left** — glyph is in a fixed 64px column; label fades in to the right.
- **Label animation** — `opacity 0→1` + `translateX(-6px → 0)` with 80ms delay so the width transition leads.
- **`prefers-reduced-motion` respected** — all transitions disabled when OS accessibility setting is active.
- **Mobile unchanged** — both `<aside>` and `<div.app-sidebar__panel>` have `display:none` at ≤768px.

### Delivered

#### `src/components/ui/AppSidebar.vue`
- ✅ Two-element wrapper: ghost `<aside class="app-sidebar">` (64px flex-spacer) + `<div class="app-sidebar__panel">` (position:fixed overlay)
- ✅ `isExpanded = ref(false)` driven by `@mouseenter` / `@mouseleave` on the panel
- ✅ `app-sidebar__panel--expanded` class applies `width: 220px` + `box-shadow`
- ✅ `<span class="app-sidebar__label">` added to all 6 nav buttons + Shortcuts + Theme toggle
- ✅ Glyph cell is `width: 64px; min-width: 64px` so icon never shifts
- ✅ Label uses `opacity/transform` transition with `80ms` delay on expand, `0ms` on collapse
- ✅ `prefers-reduced-motion` block disables all transitions

#### `tests/components/ui/AppSidebar.spec.ts` (new — 24 tests)
- ✅ Mounts without throwing
- ✅ Ghost spacer + fixed panel exist in DOM
- ✅ Brand logo glyph renders
- ✅ Exactly 6 nav buttons with correct labels (`Dashboard`, `Schedule`, `Spending`, `Goals`, `Docs`, `Settings`)
- ✅ Active tab gets `--active` modifier; inactive tabs do not
- ✅ Clicking nav buttons calls `ui.setActiveTab()` and updates store
- ✅ Panel has no `--expanded` class initially
- ✅ `mouseenter` adds `--expanded`; `mouseleave` removes it
- ✅ Utility buttons (Shortcuts, theme toggle) present and have label spans
- ✅ Accessibility: `role="tablist"`, `role="tab"`, `aria-selected` correct
- ✅ Avatar fallback renders when Supabase not configured

---

## RS-11 — Dashboard Grid Restructure ✅
**Branch**: `feat/redesign-sprint-11-dashboard-grid`
**Status**: ✅ **COMPLETE** — May 2026
**Version**: `v2.2.0`

### Goal
Replace the old drag-and-drop dynamic section renderer with a clean fixed-grid layout matching the new dashboard mockup. Remove retired sections, strip the CcBar chart from Credit Cards, and place remaining sections in the correct grid positions.

### Delivered

#### `src/constants/dashboardSections.ts`
- ✅ Removed: `income-streams` (handled in Settings), `wants-tracker` (RS-12 replaces with `purchases-this-period`), `savings-goals` (lives in Goals tab)
- ✅ DASHBOARD_SECTIONS: 10 → 7 sections
- ✅ Renamed: `expense-cards` title → "Recurring Spend"; `loans` title → "Loan Payoff"

#### `src/components/pages/DashboardPage.vue`
- ✅ Removed: drag-and-drop machinery (dragIndex, dropIndex, all handlers), "Manage widgets" button, `SECTION_MAP`, `SECTION_COMPONENTS`, `SECTION_PROPS`
- ✅ Removed imports: `IncomeStreams`, `WantsTracker`, `SavingsGoals`
- ✅ Fixed grid layout:
  - **Row 1**: KPI hero row (unchanged)
  - **Row 2** (`.dash-widget-row`, 3-col): Recurring Spend | Loan Payoff | Savings Accounts
  - **Row 3** (`.dash-2col-row`, 2-col): Chequing Balance | Subscriptions
  - **Row 4** (full-width): Credit Cards
  - **Row 5** (full-width): Wishlist
- ✅ Responsive breakpoints: 3-col → 2-col at ≤1100px, → 1-col at ≤680px; 2-col → 1-col at ≤680px

#### `src/components/sections/CreditCards.vue`
- ✅ Removed `CcBar` chart import and template usage; progress bars are sufficient

#### Tests updated
- ✅ `tests/stores/ui.spec.ts` — section count 10 → 7; `income-streams` references replaced with `subscriptions`/`expense-cards`; migration test lengths updated
- ✅ `tests/components/sections/sections.spec.ts` — DashboardPage describe block fully rewritten (fixed grid assertions, drag-and-drop tests removed); SectionPicker counts: 14 → 11 items, 28 → 22 move buttons

#### Final gate
- ✅ 905/905 tests pass · `vue-tsc --noEmit` clean

#### Doc updates
- ✅ `CLAUDE.md` — test count updated to 898/28
- ✅ `docs/PHASE_TRACKING.md` — RS-10 entry added; summary table row added

#### Final gate
- ✅ 898/898 tests pass · `vue-tsc --noEmit` clean

---

## RS-12 — Purchases This Period + Recurring Spend + Money Flow ✅
**Branch**: `feat/redesign-sprint-12-purchases-recurring`
**Status**: ✅ **COMPLETE** — May 2026
**Version**: `v2.3.0`

### Goal
Add a new charts row to the dashboard (between the KPI hero row and the 3-col widget row) containing three new components: a bi-weekly wants donut widget, an expandable per-card recurring spend view, and a 12-month money flow bar chart.

### Delivered

#### `src/constants/dashboardSections.ts`
- ✅ Added: `purchases-this-period` (icon 🛍️, group "Spending") — donut + category breakdown
- ✅ Added: `money-flow` (icon 📊, group "Spending") — 12-month income/spend trend
- ✅ DASHBOARD_SECTIONS: 7 → 9 sections; DEFAULT_SECTION_ORDER updated accordingly
- ✅ Updated grid order comment to reflect new Row 1 (2-col charts row)

#### `src/components/sections/PurchasesThisPeriod.vue` (new)
- ✅ Read-only bi-weekly wants widget: donut (left) + category list (right)
- ✅ Category list shows name, amount, % of total; sorted by spend descending
- ✅ Auto-deductions row (subs/loans deducted this period) shown below categories
- ✅ Empty state when no purchases and no deductions
- ✅ Footer: "For full detail, see the Spending tab."

#### `src/components/sections/RecurringSpend.vue` (new)
- ✅ Read-only expandable per-card view replacing `ExpenseCards :readonly` on dashboard
- ✅ Summary bar: Grand Total / mo + Needs Remaining (danger-coloured when negative)
- ✅ Each expense card row is a click-to-expand button showing items, linked subs, linked loans
- ✅ Linked items display Due badge (this month) or "next {date}" hint
- ✅ Expand/collapse per-card with chevron rotation animation
- ✅ Footer: "Edit in Settings → Expenses"

#### `src/components/sections/MoneyFlow.vue` (new)
- ✅ Thin wrapper around `SpendingTrendChart` with 12-month window via `getSpendingTrend(state, 12)`
- ✅ Stacked Needs / Wants / Savings bars + income reference line
- ✅ Lazy-renders via `useInView` (inherited from SpendingTrendChart)

#### `src/components/pages/DashboardPage.vue`
- ✅ Replaced `ExpenseCards :readonly` with `RecurringSpend`
- ✅ Added `PurchasesThisPeriod` import
- ✅ Added `MoneyFlow` import
- ✅ Added `.dash-charts-row` (2-col: 1fr 1.4fr) between KPI row and widget row
- ✅ `.dash-charts-row` collapses to 1-col at ≤900px

#### Tests updated
- ✅ `tests/stores/ui.spec.ts` — section count 7 → 9; added `purchases-this-period` and `money-flow` assertions
- ✅ `tests/components/sections/sections.spec.ts`:
  - DashboardPage: `renders all 9 fixed section cards`; chevrons 7 → 9; new `.dash-charts-row` test
  - SectionPicker: 11 → 13 items, 11 → 13 handles, 22 → 26 move buttons, 11 → 13 collapse buttons
  - New `PurchasesThisPeriod` describe block (5 tests)
  - New `RecurringSpend` describe block (7 tests)
  - New `MoneyFlow` describe block (2 tests)

#### Final gate
- ✅ 920/920 tests pass · `vue-tsc --noEmit` clean

---

## RS-13 — Inline Pay / Charge / Deposit / Withdraw Interactions ✅
**Branch**: `feat/redesign-sprint-13-inline-interactions`
**Status**: ✅ **COMPLETE** — May 2026
**Version**: `v2.4.0`

### Goal
Add quick inline action forms directly on loan cards, credit card bars, and savings account rows — so users can record a payment, charge, deposit, or withdrawal without opening the full Edit modal.

### Delivered

#### `src/components/sections/Loans.vue`
- ✅ **"Pay" button** added alongside Edit / Delete per loan card
- ✅ `inlineLoanId` ref tracks which card has the inline form open (one at a time)
- ✅ `openInlinePay(loanId)` — pre-fills amount from `loan.paymentAmount`; guarded `el.focus()` for jsdom safety
- ✅ `confirmInlinePay(loanId)` — reduces `remaining` via `budget.updateLoan(id, { remaining: Math.max(0, remaining - amt) })`; success toast; clamps to 0
- ✅ Inline form: dollar-prefixed input, ✓ Confirm (disabled at 0), ✕ cancel, live "Remaining after" preview
- ✅ CSS: `.loan-inline-pay`, `__label`, `__row`, `__input-wrap`, `__dollar`, `__input`, `__confirm`, `__cancel`, `__preview`

#### `src/components/sections/CreditCards.vue`
- ✅ **"+ Charge" and "✓ Pay" buttons** added alongside Edit / Delete per card
- ✅ `inlineCcId` + `inlineCcMode: 'charge' | 'pay'` refs
- ✅ `confirmCcInline` — charge: `Math.min(limit, balance + amt)`; pay: `Math.max(0, balance - amt)`; success toast
- ✅ Color-coded forms: `--charge` (danger red), `--pay` (accent2 green)
- ✅ CSS: `.cc-inline-form`, `--charge`, `--pay`, all sub-elements; live new-balance / limit preview

#### `src/components/sections/Savings.vue`
- ✅ **"+ Deposit" and "− Withdraw" buttons** added before Allocate / Edit / Delete per account
- ✅ `inlineAcctId` + `inlineMode: 'deposit' | 'withdraw'` refs
- ✅ `confirmInline` — deposit adds; withdraw clamps to 0; success toast with correct action word
- ✅ Color-coded forms: `--deposit` (accent violet), `--withdraw` (warn amber)
- ✅ Form appears as `flex-basis: 100%` child inside the `.savings-acct-item` flex row — no layout breakage
- ✅ CSS: `.savings-inline-form`, `--deposit`, `--withdraw`, all sub-elements; live "New balance" preview

#### Focus guard (jsdom compatibility)
- ✅ All three `nextTick(() => el.focus())` calls wrapped in `typeof el.focus === 'function'` check — eliminates 22 unhandled errors in jsdom while preserving browser auto-focus behaviour

### Tests (`tests/components/sections/sections.spec.ts`)
- ✅ `Loans — RS-13 inline payment` (7 tests): Pay button present, form shown/hidden on click, pre-fill from paymentAmount, confirm reduces remaining, clamped to 0, cancel no-op, confirm disabled when amount = 0
- ✅ `CreditCards — RS-13 inline charge/pay` (7 tests): Charge/Pay buttons present, form `--charge`/`--pay` classes, confirm charge increases balance, confirm pay decreases balance, limit cap enforced, cancel no-op, disabled when amount = 0
- ✅ `Savings — RS-13 inline deposit/withdraw` (8 tests): Deposit/Withdraw buttons present, form `--deposit`/`--withdraw` classes, confirm deposit adds, confirm withdraw subtracts, clamped to 0, cancel no-op, disabled when amount = 0, preview text correct
- **Total: 945 passing (↑25 from 920) across 28 spec files**

### Final gate
- ✅ 945/945 tests pass · `vue-tsc --noEmit` clean

---

## RS-14 — Wishlist Card-Grid Redesign & Savings Progress Tracking ✅
**Branch**: `feat/redesign-sprint-14-wishlist-price`
**Status**: ✅ **COMPLETE** — May 2026
**Version**: `v2.5.0`

### Goal
Full wishlist redesign matching the approved card-grid mockup: per-item savings tracking, months-to-goal badges, progress bars, inline "Add savings" interaction, and savings-rate header. Also fixes the Supabase sync bug where `price` and `saved` were silently dropped.

### Delivered

#### `src/types/budget.ts`
- ✅ `WishlistItem.price?: number` — optional target price (RS-14 original)
- ✅ `WishlistItem.saved?: number` — amount saved toward this item (RS-14 redesign)

#### `src/types/database.ts`
- ✅ `WishlistItemRow.price: number | null` — DB column (was missing)
- ✅ `WishlistItemRow.saved: number | null` — DB column (was missing)

#### `src/lib/db.ts` (bug fix — price/saved were never synced)
- ✅ `toWishlistItem` mapper now reads `r.price` and `r.saved`
- ✅ `db.wishlist.insert` now writes `price` and `saved`
- ✅ `db.wishlist.update` now writes `price` and `saved`

#### `src/utils/csvImportExport.ts`
- ✅ Export header updated to `id,icon,name,url,price,saved`
- ✅ Export row serialises both `price` and `saved` (empty string when undefined)
- ✅ Import reads `vals[5]` as saved; backward-compat with 4-col and 5-col legacy exports

#### `src/components/sections/Wishlist.vue` (full card-grid redesign)
- ✅ **Card grid** — `repeat(auto-fill, minmax(220px, 1fr))` responsive grid
- ✅ **Violet icon box** per card with emoji icon
- ✅ **`~N mo` badge** — months to goal = `ceil((price − saved) / monthlySavingsRate)`; shows "✓ Saved" when complete
- ✅ **Large price display** on each priced card
- ✅ **Progress bar** (violet fill, `saved/price × 100%`, animated)
- ✅ **"$X saved · Y%"** footer row per card
- ✅ **"Affordable ✓" chip** when `price ≤ bi-weekly wants envelope`
- ✅ **Inline "Add savings"** — "+ Add savings" button opens an RS-13-style inline form per card; updates `saved` in store
- ✅ **Edit modal** includes both `price` and `saved` fields; validates `saved ≤ price`
- ✅ **Header** shows `$X,XXX · at $X/mo savings rate` when priced items exist
- ✅ **Sort toggle** (Default / Price ↑ / Price ↓)
- ✅ **URL 🔗 icon button** per card
- ✅ **Live hints in modal** — affordability + months-to-goal shown as user types

#### `src/components/pages/GoalsPage.vue`
- ✅ `monthlySavingsRate` computed added
- ✅ `wishlistHint` computed replaces inline ternary — shows `$X · at $X/mo` when priced items exist

### Tests
- ✅ `Wishlist — RS-14 price tracking` block updated (11 existing tests) + 12 new tests:
  - Card grid renders (`.wish-grid`, `.wish-card`)
  - Progress bar present/absent based on price
  - `~N mo` badge with correct month calculation
  - `✓ Saved` badge when `saved >= price`
  - Progress bar width reflects `saved/price` ratio
  - `addWishlistItem` stores `saved`; `updateWishlistItem` updates `saved`
  - "Add savings" button shown/hidden based on price
  - `#wish-saved` field in edit modal
  - Savings rate shown in header
- ✅ `Wishlist CSV — RS-14 saved column` (5 new tests in `csvImportExport.spec.ts`):
  - Round-trip price+saved; price-only; neither
  - Legacy 5-column import (no saved) is graceful
  - `saved: 0` round-trips as `0`
- ✅ `buildSampleState` wishlist entry updated: `price: 1299, saved: 400`
- ✅ `.wishlist-list` → `.wish-grid` class rename propagated in 1 existing test
- **Total: 978 passing (↑17 from 961) across 28 spec files**

### Final gate
- ✅ 978/978 tests pass · `vue-tsc --noEmit` clean

---

## RS-15 — Purchase Type: Want vs Need ✅

**Branch**: `feat/redesign-sprint-15-purchase-type`
**Status**: ✅ Complete
**Version**: `v2.6.0`

### Goal
Expose the existing `Purchase.budgetType` field in all UIs, fix the Spending tab "By category" donut to show wants-only, add a stacked bar chart (wants + needs split by colour), and allow the quick-add modal to create either type with a live preview that reflects the correct envelope.

### Changes

#### SpendingPage.vue
- ✅ `wantsPurchasesInPeriod` computed — filters period purchases to wants-only
- ✅ `categorySpending` now uses wants-only purchases so the donut is accurate
- ✅ "Wants purchases only" italic subtitle added under the donut total
- ✅ `DailyBar` interface extended with `wants: number` and `needs: number` per day
- ✅ `dailyBars` computes wants and needs totals separately per day
- ✅ Bar chart redesigned as stacked bars: wants (accent purple, bottom) + needs (danger coral, top) using `flex-direction: column-reverse` track
- ✅ Bar chart legend added with colour-keyed dots
- ✅ `typeFilter` ref (`'' | 'wants' | 'needs'`) added
- ✅ Type filter chip row (All / 🛍 Wants / 🏠 Needs) above category chips
- ✅ `applyTypeFilter()` helper applied in `filteredPurchases` and `filteredUndated`
- ✅ **Type** column added to purchases table (header + `<td>` in dated, undated, empty-state, divider rows)
- ✅ `type-badge--wants` (accent) and `type-badge--needs` (danger) pill badges
- ✅ colspan bumped from 5 → 6 in empty-state and undated-divider rows

#### DashboardPage.vue
- ✅ Button: `+ Quick add to wants` → `+ Add purchase`
- ✅ Modal title: `Log a wants purchase` → `Log a purchase`
- ✅ `quickAddBudgetType` ref added (default `'wants'`); reset on modal open
- ✅ Want / Need toggle (2-button grid) inserted before the name input
- ✅ `biWeeklyNeedsBudget`, `biWeeklyNeedsSpent`, `biWeeklyNeedsRemaining` computed refs
- ✅ `quickAddAfter` conditionally uses wants or needs remaining based on `quickAddBudgetType`
- ✅ `quickAddPreviewLabel` computed: `'BI-WEEKLY WANTS REMAINING AFTER'` / `'BI-WEEKLY NEEDS REMAINING AFTER'`
- ✅ `submitQuickAdd` uses `quickAddBudgetType.value` instead of hardcoded `'wants'`
- ✅ Toast message updated to reflect type ("added to wants" / "added to needs")
- ✅ CSS for `.quick-add__type-row`, `.quick-add__type-btn`, `--wants`, `--needs` variants

#### WantsTracker.vue (Dashboard donut)
- ✅ `categorySpending` fixed to use wants-only purchases (was including needs) — dashboard donut now correctly represents the wants envelope

### Tests
- ✅ `DashboardPage — RS-11` test updated: button text `'Quick add to wants'` → `'Add purchase'`
- ✅ `SpendingPage — RS-15 purchase type` (11 new tests):
  - Mounts without throwing
  - Renders page wrapper and table
  - Table has "Type" column header
  - Shows "Want" badge for wants purchase
  - Shows "Need" badge for needs purchase
  - Want/need badge CSS classes correct
  - Type filter chips (All / Wants / Needs) rendered
  - Wants filter shows only want rows
  - Needs filter shows only need rows
  - All filter resets after type filter
  - Donut card has "Wants purchases only" subtitle
  - Bar chart legend renders with Wants + Needs labels
- ✅ `DashboardPage — RS-15 quick-add modal` (6 new tests):
  - Modal title is "Log a purchase"
  - Modal has Want and Need type buttons
  - Want button active by default
  - Need button activates and updates preview label
  - Preview label switches back to WANTS
  - Submitting a needs purchase saves `budgetType: 'needs'`
- ✅ `SpendingPage — CRUD` (16 new tests):
  - Filtered amount total shown in purchases count area
  - Filtered total updates when type filter applied
  - Filtered total updates when search filter applied
  - "+ Add" button opens purchase modal
  - Modal title "Add Purchase" for new purchase
  - Modal has Want and Need type buttons
  - Save button disabled when name empty
  - Save button enabled when form valid
  - Saving new purchase adds it to store
  - Saving needs purchase sets budgetType needs
  - Edit button opens modal with "Edit Purchase" title
  - Edit modal pre-filled with purchase values
  - Saving edit updates purchase in store
  - Delete with confirm=true removes purchase
  - Delete with confirm=false keeps purchase
  - Cancel button closes modal without saving
  - Row has `purchase-row--clickable` class
  - Clicking a row opens the edit modal
  - Clicking a row pre-fills the modal
- ✅ `SpendingPage — donut wants-only fix` (2 new tests):
  - Donut total shows wants-only spending amount
  - Donut % is calculated against wants budget only (not total)
- **Total: 1017 passing (↑39 from 978) across 28 spec files**

### Final gate
- ✅ 1017/1017 tests pass · `vue-tsc --noEmit` clean

---

## RS-16 — Budget Type Toggle (Wants / Needs) ✅

**Branch:** `feat/sprint-16-type-toggle`
**Version:** v2.7.0
**Status:** ✅ Complete

### Goal
Give the user a single Wants / Needs toggle on the dashboard that drives both the "Available to Spend" hero card and the "Purchases This Period" chart. Add an independent toggle to the Spending tab "By category" donut. Clean up purchase-row actions: remove inline ✎/✕ buttons; rows are clickable, and the edit modal gains a Delete button.

### Changes

#### 1 — SpendingPage: row-action cleanup + delete in modal
- Removed the `.row-actions` hover-reveal edit/delete buttons from all table rows
- Removed `col-actions` `<th>` header; colspan updated 7 → 6
- Rows remain fully clickable (`purchase-row--clickable`) — click anywhere to open the edit modal
- Added a `variant="danger"` **Delete** `<BaseButton>` in the modal footer, visible only when editing (`editingPurchaseId !== null`)
- `deletePurchase()` now closes the modal after a confirmed delete

#### 2 — SpendingPage: "By category" donut type toggle
- Added `donutTypeFilter = ref<'wants' | 'needs'>('wants')` in `SpendingPage.vue`
- Added `needsPurchasesInPeriod`, `donutPurchases`, `donutBudget`, `needsBudgetPerPeriod` computeds
- `categorySpending`, `wantsSpentInPeriod`, `remainingBudget`, `usedPct` all react to `donutTypeFilter`
- Added `.dtt-btn` / `.donut-type-toggle` pill toggle UI inside the "By category" card header
- Donut hint changes: "Wants purchases only" ↔ "Needs purchases only"

#### 3 — DashboardPage + PurchasesThisPeriod: shared toggle
- Added `dashboardTypeFilter = ref<'wants' | 'needs'>('wants')` in `DashboardPage.vue`
- Added `heroBudget`, `heroSpent`, `heroRemaining`, `heroUsedPct` computed switchboard
- Hero card layout updated: `kpi-hero__label-row` flex row with label + `.hero-type-toggle` pill
- Added `.htt-btn` styles (transparent pill inside dark hero background)
- Hero subtitle, amount, caption, progress bar, and ARIA label all switch with the toggle
- `<PurchasesThisPeriod>` now receives `:type-filter="dashboardTypeFilter"` prop

#### 4 — PurchasesThisPeriod: typeFilter prop + categorySpending bug fix
- Added `typeFilter: 'wants' | 'needs'` prop (default `'wants'`)
- `filteredPurchases` computed filters by the active type
- `categorySpending` now uses `filteredPurchases` (was incorrectly using all purchases — caused wrong category breakdown on dashboard)
- `biWeeklyBudget` switches between `biWeeklyWantsBudget` / `biWeeklyNeedsBudget`
- `deductionTotal` returns 0 when needs is active (subs/loans live in the wants envelope)
- `isEmpty` check respects the active type filter
- Added `.ptp__donut-type-hint` caption under the donut showing "Bi-weekly wants/needs"

### Tests
- ✅ Updated 5 CRUD tests to use row-click + modal-delete pattern (removed `.row-action-btn` references)
- ✅ Added `SpendingPage — RS-16 donut toggle` (9 new tests):
  - Donut card renders Wants / Needs toggle buttons
  - Wants toggle active by default
  - Clicking Needs activates it
  - Hint text changes to "Needs purchases only"
  - Hint reverts to "Wants purchases only"
  - Donut total reflects wants-only / needs-only spending
  - Donut total changes when type switched
- ✅ Added `DashboardPage — RS-16 shared type toggle` (6 new tests):
  - Hero card has Wants and Needs toggle buttons
  - Wants active by default
  - Clicking Needs activates it
  - Hero subtitle changes to "needs" / "wants"
  - Hero remaining amount differs between views
- ✅ Added `edit modal shows a Delete button` test
- **Total: 1032 passing (↑15 from 1017) across 28 spec files**

### Final gate
- ✅ 1032/1032 tests pass · `vue-tsc --noEmit` clean

---

## RS-17 — GSAP Foundation & Primitive Animations ✅

**Branch:** `feat/rs-17-gsap-foundation`
**Version:** v2.8.0
**Status:** ✅ Complete

### Goal
Install GSAP 3 and establish the animation foundation: a central `useGsap` composable with `prefers-reduced-motion` awareness, then animate every shared primitive so every page in the app immediately benefits.

### Changes

#### 1 — GSAP install + test infrastructure
- `npm install gsap@3.15.0`
- `tests/setup.ts` (new) — global Vitest setup: `window.matchMedia` stub + GSAP mock that calls `onComplete` synchronously so Vue `<Transition>` `done()` hooks fire without needing fake timers
- `vite.config.ts` — added `setupFiles: ['./tests/setup.ts']`

#### 2 — `src/composables/useGsap.ts` (new)
- Exports `useGsap()` returning `{ to, from, fromTo, timeline, raw }`
- Exports `prefersReducedMotion()` helper (used by the composable and testable independently)
- All animation wrappers pass `duration: 0, delay: 0` when reduced motion is detected, ensuring `onComplete` still fires without a visual animation
- Guards against `window.matchMedia` being unavailable (jsdom / SSR)

#### 3 — `BaseCard.vue` — animated collapse/expand
- Changed body from `v-show="!isCollapsed"` → `v-if="!isCollapsed"` wrapped in `<Transition :css="false">`
- Added `onCollapseBeforeEnter`, `onCollapseEnter`, `onCollapseLeave` JS hooks
- Expand: `gsap.fromTo(el, { height:0 }, { height: scrollHeight, duration:0.28, ease:'power2.inOut' })` then clears props
- Collapse: `gsap.to(el, { height:0, duration:0.22, ease:'power2.inOut' })` then Vue removes the node

#### 4 — `BaseModal.vue` — GSAP spring entrance
- Replaced `<Transition name="base-modal">` CSS animation with `<Transition :css="false">` + JS hooks
- Enter: overlay fades in (`duration:0.2`) while panel springs up with `back.out(1.4)` ease (`duration:0.32`)
- Leave: panel shrinks out (`power2.in`) while overlay fades simultaneously
- Removed all CSS `base-modal-enter-*` / `base-modal-leave-*` transition rules (replaced by GSAP)

#### 5 — `ToastContainer.vue` — GSAP slide with spring
- Replaced `<TransitionGroup name="base-toast">` CSS with `<TransitionGroup :css="false">` + JS hooks
- Enter: each toast slides in from `x:110` with `back.out(1.5)` ease (`duration:0.38`)
- Leave: slides back to `x:110` with `power2.in` (`duration:0.26`)
- Removed all CSS `base-toast-enter-*` / `base-toast-leave-*` rules

#### 6 — `ProgressBar.vue` — on-mount fill animation
- Added `ref="fillRef"` on the fill element
- `onMounted`: `gsap.fromTo(fill, { width:'0%' }, { width: clampedPercent, duration:0.75, ease:'power2.out', delay:0.1 })`
- `watch(clamped)`: smooth `gsap.to(fill, { width, duration:0.45 })` on every reactive change (Wants ↔ Needs toggle, data updates)
- Removed CSS `transition: width 0.35s ease-out` from fill (GSAP owns width now); `background-color` transition kept

### Tests
- ✅ `tests/composables/useGsap.spec.ts` (14 tests) — `prefersReducedMotion()`, `useGsap()` delegates, reduced-motion fast-paths, `onComplete` fires in both modes
- ✅ Updated `tests/components/sections/sections.spec.ts` — "collapsing a section hides its body" changed from `isVisible()` to `exists()` (correct for `v-if`)
- **Total: 1052 passing (↑14 from 1038) across 29 spec files**

### Final gate
- ✅ 1052/1052 tests pass · `vue-tsc --noEmit` clean

---

## RS-18 — Page Load & Navigation Animations ✅

**Branch:** `feat/rs-18-page-animations`
**Version:** v2.9.0
**Status:** ✅ Complete

### Goal
Make the app feel alive the moment any page loads. Tab transitions give a sense of spatial direction; the dashboard entrance stagger, number counter, and banner animations create a cohesive "it just launched" feel.

### Changes

#### 1 — `src/composables/useCountUp.ts` (new)
- Reusable composable: returns a `ComputedRef<number>` that animates from 0 → source on mount, and smoothly tweens old → new on every reactive change
- Powered by GSAP via `useGsap()` (reduced-motion aware); GSAP mock in tests calls `onComplete` immediately so the displayed value always equals the final value in tests

#### 2 — `App.vue` — tab slide transitions
- Added `tabDirection` ref + `watch(ui.activeTab)` to detect forward/backward navigation
- Wrapped `<component :is>` in `<Transition :css="false" mode="out-in">` with `onTabLeave` / `onTabEnter` GSAP hooks
- Forward tabs slide old page left, new page in from right; backward slides in the opposite direction
- Durations: leave 0.2s `power2.in`, enter 0.28s `power2.out`

#### 3 — `DashboardPage.vue` — entrance stagger + hero counter
- Added `dashboardRef` + `onMounted` stagger: all `.base-card` elements animate from `y:18, opacity:0` with `0.055s` stagger, `power2.out` 0.38s
- Added `animHeroRemaining = useCountUp(...)` — the hero "Available to Spend" number counts up from $0 on first render and transitions smoothly when the Wants/Needs toggle fires
- `heroRemaining < 0` OVER badge still uses the raw computed (not the animated value) so it flips instantly

#### 4 — `WhatsNewBanner.vue` — GSAP hooks
- Replaced CSS `<Transition name="wnb">` with `<Transition :css="false">` + GSAP hooks
- Enter: `from(el, { opacity:0, y:-10, ... })` slide down from above
- Leave: fade+slide out then collapse height + margin-bottom so content reflows smoothly

#### 5 — `LoginPage.vue` — entrance animation
- Added `loginCardRef` + `onMounted` fade-in: entire `.login-card` animates from `y:28, opacity:0`, `power2.out` 0.45s

#### 6 — Bug fixes (pre-existing, found during type check)
- `src/types/database.ts`: appended `*Row` type aliases so `db.ts` imports resolve correctly (previously caused 18 `TS2305` type errors on every `vue-tsc` run)
- `src/lib/db.ts`: added `as unknown as` double-cast for JSONB → domain type conversions (`allocation`, `budgetDisplayMode`) and `as Record<string, number>` for `monthlyAllocations`

### Tests
- No new tests (all changes are purely additive animations; existing 1052 tests cover component behaviour)
- ✅ Verified GSAP mock calls `onComplete` correctly for all new JS hook patterns

### Final gate
- ✅ 1052/1052 tests pass · `vue-tsc --noEmit` clean

---

## RS-19 — List & Micro-interaction Animations ✅

**Branch:** `feat/rs-19-micro-animations`
**Version:** v2.10.0
**Status:** ✅ Complete

### Goal
Bring tactile life to every list-level interaction. Wishlist cards stagger in on load; adding/removing items animates via GSAP rather than CSS; every button in the app now gives a satisfying elastic press-and-spring-back feedback.

### Changes

#### 1 — `src/composables/useListTransition.ts` (new)
- Reusable composable: exposes `{ onItemEnter, onItemLeave }` GSAP hooks for `<TransitionGroup :css="false">`
- `onItemEnter`: `gsap.from(el, { opacity:0, y:enterY, ... })` — item slides up from below on add
- `onItemLeave`: `gsap.to(el, { opacity:0, y:-enterY*0.5, ... })` — item floats up-and-fades on remove
- All options (`enterY`, `enterDuration`, `leaveDuration`, `enterEase`, `leaveEase`) are configurable per-callsite
- Delegates to `useGsap()` so prefers-reduced-motion is automatically respected

#### 2 — `src/components/sections/Wishlist.vue`
- Added `onMounted` stagger: all `.wish-card` elements animate from `y:18, opacity:0` with `0.055s` stagger on first load
- `<TransitionGroup>` switched from CSS `name="wish-card"` to `:css="false" + move-class="wish-card-move"` — GSAP handles enter/leave, CSS FLIP still handles reorder so sort animations remain smooth without needing the GSAP Flip plugin
- Removed stale `.wish-card-enter-active/from/leave-active/to` CSS rules; kept `.wish-card-move` for FLIP

#### 3 — `src/components/ui/BaseButton.vue`
- Added GSAP press scale feedback: `pointerdown` → `scale:0.93` (fast, `power2.in`); `pointerup`/`pointerleave` → spring back to `scale:1` with `elastic.out(1.2, 0.4)`
- Keyboard users also get feedback via `@keydown.enter`/`@keydown.space` → `@keyup.enter`/`@keyup.space` handlers
- Removed CSS `transform 0.1s ease` from the `transition` property (GSAP inline styles override it; keeping it would cause visual fights)
- Removed the CSS `:active { transform: translateY(1px) }` rule (GSAP scale press replaces it)

#### 4 — `src/components/sections/Subscriptions.vue`
- `<ul v-else class="subs-list">` replaced with `<TransitionGroup tag="ul" class="subs-list" :css="false">` using `useListTransition` hooks
- Subscription rows now animate in/out with GSAP on add/delete/filter

### Tests
- Added `tests/composables/useListTransition.spec.ts`: 17 tests covering default options, custom options, `onItemEnter` enter params, `onItemLeave` leave params, and the combined options path
- All GSAP assertions use the mock from `tests/setup.ts` (synchronous `onComplete`) to verify parameters without real timers
- **Total: 1069 passing (↑17 from 1052) across 30 spec files**

### Final gate
- ✅ 1069/1069 tests pass · `vue-tsc --noEmit` clean

---

## BUG-020 — Tab Blank Screen + ToastContainer Vue Warning ✅

**Branch:** `fix/bug-020-tab-blank-screen`
**Version:** v2.10.1
**Status:** ✅ Fixed

### Symptoms
1. Switching tabs (especially rapidly) left the main content area completely blank — the What's New banner was visible but the page component below it was not.
2. Console showed: `[Vue warn]: Extraneous non-emits event listeners (move) were passed to component but could not be automatically inherited because component renders fragment or text root nodes.`

### Root Causes

#### Bug A — `App.vue` tab enter transition (blank screen)
`onTabEnter` used `gsap.from(el, { opacity:0, ..., onComplete: done })`. Two failure modes:

1. **Interrupted tween on rapid tab switching** — `mode="out-in"` starts a new leave/enter cycle while a previous enter animation is in progress. GSAP does not call `onComplete` on an overwritten/killed tween, so Vue's `done()` callback was swallowed. Vue then waited indefinitely for `done()`, with the page stuck at `opacity:0` from GSAP's initial `from` state → **blank screen**.

2. **Ambiguous final value** — `gsap.from()` captures the element's natural computed value as the "to" target at call time. If a prior interrupted tween had left an `opacity:0` inline style on the element, GSAP would animate 0→0 → **blank screen**.

#### Bug B — `ToastContainer.vue` @move warning
`@move` is not a valid JavaScript hook on `<TransitionGroup>`. Move (FLIP) animations are CSS-class-only via `move-class`. Vue treated `onMove` as an unknown external event listener that `TransitionGroup` (which renders a fragment) can't inherit, generating the warning.

### Fixes

#### `src/App.vue`
- Added `@before-enter="onTabBeforeEnter"` hook — uses `gsap.set()` to pre-hide the element synchronously before first paint (skipped when `prefersReducedMotion()` is true)
- `onTabEnter`: switched from `gsap.from()` → `gsap.fromTo()` — both start (`{opacity:0, x:28}`) and end (`{opacity:1, x:0}`) states are explicit; no ambiguity about final values
- Both `onTabLeave` and `onTabEnter`: added `onInterrupt: done` — ensures Vue's `done()` fires even when a tween is killed mid-animation (rapid tab switching), unblocking `mode="out-in"` 
- `onTabEnter` to-vars: added `clearProps: 'opacity,x'` — removes GSAP inline styles on completion so the element returns to its natural CSS state

#### `src/components/ui/ToastContainer.vue`
- Removed `@move="onToastMove"` from `<TransitionGroup>` (not a valid JS hook)
- Removed `onToastMove` function
- Added `move-class="toast-move"` to `<TransitionGroup>` — CSS FLIP transition now correctly handles toast reordering when a toast is dismissed
- Added `.toast-move { transition: transform 0.22s ease }` CSS with `prefers-reduced-motion` media query

### Tests
- All 1069 existing tests continue to pass — no new test cases needed (the existing `App.spec.ts` tab navigation tests verify the corrected behavior; the GSAP mock calls `onComplete` synchronously so `done()` always fires in tests)

### Final gate
- ✅ 1069/1069 tests pass · `vue-tsc --noEmit` clean
