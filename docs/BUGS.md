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

*Last updated: May 2026*  
*See also: [PHASE_TRACKING.md](PHASE_TRACKING.md) for feature roadmap and sprint status.*
