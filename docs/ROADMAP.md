# A Penny For Our Thoughts — Future Features Catalogue

> This document captures potential future features, organised by category and estimated effort.
> It is a living idea backlog — not a commitment. Items are added as they are identified,
> and moved to **[PHASE_TRACKING.md](./PHASE_TRACKING.md)** when scheduled for a sprint.
>
> **Current Version**: v1.6.0 · **Last Updated**: May 2026

---

## Category A — Analytics & Insights

### A1 · Spending History Browser *(High value · M effort)*
`spendingHistory` exists in state but has no dedicated browse UI. Build a full history panel:
- List of all past bi-weekly periods with date range, total, and top categories
- Per-period drilldown: all purchases, editable labels
- Retroactive category assignment — apply a new rule to historical records
- Filters by date range and category (reuses SpendingAnalytics infrastructure)

### A2 · Category-Level Budget vs. Actual *(High value · M effort)*
Current `BudgetVsActual` shows only Needs / Wants / Savings totals. Add a drilldown:
- Per-category breakdown ("Groceries: $420 budgeted vs $381 actual — ✅ $39 under")
- Requires a new `CategoryBudget[]` state field with per-category monthly targets
- Bar chart per category, colour-coded variance
- Month selector for historical comparison

### A3 · Net Worth Forecast *(Medium value · S effort)*
Extend `NetWorthChart` with a projected future line (dashed) based on current savings rate:
- 12-month lookahead using average monthly net worth delta from `netWorthHistory`
- Toggle: show/hide projection line
- Confidence band (shaded range) based on variance in savings rate

### A4 · Seasonal Spending Patterns *(Low value · M effort)*
Identify recurring seasonal trends in spending:
- Month-of-year heatmap — which months are historically most expensive
- "Your December is usually $X more than average" auto-insight
- Driven from `spendingHistory` — needs 12+ months of data to be useful

---

## Category B — UX & Mobile

### B1 · Bottom-Sheet Modals on Mobile *(High value · M effort)*
At ≤540px, `BaseModal` transforms from a centred dialog into a bottom sheet:
- Slides up from the bottom edge; drag handle affordance
- CSS-only: swap `top: 50%` for `bottom: 0; border-radius: 16px 16px 0 0`
- Backdrop tap and ESC still dismiss
- Test on iOS Safari and Android Chrome

### B2 · Savings Runway Calculator *(Medium value · S effort)*
Interactive "what-if" tool inside `SavingsGoals.vue`:
- "At $X/month saved, you'll hit your goal in N months"
- Slider to explore "what if I saved $Y more per month?"
- Updates projected date and monthly-needed in real time
- Collapsible panel per goal — keeps the UI clean by default

### B3 · Keyboard-Aware Form Scrolling *(Medium value · S effort)*
When a modal opens on iOS/Android and the virtual keyboard appears:
- Use `visualViewport` resize event to detect keyboard
- Scroll focused input into view, adjust modal position
- Prevents the common "input hidden behind keyboard" problem on small screens

### B4 · Drag-to-Reorder Rules *(Low value · M effort)*
Transaction Rules are evaluated top-to-bottom; priority matters. Currently users delete and re-add to reorder.
- Touch-friendly drag handles on each rule row in `RulesEngine.vue`
- Use the HTML5 Drag-and-Drop API or a lightweight sortable library
- Persist the new order to the store

---

## Category C — Data Management

### C1 · JSON Backup / Restore *(High value · S effort)*
Export the full `BudgetState` as a `.json` file (lossless — unlike CSV which flattens nested structures):
- `exportStateToJSON()` — `JSON.stringify(state)` with schema version embedded
- `importFromJSON(text)` — validates schema version, runs migrations if needed
- Lives alongside the existing CSV export/import toolbar buttons
- Safer for full backups; CSV remains for interoperability with spreadsheets

### C2 · Vitest Coverage Report *(Medium value · S effort)*
- Add `@vitest/coverage-v8` and a `coverage` npm script
- Coverage thresholds: 80% lines/functions on `src/utils/` and `src/stores/`
- CI step: fail the build if coverage drops below threshold
- Badge in `docs/README.md`

### C3 · Multi-Device Sync via Export URL *(Low value · L effort)*
Enable sharing a budget snapshot without a backend:
- Encode the full state as a compressed base64 URL parameter
- Another browser can open the URL and import the state
- Privacy concern: URL contains all financial data — display a clear warning
- Alternative: QR code for mobile transfer

---

## Category D — Intelligence & Automations

### D1 · Recurring Transaction Auto-Detection *(High value · L effort)*
Analyse `spendingHistory` to surface patterns the user hasn't yet modelled:
- "We noticed Netflix ($15.99) appears every 4 weeks — want to add it as a subscription?"
- Confidence scoring based on amount consistency and interval regularity
- One-click "Add to Subscriptions" from the suggestion

### D2 · Smart Budget Rebalancing *(Medium value · M effort)*
After 3+ months of data, suggest allocation adjustments:
- "You've consistently spent 35% on Wants — consider updating your allocation from 30%"
- Shows the impact: "+$X to Wants, −$X from Savings"
- User confirms; updates `state.allocation` via existing modal

### D3 · Bill Payment Reminders *(Medium value · S effort)*
Send browser notifications for upcoming due dates:
- Use the Notification API (requires one-time permission prompt)
- Configurable lead time: "Remind me 2 days before"
- Covers: loans, subscriptions, expense card items with a `dueDay`
- Toggle per-item in the edit modal

