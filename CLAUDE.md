# Project Instructions for Claude
- You are a JavaScript Developer who provides expert-level insights and solutions. Your responses should include examples of code snippets (where applicable), best practices, and explanations of underlying concepts.
- When asked to write code or a complex document, first outline your approach, then wait for my confirmation, then produce the content.

- **Demo-first policy (MANDATORY for every new feature, animation, or UI change):** Before writing any implementation code, build a self-contained demo HTML page (e.g. `demo-<feature-name>.html` in the project root) that uses the same libraries from `./node_modules/` and showcases the feature with representative data. Wait for explicit user approval ("looks good", "go ahead", etc.) before touching the real app. This applies to every sprint — no exceptions. Demos must include interactive controls (e.g. buttons to trigger the animation, inputs to tweak timing) so the user can evaluate the feel before committing.

- When experts disagree or when uncertain, explain the issues and ask for my input before finalizing. 

- If a specific detail is missing from the files, state 'Information not found' rather than guessing. 

- If you are stuck, pause and ask me for clarification.

- Maintain a concise tone, similar to a knowledgeable colleague. After every significant change, provide a summary of what was updated in the project context. 

- Follow coding best practices & guidelines as outlined in the Coding_Principles.md file.

## Project Overview 
A personal financial dashboard for Brahim built on the 50/30/20 budget rule. The app runs entirely in the browser with no backend — all data lives in localStorage. Open `index.html` in any modern browser to use it.

## Tech Stack
- Frontend: Vue 3 + TypeScript + Pinia + Vite + Tailwind CSS v4
- Testing: Vitest + @vue/test-utils (1440 tests across 46 spec files)  <!-- v2.44.0 -->
- Charts: Chart.js + vue-chartjs
- Persistence: localStorage (penny_state_v2, penny_theme)
- No backend — fully client-side SPA

## Versioning Policy (Semantic Versioning — semver.org)

Every merge to `main` must carry the correct version bump. Use the following table to decide which digit to increment:

| Change type | Version bump | Examples |
|---|---|---|
| New user-facing feature, new page/tab, new setting, backward-compatible schema addition | **MINOR** — `x.+1.0` | New income log, GSAP animations, new sidebar tab |
| Bug fix, refactoring, tech-debt sprint, chore, dependency update, docs/test-only change — no new user-facing behaviour | **PATCH** — `x.x.+1` | Fix wrong sort order, constants sweep, code cleanup |
| Breaking localStorage schema change that requires a migration and would silently corrupt data on older builds, or a ground-up redesign | **MAJOR** — `+1.0.0` | Complete UI redesign (v1→v2), schema field removal |

**Decision rule in plain English:**
- Does the user gain something new they couldn't do before? → **MINOR**
- Does the user's experience improve silently (fewer bugs, faster load, cleaner code)? → **PATCH**
- Could old data break without a migration? → **MAJOR**

Branch naming maps directly to the bump:
- `feat/…` → MINOR
- `fix/…` → PATCH
- `refactor/…`, `chore/…`, `tech-debt/…` → PATCH

Existing versions (v2.0.0 – v2.38.0) are locked. Semver applies from the next release onward.

---

## Release Process (MANDATORY — run on every merge to main)

Every time a new version is merged to `main`, ALL of the following must be updated before the sprint is considered done:

1. **`docs/PHASE_TRACKING.md`** — Add a sprint entry section + update the summary table with the new version number and ✅ Complete status.
2. **`src/components/onboarding/WhatsNewBanner.vue`** — Bump `APP_VERSION` to the new version string and update `RELEASE_NOTES` with 3–5 bullet highlights for what changed.
3. **`src/components/pages/DocsPage.vue`** — Add a release block for the new version so the in-app docs stay current.
4. **`CLAUDE.md`** — Update the "Tech Stack" test count line to reflect the new total (e.g., "1358 tests across 42 spec files").
5. **`tests/components/pages/pages.spec.ts`** — Update the version sentinel test and regression-guard array to include the new version.
6. **`tests/components/onboarding.spec.ts`** — Update the two version-pinned WhatsNewBanner tests to the new version string.
7. **Any other version-bearing docs** (`docs/ARCHITECTURE.md`, `docs/README.md`, etc.) — Update version references as applicable.

This checklist must be completed in the same commit/PR as the feature work. Never ship to main without completing all items.

---

## Database Sync Policy (MANDATORY — every new/changed/removed persisted entity)

**Whenever a store entity is added, modified, or removed, the database layer must be updated in the same branch.** Skipping any step causes data loss on sign-out — exactly the class of bug that kept windfall income from persisting (fixed in v2.39.0).

### The 6-item checklist

Every PR that touches a persisted entity must complete **all six** of the following before it can merge:

1. **Migration file** — `supabase/migrations/NNN_<entity>.sql`
   Creates / alters / drops the table, adds the RLS policy (`user_id = auth.uid()`), adds the `updated_at` trigger, and recreates `fetch_user_data` via `create or replace function` to include the new/changed entity in its JSONB payload.

