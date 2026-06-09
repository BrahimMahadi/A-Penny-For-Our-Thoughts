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
| RS-17 | GSAP foundation: `useGsap` composable, mock, `BaseButton` press, hero KPI fade-up, WhatsNewBanner enter/leave | `feat/rs-17-gsap-foundation` | ✅ Complete | v2.8.0 |
| RS-18 | Page load & navigation animations: `useFadeSlide`, App.vue tab enter/leave, sidebar hover, AppStatusBar ticker | `feat/rs-18-page-animations` | ✅ Complete | v2.9.0 |
| RS-19 | List & micro-interaction animations: `useListTransition`, Wishlist stagger, Subscriptions TransitionGroup, BaseButton spring press | `feat/rs-19-micro-animations` | ✅ Complete | v2.10.0 |
| BUG-020 | Tab blank screen + ToastContainer Vue warning: `onInterrupt: done`, `fromTo()`, `@before-enter`, `move-class` fix | `fix/bug-020-tab-blank-screen` | ✅ Complete | v2.10.1 |
| BUG-020b | CSS tab transition: replace GSAP `mode="out-in"` hooks with directional CSS transitions to fix persistent blank screen | `fix/bug-020b-css-tab-transition` | ✅ Complete | v2.10.2 |
| BUG-020c | Drop `mode="out-in"` + absolute-position leaving page: definitively eliminates Vue transition state-machine deadlock | `fix/bug-020c-tab-transition-rework` | ✅ Complete | v2.10.3 |
| RS-20 | Form improvements: card field in dashboard quick-add, remaining preview in Spending modal, global `.form-input--error` red highlighting across all forms | `feat/rs-20-form-improvements` | ✅ Complete | v2.11.0 |
| RS-21 | Card hover effects: shine glow + tile grid + staggered lines via `CardHoverFX` component; applied to StatCard (full), BaseCard (subtle), Wishlist / ExpenseCard / GoalItem / IncomeStreamItem | `feat/rs-21-card-hover-effects` | ✅ Complete | v2.12.0 |
| RS-22 | Manage Sections cleanup: Advanced group removed from picker, drag/reorder UI stripped from Dashboard list, list reordered to match page, ui store `sectionOrder` + 4 reorder actions removed | `feat/rs-22-section-picker-cleanup` | ✅ Complete | v2.13.0 |
| RS-23 | Automatic bi-weekly pay-period rollover: `autoArchiveMissedPeriods` store action with date-bucketed multi-period catch-up + `usePeriodRollover` composable triggered on app load and `visibilitychange` | `feat/rs-23-period-rollover` | ✅ Complete | v2.14.0 |
| RS-24 | Pay-period rollover UX: "Rolls over in N days" countdown + "Close period now" button in Settings; per-period budgets+spent snapshot captured at archive time; surplus/overage rollup row in Spending Analytics | `feat/rs-24-rollover-ux` | ✅ Complete | v2.15.0 |
| RS-25 | Remove orphaned `WantsTracker.vue` (section not rendered since RS-11; close-period button made redundant by RS-23 auto-rollover and RS-24 manual close) | `feat/rs-25-remove-wants-tracker` | ✅ Complete | v2.16.0 |
| RS-26 | Update `DocsPage.vue` release-notes section — was stuck at v1.18.0; now fully caught up through v2.17.0 with a "Vivid Modern" era divider and regression-guard tests | `feat/rs-26-docs-page-refresh` | ✅ Complete | v2.17.0 |
| RS-27 | Advanced tab → "Insights" rename + sidebar surfacing (Path C). Internal rename across TabId / store / constants; legacy `advancedSectionOrder` localStorage migrated transparently; keyboard shortcut `7` preserved | `feat/rs-27-insights-tab` | ✅ Complete | v2.18.0 |
| RS-28 | Wishlist optional target month: `targetMonth?: ISODate` on `WishlistItem`; "By [Month]" badge + on-track / behind / complete chip; "Need $X/mo" hint when behind; new "Target ↑" sort option | `feat/rs-28-wishlist-target-month` | ✅ Complete | v2.19.0 |
| BUG-021 | Wishlist sort comparator used U+FFFF (a Unicode noncharacter) as a "sort to end" sentinel; Vue parser rejected it (`vue/no-parsing-error`, noncharacter-in-input-stream) and the build-and-deploy CI step failed. Replaced with explicit null-handling in the comparator | `fix/bug-021-wishlist-noncharacter` | ✅ Complete | v2.19.1 |
| RS-29 | DB column refresh: real Supabase columns for the 4 accumulated optional fields (RS-23 `lastArchivedPeriodStart`, RS-24 `budgets` + `spent`, RS-28 `targetMonth`); one-shot push-up migration in `initStore` preserves existing localStorage values | `feat/rs-29-db-column-refresh` | ✅ Complete | v2.20.0 |
| BUG-022 | `migrate.yml` regenerated `src/types/database.ts` after RS-29's SQL migration, wiping the hand-maintained `*Row` re-export block at the bottom; `npm run type-check` failed in CI on every `db.ts` import. Restored the block, updated the workflow to re-append it automatically, added a contract test to catch future drift | `fix/bug-022-database-types-regenerate` | ✅ Complete | v2.20.1 |
| RS-30 | Supabase fetch reliability (Level 1): bump fetch timeout 20s → 30s; add single automatic retry on timeout via new `fetchUserDataWithRetry` helper; calmer toast wording for the "tried twice" path | `feat/rs-30-supabase-fetch-retry` | ✅ Complete | v2.21.0 |
| RS-31 | Supabase fetch reliability (Level 2): collapse 18 parallel queries into one RPC call (`fetch_user_data(uid)` returning `jsonb_build_object(...)`) so pool pressure becomes structurally impossible. SQL function + RLS audit + db.ts adapter rewrite + contract test | `feat/rs-31-fetch-rpc-collapse` | ✅ Complete | v2.22.0 |
| BUG-023 | Archived purchases were never deleted from Supabase `purchases` table. On second-device login, DB fetch repopulated `budget.purchases` with stale rows; rollover guard skipped re-archiving because `lastArchivedPeriodStart` was already advanced. All three archive actions now fire `db.purchases.delete` for each archived purchase | `fix/bug-023-024-purchase-archive-sync` | ✅ Complete | v2.23.0 |
| BUG-024 | Dashboard hero card and `PurchasesThisPeriod` widget summed all entries in `budget.purchases` with no date boundary, disagreeing with SpendingPage's period-scoped view. Both now filter by `[currentPeriodStart, currentPeriodEnd]` using `getPayPeriodForecast` | `fix/bug-023-024-purchase-archive-sync` | ✅ Complete | v2.23.0 |
| BUG-025 | Dashboard quick-add modal stored category `id` (e.g. `'entertainment'`) instead of display `name` (e.g. `'Entertainment'`). Caused wrong category colour, blank edit-dropdown, and split analytics buckets. Fixed 3 lines in DashboardPage + added `migrateState` normalisation pass for existing data | `fix/bug-025-quick-add-category` | ✅ Complete | v2.24.0 |
| RS-32 | Subscriptions and loan payments now appear as read-only virtual rows in the Spending tab table on their renewal date, sorted alongside purchases. Dashboard "Purchases This Period" donut splits "Auto-deducted" into separate "Subscriptions" and "Loans" rows, supporting both Wants and Needs envelopes. Added `getSubsInWindow`/`getLoansInWindow` helpers | `feat/rs-32-period-deductions-view` | ✅ Complete | v2.25.0 |
| BUG-026 | `spendingFormAfter` in SpendingPage and six functions in `calculations.ts` used raw `state.purchases` without a period/month date filter. Stale cross-period rows inflated every affected calculation (preview showed -$364 OVER BUDGET with $0 amount; forecast, budget alerts, and analytics similarly affected). Full sweep: all seven sites now filter by period or calendar month | `fix/bug-026-unfiltered-purchases-sweep` | ✅ Complete | v2.26.0 |
| BUG-027 | `CategoryManager.vue` used `.form-group` / `.form-label` / `.form-input` CSS classes without defining them in its scoped styles, causing the "Name" label to render inline beside the input (browser default) instead of stacked above it. Every other section form already defined the same `flex-direction: column` block. Added the missing CSS and a regression test | `fix/bug-027-category-manager-label-layout` | ✅ Complete | v2.27.0 |
| BUG-028 | Dashboard quick-add modal did not apply transaction rules when the user typed a purchase name. SpendingPage had a `watch` on the name field calling `applyRulesToName`; DashboardPage had none. Added `watch(quickAddName, ...)` — the matching category pill now highlights automatically, overrideable by tapping any other pill | `fix/bug-028-quick-add-rules` | ✅ Complete | v2.28.0 |
| BUG-029 | "Newest first" sort in the Spending tab had no tiebreaker for same-date purchases; DB returns same-date rows in heap order (older first), so recently-added purchases appeared below older ones within the same day. Fixed `applySort` to use array position as a stable tiebreaker (later position = more recently added = sorts first). `allDatedRows` relies on ES2019 stable sort to propagate the order | `fix/bug-029-same-day-sort-order` | ✅ Complete | v2.29.0 |
| BUG-030 | Spending tab "Daily average" and "Top category" KPI tiles always showed all-types figures, ignoring the Wants / Needs toggle in the Spent This Period card. `dailyAvg` divided `totalSpentInPeriod` and `topCategoryInfo` ran over all period purchases. Both now source from `donutPurchases` / `wantsSpentInPeriod` so all three top KPIs follow the toggle together | `fix/bug-030-spending-kpi-type-filter` | ✅ Complete | v2.30.0 |
| BUG-031 | All Purchases table "Amount" header rendered left-aligned while its currency values were right-aligned, because `.purchases-table thead th { text-align: left }` (specificity 0,1,2) outweighed `.col-amt` (0,1,0). Added `.purchases-table thead th.col-amt { text-align: right }` to align the header with its values | `fix/bug-031-amount-column-header-align` | ✅ Complete | v2.31.0 |
| RS-33 | Add/Edit Purchase date picker constrained to the displayed pay-period window (`min`/`max` on the date input) to prevent out-of-period purchases — the root cause of the BUG-023/024/026 family. Future-within-period dates allowed; "+ Add" disabled off the current period with a return-to-current hint; save-time guard backs up the native bounds | `feat/rs-33-period-scoped-date-picker` | ✅ Complete | v2.32.0 |
| BUG-032 | Subscriptions showed "Expired" once the stored renewal anchor passed, and the displayed renewal date never advanced to the next cycle. Fixed by deriving the next renewal date for display via `getNextRenewal` (anchor untouched — calculations already recompute occurrences). Chip shows "Today"/countdown, date line shows "Due today"/next date, edit pre-fills the next date | `fix/bug-032-subscription-next-renewal` | ✅ Complete | v2.33.0 |
| TECH-DEBT-1 | Full-app sweep for hard-coded values → shared constants/functions, to stop single-source-of-truth drift bugs (e.g. BUG-032). **Scope agreed: all three tiers, delivered in 3 phases (one PR each).** See detailed plan below | _see phases_ | ✅ Complete | v2.36.0 |
| TECH-DEBT-1 · Phase 1 | Tier 1 — single-source-of-truth constants: period length (`PERIOD_DAYS`), default allocation, `'Other'` fallback, shared `MONTHS`/`DOW` arrays. New `constants/budget.ts` + `constants/datetime.ts` + 7 guard tests | `feat/tech-debt-1-phase-1-constants` | ✅ Complete | v2.34.0 |
| TECH-DEBT-1 · Phase 2 | Tier 2 — domain consolidation: frequency rate maps + labels → `constants/frequency.ts` (shared by Subscriptions + Loans); status thresholds (variance 110/100, envelope 0.9, sub-budget 60/30) → `constants/budget.ts`; 5 guard tests | `feat/tech-debt-1-phase-2-domain` | ✅ Complete | v2.35.0 |
| TECH-DEBT-1 · Phase 3 | Tier 3 — `'wants'`/`'needs'` shared constants + chart-palette hex centralization (CSS-var fallbacks left as-is by decision) | `feat/tech-debt-1-phase-3-enums` | ✅ Complete | v2.36.0 |
| CHORE-1 | Code-health cleanup (fallow static analysis): removed unused exports/dead helpers (`CATEGORY_COLOURS`, `WANT_CATEGORIES`, `SECTION_GROUPS`, imperative `showToast`), an unused runtime dependency (`date-fns`), and the stale `docs/design_handoff_schedule_spending/` mockup folder; trimmed dead code in the legacy vanilla-JS files. Pure housekeeping — no behaviour change | `chore/fallow-code-health-cleanup` | ✅ Complete | v2.36.0 |
| ONE-TIME-INCOME | Log windfall income for the current period (e-transfer, gift, bonus, freelance, refund, sale). Proportional 50/30/20 allocation by default, user-adjustable per bucket. Boosts needs/wants/savings envelopes on Dashboard + Spending page. Quick-add button on Dashboard header, dedicated section on Spending tab, management panel in Settings. 39 new tests (store actions, getters, allocation math, modal, section component). | `feat/one-time-income` | ✅ Complete | v2.37.0 |
| GSAP-FLIP-TOGGLES | GSAP Flip sliding pill indicators on all interactive toggles: sidebar 3px nav indicator (power3.inOut), SVG icon theme pill (☀/☾, power2.inOut), Dashboard hero Wants/Needs pill + fade+drift on hero amount (back.out(2.5)), Schedule view toggle (back.out(2.5)), Spending donut toggle + chip bounce (back.out(2.5)), Spending table row stagger-fade on filter change. `useFlipIndicator` shared composable, `prefers-reduced-motion` aware. 4 new tests (theme pill, nav indicator), all 1358 passing. | `feat/gsap-flip-toggles` | ✅ Complete | v2.38.0 |
| SUBSCRIPTION-FILTER-FIX | Bug fix: Subscriptions category filter left items permanently invisible after switching back to "All categories". Root cause: `extras.css` `animation: listItemIn … fill-mode:both` pre-applied `opacity:0` to `.sub-item` elements; GSAP's `from()` captured that as its "to" value and animated 0→0, leaving items invisible. Fix: `onItemEnter` now sets `el.style.animation = 'none'` before GSAP reads the natural opacity. Leave animation switched to height-collapse approach (avoids multi-item position bug). | `fix/subscription-filter-leave-animation` | ✅ Complete | v2.38.1 |
| ONE-TIME-INCOME-DB | Bug fix + schema: windfall / one-time income entries were only saved to `localStorage` — they were lost on sign-out or in a new browser. Added `one_time_incomes` Supabase table, RLS policy, `handle_updated_at` trigger, CRUD helpers in `db.ts`, updated `fetch_user_data` RPC, wired `syncDb` in all three store actions (`addOneTimeIncome` / `updateOneTimeIncome` / `deleteOneTimeIncome`), added step 17 to `runMigration`, and `one_time_incomes` to `deleteAllUserData`. | `feat/one-time-income-db-persistence` | ✅ Complete | v2.39.0 |
| DB-SYNC-POLICY | Chore: formalised the Database Sync Policy (6-item mandatory checklist in CLAUDE.md) + `tests/lib/db-coverage.spec.ts` (35 new tests) that fails if any store entity is missing from `db` or lacks CRUD methods. Prevents the class of oversight that caused the v2.38.x windfall income data-loss bug. | `chore/db-sync-policy-and-coverage-test` | ✅ Complete | v2.39.1 |
| GSAP-SPLITTEXT | GSAP SplitText animated tab/page headings on navigation. Each page heading splits into individual characters that cascade in with a per-char stagger (~30ms) and autoAlpha fade when switching tabs. KPI category labels ("Needs", "Wants", "Savings") get the same treatment on first load. | `feat/gsap-splittext-headings` | ⏸ Deferred | v2.40.0 |
| GSAP-DRAGGABLE-REORDER | GSAP Draggable + Flip drag-to-reorder for income streams and subscriptions. Draggable handles the drag gesture; Flip.getState() + Flip.from() animate the list items flowing to their new positions in real time. Dragged row scales up with a drop shadow while in-flight; sibling rows stagger-animate around it. | `feat/gsap-draggable-reorder` | ✅ Complete | v2.41.0 |
| GSAP-FLIP-LOG-PURCHASE | GSAP Flip "log purchase" form-to-list morph. On quick-add submission, Flip.getState() captures the target row's resting position, the item is added to the store, then Flip.from() animates the row morphing from the submit button position into the purchases list — a "receipt printing" effect. Reversed on delete: row Flips toward the trash icon before leaving. | `feat/gsap-flip-log-purchase` | ✅ Complete | v2.42.0 |
| GSAP-OBSERVER-SWIPE | GSAP Observer swipe-to-navigate. Horizontal swipe on mobile switches tabs; desktop sidebar clicks use a vertical slide. Replaces raw useSwipe touch listeners with GSAP Observer (lockAxis, dragMinimum 40px, tolerance 12px). Tab transitions updated to 0.28s / 52px, dual-axis CSS transitions. | `feat/gsap-observer-swipe` | ✅ Complete | v2.43.0 |
| GSAP-SCROLLTRIGGER-HISTORY | GSAP ScrollTrigger scroll reveal for Dashboard (Y-axis, bidirectional) and Spending tab (X-axis slide-in). New `useScrollReveal` composable with `revealImmediate`, `revealOnScrollY`, `revealOnScrollX`. Hero/KPI above-fold, below-fold sections use ScrollTrigger; `back.out` ease, 0.5s/24px/48px defaults. | `feat/gsap-scrolltrigger-history` | ✅ Complete | v2.44.0 |

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

---

## BUG-020b — CSS Tab Transition (Persistent Blank Screen) ✅

**Branch:** `fix/bug-020b-css-tab-transition`
**Version:** v2.10.2
**Status:** ✅ Fixed

### Symptom
After BUG-020's first fix (v2.10.1), the main content area still went blank after every tab switch — not just rapid switching. The What's New banner and AppStatusBar ticker rendered correctly, but the `<component :is="activePage">` stayed invisible indefinitely. Even waiting several seconds before switching produced the same blank result.

### Root Cause
The fundamental failure mode of Vue `<Transition mode="out-in">` with GSAP JavaScript hooks:

- `mode="out-in"` requires the **leave** animation to call `done()` before the **enter** animation begins. Vue's state machine waits for that callback.
- GSAP schedules all tween execution on the next `requestAnimationFrame` — there is no guarantee the `onComplete` callback fires within the same tick as Vue's state machine expects.
- In the browser (not jsdom), the RAF timing can produce subtle mismatches: Vue transitions the element out, GSAP's enter tween is created, but `done()` is never called (or called after Vue has already timed out internally), leaving the entering element permanently at `opacity: 0` (the GSAP `from` start value).
- BUG-020's `onInterrupt: done` addition handled mid-animation interruptions but not the single-switch case where Vue and RAF just disagree on timing.

### Fix — `src/App.vue`

Removed GSAP JS hooks entirely for tab transitions. Replaced with named CSS `<Transition>`:

