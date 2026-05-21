# Bug Log — A Penny For Our Thoughts

Running record of bugs encountered, root causes, and fixes. Serves as a quick-reference
for recurring patterns and a post-mortem trail for regressions.

**Format per entry:**
- **Symptom** — what the user saw
- **Root cause** — why it happened
- **Fix** — what changed
- **Prevention** — how to avoid repeating it

---

## BUG-001 — Responsive grid breakpoints broken after utility class rename

**Date:** May 2026  
**Branch:** `feat/vite-setup`  
**Sprint:** Story 4 — Tailwind utility migration  
**Severity:** High (layout regression on all viewports ≤ 768px)

### Symptom
After replacing custom `.grid-N` classes with Tailwind's `grid-cols-N` in `index.html`,
cards stopped stacking at smaller breakpoints (tablet / mobile). Content inside cards was
also clipping at intermediate viewport widths.

### Root Cause
`src/css/responsive.css` contained media query rules targeting the **old** class names
(`.grid-2`, `.grid-3`, `.grid-4`, `.grid-5`). When `index.html` was updated to use Tailwind's
`grid-cols-N` naming, the responsive selectors became dead rules — they matched nothing,
so the grid never collapsed at any breakpoint.

```css
/* Broken (old selectors, matched nothing after HTML rename): */
@media (max-width: 768px) {
  .grid-3, .grid-4, .grid-5 { grid-template-columns: repeat(2, 1fr); }
}

/* Fixed (selectors updated to match Tailwind class names): */
@media (max-width: 768px) {
  .grid-cols-3, .grid-cols-4, .grid-cols-5 { grid-template-columns: repeat(2, 1fr); }
}
```

### Fix
Updated all 5 breakpoints in `responsive.css` (1280 / 1024 / 768 / 640 / 540px):
- `.grid-4`  → `.grid-cols-4`
- `.grid-5`  → `.grid-cols-5`
- `.grid-3`  → `.grid-cols-3`
- `.grid-2`  → `.grid-cols-2`

**Commit:** `fix(responsive): update grid selectors from .grid-N to .grid-cols-N`

### Prevention
**Rule:** When renaming a CSS class anywhere in the project, grep for every other
place that class name is referenced — including media queries, JS selectors, and
template strings — before committing.

```bash
# Quick check before committing a class rename:
grep -rn "\.old-class-name" src/
```

---

## BUG-002 — `cssVar` ReferenceError on theme toggle

**Date:** May 2026  
**Branch:** `feat/vite-setup`  
**Sprint:** Story 4 — Tailwind utility migration  
**Severity:** Medium (theme toggle triggered a JS crash)

### Symptom
Clicking the dark/light theme toggle caused a silent `ReferenceError: cssVar is not defined`
in the console. The toggle visually flipped but chart colors didn't update because
`renderAll()` was crashing partway through.

### Root Cause
`cssVar` is exported from `utils.js` and was used in 4 places in `render.js`
(`renderBudgetVarianceCards`, credit card renderer, loan renderer) but was **never
included in the `import` statement** at the top of the file. Classic missing-import bug
that only surfaces at runtime, not during build.

```js
// Broken — cssVar missing from import:
import { fmt, pct, daysUntil, monthlyAmount } from './utils.js';

// Fixed:
import { fmt, pct, daysUntil, monthlyAmount, cssVar } from './utils.js';
```

### Fix
Added `cssVar` to the named import in `src/render.js`.

**Commit:** Part of Story 4 utility migration commit.

### Prevention
**Rule:** After adding a new utility function call anywhere in a file, verify the import
statement at the top includes it. ESLint with `no-undef` rule would catch this automatically.

> **Future:** Consider adding ESLint to the project (Phase 3 / code quality) to surface
> missing imports at lint time rather than runtime.

---

## BUG-003 — Analytics filter inputs visually oversized after global input CSS

**Date:** May 2026  
**Branch:** `feat/vite-setup`  
**Sprint:** Story 4 — Tailwind utility migration  
**Severity:** Low (visual only; caught before shipping)

### Symptom
The small filter inputs in the Analytics panel (date range, category dropdown) risked
becoming oversized (`padding: 10px 14px`, `font-size: 14px`) instead of their intended
compact style (`padding: 6px 8px`, `font-size: 12px`) after removing their inline styles.

### Root Cause
CSS cascade layer priority: Tailwind utilities live in `@layer utilities`, which has
**lower priority** than unlayered CSS. The global `input, select` rule in `forms.css`
is unlayered, so it always beats Tailwind utilities targeting the same properties.
Removing the inline styles and replacing with Tailwind would not have overridden it.

