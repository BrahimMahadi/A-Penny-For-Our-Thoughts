# Bug Log — A Penny For Our Thoughts

Running record of bugs encountered, root causes, and fixes. Serves as a quick-reference
for recurring patterns and a post-mortem trail for regressions.

**Format per entry:**
- **Symptom** — what the user saw
- **Root cause** — why it happened
- **Fix** — what changed
- **Prevention** — how to avoid repeating it

---

## BUG-015 — Subscriptions cannot be added or edited (save silently blocked)

**Date:** May 2026
**Branch:** `feat/sprint-17` / `main` (introduced in Sprint 17)
**Severity:** Critical (entire subscription CRUD broken — add and edit both do nothing)

### Symptom
Clicking "Add" or "Update" in the subscription modal did nothing. No toast, no validation
error shown, no state change — the form simply didn't submit.

### Root Cause
`useFormValidation` declares `isValid` as:
```ts
const isValid = computed(() =>
  Object.values(allErrors.value).every(e => e === null),
);
```
It considers a field valid **only when its error value is `null`**. An empty string `''` is NOT `null`, so any field returning `''` is treated as invalid.

During Sprint 17, two conditional validation rules were added to `Subscriptions.vue` and incorrectly returned `''` (empty string) instead of `null` for the "no error" case:

```ts
// BUG: '' !== null → isValid always false
date:      form.frequency !== 'custom-days' ? rules.required(...) : '',
daysOfWeek: condition ? 'Select at least one day' : '',
```

Because `daysOfWeek` returned `''` for every non-custom-days subscription (the common case), `isValid` was permanently `false`. Every save attempt hit `if (!validation.isValid.value) return;` and silently exited.

### Fix
Changed both `''` returns to `null` in `Subscriptions.vue` (`useFormValidation` call, lines 229–237):

```ts
// Fixed: null = no error
date:      form.frequency !== 'custom-days' ? rules.required(...) : null,
daysOfWeek: condition ? 'Select at least one day' : null,
```

### Prevention
**Rule:** In `useFormValidation` thunks, "no error" must always be expressed as `null`, never as `''` or `undefined`. The composable contract is `string | null` where `null` = valid. When writing conditional validation rules, always check: "what does the else branch return?" — it must be `null`.

```ts
// ✅ Correct pattern
field: condition ? 'Error message' : null,
// ❌ Wrong — '' blocks isValid
field: condition ? 'Error message' : '',
```

A future improvement would be to update `isValid` to treat falsy values (including `''`) as passing:
```ts
const isValid = computed(() =>
  Object.values(allErrors.value).every(e => !e),  // treats null AND '' as valid
);
```
But the stricter `=== null` contract is intentional — it catches bugs where a rule accidentally returns `''` instead of `null`. Fix the call sites, not the composable.

---

## BUG-014 — `docs.css` global import hides all DocsPage content

**Date:** May 2026
**Branch:** `feat/sprint-7` (Sprint 7)
**Severity:** High (entire DocsPage rendered blank)

### Symptom
`DocsPage.vue` mounted successfully but every `.docs-section` element was invisible — all content hidden.

### Root Cause
`src/css/docs.css` (a legacy file left over from the vanilla-JS era) contained a global rule `.docs-section { display: none }`. This file was still imported in `src/main.ts`, so the rule applied globally to every element with that class. `DocsPage.vue` used `.docs-section` for its sections and had no corresponding CSS to set `display: block`, because it relied on the browser default. The legacy rule won.

### Fix
Removed `import './css/docs.css'` from `src/main.ts`. `DocsPage.vue` is fully self-contained with scoped CSS — the legacy stylesheet was vestigial.

### Prevention
**Rule:** When carrying over CSS from a vanilla JS migration, audit every global import in `main.ts` for hide/show display rules. Any `display: none` global rule is a hazard — scope it to the component that uses it.

---

## BUG-013 — Mobile header toolbar overflows to row 3 at ≤768px

**Date:** May 2026
**Branch:** `feat/vue3-migration` (Sprint 6)
**Severity:** Medium (toolbar invisible/overflowed on mobile)

