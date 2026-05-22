# Vue 3 + TypeScript Migration Plan

**Author:** Brahim
**Drafted:** May 2026
**Target branch:** `feat/vue3-migration` (long-lived)
**Cutover:** when feature parity reached, merge → `main`, tag `v1.0.0`
**Estimated effort:** ~90 hours over 5-6 weeks @ 20 hrs/week

---

## Why migrate

Four bugs in three weeks (BUG-004, -005, -007, -008) all came from the same root: **manual reactivity in vanilla JS with no compile-time safety**. Every section is wired into `renderAll()` by hand, every cross-module reference depends on remembering to import. The vanilla architecture has carried us to feature-complete MVP, but the pattern doesn't scale.

### Migration motivations (confirmed by user)

1. **Eliminate the recurring bug class** — TypeScript's `no-undef` enforcement at compile time would have caught all 4 latent bugs before they shipped. Vue's reactivity eliminates the `renderAll()` re-render coverage gap that caused BUG-006.
2. **Code maintainability** — `render.js` is ~1,800 lines. SFC components give clear ownership and a navigable mental model.
3. **Learning / portfolio** — Hands-on Vue 3 + TypeScript experience on a real project.
4. **Multi-user readiness** — If this becomes a shared tool for friends/family, Vue's ecosystem (Router, composables, SSR option, auth integrations) makes that path tractable.

### Non-goals

- Backend / API — the app stays browser-only with localStorage. Multi-user is a future possibility, not part of this migration.
- Feature parity ONLY — no new features during migration. Phase 3 work is paused until cutover.
- Visual redesign — UI matches existing exactly; no new design system.

---

## Confirmed decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Strategy** | Branch rewrite, cutover | `main` stays deployable; clean architectural slate; predictable timeline |
| **Language** | TypeScript (strict mode) | Catches the entire missing-import bug class at compile time |
| **State management** | Pinia | First-party Vue 3 store; great TypeScript inference; smaller than Vuex |
| **Charts** | Chart.js via vue-chartjs | Preserves all existing chart code; smallest delta |
| **Styling** | Keep Tailwind v4 | Already Vite-native; no change needed |
| **Routing** | None initially | Tabs via `v-if`; add Vue Router only if URL-shareable views become needed |
| **Testing** | Vitest + @vue/test-utils | First-party Vite tooling; type-aware |
| **Linting** | ESLint + eslint-plugin-vue + @typescript-eslint, `no-undef` enforced | Prevents BUG-004/-005/-007/-008 recurrence |

---

## Target file tree

```
src/
├── main.ts                          # Entry point
├── App.vue                          # Root layout, header, tab switcher
├── env.d.ts                         # Vite + Vue type shims
│
├── components/
│   ├── sections/                    # One per dashboard section
│   │   ├── IncomeStreams.vue
│   │   ├── BudgetAllocation.vue
│   │   ├── ExpenseCards.vue
│   │   ├── Loans.vue
│   │   ├── CreditCards.vue
│   │   ├── Subscriptions.vue
│   │   ├── Savings.vue
│   │   ├── SavingsGoals.vue
│   │   ├── Wishlist.vue
│   │   ├── WantsTracker.vue
│   │   ├── NetWorth.vue
│   │   ├── BudgetVsActual.vue
│   │   ├── RecurringCalendar.vue
│   │   └── SpendingAnalytics.vue
│   │
│   ├── charts/                      # vue-chartjs wrappers
│   │   ├── WantsDonut.vue
│   │   ├── CcBar.vue
│   │   ├── AnalyticsLine.vue
│   │   ├── AnalyticsBar.vue
│   │   ├── MoMTrend.vue
│   │   ├── BudgetVsActualChart.vue
│   │   ├── NetWorthChart.vue
│   │   └── ForecastBar.vue
│   │
│   └── ui/                          # Reusable primitives
│       ├── BaseModal.vue            # Teleport-based modal
│       ├── BaseCard.vue
│       ├── BaseButton.vue
│       ├── StatCard.vue
│       ├── EmptyState.vue
│       ├── ProgressBar.vue
│       └── ToastContainer.vue
│
├── stores/                          # Pinia stores
│   ├── budget.ts                    # Core financial state (replaces state.js)
│   ├── ui.ts                        # Panel/modal/filter state (replaces uistate.js)
│   └── theme.ts                     # Theme toggle + persistence
│
├── composables/
│   ├── useAnalytics.ts              # Pure calculation helpers
│   ├── useTheme.ts
│   ├── useToast.ts
│   ├── useModal.ts
│   ├── useCsv.ts
│   └── useKeyboard.ts
│
├── types/                           # Shared TS interfaces
│   ├── budget.ts                    # Income, Loan, Goal, etc.
│   └── state.ts                     # BudgetState, UiState
│
├── utils/                           # Pure functions
│   ├── format.ts                    # fmt, pct, daysUntil
│   ├── csv.ts                       # parseCSVRow, csvEscape
│   ├── id.ts                        # genId
│   └── date.ts                      # monthlyAmount, calculateMonthsBetween
│
└── assets/
    └── css/                         # Existing CSS modules (carry over)
        ├── tokens.css
        ├── layout.css
        ├── forms.css
        ├── features.css
        ├── ui.css
        ├── docs.css
        ├── responsive.css
        └── extras.css

tests/
├── stores/
│   ├── budget.spec.ts
│   └── ui.spec.ts
├── composables/
│   └── useAnalytics.spec.ts
├── utils/
│   ├── csv.spec.ts
│   └── format.spec.ts
└── components/
    └── BaseModal.spec.ts
```

