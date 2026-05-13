# A Penny For Our Thoughts — Project Guide

---

## AI Handoff Prompt

> Copy and paste this block into any AI assistant to fully resume work on this project.

```
You are continuing development of "A Penny For Our Thoughts" — a personal budget tracking web dashboard for a user named Brahim.

**Project location:** /Users/brahim/Documents/Claude/Projects/A Penny For Our Thoughts/
The entry point is index.html. JS and CSS live under src/. All files must stay in the same repo.

**Tech stack:** Vanilla HTML/CSS/JavaScript, single-page application, no build tools or frameworks. Chart.js 4.4.1 loaded from Cloudflare CDN. All data persisted in localStorage under the key `penny_state_v2`.

**Budget rules (50/30/20):** The user follows a 50% Needs / 30% Wants / 20% Savings rule. These percentages are user-editable. All income calculations derive from the total of all income streams.

**Income:** Multiple income streams — each has { id, name, amount, biweekly }. Monthly income = sum of all streams (biweekly ones × 26 / 12). The dashboard shows this total in the "Total Monthly Income" stat card.

**Theme:** Light/dark theme toggle in header (🌙/☀️ button). User preference persisted in localStorage under key `penny_theme`.

**Mobile Responsiveness:** Fully responsive with breakpoints at 1024px, 768px, 540px, 380px.

**Architecture:** The app is entirely driven by a single `state` object loaded from localStorage. Every render function reads from `state`. Saving always calls `saveToStorage()` then the relevant `render*()` function(s). IDs are stable random strings from `genId()`.

**State schema (penny_state_v2):**
- `allocation` (object): `{ needs: 50, wants: 30, savings: 20 }` — percentages, must sum to 100
- `budgetDisplayMode` (object): `{ needs: 'monthly', wants: 'monthly', savings: 'monthly' }`
- `incomeStreams` (array): `[{ id, name, amount, biweekly }]`
- `expenseCards` (array): `[{ id, label, items: [{ id, name, amount, biweekly }] }]`
- `purchases` (array): `[{ id, name, amount }]` — current bi-weekly wants period
- `spendingHistory` (array): `[{ id, date, label, total, items: [{ id, name, amount }] }]`
- `loans` (array): `[{ id, name, remaining, original }]`
- `creditCards` (array): `[{ id, name, balance, limit }]`
- `subscriptions` (array): `[{ id, name, date }]` — date is YYYY-MM-DD
- `wishlist` (array): `[{ id, icon, name, url }]`
- `savingsAccounts` (array): `[{ id, name, balance, defaultAllocated, monthlyAllocations: {} }]`
  - `balance`: total current balance in the account
  - `defaultAllocated`: default monthly contribution from the savings budget
  - `monthlyAllocations`: sparse map of monthly overrides e.g. `{ "2026-06": 200 }`
- `goals` (array): `[{ id, accountId, targetAmount, targetDate }]`
  - `accountId`: references a savings account id
  - `targetDate`: YYYY-MM format (e.g. "2027-12")

**Key utility functions:**
- `getAllocationForMonth(account, year, month)` — returns the effective allocation for a given month (override or default)
- `getGoalProgress(goal)` — returns `{ accountName, currentAmount, targetAmount, progressPercent, monthsRemaining, monthlySavingsNeeded, status, isOnTrack }`
- `calculateMonthsBetween(startYYYY-MM, endYYYY-MM)` — returns integer month difference
- `getTotalMonthlyIncome()`, `getAlloc()`, `fmt(n)`, `genId()`

**State migration (automatic in loadFromStorage):**
- Old `state.gov` → one incomeStream entry
- Old `state.expenses` keyed object → expenseCards array
- Old `savingsAccounts[].allocated` → `defaultAllocated` (balance defaults to 0)
- Missing `state.goals` → initialized to []

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
│   ├── app.js                  ← All JS: state, rendering, CRUD, persistence (~2,400 lines)
│   └── styles.css              ← All styling and CSS variables
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

## CSS Variables

| Variable | Value | Use |
|---|---|---|
| `--bg` | `#0f1117` | Page background |
| `--surface` | `#1a1d27` | Card backgrounds |
| `--surface2` | `#22263a` | Input backgrounds, list items |
| `--accent` | `#6c63ff` | Primary purple — active states, buttons |
| `--accent2` | `#00d4aa` | Teal — positive values, savings |
| `--danger` | `#ff4d6d` | Red — over budget, delete |
| `--warn` | `#ffa63d` | Amber — warnings, savings target |
| `--text` | `#e8eaf0` | Primary text |
| `--muted` | `#7b8199` | Secondary text, labels |
| `--border` | `#2e3148` | Card/input borders |
| `--radius` | `12px` | Border radius for cards |

---

## Dashboard Sections

