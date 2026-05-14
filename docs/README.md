# Documentation — A Penny For Our Thoughts

Welcome to the project documentation. This folder contains all guides, roadmaps, and reference materials for the "A Penny For Our Thoughts" financial dashboard.

## Quick Navigation

| Document | Purpose |
|----------|---------|
| **[USER_GUIDE.md](./USER_GUIDE.md)** | 📖 Complete feature reference for end-users |
| **[ROADMAP.md](./ROADMAP.md)** | 📋 2-3 month development roadmap with 4 phases, priorities, and timeline |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | 🏗️ Current code structure, state management, and module organization |
| **[PHASE_TRACKING.md](./PHASE_TRACKING.md)** | ✅ Progress tracking for each development phase |

## Project Overview

**A Penny For Our Thoughts** is a personal financial dashboard built on the 50/30/20 budget rule. The app runs entirely in the browser with no backend—all data lives in localStorage.

- **Tech Stack**: Vanilla HTML/CSS/JS + Chart.js 4.4.1
- **Current Status**: MVP feature-complete, UI/UX polish in progress (Phase 0)
- **Commitment**: 20+ hrs/week over 2-3 months
- **Design Direction**: Bloomberg-style professional & data-focused

## Getting Started

1. **First Time?** Read [ROADMAP.md](./ROADMAP.md) for the big picture
2. **Want to understand the code?** Check [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Tracking progress?** See [PHASE_TRACKING.md](./PHASE_TRACKING.md)

## Current Phase

**V1 Complete** — All planned phases shipped:
- ✅ Phase 0: Design & Visual Polish (Bloomberg-style aesthetic)
- ✅ Phase 1: Budget vs. Actual, Savings Goals, Net Worth, Analytics
- ✅ Phase 2: Recurring Calendar, Subscription Manager, Net Worth Tracker
- ✅ Phase 3: Transaction Rules Engine (TRE), Performance Optimisation, Testing & Documentation

## Key Files in Project Root

- `index.html` — App shell and all HTML markup
- `src/app.js` — Application entry point, CRUD handlers, CSV I/O
- `src/render.js` — All DOM render functions
- `src/analytics.js` — Financial calculations and TRE logic
- `src/charts.js` — Chart.js instance management
- `src/state.js` — State object, persistence, theme management
- `src/utils.js` — Pure helper functions (fmt, pct, csvEscape, etc.)
- `src/styles.css` — Styling and responsive design
- `CLAUDE.md` — AI assistant project guidelines
- `Coding_Principles.md` — Development standards and best practices

## Running Tests

Unit tests live in `tests/`. Open `tests/index.html` in a browser, or run:

```bash
npm test   # serves tests/index.html on port 3001
```

## How to Contribute

This is a solo project by Brahim. Documentation is updated as development progresses.

---

**Last Updated**: May 2026
**Status**: V1 Complete
**Tech Stack**: Vanilla HTML/CSS/JS · Chart.js 4.4.1 · localStorage
