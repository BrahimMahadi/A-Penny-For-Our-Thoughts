# Bug Log — A Penny For Our Thoughts

Running record of bugs encountered, root causes, and fixes. Serves as a quick-reference
for recurring patterns and a post-mortem trail for regressions.

**Format per entry:**
- **Symptom** — what the user saw
- **Root cause** — why it happened
- **Fix** — what changed
- **Prevention** — how to avoid repeating it

---

## BUG-038 — Page scrolls behind an open modal on mobile (v2.47.0)

**Date:** September 2026
**Branch:** `feat/mobile-pwa` (reported during MOBILE-5 testing)

**Symptom** — with a modal open on a phone (reported against the "Add Purchase" sheet), scrolling
dragged the dashboard behind it instead of staying inside the modal.

**Root cause** — `useModal` locked the page with `document.body.style.overflow = 'hidden'`.
That is honoured by desktop Chrome — measured with real wheel input, the page moved 0 → 343px
unlocked and 0 → 0 locked — but **iOS Safari ignores `overflow: hidden` on the body for touch
scrolling**. So the lock worked everywhere except the one place a bottom-sheet modal is actually
used, and no test covered the composable at all.

Note the fix that does *not* work here: `overscroll-behavior: contain` (added on `BaseModal` earlier
in MOBILE-5) only prevents scroll **chaining** — an inner scroller reaching its boundary and passing
the remainder to its parent. It does nothing when the page itself is free to scroll underneath.
Those are two different problems and both needed fixing.

**Fix** — the position-fixed technique. On lock, record `window.scrollY` and pin the body:
`position: fixed; top: -<scrollY>px; left: 0; right: 0; width: 100%`, keeping `overflow: hidden`
as belt-and-braces. There is then no scrollable overflow anywhere — verified live: while locked,
`documentElement.scrollHeight === clientHeight === 812`, and even a programmatic `scrollBy` could
not move the page. On unlock, restore the captured inline styles verbatim and re-apply the offset
with `window.scrollTo(0, savedScrollY)` — without that the page jumps to the top on close, which is
worse than the original bug. Desktop scrollbar-width is compensated with `padding-right` so the
layout does not shift sideways as the modal opens.

`position: fixed` on the body does **not** trap the teleported modal: only `transform`, `filter`,
`perspective` and `will-change` create a containing block for fixed-position descendants.

**Also fixed in passing** — the `watch(..., { immediate: true })` meant a *closed* modal fired its
handler on mount and called the shared `unlock()`, decrementing a refcount it never incremented. A
modal component mounting while another was already open would therefore release that modal's lock.
Each instance now tracks whether it actually holds a lock and only releases its own.

**Prevention** —
- `tests/composables/useModal.spec.ts` (9 tests) — the composable previously had **zero** coverage,
  which is how this shipped. Covers pinning, offset capture, scroll restoration, verbatim style
  restoration, stacked-modal refcounting, the closed-modal-mounting regression, unmount cleanup and
  ESC handling.
- **Pattern to watch:** a scroll lock that only sets `overflow` is a desktop-only lock. Any future
  overlay (drawer, command palette) must reuse `useModal` rather than re-implement it.
- Those specs load a fresh module per test via `vi.resetModules()` — the lock's refcount and saved
  styles are module-level singletons, so state would otherwise leak between tests and mask failures.

---

## BUG-037 — Node 26 shadows jsdom's `localStorage`; 254 tests fail on unchanged code (v2.46.3)

**Date:** September 2026
**Branch:** `fix/vitest-localstorage-shim`

**Symptom** — `npx vitest run` on a clean `main` reported **254 failed tests across 8 spec files**
(`stores/budget`, `stores/theme`, `stores/ui`, `components/sections/sections`,
`components/sections/settings`, `components/ui/ThemeToggle`, `composables/usePeriodRollover`,
`lib/migrateLocalStorage`). Every failure was the identical error on the first line of a
`beforeEach`:

