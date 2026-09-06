# A Penny For Our Thoughts — User Guide

> A personal financial dashboard built on the **50/30/20 budget rule**.  
> Runs entirely in your browser — no account, no server, no internet required after the first load.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Income Streams](#income-streams)
4. [Budget Allocation](#budget-allocation)
5. [Wants Tracker (Envelope)](#wants-tracker-envelope)
6. [Envelope Forecast](#envelope-forecast)
7. [Spending Trend Chart](#spending-trend-chart)
8. [Budget vs. Actual](#budget-vs-actual)
9. [MoM Stat Deltas](#mom-stat-deltas)
10. [Spending Analytics](#spending-analytics)
11. [Expense Cards](#expense-cards)
12. [Recurring Schedule](#recurring-schedule)
13. [Loans](#loans)
14. [Credit Cards](#credit-cards)
15. [Savings Accounts & Goals](#savings-accounts--goals)
16. [Goals Timeline](#goals-timeline)
17. [Net Worth Tracker](#net-worth-tracker)
18. [Subscriptions](#subscriptions)
19. [Wishlist](#wishlist)
20. [Transaction Rules](#transaction-rules)
21. [Budget Alerts](#budget-alerts)
22. [Settings](#settings)
23. [Onboarding & What's New](#onboarding--whats-new)
24. [CSV Import & Export](#csv-import--export)
25. [Keyboard Shortcuts](#keyboard-shortcuts)
27. [Data & Privacy](#data--privacy)

---

## Getting Started

1. **Open the app** in any modern browser (Chrome, Safari, Firefox, Edge).
2. On first launch, the **Onboarding Wizard** walks you through adding your first income stream, setting your pay period anchor, and reviewing your 50/30/20 split.
3. If you have existing data, click **⬇ Import** in the header toolbar and select a `penny-*.csv` file.
4. All changes are saved automatically to your browser's `localStorage` — no internet connection needed after the initial load.

> **Tip:** Bookmark the app URL so you can return anytime. On mobile, use your browser's "Add to Home Screen" option for quick access.

---

## Dashboard Overview

The app has four tabs accessible via the bottom navigation bar (or keyboard shortcuts):

| Tab | Purpose |
|-----|---------|
| **Dashboard** | Main view — all financial sections from income to net worth |
| **Schedule** | 6-month bill forecast and interactive calendar |
| **Docs** | In-app user guide, release notes, FAQ, and CSV reference |
| **Settings** | Pay period, transaction rules, budget alerts, data management |

The **theme toggle** (🌙/☀️) in the top-right switches between dark and light mode. On mobile, use the bottom navigation bar — five tabs plus a **More** button for Docs and Settings.

---

## Income Streams

**Where:** Dashboard → *Income Streams* card

Your total monthly income is the foundation of all 50/30/20 calculations.

### Adding a Stream
1. Click **+ Add Stream**.
2. Enter a **name** (e.g. "Salary") and a **monthly amount**.
3. Toggle **Bi-weekly** if you receive this payment every two weeks — the amount is treated as a bi-weekly amount and the monthly total is calculated automatically.
4. Click **Save**.

### Editing / Deleting
- Click the **pencil icon** to edit a stream's name, amount, or frequency.
- Click the **× icon** to remove it.

The **Monthly Income** stat card at the top of the dashboard updates instantly and drives all budget calculations.

---

## Budget Allocation

**Where:** Dashboard → *Budget Allocation (50/30/20)* card

The default split is **50% Needs · 30% Wants · 20% Savings**. Click **Edit %** to adjust — percentages must always sum to 100%.

| Category | What it covers |
|----------|---------------|
| **Needs** | Fixed monthly expenses (rent, utilities, groceries, insurance) |
| **Wants** | Discretionary spending (dining, entertainment, shopping) |
| **Savings** | Long-term goals, investments, emergency fund |

The coloured segmented bar at the bottom of the card shows your current split visually.

---

## Wants Tracker (Envelope)

**Where:** Dashboard → *Wants Tracker* card

A **bi-weekly spending envelope** — at the start of each pay period you have a fresh budget. As you log purchases, the donut chart and remaining balance update in real time.

### Logging a Purchase
1. Enter the **item name**. If a matching Transaction Rule exists, the category auto-fills as you type.
2. Enter the **amount**.
3. Optionally change the **category** using the dropdown.
4. Click **+ Add** or press **Enter**.

### Closing the Period
Click **Close Period** to archive all current purchases to your Spending History and start a new envelope. Each archived period appears in the Spending Analytics section.

### Category Breakdown
Colour-coded chips below the donut chart show spending by category. Click the badge on any purchase row to reassign its category.

### Subscription & Loan Deductions
Subscriptions and loan payments that fall within the current bi-weekly period are automatically
deducted from the envelope, and appear as their own slices in the category donut.

**They count as "spent".** Every figure labelled *spent* — the hero caption, "Spent this period",
the donut total — is **purchases + subscriptions + loans**, because all three consume the same
envelope. So "spent" always agrees with "available to spend": if the app says you are over budget,
the spent figure will exceed the budget figure.

Two figures deliberately stay **purchases-only**, and say so on the card:
- **Daily average purchases** — a once-per-period loan payment would distort a daily spending pace.
- **Top category** — subscriptions and loans are not spending categories.

---

## Envelope Forecast

**Where:** Dashboard → *Wants Tracker* card → below the progress bar

When there is spending data for the current period (after day 0), a colour-coded forecast chip appears:

> "At this pace · **$X.XX** by end of period · N day(s) left · $Y.YY/day"

The forecast uses a linear extrapolation of your daily spend rate and projects it to the end of the 14-day period.

| Status | Colour | Meaning |
|--------|--------|---------|
| **On Track** | Green | Projected total is < 90% of your Wants budget |
| **Caution** | Amber | Projected total is 90–99% of your Wants budget |
| **Over Budget** | Red | Projected total meets or exceeds your Wants budget |

---

## Spending Trend Chart

**Where:** Dashboard → *6-Month Spending Trend* card (above Income Streams)

A stacked bar chart showing your actual Needs / Wants / Savings spending for each of the last 6 calendar months, with your total monthly income as a dashed reference line.

- **Needs** — red bars
- **Wants** — amber bars
- **Savings** — green bars
- **Income** — dashed line

The current month's bars are shown at full opacity; past months are dimmed. Hover any bar for a tooltip showing the exact dollar breakdown.

The chart is lazy-loaded — it renders when it scrolls into view.

---

## Budget vs. Actual

**Where:** Dashboard → *Budget vs. Actual* card

Answers **"Am I on track this month?"** by comparing your planned budget to real spending.

### Variance Cards
Three cards show the variance for Needs, Wants, and Savings:
- **Dollar variance** (positive = under budget, negative = over budget)
- **% of budget used**
- **Status**: ✅ On Track / ⚠ Caution (approaching limit) / 🔴 Over Budget

### Grouped Bar Chart
The `BudgetVsActualChart` shows Budgeted vs. Actual side-by-side for each category. The actual bars change colour — green when under, amber near limit, red when over.

---

## MoM Stat Deltas

**Where:** Dashboard → stat cards (Needs Budget, Wants Budget, Net Worth)

Each stat card displays a small **▲/▼ delta chip** showing the change versus the prior calendar month:

- **Needs / Wants** — positive delta (spent more) = **red**; negative (spent less) = **green**
- **Net Worth** — positive delta (grew) = **green**; negative (shrank) = **red**

The delta is only shown when there is data for the prior month (no chip appears for the first month of tracking).

---

## Spending Analytics

**Where:** Dashboard → *Spending Analytics* card (collapsible)

Visualise your historical spending patterns across all archived bi-weekly periods.

### Filters
| Filter | Effect |
|--------|--------|
| **Start Date** | Show only periods on or after this date |
| **End Date** | Show only periods on or before this date |
| **Search** | Filter by purchase name keyword |

### Charts
- **Spending Over Time** — Line chart of total spend per archived period.
- **Top Categories** — Horizontal bar of top categories by spend.
- **Monthly Trends** — 6-month bar chart of Wants spending with the budget reference line; MoM insights auto-generated below.

### History List
Each archived period shows its date, total, and a category-breakdown chip strip. Click any period header to expand it and see the full purchase list.

**Editing a category retroactively:** Every purchase row in an expanded period shows a ✏ pencil button (appears on hover). Clicking it replaces the category badge with an inline dropdown populated from your current spending categories. Select a new category to save immediately, or press **Escape** / click away to cancel. The period total is never affected — only the tag changes.

> **Orphaned categories:** If a category was deleted after the purchase was archived, its original name is still shown as the first option in the dropdown so you can see it before reassigning.

---

## Expense Cards

**Where:** Dashboard → *Expense Cards* card

Model your fixed monthly bills by payment method. Each card (e.g. "BMO Debit", "Visa") holds line items for individual recurring bills.

### Adding a Card
1. Click **+ Add Card** and give it a label.

### Adding Items to a Card
1. Expand a card and click **+ Add Item**.
2. Enter the **name**, **amount**, and optionally a **due day** (1–31).
3. Toggle **Bi-weekly** for expenses charged every two weeks.

The card footer shows the **monthly total** for all its items.

---

## Recurring Schedule

**Where:** Schedule tab

A 6-month forecast of all expense card items and subscriptions, with two view modes:

| View | What you see |
|------|-------------|
| **List** | Items sorted by due date; 6 month cards at top; forecast bar chart |
| **Calendar** | Full month grid with bill badges on due dates |

**Navigation:** Use ◀ Prev / Next ▶ to browse months. Click any of the 6-month summary cards to jump directly to that month.

**Expensive days** are highlighted in amber when a day's total exceeds 12% of the Needs budget.

---

## Loans

**Where:** Dashboard → *Loans* card

Track outstanding loan balances for payoff planning.

### Adding a Loan
1. Click **+ Add Loan**.
2. Enter the **name**, **remaining balance**, **original balance**, **payment amount**, and **frequency**.

The payoff progress bar shows how much of each loan has been paid off. All loan balances feed into **Net Worth** as liabilities.

---

## Credit Cards

**Where:** Dashboard → *Credit Cards* card

Track balances and credit utilisation.

### Adding a Card
1. Click **+ Add Credit Card**.
2. Enter the **name**, **current balance**, and **credit limit**.

| Utilisation | Bar Colour |
|-------------|-----------|
| < 30% | Green |
| 30–50% | Amber |
| > 50% | Red |

A 30% utilisation threshold marker is shown on each bar. Balances feed into **Net Worth** as liabilities.

---

## Savings Accounts & Goals

**Where:** Dashboard → *Savings Accounts* and *Savings Goals* cards

### Savings Accounts
Each account tracks:
- **Balance** — current total in the account
- **Monthly Allocation** — your default monthly contribution

#### Adding an Account
1. Click **+ Add Account**.
2. Enter the **name**, **balance**, and **default monthly allocation**.

#### Month-Specific Override
Use **Allocate Savings** to set a different contribution amount for the current month only — useful for months where you contribute more or less. Only delta months are stored; other months use the default.

### Savings Goals
Link a goal to any savings account with a **target amount** and **target date** (month/year).

#### Adding a Goal
1. Click **+ Add Goal** in the Savings Goals card.
2. Select the **account**, enter a **target amount** and **target date**.

Each goal shows:
- Progress bar (% of target reached)
- Monthly savings needed to hit the deadline
- **Status**: ✅ On Track / ⚠ Caution / 🔴 Off Track / ✔ Complete / ✘ Missed

Status is based on whether your current month's allocation meets the required monthly savings needed. Caution = ≥ 80% of needed.

---

## Goals Timeline

**Where:** Dashboard → *Goals Timeline* card (below Savings Goals)

A ranked projection card that answers **"When will each goal be complete?"**

Each goal row shows:
- Account name and target amount
- Progress bar
- **Target date** and **Projected completion date** (based on current allocation)
- **Months late** — how many months past the deadline the projection falls (shown in red if late)
- Status badge: On Track / Caution / Off Track / Complete / Missed

Goals are sorted: active goals first (on-track before caution/off-track), then complete, then missed.

---

## Net Worth Tracker

**Where:** Dashboard → *Net Worth* card

**Net Worth = Total Assets − Total Liabilities**

| Assets (auto-tracked) | Liabilities (auto-tracked) |
|-----------------------|---------------------------|
| Savings account balances | Loan remaining balances |
| Manual assets (investments, property, vehicles, other) | Credit card balances |

### Adding a Manual Asset
1. In the Net Worth card, find the asset category (Investments, Real Estate, Vehicles, Other).
2. Click **+ Add** for that category.
3. Enter the **name** and **current value**.

### Monthly Snapshot History
The line chart plots net worth month-by-month (up to 24 months). A snapshot is recorded automatically on each app load. Click **Record Snapshot** to save one manually.

The MoM delta on the Net Worth stat card shows this month's change vs. last month's snapshot.

---

## Subscriptions

**Where:** Dashboard → *Subscriptions* card

Track recurring service fees (streaming, software, memberships).

### Adding a Subscription
1. Click **+ Add Subscription**.
2. Enter the **name**, **amount**, **frequency** (weekly / bi-weekly / monthly / quarterly / yearly), **next renewal date**, **category**, and **budget type** (Needs or Wants).

### How Subscriptions Affect Your Budget
- **Wants** subs renewing in the current bi-weekly period are deducted from the Wants envelope.
- **Needs** subs and loans are deducted from the **Needs** envelope the same way — whichever bucket
  you assign a bill to is the envelope it comes out of.
- **Needs** subs renewing this calendar month are included in Actual Needs in the Budget vs. Actual card.
- All subscriptions appear in the **Schedule** tab on their renewal date.

### Stats Header
The card header shows: **Monthly Cost** / **Annual Total** / **% of Wants Budget** — with a colour-coded impact bar.

A renewal alert banner appears for any subscription renewing within 7 days.

---

## Wishlist

**Where:** Dashboard → *Wishlist* card

A simple list of future purchases to aspire to. Each item has an **emoji icon**, **name**, and optional **URL**.

Click **+ Add Item** to add. Items can be edited or deleted inline. No budget calculations — purely a reference list.

---

## Transaction Rules

**Where:** Settings tab → *Transaction Rules*

Rules auto-categorise purchases in the Wants Tracker as you type the name.

### Match Types
| Type | Behaviour |
|------|-----------|
| **Contains** | Matches if the pattern appears anywhere in the name |
| **Starts With** | Matches only at the beginning of the name |
| **Exact** | The entire name must match exactly (case-insensitive) |

### Adding a Rule
1. Click **+ Add Rule**.
2. Enter a **pattern**, choose a **match type**, and select a **category**.
3. Click **Save**.

Rules are evaluated in order — the first match wins. Use the **Test** field to verify a rule before saving.

### Re-Apply to Current Purchases
Click **Re-apply Rules** to retroactively categorise all purchases in the current period.

---

## Budget Alerts

**Where:** Settings tab → *Budget Alerts*

Set per-category spending thresholds. When spending in a category exceeds the threshold during the current period, an alert chip appears at the top of the Wants card.

### Adding an Alert
1. Click **+ Add Alert**.
2. Select a **category** and enter a **threshold** amount.

The alert chip shows: "⚠ Food & Drink: $62.50 / $50.00" in real time as purchases are added.

---

## Settings

**Where:** Settings tab

| Section | Purpose |
|---------|---------|
| **Pay Period Anchor** | Set a recent pay date; bi-weekly cycles repeat every 14 days from this anchor |
| **Chequing Balance** | Optional manual balance for the "Funds Remaining" hint on Expense Cards |
| **Transaction Rules** | Auto-categorise purchases (see above) |
| **Budget Alerts** | Per-category spending alerts (see above) |
| **Danger Zone** | Clear all data — irreversible; export a backup first |

---

## Onboarding & What's New

### First-Run Wizard
On your very first visit the app shows a 4-step guided setup:
1. **Welcome** — app value proposition
2. **Income** — add your first income stream
3. **Pay Period** — set your bi-weekly anchor date
4. **Budget Split** — review and optionally customise the 50/30/20 percentages

Skip is available on any step after the first. Once completed (or skipped), the wizard never shows again.

### What's New Banner
When the app version changes, a dismissible banner appears at the top of the dashboard listing the key highlights for returning users. Click **×** to dismiss.

---

## CSV Import & Export

Data is always stored locally, but CSV lets you **back up**, **restore**, and **transfer** your budget configuration.

### Exporting
Click **⬆ Export** in the header toolbar. A file named `penny-export.csv` is downloaded.

The file contains every section of your data in a structured, human-readable format you can open in Excel or Google Sheets.

### Importing
1. Click **⬇ Import** in the header toolbar.
2. Select a `penny-*.csv` file.
3. Confirm the overwrite prompt — import replaces all current data.

> ⚠️ **Warning:** Export a backup before importing. This cannot be undone.

### CSV Format

The file uses `SECTION:<name>` header rows to separate data types:

```
SECTION:meta
key,value
payStart,2026-05-01
exportedAt,2026-05-22T10:00:00.000Z

SECTION:allocation
needs,wants,savings
50,30,20

SECTION:incomeStreams
id,name,amount,biweekly
abc123,Salary,3000,false
...
```

All 17 sections: `meta`, `allocation`, `budgetDisplayMode`, `incomeStreams`, `expenseCards`, `loans`, `creditCards`, `savingsAccounts`, `purchases`, `spendingHistory`, `goals`, `assets`, `netWorthHistory`, `subscriptions`, `wishlist`, `rules`, `budgetAlerts`.

---

## Keyboard Shortcuts

Press **`?`** anywhere in the app (when not typing) to open the shortcuts panel. All shortcuts are disabled inside inputs, selects, and textareas.

### Navigation
| Shortcut | Action |
|----------|--------|
| `1` | Switch to Dashboard tab |
| `2` | Switch to Schedule tab |
| `3` | Switch to Docs tab |
| `4` | Switch to Settings tab |

### Actions
| Shortcut | Action |
|----------|--------|
| `E` | Export CSV |
| `T` | Toggle dark / light theme |
| `?` | Open / close the keyboard shortcuts panel |

### Modals
| Shortcut | Action |
|----------|--------|
| `Escape` | Close open modal or shortcuts panel |

> **Mobile:** Keyboard shortcuts are hidden on mobile — use the bottom navigation bar instead. (Swipe-to-change-tab was removed in v2.47.2: it competed with scrolling wide tables sideways.)

---

## Installing to Your Home Screen

Penny can be installed as an app (v2.47.0):

- **iPhone / iPad** — open it in Safari, tap **Share**, then **Add to Home Screen**.
- **Android** — Chrome shows an install prompt; or use the browser menu's **Install app**.

It then launches full-screen with no browser chrome. Note it still needs a network connection —
installing does not make Penny work offline.

---

## Toast Notifications

Every save, add, and delete action shows a brief **toast notification** in the bottom-right corner. Toasts are colour-coded:

- 🟢 **Green** — successful action (added, saved, updated)
- 🔴 **Red** — destructive action (deleted)
- 🔵 **Blue** — informational message (storage full, etc.)

Toasts dismiss automatically after 2.5 seconds and are announced to screen readers via `aria-live`.

---

## Data & Privacy

- **All data is stored locally** in your browser's `localStorage` under the key `penny_state_v2`.
- **Nothing is sent to any server.** The app works completely offline.
- **Clearing browser data** (cookies/storage) will delete all your dashboard data — export a CSV backup regularly.
- **Incognito / private mode** does not persist localStorage — do not use private browsing if you want data to survive a tab close.

### Backup Recommendations
- Export a CSV after any significant data entry session.
- Store backups in a cloud folder (iCloud Drive, Google Drive, Dropbox) for safety.

### Schema Version
The app uses `penny_state_v2` as the localStorage key. Older data stored under `penny_state_v1` is automatically migrated on first load. Unknown sections in imported CSV files are silently ignored for forward-compatibility.

---

*Last updated: May 2026 · Version 1.6.0 · Vue 3 + TypeScript + Pinia*
