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
| **Current** | **✅ v1.7.0 shipped** | **v1.7.0** |

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

**Last Updated**: May 2026  
**Current Version**: v1.7.0 — Sprint 13 complete  
**Next Up**: UI polish & robustness sprint  
**Current Branch**: `main`