```
TypeError: Cannot read properties of undefined (reading 'clear')
  ❯ localStorage.clear();
```

No application code had changed — the previous commit had shipped with all 1509 passing.

**Root cause** — a toolchain interaction, not a code defect:

1. **Recent Node defines a global `localStorage` accessor.** It is experimental and, without the
   `--localstorage-file` flag, its getter returns `undefined` while emitting
   `ExperimentalWarning: localStorage is not available`. Critically, the *property still exists*
   on `globalThis` — `Object.getOwnPropertyDescriptor(globalThis, 'localStorage')` returns a
   `{ get, set }` pair.

   **Measured boundary** (descriptor present?): `v20.18.0` absent · `v22.23.2` absent ·
   `v24.20.0` absent · `v26.5.1` **present**. The problem therefore starts in v25/v26 — *not* at
   v22, where the accessor was first introduced behind the flag. The shim keys off the descriptor,
   not a version number, so it stays correct regardless of where the exact boundary falls.
2. **Vitest 1.x's jsdom environment skips globals that already exist.** When populating the test
   context it copies jsdom window keys onto the Node global only where nothing of that name is
   already defined — a deliberate guard against clobbering host globals. Node's inert accessor
   satisfies that check, so jsdom's real `Storage` object was never published.
3. The developer machine had moved to **Node v26.5.1**, tripping the interaction. jsdom itself was
   healthy throughout: `new JSDOM('', { url: 'http://localhost' }).window.localStorage` worked.

Two details made this harder than it looked. Under `globals: true`, `window`,
`document.defaultView` and `globalThis` are all the **same** populated object, so the environment's
own jsdom Storage is unreachable from the test context — it cannot simply be re-copied. And Node
shadows **only `localStorage`**, not `sessionStorage`, so the naive per-key fix leaves the two
stores in different jsdom realms with only one matching the `Storage` global; that split silently
defeats `vi.spyOn(Storage.prototype, 'setItem')` and made the two quota-handling specs in
`stores/budget.spec.ts` pass vacuously.

**Fix** — `tests/setupStorage.ts`, registered as the **first** entry in `test.setupFiles` (ahead of
`tests/setup.ts`) so it lands before any module that reads storage at import time. It stands up a
throwaway JSDOM instance and, **as a group**, republishes `localStorage`, `sessionStorage` and the
`Storage` constructor from that single realm — but only when at least one of the storage globals is
missing, so a Node version without the shadowing problem is left untouched. `@types/jsdom` was added
as a devDependency to keep `vue-tsc` clean.

**Prevention** —
- **The Node version is now pinned.** CI and deploy both hard-coded Node 20 while local ran Node 26.
  That six-major drift is the reason CI stayed green while local had 254 failures — and Node 20 had
  been end-of-life since 2026-04-30 while still building the production bundle. `.nvmrc` (Node 24
  Active LTS) is now the single source of truth for both workflows, and `tests/toolchain.spec.ts`
  fails if `.nvmrc`, `package.json` `engines`, or either workflow drift apart.
- **A pinned LTS is not sufficient on its own.** The shadowing global is absent on v20/v22/v24 and
  present on v26, so CI pinned to 24 would still not reproduce this. `ci.yml` therefore runs a
  `forward-compat` job on Node Current. If that job fails while `validate` passes, suspect a new
  host global shadowing a jsdom one before suspecting application code.
- `tests/setupStorage.spec.ts` (6 tests) asserts the globals exist, round-trip, stay separate,
  share a prototype with the `Storage` global, and remain interceptable by prototype spies. A future
  Node or Vitest bump that reintroduces the problem now produces one clearly-named failure at the
  source instead of hundreds of misleading application failures.
- **Pattern to watch:** when a large, uniform block of tests fails on unchanged code, suspect the
  environment before the code. `node -p "typeof globalThis.<global>"` outside the test runner is a
  fast discriminator.
