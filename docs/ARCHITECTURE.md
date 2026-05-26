# Architecture — A Penny For Our Thoughts (v1.6+)

> Last updated: May 2026 — reflects v1.6.0 (Sprint 12): spending trend chart, goals timeline, envelope forecast, MoM stat deltas, onboarding flow, swipe navigation, GitHub Pages CI deploy.

---

## Overview

"A Penny For Our Thoughts" is a **fully client-side** personal finance dashboard. There is no backend — all state lives in `localStorage`. The app is a Vue 3 SPA built with Vite, TypeScript, and Pinia.

```
Browser
  └─ index.html  (Vite entry)
       └─ main.ts  (createApp + Pinia + Chart.js registration)
            └─ App.vue  (root: header, tab nav, swipe gesture, onboarding, What's New banner)
                 ├─ DashboardPage.vue  ─→  15 section SFCs + SpendingTrendChart
                 ├─ SchedulePage.vue   ─→  RecurringCalendar
                 ├─ DocsPage.vue       ─→  5 static content sections
                 └─ SettingsPage.vue   ─→  PayStartDate, RulesEngine, BudgetAlerts
```

---

## File Tree

```
src/
│
├── main.ts                  Entry: createApp, Pinia, Chart.js, auto-persist
├── App.vue                  Root SFC: header, tab bar, ToastContainer, swipe gesture,
│                            OnboardingModal (isFirstRun), WhatsNewBanner
├── env.d.ts                 Vite/TypeScript environment declarations
│
├── types/
│   ├── budget.ts            Entity interfaces (IncomeStream, Loan, Goal, Rule …)
│   └── state.ts             BudgetState (+hasOnboarded, +dismissedVersion), UiState,
│                            STORAGE_KEYS, TabId, ScheduleView
│
├── stores/
│   ├── budget.ts            Pinia: full CRUD + persistence + CSV + migrations
│   │                        Actions: completeOnboarding(), dismissWhatsNew()
│   │                        Getter: isFirstRun
│   ├── ui.ts                Pinia: transient UI state (active tab, filters, schedule month)
│   └── theme.ts             Pinia: dark/light mode with localStorage persistence
│
├── composables/
│   ├── useAnalytics.ts      Reactive computed wrappers — includes envelopeForecast,
│   │                        prevMonthActuals, spendingTrend, goalsTimeline
│   ├── useChartStyles.ts    CSS-variable reader — feeds Chart.js colour/font config
│   ├── useInView.ts         IntersectionObserver — lazy-render charts on scroll
│   ├── useKeyboard.ts       Global keyboard shortcut registry
│   ├── useModal.ts          Scroll-lock + ESC-dismiss logic for BaseModal
│   ├── useSwipe.ts          Touch gesture detector — left/right → tab navigation
│   └── useToast.ts          Module-scoped toast queue (not inject/provide)
│
├── utils/
│   ├── calculations.ts      Pure analytics functions (~1,200 lines, fully typed)
│   │                        Includes: getEnvelopeForecast, getPrevMonthActuals,
│   │                        getSpendingTrend, getGoalsTimeline
│   ├── csv.ts               Low-level CSV string parser
│   ├── csvImportExport.ts   Full state ↔ CSV serialiser/parser (17 sections)
│   ├── date.ts              ISO date helpers (today, month arithmetic)
│   ├── dom.ts               cssVar() — reads a CSS custom property from :root
│   ├── format.ts            fmt() currency, pct() percentage
│   └── id.ts                genId(), deepClone()
│
├── data/
│   └── categories.ts        Canonical spending-category list (shared by sections)
│
├── components/
│   ├── pages/
│   │   ├── DashboardPage.vue    Hosts 15 dashboard sections + SpendingTrendChart
│   │   │                        MoM deltas wired to Needs/Wants/Net Worth stat cards
│   │   ├── SchedulePage.vue     Hosts RecurringCalendar
│   │   ├── DocsPage.vue         Static docs with sidebar + mobile dropdown nav
│   │   └── SettingsPage.vue     Pay period, rules, alerts, balance, danger zone
│   │
│   ├── sections/               One SFC per feature area
│   │   ├── BudgetAllocation.vue
│   │   ├── BudgetAlerts.vue
│   │   ├── BudgetVsActual.vue
│   │   ├── CreditCards.vue
│   │   ├── ExpenseCards.vue
│   │   ├── GoalsTimeline.vue    (Sprint 12) Ranked goal projections with completion dates
│   │   ├── IncomeStreams.vue
│   │   ├── Loans.vue
│   │   ├── NetWorth.vue
│   │   ├── PayStartDate.vue
│   │   ├── RecurringCalendar.vue
│   │   ├── RulesEngine.vue
│   │   ├── Savings.vue
│   │   ├── SavingsGoals.vue
│   │   ├── SpendingAnalytics.vue
│   │   ├── Subscriptions.vue
│   │   ├── WantsTracker.vue     (Sprint 11) Envelope forecast chip
│   │   └── Wishlist.vue
│   │
│   ├── charts/                 vue-chartjs wrappers — all lazy via useInView
│   │   ├── AnalyticsBar.vue
│   │   ├── AnalyticsLine.vue
│   │   ├── BudgetVsActualChart.vue
│   │   ├── CcBar.vue
│   │   ├── ForecastBar.vue
│   │   ├── MoMTrend.vue
│   │   ├── NetWorthChart.vue
│   │   ├── SpendingTrendChart.vue  (Sprint 12) 6-month stacked bar + income line
│   │   └── WantsDonut.vue
│   │
│   ├── onboarding/             First-run wizard and What's New banner (Sprint 10)
│   │   ├── OnboardingModal.vue  4-step teleport modal; emits 'done'
│   │   └── WhatsNewBanner.vue  Dismissible release-notes chip (APP_VERSION gated)
│   │
│   └── ui/                     Reusable primitives
│       ├── BaseButton.vue
│       ├── BaseCard.vue
│       ├── BaseModal.vue
│       ├── EmptyState.vue
│       ├── ProgressBar.vue
│       ├── StatCard.vue        delta/invertDelta props for MoM indicators
│       └── ToastContainer.vue
│
├── css/
│   ├── tokens.css      CSS custom properties (colours, spacing, radius)
│   ├── layout.css      App shell grid, header, tab bar
│   ├── forms.css       Inputs, selects, labels, modal forms
│   ├── features.css    Section-level styles + .chart-skeleton
│   ├── ui.css          Primitives (cards, buttons, toasts, badges)
│   ├── responsive.css  Media query overrides (1024/768/540/380 px)
│   └── extras.css      Animations, transitions, utility classes
│
└── styles.css          Tailwind v4 entry point — imports tokens + theme block
```

