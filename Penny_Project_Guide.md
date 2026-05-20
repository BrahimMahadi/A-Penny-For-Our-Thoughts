# A Penny For Our Thoughts — Project Guide

---

## AI Handoff Prompt

> Copy and paste this block into any AI assistant to fully resume work on this project.

```
You are continuing development of "A Penny For Our Thoughts" — a personal budget tracking web dashboard for a user named Brahim.

**Project location:** /Users/brahim/Documents/Claude/Projects/A Penny For Our Thoughts/
The entry point is index.html. All JS lives under src/. All files must stay in the same repo.

**Tech stack:** Vanilla HTML/CSS/JavaScript, single-page application, no build tools or frameworks. Chart.js 4.4.1 loaded from Cloudflare CDN. All data persisted in localStorage under the key `penny_state_v2`.

**Budget rules (50/30/20):** The user follows a 50% Needs / 30% Wants / 20% Savings rule. These percentages are user-editable. All income calculations derive from the total of all income streams.

**Income:** Multiple income streams — each has { id, name, amount, biweekly }. Monthly income = sum of all streams (biweekly ones × 26 / 12). The dashboard shows this total in the "Total Monthly Income" stat card.

**Theme:** Botanical dark/light theme (deep greens + lime accents). Toggle in header (🌙/☀️). User preference persisted in localStorage under key `penny_theme`.

**Mobile Responsiveness:** Fully responsive with breakpoints at 1024px, 768px, 540px, 380px.

**Architecture:** The app is entirely driven by a single `state` object loaded from localStorage. Every render function reads from `state`. Saving always calls `saveToStorage()` then the relevant `render*()` function(s). IDs are stable random strings from `genId()`.

**Module load order:** utils.js → state.js → analytics.js → charts.js → render.js → app.js

**State schema (penny_state_v2):**
- `allocation` (object): `{ needs: 50, wants: 30, savings: 20 }` — percentages, must sum to 100
- `budgetDisplayMode` (object): `{ needs: 'monthly', wants: 'monthly', savings: 'monthly' }`
- `incomeStreams` (array): `[{ id, name, amount, biweekly }]`
- `expenseCards` (array): `[{ id, label, items: [{ id, name, amount, biweekly }] }]`
- `purchases` (array): `[{ id, name, amount, category, cardId, budgetType }]`
  - `category`: WANT_CATEGORIES string (e.g. 'Food & Drink', 'Other')
  - `cardId`: associated expense card id (null = no card)
  - `budgetType`: `'wants'` (default) | `'needs'` — controls which budget category the purchase deducts from
- `spendingHistory` (array): `[{ id, date, label, total, items: [...purchases] }]`
  - `total` contains only the Wants-tagged purchases (Needs-tagged are excluded)
- `loans` (array): `[{ id, name, remaining, original, paymentAmount, frequency, date, budgetType, cardId }]`
  - `paymentAmount`: regular payment amount per period (0 = no schedule configured)
  - `frequency`: `'monthly'` | `'bi-weekly'` | `'quarterly'` | `'bi-yearly'` | `'annual'`
  - `date`: YYYY-MM-DD anchor date for the payment schedule ('' = none)
  - `budgetType`: `'needs'` | `'wants'` — which budget category the payment is deducted from
  - `cardId`: associated expense card id (null = no card)
- `creditCards` (array): `[{ id, name, balance, limit }]`
- `subscriptions` (array): `[{ id, name, amount, frequency, date, category, budgetType, cardId }]`
  - `frequency`: `'monthly'` | `'bi-weekly'` | `'quarterly'` | `'bi-yearly'` | `'annual'`
  - `cardId`: required — associated expense card id (must select a card to add)
  - `budgetType`: `'wants'` | `'needs'`
- `wishlist` (array): `[{ id, icon, name, url }]`
- `savingsAccounts` (array): `[{ id, name, balance, defaultAllocated, monthlyAllocations: {} }]`
  - `balance`: total current balance in the account
  - `defaultAllocated`: default monthly contribution from the savings budget
  - `monthlyAllocations`: sparse map of monthly overrides e.g. `{ "2026-06": 200 }`
- `goals` (array): `[{ id, accountId, targetAmount, targetDate }]`
  - `accountId`: references a savings account id
  - `targetDate`: YYYY-MM format (e.g. "2027-12")
- `payStart` (string): YYYY-MM-DD anchor date for the bi-weekly wants period
- `rules` (array): `[{ id, pattern, matchType, category }]` — auto-categorise purchases
- `budgetAlerts` (array): `[{ id, category, threshold }]`

**Key utility functions:**
- `getAllocationForMonth(account, year, month)` — returns effective allocation for a given month
- `getGoalProgress(goal)` — returns `{ accountName, currentAmount, targetAmount, progressPercent, monthsRemaining, monthlySavingsNeeded, status, isOnTrack }`
- `calculateMonthsBetween(startYYYY-MM, endYYYY-MM)` — returns integer month difference
- `getTotalMonthlyIncome()`, `getAlloc()`, `fmt(n)`, `genId()`

**State migration (automatic in loadFromStorage):**
- Old `state.gov` → one incomeStream entry
- Old `state.expenses` keyed object → expenseCards array
- Old `savingsAccounts[].allocated` → `defaultAllocated` (balance defaults to 0)
- Missing `state.goals` → initialized to []
- Missing `purchase.cardId` → null
- Missing `purchase.budgetType` → 'wants'

**Coding conventions:**
- Senior JavaScript developer, clean ES2023 code
- First outline approach, then wait for confirmation before implementing
- Only use information from project files — do not invent values
- After every significant change, update this Penny_Project_Guide.md accordingly
```