```
Cascade priority (highest → lowest):
  1. Inline styles          (style="...")
  2. Unlayered CSS          (global input rule in forms.css)  ← beats Tailwind
  3. @layer utilities       (Tailwind classes)
  4. @layer base            (Tailwind Preflight)
```

### Fix
Kept the inline styles on analytics filter inputs. Only removed the redundant
`background` and `color` properties (already provided by the global rule).
The compact sizing properties (`padding`, `font-size`, `border`) remain inline.

### Prevention
**Rule:** When replacing inline styles with Tailwind utilities, first check if the
element has an unlayered component class that defines the same property. If it does,
a Tailwind utility won't override it — keep the inline style or add `!important`.

---

---

## BUG-008 — Comprehensive sweep: `getRenewalDatesBetween` and `renderAnalyticsHistory` missing imports

**Date:** May 2026
**Branch:** `main` (post-Phase 2D)
**Severity:** High (Recurring Calendar crashed; analytics history modal would crash on save)

### Symptom
After fixing BUG-007, the GitHub Pages deployment threw a new error:
```
ReferenceError: getRenewalDatesBetween is not defined
  at Array.map (<anonymous>) — render.js inside renderSchedule
```
The Recurring Expense Calendar failed to render the day-by-day badge map.

### Root Cause
Same pattern as BUG-004 / BUG-005 / BUG-007 — bare identifiers surviving the
pre-Vite single-file era.

Instead of patching one-by-one, ran a comprehensive sweep across all source
files (`/tmp/check_imports.sh`). It enumerated all exports across every
module and cross-checked each consumer file for uses that lacked both a
local declaration AND an import. After filtering JSDoc comment mentions,
**two real bugs** remained:

1. `render.js` lines 652, 661 — used `getRenewalDatesBetween()` (defined in
   `analytics.js`) but didn't import it.
2. `app.js` line 795 — modal save handler called `renderAnalyticsHistory()`
   (defined in `render.js`) but didn't import it. Latent — only fires when
   the analytics history modal save runs.

### Fix
- Added `getRenewalDatesBetween` to the analytics.js import in `src/render.js`.
- Added `renderAnalyticsHistory` to the render.js import in `src/app.js`.

### Prevention
**Rule:** Wire up ESLint with `no-undef` enforced as the first task of the
Vue 3 migration. Three rounds of this pattern (BUG-004, -005, -007) and a
fourth caught only via manual sweep is unsustainable. The script at
`/tmp/check_imports.sh` is a stopgap; a proper linter is the real fix.

---

## BUG-007 — `CATEGORY_COLOURS is not defined` inside `renderWantsDonut`

**Date:** May 2026
**Branch:** `main` (post-Phase 2D)
**Severity:** High (Wants donut chart crashes on every render in production build)

### Symptom
After deploying the production build to GitHub Pages, the page loaded but the
console threw:
```
ReferenceError: CATEGORY_COLOURS is not defined
  at Array.map (<anonymous>)
  at renderWantsDonut (charts.js:119)
  at renderWants (render.js)
  at renderAll
```
The Wants donut chart failed to render. The bug was masked locally during
dev because the same identifier was resolved on the window object via an
earlier accidental global from `app.js`'s import.

### Root Cause
Identical pattern to BUG-004 and BUG-005 — a third latent reference from
the pre-Vite single-file era. `CATEGORY_COLOURS` is exported from
`analytics.js` and used inside `renderWantsDonut()` in `charts.js` line 119:

```js
cat === 'Subscriptions' ? SUBS_COLOUR : (CATEGORY_COLOURS[cat] || '#8b95ad')
```

The previous fix for BUG-005 added `getTopCategories` to the
analytics.js import but missed `CATEGORY_COLOURS`.

### Fix
Updated the import in `src/charts.js`:

```js
// Before:
import { getTopCategories } from './analytics.js';

// After:
import { getTopCategories, CATEGORY_COLOURS } from './analytics.js';
```

### Prevention
**Rule:** When fixing a missing-import bug, do a full scan of the file for
ALL bare identifiers that match exports from the imported module — don't
just patch the one that crashed. Three rounds of the same bug means the
codebase needs an ESLint pass with `no-undef` enforced, before the next
phase.

---

## BUG-005 — `getTopCategories is not defined` inside `renderAnalyticsBarChart`

**Date:** May 2026  
**Branch:** `feat/phase2d-mom-analytics`  
**Severity:** High (Top Categories chart crashes when analytics panel opens)