---

## State Management

### BudgetState (persisted)

Stored under `localStorage['penny_state_v2']` as JSON. Loaded on startup via `loadStateFromStorage()` with automatic v1 → v2 migration.

```typescript
interface BudgetState {
  // Budget
  allocation:       { needs: number; wants: number; savings: number };
  budgetDisplayMode: BudgetDisplayModes;

  // Income
  incomeStreams: IncomeStream[];            // { id, name, amount, biweekly }

  // Expenses
  expenseCards:     ExpenseCard[];          // { id, cardLabel, items[] }
  purchases:        Purchase[];             // current bi-weekly envelope
  spendingHistory:  SpendingHistoryPeriod[];// archived periods

  // Debts
  loans:        Loan[];
  creditCards:  CreditCard[];

  // Recurring
  subscriptions: Subscription[];

  // Savings
  wishlist:        WishlistItem[];
  savingsAccounts: SavingsAccount[];        // balance + defaultAllocated + monthlyAllocations
  goals:           Goal[];                  // { id, accountId, targetAmount, targetDate }

  // Net worth
  assets:          Asset[];
  netWorthHistory: NetWorthSnapshot[];      // trimmed to 24 months

  // Settings
  payStart:              ISODate | null;
  rules:                 Rule[];            // { id, keyword, matchType, category }
  budgetAlerts:          BudgetAlert[];     // { id, category, threshold }
  fundsRemaining:        number;
  fundsRemainingUpdated: ISODate | '';
}
```