---

## File Structure

```
A Penny For Our Thoughts/
├── index.html                  ← HTML shell, layout, modals, all markup
├── src/
│   ├── app.js                  ← Entry point: CRUD operations, UI interactions, CSV, modal builders
│   ├── render.js               ← All DOM render functions (renderAll, renderWants, etc.)
│   ├── state.js                ← State initialisation, DEFAULT_STATE, loadFromStorage, saveToStorage
│   ├── analytics.js            ← Pure calculations: actuals, budget vs actual, goal progress
│   ├── charts.js               ← Chart.js instance management (donut, bar, line)
│   ├── utils.js                ← Helpers: fmt(), genId(), deepClone(), ordinal(), etc.
│   └── styles.css              ← All styling and CSS variables (dark + light Botanical theme)
├── data/
│   ├── blank-template.csv      ← Empty import template for users
│   └── sample-data.csv         ← Fully populated example for testing
├── docs/
│   ├── IMPORT_TEMPLATE.md      ← CSV import guide with field documentation
│   ├── PHASE_TRACKING.md       ← Development phase progress
│   └── ROADMAP.md              ← Full feature roadmap
├── CLAUDE.md                   ← Instructions for Claude
├── Coding_Principles.md        ← Development standards
└── Penny_Project_Guide.md      ← This file
```

Open `index.html` in any modern browser. No server or install required.

---

## UI Patterns

### Button System

All buttons throughout the app use a unified `.btn` system with **uppercase text and letter-spacing**:

| Class | Use | Style |
|---|---|---|
| `.btn` | Primary action | Green fill + accent shadow |
| `.btn.secondary` | Neutral / edit action | Outlined, surface background |
| `.btn.danger` | Destructive / delete | Tinted red background + red outlined border |
| `.btn.warn` | Warning action | Amber fill |
| `.btn.sm` | Standard height rows (loans, savings, income) | `7px 14px` padding, 11px text |
| `.btn.xs` | Compact rows (expense items, subscriptions, chips) | `5px 10px` padding, 10px text |
| `.btn.icon-btn` | Symbol-only buttons (no text) | No uppercase, no shadow |

**Edit/Delete pattern:** Every list item uses `<button class="btn [sm|xs] secondary">Edit</button>` and `<button class="btn [sm|xs] danger">Delete</button>` in a `<div style="display:flex;gap:6px">` wrapper. Use `sm` for standalone row items and `xs` for compact/nested rows.

**Add-form submit:** Uses `.add-form-submit` (same uppercase style, 44px height, full-width). Add `.danger` class for destructive variants.