### Symptom
On viewports ≤768px, the export/import/shortcuts toolbar buttons disappeared — they overflowed to a third row that wasn't visible, pushing the content area down.

### Root Cause
`App.vue` header uses a CSS grid layout. At ≤768px the grid has 2 rows: brand name + tabs. The toolbar was placed as a third flex item but no `grid-row`/`grid-column` placement rules were set, so it auto-placed after the tabs, creating an invisible third row.

### Fix
Added explicit `grid-row`/`grid-column` placement in `src/css/responsive.css` at the 768px breakpoint: brand → row 1/col 1; toolbar → row 1/col 2; tabs → row 2/col 1-2. Both items now share row 1 with the tabs spanning the full second row below.

### Prevention
**Rule:** When adding new elements to an existing CSS grid at a breakpoint, always set `grid-row` and `grid-column` explicitly — auto-placement in a named grid is unpredictable.

---

## BUG-012 — `useKeyboard` rejects `?` (and other shifted keys) in real browser

**Date:** May 2026
**Branch:** `feat/vue3-migration` (Sprint 6)
**Severity:** Medium (keyboard shortcut for help panel non-functional in browser)

### Symptom
Pressing `?` in the app did nothing. The keyboard shortcut worked in jsdom tests but not in a real browser.

### Root Cause
`useKeyboard.ts` matched shortcut bindings with `if (binding.shift !== undefined && binding.shift !== e.shiftKey)`. When a binding declared `shift: true` (e.g. `?` = Shift+/) and the user pressed it, `e.shiftKey` was `true` — matching. BUT bindings without `shift: true` were incorrectly guarded by the same bidirectional check: `false !== true` → rejected. This caused any shortcut registered without a `shift` flag to reject every keystroke that happened to have `shiftKey: true` (e.g. `?`, `!`, `@`).

### Fix
Changed the guard from bidirectional to one-directional: `if (needsShift && !e.shiftKey) return`. A binding that doesn't require shift now accepts any keystroke regardless of `shiftKey` state. A binding that DOES require shift rejects it only when shift is absent.

### Prevention
**Rule:** Keyboard modifier guards should be one-directional: block if modifier *required* but *absent*. Never block because modifier is *present* but not *required* — that rejects shifted characters from non-shortcut keys.

---

## Vue 3 Migration Bugs (Sprints 0–6)

---

## BUG-011 — Bare `header { ... }` rule from legacy layout.css bleeds into BaseCard

**Date:** May 2026
**Branch:** `feat/vue3-migration` (Sprint 2)
**Era:** Vue 3 migration
**Severity:** Medium (visual inconsistency — section headers got page-header styling)

### Symptom
Every `<header>` element inside a `BaseCard` rendered with the legacy
page-header treatment: dark-green background, bottom border, sticky positioning.
Section headers like "Income Streams" looked like miniature app headers.

### Root Cause
`src/css/layout.css` defines `header { background, border-bottom, position:sticky, ... }`
targeting the bare HTML element. `BaseCard.vue` uses semantic `<header>` for its section
header — which inherits all those styles even though it's nested deep in the page.

### Fix
Override the inherited rules explicitly in `BaseCard.vue`'s scoped `.base-card__header`:

```css
.base-card__header {
  background: transparent;
  border-bottom: 0;
  padding: 0;
  position: static;
  /* … rest of layout … */
}
```

### Prevention
**Rule:** Bare element selectors in global CSS (`header`, `section`, `nav`, etc.)
are fragile when reused inside components. Sprint 6 cutover should scope these
to a layout-specific class instead of the bare element.

---

## BUG-010 — Vue primitive class names collide with legacy CSS

**Date:** May 2026
**Branch:** `feat/vue3-migration` (Sprint 2)
**Severity:** Medium (legacy styles leak into Vue components — empty states had dashed
borders, cards had wrong tinted backgrounds)