- The shim is scaffolding for Vitest 1.x. Vitest 3 publishes the jsdom globals unconditionally; the
  planned **TEST-INFRA-1** sprint removes this file as part of that upgrade.

---

## BUG-016 — `vue-tsc` CI failures on AppStatusBar + GoalsPage (v2.0.0)

**Date:** May 2026  
**Branch:** `feat/redesign-sprint-9-release` → `main` (introduced in RS-8/RS-9, caught by CI)  
**Severity:** Build-blocking (CI `build-and-deploy` exit code 2; deploy failed)

### Symptom
GitHub Actions `build-and-deploy` failed with 5 TypeScript errors immediately after the v2.0.0 merge — the local `npx tsc --noEmit` had passed, but CI runs `npx vue-tsc --noEmit` which checks `.vue` SFCs with full template type checking.

### Errors

**1. `GoalsPage.vue#L67` — `Property 'current' does not exist on type 'NetWorthData'`**

```ts
// Wrong — .current does not exist on NetWorthData
const netWorthValue = computed(() => netWorth.value.current);
```

`NetWorthData` (from `calculations.ts`) has a `.netWorth: number` field, not `.current`. This was a typo introduced when wiring up GoalsPage in RS-5.

**Fix:** `netWorth.value.netWorth`

---

**2. `AppStatusBar.vue#L29` — `'b.date' is possibly 'undefined'` + `No overload matches this call`**

```ts
// Wrong — Purchase.date is `date?: ISODate` (optional)
.sort((a, b) => b.date.localeCompare(a.date))
```

`Purchase.date` is declared as `date?: ISODate` in `types/budget.ts` (the `?` makes it `string | undefined`). Calling `.localeCompare()` directly on a potentially-undefined value fails strict type checking.

**Fix:** `(b.date ?? '').localeCompare(a.date ?? '')`

---

**3. `AppStatusBar.vue#L118` + `#L139` — `Argument of type 'string | undefined' is not assignable to parameter of type 'string'`**

```html
<!-- Wrong — p.date is string | undefined, daysAgo() takes string -->
{{ daysAgo(p.date) }}
```

Same root cause: `Purchase.date` is optional. `daysAgo(dateStr: string)` expects a non-nullable string, but `p.date` can be `undefined`.

**Fix:** `{{ daysAgo(p.date ?? '') }}`

### Root Cause Pattern
Local `npx tsc --noEmit` does **not** type-check `.vue` template expressions — it only checks the `<script setup>` block. GitHub CI runs `npx vue-tsc --noEmit` which performs full template type inference, catching optional-chaining gaps and wrong property names in template expressions that plain `tsc` silently ignores.

### Prevention
**Always run `npx vue-tsc --noEmit` locally before pushing** — not just `npx tsc --noEmit`. Add it to the pre-merge checklist:
```bash
npx vue-tsc --noEmit   # ← catches template type errors
npx vitest run         # ← catches runtime regressions
npx vite build         # ← confirms bundle compiles
```
When accessing computed refs that return complex objects (e.g. `NetWorthData`, `PayPeriodForecast`), verify the exact property name against the interface in `calculations.ts` rather than guessing. For optional entity fields (`date?`, `cardId?`), always use `?? fallback` before passing to functions that expect non-nullable types.

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

## BUG-017 — `form.price.trim is not a function` when editing a wishlist item

**Date:** May 2026  
**Branch:** `feat/redesign-sprint-14-wishlist-price`  
**Severity:** High (crash — unhandled TypeError breaks the Edit modal; Vue renders a blank transition)

### Symptom
Opening "Edit Wishlist Item", then typing anything into the Price or Saved inputs, caused:
```
Uncaught (in promise) TypeError: form.price.trim is not a function
  at ComputedRefImpl.fn (Wishlist.vue:155)
```
Vue emitted two consecutive "Unhandled error during execution of render function / component update" warnings, and the modal stopped updating.

