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

## Overall Progress

| Phase | Status | % Done |
|-------|--------|--------|
| Phase 0 — Design & Visual Polish | ✅ Complete | 100% |
| Phase 1 — Analytics & Goal Tracking | ✅ Complete | 100% |
| Phase 2 — Advanced Features | 🟡 In Progress | 25% (2A done) |
| Phase 3 — Code Quality | 🟢 Pending | 0% |
| **Overall** | **In Progress** | **~62%** |

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

**Last Updated**: May 13, 2026  
**Current Phase**: Phase 2 (Advanced Features) — Net Worth Tracker complete; Recurring Expense Calendar (2B) is next  
**Branch**: `phase-1/budget-vs-actual` (Phase 1 work; consider branching `phase-2/net-worth` for next initiative)
