# Documentation — A Penny For Our Thoughts

Welcome to the project documentation. This folder contains all guides, roadmaps, and reference materials for the "A Penny For Our Thoughts" financial dashboard.

## Quick Navigation

| Document | Purpose |
|----------|---------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | 🏗️ Current code structure, state management, composable contracts, testing strategy |
| **[PHASE_TRACKING.md](./PHASE_TRACKING.md)** | ✅ Progress tracking for every sprint and development phase |
| **[ROADMAP.md](./ROADMAP.md)** | 🗺️ Catalogued future feature ideas, organised by category and effort |
| **[BUGS.md](./BUGS.md)** | 🐛 Running bug log — root causes, fixes, and prevention patterns |
| **[USER_GUIDE.md](./USER_GUIDE.md)** | 📖 Complete feature reference for end-users |

## Project Overview

**A Penny For Our Thoughts** is a personal financial dashboard built on the 50/30/20 budget rule. The app runs entirely in the browser with no backend — all data lives in `localStorage`.

- **Tech Stack**: Vue 3 + TypeScript + Pinia + Vite + Tailwind CSS v4
- **Current Version**: v2.0.0 (Vivid Modern redesign — sidebar nav, Supabase auth, status bar, full polish pass)
- **Design Direction**: Vivid Modern — violet accent palette, 64px icon sidebar, responsive across all 6 tabs
- **Testing**: Vitest + @vue/test-utils · 1567 tests across 54 spec files
- **CI/CD**: GitHub Actions (CI on PRs + deploy-to-GitHub-Pages on push to `main`)
- **Live URL**: [https://brahimmahadi.github.io/A-Penny-For-Our-Thoughts/](https://brahimmahadi.github.io/A-Penny-For-Our-Thoughts/)

## Feature Summary (v2.0.0)

| Feature | Description |
|---------|-------------|
| **Income Streams** | Multiple sources, monthly or bi-weekly, drives all budget calculations |
| **Budget Allocation** | Editable 50/30/20 split; must always sum to 100% |
| **Wants Tracker** | Bi-weekly envelope with donut chart, category chips, subscription deductions |
| **Envelope Forecast** | Linear projection of end-of-period spend at current daily rate (green/amber/red) |
| **Budget vs. Actual** | Monthly needs/wants/savings actual vs. budgeted with variance status |
| **MoM Stat Deltas** | Dashboard stat cards show ▲/▼ vs. prior-month spend |
| **Spending Trend Chart** | 6-month stacked bar chart (Needs/Wants/Savings) with income reference line |
| **Expense Cards** | Per-payment-method bill lists; bi-weekly + due-day support |
| **Loans** | Outstanding debt with payment schedule; feeds net worth liabilities |
| **Credit Cards** | Balance + limit tracking; feeds net worth liabilities |
| **Subscriptions** | CRUD with frequency, budget type, renewal countdown |
| **Savings Accounts** | Balance + monthly allocation; per-month override support |
| **Savings Goals** | Per-account targets with progress bars, monthly needed, on-track status |
| **Goals Timeline** | Ranked projection of all goals with completion dates and lateness |
| **Net Worth** | Auto-calculated from assets + liabilities; monthly snapshot history chart |
| **Spending Analytics** | Filtered history with date range, search, category chart, MoM trends |
| **Recurring Schedule** | 6-month forecast + interactive calendar view |
| **Transaction Rules** | Auto-categorise purchases by name pattern (contains/startsWith/exact) |
| **Budget Alerts** | Per-category spend threshold alerts shown in Wants Tracker |
| **Onboarding Flow** | 4-step first-run wizard; "What's New" banner for returning users |
| **CSV Import/Export** | Full state serialised to/from a structured CSV (17 sections) |
| **Keyboard Shortcuts** | `?` help, `1–4` tabs, `E` export, `T` theme, `S` settings |
| **Installable (PWA)** | Add to home screen on iOS/Android; launches full-screen. Online-only — not an offline app |
| **Mobile Navigation** | Bottom bar: 5 primary tabs plus a "More" sheet for Docs and Settings |
| **Theme** | Dark/light toggle with CSS variable system |
| **GitHub Pages Deploy** | Automated deploy to `gh-pages` on every push to `main` |

## Getting Started (Development)

```bash
npm install          # install dependencies
npm run dev          # development server at http://localhost:3000
npm run build        # production build (output → dist/)
npm run preview      # serve the production build locally
```

## Running Tests

```bash
npm test                  # run all 508 tests (Vitest)
npm run type-check        # vue-tsc --noEmit
npm run lint              # ESLint with zero-warnings threshold
```

## Key Source Files

```
src/
├── main.ts                  App entry point (createApp, Pinia, Chart.js, auto-persist)
├── App.vue                  Root SFC — header, tab bar, ToastContainer, modals
├── stores/budget.ts         Pinia store — full CRUD, persistence, CSV, migrations
├── stores/ui.ts             Transient UI state (active tab, filters, schedule month)
├── stores/theme.ts          Dark/light mode with localStorage persistence
├── composables/             useAnalytics, useChartStyles, useInView, useKeyboard,
│                            useModal, useToast
├── utils/calculations.ts    Pure analytics functions (~1,200 lines, fully typed)
├── utils/csvImportExport.ts Full state ↔ CSV serialiser/parser (17 sections)
└── components/              pages/, sections/, charts/, ui/, onboarding/
```

## Historical Documents

These documents describe earlier eras of the project and are kept for reference only:

| Document | Notes |
|----------|-------|
| **[ROADMAP.md](./ROADMAP.md)** | Now repurposed as the forward-looking future features catalogue |
| **[VUE3_MIGRATION_PLAN.md](./VUE3_MIGRATION_PLAN.md)** | Sprint-by-sprint Vue 3 migration plan — COMPLETE (v1.0.0 shipped) |

---

**Last Updated**: May 2026
**Version**: v1.6.0
**Tech Stack**: Vue 3 · TypeScript · Pinia · Vite · Tailwind CSS v4 · Vitest