### Root Cause
`openEdit()` correctly assigns `form.price = String(item.price)` — a string.  
But Vue 3's `v-model` on `<input type="number">` **coerces the reactive field to a number** the moment the DOM fires an `input` event. After the first keystroke, `form.price` becomes `299` (number), not `'299'` (string). On the next reactive recompute of `formError`, `(299).trim()` throws `TypeError` because numbers don't have `.trim()`.

The same issue applied to `form.saved.trim()` and to `save()` which called `.trim()` on both fields when constructing the payload.

### Fix
In `formError` and `save()`, extract local string variables using `String()` before any `.trim()` call:
```typescript
// Before (crashes when field is a number):
if (form.price.trim() !== '' && ...)

// After (safe for string | number | undefined):
const priceStr = String(form.price ?? '').trim();
if (priceStr !== '' && ...)
```
The same `String()` wrapper pattern applied to `form.saved` in both functions.

### Prevention
**Rule:** When using `v-model` on `<input type="number">`, always treat the reactive binding as `string | number` — Vue's DOM coercion can change the type at any moment. Wrap with `String()` before calling string methods. Alternatively, use `type="text"` with `inputmode="decimal"` to keep the value as a string throughout.

---

## BUG-018 — Inline "Add savings" autofocus silently broken in `v-for`

