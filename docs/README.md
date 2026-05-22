# Documentation — A Penny For Our Thoughts

Welcome to the project documentation. This folder contains all guides, roadmaps, and reference materials for the "A Penny For Our Thoughts" financial dashboard.

## Quick Navigation

| Document | Purpose |
|----------|---------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | 🏗️ Current code structure, state management, composable contracts, testing strategy |
| **[PHASE_TRACKING.md](./PHASE_TRACKING.md)** | ✅ Progress tracking for every sprint and development phase |
| **[BUGS.md](./BUGS.md)** | 🐛 Running bug log — root causes, fixes, and prevention patterns |
| **[USER_GUIDE.md](./USER_GUIDE.md)** | 📖 Complete feature reference for end-users |

## Project Overview

**A Penny For Our Thoughts** is a personal financial dashboard built on the 50/30/20 budget rule. The app runs entirely in the browser with no backend — all data lives in `localStorage`.

- **Tech Stack**: Vue 3 + TypeScript + Pinia + Vite + Tailwind CSS v4
- **Current Version**: v1.2.0 (Sprint 8 — error handling, lazy charts, architecture docs)
- **Design Direction**: Bloomberg-style professional & data-focused
- **Testing**: Vitest + @vue/test-utils · 448 tests across 19 spec files

## Getting Started

1. **Understand the architecture?** Start with [ARCHITECTURE.md](./ARCHITECTURE.md)
2. **Track what's been built?** See [PHASE_TRACKING.md](./PHASE_TRACKING.md)
3. **Looking for a bug fix?** Check [BUGS.md](./BUGS.md)

## Current Status

**v1.2.0 — Sprint 8 complete:**
- ✅ Vue 3 + TypeScript migration (v1.0.0, Sprints 0–6)
- ✅ Settings page, Rules Engine, Budget Alerts, full Docs tab (v1.1.0, Sprint 7)
- ✅ localStorage error handling, lazy chart rendering via `useInView`, ARCHITECTURE.md rewrite, docs cleanup (v1.2.0, Sprint 8)

## Key Source Files

```
src/
├── main.ts                  App entry point (createApp, Pinia, Chart.js, auto-persist)
├── App.vue                  Root SFC — header, tab bar, ToastContainer, BaseModal
├── stores/budget.ts         Pinia store — full CRUD, persistence, CSV, migrations
├── stores/ui.ts             Transient UI state (active tab, filters, schedule month)
├── stores/theme.ts          Dark/light mode with localStorage persistence
├── composables/             useAnalytics, useChartStyles, useInView, useKeyboard, useModal, useToast
├── utils/calculations.ts    Pure analytics functions (~900 lines, fully typed)
├── utils/csvImportExport.ts Full state ↔ CSV serialiser/parser (17 sections)
└── components/              pages/, sections/, charts/, ui/
```

## Running the App

```bash
npm run dev      # development server (http://localhost:5173)
npm run build    # production build
npm run preview  # serve production build locally
```

## Running Tests

```bash
npm test                  # run all tests (Vitest)
npm run type-check        # vue-tsc --noEmit
npm run lint              # ESLint with zero-warnings threshold
```

## Historical Documents

These documents describe the **vanilla JS era** of the project (pre-Vue 3 migration) and are kept for reference only:

| Document | Notes |
|----------|-------|
| **[ROADMAP.md](./ROADMAP.md)** | Original 4-phase roadmap — fully executed via Vue 3 migration |
| **[VUE3_MIGRATION_PLAN.md](./VUE3_MIGRATION_PLAN.md)** | Sprint-by-sprint migration plan — COMPLETE (v1.0.0 shipped) |

---

**Last Updated**: May 2026  
**Version**: v1.2.0  
**Tech Stack**: Vue 3 · TypeScript · Pinia · Vite · Tailwind CSS v4 · Vitest