### Stacked Add Forms (`.add-form-stacked`)
All inline add-forms (Income Streams, Purchases, Savings, Wishlist, Expense Cards) use a consistent stacked layout:
- `.add-form-stacked` — vertical flex container with dashed border and `var(--surface2)` background
- `.add-form-field` — wraps a `.add-form-label` (uppercase 11px) + a 44px tall full-width input or select
- `.add-form-submit` — full-width 44px primary button; add `.danger` class for destructive variants

### Toggle Switch (`.toggle-row` / `.toggle-switch`)
Replaces all bi-weekly checkboxes. Pure CSS — no JS required:
- `<label class="toggle-row">` — clickable row with label text on left, switch on right
- `.toggle-info` contains `.toggle-label-text` (primary) and `.toggle-sublabel` (secondary hint)
- `.toggle-switch` contains a hidden `<input type="checkbox">`, `.toggle-track`, and `.toggle-thumb`
- CSS uses `input:checked + .toggle-track` and `input:checked + .toggle-track + .toggle-thumb` for state
- Used in: Income stream add form, Expense card add form, Edit Income Stream modal, Edit Expense Item modal

### Purchase Budget Type Chips
Each purchase item shows an inline budget-type chip next to the category chip:
- `.purchase-budget-chip.wants` — muted grey, default state (discretionary)
- `.purchase-budget-chip.needs` — amber highlight (counts against Needs budget, not Wants envelope)
- Chip wraps a `.budget-type-inline-select` dropdown to toggle type inline

### Payday Anchor Line
The wants tracker header row (`#payday-anchor-line`) renders inline period info + action buttons:
- Period dates, subscription deduction info
- `✎ PAYDAY` button (`.btn.xs.secondary`) — opens payday modal
- `↺ RESET` button (`.btn.xs.danger`) — resets the bi-weekly period

---

## CSS Variables (Botanical Theme)

| Variable | Dark value | Use |
|---|---|---|
| `--bg` | `#040d08` | Page background |
| `--surface` | `#0a1810` | Card backgrounds |
| `--surface2` | `#0f2018` | Input backgrounds, list items |
| `--surface3` | `#152a1e` | Hover states |
| `--accent` | `#4ade80` | Lime green — highlights, active states |
| `--accent2` | `#a3e635` | Yellow-green — amounts, values |
| `--accent-btn` | `#16a34a` | Button background (WCAG AA contrast) |
| `--danger` | `#ff4d6d` | Red text/borders — over budget, delete chips |
| `--danger-btn` | `#b8202e` | Danger button background (WCAG AA contrast) |
| `--warn` | `#ffa63d` | Amber — warnings, caution states |
| `--text` | `#dcfce7` | Primary text |
| `--muted` | `#5a7a63` | Secondary text, labels |
| `--border` | `#1a3526` | Card/input borders |
| `--radius` | `8px` | Border radius for cards |

Light theme overrides all colour tokens while keeping the same variable names.

---

## Dashboard Sections

### Income Overview
- **Five stat cards** (left → right): Funds Remaining, Total Monthly Income, Needs Budget, Wants Budget, Savings Budget
- **Funds Remaining** — manually-entered available balance (e.g. chequing account). Stored in `state.fundsRemaining` (number) + `state.fundsRemainingUpdated` (ISO date). ✎ Edit button opens a modal to update the value; sub-label shows "updated [date]".
- Each budget card (Needs / Wants / Savings) has a **Monthly ↔ Bi-Weekly toggle** in the card title row alongside the ℹ info button. Uses `.kpi-title-controls` flex group.
- Dollar amounts use **fluid `clamp()` font sizes** calibrated to actual measured card widths (150 px usable @ 1100 px, 179 px @ 1600 px) — content never clips through card borders at any viewport.
  - Income value: `clamp(22px, calc(2.6vw - 7px), 34px)`
  - Funds Remaining value: `clamp(18px, calc(2vw - 4px), 28px)`
  - Budget values (`.kpi-val`): `clamp(16px, calc(1.8vw - 3px), 26px)`
- Budget allocation bar showing visual split of Needs / Wants / Savings
- Budget vs. Actual summary panel — compares budgeted vs. actual spending for Needs, Wants, and Savings (On Track / Over indicator per category)