**Date:** May 2026  
**Branch:** `feat/redesign-sprint-14-wishlist-price`  
**Severity:** Low (UX degradation — inline savings input didn't auto-focus; no crash)

### Symptom
Clicking "+ Add savings" on a wishlist card opened the inline form correctly, but the cursor never moved to the input — the user had to click manually every time.

### Root Cause
In Vue 3 Composition API, a template `ref` attribute placed inside a `v-for` loop collects **all matching elements into an array** at runtime, even though the TypeScript declaration typed it as `Ref<HTMLInputElement | null>`. The guard `typeof el.focus === 'function'` evaluated `false` on the array (arrays don't have `.focus()`), so `el.focus()` was never called.

```typescript
// Before — ref inside v-for → inlineInputEl.value is HTMLInputElement[] at runtime:
const inlineInputEl = ref<HTMLInputElement | null>(null);
// ...template: ref="inlineInputEl" inside v-for
nextTick(() => {
  const el = inlineInputEl.value; // actually an array!
  if (el && typeof el.focus === 'function') el.focus(); // always false → no focus
});
```

### Fix
Removed `ref="inlineInputEl"` from the template entirely and replaced the ref lookup with `document.getElementById` using the per-item unique id (`wish-inline-${id}`). Since each inline input has a predictable, unique DOM id, the getElementById call is unambiguous regardless of list length:

```typescript
nextTick(() => {
  const el = document.getElementById(`wish-inline-${id}`) as HTMLInputElement | null;
  if (el && typeof el.focus === 'function') el.focus();
});
```

### Prevention
**Rule:** Never use a bare `ref="name"` attribute on an element that lives inside `v-for` when you need a single-element reference. In Vue 3 Composition API, such refs become arrays. Use `document.getElementById` (when elements have unique IDs) or a `:ref` callback function (e.g. `:ref="(el) => setRef(item.id, el)"`) to target a specific element in a list.

---

## BUG-019 — Vite HMR 500 on `Wishlist.vue` after hot-reload

**Date:** May 2026  
**Branch:** `feat/redesign-sprint-14-wishlist-price`  
**Severity:** Medium (Vite dev server 500 on every hot-reload of Wishlist.vue — full page reload required to see changes during development)

### Symptom
After any edit to `Wishlist.vue` during `vite dev`, the browser console showed:
```
[vite] Failed to reload /src/components/sections/Wishlist.vue. (500)
```
The HMR update was rejected with a 500 status and the page required a manual hard reload.

### Root Cause
The edit modal contained a live months-to-goal hint rendered via an IIFE inside a Vue template mustache expression:
```html
{{
  (() => {
    const remaining = Math.max(0, +form.price - (+form.saved || 0));
    if (remaining <= 0) return '✓ Already saved enough!';
    const months = Math.ceil(remaining / monthlySavingsRate);
    return `~${months} month${months !== 1 ? 's' : ''} to save up at ${fmt(monthlySavingsRate)}/mo`;
  })()
}}
```
Vite's HMR module transform pipeline fails when it encounters block-scoped `const`/`let` declarations inside an IIFE that is nested inside a Vue template mustache `{{ }}` expression. The transform produces invalid intermediate code that the server rejects with a 500.

### Fix
Extracted the IIFE logic into a dedicated script-side function `monthsHintText()`:
```typescript
function monthsHintText(): string {
  const priceNum = +form.price;
  const savedNum = +(form.saved || 0);
  if (!priceNum || priceNum <= 0 || monthlySavingsRate.value <= 0) return '';
  const remaining = Math.max(0, priceNum - savedNum);
  if (remaining <= 0) return '✓ Already saved enough!';
  const months = Math.ceil(remaining / monthlySavingsRate.value);
  return `~${months} month${months !== 1 ? 's' : ''} to save up at ${fmt(monthlySavingsRate.value)}/mo`;
}
```
Template replaced with a simple conditional + call:
```html
<p v-if="monthsHintText()" class="wish-months-hint">
  {{ monthsHintText() }}
</p>
```

### Prevention
**Rule:** Never put `const`/`let` declarations inside IIFEs inside Vue template mustache `{{ }}`. Vue template expressions are not arbitrary JavaScript scopes — the template compiler and Vite's HMR transform pipeline don't handle block-scoped declarations inside template mustache IIFEs. If you need multi-step logic in a template, always extract it to a script-side function or computed ref.

---

## BUG-020 — "Autofocus processing was blocked" warning on Quick-Add panel open

**Date:** May 2026  
**Branch:** `feat/redesign-sprint-14-wishlist-price`  
**Severity:** Low (browser console warning — UX not impacted, focus still lands in most cases, but the warning indicates unreliable focus behaviour)

### Symptom
Opening the Quick-Add wants panel on the Dashboard (clicking "Quick Add" or "+" button) logged a browser warning:
```
Autofocus processing was blocked because a document already has a focused element.
```
The first input in the panel would not reliably receive focus.

### Root Cause
`DashboardPage.vue` used the HTML `autofocus` attribute on the name input inside the quick-add panel:
```html
<input
  v-model="quickAddName"
  class="quick-add__input"
  placeholder="e.g. coffee, t-shirt, dinner"
  autofocus
  ...
>
```
The panel is conditionally rendered with `v-if="showQuickAdd"`. When `showQuickAdd` becomes `true`, Vue inserts the entire panel into the DOM. At that point the browser processes the `autofocus` attribute, but if another element (a button, link, or any interactive element on the page) already holds focus, the browser blocks the autofocus and logs the warning. In SPAs this is almost always the case — the button that triggered the panel still has focus.

### Fix
Removed `autofocus` from the input. Added a template ref `quickAddInputEl` and called programmatic `.focus()` via `nextTick` inside `openQuickAdd()`:
```typescript
const quickAddInputEl = ref<HTMLInputElement | null>(null);

function openQuickAdd(): void {
  quickAddName.value     = '';
  quickAddAmount.value   = '';
  quickAddCategory.value = defaultCategory.value;
  showQuickAdd.value     = true;
  nextTick(() => quickAddInputEl.value?.focus());
}
```
Template:
```html
<input
  ref="quickAddInputEl"
  v-model="quickAddName"
  class="quick-add__input"
  placeholder="e.g. coffee, t-shirt, dinner"
  ...
>
```
`nextTick` ensures Vue has finished inserting the panel into the DOM before `.focus()` is called, making focus reliable and warning-free.

### Prevention
**Rule:** Never use the HTML `autofocus` attribute on elements inside `v-if` blocks in Vue SPAs. The browser processes `autofocus` at DOM-insertion time, which conflicts with existing focus in single-page apps. Always use programmatic focus via `nextTick(() => el?.focus())` when a conditionally-rendered element needs to receive focus on show.

---

## BUG-021 — Dashboard "spent" caption includes auto-deductions; Spending tab shows purchases only

**Date:** May 2026  
**Branch:** `feat/sprint-16-type-toggle` (RS-16 Wants/Needs toggle)  
**Severity:** Medium (amount mismatch between Dashboard and Spending tab — confusing but not data-corrupting)

### Symptom
The "Purchases this period" donut on the Dashboard and the hero card caption both showed
`$421.17 spent of $532.75`, while the Spending tab "Spent this period" tile showed `$367.08`.
The $54.09 difference was caused by subscription/loan auto-deductions being included on the
dashboard but not on the spending tab.

### Root Cause
In `DashboardPage.vue`, `heroSpent` was defined as:
```ts
const heroSpent = computed(() =>
  dashboardTypeFilter.value === 'needs'
    ? biWeeklyNeedsSpent.value
    : biWeeklySpent.value + biWeeklyDeductions.value,  // ← BUG: includes $54.09 deductions
);
```

In `PurchasesThisPeriod.vue`, both the donut caption and `usedPct` included `deductionTotal`:
```ts
// caption:
{{ fmt(totalSpent + deductionTotal) }} / {{ fmt(biWeeklyBudget) }}  // ← $421.17

// usedPct:
return ((totalSpent.value + deductionTotal.value) / biWeeklyBudget.value) * 100;  // ← 79% not 69%
```

The Spending tab computes `wantsSpentInPeriod` from purchases only, giving $367.08.
The `heroRemaining` (shown as the big "Available to spend" number) was correct in both places
(`budget - purchases - deductions = $111.58`) — only the "spent" caption and % were wrong.

### Fix
**`DashboardPage.vue`** — removed `+ biWeeklyDeductions.value` from `heroSpent` for the wants branch:
```ts
const heroSpent = computed(() =>
  dashboardTypeFilter.value === 'needs'
    ? biWeeklyNeedsSpent.value
    : biWeeklySpent.value,  // purchases only — matches Spending tab
);
```

**`PurchasesThisPeriod.vue`** — changed caption and `usedPct` to purchases only:
```ts
// caption:
{{ fmt(totalSpent) }} / {{ fmt(biWeeklyBudget) }}

// usedPct:
return (totalSpent.value / biWeeklyBudget.value) * 100;
```

Auto-deductions are still visible as a dedicated "Auto-deducted $XX.XX" row in the category
list, and `heroRemaining` / `remaining` both still subtract deductions from the available total.

### Prevention
**Rule:** "Spent this period" captions must only include explicit user purchases — never
auto-deductions. Auto-deductions affect *remaining* budget but should be surfaced as a
separate line item, not silently folded into the "spent" figure. Always verify that the
same metric is calculated identically on every surface where it appears (dashboard, spending
tab, summary cards).

---

---

## BUG-022 — Category filter chips in "All purchases" change when Wants/Needs toggle is switched

**Date:** May 2026  
**Branch:** `feat/sprint-16-type-toggle` (RS-16 Wants/Needs toggle)  
**Severity:** Medium (UX confusion — chip list unexpectedly shrinks/changes when toggling the KPI tile)

### Symptom
In the Spending tab, clicking the 🛍 Wants / 🏠 Needs toggle on the "Spent this period"
card also changed which category chips appeared in the "All purchases" filter row below.
For example, with Needs selected, only needs-type categories showed as chips; switching to
Wants removed them and showed only wants-type categories.

### Root Cause
`activeCategories` — the computed that drives the filter chips — was derived from
`categorySpending`, which itself reads from `donutPurchases` (the toggle-filtered subset):

```ts
// BUG: categorySpending is derived from donutPurchases (toggle-filtered)
const categorySpending = computed(() => getCategorySpending(donutPurchases.value));

const activeCategories = computed(() =>
  Object.entries(categorySpending.value)  // ← changes when donutTypeFilter changes
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([name]) => name),
);
```

The donut card and the "All purchases" table shared the same intermediate computed, so any
change to `donutTypeFilter` rippled into the chip list.

### Fix
`activeCategories` now reads directly from `purchasesInPeriod` (all purchases in the
period, regardless of type), completely decoupled from the donut toggle:

```ts
const activeCategories = computed(() => {
  const spending = getCategorySpending(purchasesInPeriod.value);
  return Object.entries(spending)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([name]) => name);
});
```

`categorySpending` (used by the donut) is unchanged — it still reads from `donutPurchases`.

### Prevention
**Rule:** UI controls that are visually independent (a type toggle on one card vs filter chips
on a different card) must not share a reactive intermediate computed. When two sections of a
page need different views of the same data, give each its own dedicated computed sourced from
the appropriate base set — never let one section's filter computed "accidentally" drive
another section's UI.

---

## BUG-023 — `wishlist_items` missing `price` and `saved` columns in Supabase; every update returns HTTP 400

**Date:** May 2026  
**Branch:** `fix/wishlist-price-saved-migration`  
**Severity:** High (every `updateWishlistItem` / `addWishlistItem` sync call silently fails; cloud data is never persisted for price/saved fields)

### Symptom
After merging RS-14 (wishlist price tracking), the browser console showed:

```
[penny] db sync (updateWishlistItem):
  Error: [db/update:wishlist_items] Could not find the 'price' column
  of 'wishlist_items' in the schema cache
```

Accompanied by `Failed to load resource: the server responded with a status of 400 ()`.
The app continued working from localStorage but wishlist price/saved data was never
persisted to Supabase.

### Root Cause
RS-14 added `price?: number` and `saved?: number` to the `WishlistItem` domain type,
`WishlistItemRow` in `database.ts`, and the `db.wishlist.insert/update` payloads in
`db.ts` — but **no database migration was created** to add those columns to the live
`wishlist_items` table.

Supabase's PostgREST layer validates column names against its schema cache at runtime.
Any `INSERT` or `UPDATE` that references a non-existent column returns HTTP 400 with
`"Could not find the 'price' column in the schema cache"`.

Since `syncDb()` is fire-and-forget (errors are caught and logged, never thrown), the
app continued working with local state. The failure was silent to the user.

The separate `[penny] DB fetch timed out after 20000 ms` warning is **unrelated** — it
is a known Supabase free-tier cold-start behaviour where the parallel 18-table fetch
exceeds the 20s deadline after a period of inactivity. The app correctly falls back to
localStorage in that case.

### Fix
Created `supabase/migrations/004_wishlist_price_saved.sql`:
```sql
alter table wishlist_items
  add column if not exists price  numeric(10, 2),
  add column if not exists saved  numeric(10, 2);

notify pgrst, 'reload schema';
```

Also updated `003_reset_and_rebuild.sql` so future fresh schema setups include
both columns from creation.

**To apply to the live database:** paste and run `004_wishlist_price_saved.sql`
in the Supabase Dashboard → SQL Editor.

### Prevention
**Rule:** Any sprint that adds a new field to a domain type AND maps it through `db.ts`
(insert/update payload) MUST include a corresponding Supabase migration SQL file in the
same PR. The checklist in `CLAUDE.md` Release Process should also cover this:
> If any `db.ts` insert/update payload references a new column, add a migration file
> and apply it before merging to main.

Added 6 tests in `tests/lib/db.spec.ts` (`db.wishlist` describe) that pin the exact
insert/update payloads and the `toWishlistItem` mapper behaviour for null columns —
so a regression of this kind would be caught by CI before merging.

---

*Last updated: May 2026 — v2.7.0 (BUG-021 through BUG-023)*  
*See also: [PHASE_TRACKING.md](PHASE_TRACKING.md) for the full sprint history.*