### Symptom
After mounting the Vue 3 scaffold, the new `EmptyState`, `BaseModal`, `BaseButton`,
`ProgressBar`, and `ToastContainer` components inherited unwanted styling from
legacy CSS. EmptyState showed a dashed border + animated background. Buttons
had legacy padding. The dev preview screenshot showed visible bleed-through.

### Root Cause
Vue's `<style scoped>` adds a data-attribute selector to selectors INSIDE the
component, but does NOT add any selector specificity bonus when the class name
itself matches a global rule. The legacy CSS defines `.empty-state`, `.btn`,
`.modal`, `.modal-overlay`, `.progress-bar`, `.toast`, `.toast-container` as
GLOBAL rules. My Vue primitives initially used the same class names, so:

1. My scoped selector `.empty-state[data-v-abc]` set some properties (`color`, `padding`).
2. The legacy global `.empty-state` set OTHER properties (`background`, `border`,
   `animation`). Those cascaded in because my scoped rule didn't override them.

### Fix
Renamed all collision-prone classes to use a `base-*` prefix:

| Before          | After                |
|-----------------|----------------------|
| `.empty-state`  | `.base-empty-state`  |
| `.btn`          | `.base-btn`          |
| `.modal`        | `.base-modal`        |
| `.modal-overlay`| `.base-modal-overlay`|
| `.progress-bar` | `.base-progress-bar` |
| `.toast`        | `.base-toast`        |
| `.toast-container` | `.base-toast-container` |
| `.stat-card`    | `.base-stat-card`    |

Also corrected CSS custom property names — components were referencing
`--card`, `--card-2`, `--text-muted` which don't exist in `src/css/tokens.css`;
the legacy palette uses `--surface`, `--surface2`, `--muted`. Without the
correct names the fallback hex codes (dark blue) fired instead of the
intended Bloomberg-green theme.

### Prevention
**Rule:** All Vue primitive components must use a unique class prefix
(`base-*` for `components/ui/*.vue`, `app-*` for App-level chrome). Plain class
names that match legacy CSS will cascade in and break in subtle ways. Scoped
CSS only namespaces selectors, not class names themselves.

Caught visually via `preview_screenshot` after the first mount, then confirmed
via `preview_inspect` on `.empty-state` which showed background and animation
properties leaking from the legacy rule. Discovered together with BUG-011
during Sprint 2 visual QA.

---

## BUG-009 — `fmt()` produces `$-42.50` instead of `-$42.50` for negative values

**Date:** May 2026
**Branch:** `feat/vue3-migration` (Sprint 1)
**Severity:** Low (cosmetic; visible only on negative variances and momChange display)

### Symptom
Legacy `utils.js#fmt(-42.5)` returned `"$-42.50"` — the sign came AFTER the
dollar symbol, which is not standard English convention. Callers in
`render.js` compensated by either taking `Math.abs()` then prepending their
own sign, or by accepting the awkward output for negative variances.

### Root Cause
The legacy implementation was `'$' + n.toLocaleString(...)`. For negative
numbers, `toLocaleString` produced `"-42.50"`, yielding `"$-42.50"`.

### Fix
Rewrote `src/utils/format.ts#fmt()` (the new typed version) to split sign
from amount:

```ts
const num = Number(n);
const abs = Math.abs(num).toLocaleString('en-CA', { ... });
return num < 0 ? `-$${abs}` : `$${abs}`;
```

Legacy `src/utils.js` is unchanged (still used by legacy `render.js`).
New Vue section components import from `@/utils/format` and get correct
formatting.

### Prevention
Caught by Vitest unit test (`tests/utils/format.spec.ts`) — was the very
first test that ran on the new typed utils. Adding tests during the port
surfaced a latent legacy bug.

---

## Legacy Vanilla JS Bugs (pre-Vue 3 migration)

> The bugs below were filed during the vanilla JS / Vite-infra era (before Sprint 0 of the Vue 3 migration). They are kept for historical reference — the code they describe no longer exists in the Vue 3 codebase.

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

*Last updated: May 2026 — v1.11.1 (BUG-015 hotfix)*  
*See also: [PHASE_TRACKING.md](PHASE_TRACKING.md) for the full sprint history.*