#### Storage key

```
localStorage['penny_state_v2']  — BudgetState as JSON
localStorage['penny_theme']     — 'dark' | 'light'
```

#### Persistence flow

```
User action (CRUD)
  → Pinia action mutates this.$state
    → $subscribe in main.ts fires
      → saveStateToStorage(state) → localStorage.setItem(...)
        → on failure: useToast().show('Storage is full …', 'danger')
```

`saveStateToStorage` returns `boolean` — `false` on `QuotaExceededError` or any other `DOMException`. The `$subscribe` watcher in `main.ts` catches failures and surfaces a danger toast.

### UiState (transient)

Not persisted. Resets on every page load.

```typescript
interface UiState {
  activeTab:          'dashboard' | 'schedule' | 'docs' | 'settings';
  analyticsPanelOpen: boolean;
  analyticsFilters:   { startDate, endDate, search };
  scheduleViewYear:   number;
  scheduleViewMonth:  number;  // 1-based
  scheduleView:       'list' | 'calendar';
}
```

### ThemeState

```typescript
// Backed by localStorage['penny_theme']
type ThemeMode = 'dark' | 'light';
```

`applyThemeToDOM(mode)` writes `data-theme` to `<html>` — all colours are CSS custom properties that flip based on `[data-theme="light"]`.

---

## Data Flow — Typical CRUD Action

```
1. User clicks "+ Add Stream" in IncomeStreams.vue
   ↓
2. BaseModal opens (useModal composable manages scroll-lock + ESC)
   ↓
3. User fills form, clicks Save
   ↓
4. IncomeStreams calls budget.addIncomeStream({ name, amount, biweekly })
   ↓
5. Pinia action pushes to this.incomeStreams
   ↓
6. Vue reactivity propagates to all consumers of budget.incomeStreams
   (IncomeStreams list, BudgetAllocation totals, StatCards, useAnalytics …)
   ↓
7. $subscribe in main.ts fires → saveStateToStorage()
   ↓
8. Modal closes, toast "Income stream added" appears
```

No manual `renderAll()` calls. Reactivity handles all DOM updates automatically.

---

## Composable Contracts

### `useToast()`
```typescript
// Module-scoped — safe to call from main.ts or any component
function useToast(): {
  toasts: Readonly<Ref<Toast[]>>;
  show(message: string, type?: 'success' | 'danger' | 'info' | 'warning'): number;
  dismiss(id: number): void;
}
```
`<ToastContainer />` in `App.vue` renders the queue. Toasts auto-dismiss after 2500 ms.

### `useModal(open: Ref<boolean>)`
```typescript
// Locks body scroll when open, dismisses on ESC
function useModal(open: Ref<boolean>): void
```

### `useKeyboard(bindings: KeyBinding[])`
```typescript
// Registers global keydown listeners, guarded inside text inputs
function useKeyboard(bindings: Array<{
  key: string;
  shift?: boolean;
  handler: () => void;
}>): void
```

### `useChartStyles()`
```typescript
// Reactive chart colour config derived from CSS custom properties
function useChartStyles(): ComputedRef<{
  accent: string; accent2: string; danger: string; warn: string;
  surface: string; surface2: string; tickColor: string; gridColor: string;
  fontFamily: string; tooltip: object;
  rgba(hex: string, alpha: number): string;
}>
```