### Symptom
Opening the Analytics panel and rendering the Top Categories horizontal bar chart would
crash with `ReferenceError: getTopCategories is not defined` inside `charts.js`.

### Root Cause
Same pattern as BUG-004: `getTopCategories` is exported from `analytics.js` and is called
inside `renderAnalyticsBarChart()` in `charts.js`, but was never imported. The function
existed without an import statement — another latent bug surviving from the pre-Vite
single-file era. It was never triggered because BUG-004 crashed the panel before this
code could run.

```js
// charts.js — Broken (no import):
const topCats = getTopCategories(filteredHistory); // ReferenceError

// Fixed — import added:
import { getTopCategories } from './analytics.js';
```

### Fix
Added `import { getTopCategories } from './analytics.js';` to `src/charts.js`.

### Prevention
Same as BUG-004: ESLint `no-undef` rule would catch bare identifiers at lint time.
Consider: prefer passing data as function arguments from the render layer rather than
importing analytics functions into charts.js (cleaner separation of concerns).

---

## BUG-006 — Analytics charts go blank after theme toggle when panel is open

**Date:** May 2026  
**Branch:** `feat/phase2d-mom-analytics`  
**Severity:** Medium (visible regression on every theme toggle with panel open)

### Symptom
With the Spending Analytics panel open, clicking the dark/light theme toggle caused all
three analytics charts (line, bar, MoM trend) to go blank/empty. The stat cards and
insight text remained visible but the chart canvases showed nothing.

### Root Cause
The theme toggle calls `applyTheme()` → `resetAllCharts()` → `renderAll()`.
`resetAllCharts()` destroys all Chart.js instances. But `renderAll()` only calls
`renderSpendingAnalytics()` when the analytics panel is opened via `toggleAnalyticsPanel()`
— it was never included in the global re-render cycle. So after a theme toggle, the
charts were destroyed and never recreated.

```js
// renderAll() — Broken (analytics panel re-render missing):
export function renderAll() {
  renderIncome(); renderWants(); /* ... */
  // analytics: never re-rendered → blank charts after theme toggle
}

// Fixed — conditionally re-render if panel is open:
export function renderAll() {
  renderIncome(); renderWants(); /* ... */
  if (document.getElementById('analytics-panel')?.style.display !== 'none')
    renderSpendingAnalytics();
}
```

### Fix
Added a conditional `renderSpendingAnalytics()` call at the end of `renderAll()` in
`src/render.js`, guarded by checking whether the analytics panel is currently visible.

### Prevention
**Rule:** Every panel or section that contains Chart.js instances must be included in
`renderAll()` (conditionally if expensive). When adding a new panel with charts, also
wire it into `renderAll()` at the same time.

---

## BUG-004 — `analyticsFilters is not defined` when opening Spending Analytics panel

**Date:** May 2026  
**Branch:** `feat/phase2d-mom-analytics`  
**Severity:** High (opening the Analytics panel crashes with ReferenceError)

### Symptom
Clicking "📊 Show Spending Analytics" threw:
```
ReferenceError: analyticsFilters is not defined
  at getFilteredSpendingHistory (analytics.js:665)
  at renderSpendingAnalytics (render.js:491)
```
The panel never opened.

### Root Cause
`getFilteredSpendingHistory()` in `analytics.js` referenced `analyticsFilters` as a
bare identifier. That variable lives on `uiState` in `uistate.js`. Before the Vite
modularisation (Phase Infra), everything was in one file and `uiState` was in scope.
After the split, `analytics.js` was never updated to import `uiState` — the bare
reference was a latent bug that only fired the first time `getFilteredSpendingHistory()`
was called at runtime.

```js
// Broken — analyticsFilters used as if it were a local variable:
if (analyticsFilters.startDate || analyticsFilters.endDate) { ... }

// Fixed — reference through the imported uiState object:
const filters = uiState.analyticsFilters;
if (filters.startDate || filters.endDate) { ... }
```

### Fix
- Added `import { uiState } from './uistate.js';` to `analytics.js`
- Replaced all 4 bare `analyticsFilters` references with `uiState.analyticsFilters`
  (via a local `const filters` alias for readability)

**Commit:** Part of Phase 2D initial commit.

### Prevention
**Rule:** `analytics.js` must not reach into UI state. If filtering logic genuinely
needs UI context (filter values), accept them as function parameters rather than
importing `uiState` directly. A cleaner long-term fix (Phase 3) is to pass the
filter object as an argument: `getFilteredSpendingHistory(filters)`.

---

*Last updated: May 2026*  
*See also: [PHASE_TRACKING.md](PHASE_TRACKING.md) for feature roadmap and sprint status.*