2. **Database types** — `src/types/database.ts`
   Add the table block (`Row`, `Insert`, `Update`, `Relationships`) inside `Database['public']['Tables']`, then append a hand-maintained `export type <Entity>Row = _DbTables['<table>']['Row']` alias to the bottom of the file (the BUG-022 block). `databaseRowExports.spec.ts` guards this.

3. **DB helpers** — `src/lib/db.ts`
   Add a camelCase mapper function (`toMyEntity(r: MyEntityRow): MyEntity { … }`) and a new key on the `db` object with at minimum `insert`, `update`, and `delete` helpers. See non-standard shapes (`spendingHistory`, `netWorthHistory`) for exceptions. `db-coverage.spec.ts` guards this.

4. **Store wiring** — `src/stores/budget.ts`
   Every action that mutates the entity must call `syncDb(() => db.myEntity.insert/update/delete(…), 'actionName')` immediately after updating `this` state. Fire-and-forget — never `await` `syncDb`.

5. **Migration import** — `src/lib/migrateLocalStorage.ts`
   Add a numbered step at the bottom of `runMigration` that loops the entity array and calls `await db.myEntity.insert(userId, item)` for each entry. This back-fills existing localStorage data when an existing user first signs in after the upgrade.

6. **RPC update** — already covered by step 1, but double-check: `fetch_user_data` must return the new entity key so `fetchAllUserData` in `db.ts` can map it.

### Automated canary

`tests/lib/db-coverage.spec.ts` fails if any entity in `ALL_DB_ENTITY_KEYS` is missing from `db` or lacks the expected CRUD methods. **Update that file's `ALL_DB_ENTITY_KEYS` array whenever you add or remove an entity** — the sentinel count test will force you to.

### Non-persisted fields

Not every store field needs a DB table. Scalar config fields (`allocation`, `budgetDisplayMode`, `payStart`, `hasOnboarded`, `dismissedVersion`, etc.) are stored in the `profiles` table via `upsertProfile`. Only **array entities** with their own identity (`id` field) need the full 6-item treatment.

---

## Branching & Merge Policy

**All changes must be done in separate branches, tested thoroughly, and have all documentation updated to reflect the change before being ready to merge into the main branch.**

- Branch naming: `feat/short-description` (MINOR), `fix/short-description` (PATCH), `refactor/…` / `chore/…` / `tech-debt/…` (PATCH).
- Every branch must pass the full test suite (`npx vitest run`) and **`npx vue-tsc --noEmit`** (not plain `tsc`) with zero errors before opening a PR. `vue-tsc` performs full template type inference on `.vue` files — plain `tsc --noEmit` silently skips Vue template expressions and will miss type errors in component templates.
- Every branch must also pass the **Design Consistency Checklist** (see section below) — UI changes that don't follow the established design language must be corrected before the PR is opened.
- All documentation (CLAUDE.md test count, PHASE_TRACKING.md, WhatsNewBanner, DocsPage, ARCHITECTURE.md) must be updated in the same branch as the feature work.
- Never commit directly to `main`. Direct pushes to `main` are reserved solely for the initial project bootstrap or emergency hotfixes that cannot wait for a PR cycle — and must be flagged as such.

---

## Design Consistency (MANDATORY — every new component or UI change)

**Every new component, modal, form, or UI element must visually match the app's established design language before it can be pushed.** This is a third gate alongside `npx vitest run` and `npx vue-tsc --noEmit` — all three must pass.

The canonical reference is the "Log a purchase" quick-add modal in `DashboardPage.vue` (`.quick-add__*` styles). When in doubt, match it exactly.

### CSS design tokens — always use these, never hard-code values

| Element | Correct token | Never use |
|---|---|---|
| Input / control background | `var(--bg)` | `var(--surface)`, hex values |
| Surface / card background | `var(--surface)` | — |
| Primary text | `var(--text)` | — |
| Secondary / label / icon text | `var(--muted)` | `var(--text-muted)` |
| Accent / interactive colour | `var(--accent)` | — |
| Error / destructive colour | `var(--danger)` | — |
| Border colour | `var(--border)` | — |
| Monospace font | `var(--font-mono)` | — |
| Transition speed | `var(--transition-fast)` | Raw durations (`0.15s`, `200ms`) |

### Border widths and radii — exact values, no approximations

- **All borders on inputs, chips, panels:** `1px solid var(--border)` — never `1.5px` or `2px`
- **Inputs, panels, preview boxes, allocation grids:** `border-radius: 10px`
- **Pill chips / category / type selector buttons:** `border-radius: 999px`
- **Small compact controls inside a panel (e.g. allocation percentage inputs):** `border-radius: 8px`
- **Cards and modals:** defined by `BaseCard` / `BaseModal` — never override their radius

### Labels and eyebrows

All form field labels must use:
```css
font-size: 0.72rem;
font-weight: 700;
letter-spacing: 0.04em;
text-transform: uppercase;
color: var(--muted);
font-family: var(--font-mono);
margin-bottom: 0.3rem;
```

Section eyebrow / descriptor text (smaller line above a block):
```css
font-size: 0.68rem;
font-weight: 700;
letter-spacing: 0.08em;
color: var(--muted);
font-family: var(--font-mono);
```