---

## Typed state schema (sketch)

The hardest piece of Sprint 1 — defining the type contracts that everything else builds on. Locked to backward-compat with existing `penny_state_v2` localStorage data.

```ts
// src/types/budget.ts

export type ISODate = string;          // 'YYYY-MM-DD'
export type ISOMonth = string;         // 'YYYY-MM'
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type BudgetType = 'needs' | 'wants' | 'savings';
export type ThemeMode = 'light' | 'dark';

export interface Income {
  id: string;
  source: string;
  amount: number;
  frequency: Frequency;
  startDate?: ISODate;
}

export interface ExpenseCard {
  id: string;
  name: string;
  amount: number;
  category: string;
  budgetType: BudgetType;
  frequency: Frequency;
}

export interface Loan {
  id: string;
  name: string;
  principal: number;
  remaining: number;
  monthlyPayment: number;
  interestRate?: number;
  startDate?: ISODate;
  endDate?: ISODate;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  balance: number;
  apr?: number;
  minPayment?: number;
  dueDate?: number;          // day of month
}

export interface SavingsAccount {
  id: string;
  name: string;
  category: 'tfsa' | 'rrsp' | 'emergency' | 'investments' | 'cash' | 'other';
  balance: number;
  monthlyContribution?: number;
}

export interface Goal {
  id: string;
  accountId: string;
  targetAmount: number;
  targetDate: ISOMonth;
  createdAt: ISODate;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  nextRenewal: ISODate;
  category: string;
}

export interface Purchase {
  id: string;
  name: string;
  amount: number;
  category: string;
  budgetType: BudgetType;
  date: ISODate;
  cardId?: string;
}

export interface SpendingHistoryPeriod {
  id: string;
  date: ISODate;                       // period close date
  total: number;
  items: Array<{
    name: string;
    amount: number;
    category: string;
    date: ISODate;
  }>;
}

export interface NetWorthSnapshot {
  date: ISOMonth;
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  nextDate: ISODate;
}

export interface Rule {
  id: string;
  keyword: string;
  category: string;
  budgetType: BudgetType;
}

export interface WishlistItem {
  id: string;
  name: string;
  amount: number;
  priority: 'low' | 'medium' | 'high';
}
```

```ts
// src/types/state.ts

import type {
  Income, ExpenseCard, Loan, CreditCard, SavingsAccount, Goal,
  Subscription, Purchase, SpendingHistoryPeriod, NetWorthSnapshot,
  RecurringExpense, Rule, WishlistItem, ThemeMode
} from './budget';

export interface BudgetState {
  // Income
  incomes: Income[];

  // Budget allocation (50/30/20 — editable)
  allocation: {
    needs: number;     // 0–1
    wants: number;
    savings: number;
  };

  // Sections
  expenseCards: ExpenseCard[];
  loans: Loan[];
  creditCards: CreditCard[];
  savingsAccounts: SavingsAccount[];
  goals: Goal[];
  subscriptions: Subscription[];
  recurringExpenses: RecurringExpense[];
  wishlist: WishlistItem[];

  // Tracking
  purchases: Purchase[];
  spendingHistory: SpendingHistoryPeriod[];
  netWorthHistory: NetWorthSnapshot[];

  // Rules engine (Phase 3)
  rules: Rule[];

  // Schema version
  version: 2;
}

export interface UiState {
  activeTab: 'dashboard' | 'analytics' | 'schedule' | 'docs';
  theme: ThemeMode;
  analyticsFilters: {
    startDate: ISODate | null;
    endDate: ISODate | null;
    category: string | null;
    budgetType: BudgetType | null;
  };
  modal: {
    open: boolean;
    title: string;
    fields: unknown;       // refined per modal type
  };
}
```