### Income Streams (CRUD)
- Add multiple income streams — each has a name, amount, and a bi-weekly toggle switch
- Bi-weekly streams: monthly value = amount × 26 / 12
- Total Monthly Income = sum of all streams' monthly values

### Wants Tracker
- Bi-weekly envelope = (monthly wants budget) / 2
- Donut chart showing spent vs. remaining by category (amber at 80%, red at 100%)
- Purchase list: each item shows category chip, budget type chip (Wants/Needs), card chip, amount, and Delete button
- **Budget type tagging:** Purchases tagged Needs are deducted from the Needs budget, not the Wants envelope. The donut chart and spent total only include Wants-tagged purchases.
- **Reset Period:** Archives current period (Wants-tagged total only) to `spendingHistory` before clearing. Lives in payday anchor line next to ✎ Payday button.
- Analytics dashboard (collapsible): date range + name filters, line chart, category bar chart, period history

### Monthly Expenses (Needs)
- Fully dynamic payment cards — user adds/renames/deletes cards
- Each card has items with name, amount, bi-weekly toggle switch
- Summary: grand total and Needs budget remaining

### Budget vs. Actual
- Side-by-side comparison of budgeted vs. actual for Needs, Wants, Savings
- Status chips: On Track (green) / Over (red)
- Actual Needs includes: expense card items + Needs-tagged subscriptions/loans this month + Needs-tagged purchases
- Actual Wants includes: Wants-tagged purchases this period + Wants-tagged subscriptions/loans this period
- Savings actual = total monthly income allocated to savings accounts this month

### Loans
- Progress bar per loan, colour-coded by % remaining (red >70%, amber >40%, teal otherwise)
- **Payment schedule (optional):** Set payment amount, frequency, next payment date, and budget category (Needs/Wants)
- **Card association (optional):** Link a loan to an expense card — a payment row (🏦) appears on that card every month the payment is due
- Loan balance is managed manually via Edit — no automatic deduction on payment date
- Full CRUD: Add, Edit, Delete

### Credit Card Utilization
- Bar per card with 30% threshold marker
- Chip shows % — green <30%, red ≥30%
- Bar chart comparing Balance vs. Limit for all cards
- Full CRUD: Add, Edit, Delete

### Savings
- Savings budget auto-calculated from income × savings%
- Per-account list showing: name, current balance, effective monthly allocation for this month
- Allocation progress bar: total allocated this month vs. savings budget
- **Allocate Savings Budget button:** Opens modal to set per-account contributions for the current month with real-time over-budget validation. Saves as monthly overrides; values matching the account default are not stored (sparse).
- Full CRUD on accounts: name, balance, defaultAllocated

### Savings Goals
- Per-account goals: target amount + target date (YYYY-MM)
- Auto-calculated progress from the account's current balance
- Progress bar + stats: Monthly Needed, Time Remaining, Status
- **Status logic:** Compares current month's effective allocation against monthlySavingsNeeded
  - On Track (green): allocation ≥ needed
  - Caution (amber): allocation ≥ 80% of needed
  - Off Track (red): allocation < 80% of needed
  - Complete / Missed for past target dates
- Full CRUD: Add Goal (linked to an account), Edit, Delete
- Deleting a savings account cascade-deletes its linked goals

### Subscription Renewals
- Sorted by date ascending; day countdown chip (green >60d, amber <60d, red expired)
- **Card layout (3-row):** Row 1 — full name + urgency chip; Row 2 — budget badge + card chip + amount; Row 3 — formatted renewal date + Edit/Delete buttons
- **Frequencies:** Monthly, Bi-Weekly, Quarterly, Bi-Yearly, Annual
- **Card association (required):** Each subscription must be linked to an expense card
- **Budget type:** Wants (deducted from bi-weekly envelope) or Needs (deducted from monthly needs budget)
- Full CRUD: inline add, edit modal, delete

### Wishlist
- Item cards with emoji icon, name, optional clickable URL
- Full CRUD: inline add (stacked form), edit modal, delete

---

## State Schema