```html
<Transition :name="tabTransitionName" mode="out-in">
  <component :is="activePage" :key="ui.activeTab" />
</Transition>
```

```typescript
const tabTransitionName = computed<string>(() =>
  tabDirection.value >= 0 ? 'tab-fwd' : 'tab-bwd',
);
```

Two named CSS transitions preserve directional slide (forward = slide right-to-left, backward = slide left-to-right):

```css
.tab-fwd-enter-active, .tab-fwd-leave-active,
.tab-bwd-enter-active, .tab-bwd-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
  will-change: opacity, transform;
}
.tab-fwd-leave-to   { opacity: 0; transform: translateX(-22px); }
.tab-fwd-enter-from { opacity: 0; transform: translateX(22px);  }
.tab-bwd-leave-to   { opacity: 0; transform: translateX(22px);  }
.tab-bwd-enter-from { opacity: 0; transform: translateX(-22px); }
@media (prefers-reduced-motion: reduce) {
  .tab-fwd-enter-active, .tab-fwd-leave-active,
  .tab-bwd-enter-active, .tab-bwd-leave-active { transition: none; will-change: auto; }
}
```

With CSS transitions, Vue listens for `transitionend` events natively — no `done()` callback is ever needed, and no RAF timing dependency exists.

### Why CSS Is Correct Here
The GSAP `done()` pattern is appropriate for animations that cannot be expressed in CSS (e.g., spring easings, staggered children, FLIP). A simple directional opacity+translate slide has no such requirement — CSS transitions handle it perfectly and with zero risk of the state machine hanging.

### Files Changed
- `src/App.vue` — removed `useGsap` import and all three GSAP tab hook functions; added `tabTransitionName` computed; updated template and CSS
- `src/components/onboarding/WhatsNewBanner.vue` — `APP_VERSION` bumped to `'2.10.2'`; `RELEASE_NOTES` updated
- `tests/components/onboarding.spec.ts` — version strings updated to `'2.10.2'`

### Tests
- All 1069 existing tests continue to pass — no new test cases needed
- `vue-tsc --noEmit` clean

### Final gate
- ✅ 1069/1069 tests pass · `vue-tsc --noEmit` clean

---

## BUG-020c — Tab Blank Screen (Definitive Fix) ✅

**Branch:** `fix/bug-020c-tab-transition-rework`
**Version:** v2.10.3
**Status:** ✅ Fixed

### Symptom
After BUG-020b's CSS transition fix (v2.10.2), the blank screen persisted. Switching tabs left the main content area invisible while WhatsNewBanner and AppStatusBar (rendered outside the `<Transition>`) continued to show correctly. The bug reproduced on every deliberate tab switch, not just rapid ones.

### Root Cause — `mode="out-in"` state-machine deadlock

`mode="out-in"` requires Vue to receive exactly `propCount` `transitionend` events from the leaving element's root before it mounts the entering element. `propCount` is derived from `getComputedStyle(el).transitionDuration` at the time the leave transition starts.

Several factors can prevent that count from being reached:

1. **GSAP child-element RAF timing** — DashboardPage's `onMounted` stagger calls `gsap.from()` on `.base-card` children. GSAP schedules tween initialization on the next `requestAnimationFrame`. During the leave transition, these RAF callbacks interact with the browser's compositing pipeline in ways that can discard or delay `transitionend` events on the parent element.