---

## Pinia store contract (budget)

```ts
// src/stores/budget.ts

import { defineStore } from 'pinia';
import type { BudgetState, Income, Loan, /* ... */ } from '../types/state';

export const useBudgetStore = defineStore('budget', {
  state: (): BudgetState => ({
    incomes: [],
    allocation: { needs: 0.50, wants: 0.30, savings: 0.20 },
    // ...
    version: 2,
  }),

  getters: {
    totalMonthlyIncome: (state) => state.incomes.reduce(/* ... */),
    monthlyAllocations: (state) => ({
      needs: state.allocation.needs * /* totalMonthlyIncome */,
      wants: state.allocation.wants * /* totalMonthlyIncome */,
      savings: state.allocation.savings * /* totalMonthlyIncome */,
    }),
    // ... all read-only derivations move here from analytics.js
  },

  actions: {
    // CRUD per section
    addIncome(income: Omit<Income, 'id'>): void { /* ... */ },
    updateIncome(id: string, patch: Partial<Income>): void { /* ... */ },
    deleteIncome(id: string): void { /* ... */ },
    // ... mirrors existing addX/updateX/deleteX patterns

    // Persistence
    loadFromStorage(): void { /* ... */ },
    saveToStorage(): void { /* ... */ },          // called by Pinia plugin watching state
    migrateFromV1(raw: unknown): BudgetState { /* ... */ },

    // CSV
    exportCSV(): string { /* ... */ },
    importCSV(text: string): void { /* ... */ },
  },
});
```

Pinia plugin auto-saves on any mutation:

```ts
// src/main.ts (excerpt)
pinia.use(({ store }) => {
  store.$subscribe((_, state) => {
    localStorage.setItem('penny_state_v2', JSON.stringify(state));
  });
});
```

---

## ESLint configuration (sprint 0)

```js
// .eslintrc.cjs
module.exports = {
  root: true,
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    'no-undef': 'error',           // ← would have caught BUG-004/-005/-007/-008
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'vue/multi-word-component-names': 'off',  // BaseCard/BaseModal are fine
  },
};
```

Added to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint --ext .ts,.vue src/",
    "type-check": "vue-tsc --noEmit",
    "build": "npm run type-check && vite build"
  }
}
```

---

## CI workflow update

```yaml
# .github/workflows/deploy.yml — additions before the build step
      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint
```

Build fails if either step fails — prevents the entire BUG-004/-005/-007/-008 pattern from ever reaching production.

---

## Sprint Plan

### Sprint 0 — Foundation (Week 1, ~12 hrs)

- [ ] Branch off `main` → `feat/vue3-migration`
- [ ] Install dependencies: `vue@3`, `pinia`, `vue-chartjs`, `chart.js`, `typescript`, `vue-tsc`, `vitest`, `@vue/test-utils`, `eslint`, `eslint-plugin-vue`, `@typescript-eslint/*`
- [ ] Configure `tsconfig.json` (strict mode, paths alias `@/*` → `src/*`)
- [ ] Rename `vite.config.js` → `vite.config.ts`; add `@vitejs/plugin-vue`
- [ ] Add `.eslintrc.cjs` per the config above
- [ ] Update `package.json` scripts (`lint`, `type-check`, `build`)
- [ ] Create folder structure per target file tree
- [ ] Scaffold empty `main.ts`, `App.vue`, `env.d.ts`
- [ ] Update GitHub Actions to run type-check + lint
- [ ] Verify CI green on empty Vue scaffold

**Definition of done:** `npm run dev` opens an empty Vue app; `npm run build && npm run type-check && npm run lint` all pass; CI green on first push of the branch.

---

### Sprint 1 — State Foundation (Week 1-2, ~14 hrs)

Hardest sprint. No visible UI progress, but everything downstream depends on getting this right.

- [ ] `src/types/budget.ts` — all entity interfaces (Income, Loan, Goal, etc.)
- [ ] `src/types/state.ts` — `BudgetState`, `UiState`
- [ ] `src/utils/format.ts`, `csv.ts`, `id.ts`, `date.ts` — port pure helpers with types
- [ ] `src/stores/budget.ts` — Pinia store with full CRUD actions + getters (replaces `state.js` + analytics calculations)
- [ ] `src/stores/ui.ts` — UI state (panels, filters, modals)
- [ ] `src/stores/theme.ts` — theme persistence
- [ ] `src/composables/useAnalytics.ts` — pure calculation functions (port from `analytics.js`)
- [ ] localStorage plugin (auto-save on mutations)
- [ ] v1 → v2 migration logic ported and unit-tested
- [ ] Unit tests: `budget.spec.ts`, `csv.spec.ts`, `format.spec.ts`

**Definition of done:** All store actions tested; v1→v2 migration tested with real backup data; type-check clean.

---

### Sprint 2 — Core Layout & Primitives (Week 2, ~10 hrs)

- [ ] `App.vue` — header, tab navigation, page switcher (`v-if` based)
- [ ] `components/ui/BaseModal.vue` — Teleport to body, slot-driven, focus trap
- [ ] `components/ui/BaseCard.vue`, `BaseButton.vue`, `EmptyState.vue`, `StatCard.vue`, `ProgressBar.vue`
- [ ] `components/ui/ToastContainer.vue`
- [ ] `composables/useToast.ts`, `useModal.ts`, `useKeyboard.ts`
- [ ] Theme toggle wired via `useTheme()`
- [ ] CSS modules carried over from existing `src/css/`

**Definition of done:** App shell renders with tabs, modal opens/closes via composable, theme toggle works.

---

### Sprint 3 — Chart Components (Week 2-3, ~10 hrs, parallel with Sprint 4)

One SFC per chart. Reactive to props via `watch`. Chart.js instance reused (update vs destroy/recreate).

- [ ] `WantsDonut.vue`
- [ ] `CcBar.vue`
- [ ] `AnalyticsLine.vue`
- [ ] `AnalyticsBar.vue`
- [ ] `MoMTrend.vue`
- [ ] `BudgetVsActualChart.vue`
- [ ] `NetWorthChart.vue`
- [ ] `ForecastBar.vue`
- [ ] Theme reactivity: `watch(theme, () => chart.update())`

**Definition of done:** All 8 charts render in isolation with mock data; theme toggle re-renders charts; props updates animate smoothly.

---

### Sprint 4 — Section Migration (Week 3-5, ~35 hrs)

One PR per section, smoke-tested against `main`. Each section gets typed props/state, store integration, mobile responsive, and at least one Vitest test.

Migration order (simplest → most complex):

1. [ ] `IncomeStreams.vue` (~2 hrs — establishes the pattern)
2. [ ] `BudgetAllocation.vue` (~2 hrs)
3. [ ] `ExpenseCards.vue` (~3 hrs)
4. [ ] `Loans.vue`, `CreditCards.vue` (~4 hrs combined)
5. [ ] `Subscriptions.vue` (~3 hrs)
6. [ ] `Savings.vue` + `SavingsGoals.vue` (~4 hrs)
7. [ ] `Wishlist.vue` (~2 hrs)
8. [ ] `WantsTracker.vue` + WantsDonut integration (~3 hrs)
9. [ ] `NetWorth.vue` + NetWorthChart (~3 hrs)
10. [ ] `BudgetVsActual.vue` + chart (~3 hrs)
11. [ ] `RecurringCalendar.vue` (~3 hrs)
12. [ ] `SpendingAnalytics.vue` + 3 charts + MoM (~5 hrs)

**Per-section DoD:**
- Typed props (no `any`)
- Store integration (no prop drilling beyond 1 level)
- CRUD works (add/edit/delete + persistence)
- Mobile responsive (matches existing breakpoints: 1024, 768, 540, 380px)
- At least one Vitest test
- Visual parity with `main` (side-by-side check)

---

### Sprint 5 — CSV, Polish, A11y (Week 5, ~8 hrs)

- [ ] `useCsv.ts` — file picker, parser, generator (ported from existing)
- [ ] CSV import/export tested with `sample-data.csv` and `blank-template.csv` round-trips
- [ ] Keyboard shortcuts (composable + directive)
- [ ] Focus management in modals (focus trap, return focus on close)
- [ ] ARIA labels audit across components
- [ ] `prefers-reduced-motion` support for animations

**Definition of done:** CSV round-trip preserves all data; keyboard nav works end-to-end; a11y audit passes.

---

### Sprint 6 — Testing & Cutover (Week 6, ~10 hrs)

- [ ] Test coverage: stores 100%, composables 80%+, key components covered
- [ ] Side-by-side QA: open `main` and Vue branch in two browsers, walk every section
- [ ] Visual regression check (manual at minimum)
- [ ] Verify `penny_state_v2` localStorage data loads cleanly in Vue version
- [ ] Performance test: load with 5 years of mock history
- [ ] Update `CLAUDE.md`, `PHASE_TRACKING.md`, `ARCHITECTURE.md`
- [ ] Merge `feat/vue3-migration` → `main`
- [ ] Tag `v1.0.0`
- [ ] Verify GitHub Pages deploy succeeds

**Definition of done:** Feature parity confirmed via side-by-side QA; no console errors; existing user data loads correctly; v1.0.0 tagged and deployed.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| TypeScript learning curve slows Sprint 1 | High | Medium | Sprint 1 is the hardest; allocate buffer. Pair on the state schema together. |
| Chart.js + Vue reactivity edge cases | Medium | Medium | Preserve existing instance-reuse pattern; explicit `chart.update('none')` on prop change |
| localStorage data shape regression | Low | High | Keep `penny_state_v2` key untouched; write migration unit test FIRST before touching state shape |
| Scope creep over 6 weeks | High | Medium | One section per PR; no new features on `main` after Sprint 3 starts; weekly check-in |
| `main` drifts from `feat/vue3-migration` | Medium | Low | Rebase weekly; freeze `main` to bug fixes only |
| Solo-dev burnout | Medium | High | Per-section PRs ship dopamine hits; sprint demos to self; can pause between sprints |
| Visual regressions | Medium | Low | Side-by-side QA before each section PR merges to migration branch |

---

## What stays the same

- **All CSS modules** in `src/css/` carry over verbatim. Tokens, layout, forms, features, ui, docs, responsive, extras.
- **Chart.js styling and theme integration** — preserved via `useTheme()` + `chart.update()`.
- **localStorage key `penny_state_v2`** — same key, same shape (with TypeScript layered on top).
- **CSV format** — backward-compat with existing exports.
- **GitHub Pages deploy workflow** — unchanged; just builds the new entry point.
- **Existing `docs/`** — kept; this plan added alongside.

---

## Cutover checklist (end of Sprint 6)

- [ ] All 14 sections render and CRUD works
- [ ] All 8 charts render and theme-toggle correctly
- [ ] CSV import/export round-trips cleanly
- [ ] localStorage migration tested with backup of real data
- [ ] No console errors in production build
- [ ] Lighthouse score: Performance ≥ 90, Accessibility ≥ 90
- [ ] Mobile tested on iOS Safari + Android Chrome
- [ ] Type-check + lint + tests all green in CI
- [ ] `PHASE_TRACKING.md` updated with Sprint 4 (Vue Migration) ✅
- [ ] `ARCHITECTURE.md` updated for new file tree
- [ ] `CLAUDE.md` tech stack section updated
- [ ] Tag `v1.0.0`
- [ ] Verify GitHub Pages serves the new build

---

## Open questions / decisions deferred

These don't block the migration but should be decided along the way:

1. **Vue Router?** — Currently planned as `v-if` tabs. If we want URL-shareable views (e.g., `/analytics`, `/calendar`), add router in Sprint 2. Decide by end of Sprint 1.
2. **Pinia persistence plugin** — Use `pinia-plugin-persistedstate` (community) or write a 10-line custom plugin. Default: custom (no dependency).
3. **i18n** — Out of scope for this migration. Revisit if multi-user becomes real.
4. **Component library** — Building primitives from scratch (BaseModal, BaseCard). If progress lags, consider Headless UI Vue or Reka UI for accessibility primitives.

---

**Next step:** start Sprint 0 — scaffold the branch and dependencies.