### `useInView(elementRef, options?)`
```typescript
// Fires once when element enters viewport; stays true afterwards.
// Falls back to true immediately when IntersectionObserver is unavailable.
function useInView(
  elementRef: Ref<HTMLElement | null>,
  options?: { rootMargin?: string; threshold?: number }
): { isInView: Readonly<Ref<boolean>> }
```

### `useAnalytics()`
```typescript
// Computed wrappers around utils/calculations.ts — reactive to budget store
function useAnalytics(): {
  totalMonthlyIncome:   ComputedRef<number>;
  needsBudget:          ComputedRef<number>;
  wantsBudget:          ComputedRef<number>;
  savingsBudget:        ComputedRef<number>;
  wantsRemaining:       ComputedRef<number>;
  categorySpending:     ComputedRef<Record<string, number>>;
  usedPct:              ComputedRef<number>;
  progressForGoal:      (goal: Goal) => GoalProgress | null;
  // … and more
}
```

---

## Chart Architecture

All 8 chart SFCs in `src/components/charts/` follow the same pattern:

1. **Props** — receive pre-computed data from the parent section SFC
2. **`useChartStyles()`** — reactive colour config; automatically recolours on theme toggle
3. **`useInView(wrapperRef)`** — lazy render; chart canvas is `v-if="isInView"` with a `.chart-skeleton` placeholder until the element enters the viewport
4. **`vue-chartjs`** wrapper component — `<Bar>`, `<Line>`, `<Doughnut>`, or `<Chart type="bar">` for mixed types

Chart.js is registered globally in `main.ts`:
```typescript
import { Chart as ChartJS, registerables } from 'chart.js';
ChartJS.register(...registerables);
```

---

## Tab Routing

`App.vue` uses `<component :is="activePage" />` where `activePage` is a computed ref derived from `ui.activeTab`. Switching tabs **fully unmounts** the previous page and **mounts** the new one — no `<keep-alive>`. This means:

- Each tab mount re-runs all section setup (cheap — no network calls)
- `useInView` observers are created fresh and cleaned up on each unmount
- Charts in hidden tabs never consume canvas memory until the tab is visited

---

## CSV Import / Export

Implemented in `src/utils/csvImportExport.ts`:

- `exportStateToCSV(state: BudgetState): string` — pure serialiser
- `parseCSVToState(text: string): Partial<BudgetState>` — full parser with backward compatibility for legacy formats
- `triggerCSVDownload(csv, filename?)` — DOM download helper (separated for testability)

The budget store exposes `exportCSV()` and `importCSV(text)` actions that call these utilities. App toolbar buttons + keyboard shortcut `E` trigger export.

---

## Testing Strategy

**Framework**: Vitest + `@vue/test-utils`  
**Coverage**: 448 tests across 19 spec files (as of v1.2.0)

| Layer | Test file(s) | What's covered |
|---|---|---|
| Stores | `tests/stores/budget.spec.ts` | All CRUD actions, persistence, migrations, error handling |
| Stores | `tests/stores/theme.spec.ts` | Theme load/apply, error handling |
| Stores | `tests/stores/ui.spec.ts` | Tab state, filter state, month navigation |
| Composables | `tests/composables/useToast.spec.ts` | show, dismiss, auto-dismiss |
| Composables | `tests/composables/useKeyboard.spec.ts` | Key bindings, modifier guards |
| Composables | `tests/composables/useInView.spec.ts` | IO fallback, intersection, cleanup |
| Utils | `tests/utils/calculations.spec.ts` | All analytics calculations |
| Utils | `tests/utils/csvImportExport.spec.ts` | Round-trip all 17 sections |
| Utils | `tests/utils/format.spec.ts`, `id.spec.ts`, `date.spec.ts` | Utility functions |
| Components | `tests/components/App.spec.ts` | Tab routing, shortcuts, toolbar |
| Components | `tests/components/sections/sections.spec.ts` | All 13 section SFCs |
| Components | `tests/components/sections/settings.spec.ts` | PayStartDate, RulesEngine, BudgetAlerts |
| Components | `tests/components/pages/pages.spec.ts` | DocsPage, SettingsPage |
| Sanity | `tests/sanity.spec.ts` | Environment check |