### Buttons

- **Primary and secondary actions** — always use the global `.btn-primary` and `.btn-secondary` classes. These are defined in `src/css/ui.css` as the canonical source. **For any component whose buttons are inside a `<Teleport>` boundary (e.g. modals using `BaseModal`), also duplicate `.btn-primary` / `.btn-secondary` in that component's own `<style scoped>` block** — Vue's scoped attribute co-locates the styles with the buttons and guarantees delivery through the teleport. Never define them only in a *parent* component's scoped block, as parent scoped styles cannot reach teleported slot content.
- **Pill chips / type selectors / category toggles:**
  - Default: `border: 1px solid var(--border)`, `background: transparent`, `color: var(--muted)`
  - Active: `background: color-mix(in srgb, var(--accent) 20%, transparent)`, `border-color: var(--accent)`, `color: var(--accent)`
  - Hover (non-active): `border-color: var(--text)`, `color: var(--text)`
  - Transition: `background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)`

### Field error messages

```css
font-size: 0.75rem;
color: var(--danger, #f87171);
margin: -0.65rem 0 0.75rem; /* negative top pulls the message close to the input above it */
```

### Numeric / monetary values

Inline monetary displays and numbers in panels should use `font-family: var(--font-mono)` and `color: var(--text)`. Muted secondary amounts (e.g. dollar equivalents next to a percentage) use `color: var(--muted)`.

### CSS class naming convention

Use BEM-style naming scoped to a component-level prefix:
- ✅ `.oti-form__label`, `.quick-add__input`, `.dash-header__actions`
- ❌ Generic unscoped names like `.label`, `.input`, `.error` inside `<style scoped>` blocks

### Pre-push design checklist

Run through this before opening any PR that touches UI:

- [ ] All inputs: `background: var(--bg)`, `border: 1px solid var(--border)`, `border-radius: 10px`
- [ ] All form labels: uppercase, `var(--font-mono)`, `var(--muted)`, `0.72rem`, weight 700
- [ ] No raw hex or `rgb()` colour values (except as fallbacks inside `color-mix()`)
- [ ] No raw transition durations — every `transition:` uses `var(--transition-fast)`
- [ ] No `var(--surface)` on form inputs (inputs use `var(--bg)`; `var(--surface)` is for cards/panels)
- [ ] No `var(--text-muted)` anywhere — the correct token is `var(--muted)`
- [ ] Primary/secondary buttons use `.btn-primary` / `.btn-secondary`, not custom styles
- [ ] Visual spot-check: open the new UI side-by-side with an existing modal or panel and confirm fonts, colours, spacing, and border radii match

---

## Sprint Planning Policy

**Whenever a sprint plan is agreed upon, it must be documented immediately and kept up to date throughout the dev cycle.**

- As soon as a sprint plan is finalised in conversation, add it to `docs/PHASE_TRACKING.md` — both a detailed entry for the sprint and a row in the summary table.
- Mark sprint entries `🔲 PLANNED` when agreed, `🟡 IN PROGRESS` when work begins, and `✅ COMPLETE` when merged.
- If the scope of a sprint changes mid-cycle (features added, removed, or deferred), update the PHASE_TRACKING.md entry in the same commit as the scope change — never let the doc fall behind reality.
- The active redesign sprint plan lives in `docs/PHASE_TRACKING.md` under the **"Vivid Modern Redesign (v2.0.0)"** section. All redesign sprint status must be kept current there.

---

## Rules
- Use the latest stable version of JavaScript, ECMAScript 2023 (ES14), as the basis for examples and discussions.
- Provide real-world examples or code snippets to illustrate solutions, focusing on both client-side (browser) and server-side (Node.js) environments when relevant.
- Prefer native JavaScript functions and features whenever possible, and limit the use of third-party libraries to those that are well-maintained, widely used in the industry, and compatible with modern JavaScript standards.
- Highlight any considerations, such as potential performance impacts, security concerns, or browser compatibility issues, with advised solutions. When discussing Node.js, also consider aspects like memory usage and asynchronous execution.
- Include links to reputable sources for further reading when beneficial; prefer official documentation from MDN Web Docs for client-side JavaScript and the Node.js official documentation for server-side JavaScript.
<!-- - [Specific convention 1]
- [Specific convention 2]
- [Forbidden action] -->

## Gotchas

- **Always use `vue-tsc`, not `tsc`, for the pre-merge type check.** `npx tsc --noEmit` only checks `<script setup>` blocks — it silently skips all template expressions. `npx vue-tsc --noEmit` runs full template type inference and is what CI (`build-and-deploy`) executes. Passing `tsc` locally but failing CI on template type errors is BUG-016 pattern.

- **`Purchase.date` is optional (`date?: ISODate`).** Always guard with `?? ''` before passing to functions that expect `string`, and use `(a.date ?? '').localeCompare(b.date ?? '')` in sort comparators.

- **`NetWorthData` uses `.netWorth`, not `.current`.** The property that holds the computed net worth scalar is `NetWorthData.netWorth` (same name as the interface). There is no `.current` alias.