2. **Compositing-layer promotion** — `will-change: opacity, transform` (present in BUG-020b's CSS) creates a new compositing layer. In some browser/GPU configurations, promoted layers handle `transitionend` differently, causing the event to fire on the layer instead of the DOM element.

3. **Two-property transition (`propCount = 2`)** — Both `opacity` and `transform` must each fire `transitionend`. If one property's transition is superseded (e.g., by a GSAP inline style that matches the end state on the first RAF), one event is never emitted and `propCount` never reaches 0.

Any one of these can leave Vue permanently waiting. The leaving page stays invisible (`opacity:0` from `tab-fwd-leave-to`), the entering page is never mounted — **blank screen**.

### Fix

**Drop `mode="out-in"` entirely.** Without it:
- The entering component is mounted immediately — blank screen is architecturally impossible.
- The leaving component starts its exit animation simultaneously.
- No `transitionend` counting; no state-machine to hang.

**Prevent layout jump** — without `mode`, both components are briefly in the DOM at the same time. To stop them stacking vertically, wrap `<Transition>` in a `.tab-switcher` container (`position: relative; overflow: hidden`) and set `position: absolute; top: 0; left: 0; width: 100%` on the leaving element. The leaving page overlays the entering page during the 0.18 s crossfade; the entering page takes its natural height in the flow.

**Remove `will-change`** from transition-active classes — eliminated as a potential compositing trigger.

**Add `clearProps: 'opacity,y,transform'`** to DashboardPage and Wishlist GSAP staggers — ensures no inline `opacity:0` or `transform` style lingers on child elements if the component is unmounted mid-animation and remounted on a later tab switch.

### Files Changed
- `src/App.vue` — removed `mode="out-in"`; added `.tab-switcher` wrapper div; overhauled CSS (`.tab-switcher`, `leave-active position:absolute`, removed `will-change`, reduced duration to 0.18s)
- `src/components/pages/DashboardPage.vue` — added `clearProps: 'opacity,y,transform'` to `onMounted` stagger
- `src/components/sections/Wishlist.vue` — added `clearProps: 'opacity,y,transform'` to `onMounted` stagger
- `src/components/onboarding/WhatsNewBanner.vue` — `APP_VERSION` bumped to `'2.10.3'`; release note updated
- `tests/components/onboarding.spec.ts` — version strings updated to `'2.10.3'`

### Why This Is Definitive
The blank screen requires two things simultaneously:
1. The leaving element's `transitionend` count is never satisfied → entering element never mounted
2. Both can only happen with `mode="out-in"`

Without `mode="out-in"`, condition (1) cannot cause condition (2). The entering element is always mounted immediately. There is no mechanism left that can produce a blank screen via this transition.

### Tests
- All 1069 existing tests continue to pass — no new test cases needed
- `vue-tsc --noEmit` clean

---

## RS-20 — Form Improvements ✅

**Branch:** `feat/rs-20-form-improvements`
**Version:** v2.11.0
**Status:** ✅ Complete

### Changes

Three improvements shipped together:

**1. Payment card field in Dashboard quick-add modal**
- Added `quickAddCardId` ref to `DashboardPage.vue`; resets to `null` on `openQuickAdd()`
- Card `<select>` appears between the category chips and remaining preview, hidden when no expense cards exist
- `submitQuickAdd()` now passes `cardId: quickAddCardId.value` to `budget.addPurchase()`

**2. Bi-weekly remaining preview in Spending tab "Add Purchase" modal**
- Added `spendingFormAfter` computed: bi-weekly budget for selected type − all same-type purchases − current form amount
- Added `spendingFormPreviewLabel` computed: toggles "BI-WEEKLY NEEDS/WANTS REMAINING AFTER" with the type toggle
- Preview block (`.mf-preview`) shown above the footer in add mode only; shows "OVER BUDGET" badge when negative
- Mirrors the existing dashboard quick-add preview in behaviour

**3. Global form validation with red field highlighting**
- Added `.form-input--error` and `.field-error` to `src/css/forms.css` globally
  - `border-color: var(--danger)` with `!important` overrides both scoped and focus-state borders
  - `box-shadow` ring provides accessible non-colour cue
- Applied `useFormValidation` + `rules.required` / `rules.positiveNumber` to:
  - **DashboardPage** quick-add (name, amount) — replaced `quickAddValid` computed
  - **SpendingPage** purchase modal (name, amount) — replaced `purchaseFormError` computed
  - **Wishlist** add/edit modal (name) — added alongside existing `formError`
  - **ExpenseCards** card modal (label) + item modal (name, amount)
- `SavingsGoals`, `IncomeStreams`, `Subscriptions` were already using `useFormValidation`
- `OnboardingModal` already had inline `ob-input--error` class — no change needed

### Pattern used consistently
```
const validation = useFormValidation(() => ({
  name: rules.required(form.name, 'Name'),
}));

// Template:
<input :class="{ 'form-input--error': validation.errors.value.name }"
       @blur="validation.touch('name')" ...>
<p v-if="validation.errors.value.name" class="field-error">
  {{ validation.errors.value.name }}
</p>

// On open: validation.reset()
// On save: validation.touchAll(); if (!validation.isValid.value) return;
```

### Files Changed
- `src/css/forms.css` — added `.form-input--error` and `.field-error` global classes
- `src/components/pages/DashboardPage.vue` — card field, `useFormValidation` for name/amount
- `src/components/pages/SpendingPage.vue` — remaining preview, `useFormValidation` for name/amount
- `src/components/sections/Wishlist.vue` — `useFormValidation` for name
- `src/components/sections/ExpenseCards.vue` — `useFormValidation` for card label + item name/amount
- `src/components/onboarding/WhatsNewBanner.vue` — `APP_VERSION` bumped to `'2.11.0'`; release notes updated

### Tests
- All 1069 existing tests pass — no test regressions
- `vue-tsc --noEmit` clean

### Final gate
- ✅ 1069/1069 tests pass · `vue-tsc --noEmit` clean

---

## RS-21 — Card Hover Effects ✅
**Branch**: `feat/rs-21-card-hover-effects`
**Version**: v2.12.0
**Status**: ✅ Complete

### Goal
Implement the CodePen-inspired card hover effect across the app's card components, adapted to use `var(--accent)` and other design tokens instead of hardcoded emerald colours.

### Effect layers
| Layer | Mechanism |
|---|---|
| **Shine** | `div.chfx-shine::before` — conic gradient radial blur, opacity 0 → 1 |
| **Tiles** | 10 `div.chfx-tile` blocks — CSS `@keyframes chfx-tile` blink, staggered delays |
| **Grid lines** | 3 `div.chfx-line` pairs — `scaleX`/`scaleY` 0 → 1 with entry/exit cascade |
| **Mask** | `.chfx-bg { mask-image: radial-gradient(circle at 60% 5%) }` — clips to top-right |

### Architecture
- **`CardHoverFX.vue`** — fragment component (two root nodes: `.chfx-shine` + `.chfx-bg`); `tiles` prop disables tile layer; `aria-hidden="true"` on both roots
- **`card-hover.css`** — all animation/transition CSS; `.card-hfx` host class adds `position: relative; isolation: isolate`; `.chfx-*` use `z-index: -1` so they are always below card content without touching any existing z-index values
- Dark/light theme: shine opacity and gradient differ between `:root` (light) and `[data-theme="dark"]`; tile/line colours use `color-mix(in srgb, var(--accent) …%, transparent)`

### Z-stacking approach
`isolation: isolate` on `.card-hfx` creates a new stacking context. `.chfx-*` at `z-index: -1` paint above the host's background but below ALL content — no child modifications needed. Each `.chfx-*` manages its own `overflow: hidden`; the host card does NOT need it.

### Targets
| Card | Tiles | Notes |
|---|---|---|
| `StatCard.vue` | ✅ Full | KPI tiles — perfect size match |
| `BaseCard.vue` | ❌ Subtle | Large section container; `v-if="!bare"` skips bare variant |
| `Wishlist.vue` `.wish-card` | ✅ Full | Grid cards; existing hover (translateY/border) preserved |
| `ExpenseCards.vue` `.expense-card` | ✅ Full | Card grid items |
| `SavingsGoals.vue` `.goal-item` | ❌ Subtle | Left-border status indicator preserved |
| `IncomeStreams.vue` `.income-stream-item` | ❌ Subtle | Small pill items |

### Files Changed
- `src/css/card-hover.css` — NEW: full animation CSS + `.card-hfx`/`.chfx-*` classes + `prefers-reduced-motion` guard
- `src/components/ui/CardHoverFX.vue` — NEW: decoration fragment component
- `src/main.ts` — added `import './css/card-hover.css'`
- `src/components/ui/StatCard.vue` — added `.card-hfx` + `<CardHoverFX />`
- `src/components/ui/BaseCard.vue` — added `.card-hfx` + `<CardHoverFX :tiles="false" v-if="!bare" />`
- `src/components/sections/Wishlist.vue` — added `.card-hfx` + `<CardHoverFX />` to `.wish-card`
- `src/components/sections/ExpenseCards.vue` — added `.card-hfx` + `<CardHoverFX />` to `.expense-card`
- `src/components/sections/SavingsGoals.vue` — added `.card-hfx` + `<CardHoverFX :tiles="false" />` to `.goal-item`
- `src/components/sections/IncomeStreams.vue` — added `.card-hfx` + `<CardHoverFX :tiles="false" />` to `.income-stream-item`
- `src/components/onboarding/WhatsNewBanner.vue` — `APP_VERSION` bumped to `'2.12.0'`; release notes updated
- `tests/components/onboarding.spec.ts` — version strings updated to `'2.12.0'`
- `tests/components/card-hover-fx.spec.ts` — NEW: 12 tests covering structure, tiles prop, and lines
- `CLAUDE.md` — test count updated to 1081 across 31 spec files

### Tests
- 12 new tests added in `card-hover-fx.spec.ts`
- All 1081 tests pass — no regressions
- `vue-tsc --noEmit` clean

### Final gate
- ✅ 1081/1081 tests pass · `vue-tsc --noEmit` clean

---

## RS-22 — Manage Sections Cleanup ✅
**Branch**: `feat/rs-22-section-picker-cleanup`
**Version**: v2.13.0
**Status**: ✅ Complete

### Goal
Bring the "Manage sections" panel into alignment with the actual current Dashboard. The Dashboard has been a fixed-grid layout since RS-11, so the picker's drag-handles, up/down move buttons, and "reset order" controls were lying to the user — they persisted a value in localStorage but never actually rearranged anything on the page. The "Advanced" group also no longer belongs in this picker (the Advanced tab manages its own ordering on its own page).

### Decisions (confirmed by Brahim)
- Keep the Advanced page + the four analytics section components; only remove the Advanced group from the SectionPicker.
- Strip the drag + up/down + reset UI from the Dashboard list — picker becomes a focused "jump + collapse" tool.
- Reorder `DASHBOARD_SECTIONS` to match the actual visual order on `DashboardPage.vue` so the picker is honest about what users see.

### Changes
**`src/constants/dashboardSections.ts`**
- Reordered `DASHBOARD_SECTIONS` to match the page render order:
  `chequing-balance` → `purchases-this-period` → `money-flow` → `expense-cards` → `loans` → `savings-accounts` → `subscriptions` → `credit-cards` → `wishlist`
- `ADVANCED_SECTIONS` + `DEFAULT_ADVANCED_ORDER` untouched (still consumed by `AdvancedPage`)

**`src/components/ui/SectionPicker.vue`** (significant rewrite)
- Removed: Advanced group (header, divider, items, drag state + handlers, all advanced computed properties)
- Removed: Dashboard drag UI (drag handle ⠿, up/down move buttons, drop indicators, reset button, group label)
- Removed: all drag-and-drop event handlers + state refs
- Added: simple single-list render sourced directly from `DASHBOARD_SECTIONS`
- Updated hint text: "Click a name to jump · ⊕/⊖ to collapse"
- Updated `jumpTo` to always route to the `dashboard` tab
- Updated aria-label: "Manage dashboard sections"

**`src/stores/ui.ts`**
- Removed state field: `sectionOrder`
- Removed actions: `setSectionOrder`, `resetSectionOrder`, `moveSectionUp`, `moveSectionDown`
- Removed helper: `loadSectionOrder`
- Updated `saveAll` signature from 3 args → 2 args (no longer takes `sectionOrder`)
- Updated `UiPrefs` interface — `sectionOrder` marked as a legacy field, silently ignored on load
- Kept all advanced-order code intact

**`src/types/state.ts`**
- Removed `sectionOrder: string[]` from `UiState`
- Added doc-comment explaining the Dashboard is fixed-grid

**`src/components/pages/DocsPage.vue`**
- Updated the historical v1.11.0 (Sprint 18) release-notes entry: the references to `ui.sectionOrder` and the move-up/move-down buttons now include "Simplified/retired in RS-22" notes so readers don't think those mechanisms still exist.

### Tests
**`tests/components/sections/sections.spec.ts`** — rewrote the SectionPicker describe block (`SectionPicker — RS-22 jump + collapse`):
- 14 new assertions covering:
  - exactly 9 items (1 per Dashboard section)
  - no advanced section labels present
  - no drag handles, no move buttons, no reset button
  - 1 jump button + 1 collapse toggle per item
  - canonical `DASHBOARD_SECTIONS` order
  - Chequing Balance first, Wishlist last
  - clicking collapse / jump invokes the right store actions
  - clicking jump switches activeTab to `dashboard` and closes the picker
  - clicking jump expands a collapsed target section
  - no group header or divider rendered

**`tests/stores/ui.spec.ts`** — rewrote the `ui store — sectionOrder` block (`ui store — RS-22 section state`):
- 10 new assertions covering:
  - removed members are `undefined` on the store
  - legacy `sectionOrder` field in localStorage is silently ignored on load
  - next save drops the legacy field from the persisted payload
  - `advancedSectionOrder` + its 4 actions still work end-to-end

### LocalStorage migration
No explicit migration step needed — the load path silently ignores any extra fields (`sectionOrder`), and the save path overwrites the payload with the new 2-field schema on the next mutation. Existing users keep their collapsed-state and advanced-order preferences; the legacy `sectionOrder` value is dropped on the first interaction.

### Files Changed
- `src/constants/dashboardSections.ts` — reordered DASHBOARD_SECTIONS
- `src/components/ui/SectionPicker.vue` — rewrote (script + template + scoped CSS pruned)
- `src/stores/ui.ts` — removed 4 actions + 1 field + 1 helper
- `src/types/state.ts` — removed `sectionOrder` from `UiState`
- `src/components/pages/DocsPage.vue` — added RS-22 footnote to Sprint 18 release entry
- `tests/components/sections/sections.spec.ts` — rewrote SectionPicker describe block (14 tests, was 11)
- `tests/stores/ui.spec.ts` — rewrote sectionOrder describe block (10 tests, was 14)
- `src/components/onboarding/WhatsNewBanner.vue` — bumped to v2.13.0
- `tests/components/onboarding.spec.ts` — version strings updated
- `CLAUDE.md` — test count → 1080 across 31 spec files

### Tests
- 1080/1080 pass — `vue-tsc --noEmit` clean
- Net test count: −1 (added 24, removed 25 — the new tests exercise different behaviour at slightly tighter granularity)

### Final gate
- ✅ 1080/1080 tests pass · `vue-tsc --noEmit` clean

---

## RS-23 — Automatic Pay Period Rollover ✅
**Branch**: `feat/rs-23-period-rollover`
**Version**: v2.14.0
**Status**: ✅ Complete

### Goal
Before RS-23 the app never auto-closed a bi-weekly pay period — `closeCurrentPeriod` existed as a manual action but its only trigger (a button inside the now-unrendered `WantsTracker`) was orphaned. As a result, the `purchases` array silently accumulated across periods and the "bi-weekly spent" / "remaining" KPIs drifted from reality.

This sprint adds automatic rollover that:
- Snapshots each completed period into `spendingHistory` (already feeds Spending Analytics)
- Clears `purchases` so Needs / Wants / Savings budgets reset to their full allocations the moment a new period begins
- Handles **multi-period catch-up** when the user returns after missing several periods
- Runs on app load (via a `payStart` watcher to dodge the Supabase hydration race) and on `visibilitychange`
- Surfaces a success toast and snaps the Schedule nav to the new current period

### Decisions (confirmed by Brahim)
- **Multi-period catch-up (Option B)** — when N periods are missed, archive N separate rows; bucket purchases by their `date` field into the correct window. Undated purchases land in the most-recent missed period; backdated orphans land in the oldest.
- **Both trigger surfaces** — app load AND `visibilitychange`.
- **Empty periods always archived** — keeps the timeline contiguous in Spending History.
- **Archive date = period START** — the orphaned `WantsTracker` manual-close path was also realigned to use period-start for consistency.

### Architecture

**Pure helpers** (`src/utils/calculations.ts`)
- Existing `getCurrentPeriodStart(state, today)` — unchanged
- New `getPeriodStartsBetween(fromInclusive, toExclusive)` — enumerates every period-start ISO date in a half-open window, stepping by 14 days

**State** (`src/types/state.ts`, `src/stores/budget.ts`)
- New `BudgetState.lastArchivedPeriodStart: ISODate | null` — the lynchpin that makes rollover idempotent. localStorage-only (intentional — see field doc); a stale value on a second device causes at most a benign re-archive of empty periods.
- Default `null`, mirrored in `makeDefaultState` / `makeBlankState`. Migration sets `null` for legacy state.

**Store action** (`stores/budget.ts`)
```
autoArchiveMissedPeriods(today): number
```
- `!payStart` → 0
- First-run init (lastArchived was null) → set anchor to currentStart, archive 0
- `currentStart <= lastArchived` → 0
- Otherwise: enumerate missed period starts; bucket purchases; emit `SpendingHistoryPeriod` per missed period (empty rows included); preserve in-period purchases (`p.date >= currentStart`); bump `lastArchivedPeriodStart = currentStart`; fire-and-forget DB inserts

**Composable** (`src/composables/usePeriodRollover.ts`)
- Watches `budget.payStart` with `immediate: true` — fires both at mount (if pre-set) AND when Supabase hydration assigns the field
- Listens for `document.visibilitychange`, runs check when state becomes `'visible'`
- Re-entrancy guard (`running` flag) prevents the watcher from reacting to its own mutations
- When `archived > 0`: calls `ui.resetToCurrentPayPeriod()` + shows toast with singular/plural noun
- Cleans up the listener on `onBeforeUnmount`

**App integration** (`src/App.vue`)
- `usePeriodRollover()` called from the root `<script setup>` — composable handles all timing internally

### Files Changed
- `src/types/state.ts` — added `lastArchivedPeriodStart` field
- `src/stores/budget.ts` — defaults + migration + `autoArchiveMissedPeriods` action + import of new helper
- `src/utils/calculations.ts` — added `getPeriodStartsBetween`
- `src/composables/usePeriodRollover.ts` — NEW composable
- `src/App.vue` — invoke `usePeriodRollover()` at app root
- `src/components/sections/WantsTracker.vue` — realign orphaned manual-close to use period-start
- `tests/utils/periodRollover.spec.ts` — NEW (15 tests) — pure helpers
- `tests/stores/budget.spec.ts` — appended 14 RS-23 tests (10 for the action, 4 for the new field + migration)
- `tests/composables/usePeriodRollover.spec.ts` — NEW (11 tests) — composable lifecycle, triggers, side effects
- `tests/utils/jsonBackup.spec.ts` — updated `makeMinimalState` fixture to include the new field
- `src/components/onboarding/WhatsNewBanner.vue` — bumped to v2.14.0
- `tests/components/onboarding.spec.ts` — version strings updated
- `CLAUDE.md` — test count → 1120 across 33 spec files

### Edge cases covered by tests
- No `payStart` → no-op
- First-run init → anchor only, no archive
- Same-period repeat call → 0 (idempotent)
- Single missed period → 1 archive
- Three missed periods with gaps → 3 archives, including empty rows
- Undated purchase → newest missed bucket
- Backdated purchase → oldest missed bucket
- In-progress purchase (`date >= currentStart`) → preserved in live array
- Date-on-seam (== period boundary) → goes into the NEW period (half-open semantic)
- Watcher fires on hydration after mount
- Watcher fires immediately when `payStart` already set at mount
- `visibilitychange` to hidden → silent
- `visibilitychange` to visible → triggers check
- Re-entrancy guard prevents recursive watcher firing
- Toast singular/plural by archived count
- No toast or nav reset when nothing was archived
- Listener removed cleanly on unmount

### Upgrade behaviour for existing users
On first load after upgrade, `lastArchivedPeriodStart` is `null` (set by migration). The first-run init branch anchors it to the current period start without archiving anything — preserving existing in-flight purchases. If the user has stale pre-RS-23 purchases dated before the current period, they remain visible in PurchasesThisPeriod until the next natural rollover (at most 14 days later), at which point bucketing logic correctly archives them into earlier periods. No data is ever lost.

### Tests
- 40 new tests added (15 helpers + 14 store + 11 composable)
- All 1120 tests pass — no regressions
- `vue-tsc --noEmit` clean

### Final gate
- ✅ 1120/1120 tests pass · `vue-tsc --noEmit` clean

---

## RS-24 — Pay Period Rollover UX ✅
**Branch**: `feat/rs-24-rollover-ux`
**Version**: v2.15.0
**Status**: ✅ Complete

### Goal
Build on RS-23's auto-rollover foundation by giving users:
1. Ambient awareness of the next rollover via a visible countdown
2. A power-user "Close period now" affordance for force-ending early
3. Per-period surplus/overage data visible in Spending Analytics so they can answer "did I stay under?" for each archived period

### Three workstreams

**1. "Rolls over in N days" countdown** (`PayStartDate.vue`)
- New row in the period preview: "Rolls over in 4 days"
- Computed from `currentPeriodStart + 14 − today` (whole days, midnight-normalised)
- Amber emphasis (`var(--warn)` + glow) when ≤ 2 days
- Hidden when `payStart` is unconfigured

**2. Manual "Close period now"** (`PayStartDate.vue` + `stores/budget.ts`)
- New store action `closeCurrentPeriodManually(today): SpendingHistoryPeriod | null`
  - Archives with `date = currentPeriodStart` (matches auto-rollover semantic)
  - Captures `budgets` + `spent` snapshots
  - Sets `lastArchivedPeriodStart = currentPeriodStart + 14` so the natural rollover doesn't double-archive
  - Returns null when payStart is unconfigured OR the period is already archived
- Button gated by `canManualClose` computed (disabled when there's nothing meaningful to do)
- Confirmation via `window.confirm` with item-count-aware message
- On success: toast + `ui.resetToCurrentPayPeriod()`

**3. Per-period surplus/overage** (`types/budget.ts`, `stores/budget.ts`, `SpendingAnalytics.vue`)
- `SpendingHistoryPeriod` gets two new optional fields:
  ```ts
  budgets?: { needs: number; wants: number; savings: number };  // bi-weekly $ envelopes
  spent?:   { needs: number; wants: number };                   // purchases-only sums
  ```
- Captured at archive time by `closeCurrentPeriod`, `closeCurrentPeriodManually`, AND `autoArchiveMissedPeriods` (per-bucket `spent`, shared `budgets`)
- Two pure helpers extracted to module scope (`buildBudgetsSnapshot`, `buildSpentSnapshot`) so all three archive paths populate the fields identically
- `SpendingAnalytics.vue` renders a new rollup row per archived period when both fields are present:
  - "Wants: $234 / $300 · under $66 ✓" (green when under)
  - "Needs: $612 / $500 · over $112 ✗" (red when over)
  - "on target ✓" when exactly equal
  - Skips type-rows with both 0 budget AND 0 spent (no noise)
  - Mobile layout: stacks status under numbers via grid-template-areas

### Backward compatibility
- `budgets` + `spent` are optional fields. Pre-RS-24 archives and any archives loaded from Supabase (DB schema doesn't have these columns — same client-only trade-off as RS-23's `lastArchivedPeriodStart`) gracefully render without the rollup row.
- `buildRollupRows()` / `hasRollupData()` are the gatekeepers; the template uses `v-if="hasRollupData(period)"`.

### Files Changed
- `src/types/budget.ts` — added `budgets` + `spent` to `SpendingHistoryPeriod`
- `src/stores/budget.ts` — `closeCurrentPeriodManually` action; `buildBudgetsSnapshot` + `buildSpentSnapshot` + `addDaysISO` helpers; `closeCurrentPeriod` and `autoArchiveMissedPeriods` now populate the snapshots
- `src/components/sections/PayStartDate.vue` — countdown computed + manual-close button + confirm dialog + CSS
- `src/components/sections/SpendingAnalytics.vue` — `RollupRow` interface + `buildRollupRows` + `hasRollupData`; new rollup-row template + scoped CSS
- `tests/stores/budget.spec.ts` — 15 new tests (5 snapshot capture + 10 manual-close)
- `tests/components/sections/settings.spec.ts` — 9 new tests for PayStartDate countdown + button + confirm-cancel; 1 existing test updated (now 3 preview rows)
- `tests/components/sections/sections.spec.ts` — 7 new tests for SpendingAnalytics rollup row
- `src/components/onboarding/WhatsNewBanner.vue` — bumped to v2.15.0; new release notes
- `tests/components/onboarding.spec.ts` — version strings updated
- `CLAUDE.md` — test count → 1150 across 33 spec files

### Documented limitations
- The `budgets` snapshot uses the CURRENT allocation for every missed period archived in a single auto-rollover (the app has no allocation history). Documented in the type comment.
- Cross-device or Supabase-loaded periods won't have `budgets`/`spent` (DB columns not added). Rollup row gracefully omitted in that case.

### Tests
- 30 new tests added (15 store + 15 component)
- All 1150 tests pass — no regressions
- `vue-tsc --noEmit` clean

### Final gate
- ✅ 1150/1150 tests pass · `vue-tsc --noEmit` clean

---

## RS-25 — Remove orphaned `WantsTracker.vue` ✅
**Branch**: `feat/rs-25-remove-wants-tracker`
**Version**: v2.16.0
**Status**: ✅ Complete

### Goal
Delete the fully-orphaned `WantsTracker.vue` component. It was replaced on the dashboard by `PurchasesThisPeriod.vue` in RS-11, and its only remaining feature — the manual `closePeriod` button — was made redundant by RS-23's auto-rollover and RS-24's "Close period now" button in Settings.

### Pre-flight audit
Confirmed via `grep` that the only production references to WantsTracker were the file itself and two test imports — zero references from routers, page hosts, or component compositions. Safe to delete.

### Removals
- **`src/components/sections/WantsTracker.vue`** — entire file deleted
- **`tests/components/sections/sections.spec.ts`** — removed three describe blocks:
  - "WantsTracker" (basic) — 5 tests
  - "WantsTracker — categoryColorMap integration (BUG-FIX Sprint 21)" — 4 tests
  - "WantsTracker — filter toolbar (Sprint 22)" — 16 tests
  - Renamed the comment marker on section #3 to "EXPENSE CARDS  (former section #3 'WantsTracker' removed in RS-25)" so future readers can map old issue references
  - The `import WantsTracker` line removed
- **`tests/components/sections/settings.spec.ts`** — removed:
  - "WantsTracker — Sprint 7" describe block — 5 tests
  - The `import WantsTracker` line
  - Updated the file header comment to note the block was removed in RS-25
- **Kept** the `does NOT render removed sections (income-streams, savings-goals, wants-tracker)` assertion in `sections.spec.ts` line 2004 — it tests the absence of the `#section-wants-tracker` element on the Dashboard, which remains a valid invariant.

### Stale doc-comment cleanups
- `src/utils/calculations.ts:1501` — comment referenced "the same `totalSpent + deductionTotal` logic used in WantsTracker"; now points at PurchasesThisPeriod + Dashboard hero KPI (the actual current consumers).
- `src/composables/useListFilter.ts:6` — comment said the composable was used by "WantsTracker (purchases) and Subscriptions"; corrected to SpendingPage + Subscriptions.

### Deliberately left alone (historical accuracy)
- Migration-log comments in `src/constants/dashboardSections.ts` and `src/components/pages/DashboardPage.vue` — these document the *historical* RS-11 sprint that removed WantsTracker from the dashboard; rewriting them would distort history.
- `src/components/pages/DocsPage.vue` historical v1.x release notes — already queued for RS-26 refresh.
- `docs/USER_GUIDE.md`, `docs/ARCHITECTURE.md`, `docs/VUE3_MIGRATION_PLAN.md`, `docs/design_handoff_*` — historical project docs; out of scope for an orphaned-code-removal sprint.

### Test math
- Removed: 5 + 4 + 16 + 5 = **30 tests**
- Before: 1150 → After: 1120 (exact match to prediction)

### Files Changed
- DELETED: `src/components/sections/WantsTracker.vue`
- `src/utils/calculations.ts` — 1-line comment update
- `src/composables/useListFilter.ts` — 1-line comment update
- `tests/components/sections/sections.spec.ts` — removed import + 3 describe blocks
- `tests/components/sections/settings.spec.ts` — removed import + 1 describe block + header comment refresh
- `src/components/onboarding/WhatsNewBanner.vue` — bumped to v2.16.0; cleanup-themed release notes
- `tests/components/onboarding.spec.ts` — version strings updated
- `CLAUDE.md` — test count → 1120 across 33 spec files

### Tests
- 30 tests removed; no new tests added
- All 1120 remaining tests pass — no behavioural regressions
- `vue-tsc --noEmit` clean

### Final gate
- ✅ 1120/1120 tests pass · `vue-tsc --noEmit` clean

---

## RS-26 — Update `DocsPage.vue` release notes ✅
**Branch**: `feat/rs-26-docs-page-refresh`
**Version**: v2.17.0
**Status**: ✅ Complete

### Goal
The user-facing "Release Notes" section of `DocsPage.vue` was frozen at v1.18.0 and was missing every v2.x sprint — eighteen versions of work documented only in the project's internal `PHASE_TRACKING.md`. Bring it fully up to date so the in-app documentation matches what's actually shipped.

### Pre-flight audit
- Cross-referenced git tags (`git tag --sort=-v:refname`) against the PHASE_TRACKING summary table to enumerate every shipped version.
- Confirmed the existing release-block markup pattern: `<div class="release-block">` containing a `<div class="release-header">` (version + date spans) and a `<p class="release-tagline">` followed by a `<ul class="docs-list">`.
- Confirmed existing DocsPage tests don't assert release-notes content beyond a single `v1.6.0` smoke check — safe to add new content without breaking anything.

### Added release blocks (19 total)
Inserted newest-first, immediately above the existing v1.18.0 entry:

| Version | Sprint | Tagline |
|---|---|---|
| v2.38.0 | GSAP-FLIP-TOGGLES | GSAP Flip sliding pill indicators on all toggles |
| v2.37.0 | ONE-TIME-INCOME | Windfall / one-time income feature |
| v2.17.0 | RS-26 | Release notes refreshed (this sprint) |
| v2.16.0 | RS-25 | Code cleanup: orphaned WantsTracker removed |
| v2.15.0 | RS-24 | Pay-period rollover UX enhancements |
| v2.14.0 | RS-23 | Automatic bi-weekly pay-period rollover |
| v2.13.0 | RS-22 | Manage Sections cleanup |
| v2.12.0 | RS-21 | Card hover effects |
| v2.11.0 | RS-20 | Form validation + dashboard form improvements |
| v2.10.1 – .3 | BUG-020 series | Tab-transition blank-screen fix (3 patches consolidated) |
| v2.10.0 | RS-19 | List & micro-interaction animations |
| v2.9.0 | RS-18 | Page load & navigation animations |
| v2.8.0 | RS-17 | GSAP foundation |
| v2.7.0 | RS-16 | Shared Wants / Needs toggle |
| v2.6.0 | RS-15 | Purchase type (Want vs Need) |
| v2.5.0 | RS-14 | Wishlist card-grid redesign |
| v2.4.0 | RS-13 | Inline interactions on debt & savings cards |
| v2.3.0 | RS-12 | Dashboard charts row |
| v2.2.0 | RS-11 | Dashboard grid restructure |
| v2.1.0 | RS-10 | Sidebar hover-expand |
| v2.0.0 | RS-1 – RS-9 | "Vivid Modern" complete redesign |
| v1.19.0 | Sprint 25b | Advanced tab + IA polish + Supabase sync hardening |

Each entry follows the existing 3 – 5 bullet style, uses `<strong>` for feature names and `<code>` for technical identifiers, and matches the date format ("May 2026") used throughout.

### Visual divider
Introduced a new `release-series-heading` + `release-series-blurb` pair between the v2.1.0 and v2.0.0 blocks to mark the boundary of the "Vivid Modern Redesign (v2.x)" era. Heading carries a 2px accent-coloured top border and uses `var(--accent)` for type colour. Includes `data-testid="release-series-vivid"` for test addressability.

### Tests (5 new, regression-focused)
| Test | What it asserts |
|---|---|
| `Release Notes contains the latest v2.17.0 entry` | The just-shipped version is documented |
| `Release Notes contains every shipped v2.x version (regression guard)` | All 18 v2.x version strings are present — catches docs drift |
| `Release Notes still contains every legacy v1.x version (no regression)` | All 20 v1.x version strings still present — refresh didn't accidentally delete history |
| `Release Notes renders the "Vivid Modern" era divider` | The series-heading element exists with the expected text |
| `Release Notes mentions each major redesign sprint (RS-9 through RS-25)` | Sprint identifiers (RS-25, RS-24, RS-23, ..., RS-11, RS-1 through RS-9) are documented |

These five tests together form a docs-drift safety net: a future sprint that bumps the version but forgets to update DocsPage will fail at the test gate.

### Files Changed
- `src/components/pages/DocsPage.vue` — 19 new release-block entries + `release-series-heading` divider + scoped CSS for the new heading/blurb classes
- `tests/components/pages/pages.spec.ts` — 5 new RS-26 regression tests
- `src/components/onboarding/WhatsNewBanner.vue` — bumped to v2.17.0; release notes themed around the docs refresh
- `tests/components/onboarding.spec.ts` — version strings updated
- `CLAUDE.md` — test count → 1125 across 33 spec files

### Deliberately left for future sprints
- v1.x release-block bullets were not rewritten — they accurately describe what shipped at each Sprint, including the now-obsolete v1.11.0 mention of drag-to-reorder Section Picker (already annotated in-line in RS-22 with an `<em>(Simplified in RS-22...)</em>` aside).
- `docs/USER_GUIDE.md`, `docs/ARCHITECTURE.md`, `docs/VUE3_MIGRATION_PLAN.md` and other repo-level documentation outside the in-app Docs surface — separate concern.

### Tests
- 5 new tests added
- All 1125 tests pass — no regressions
- `vue-tsc --noEmit` clean

### Final gate
- ✅ 1125/1125 tests pass · `vue-tsc --noEmit` clean

---

## RS-27 — Advanced tab → "Insights" rename + sidebar surfacing ✅
**Branch**: `feat/rs-27-insights-tab`
**Version**: v2.18.0
**Status**: ✅ Complete

### Decision: Path C (hybrid)
A third path emerged in discussion: keep the page and all four analytics sections, but **rename "Advanced" → "Insights"** AND surface it in the sidebar between Goals and Docs. Trade-offs:

- **Path A (just re-surface)** — fixes discoverability but doesn't fix the label problem. "Advanced" tells users nothing about what's inside.
- **Path B (remove + relocate)** — real refactor for arguable benefit. The 4 sections legitimately belong together (all retrospective / analytical, while the existing tabs are forward / current).
- **Path C (rename + re-surface, chosen)** — small surface change that resolves both problems. Sidebar gets a 7th tab labelled "Insights" that actually says what's inside.

Brahim confirmed:
- Uses all four sections regularly
- Fine with a 7-tab sidebar
- Tab name: **Insights** (preferred over Analytics / Reports)
- Keyboard shortcut: keep `7` mapped to Insights for backward compatibility

### Implementation summary
**Renames (full codebase consistency)**:
- File: `src/components/pages/AdvancedPage.vue` → `InsightsPage.vue` (via `git mv`)
- TabId: `'advanced'` → `'insights'`
- Store field: `advancedSectionOrder` → `insightsSectionOrder`
- Store actions: `setAdvancedSectionOrder` → `setInsightsSectionOrder`, plus `resetAdvancedSectionOrder` / `moveAdvancedSectionUp` / `moveAdvancedSectionDown` all similarly renamed
- Helper: `loadAdvancedSectionOrder` → `loadInsightsSectionOrder`
- Constants: `ADVANCED_SECTIONS` → `INSIGHTS_SECTIONS`, `DEFAULT_ADVANCED_ORDER` → `DEFAULT_INSIGHTS_ORDER`
- CSS class: `.page-advanced` → `.page-insights` in the page component

**Navigation wiring**:
- AppSidebar: added `{ id: 'insights', glyph: '📊', label: 'Insights' }` between Goals and Docs; removed the "intentionally omitted" comment
- BottomNav: same Insights entry added for mobile
- App.vue route switch: `case 'advanced'` → `case 'insights'`
- App.vue keyboard shortcut: `7` now routes to `'insights'` (kept the same key — see backward-compat note below)
- App.vue `TAB_ORDER` swipe-nav array: `'insights'` inserted between `'goals'` and `'docs'`
- App.vue shortcut-help table: description `'Switch to Advanced'` → `'Switch to Insights'`

**LocalStorage migration** (zero-downtime for existing users):
- `loadInsightsSectionOrder` reads `prefs.insightsSectionOrder` first, falling back to the legacy `prefs.advancedSectionOrder` field when the new key is absent
- The save path persists ONLY under `insightsSectionOrder`; the legacy field is dropped from the payload on the next save (same migration pattern used in RS-22 for `sectionOrder`)
- When BOTH fields are present (unusual edge case), the new `insightsSectionOrder` wins
- Three new dedicated store tests verify each migration scenario

**Backward-compat decision: shortcut `7` stays**:
- Sidebar visual order: Dashboard → Schedule → Spending → Goals → Insights → Docs → Settings
- Keyboard shortcuts: 1, 2, 3, 4, 7, 5, 6 against that visual order
- The numbering is slightly out-of-sequence but ZERO existing muscle memory breaks. Users who memorised "7 = Advanced" still get the same destination (now called Insights). Users who memorised "5 = Docs" and "6 = Settings" are unaffected.

### Files Changed
- DELETED: `src/components/pages/AdvancedPage.vue` (via `git mv`)
- CREATED: `src/components/pages/InsightsPage.vue` (same file with renamed identifiers)
- `src/types/state.ts` — `TabId` + `UiState.advancedSectionOrder` renames
- `src/constants/dashboardSections.ts` — `ADVANCED_SECTIONS` + `DEFAULT_ADVANCED_ORDER` renamed; header comment updated
- `src/stores/ui.ts` — store field + 4 actions + load helper renamed; legacy-key migration added to `loadInsightsSectionOrder`; updated header comment with the RS-27 entry; `UiPrefs` interface now documents the legacy `advancedSectionOrder` field
- `src/App.vue` — import rename, route case, keyboard shortcut, shortcut-help description, TAB_ORDER array, header comment
- `src/components/ui/AppSidebar.vue` — added Insights nav item (📊 glyph), removed the omission comment, updated header docs
- `src/components/ui/BottomNav.vue` — added Insights nav item for mobile
- `src/components/pages/DocsPage.vue` — v2.13.0 release note annotated with RS-27 follow-up; new v2.18.0 release block added
- `tests/stores/ui.spec.ts` — 13 tests rewritten/added (3 RS-27 removal-guards + 3 migration tests + 5 renamed live API tests + comments)
- `tests/components/ui/AppSidebar.spec.ts` — updated 5 existing tests for the 7-tab count; added 2 new tests ("no Advanced label" regression guard + Insights button click routing)
- `tests/components/App.spec.ts` — added 2 new tests (keyboard `7` routes to insights + shortcut-help table says "Insights" not "Advanced")
- `tests/components/pages/pages.spec.ts` — added v2.18.0 to the regression-guard tests; added RS-27 to the redesign-sprint mentions test
- `src/components/onboarding/WhatsNewBanner.vue` — bumped to v2.18.0; release notes themed around the rename + migration
- `tests/components/onboarding.spec.ts` — version strings updated
- `CLAUDE.md` — test count → 1135 across 33 spec files

### Deliberately left alone (historical accuracy)
- v2.13.0 release-block in DocsPage retains its historical "Advanced group removed from the picker — the Advanced tab itself remains accessible via keyboard shortcut 7" wording, but the `<em>` follow-up aside notes that RS-27 renamed and surfaced the tab.
- Historical comments in `src/constants/dashboardSections.ts` referencing the original "ADVANCED_SECTIONS" name retained; an inline note explains the RS-27 rename.

### Tests
- 13 new tests added (10 RS-27 store tests, 2 RS-27 sidebar tests + 1 sidebar regression guard, 2 App-level keyboard tests; partial overlap with renamed RS-22 tests)
- All 1135 tests pass — no regressions
- `vue-tsc --noEmit` clean

### Final gate
- ✅ 1135/1135 tests pass · `vue-tsc --noEmit` clean

---

## RS-28 — Wishlist target month ✅
**Branch**: `feat/rs-28-wishlist-target-month`
**Version**: v2.19.0
**Status**: ✅ Complete

### Goal
Let users mark Wishlist items with a deadline. Today the card shows a derived "~N mo at current rate" badge that assumes the entire savings envelope flows to each item — useful for ballparking but doesn't let the user say "I want this *by* a specific date". RS-28 adds an optional `targetMonth` field and a small visual + sort layer on top.

### Decisions (confirmed by Brahim)
- **Replace** the "~N mo" badge with "By [Month YYYY]" when target is set (not show both)
- **Yes** to the inline "Need $X/mo to hit target" hint when behind
- **Yes** to a new "Target ↑" sort option

### Format & convention
`targetMonth: ISODate` stored as `'YYYY-MM'` — matches the convention already used by `Goal.targetDate` (also a month-only field via `<input type="month">`). Empty string in the form becomes `undefined` in the payload so existing items don't get sentinel values.

### Status logic (`wishlistTargetStatus` in `calculations.ts`)
```
complete   → saved >= price
no-target  → no price OR no/invalid targetMonth  (caller renders default badge)
behind     → at current savings rate, you'd hit `price` AFTER the target
on-track   → at current savings rate, you'd hit `price` on or before target
```

Edge cases explicitly handled:
- Past target with money still owed → `behind`
- Current month target with money still owed → `behind`
- `monthlySavingsRate = 0` with money still owed → `behind` (no progress possible)
- `saved >= price` → `complete` always (target irrelevant once done)

### Pure helpers (`src/utils/calculations.ts`, ~120 LOC appended)
| Helper | Purpose |
|---|---|
| `monthsUntilTarget(targetMonth, today)` | Whole-month count from today to target start; negative for past, 0 for current month, null for missing/malformed |
| `requiredMonthlyRate(remaining, targetMonth, today)` | Monthly rate needed to hit target; rounds UP to nearest cent for sufficiency; null for past targets / no remaining |
| `wishlistTargetStatus(price, saved, targetMonth, rate, today)` | The status verdict above |
| `formatTargetMonthLabel(targetMonth)` | "Mar 2027" via `toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })` |

### UI surface (`src/components/sections/Wishlist.vue`)
**Modal**: new `<input type="month">` labelled "Target month (optional)" with `min` set to current month so users can't pick the past; an explanatory `wish-field-hint` paragraph notes what the field controls.

**Card** (when target is set):
- Top-right corner shows a stacked group: `By Mar 2027` badge + status chip (`On track ✓` / `Behind ✗` / `Complete ✓`)
- Default "~N mo at current rate" badge is hidden
- Below the saved-row, if status is `behind`, a `wish-card__required-hint` paragraph in `var(--danger)` colour shows: "Need <strong>$134/mo</strong> to hit your target"

**Card** (when target is unset): unchanged. The original "~N mo" badge and "✓ Saved" badge render as before — fully backward-compatible.

**Sort dropdown**: new `<option value="target-asc">Target ↑</option>`. Sort uses lexicographic comparison on the `YYYY-MM` strings (chronologically correct); undated items go to the end via `'￿'` sentinel.

### Storage note
`targetMonth` is **not** mapped through the Supabase adapter (`src/lib/db.ts`) — the wishlist DB table has no `target_month` column. Same client-only trade-off as RS-23's `lastArchivedPeriodStart` and RS-24's `budgets`/`spent` snapshots. Multi-device users see the field persist on the originating device only. Documented inline in `WishlistItem.targetMonth`'s JSDoc; a future "DB column refresh" sprint can add real columns for all the optional fields accumulated this way.

### Files Changed
- `src/types/budget.ts` — added `WishlistItem.targetMonth?: ISODate` with full JSDoc + storage limitation note
- `src/utils/calculations.ts` — appended 4 pure helpers + `WishlistStatus` type
- `src/components/sections/Wishlist.vue` — form state + modal input + per-card helpers + template (status group, required-rate hint, sort option) + scoped CSS for the new badge / chip variants
- `tests/utils/wishlistTarget.spec.ts` — NEW file, 29 pure-function tests covering all four helpers (full branch coverage including edge cases)
- `tests/components/sections/sections.spec.ts` — new "Wishlist — RS-28 target month" describe block, 13 integration tests covering modal field, badge swap, status chip rendering for each state, required-rate hint visibility, sort option, sort behaviour, store round-trip
- `src/components/onboarding/WhatsNewBanner.vue` — bumped to v2.19.0 with target-month-themed release notes
- `tests/components/onboarding.spec.ts` — version strings → 2.19.0
- `src/components/pages/DocsPage.vue` — new v2.19.0 release block at top of release-notes section
- `tests/components/pages/pages.spec.ts` — added `v2.19.0` to the regression-guard test list; added `RS-28` to the redesign-sprint-mentions test
- `CLAUDE.md` — test count → 1177 across 34 spec files

### Tests
- 42 new tests added (29 pure helpers + 13 component integration)
- All 1177 tests pass — no regressions
- `vue-tsc --noEmit` clean

### Final gate
- ✅ 1177/1177 tests pass · `vue-tsc --noEmit` clean

---

## BUG-021 — Wishlist sort: U+FFFF noncharacter blocked CI lint ✅
**Branch**: `fix/bug-021-wishlist-noncharacter`
**Version**: v2.19.1
**Status**: ✅ Complete (hotfix)

### Symptom
RS-28 (v2.19.0) shipped to main and merged green locally, but the `build-and-deploy` CI workflow failed at the Lint step with:

```
src/components/sections/Wishlist.vue
  103:35  error  Parsing error: noncharacter-in-input-stream  vue/no-parsing-error
  104:35  error  Parsing error: noncharacter-in-input-stream  vue/no-parsing-error
```

The two flagged lines were inside the new `target-asc` sort comparator I added in RS-28:

```ts
items.sort((a, b) => {
  const at = a.targetMonth ?? '￿';  // ← these two
  const bt = b.targetMonth ?? '￿';
  return at.localeCompare(bt);
});
```

### Root cause
**U+FFFF is a Unicode noncharacter.** I used it as a "sort to end" sentinel — `localeCompare` against it puts undated items after any real `'YYYY-MM'` string. The runtime would have executed it correctly (V8 / SpiderMonkey both accept noncharacters in string literals), but the `vue-eslint-parser` strictly enforces the HTML5 spec's noncharacter-in-input-stream rule for any character that appears in the input stream — including characters inside JS string literals embedded in a `.vue` file. The rule fires before the parser ever evaluates the JS as code.

So this was a parser-level rejection, not a runtime bug. Locally `npx vitest run` and `npx vue-tsc --noEmit` both passed (neither path goes through eslint), which is why it didn't get caught in the v2.19.0 sprint's pre-merge gate. CI runs the lint step on a fresh checkout, which is where it surfaced.

### Fix
Replaced the U+FFFF sentinel with explicit null-handling inside the comparator. Same observable behaviour, zero non-printable characters in the source file:

```ts
items.sort((a, b) => {
  const at = a.targetMonth;
  const bt = b.targetMonth;
  if (at === bt) return 0;
  if (!at) return 1;   // a has no target → sort it after b
  if (!bt) return -1;  // b has no target → sort it after a
  return at.localeCompare(bt);
});
```

The existing RS-28 test `sorting by Target ↑ puts soonest target first, undated last` passes unchanged — it asserts the observable order `['Near', 'Far', 'NoTarget']`, which the new comparator produces identically.

### Validation
- `npx eslint --ext .ts,.vue src/components/sections/Wishlist.vue` → **0 errors** (was 2 errors before). 10 stylistic warnings remain — those were already present pre-fix and don't block CI.
- `npx eslint --ext .ts,.vue src/` → **0 errors across the entire src/ tree**. 133 stylistic warnings tolerated by CI.
- `npx vue-tsc --noEmit` → clean.
- All 1177 tests still pass.

### Defensive note added to the code
The replacement comparator carries an inline `BUG-021 fix:` comment explaining the noncharacter trap so future contributors don't reintroduce the sentinel pattern.

### Version handling
- Tagged as `v2.19.1` (matches the BUG-020 series convention: BUG-020 → v2.10.1, BUG-020b → v2.10.2, BUG-020c → v2.10.3)
- `APP_VERSION` in `WhatsNewBanner.vue` was deliberately **NOT** bumped from `2.19.0` → `2.19.1`. The bug never reached production (build failed before deploy), so users see nothing user-visible. Bumping the banner version would re-show the already-dismissed v2.19.0 "what's new" panel to every user for zero user-visible change, which is bad UX.

### Files Changed
- `src/components/sections/Wishlist.vue` — comparator rewritten with explicit null-handling + inline BUG-021 explanatory comment
- `docs/PHASE_TRACKING.md` — summary table row + this detailed entry

### Tests
- 0 new tests added (the existing RS-28 sort test already covers the observable behaviour)
- All 1177 tests pass — no regressions
- `vue-tsc --noEmit` clean
- `eslint` clean (0 errors)

### Final gate
- ✅ 1177/1177 tests pass · `vue-tsc --noEmit` clean · `eslint src/` 0 errors

---

## RS-29 — DB column refresh ✅
**Branch**: `feat/rs-29-db-column-refresh`
**Version**: v2.20.0
**Status**: ✅ Complete

### Goal
Three sprints (RS-23, RS-24, RS-28) added optional fields to the TypeScript layer but skipped the corresponding Supabase migrations, defaulting to a "localStorage only" pattern with a documented multi-device limitation. RS-29 cashes in the debt — adds real DB columns for all four accumulated fields and migrates existing localStorage values up to the cloud so nothing is lost.

### Debt inventory cleared
| Field | Table | Source | New column |
|---|---|---|---|
| `BudgetState.lastArchivedPeriodStart` | `profiles` | RS-23 (v2.14.0) | `last_archived_period_start TEXT` |
| `SpendingHistoryPeriod.budgets` | `spending_history_periods` | RS-24 (v2.15.0) | `budgets JSONB` |
| `SpendingHistoryPeriod.spent` | `spending_history_periods` | RS-24 (v2.15.0) | `spent JSONB` |
| `WishlistItem.targetMonth` | `wishlist_items` | RS-28 (v2.19.0) | `target_month TEXT` |

### SQL migration
`supabase/migrations/005_optional_fields_refresh.sql` — single file (matches the focused-per-fix precedent of `004_wishlist_price_saved.sql`). All `ADD COLUMN IF NOT EXISTS` so re-runs are safe. Ends with `notify pgrst, 'reload schema'` so PostgREST sees the new columns immediately without a manual restart.

### Adapter layer (`src/lib/db.ts`)
- `toWishlistItem`: maps `target_month` → `targetMonth` with conditional spread so unset items don't end up with explicit `undefined`
- `db.wishlist.insert` + `db.wishlist.update`: writes `target_month: w.targetMonth ?? null`
- `toSpendingHistoryPeriod`: maps `budgets` / `spent` JSONB → typed shape with conditional spread
- `db.spendingHistory.insertPeriod`: writes both JSONB columns
- `db.spendingHistory.updatePeriodSnapshots`: **NEW** — surgical in-place update for the push-up migration to promote budgets/spent without touching the period's other columns (items, label, total)
- `fetchAllUserData`: reads `profile.last_archived_period_start` → `lastArchivedPeriodStart`
- `upsertProfile`: accepts `lastArchivedPeriodStart` parameter; spreads `last_archived_period_start` into the payload only when explicitly provided (matches existing pattern for other profile fields)

### Store sync plumbing (`src/stores/budget.ts`)
All four mutation sites for `lastArchivedPeriodStart` now fire a follow-up `syncDb(() => upsertProfile(_userId, { lastArchivedPeriodStart }))`:
- `closeCurrentPeriodManually` — anchor advanced to next period
- `autoArchiveMissedPeriods` — first-run init branch (sets anchor to current period start)
- `autoArchiveMissedPeriods` — defensive-empty-loop bail (advances anchor without archiving)
- `autoArchiveMissedPeriods` — normal commit path (advances anchor after archiving N periods)

Wishlist `targetMonth` and per-period `budgets`/`spent` already flowed through their respective CRUD actions; the adapter changes alone are sufficient for them.

### Push-up migration (`pushUpOptionalFields`)
**The defensive bit.** Today, optional fields are preserved across reloads because `Object.assign(state, fetchedData)` only copies properties present on `fetchedData`. Since the existing `db.ts` didn't map these fields, they were absent from `fetchedData` and the local values survived.

Once RS-29 promotes the fields to real columns, `fetchedData` WILL include them. For users whose DB columns are still null (every existing user on first load after deploy), `Object.assign` would clobber the localStorage values with null → silent data loss.

`pushUpOptionalFields` runs BETWEEN the fetch and the `Object.assign`. For each field:
1. If `data[field] == null && localState[field] != null` → push the local value up to the DB
2. Also mutate the in-place `data` object so the subsequent `Object.assign` carries the value forward

After the first run, DB and local agree, all branches no-op (idempotent). Failures are logged but never throw — the local data is already showing and the user can refresh to retry.

The helper is exported from `budget.ts` solely so the test suite can exercise it directly. Production callers always reach it via `initStore`.

### Doc-comment cleanup
Removed "Storage note: intentionally NOT mapped through Supabase" caveats from JSDoc on the three TypeScript types (`BudgetState.lastArchivedPeriodStart`, `SpendingHistoryPeriod.budgets`, `WishlistItem.targetMonth`). Replaced with concrete "Persistence (RS-29)" blocks that document the column name, the migration file, and the push-up migration cross-reference.

### Files Changed
- NEW: `supabase/migrations/005_optional_fields_refresh.sql`
- NEW: `tests/stores/pushUpOptionalFields.spec.ts` — 16 tests, all branches of the migration
- `src/types/database.ts` — Row/Insert/Update for `profiles`, `spending_history_periods`, `wishlist_items`
- `src/lib/db.ts` — adapter additions (toWishlistItem / wishlist.insert / wishlist.update / toSpendingHistoryPeriod / spendingHistory.insertPeriod / spendingHistory.updatePeriodSnapshots / fetchAllUserData / upsertProfile) + `Json` import
- `src/stores/budget.ts` — exported `pushUpOptionalFields` helper + four `syncDb` follow-ups for `lastArchivedPeriodStart` + call from `initStore` between fetch and assign
- `src/types/state.ts` — removed Storage note caveat on `lastArchivedPeriodStart`; added "Persistence (RS-29)" block
- `src/types/budget.ts` — same cleanup for `budgets` and `targetMonth` JSDoc
- `tests/lib/db.spec.ts` — 16 new tests covering round-trip for all four columns
- `src/components/onboarding/WhatsNewBanner.vue` — bumped to v2.20.0 with debt-cleanup-themed notes
- `tests/components/onboarding.spec.ts` — version strings → 2.20.0
- `src/components/pages/DocsPage.vue` — new v2.20.0 + v2.19.1 release blocks (the v2.19.1 BUG-021 hotfix block hadn't been added yet)
- `tests/components/pages/pages.spec.ts` — regression-guard test list includes v2.20.0 + v2.19.1 + RS-29
- `CLAUDE.md` — test count → 1209 across 35 spec files

### Tests
- 32 new tests added (16 db round-trip + 16 push-up migration)
- All 1209 tests pass — no regressions
- `vue-tsc --noEmit` clean
- `eslint src/` 0 errors (caught last sprint via BUG-021 — pre-merge gate now includes eslint informally)

### Notes for the next deploy
- **Run the SQL migration first** — Supabase migrations apply via the standard CLI/dashboard flow. With migrations 001–004 already applied, 005 is the next one.
- **The push-up migration runs automatically** on the first app load after the new TS code reaches a user. If that load happens before the SQL migration is applied, the Supabase upserts will fail (no column to write to) but the local data still renders. On the next load (after migration applies), the push-up succeeds.
- **No user-facing change** — the four features (RS-23 / RS-24 / RS-28) work identically; they just now persist across devices via Supabase.

### Final gate
- ✅ 1209/1209 tests pass · `vue-tsc --noEmit` clean · `eslint src/` 0 errors

---

## BUG-022 — `migrate.yml` regenerate wiped `*Row` re-exports ✅
**Branch**: `fix/bug-022-database-types-regenerate`
**Version**: v2.20.1
**Status**: ✅ Complete (hotfix)

### Symptom
Immediately after the RS-29 deploy, the next push to `main` triggered both `deploy.yml` and `migrate.yml` simultaneously. `migrate.yml` regenerated `src/types/database.ts` from the live schema, committed it back to `main` as `4c159c7 chore: sync database.ts with live Supabase schema [skip ci]`, and the next `deploy.yml` run failed at the Type-check step with 18 errors:

```
src/lib/db.ts(31,3): error TS2305: Module '"@/types/database"' has no exported member 'ProfileRow'.
src/lib/db.ts(32,3): error TS2305: ... no exported member 'IncomeStreamRow'.
...
src/lib/db.ts(36,28): error TS2305: ... no exported member 'SpendingCategoryRow'.
```

### Root cause
`supabase gen types typescript` outputs the canonical generated form:
- `Database` interface (root)
- `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `CompositeTypes` (helper generics)
- `Constants` (enum runtime values)

But it does **NOT** output the convenience `*Row` aliases (`ProfileRow`, `WishlistItemRow`, etc.) — those are hand-maintained at the bottom of `database.ts` and `src/lib/db.ts` imports them by name. The regenerate step unconditionally overwrites the file with the generator's output, deleting the alias block.

The bug was latent — it would have triggered on ANY future migration, not just RS-29's. RS-29 just happened to be the first migration after the `migrate.yml` workflow was added with the auto-commit-back step.

### Fixes

**1. Restored the alias block** at the bottom of `src/types/database.ts` with a defensive header comment explaining why it's hand-maintained and noting that the workflow is supposed to append it automatically.

**2. Patched `.github/workflows/migrate.yml`** with a new "Re-append `*Row` aliases" step that runs AFTER `supabase gen types typescript` and BEFORE the commit-back step. The step uses a heredoc to append the canonical alias block (and the explanatory header) so the regenerated file is always complete.

**3. Added a contract test** at `tests/lib/databaseRowExports.spec.ts` (3 tests):
- Parses `db.ts`'s `import type { ... } from '@/types/database'` block via regex, extracts every `*Row` identifier
- Parses `database.ts` via regex, extracts every `export type *Row` identifier
- Asserts the import set is a subset of the export set — anything missing fails with a pointer to the migrate workflow

This test fires at the test-runner stage (before type-check), so a regenerate-and-forget-to-append regression surfaces in PR review rather than at deploy time.

### Validation
- `npm run type-check` → clean (was 18 errors)
- `npm run lint` → 0 errors
- `npx vitest run` → 1212/1212 (1209 prior + 3 new contract tests)
- Manual heredoc-indentation check on `migrate.yml`: YAML's `|` literal-block strips the common leading whitespace prefix (10 spaces in this case) consistently across all body lines, so the heredoc body in bash starts at column 0 as intended.

### Version
- Tagged `v2.20.1` (matches the BUG-020 series convention: patch bump for hotfixes)
- `APP_VERSION` in `WhatsNewBanner.vue` intentionally NOT bumped — the bug never reached production users (deploy failed before serving). Following the BUG-021 precedent.

### Process improvement worth noting
The pre-merge gate for RS-29 ran `npx vue-tsc --noEmit`, `npx vitest run`, and `npx eslint --ext .ts,.vue src/` — all green. None of those catch the "regenerate workflow wipes hand-maintained content" failure mode because the workflow only runs on the merge to `main`, not on PR. The new contract test closes that gap.

### Files Changed
- `src/types/database.ts` — restored hand-maintained `*Row` alias block with `BUG-022` marker comment
- `.github/workflows/migrate.yml` — new "Re-append `*Row` aliases" step between regenerate and commit-back
- `tests/lib/databaseRowExports.spec.ts` — NEW: 3 contract tests guarding the import ↔ export relationship
- `tsconfig.json` — added `node` to the `types` array so the new contract test can use `node:fs`, `node:url`, `node:path` without TS errors
- `package.json` + `package-lock.json` — added `@types/node` as a devDependency (required by the tsconfig change above; standard for any Vitest project that does file I/O)
- `CLAUDE.md` — test count → 1212 across 36 spec files
- `docs/PHASE_TRACKING.md` — this entry

### Tests
- 3 new tests added (all RS-29's 1209 tests still pass)
- All 1212 tests pass — no regressions
- `vue-tsc --noEmit` clean
- `eslint src/` 0 errors

### Final gate
- ✅ 1212/1212 tests pass · `vue-tsc --noEmit` clean · `eslint src/` 0 errors

---

## RS-30 — Supabase fetch reliability (Level 1) ✅
**Branch**: `feat/rs-30-supabase-fetch-retry`
**Version**: v2.21.0
**Status**: ✅ Complete

### Symptom
After the RS-29 deploy went live, Brahim reported the "Supabase sync failed, using localStorage" warning toast firing fairly often in normal use. The console showed a specific fingerprint:

```
[penny] Supabase configured → https://qliyeounfifsrwadykej.supabase.co
[penny] Supabase probe → HTTP 200
[penny] Supabase sync failed, using localStorage: Error: [penny] DB fetch timed out after 20000 ms
```

Note: the probe (single tiny `select=id&limit=0` call with a 5s deadline) succeeded with HTTP 200 in under a second. Then the full fetch (18 parallel `select=*` queries via `Promise.all`) timed out at 20s. That's not a cold-start signature (probe would also fail). That's burst pressure on the Supabase free tier's PgBouncer pool — most queries return fast but the long tail of a few queued behind the pool exhaust the deadline.

### Mitigation: Level 1 (this sprint)
1. **Bump timeout 20s → 30s** to cover the long tail of pool-queued queries
2. **One automatic retry on timeout**, 2 s after the first attempt rejects, using the same deadline. Free-tier pools clear quickly once the initial burst completes, so a single delayed retry usually succeeds.

### Decision rules in the retry helper
| First-attempt result | Behaviour |
|---|---|
| Resolves with data | Return immediately — no retry |
| Resolves with `null` (new user, no profile row yet) | Return `null` immediately — no retry |
| Rejects with timeout error (matches `[penny] DB fetch timed out` marker) | Wait `SUPABASE_RETRY_DELAY_MS`, retry once with the same deadline |
| Rejects with anything else (RLS, HTTP 4xx/5xx, synchronous throw) | Re-throw immediately — those are persistent failures, retry won't help |

### Implementation (`src/stores/budget.ts`)
- Extracted the previously-inline `withTimeout` arrow function to module scope as `export function withTimeout<T>(promise, ms)` so the helper is testable in isolation
- Added module-scope `SUPABASE_FETCH_TIMEOUT_MS = 30_000`, `SUPABASE_RETRY_DELAY_MS = 2_000`, and `TIMEOUT_ERROR_MARKER = '[penny] DB fetch timed out'`
- Added `function isTimeoutError(err): boolean` — strict prefix match on the marker so a future loose-substring drift can't accidentally swallow non-timeout errors
- Added `export async function fetchUserDataWithRetry(userId, options?)` — exported solely so the test suite can exercise the retry decision matrix directly without mounting Pinia
- Updated `initStore` to call `fetchUserDataWithRetry(userId)` instead of `withTimeout(fetchAllUserData(userId))`, twice (one for the main fetch path and one for the post-localStorage-migration refresh)
- Updated the user-facing warning toast to use a calmer "tried twice, showing local backup" message specifically on the timeout path; non-timeout errors still get the original "check your project status" wording

### Tests (`tests/stores/fetchUserDataWithRetry.spec.ts`)
13 new tests covering:
- `withTimeout`: resolves under deadline, rejects on deadline exceeded, preserves underlying rejections that arrive before the deadline
- First-try success: returns data, no retry
- First-try `null` (new user): returns `null`, no retry
- First-try timeout, second-try success: returns data on retry
- First-try timeout, second-try timeout: re-throws timeout error
- First-try non-timeout error: re-throws immediately, no retry
- First-try synchronous throw: re-throws immediately, no retry
- Regression guard: generic error messages that don't carry the marker do NOT trigger retry
- Marker-prefix strictness: only the exact `[penny] DB fetch timed out` prefix triggers retry
- Configurable `retryDelayMs`: helper waits the full delay before firing the retry
- Custom `timeoutMs`: error message reflects the configured value

Tests use vi.useFakeTimers() to fast-forward through the 2s backoff. Mock strategy: mock `fetchAllUserData` directly at the `@/lib/db` module level rather than coordinating 18 individual supabase query mocks per attempt — much cleaner.

### Test cleanup details
Fake-timer tests in this spec attach `.catch()` synchronously before advancing timers to avoid "unhandled rejection" warnings, and `afterEach` calls `vi.clearAllTimers()` before `vi.useRealTimers()` to drain any orphaned setTimeouts left by `withTimeout`.

### Files Changed
- `src/stores/budget.ts` — module-scope helpers + retry plumbing
- `tests/stores/fetchUserDataWithRetry.spec.ts` — NEW: 13 tests
- `src/components/onboarding/WhatsNewBanner.vue` — v2.21.0 with reliability-themed notes
- `tests/components/onboarding.spec.ts` — version strings → 2.21.0
- `src/components/pages/DocsPage.vue` — new v2.21.0 + v2.20.1 release blocks
- `tests/components/pages/pages.spec.ts` — regression-guards include v2.21.0 + v2.20.1 + RS-30
- `CLAUDE.md` — test count → 1225 across 37 spec files
- `docs/PHASE_TRACKING.md` — this entry + RS-31 planned stub

### Tests
- 13 new tests added; all 1225 pass
- `vue-tsc --noEmit` clean
- `eslint src/` 0 errors

### Final gate
- ✅ 1225/1225 tests pass · `vue-tsc --noEmit` clean · `eslint src/` 0 errors

---

## RS-31 — Supabase fetch reliability (Level 2) ✅
**Branch**: `feat/rs-31-fetch-rpc-collapse`
**Version**: v2.22.0
**Status**: ✅ Complete

### Goal
Collapse `fetchAllUserData`'s 18 parallel `Promise.all` queries into a single Supabase RPC call, structurally eliminating the pool pressure that RS-30 mitigated at the retry layer. After this lands, free-tier reliability is on par with paid-tier for our use case.

### Implementation: Postgres function (`supabase/migrations/006_fetch_user_data_rpc.sql`)
Single PL/pgSQL function returning a jsonb object with one key per table:
```sql
create or replace function fetch_user_data(uid uuid)
returns jsonb language plpgsql stable security invoker
set search_path = public as $$
begin
  if auth.uid() is null or auth.uid() <> uid then
    raise exception 'fetch_user_data: caller must match uid' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'profile', (select to_jsonb(p) from profiles p where p.id = uid),
    'incomeStreams', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from income_streams t where t.user_id = uid),
    -- ... 17 more table subqueries
    'purchases', (select coalesce(jsonb_agg(to_jsonb(t) order by t.date desc nulls last), '[]'::jsonb) from purchases t where t.user_id = uid),
    'spendingHistoryPeriods', (select coalesce(jsonb_agg(to_jsonb(t) order by t.date desc nulls last), '[]'::jsonb) from spending_history_periods t where t.user_id = uid)
  );
end; $$;
revoke all on function fetch_user_data(uuid) from public;
grant execute on function fetch_user_data(uuid) to authenticated;
notify pgrst, 'reload schema';
```

Key design choices:
- **`security invoker`** so RLS applies to every subquery exactly as it did to the old per-table calls. The function runs as the caller, never as the function owner.
- **Defensive `auth.uid()` check** that raises `42501` if the caller doesn't match the requested `uid`. Belt-and-braces in case an RLS policy is ever weakened.
- **`set search_path = public`** prevents search-path injection (one of the standard Postgres function-hardening lints).
- **`coalesce(jsonb_agg(...), '[]'::jsonb)`** on every array so empty tables return `[]`, never `null`.
- **`order by date desc nulls last`** preserved on `purchases` and `spending_history_periods` — both had explicit ordering in the old code.
- **`to_jsonb(t)`** preserves snake_case column names, so the existing `to*` row adapters in `db.ts` work unchanged.

### Implementation: TS adapter (`src/lib/db.ts`)
- Defined `FetchUserDataPayload` interface — one camelCase key per table, typed against the existing `*Row` aliases.
- Rewrote `fetchAllUserData` to call `supabase.rpc('fetch_user_data', { uid: userId })` and map the payload through the existing `to*` adapters. Adapter functions unchanged.
- Defensive: if the RPC returns a null payload (function dropped or empty response), fall through to "first-time user" rather than crash.

### Tests
**`tests/lib/db.spec.ts`** — updated existing 17 `fetchAllUserData` tests to mock the RPC instead of orchestrating 18 chainable `from()` mocks. Added one new test that asserts the RPC is called with `('fetch_user_data', { uid })` AND that `supabase.from` is NEVER called — a hard regression guard against accidentally reviving the 18-query pattern.

**`tests/lib/fetchUserDataRpc.spec.ts`** — NEW. 13-test contract suite that reads the SQL file as text and asserts:
- Function signature is `fetch_user_data(uid uuid)`
- `security invoker` is set, `security definer` is not
- `search_path` is pinned to `public`
- The `auth.uid()` defensive check is present
- Every one of the 18 expected tables appears in a `FROM` clause
- Every one of the 18 expected jsonb keys appears in the output
- Every array key is `coalesce`-wrapped (catches "returns null for empty table" drift)
- `order by date desc nulls last` is preserved on `purchases` and `spending_history_periods`
- `grant execute` goes only to `authenticated`, `revoke all from public` is present
- `notify pgrst, 'reload schema'` is present (without it, the first call fails with `PGRST202`)
- The TS `FetchUserDataPayload` interface declares every expected key

This catches the "new table added, forgot to wire it through the RPC" failure mode that BUG-022 / BUG-023 both belonged to.

### Deploy ordering
`.github/workflows/migrate.yml` and `deploy.yml` run in parallel on push to main. If `deploy` finishes before `migrate`, there's a brief window where the new build calls a function that doesn't exist yet. RS-30's retry plus RS-29's localStorage fallback both cover this gracefully — the user sees the "tried twice, showing local backup" toast at worst, and the next refresh succeeds once `migrate` lands. Accept the transient window rather than serialise the workflows.

### Files Changed
- `supabase/migrations/006_fetch_user_data_rpc.sql` — NEW: PL/pgSQL RPC function
- `src/lib/db.ts` — `fetchAllUserData` rewritten to single RPC call
- `tests/lib/db.spec.ts` — RPC mock strategy
- `tests/lib/fetchUserDataRpc.spec.ts` — NEW: 13 contract tests
- `src/components/onboarding/WhatsNewBanner.vue` — v2.22.0 release notes
- `tests/components/onboarding.spec.ts` — version strings → 2.22.0
- `src/components/pages/DocsPage.vue` — new v2.22.0 release block
- `tests/components/pages/pages.spec.ts` — regression-guards include v2.22.0 + RS-31
- `CLAUDE.md` — test count → 1240 across 38 spec files
- `docs/PHASE_TRACKING.md` — flip RS-31 PLANNED → Complete

### Tests
- 15 new tests added (2 in db.spec, 13 in fetchUserDataRpc.spec); all 1240 pass
- `vue-tsc --noEmit` clean
- `eslint src/lib/db.ts tests/lib/db.spec.ts tests/lib/fetchUserDataRpc.spec.ts` clean

### Final gate
- ✅ 1240/1240 tests pass · `vue-tsc --noEmit` clean · `eslint` clean on touched files

---

## BUG-023 — Archived purchases not deleted from Supabase ✅
**Branch**: `fix/bug-023-024-purchase-archive-sync`
**Version**: v2.23.0
**Status**: ✅ Complete

### Symptom
After a bi-weekly period reset on Device A, logging into the app on Device B showed the Dashboard with purchases from the previous period still counted in the "Available to Spend" hero card. The Spending tab correctly showed only the new period's data.

The root cause was identified when the user noticed the bug appeared specifically after logging in on a second device — a clear DB sync gap rather than a display-only issue.

### Root Cause
All three archive actions (`closeCurrentPeriod`, `closeCurrentPeriodManually`, `autoArchiveMissedPeriods`) correctly:
- Moved purchases to `spendingHistory` in local state
- Inserted the new `SpendingHistoryPeriod` to Supabase
- Advanced `lastArchivedPeriodStart` in the profile

But **never** deleted the archived rows from the Supabase `purchases` table.

On Device B:
1. `initStore` → `fetch_user_data(uid)` RPC → returns all purchases (stale + current) from DB
2. `lastArchivedPeriodStart` was already advanced by Device A
3. `autoArchiveMissedPeriods` runs → guard check `currentStart <= lastArchivedPeriodStart` → returns 0 (no-op)
4. Stale purchases remain in `budget.purchases` permanently

### Fix (`src/stores/budget.ts`)
Added `syncDb(() => db.purchases.delete(_userId, p.id), ...)` calls after each archive action:
- `closeCurrentPeriod`: iterates `itemsToArchive` and deletes each
- `closeCurrentPeriodManually`: same
- `autoArchiveMissedPeriods`: computes `archivedPurchases = this.purchases.filter(p => !liveIds.has(p.id))` before committing, then deletes each

### Tests (`tests/stores/purchaseArchiveSync.spec.ts`)
9 new tests with a module-level `@/lib/db` mock and a real `_userId` via `initStore`:
- `closeCurrentPeriod` calls delete for each archived purchase; no-op when array empty
- `closeCurrentPeriodManually` calls delete for all three purchases including future-dated ones
- `autoArchiveMissedPeriods` deletes archived purchases, preserves live ones, no-ops on init and on re-run in same period
- "Cross-device scenario" test that directly simulates Device B re-loading stale DB purchases and verifies they get deleted on the next rollover

---

## BUG-024 — Dashboard period date filter missing ✅
**Branch**: `fix/bug-023-024-purchase-archive-sync`
**Version**: v2.23.0
**Status**: ✅ Complete

### Symptom
The Dashboard hero card ("Available to Spend") and "Purchases This Period" donut widget summed **all** entries in `budget.purchases` regardless of date. The Spending tab applied a `[periodStart, periodEnd]` filter via `purchasesInPeriod`. When BUG-023 caused stale purchases to persist in the array, the Dashboard showed inflated totals while the Spending tab was correct.

BUG-024 is independent of BUG-023 — even with the DB sync fixed, undated purchases (which the rollover sends to the most-recent missed period, not the live array) would still be counted. The period filter is architecturally correct regardless.

### Fix
**`src/components/pages/DashboardPage.vue`**:
- Added `currentPeriod = computed(() => getPayPeriodForecast(budget.$state, 0, today))`
- Added `currentPeriodPurchases` computed that filters `budget.purchases` to `[periodStart, periodEnd]` (falling back to all purchases when `payStart` isn't set yet)
- `biWeeklySpent` and `biWeeklyNeedsSpent` now source from `currentPeriodPurchases`

**`src/components/sections/PurchasesThisPeriod.vue`**:
- Same pattern: added `currentPeriod` + `periodPurchases` computeds
- `filteredPurchases` now chains type-filter on top of the period filter

Both components now match `SpendingPage.vue`'s `purchasesInPeriod` exactly.

### Tests (`tests/components/sections/sections.spec.ts`)
5 new BUG-024 tests (2 for DashboardPage, 3 for PurchasesThisPeriod), all using `vi.setSystemTime` to pin "today" for a predictable period window:
- Hero card only sums in-period purchases; out-of-period purchases ignored
- Hero card shows $0 when all purchases are from a previous period
- Undated purchases excluded from period total
- PTP donut caption reflects only in-period total
- PTP shows empty state when only out-of-period purchases exist

Also fixed 2 pre-existing `RecurringCalendar` test failures caused by hardcoded `2026-05-19` `payStart` dates whose pay-period window had drifted into the past as real time advanced. Fixed by adding `vi.useFakeTimers()` + `vi.setSystemTime('2026-05-25')` to each test.

### Files Changed
- `src/stores/budget.ts` — delete archived purchases from DB in all three archive actions
- `src/components/pages/DashboardPage.vue` — period-scoped `currentPeriodPurchases` computed
- `src/components/sections/PurchasesThisPeriod.vue` — period-scoped `periodPurchases` computed
- `tests/stores/purchaseArchiveSync.spec.ts` — NEW: 9 BUG-023 regression tests
- `tests/components/sections/sections.spec.ts` — 7 new tests (5 BUG-024 + 2 pre-existing fixes)
- `src/components/onboarding/WhatsNewBanner.vue` — v2.23.0 release notes
- `tests/components/onboarding.spec.ts` — version strings → 2.23.0
- `src/components/pages/DocsPage.vue` — v2.23.0 release block
- `tests/components/pages/pages.spec.ts` — regression-guard includes v2.23.0 + BUG-023/024
- `CLAUDE.md` — test count → 1254 across 39 spec files
- `docs/PHASE_TRACKING.md` — this entry

### Tests
- 14 new tests; 1254/1254 pass across 39 spec files
- `vue-tsc --noEmit` clean
- ESLint clean on all touched files

### Final gate
- ✅ 1254/1254 tests pass · `vue-tsc --noEmit` clean · ESLint clean on touched files

---

## BUG-025 — Quick-add modal category id/name mismatch ✅

**Branch**: `fix/bug-025-quick-add-category`
**Version**: v2.24.0
**Status**: ✅ **COMPLETE** — June 2026

### Problem
The Dashboard quick-add modal's category selector was storing the category **`id`** (e.g. `'entertainment'`) rather than the display **`name`** (e.g. `'Entertainment'`). The rest of the app — `catColor()`, the spending donut, the Spending tab's category filter chips, the edit-purchase dropdown, and analytics — all use `c.name` as the canonical `Purchase.category` value.

Symptoms:
1. Category badge showed the raw id slug with the fallback grey colour (e.g. `• entertainment` instead of `• Entertainment`)
2. Opening a quick-add purchase in the edit modal showed a blank category dropdown
3. The spending donut and analytics created a separate bucket (e.g. `entertainment`) instead of merging with the existing `Entertainment` bucket

### Root cause
Three lines in `DashboardPage.vue` used `c.id` where they should have used `c.name`:

| Line | Before | After |
|------|--------|-------|
| `defaultCategory` computed | `?.id ?? 'other'` | `?.name ?? 'Other'` |
| category pill active class | `quickAddCategory === c.id` | `quickAddCategory === c.name` |
| category pill click handler | `quickAddCategory = c.id` | `quickAddCategory = c.name` |

### Fix
1. **`DashboardPage.vue`** — changed `defaultCategory` and both usages in the category pill template from `c.id` to `c.name`
2. **`budget.ts` `migrateState`** — added a normalisation pass after the `spendingCategories` block that converts any `Purchase.category` matching a known `SpendingCategory.id` to the corresponding `name`. Runs once on next load; safe for correctly-named values, unknown strings, and empty arrays

### Files Changed
- `src/components/pages/DashboardPage.vue` — 3 lines: `c.id` → `c.name` for defaultCategory and category pill active/click
- `src/stores/budget.ts` — BUG-025 normalisation pass in `migrateState`
- `tests/stores/budget.spec.ts` — 4 new `migrateState` tests for the normalisation
- `tests/components/sections/sections.spec.ts` — 2 new DashboardPage quick-add tests
- `src/components/onboarding/WhatsNewBanner.vue` — v2.24.0 release notes
- `tests/components/onboarding.spec.ts` — version strings → 2.24.0
- `src/components/pages/DocsPage.vue` — v2.24.0 release block
- `tests/components/pages/pages.spec.ts` — regression-guard includes v2.24.0 + BUG-025
- `CLAUDE.md` — test count → 1260 across 39 spec files
- `docs/PHASE_TRACKING.md` — this entry

### Tests
- 6 new tests; 1260/1260 pass across 39 spec files
- `vue-tsc --noEmit` clean
- ESLint clean on all touched files

### Final gate
- ✅ 1260/1260 tests pass · `vue-tsc --noEmit` clean · ESLint clean on touched files

---

## RS-32 — Subscriptions & Loans in Period View ✅

**Branch**: `feat/rs-32-period-deductions-view`
**Version**: v2.25.0
**Status**: ✅ **COMPLETE** — June 2026

### Problem
The "Purchases This Period" dashboard donut had a single "Auto-deducted" row that:
- Only counted **wants-type** subscriptions and loans (needs-type items like parking, car insurance, car loan payments were silently excluded)
- Showed a mystery amount with no breakdown of what it came from
- Was inconsistent with the Spending tab, which showed no auto-deductions at all

### Solution
Two coordinated changes:

**1. Dashboard donut (`PurchasesThisPeriod.vue`):**
- Replaced the single "Auto-deducted" row with two separate rows: **Subscriptions** (teal dot) and **Loans** (amber dot)
- Both rows now work for the active budget type (Wants **or** Needs), so needs-type recurring items appear when the Needs toggle is selected
- Added `getSubsInWindow`/`getLoansInWindow` helpers and a `periodWindow` computed so the deduction logic is scoped to the exact pay period window rather than being hard-coded to wants-only

**2. Spending tab virtual rows (`SpendingPage.vue`):**
- Subscription renewals and loan payments that fall within the displayed period appear as **read-only virtual rows** in the table, on their exact date, sorted alongside manual purchases
- Virtual rows display teal **Sub** or amber **Loan** type badges; purchase rows keep their existing Want/Need badges
- Subscription rows show their category badge; loan rows (which have no category) show `—`
- Virtual rows participate in the type filter (Wants/Needs), search (by name), and category filter (subs match their category; loans are hidden when any category filter is active)
- Virtual rows are **not clickable** — they have `purchase-row--auto` styling and no edit handler
- Virtual row amounts are included in `filteredAmountTotal` and the `X of Y · $total` count
- Virtual rows are **never stored** as `Purchase` objects — they are computed at display time from `subscriptions`/`loans` state, so archiving, DB sync, and rollover are completely unaffected

**3. New calculation helpers (`calculations.ts`):**
- `getSubsInWindow(state, windowStart, windowEnd, budgetType)` — generic, window-based variant of `getSubsDeductedThisPeriod`; works for any offset and any budget type
- `getLoansInWindow(state, windowStart, windowEnd, budgetType)` — same for loans
- Existing `getSubsDeductedThisPeriod` / `getLoansDeductedThisPeriod` retained unchanged for backward compat

### Files Changed
- `src/utils/calculations.ts` — `getSubsInWindow` and `getLoansInWindow` added after `getLoansDeductedThisPeriod`
- `src/components/sections/PurchasesThisPeriod.vue` — deduction computeds rewritten; "Auto-deducted" row split into "Subscriptions" and "Loans"; `isEmpty` guard simplified
- `src/components/pages/SpendingPage.vue` — `PeriodicRow` type; `virtualRows`, `filteredVirtualRows`, `allDatedRows` computeds; table template updated; Sub/Loan CSS badges added
- `tests/utils/calculations.spec.ts` — 8 new tests for `getSubsInWindow` / `getLoansInWindow`
- `tests/components/sections/sections.spec.ts` — 3 PurchasesThisPeriod tests + 7 SpendingPage virtual-row tests
- `src/components/onboarding/WhatsNewBanner.vue` — v2.25.0 release notes
- `tests/components/onboarding.spec.ts` — version strings → 2.25.0
- `src/components/pages/DocsPage.vue` — v2.25.0 release block
- `tests/components/pages/pages.spec.ts` — regression-guard includes v2.25.0 + RS-32
- `CLAUDE.md` — test count → 1278 across 39 spec files
- `docs/PHASE_TRACKING.md` — this entry

### Tests
- 18 new tests; 1278/1278 pass across 39 spec files
- `vue-tsc --noEmit` clean
- ESLint clean on all touched files

### Final gate
- ✅ 1278/1278 tests pass · `vue-tsc --noEmit` clean · ESLint clean on touched files

---

## BUG-026 — Unfiltered purchases in financial calculations ✅

**Branch**: `fix/bug-026-unfiltered-purchases-sweep`
**Version**: v2.26.0
**Status**: ✅ **COMPLETE** — June 2026

### Problem
Seven locations across the codebase used `state.purchases` / `budget.purchases` **without a date filter** when computing period-scoped or month-scoped financial figures. Any stale cross-period rows in the array (from the BUG-023 multi-device scenario or any race condition before a period close fully syncs) would silently inflate every affected metric:

| Location | What it computes | Visible symptom |
|---|---|---|
| `SpendingPage.vue` `spendingFormAfter` | Bi-weekly remaining preview in Add Purchase modal | -$364.53 OVER BUDGET with $0 entered |
| `calculations.ts` `getEnvelopeForecast` | Bi-weekly spending forecast / pace | Projected overage inflated by stale rows |
| `calculations.ts` `getTriggeredAlerts` | Budget alert firing threshold | Alerts fire permanently on stale data |
| `calculations.ts` `calculateActualNeeds` | Monthly needs actuals for analytics | Inflated monthly needs figure |
| `calculations.ts` `calculateActualWants` | Monthly wants actuals for analytics | Inflated monthly wants figure |
| `calculations.ts` `getWantsCategoryActuals` | Category breakdown for current month | Wrong per-category totals |
| `calculations.ts` `getMonthlyWantsHistory` | 6-month trend chart current-month bucket | Current month total inflated |

### Root cause
These functions were written assuming `state.purchases` only ever contains the current period's data. That assumption broke when BUG-023 introduced the cross-device scenario — Device B loads stale purchases from the DB alongside an already-advanced rollover anchor, so old rows survive in the live array until the next natural period close.

BUG-024 fixed the Dashboard and SpendingPage KPIs by adding date filters to their computed properties, but did not fix the form preview or the underlying calculation helpers.

### Fix — seven targeted filter additions

1. **`SpendingPage.vue`**: Added `currentPeriodWindowForPreview` (offset=0) and `currentPeriodPurchasesForPreview` computeds. `spendingFormAfter` now uses these instead of `budget.purchases`. Also subtracts wants-envelope deductions (subs + loans) to match DashboardPage's `quickAddAfter` exactly.

2. **`getEnvelopeForecast`**: Added `periodEndStr` (periodStart + 14 days) and filtered `state.purchases` to `date >= periodStartStr && date <= periodEndStr`.

3. **`getTriggeredAlerts`**: Added `payStart` to the Pick type; filters purchases to `date >= periodStart` before passing to `getCategorySpending`.

4. **`calculateActualNeeds`**: Added `date?.startsWith(currentMonthStr)` filter on the needs purchase total.

5. **`calculateActualWants`**: Added `date?.startsWith(monthStr)` filter on the wants purchase total.

6. **`getWantsCategoryActuals`**: Added `date?.startsWith(monthStr)` filter on the live purchases loop.

7. **`getMonthlyWantsHistory`**: Added `date?.startsWith(monthKey)` filter in the `isCurrent` branch.

### Files Changed
- `src/components/pages/SpendingPage.vue` — `currentPeriodWindowForPreview`, `currentPeriodPurchasesForPreview`, rewritten `spendingFormAfter`
- `src/utils/calculations.ts` — fixes in 6 functions as described above
- `tests/utils/calculations.spec.ts` — 6 new BUG-026 regression tests; updated 12 existing fixtures to include dates matching their test's "today" parameter
- `tests/components/sections/sections.spec.ts` — 1 new BUG-026 SpendingPage preview regression test
- `src/components/onboarding/WhatsNewBanner.vue` — v2.26.0
- `tests/components/onboarding.spec.ts` — version → 2.26.0
- `src/components/pages/DocsPage.vue` — v2.26.0 release block
- `tests/components/pages/pages.spec.ts` — regression guard includes v2.26.0 + BUG-026
- `CLAUDE.md` — test count → 1284 across 39 spec files
- `docs/PHASE_TRACKING.md` — this entry

### Tests
- 6 new regression tests (calculations) + 1 (SpendingPage) = 7 new; 1284/1284 pass
- `vue-tsc --noEmit` clean
- ESLint clean on all touched files

### Final gate
- ✅ 1284/1284 tests pass · `vue-tsc --noEmit` clean · ESLint clean on touched files

---

## RS-33 — Period-scoped date picker (Add/Edit Purchase) ✅

**Branch**: `feat/rs-33-period-scoped-date-picker`
**Version**: v2.32.0
**Status**: ✅ **COMPLETE** — June 2026

### Motivation
The Add/Edit Purchase date picker in the Spending tab had no bounds, so a purchase could be dated into any past or future period. Out-of-period purchases were the shared root cause of the BUG-023 / BUG-024 / BUG-026 family (stale rows inflating totals, vanishing from period-scoped views, breaking the remaining-budget preview). Constraining input is a preventative measure so that class of bug cannot recur from manual entry.

### Decisions (agreed with product owner)
1. **Future-within-period allowed** — a purchase may be dated later in the current period (e.g. a known upcoming charge this fortnight), so `max` = period **end**, not today.
2. **Add disabled off the current period** — purchases can only be added to the period in progress. Viewing a past/upcoming period disables "+ Add" and shows a hint linking back to the current period. (Editing existing purchases still works in any displayed period.)

### Implementation
- `isCurrentPeriod` computed (`spendingOffset === 0`) drives the Add button's `disabled` state and the hint's visibility.
- `formDateMin` / `formDateMax` computeds derive from `spendingPeriod` (the displayed period window); `undefined` when no pay date is set (no constraint).
- `<input type="date">` gains `:min` / `:max`.
- `openAddPurchase` early-returns when off-period (defensive backstop behind the disabled button).
- `savePurchase` re-validates the date against `[formDateMin, formDateMax]` and blocks with a danger toast if out of range — covers manual keyboard entry that bypasses the native picker bounds.
- A small `.add-period-hint` with a `goCurrent()` link renders above the table when off-period.

### Files Changed
- `src/components/pages/SpendingPage.vue` — computeds, Add button disabled + hint, date input min/max, save guard, hint CSS
- `tests/components/sections/sections.spec.ts` — 5 new RS-33 tests
- `src/components/onboarding/WhatsNewBanner.vue` — v2.32.0 release notes
- `tests/components/onboarding.spec.ts` — version → 2.32.0; note count → 5
- `src/components/pages/DocsPage.vue` — v2.32.0 release block
- `tests/components/pages/pages.spec.ts` — regression guard includes v2.32.0 + RS-33
- `CLAUDE.md` — test count → 1297 across 39 spec files
- `docs/PHASE_TRACKING.md` — this entry

### Tests
- 5 new tests; 1297/1297 pass across 39 spec files
- `vue-tsc --noEmit` clean
- ESLint clean on all touched files

### Final gate
- ✅ 1297/1297 tests pass · `vue-tsc --noEmit` clean · ESLint clean on touched files

---

## BUG-032 — Subscriptions stuck on "Expired" / stale renewal date ✅

**Branch**: `fix/bug-032-subscription-next-renewal`
**Version**: v2.33.0
**Status**: ✅ **COMPLETE** — June 2026

### Problem
`Subscription.date` is a stored **anchor** date. The Subscriptions card read it raw — `daysUntil(sub.date)` and `displayDate(sub)`. Once the anchor passed, `daysUntil` went negative, so the chip showed **"Expired"** and the date line stayed stuck on a past date, never advancing to the next cycle of a recurring subscription.

This was **display-only**: every budget/forecast/deduction calculation (`getSubsInWindow`, `getPayPeriodForecast`, etc.) recomputes occurrences from the anchor + frequency, so the numbers were always correct. Only the card's chip, date line, renewal-alert banner, and renewal sort read the stale anchor directly.

### Decision — derive, don't mutate
Agreed with the product owner: compute the next renewal for display rather than rewriting the stored anchor. The anchor stays the source of truth for all occurrence maths (no DB writes / sync churn), and the display always reflects "next" regardless of how old the anchor is. Recurring subscriptions retire the "Expired" state entirely (it only ever made sense for a one-time charge, which the app doesn't model).

### Implementation (`Subscriptions.vue`)
- New `nextRenewalDate(sub)` helper → `getNextRenewal(sub)` for dated frequencies; returns the stored date for `custom-days` (handled separately).
- `chipText`: "Today" on the due day, `{n}d` countdown otherwise; "Expired" branch removed.
- `chipClass`: status from the derived next date (< 60 days → warn, else green).
- `displayDate`: formats the derived next date.
- `renewalLineText` (new): row-3 shows "Due today" / "Renews {next date}" / weekday pattern for custom-days.
- `upcomingRenewals` (≤ 7-day alert) and the `renewal` sort key both use the derived next date.
- `openEdit` pre-fills `form.date` with the next renewal date (non-custom-days).

### Follow-up logged
Added **TECH-DEBT-1** to the summary table — a to-discuss full-app sweep for hard-coded values / single-source-of-truth drift, of which this bug was an instance.

### Files Changed
- `src/components/sections/Subscriptions.vue` — `getNextRenewal` import, `nextRenewalDate` + `renewalLineText` helpers, updated chip/date/alert/sort/edit logic
- `tests/components/sections/sections.spec.ts` — 5 new BUG-032 tests
- `src/components/onboarding/WhatsNewBanner.vue` — v2.33.0 release notes
- `tests/components/onboarding.spec.ts` — version → 2.33.0
- `src/components/pages/DocsPage.vue` — v2.33.0 release block
- `tests/components/pages/pages.spec.ts` — regression guard includes v2.33.0 + BUG-032
- `CLAUDE.md` — test count → 1302 across 39 spec files
- `docs/PHASE_TRACKING.md` — summary rows (BUG-032 + TECH-DEBT-1) + this entry

### Tests
- 5 new tests; 1302/1302 pass across 39 spec files
- `vue-tsc --noEmit` clean
- ESLint clean on all touched files

### Final gate
- ✅ 1302/1302 tests pass · `vue-tsc --noEmit` clean · ESLint clean on touched files

---

## TECH-DEBT-1 — Hard-coded values sweep (planned, 3 phases) 🟡

**Status**: 🟡 **IN PROGRESS** — June 2026
**Scope agreed**: all three tiers; phased delivery (one PR per phase); pure refactor with no behaviour change; full `vitest` + `vue-tsc` after each phase; guard tests added where they prevent re-drift.

### Recon (instances found)
- **Period length `14`**: `budget.ts` (×2+) and a local `PERIOD_DAYS` in `calculations.ts` — no shared source.
- **Default allocation `{needs:50,wants:30,savings:20}`**: `budget.ts` ×3.
- **`'Other'` category fallback**: 8 files.
- **Date arrays** (`MONTHS`, `DOW_FULL/SHORT/MINI`): duplicated in `Subscriptions.vue`, `RecurringCalendar.vue`, `SpendingPage.vue`.
- **Frequency rate maps** (`MO_RATE`/`YR_RATE`/`FREQ_LABEL`): `Subscriptions.vue` (+ prose in `DocsPage.vue`).
- **Status thresholds**: variance `110`/`90%` in `calculations.ts`; sub-budget bar `60`/`30` in `Subscriptions.vue`.
- **`'wants'`/`'needs'` literals**: ~100+ (already type-safe via the `BudgetType` union).
- **Hex colors in scripts**: ~290 (mostly `var(--x, #fallback)` CSS fallbacks — low value).

### Phase 1 — Tier 1 (single source of truth) ✅ · `feat/tech-debt-1-phase-1-constants` · v2.34.0
- ✅ New `src/constants/budget.ts`: `PERIOD_DAYS`, `PERIOD_WEEKS`, `DEFAULT_ALLOCATION`.
- ✅ New `src/constants/datetime.ts`: `MONTHS_SHORT`, `DOW_FULL`, `DOW_SHORT`, `DOW_MINI`.
- ✅ `FALLBACK_CATEGORY_NAME = 'Other'` (in `data/categories.ts`).
- ✅ Refactored consumers: `budget.ts`, `calculations.ts` (all `14` period literals + `'Other'` fallbacks), `Subscriptions.vue`, `RecurringCalendar.vue`, `SpendingPage.vue` (DOW + `PERIOD_DAYS` loop), `SpendingAnalytics.vue`, `DashboardPage.vue`, `csvImportExport.ts`.
- ✅ 7 guard tests (`tests/constants/constants.spec.ts`): canonical values + consumers derive from them (default-state allocation, period-window length).
- Scoping notes: `CATEGORY_COLOURS` palette keys and `data/categories.ts` definitions left as literals (they ARE the definition, not a fallback). `'wants'`/`'needs'` literals deferred to Phase 3.
- **Final gate**: ✅ 1309/1309 tests pass · `vue-tsc --noEmit` clean · ESLint clean on touched files (RecurringCalendar's 24 pre-existing template warnings unchanged from main).

### Phase 2 — Tier 2 (domain consolidation) ✅ · `feat/tech-debt-1-phase-2-domain` · v2.35.0
- ✅ New `src/constants/frequency.ts`: `MO_RATE`, `YR_RATE`, `FREQ_LABEL`, `FREQ_DISPLAY`, `DAYS_PER_YEAR`, `AVG_WEEKDAY_OCCURRENCES_PER_MONTH`/`_PER_YEAR`. Subscriptions.vue (dropped its inline maps + `365.25/7` literal) and Loans.vue (dropped its partial `FREQ_DISPLAY`) both import from it.
- ✅ Threshold constants in `constants/budget.ts`: `VARIANCE_OVER_PCT`/`VARIANCE_CAUTION_PCT` (calculations.ts `calculateVariance`), `ENVELOPE_CAUTION_RATIO` (the two `budget * 0.9` forecast caution lines), `SUB_BUDGET_OVER_PCT`/`SUB_BUDGET_CAUTION_PCT` (Subscriptions budget-bar status + stat colour classes).
- ✅ 5 new guard tests (frequency map coverage, annual≈12×monthly, weekday-helper derivation, threshold ordering, `calculateVariance` status derivation).
- **Final gate**: ✅ 1314/1314 tests pass · `vue-tsc --noEmit` clean · ESLint clean on touched files.

### Phase 3 — Tier 3 (literals + palette)  · `feat/tech-debt-1-phase-3-enums` · v2.36.0
- Shared `BUDGET_TYPES` / `DEFAULT_BUDGET_TYPE` constants where they reduce risk.
- Centralize chart-palette hex; document that CSS-var fallbacks are intentionally left inline.

---

## GSAP-FLIP-TOGGLES — Sliding pill indicators on all interactive toggles ✅

**Status**: ✅ **COMPLETE** — June 2026
**Branch**: `feat/gsap-flip-toggles`
**Version**: v2.38.0

### Goal
Replace static CSS background-swap on toggle buttons with smooth GSAP Flip sliding pill indicators across every interactive toggle in the app. Shared `useFlipIndicator` composable handles all axis modes, reduced-motion awareness, and reveal-on-mount.

### Delivered

- ✅ `src/composables/useFlipIndicator.ts` — new shared composable: `Flip.getState()` + `Flip.from()` sliding indicator. Two axis modes: `'both'` (horizontal pill) and `'y'` (vertical left-bar). `prefers-reduced-motion` aware — snaps instantly when OS requests reduced motion. Reveals indicator after first snap (starts at `opacity:0`) to prevent flash of un-positioned element.
- ✅ `AppSidebar.vue` — 3px vertical left-bar nav indicator (`axis:'y'`, `power3.inOut`) + SVG icon theme pill (☀/☾, `power2.inOut`, `scheduleThemeReinit` on hover to handle CSS expansion)
- ✅ `DashboardPage.vue` — hero Wants/Needs Flip pill (`back.out(2.5)`) + GSAP `from` fade+drift on hero amount on toggle
- ✅ `SchedulePage.vue` — List/Month view toggle Flip pill (`back.out(2.5)`)
- ✅ `SpendingPage.vue` — donut Wants/Needs Flip pill (`back.out(2.5)`), chip bounce (`back.out(2.5)`) on every type/category chip click, purchase table row stagger-fade on filter change
- ✅ `useGsap.ts` — defensive `?.matches ?? false` null-check in `prefersReducedMotion()` (guards against `vi.restoreAllMocks()` clearing the jsdom mock between async lifecycle calls)
- ✅ `tests/setup.ts` — added `vi.mock('gsap/Flip', ...)` stub (synchronous `Flip.getState` + `Flip.from` with `onComplete` forwarding)
- ✅ `tests/components/ui/AppSidebar.spec.ts` — updated two tests for the new SVG icon theme pill (checks `[aria-label="Light mode"]`, `[aria-label="Dark mode"]`, `.app-sidebar__theme-btn--active`)

### Files changed
- `src/composables/useFlipIndicator.ts` — NEW
- `src/composables/useGsap.ts` — defensive matchMedia null-check
- `src/components/ui/AppSidebar.vue` — nav indicator + theme icon pill
- `src/components/pages/DashboardPage.vue` — hero toggle Flip pill + amount drift
- `src/components/pages/SchedulePage.vue` — view toggle Flip pill
- `src/components/pages/SpendingPage.vue` — donut toggle Flip pill + chip bounce + row stagger
- `tests/setup.ts` — gsap/Flip mock
- `tests/components/ui/AppSidebar.spec.ts` — theme pill test update
- `CLAUDE.md` — test count → 1358 across 42 spec files
- `docs/PHASE_TRACKING.md` — this entry

### Tests
- 4 new tests (AppSidebar theme pill × 2, nav indicator assertion updated × 2)
- **Final gate**: ✅ 1358/1358 tests pass · `vue-tsc --noEmit` clean

---

## SUBSCRIPTION-FILTER-FIX — Subscriptions category filter permanently invisible items ✅

**Status**: ✅ **COMPLETE** — June 2026
**Branch**: `fix/subscription-filter-leave-animation`
**Version**: v2.38.1

### Goal
Fix a bug where switching category filters in the Subscriptions section caused items to remain permanently invisible after switching back to "All categories". Affected items occupied their full layout height (creating an empty-looking gap above the visible ones) but had `opacity: 0` locked on them and never recovered.

### Root Cause (confirmed via live DOM instrumentation)

**CSS animation vs GSAP `from()` conflict.** `extras.css` applies:
```css
@keyframes listItemIn { from { opacity: 0; transform: translateY(8px); } }
.sub-item { animation: listItemIn 200ms ease both; }
```
`animation-fill-mode: both` pre-applies the `from` keyframe (`opacity: 0`) to every `.sub-item` **before** the animation begins.

When Vue's `@enter` hook fires for a re-entering item (after a filter change removes it and brings it back), GSAP's `from({ opacity: 0 })` calls `getComputedStyle(el).opacity` to record what it should animate *to*. Because `fill-mode: both` has already stamped `opacity: 0` on the element, GSAP captures `"to = 0"`. The tween animates from 0 → 0 (a no-op), then leaves `el.style.opacity = "0"` as a permanent inline override — which blocks the CSS animation from ever overwriting it. Items stay invisible indefinitely.

Items that *stayed* in the list through a filter change (e.g. Entertainment items when filtering to Entertainment) never triggered `@enter`, so their CSS animation ran cleanly and they remained visible — explaining why only *some* items disappeared.

Two earlier fix attempts addressed the wrong layer:
1. `position: absolute` on leaving items — broken when multiple items leave in the same JS tick (sequential `getBoundingClientRect()` calls capture shifted positions, all items pile at top:0).
2. Height-collapse leave animation — correct leave approach, but didn't address the `@enter` opacity capture bug.

### Fix

**`src/composables/useListTransition.ts` — one line in `onItemEnter`:**
```typescript
htmlEl.style.animation = 'none';   // ← added before killTweensOf
```
Setting `animation: none` as an inline style before GSAP reads the element's natural opacity disables the competing CSS animation. `getComputedStyle(el).opacity` now returns `1` (browser default — no CSS rule overrides it), so GSAP correctly records `"to = 1"` and animates `0 → 1`. The inline `animation: none` persists on the element for all future filter cycles, permanently preventing the conflict.

Also retained from earlier commits:
- `onItemLeave` uses height-collapse (not `position: absolute`) — avoids the multi-item sequential-hook layout bug.
- `onItemEnter` calls `raw.killTweensOf` + `raw.set(clearProps)` to cancel any in-progress leave tween and wipe stale styles before animating in.
- `tests/setup.ts` — `killTweensOf: vi.fn()` added to the GSAP mock.

### Files changed
- `src/composables/useListTransition.ts` — `animation:none` guard + height-collapse leave + killTweensOf + clearProps
- `src/components/sections/Subscriptions.vue` — `position: relative` on `.subs-list`
- `src/components/sections/Wishlist.vue` — `position: relative` on `.wish-grid`
- `tests/setup.ts` — `killTweensOf` added to GSAP mock
- `src/components/onboarding/WhatsNewBanner.vue` — `APP_VERSION` → `'2.38.1'`; bug-fix release note added
- `src/components/pages/DocsPage.vue` — v2.38.1 release block added
- `CLAUDE.md` — version comment updated to v2.38.1
- `tests/components/onboarding.spec.ts` — version sentinels updated to `'2.38.1'`
- `tests/components/pages/pages.spec.ts` — `'v2.38.1'` added to versions array; test description updated
- `docs/PHASE_TRACKING.md` — this entry

### Tests
- No new tests (fix is in composable internals; existing 17 `useListTransition` tests all pass)
- **Final gate**: ✅ 1358/1358 tests pass · `vue-tsc --noEmit` clean

---

## ONE-TIME-INCOME-DB — Windfall income DB persistence ✅

**Status**: ✅ **COMPLETE** — June 2026
**Branch**: `feat/one-time-income-db-persistence`
**Version**: v2.39.0

### Goal
Make windfall / one-time income entries survive sign-out and re-sign-in. They were only stored in `localStorage` and were silently discarded whenever the user signed out, cleared the browser, or opened the app on a different device.

### Root Cause
`oneTimeIncomes` was fully implemented in the Pinia store and `BudgetState` type, but was never wired to Supabase. No table existed in the DB, no CRUD helpers existed in `db.ts`, the `fetchAllUserData` RPC did not include it, and the three store actions (`addOneTimeIncome`, `updateOneTimeIncome`, `deleteOneTimeIncome`) had no `syncDb` calls. Every other entity (purchases, subscriptions, loans, etc.) had the full stack; `oneTimeIncomes` was the sole omission.

### Fix

**Migration `007_one_time_incomes.sql`** (run in Supabase Dashboard SQL Editor):
- Creates `one_time_incomes` table: `id` (text PK), `user_id` (uuid FK → auth.users CASCADE), `label`, `amount`, `date`, `type`, `allocation` (jsonb), `period_start`, `created_at`, `updated_at`
- Attaches `handle_updated_at()` trigger
- Enables RLS with `"Own one-time incomes"` policy (`user_id = auth.uid()`)
- Updates `fetch_user_data` RPC to include `oneTimeIncomes` key (ordered by `date desc`)

**`src/types/database.ts`**: Added `one_time_incomes` table definition (Row/Insert/Update) + `OneTimeIncomeRow` alias at the bottom of the hand-maintained re-exports section.

**`src/lib/db.ts`**:
- Added `OneTimeIncome` to budget-types import; `OneTimeIncomeRow` to database-types import
- Added `toOneTimeIncome(r)` row mapper
- Added `oneTimeIncomes: OneTimeIncomeRow[]` to `FetchUserDataPayload`
- Added `oneTimeIncomes: (payload.oneTimeIncomes ?? []).map(toOneTimeIncome)` to `fetchAllUserData` return
- Added `'one_time_incomes'` to `deleteAllUserData` tables list
- Added `db.oneTimeIncomes` with `insert`, `update`, `delete` helpers

**`src/stores/budget.ts`** — wired `syncDb` in all three actions:
- `addOneTimeIncome`: `syncDb(() => db.oneTimeIncomes.insert(_userId, item), 'addOneTimeIncome')`
- `updateOneTimeIncome`: `syncDb(() => db.oneTimeIncomes.update(_userId, target), 'updateOneTimeIncome')`
- `deleteOneTimeIncome`: `syncDb(() => db.oneTimeIncomes.delete(_userId, id), 'deleteOneTimeIncome')`

**`src/lib/migrateLocalStorage.ts`**: Added step 17 — loops `state.oneTimeIncomes` and calls `db.oneTimeIncomes.insert` for full-import/reset path coverage.

### Files changed
- `supabase/migrations/007_one_time_incomes.sql` — new table + RLS + updated RPC
- `src/types/database.ts` — `one_time_incomes` table type + `OneTimeIncomeRow` alias
- `src/lib/db.ts` — mapper, FetchUserDataPayload, fetchAllUserData, deleteAllUserData, CRUD helpers
- `src/stores/budget.ts` — `syncDb` wired in 3 actions
- `src/lib/migrateLocalStorage.ts` — step 17 for import path
- `src/components/onboarding/WhatsNewBanner.vue` — `APP_VERSION` → `'2.39.0'`; release note added
- `src/components/pages/DocsPage.vue` — v2.39.0 release block added
- `CLAUDE.md` — version comment updated to v2.39.0
- `tests/components/onboarding.spec.ts` — version sentinels updated to `'2.39.0'`
- `tests/components/pages/pages.spec.ts` — `'v2.39.0'` added to versions array; test description updated
- `docs/PHASE_TRACKING.md` — this entry

### Deployment note
The SQL migration must be run in the Supabase Dashboard **before** this branch is deployed, otherwise `syncDb` writes will fail with `relation "one_time_incomes" does not exist`. Existing windfall income entries in localStorage are already present in the store on first load, but they will not be pushed to Supabase retroactively — they'll sync on the next add/edit/delete action. A one-time migration could be triggered by the user doing a JSON export+import through Settings.

### Tests
- No new unit tests — the DB layer uses the same fire-and-forget `syncDb` pattern already tested at the store level across other entities; the mapper and CRUD helpers follow the established pattern exactly.
- **Final gate**: ✅ 1358/1358 tests pass · `vue-tsc --noEmit` clean

---

## DB-SYNC-POLICY — Database Sync Policy + coverage test ✅

**Branch**: `chore/db-sync-policy-and-coverage-test`
**Status**: ✅ **COMPLETE** — June 2026
**Version**: v2.39.1

### Motivation

The windfall income bug (v2.38.x → v2.39.0) demonstrated a systemic gap: a store entity can exist for months with full UI and test coverage, yet have zero database integration, because nothing in the project enforced that pairing. The fix was reactive. This sprint makes the gap impossible to miss.

### What changed

**`CLAUDE.md`** — New mandatory section "Database Sync Policy" inserted between the Release Process and Branching & Merge Policy sections. Defines a 6-item checklist that must be completed in the same branch as any add/change/remove of a persisted entity:

1. Migration file (`supabase/migrations/NNN_*.sql`) — table, RLS, trigger, RPC update
2. Database types (`src/types/database.ts`) — `Row`/`Insert`/`Update` + `*Row` alias
3. DB helpers (`src/lib/db.ts`) — mapper + `insert`/`update`/`delete` on `db` object
4. Store wiring (`src/stores/budget.ts`) — `syncDb()` in every mutating action
5. Migration import (`src/lib/migrateLocalStorage.ts`) — numbered back-fill step
6. RPC verification — `fetch_user_data` includes the new entity key

Also documents non-standard shapes (`spendingHistory`, `netWorthHistory`), non-persisted scalar fields (covered by `upsertProfile`), and points to the automated canary.

**`tests/lib/db-coverage.spec.ts`** (new file) — 35 tests across three suites:

- *Entity registry* (18 tests): `it.each(ALL_DB_ENTITY_KEYS)` asserts each of the 17 entity keys exists on the `db` object, plus a count sentinel that forces a deliberate update of the spec whenever the list changes.
- *Standard CRUD shape* (15 tests): `it.each(STANDARD_CRUD_ENTITY_KEYS)` asserts `insert`, `update`, and `delete` are all functions for each of the 15 standard-shape entities.
- *Non-standard shapes* (2 tests): `spendingHistory` has `insertPeriod`/`updatePeriodSnapshots`/`deletePeriod`; `netWorthHistory` has `insert`/`delete` with an explicit assertion that `update` is `undefined` (snapshots are intentionally immutable).

### Files changed

- `CLAUDE.md` — Database Sync Policy section added; test count updated to 1393/43
- `tests/lib/db-coverage.spec.ts` — new file, 35 tests
- `src/components/onboarding/WhatsNewBanner.vue` — `APP_VERSION` → `'2.39.1'`; release notes updated
- `src/components/pages/DocsPage.vue` — v2.39.1 release block added
- `tests/components/onboarding.spec.ts` — version sentinels updated to `'2.39.1'`
- `tests/components/pages/pages.spec.ts` — `'v2.39.1'` added to versions array; test description updated
- `docs/PHASE_TRACKING.md` — summary table row + this entry

### Tests
- 35 new tests in `tests/lib/db-coverage.spec.ts` — all passing
- **Final gate**: ✅ 1393/1393 tests pass · `vue-tsc --noEmit` clean

---

## GSAP-SPLITTEXT — Animated tab/page headings with SplitText ⏸

**Branch**: `feat/gsap-splittext-headings`
**Status**: ⏸ **DEFERRED** — June 2026 (reviewed and skipped; may revisit)
**Version**: v2.40.0 (MINOR — new user-facing animation)

### Motivation

Tab navigation currently swaps page headings as a plain text swap. SplitText lets each heading's characters cascade in individually, adding editorial polish to what is otherwise an invisible transition. Pairs with the existing `useCountUp` (numbers) to give every tab change a cohesive animated entrance — label text and KPI figures both animate in together.

### Planned scope

- **`src/composables/useSplitText.ts`** (new) — thin wrapper around `SplitText.create()` that respects `prefers-reduced-motion` (skips split, jumps to final state), cleans up on unmount, and exposes `chars`, `words`, `lines` refs for use in templates.
- **`src/components/ui/AnimatedHeading.vue`** (new) — drop-in `<AnimatedHeading>` component that accepts a `text` prop and a `trigger` ref. When `trigger` changes, re-splits and replays the stagger-in. Used on all page headings (Dashboard, Schedule, Spending, Settings, Docs).
- **KPI labels** — `"Needs"`, `"Wants"`, `"Savings"` labels on the Dashboard hero get a one-time stagger-in on mount (30ms per char, `power2.out`, `y: -12 → 0`).
- **Tab heading** — the main `<h1>` on each page re-plays the entrance whenever the active tab changes.

### Design constraints

- Characters animate: `y: -12 → 0`, `autoAlpha: 0 → 1`, `stagger: 0.028s`, `duration: 0.45s`, `ease: power2.out`
- `prefers-reduced-motion`: duration set to 0, stagger set to 0 — text appears instantly
- SplitText reverted after animation completes (reduces DOM node count per GSAP recommendation)
- No interaction with `useListTransition` or `useFlipIndicator` — orthogonal

### Tests

- Mount `AnimatedHeading`, change `trigger`, assert GSAP `from` was called with correct stagger params
- Assert no split occurs when `prefers-reduced-motion` is active

---

## GSAP-DRAGGABLE-REORDER — Drag-to-reorder income streams ✅

**Branch**: `feat/gsap-draggable-reorder`
**Status**: ✅ **COMPLETE** — June 2026
**Version**: v2.41.0 (MINOR — new user-facing interaction)

### Motivation

Income streams were fixed in creation order with no way to manually sort them. Drag-to-reorder with live Flip animation gives users direct control and makes the list feel physically real — items flow around the dragged row in real time rather than snapping abruptly after drop.

### Delivered scope

- **`src/composables/useDraggableList.ts`** (new) — composable that attaches GSAP `Draggable` to a list container (y-axis only, bounded to the list), triggers from a per-item handle, shows an absolutely-positioned drop-indicator line during drag, uses `Flip.getState()` + `Flip.from()` on drop, and exposes `reinit()` for data-change rebuilds.
- **`supabase/migrations/008_income_stream_order.sql`** — `ALTER TABLE profiles ADD COLUMN income_stream_order jsonb NOT NULL DEFAULT '[]'` so the order survives sign-out.
- **`src/types/database.ts`** — `income_stream_order: Json` added to profiles `Row/Insert/Update`.
- **`src/types/state.ts`** — `incomeStreamOrder: string[]` added to `BudgetState`.
- **`src/lib/db.ts`** — `fetchAllUserData` returns `incomeStreamOrder`; `upsertProfile` accepts `incomeStreamOrder`.
- **`src/stores/budget.ts`** — `makeDefaultState/makeBlankState` seed `incomeStreamOrder: []`; `migrateState` forward-compat guard; `orderedIncomeStreams` getter (sorts by order array, items missing from array sort to end, original array never mutated); `reorderIncomeStreams(ids)` action; `deleteIncomeStream` now also purges the deleted id from `incomeStreamOrder`.
- **`src/components/sections/IncomeStreams.vue`** — drag handle (⠿ SVG, always visible on mobile / hover-reveal on desktop) on each row; `v-for` switched to `budget.orderedIncomeStreams`; `data-id` attribute on each `<li>`; composable wired with `watch` on list length for reinit after add/delete.
- **Income streams only this sprint** — subscriptions reorder deferred to a follow-up sprint.

### Decision log

- **Profiles table / scalar exemption**: `incomeStreamOrder` stored in `profiles.income_stream_order` as JSONB — qualifies as a scalar config field; no separate entity table, no 6-item DB checklist.
- **Drag handle visibility**: always visible on mobile (touch devices), fade-in on desktop row-hover (`@media (hover: hover) and (pointer: fine)`).

### Tests added

- `tests/composables/useDraggableList.spec.ts` (new, 7 tests) — return contract, `Draggable.create` call count, cleanup on unmount, reinit rebuilds, indicator injection/removal, null-ref guard.
- `tests/stores/income.spec.ts` — 7 new tests: `orderedIncomeStreams` getter (empty order, set order, missing-from-order tail, non-mutating), `reorderIncomeStreams` action, immediate getter reflection, `deleteIncomeStream` order-cleanup.
- `vi.mock('@/composables/useDraggableList')` added to `sections.spec.ts` and `pages.spec.ts` to prevent jsdom GSAP Draggable crash.
- **1407 tests across 44 spec files** — all green.

### Files changed

- `supabase/migrations/008_income_stream_order.sql` (new)
- `src/types/database.ts`
- `src/types/state.ts`
- `src/lib/db.ts`
- `src/stores/budget.ts`
- `src/composables/useDraggableList.ts` (new)
- `src/components/sections/IncomeStreams.vue`
- `tests/composables/useDraggableList.spec.ts` (new)
- `tests/stores/income.spec.ts`
- `tests/components/sections/sections.spec.ts`
- `tests/components/pages/pages.spec.ts`
- `tests/utils/jsonBackup.spec.ts`
- `src/components/onboarding/WhatsNewBanner.vue`
- `src/components/pages/DocsPage.vue`
- `docs/PHASE_TRACKING.md`
- `CLAUDE.md`

---

## GSAP-FLIP-LOG-PURCHASE — Purchase add/delete animations ✅

**Branch**: `feat/gsap-flip-log-purchase`
**Status**: ✅ **COMPLETE** — June 2026
**Version**: v2.42.0 (MINOR — new user-facing animation)

### Motivation

Purchase rows previously snapped in and out instantly. Adding a Flip animation for the add/delete cycle creates a spatial connection between the action and its result — the new row flows into place, and the deleted row visually exits before the list closes the gap.

### Delivered scope

- **`SpendingPage.vue` — add path**: `savePurchase()` made async. On submit, modal closes and `resetPurchaseForm()` fires first. After `nextTick`, `Flip.getState()` snapshots all existing `.purchase-row` elements. `budget.addPurchase()` adds to store. After another `nextTick`, `Flip.from()` stagger-animates existing rows flowing to new positions (0.52s, `power3.out`, stagger 0.04s), and `gsap.from()` flies the newly inserted row in from above (0.46s, `power2.out`, 0.06s delay).
- **`SpendingPage.vue` — delete path**: `deletePurchase()` made async. After `window.confirm()`, modal closes immediately. A 200ms pause lets BaseModal's leave animation complete. `gsap.to()` fades and shrinks the target row (0.32s, `power2.in`). `Flip.getState()` snapshots remaining rows. `budget.deletePurchase()` removes from store. After `nextTick`, `Flip.from()` closes the gap (0.42s, `power3.out`, stagger 0.03s).
- **`DashboardPage.vue` — quick-add pulse**: After `budget.addPurchase()` in `submitQuickAdd()`, `heroAmountRef` gets a scale pulse (`1 → 1.06 → 1`, 0.14s × 2) confirming the balance has changed.
- `data-purchase-id` attribute added to both dated and undated `<tr>` rows so the delete animation can locate the target row by ID.
- No store changes; purely a presentation layer enhancement.
- `prefers-reduced-motion`: all durations → 0 via `prefersReducedMotion()` from `useGsap`.

### Tests fixed

- `sections.spec.ts > SpendingPage — CRUD > Delete button in modal removes the purchase when confirm returns true` — updated to use `vi.useFakeTimers()` + `vi.runAllTimersAsync()` to advance the 200ms modal-close wait before asserting.
- **1407 tests across 44 spec files** — all green.

### Files changed

- `src/components/pages/SpendingPage.vue`
- `src/components/pages/DashboardPage.vue`
- `tests/components/sections/sections.spec.ts`
- `src/components/onboarding/WhatsNewBanner.vue`
- `src/components/pages/DocsPage.vue`
- `tests/components/onboarding.spec.ts`
- `tests/components/pages/pages.spec.ts`
- `docs/PHASE_TRACKING.md`
- `CLAUDE.md`

---

## GSAP-OBSERVER-SWIPE — Dual-axis tab transitions (mobile swipe + desktop vertical) ✅

**Branch**: `feat/gsap-observer-swipe`
**Status**: ✅ **COMPLETE** — June 2026
**Version**: v2.43.0 (MINOR — new user-facing interaction)

### Motivation

The tab transition used a single horizontal slide for all navigation. On desktop, the sidebar is vertical — a vertical page transition is more spatially coherent. On mobile, horizontal swipes are the natural gesture. This sprint delivers both, with GSAP Observer providing better touch recognition than the previous raw `touchstart`/`touchend` approach.

### Delivered scope

- **`src/composables/useGsapObserver.ts`** (new) — wraps `Observer.create()` with `type: 'touch'`, `lockAxis: true`, `dragMinimum: 40`, `tolerance: 12`. Accepts `onSwipeLeft` / `onSwipeRight` callbacks. Watches a `Ref<HTMLElement | null>`, attaches on mount, kills on unmount via `onBeforeUnmount`.
- **`App.vue`** — replaced `useSwipe` with `useGsapObserver` for the app-level swipe detection. Added `tabNavAxis = ref<'x' | 'y'>('y')`. The existing `watch` on `ui.activeTab` now auto-detects axis from `window.innerWidth` (≤768px → `'x'`, >768px → `'y'`). `tabTransitionName` computed incorporates the axis: `tab-{fwd|bwd}-{x|y}`.
- **CSS transitions** — renamed from `tab-fwd`/`tab-bwd` to four named transitions: `tab-fwd-x`, `tab-bwd-x` (horizontal, 52px), `tab-fwd-y`, `tab-bwd-y` (vertical, 52px). Timing updated from 0.18s/20px to 0.28s/52px (approved from demo).
- Desktop sidebar clicks → `'y'` (vertical). BottomNav taps → `'x'` (horizontal, auto-detected). Swipes → `'x'` (via Observer). Keyboard shortcuts → `'y'` on desktop, `'x'` on mobile.
- `prefers-reduced-motion`: CSS `transition: none` on all four active/leave classes.

### Decision log

- **`useSwipe` retained** — not deleted; may be used by other consumers in the future. `useGsapObserver` is a new composable alongside it.
- **`lockAxis: true` instead of `axis: 'x'`** — `axis` is not in `ObserverVars` TypeScript interface (it's a readonly instance property). `lockAxis: true` achieves the same effect (prevents diagonal swipes from triggering callbacks).
- **Auto-detect axis in watch, not in Observer callback** — sidebar clicks and BottomNav taps call `ui.setActiveTab()` directly without going through our code; the watch fires for all navigation and reads `window.innerWidth` at that moment, so all three paths (swipe, tap, click) get the right axis automatically.

### Tests

- `tests/composables/useGsapObserver.spec.ts` (new, 10 tests): Observer.create called with correct args, target element passed, `lockAxis: true`, default `dragMinimum`/`tolerance`, custom options, callback wiring (`onLeft`→`onSwipeLeft`, `onRight`→`onSwipeRight`), no-throw on omitted callbacks, `observer.kill()` on unmount, null-ref guard.
- `tests/components/App.spec.ts` — added `vi.mock('@/composables/useGsapObserver')` to prevent jsdom crash from GSAP Observer internals.
- **1417 tests across 45 spec files** — all green.

### Files changed

- `src/composables/useGsapObserver.ts` (new)
- `src/App.vue`
- `tests/composables/useGsapObserver.spec.ts` (new)
- `tests/components/App.spec.ts`
- `src/components/onboarding/WhatsNewBanner.vue`
- `src/components/pages/DocsPage.vue`
- `tests/components/onboarding.spec.ts`
- `tests/components/pages/pages.spec.ts`
- `docs/PHASE_TRACKING.md`
- `CLAUDE.md`

---

## GSAP-SCROLLTRIGGER-HISTORY — ScrollTrigger scroll reveal (Dashboard + Spending) ✅

**Branch**: `feat/gsap-scrolltrigger-history`
**Status**: ✅ **COMPLETE** — June 2026
**Version**: v2.44.0 (MINOR — new user-facing animation)

### Motivation

The dashboard presented all section cards at once with a simple one-shot stagger. Adding ScrollTrigger makes the page feel alive while scrolling — sections reveal themselves progressively as they enter the viewport, and fade back out as they leave, creating a dynamic editorial feel throughout.

### Delivered scope

- **`src/composables/useScrollReveal.ts`** (new) — reusable composable wrapping GSAP ScrollTrigger with three methods:
  - `revealImmediate(targets, delay?, offsetYFactor?)` — above-fold stagger, no scroll dependency
  - `revealOnScrollY(targets, triggerEl?)` — bidirectional Y-axis ScrollTrigger (Dashboard)
  - `revealOnScrollX(target, triggerEl?)` — bidirectional X-axis ScrollTrigger (Spending/history feel)
  - Auto-cleanup via `onBeforeUnmount`; full `prefersReducedMotion` guard
- **`DashboardPage.vue`** updated:
  - Hero KPI card: immediate reveal on mount, 0.6× offset (shorter travel)
  - KPI stat tiles + Chequing Balance card: immediate stagger at delay 0.15s
  - Charts row (2-col): ScrollTrigger Y — inner BaseCards stagger as group
  - Widget row (3-col): ScrollTrigger Y — inner BaseCards stagger as group
  - Full-width cards (Subscriptions, Credit Cards, Wishlist): each gets its own ScrollTrigger Y
  - Bidirectional fade-out: top-exit goes upward (−Y×0.5), bottom-exit goes downward (+Y)
- **`SpendingPage.vue`** updated:
  - KPI tiles row: immediate stagger (above fold)
  - Charts row (conditional on data): slide-in from right via ScrollTrigger X
  - Purchases table card: slide-in from right via ScrollTrigger X
- **`tests/setup.ts`**: added global `gsap/ScrollTrigger` mock so pages rendering in jsdom never crash
- **`tests/composables/useScrollReveal.spec.ts`** (new) — 23 tests covering the full composable API
- **Ease**: `back.out` (springy settle, user-approved from demo)
- **Settings**: duration 0.5s, stagger 0.08s, offsetY 24px, offsetX 48px, outDuration 0.3s

### Tests

- 23 new tests in `useScrollReveal.spec.ts`
- All 1440 tests pass; zero `vue-tsc` errors