```js
{
  allocation: { needs: 50, wants: 30, savings: 20 },
  budgetDisplayMode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },

  fundsRemaining: 1842.15,          // user-set available balance
  fundsRemainingUpdated: "2026-05-14", // ISO date of last manual update

  incomeStreams: [
    { id: "inc_1", name: "Government", amount: 3200, biweekly: true },
    { id: "inc_2", name: "Side Consulting", amount: 800, biweekly: false }
  ],

  expenseCards: [
    {
      id: "expenses_1",
      label: "🏠 Housing",
      items: [
        { id: "item_1", name: "Rent", amount: 1900, biweekly: false }
      ]
    }
  ],

  purchases: [
    { id: "p_1", name: "Coffee", amount: 5.50, category: "Food & Drink", cardId: null, budgetType: "wants" },
    { id: "p_2", name: "Groceries", amount: 87.40, category: "Shopping", cardId: "expenses_1", budgetType: "needs" }
  ],

  spendingHistory: [
    {
      id: "h_1",
      date: "2026-05-01",
      label: "May 1-14 Period",
      total: 487.23,                       // Wants-tagged purchases only
      items: [{ id: "i_1", name: "Dining Out", amount: 120, budgetType: "wants" }]
    }
  ],

  loans: [
    { id: "loan_1", name: "Car Loan", remaining: 15172, original: 23083,
      paymentAmount: 650, frequency: "monthly", date: "2026-06-01",
      budgetType: "needs", cardId: null }
  ],

  creditCards: [{ id: "cc_1", name: "Visa Infinite", balance: 1200, limit: 5000 }],

  subscriptions: [
    { id: "sub_1", name: "Netflix", amount: 17.99, frequency: "monthly",
      date: "2026-05-22", category: "Entertainment", budgetType: "wants", cardId: "expenses_1" }
  ],

  wishlist: [{ id: "wish_1", icon: "⌨️", name: "Mechanical Keyboard", url: "https://..." }],

  savingsAccounts: [
    {
      id: "sa_1",
      name: "TFSA",
      balance: 31000,
      defaultAllocated: 500,
      monthlyAllocations: { "2026-06": 600 }
    }
  ],

  goals: [
    { id: "goal_1", accountId: "sa_1", targetAmount: 50000, targetDate: "2027-12" }
  ],

  rules: [{ id: "r_1", pattern: "coffee", matchType: "contains", category: "Food & Drink" }],
  budgetAlerts: [{ id: "a_1", category: "Dining Out", threshold: 100 }],
  payStart: "2026-05-15"
}
```

---

## Key Formulas

```
Monthly income        = Σ incomeStreams (biweekly ? amount × 26/12 : amount)
Needs budget          = income × (allocation.needs / 100)
Wants budget          = income × (allocation.wants / 100)
Savings budget        = income × (allocation.savings / 100)
Bi-weekly wants       = wants budget / 2
Expense monthly amt   = biweekly ? amount × 2 : amount
Needs grand total     = Σ all expenseCard items (monthly)
CC utilization %      = balance / limit × 100
Effective allocation  = monthlyAllocations[YYYY-MM] ?? defaultAllocated
Goal progress %       = (account.balance / goal.targetAmount) × 100
Monthly needed        = (targetAmount - balance) / monthsRemaining

Actual Needs (current month) =
  Σ expenseCard items (monthly)
  + Needs subscriptions renewed this calendar month
  + Needs loan payments due this calendar month
  + Needs-tagged purchases (current period)

Actual Wants (current month) =
  Wants-tagged purchases (current period)
  + Wants subscriptions deducted this bi-weekly period
  + Wants loan payments due this bi-weekly period
  + Σ spendingHistory[].total for periods in this calendar month
```

---

## CSV Export / Import

### Export
- Header button (⬇ Export) downloads `penny-export-YYYY-MM-DD.csv`

### Import
- Header button (⬆ Import) opens file picker, prompts confirmation, replaces all state

### CSV Format (section-based)