**Mocking conventions**:
- `vue-chartjs` (`Bar`, `Line`, `Doughnut`, `Chart`) → stub canvas tags so jsdom doesn't throw
- `chart.js` → `{ Chart: { register: vi.fn() }, registerables: [] }`
- Heavy child sections in page tests → `vi.mock('@/components/sections/...')` stubs
- `IntersectionObserver` → class-based `MockIO` stub in `useInView.spec.ts`
- `localStorage` errors → `vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw ... })`

---

## Responsive Breakpoints

| Width | Device | Notable changes |
|---|---|---|
| 1200px+ | Wide desktop | Docs sidebar visible |
| 1024px | Desktop/Tablet break | Single-column dashboard on tablet |
| 768px | Tablet | Stacked header grid, 2-column stat cards |
| 540px | Mobile | Full-width forms, single-column |
| 380px | Small mobile | Compact typography, minimal padding |

---

## Git & Versions

| Tag | Description |
|---|---|
| `v1.0.0` | Vue 3 migration complete (Sprints 0–6) |
| `v1.1.0` | Settings, Rules Engine, Budget Alerts, Docs (Sprint 7) |
| `v1.2.0` | Error handling, lazy charts, architecture docs (Sprint 8) |
| `v1.3.0`–`v1.14.0` | Feature sprints (onboarding, charts, net worth, goals, calendar, MoM analytics, etc.) |
| `v1.15.0` | Search, sort & filter for Purchases and Subscriptions (Sprints 21–22) |
| `v1.16.0` | Retroactive category editing on archived purchases (Sprint 23) |
| `v1.17.0` | Supabase DB integration — Postgres backend, localStorage migration, optimistic updates (Sprint 24) |

**Branch strategy**: `feat/sprint-N` → PR → merge to `main` → tag.

**Branching policy**: All changes must be done in separate branches, tested thoroughly, and have all documentation updated to reflect the change before being ready to merge into `main`. Never commit directly to `main`. Every branch must pass `npx vitest run` and `npx tsc --noEmit` with zero errors, and all version-bearing docs (CLAUDE.md, PHASE_TRACKING.md, WhatsNewBanner, DocsPage) must be updated in the same branch as the feature work.

**Sprint planning policy**: Whenever a sprint plan is agreed upon, it must be documented immediately in `docs/PHASE_TRACKING.md` — both a detailed entry and a row in the summary table. Entries are marked 🔲 PLANNED → 🟡 IN PROGRESS → ✅ COMPLETE as work progresses. If scope changes mid-sprint, the PHASE_TRACKING.md entry must be updated in the same commit as the scope change. The active redesign plan lives under the **"Vivid Modern Redesign (v2.0.0)"** section.

---

## Key Design Decisions

### Why no Vue Router?
The app has 4 tabs with no URL-shareable sub-views. `<component :is>` is simpler, has zero bundle overhead, and the tab state (persisted in `UiState`) survives navigation within a session.

### Why module-scoped toast state?
`useToast()` uses a module-level `ref` rather than `provide/inject`, which allows it to be called from `main.ts` (before Vue mounts) — critical for surfacing localStorage errors that occur during startup hydration.

### Why `IntersectionObserver` in charts instead of sections?
Each chart SFC is self-contained with its own `wrapperRef`. Sections don't need to know about lazy-loading. The observer is created fresh on each tab mount and cleaned up on unmount — no memory leaks, no shared observer management.

### Why no `<keep-alive>` on tabs?
Sections are lightweight enough that re-mounting on tab switch is instant. `<keep-alive>` would accumulate detached chart canvases and IntersectionObserver instances, and would make the "fresh state on tab visit" behaviour harder to reason about.