### Income Overview
- Four stat cards: Total Monthly Income, Needs Budget, Wants Budget, Savings Budget
- Each budget card has a toggle (Monthly / Bi-weekly)
- Budget allocation bar showing visual split of Needs / Wants / Savings
- Budget vs. Actual summary panel — compares budgeted vs. actual spending for Needs, Wants, and Savings (On Track / Over indicator per category)

### Income Streams (CRUD)
- Add multiple income streams — each has a name, amount, and a bi-weekly checkbox
- Bi-weekly streams: monthly value = amount × 26 / 12
- Total Monthly Income = sum of all streams' monthly values

### Wants Tracker
- Bi-weekly envelope = (monthly wants budget) / 2
- Donut chart showing spent vs. remaining (amber at 80%, red at 100%)
- Purchase list with add/delete per item and full period reset
- **Reset Period:** Archives current purchases to `spendingHistory` before clearing
- Analytics dashboard (collapsible): date range + name filters, line chart, category bar chart, period history

### Monthly Expenses (Needs)
- Fully dynamic payment cards — user adds/renames/deletes cards
- Each card has items with name, amount, bi-weekly toggle
- Summary: grand total and Needs budget remaining

### Budget vs. Actual
- Side-by-side comparison of budgeted vs. actual for Needs, Wants, Savings
- Status chips: On Track (green) / Over (red)
- Savings actual = total monthly income allocated to savings accounts this month

### Loans
- Progress bar per loan, colour-coded by % remaining (red >70%, amber >40%, teal otherwise)
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
- Full CRUD: inline add, edit modal, delete

### Wishlist
- Item cards with emoji icon, name, optional clickable URL
- Full CRUD: inline add, edit modal, delete

---

## State Schema

```js
{
  allocation: { needs: 50, wants: 30, savings: 20 },
  budgetDisplayMode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },

  incomeStreams: [
    { id: "inc_1", name: "Full-Time Salary", amount: 2500, biweekly: false },
    { id: "inc_2", name: "Freelance Work", amount: 600, biweekly: true }
  ],

  expenseCards: [
    {
      id: "expenses_1",
      label: "Housing",
      items: [
        { id: "item_1", name: "Rent", amount: 1200, biweekly: false }
      ]
    }
  ],

  purchases: [{ id: "p_1", name: "Coffee", amount: 5.50 }],

  spendingHistory: [
    {
      id: "h_1",
      date: "2026-05-01",
      label: "May 1-14 Period",
      total: 487.23,
      items: [{ id: "i_1", name: "Dining Out", amount: 120 }]
    }
  ],

  loans: [{ id: "loan_1", name: "Car Loan", remaining: 15172, original: 23083 }],
  creditCards: [{ id: "cc_1", name: "TD Small CC (9602)", balance: 828.94, limit: 1000 }],
  subscriptions: [{ id: "sub_1", name: "Netflix", date: "2026-09-13" }],
  wishlist: [{ id: "wish_1", icon: "💻", name: "MacBook Pro", url: "https://..." }],

  savingsAccounts: [
    {
      id: "sa_1",
      name: "TFSA",
      balance: 25000,
      defaultAllocated: 135,
      monthlyAllocations: { "2026-06": 200 }
    }
  ],

  goals: [
    { id: "goal_1", accountId: "sa_1", targetAmount: 50000, targetDate: "2027-12" }
  ]
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
income_1,Full-Time Salary,2500,false

SECTION:expenseCards
cardId,cardLabel,itemId,itemName,itemAmount,itemBiweekly
expenses_1,Housing,item_1,Rent,1200,false
expenses_1,Housing,item_2,Internet,80,false

SECTION:loans
id,name,remaining,original

SECTION:creditCards
id,name,balance,limit

SECTION:subscriptions
id,name,date

SECTION:wishlist
id,icon,name,url

SECTION:savingsAccounts
id,name,balance,defaultAllocated,monthlyAllocations
sa_1,TFSA,25000,135,"{""2026-06"":200}"

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
| Light/dark theme | MVP | ✅ Done |
| Spending analytics dashboard | MVP | ✅ Done |
| Budget vs. Actual panel | Phase 1 | ✅ Done |
| Savings accounts (balance + allocation) | Phase 1 | ✅ Done |
| Monthly allocation overrides | Phase 1 | ✅ Done |
| Savings Goal Tracker | Phase 1 | ✅ Done |

## Possible Next Features

- Net worth tracker (assets − liabilities, monthly trend)
- Recurring expense calendar / 6-month forecast
- Month-over-month spending comparison charts
- Subscription budget integration (deduct from Wants)
- Income variability tracking (bonuses, side gigs)
- Code modularization (split app.js into state/render/utils modules)

---

*Last updated: May 12, 2026 — Phase 1 complete: Budget vs. Actual, Savings Accounts Enhancement, Savings Goal Tracker*