```
SECTION:allocation
needs,wants,savings
50,30,20

SECTION:incomeStreams
id,name,amount,biweekly
income_1,Government,3200,true

SECTION:expenseCards
cardId,cardLabel,itemId,itemName,itemAmount,itemBiweekly
expenses_1,Housing,item_1,Rent,1900,false

SECTION:purchases
id,name,amount,category,cardId,budgetType
p_1,Coffee,5.50,Food & Drink,,wants
p_2,Groceries,87.40,Shopping,expenses_1,needs

SECTION:loans
id,name,remaining,original,paymentAmount,frequency,date,budgetType,cardId

SECTION:creditCards
id,name,balance,limit

SECTION:subscriptions
id,name,amount,frequency,date,category,budgetType,cardId

SECTION:wishlist
id,icon,name,url

SECTION:savingsAccounts
id,name,balance,defaultAllocated,monthlyAllocations
sa_1,TFSA,31000,500,"{""2026-06"":600}"

SECTION:goals
id,accountId,targetAmount,targetDate
goal_1,sa_1,50000,2027-12
```

See `docs/IMPORT_TEMPLATE.md` for full field documentation and `data/sample-data.csv` for a populated example.

---

## Modal System

```js
openModal(title, bodyHTML, onSaveCallback)
closeModal()
```

`bodyHTML` is built from `mField(label, id, type, value, placeholder, extraAttrs)` calls. Clicking outside or Cancel closes the modal.

---

## Baseline Values (May 2026)

| Item | Value |
|---|---|
| Car Loan | $15,172 remaining / $23,083 original |
| Student Loans | $9,641 / $11,338 |
| Phone Loan | $919.44 / $1,298.07 |
| TD Small CC (9602) | $828.94 / $1,000 limit |
| TD Big CC (1252) | $817.60 / $2,500 limit |
| WealthSimple CC (1083) | $231 / $2,000 limit |

---

## Features Shipped

| Feature | Phase | Status |
|---|---|---|
| Income streams (CRUD) | MVP | ✅ Done |
| 50/30/20 budget allocation | MVP | ✅ Done |
| Wants tracker + analytics | MVP | ✅ Done |
| Dynamic expense cards | MVP | ✅ Done |
| Loans (CRUD) | MVP | ✅ Done |
| Credit cards (CRUD) | MVP | ✅ Done |
| Subscriptions (CRUD) | MVP | ✅ Done |
| Wishlist (CRUD) | MVP | ✅ Done |
| CSV import/export | MVP | ✅ Done |
| Light/dark theme (Botanical) | MVP | ✅ Done |
| Spending analytics dashboard | MVP | ✅ Done |
| Budget vs. Actual panel | Phase 1 | ✅ Done |
| Savings accounts (balance + allocation) | Phase 1 | ✅ Done |
| Monthly allocation overrides | Phase 1 | ✅ Done |
| Savings Goal Tracker | Phase 1 | ✅ Done |
| Code modularisation (6-module split) | Phase 1 | ✅ Done |
| Mobile UX: stacked add forms + toggle switches | Phase 1 | ✅ Done |
| Mobile UX: subscription 3-row card layout | Phase 1 | ✅ Done |
| Unified button system (uppercase, shadow, tinted danger) | Phase 1 | ✅ Done |
| Purchase budget type tagging (Wants / Needs) | Phase 1 | ✅ Done |
| Reset Period relocated to payday anchor line | Phase 1 | ✅ Done |
| Consistent Edit/Delete labeled buttons across all sections | Phase 1 | ✅ Done |
| Net Worth Tracker (assets − liabilities, MoM trend chart) | Phase 2A | ✅ Done |
| Expense Schedule tab (3-month recurring bill forecast) | Phase 2B | ✅ Done |
| Funds Remaining card (manual available-balance tracker) | Phase 2 | ✅ Done |
| Fluid card typography — clamp() prevents border clipping | Phase 2 | ✅ Done |
| Toggle buttons moved to card-title row (.kpi-title-controls) | Phase 2 | ✅ Done |

## Possible Next Features

- Net worth tracker (assets − liabilities, monthly trend)
- Recurring expense calendar / 6-month forecast
- Month-over-month spending comparison charts
- Income variability tracking (bonuses, side gigs)
- Transaction rules engine (auto-categorise by keyword)

---

*Last updated: May 20, 2026 — Phase 2 additions: Funds Remaining card, fluid clamp() typography preventing border clipping, toggle buttons relocated to card-title row*