### D4 · Income Variance Handling *(Low value · M effort)*
Better support for variable income (bonuses, freelance):
- Per-month income override — same sparse-map pattern as `savingsAccount.monthlyAllocations`
- "This month's income" stat card shows effective income, not just stream total
- Historical income chart in a new Income Analytics section

---

## Category E — Visualizations

### E1 · Wants Spend Sparklines *(Medium value · S effort)*
Inline 7-point SVG sparklines on the main stat cards:
- Income card: last 7 months of total income
- Needs / Wants cards: last 7 months of spend in that category
- Uses data already available from `getSpendingTrend()`

### E2 · Net Worth Waterfall Chart *(Medium value · M effort)*
Replace or supplement the line chart with a waterfall view showing contribution sources:
- Columns: Savings contributions / Asset appreciation / Loan paydown / Liabilities change
- Makes it easy to see *why* net worth changed, not just *by how much*

### E3 · Category Spend Treemap *(Low value · M effort)*
Alternative to the horizontal bar chart in SpendingAnalytics:
- Proportional rectangle layout where area = spend
- More visually striking for large category counts
- Could use a lightweight library or pure SVG implementation

### E4 · Annual Summary Card *(Low value · S effort)*
A single-screen "Year in Review" view generated from the last 12 months of history:
- Total income, total needs, total wants, total saved
- Biggest spending month, best savings month
- Goals hit vs. missed
- Export-ready (screenshot-friendly layout)

---

## Category F — Quality & Robustness

### F1 · End-to-End Tests with Playwright *(High value · L effort)*
Supplement Vitest unit tests with real browser smoke tests:
- Tab navigation, CRUD operations, CSV round-trip
- Theme toggle persistence across reload
- Run in CI on every PR (headless Chromium)
- Catches regressions that unit tests miss (DOM, localStorage, Chart.js canvas)

### F2 · PWA / Offline Support *(Medium value · M effort)* — ⚠️ PARTIALLY DELIVERED

> **Installability shipped in v2.47.0** (MOBILE-5): manifest, icon set, apple-touch metas, and a
> minimal service worker with a pass-through `fetch` handler — enough for Chrome to offer
> installation. It deliberately does **not** cache, so the app remains online-only. What remains
> below is the offline half: precaching the app shell plus the Chart.js and Google Fonts CDN
> assets, with cache versioning and an update prompt.
Convert the app to a Progressive Web App:
- Service worker for offline caching (already mostly offline — needs manifest + SW)
- "Add to Home Screen" prompt on mobile
- App icon + splash screen
- No change to the data model — localStorage already works offline

### F3 · Accessibility Audit (WCAG 2.1 AA) *(Medium value · M effort)*
Full accessibility pass:
- Screen reader compatibility: `aria-label`, `aria-live` regions, focus management in modals
- Keyboard navigation: all interactive elements reachable via Tab, operable via Enter/Space
- Color contrast verification: all text ≥ 4.5:1 against its background
- Automated audit with `axe-core` in CI

### F4 · localStorage Quota Guard *(Low value · S effort)*
The current storage full toast is good, but extend it:
- Show an estimated storage usage meter in Settings (bytes used / ~5 MB typical quota)
- Offer to trim `spendingHistory` to the last N months to free space
- Archive old periods to a downloadable JSON instead of deleting them

---

## Priority Matrix

| Feature | Category | Value | Effort | Dependency |
|---------|----------|-------|--------|------------|
| JSON Backup / Restore | C | ⭐⭐⭐ | S | — |
| Bottom-Sheet Modals | B | ⭐⭐⭐ | M | — |
| Category-Level BvA | A | ⭐⭐⭐ | M | CategoryBudget state |
| Spending History Browser | A | ⭐⭐⭐ | M | — |
| E2E Tests (Playwright) | F | ⭐⭐⭐ | L | — |
| Savings Runway Calculator | B | ⭐⭐ | S | — |
| Net Worth Forecast | A | ⭐⭐ | S | netWorthHistory |
| Vitest Coverage Report | C | ⭐⭐ | S | — |
| Wants Spend Sparklines | E | ⭐⭐ | S | spendingTrend |
| Smart Budget Rebalancing | D | ⭐⭐ | M | 3+ months history |
| PWA / Offline Support *(offline half only — install shipped v2.47.0)* | F | ⭐⭐ | M | — |
| Accessibility Audit | F | ⭐⭐ | M | — |
| Bill Payment Reminders | D | ⭐⭐ | S | Notification API |
| Keyboard-Aware Forms | B | ⭐⭐ | S | — |
| Recurring Auto-Detection | D | ⭐⭐ | L | 6+ months history |
| Income Variance Handling | D | ⭐ | M | — |
| Net Worth Waterfall | E | ⭐ | M | — |
| Drag-to-Reorder Rules | B | ⭐ | M | — |
| Seasonal Patterns | A | ⭐ | M | 12+ months history |
| Annual Summary Card | E | ⭐ | S | 12 months history |
| Category Treemap | E | ⭐ | M | — |
| Multi-Device Sync URL | C | ⭐ | L | — |

---

*Effort key: S = half-day to 1 day · M = 2–4 days · L = 1–2 weeks*
