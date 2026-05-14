# A Penny For Our Thoughts — User Guide

> A personal financial dashboard built on the **50/30/20 budget rule**.  
> Runs entirely in your browser — no account, no server, no internet required after the first load.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Income Setup](#income-setup)
4. [Budget Allocation](#budget-allocation)
5. [Wants Tracker (Envelope)](#wants-tracker-envelope)
6. [Spending Categories & Rules](#spending-categories--rules)
7. [Budget Alerts](#budget-alerts)
8. [Budget vs. Actual](#budget-vs-actual)
9. [Spending Analytics](#spending-analytics)
10. [Expense Cards](#expense-cards)
11. [Expense Schedule](#expense-schedule)
12. [Loans](#loans)
13. [Credit Cards](#credit-cards)
14. [Savings Accounts & Goals](#savings-accounts--goals)
15. [Net Worth Tracker](#net-worth-tracker)
16. [Subscriptions](#subscriptions)
17. [Wishlist](#wishlist)
18. [CSV Import & Export](#csv-import--export)
19. [Keyboard Shortcuts](#keyboard-shortcuts)
20. [Data & Privacy](#data--privacy)

---

## Getting Started

1. **Open `index.html`** in any modern browser (Chrome, Safari, Firefox, Edge).
2. On first load, the app shows sample data so you can see it in action immediately.
3. **Import your own data** using the [CSV Import](#csv-import--export) feature, or **start fresh** using the *Clear All Data* button in the header.
4. All changes are saved automatically to your browser's `localStorage` — no internet connection needed.

> **Tip:** Bookmark the file path so you can re-open the dashboard anytime.

---

## Dashboard Overview

The dashboard has five tabs:

| Tab | Purpose |
|-----|---------|
| **Dashboard** | Main view — income, wants, expenses, loans, credit cards, savings, goals, net worth, subscriptions, wishlist |
| **Budget vs. Actual** | Compare planned vs. real spending by month |
| **Analytics** | Spending history with charts and filters |
| **Schedule** | Monthly bill forecast calendar |
| **Rules** | Auto-category rules and budget alerts |

The **theme toggle** (🌙/☀️) in the top-right switches between dark and light mode.

---

## Income Setup

**Where:** Dashboard → *Income* card

Your total monthly income is the foundation of the 50/30/20 split.  
You can have multiple income streams (salary, side gig, government benefits, etc.).

### Adding a Stream

1. Type the **name** and **monthly amount** into the inline form at the bottom of the Income card.
2. Check **Bi-weekly** if you receive this payment every two weeks — the app doubles it for the monthly total.
3. Click **+ Add**.

### Editing / Deleting

- Click the **pencil icon** next to a stream to edit its name, amount, and frequency.
- Click the **× icon** to remove it.

### Monthly vs Bi-weekly Display

Each budget category (Needs, Wants, Savings) has a **toggle button** in the Income card. Switching to *Bi-weekly* shows you how much of each envelope is filled per pay period — useful for cash-flow planning.

---

## Budget Allocation

**Where:** Dashboard → *Income* card → *Edit Allocation* button

The default split is **50% Needs · 30% Wants · 20% Savings**.  
You can adjust these percentages freely — they must sum to exactly 100%.

| Category | What it covers |
|----------|---------------|
| **Needs** | Fixed monthly expenses (rent, utilities, groceries, insurance) |
| **Wants** | Discretionary spending (dining, entertainment, shopping) |
| **Savings** | Long-term goals, investments, emergency fund |

The income card displays how many dollars are allocated to each bucket this month.

---

## Wants Tracker (Envelope)

**Where:** Dashboard → *Wants* card

The Wants tracker is a **bi-weekly spending envelope**. At the start of each pay period you have a fresh budget. As you log purchases, the donut chart and remaining balance update in real time.

### Logging a Purchase

1. Type the **item name** in the purchase input. If a matching [Spending Rule](#spending-categories--rules) exists, the category preview appears below the field automatically.
2. Enter the **amount**.
3. Select a **category** (or let rules assign one automatically).
4. Click **+ Add** or press **Enter**.

### Resetting the Envelope

Click **Reset** to archive the current period's purchases to your [Spending History](#spending-analytics) and start fresh. Each archived period appears in the Analytics tab.

### Category Breakdown

When you have purchases, a colour-coded breakdown by category appears below the purchase list. You can change any purchase's category inline using the dropdown badge on each row.

---

## Spending Categories & Rules

**Where:** Dashboard → *Spending Rules & Budget Alerts* card (left panel)  
**or** → *Rules* tab

The **Transaction Rules Engine (TRE)** automatically assigns categories to purchases as you type, based on keyword rules you define.

### Match Types

| Type | Behaviour |
|------|-----------|
| **Contains** | Matches if the rule pattern appears anywhere in the purchase name (e.g. `mcdonald` matches `"McDonald's"`) |
| **Starts With** | Only matches at the start of the name (e.g. `tim` matches `"Tim Hortons"` but not `"Vitamin Tim"`) |
| **Exact** | The entire name must match the pattern exactly (case-insensitive) |

### Adding a Rule

1. Click **+ Add Rule** in the Spending Rules panel.
2. Enter a **pattern** (keyword or phrase), choose a **match type**, and select a **category**.
3. Click **Save**.

### Rule Priority

Rules are evaluated **in order, top to bottom**. The first match wins. Drag to reorder (future feature) or delete and re-add to change priority.

### Re-Apply to Current Purchases

After adding new rules, click **Re-apply Rules** to retroactively categorise purchases in the current period.

### Available Categories

| Category | Colour |
|----------|--------|
| Food & Drink | Orange |
| Groceries | Teal |
| Entertainment | Purple |
| Shopping | Blue |
| Health & Fitness | Green |
| Transportation | Yellow |
| Other | Grey |

---

## Budget Alerts

**Where:** Dashboard → *Spending Rules & Budget Alerts* card (right panel)

Set **per-category spending thresholds**. When your spending in a category exceeds the threshold during the current period, an alert chip appears at the top of the Wants card.

### Adding an Alert

1. Click **+ Add Alert**.
2. Select a **category** and enter a **threshold amount**.
3. Click **Save**.

Alerts are checked in real time as purchases are added. The ⚠ chip shows how much you've spent versus the threshold (e.g. "⚠ Food & Drink: $62.50 > $50.00").

---

## Budget vs. Actual

**Where:** Budget vs. Actual tab

This section answers **"Am I on track this month?"** by comparing your planned budget to real spending.

### Reading the Chart

The grouped bar chart shows **Budgeted** (purple) vs. **Actual** (teal) for Needs, Wants, and Savings.

### Variance Cards

Below the chart, three variance cards show:
- **Dollar variance** (+ = under budget, − = over budget)
- **% of budget used**
- **Status**: ✅ On Track / ⚠ Caution (100–110%) / 🔴 Over (>110%)

### Month Selector

Use the month/year picker to review any historical month.

---

## Spending Analytics

**Where:** Analytics tab

Visualise your historical spending patterns.

### Filters

| Filter | Effect |
|--------|--------|
| **Start Date** | Show only periods on or after this date |
| **End Date** | Show only periods on or before this date |
| **Search** | Filter by purchase name keyword |

### Charts

- **Spending Over Time** — Line chart of total spending per archived period.
- **Top Categories** — Horizontal bar chart of top-10 categories by spend.

### History List

Every archived period is listed with:
- Date range and total spend
- Individual purchases (click the pencil icon to edit a historical purchase)

---

## Expense Cards

**Where:** Dashboard → *Monthly Fixed Expenses* card

Expense cards represent your payment methods or spending accounts (e.g. TD Debit, WS Credit Card). Each card contains **line items** — individual recurring bills.

### Adding an Expense Card

1. Click **+ Add Card**.
2. Give it a label (e.g. "BMO Debit").
3. Click **Save**.

### Adding Items to a Card

1. Expand a card and click **+ Add Item**.
2. Enter the **name**, **amount**, and optionally a **due day** (1–31).
3. Check **Bi-weekly** if the item occurs every two weeks (e.g. a bi-weekly insurance payment).

The card footer shows the **monthly total** for all items on that card.

### Deleting Cards / Items

- Click **× Delete Card** to remove the card and all its items.
- Click the **× icon** next to an item to remove just that item.

---

## Expense Schedule

**Where:** Schedule tab

The Schedule tab shows a **monthly bill forecast** — all expense card items and subscriptions that are due in the selected month, sorted by due date.

### Navigation

Use the **◀ Prev** and **Next ▶** buttons to browse months. The schedule shows:

- **Dated bills** — sorted by due day, with a progress bar showing how far through the month each bill is.
- **Undated bills** — items with no specific due day appear in a separate section.
- **Summary bar** — total bills for the month, budgeted Needs amount, and the variance (surplus or deficit).

> **Tip:** Set a due day on expense items to get a more accurate cashflow calendar.

---

## Loans

**Where:** Dashboard → *Loans* card

Track outstanding loan balances for payoff planning.

### Adding a Loan

1. Click **+ Add Loan**.
2. Enter the **loan name**, **remaining balance**, and **original balance**.
3. Click **Save**.

The payoff progress bar shows how much of each loan has been paid off.  
The total remaining balance rolls up into your **Net Worth** as a liability.

---

## Credit Cards

**Where:** Dashboard → *Credit Cards* card

Track balances and utilisation for each credit card.

### Adding a Card

1. Click **+ Add Credit Card**.
2. Enter the **card name**, **current balance**, and **credit limit**.
3. Click **Save**.

The utilisation bar changes colour based on usage:
- **Green** → < 30% utilised
- **Amber** → 30–50% utilised
- **Red** → > 50% utilised

The stacked bar chart shows all cards side-by-side.  
Credit card balances also flow into your **Net Worth** as liabilities.

---

## Savings Accounts & Goals

**Where:** Dashboard → *Savings* card

### Savings Accounts

Each account tracks:
- **Current balance** — what you have saved right now
- **Monthly allocation** — how much you set aside per month (default or month-specific override)

#### Adding an Account

1. Click **+ Add Account**.
2. Enter the **name**, **balance**, and **default monthly allocation**.
3. Click **Save**.

#### Month-Specific Allocation

Inside each account's edit modal you can enter an **override allocation** for the current month — useful for months where you contribute more or less.

### Savings Goals

For any savings account you can set a goal with a **target amount** and **target date** (month/year).

#### Adding a Goal

1. Click **+ Add Goal** in the Savings section.
2. Select the **account**, enter a **target amount**, and pick a **target date**.
3. Click **Save**.

Each goal card shows:
- **Progress bar** — % of target reached
- **Monthly savings needed** — how much you must save each month to hit the goal on time
- **Time remaining** — months until the deadline
- **Status**: ✅ On Track / ⚠ Caution / 🔴 Off Track / ✔ Complete / ✘ Missed

---

## Net Worth Tracker

**Where:** Dashboard → *Net Worth* card

Net Worth = **Total Assets** − **Total Liabilities**

| Assets (auto-tracked) | Liabilities (auto-tracked) |
|-----------------------|---------------------------|
| Savings account balances | Loan remaining balances |
| Manual assets (investments, property, vehicles) | Credit card balances |

### Adding a Manual Asset

1. Scroll to the Net Worth card.
2. Find the asset category (Investments, Real Estate, Vehicles, Other).
3. Click **+ Add** for that category.
4. Enter the **name** and **current value**.

### Historical Chart

The line chart plots net worth month-by-month (up to 24 months). A snapshot is recorded automatically each time you open the app.

---

## Subscriptions

**Where:** Dashboard → *Subscriptions* card

Track recurring service fees (streaming, software, utilities).

### Adding a Subscription

1. Click **+ Add Subscription**.
2. Enter:
   - **Name** — e.g. "Netflix"
   - **Amount** — cost per billing cycle
   - **Frequency** — Monthly, Quarterly, or Annual
   - **Next renewal date** — when the next charge hits
   - **Category** — for spending classification
   - **Budget Type** — Wants or Needs

### How Subscriptions Affect Your Budget

- **Wants subscriptions** that renew during your current bi-weekly period are automatically deducted from your Wants envelope.
- **Needs subscriptions** that renew this calendar month are added to your Actual Needs in the Budget vs. Actual view.
- All subscriptions appear in the **Schedule** tab on their renewal date.

### Sub-Period Deductions

The Wants card shows a "Sub deductions this period" line itemising which subscriptions renewed and their amounts.

---

## Wishlist

**Where:** Dashboard → *Wishlist* card

Keep track of items you want to purchase in the future. Each item has:
- **Icon** (emoji)
- **Name** (description)
- **URL** (optional link to the product page)

Click **+ Add Item** to add a new entry. Items can be edited or deleted inline.

---

## CSV Import & Export

Data is always stored locally, but CSV lets you **back up**, **restore**, and **share** your budget configuration.

### Exporting

Click the **Export CSV** button in the header. A file named `penny-YYYY-MM-DD.csv` is downloaded.

The file contains every section of your data in a structured, human-readable format you can open in Excel or Google Sheets.

### Importing

1. Click **Import CSV** in the header.
2. Select a previously exported `penny-*.csv` file.
3. Confirm the overwrite prompt.

> ⚠️ **Warning:** Import replaces all current data. Export first if you want to keep a backup.

### CSV Format

The file uses `SECTION:<name>` header rows to separate data types:

```
SECTION:meta
key,value
exported,2026-05-13

SECTION:allocation
needs,wants,savings
50,30,20

SECTION:incomeStreams
id,name,amount,biweekly
abc123,Salary,3000,false
...
```

All sections: `meta`, `allocation`, `budgetDisplayMode`, `incomeStreams`, `expenseCards`, `loans`, `creditCards`, `savingsAccounts`, `purchases`, `spendingHistory`, `goals`, `assets`, `netWorthHistory`, `subscriptions`, `wishlist`, `rules`, `budgetAlerts`.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + 1` | Switch to Dashboard tab |
| `Alt + 2` | Switch to Budget vs. Actual tab |
| `Alt + 3` | Switch to Analytics tab |
| `Alt + 4` | Switch to Schedule tab |
| `Alt + 5` | Switch to Rules tab |
| `Escape` | Close open modal |

---

## Data & Privacy

- **All data is stored locally** in your browser's `localStorage` under the key `penny_state_v2`.
- **Nothing is sent to any server.** The app works completely offline.
- **Clearing browser data** (cookies/storage) will delete all your dashboard data — export a CSV backup regularly.
- **Incognito / private mode** does not persist localStorage — do not use private browsing if you want your data to survive a tab close.

### Backup Recommendations

- Export a CSV after any significant data entry session.
- Store backups in a cloud folder (iCloud Drive, Google Drive, Dropbox) for safety.

### Schema Version

The app uses `penny_state_v2` as the localStorage key. Older data stored under `penny_state_v1` is automatically migrated on first load.

---

*Last updated: May 2026 · Version 1.0*
