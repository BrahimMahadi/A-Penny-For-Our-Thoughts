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

### 2B: Recurring Expense Calendar
**Priority**: 🟡 MEDIUM
- [ ] Month calendar view with expenses mapped to dates
- [ ] Highlight "expensive months" based on bi-weekly schedules
- [ ] 6-month expense forecast
- [ ] Toggle between list and calendar views

### 2C: Subscription Budget Integration
**Priority**: 🟡 MEDIUM
- [ ] Track subscription annual cost total
- [ ] Show monthly subscription spend vs. Wants budget impact
- [ ] Renewal alert system (in-dashboard, not just day countdown)

### 2D: Month-over-Month Analytics
**Priority**: 🟢 LOW
- [ ] Compare current month to previous months in spending analytics
- [ ] Seasonal trend detection (e.g., "spending typically up in Dec")
- [ ] Category breakdown over time

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
**Status**: 🟡 **IN PROGRESS** (branch: `feat/vite-setup`)
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

### Story 5: Build Pipeline & Measurement 🔲
- [ ] `vite build` → verify bundle sizes
- [ ] Compare before/after: JS bundle size, CSS size
- [ ] Update `.claude/launch.json` if needed

---

## Overall Progress

| Phase | Status | % Done |
|-------|--------|--------|
| Phase 0 — Design & Visual Polish | ✅ Complete | 100% |
| Phase 1 — Analytics & Goal Tracking | ✅ Complete | 100% |
| Sprint 3 — Polish & UX Refinement | ✅ Complete | 100% |
| Phase 2 — Advanced Features | 🟡 In Progress | 25% (2A done) |
| Infra — Vite + Tailwind Migration | 🟡 In Progress | 80% (Stories 1-4 done) |
| Phase 3 — Code Quality | 🟢 Pending | 0% |
| **Overall** | **In Progress** | **~73%** |

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

**Last Updated**: May 2026  
**Current Phase**: Vite + Tailwind migration in progress on `feat/vite-setup`. Stories 1–4 complete. Story 5 (build pipeline + bundle measurement) is next.  
**Next Branch**: TBD based on Sprint 4 planning
