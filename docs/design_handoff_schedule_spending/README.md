# Handoff: Schedule pay-period view + Spending search

## Overview

Two additions to the **A Penny For Our Thoughts** budgeting app:

1. **Schedule tab** — a new **Pay period** calendar view that spans a single bi-weekly pay cycle (14 days from pay day to the day before next pay day), plus **event names rendered directly inside calendar cells** in both the month and pay-period views.
2. **Spending tab** — a **search input** on the "All purchases" table that filters rows by purchase name, category, or card, alongside the existing sort + category-chip filters.

Both views already exist in the app — this is a layout + interaction extension, not a redesign.

## About the design files

The files in `design_handoff_schedule_spending/` are an **HTML/React prototype** built with Babel-in-the-browser. They are a **design reference**, not production code to copy verbatim.

Your job is to recreate the intended look and behavior in the real codebase using whatever stack and patterns it already uses (React Native, native iOS/Android, Vue, SwiftUI, etc.). If the project doesn't yet have an environment, pick the most appropriate one and stand it up there.

The prototype is opinionated about pixels, motion, and copy — match it as closely as the host design system allows.

## Fidelity

**High-fidelity.** Spacing, type sizes, colors, border radii, and the interaction model are all final. Recreate pixel-faithfully using the codebase's design tokens; only swap exact hex values if the codebase has equivalent semantic tokens.

## Screenshots

Reference renders of each state, in `screenshots/`:

| File | Shows |
|---|---|
| `01-schedule-month.png` | Schedule tab — **Month** view. SUN-anchored weekday header, event names inline in cells, Month/Pay-period toggle in the header. |
| `02-schedule-payperiod.png` | Schedule tab — **Pay period** view. THU-anchored header, 14 days from May 22 → Jun 4, green `PAY`/`END` markers on the bookend cells, KPIs scoped to the period. |
| `03-spending-default.png` | Spending tab — "All purchases" card with the new **Search** input next to Sort, filter chips, and the populated table. |
| `04-spending-search-active.png` | Spending tab — search active (query: `co`). Input border + icon turn accent purple; `×` clear button shows; results filter to a single row; counter reads `1 of 8`. |
| `05-spending-empty-state.png` | Spending tab — search with **no matches**. Table body collapses to a centered empty state with bolded query and a "Clear filters" link. |

## Files in this bundle

| File | Why it's here |
|---|---|
| `A Penny Dashboard.html` | Entry point — open in a browser to see all tabs side-by-side on a design canvas. |
| `dashboard-tabs.jsx` | **Primary reference.** Contains `TabSchedule` and `TabSpending` — the two screens you are implementing. |
| `dashboard-modern.jsx` | Parent component. Defines the theme tokens (`t.*`) and the `Card` component that the tabs receive via `ctx`. |
| `data.jsx` | Mock dataset (`window.BUDGET`) — pay periods, income streams, recent purchases. Useful to understand the shape of real data. |
| `charts.jsx` | Donut + progress-bar primitives used by the tabs. Not directly relevant to these two features but referenced by the file. |

---

## Screen 1 — Schedule tab

**File:** `dashboard-tabs.jsx`, function `TabSchedule`

### Layout (top-down)

```
┌─ Header ──────────────────────────────────────────────────────────┐
│  eyebrow "Schedule"                       [ ‹  Today  › ]         │
│  title  dynamic (see below)               [ Month | Pay period ]  │
└───────────────────────────────────────────────────────────────────┘

┌─ KPI row · 3 columns ────────────────────────────────────────────┐
│  Income (period or month)  │ Bills + recurring │ Net             │
└──────────────────────────────────────────────────────────────────┘

┌─ Calendar (2.2fr) ─────────────────┐ ┌─ Selected day (1fr) ─────┐
│  weekday header                    │ │  SELECTED DAY            │
│  day grid                          │ │  May 25, 2026            │
│  legend                            │ │  3 events · $X out       │
│                                    │ │  ─ event list ──         │
└────────────────────────────────────┘ └──────────────────────────┘

┌─ Pay schedule timeline ──────────────────────────────────────────┐
│  Bi-weekly · Thursdays                                            │
│  • —— • —— • —— ○ —— • —— •   (past · next · upcoming markers)   │
└──────────────────────────────────────────────────────────────────┘
```

### Header — view toggle

Two-button segmented control, pill shape, lives next to the existing `‹ Today ›` control.

| Option | Active style | Inactive style |
|---|---|---|
| `Month` | `background: t.accent`, white text, `fontWeight: 700` | transparent, `color: t.muted`, weight 500 |
| `Pay period` | same | same |

Header title is data-driven:
- Month view → `"May 2026"`
- Pay-period view → `"Period 9 · May 22 – Jun 4"`

### KPI row

The Income KPI label switches with the view:
- Month: `"Income this month"`
- Period: `"Income this period"`

Income/Bills totals scope to events inside the active window only.

### Calendar grid

7 columns. Cell minHeight changes with view:
- Month → **86px**
- Pay period → **130px** (taller so it can fit up to 4 event names)

Weekday header label set:
- Month → `SUN MON TUE WED THU FRI SAT` (May 1, 2026 is a Friday — pad with 5 empty leading cells)
- Pay period → `THU FRI SAT SUN MON TUE WED` (pay days are Thursdays — the period starts on Thu May 22)

### Cell visual

```
┌──────────────────┐
│ 22         PAY   │ ← day number · optional marker badge
│ ┃ Pay            │ ← color-bar + event name (truncated)
│ ┃ Car Loan       │
│ ┃ Phone Loan     │
│ +1 more          │ ← if > maxNamesShown
└──────────────────┘
```

Cell internals:
- Padding `7px`, border-radius `10px`, gap between rows `3px`, `overflow: hidden`
- Day number: `fontSize: 12`, `fontWeight: 600` (`800` if today, color `t.accent`)
- For period view: the first cell shows a small `MAY` tag next to `22`; the cell for the 1st of the new month shows `JUN` next to `1`
- **PAY** / **END** badges (pay-period view only): mono, 8.5px, weight 800, color `t.success`. Border on the cell becomes `t.success + '88'` (semi-transparent).

Per-event line layout:
- 2px-wide vertical color bar (`background: typeColor(type)`, `borderRadius: 999`, stretches to row height)
- Name: `fontSize: 10`, `color: t.text`, `fontWeight: 500`, `whiteSpace: nowrap`, `overflow: hidden`, `textOverflow: ellipsis`
- Display cap: **2** names in month view, **4** in period view. If more, show muted mono `+N more` at the bottom.

Empty cells: when `cells.length` needs to be padded (start/end of month), render an empty `<div>` with matching minHeight so the grid keeps its rhythm.

### Event-type → color map

```js
typeColor(type) = {
  income: t.success,   // green
  bill:   t.danger,    // red
  sub:    t.accent,    // brand purple
  loan:   t.warn,      // amber
  var:    t.accent2,   // chartreuse
}
```

### Selected day panel

Already existed — only the date title changed to support cross-month selection:

```
SELECTED DAY
{selMonthLabel} {selDay}, 2026     ← was hard-coded "May"
{n events · $X out}                ← unchanged
```

`selectedKey` is a string `"M-D"` (e.g. `"5-25"`, `"6-2"`). Parse with `selectedKey.split('-').map(Number)`. `selMonth === 5 ? 'May' : 'Jun'`.

### Pay schedule timeline (bottom card)

Unchanged from the existing screen — keep it as-is.

### Event data

The events live in a single object keyed by `"M-D"`:

```js
const events = {
  '5-1':  [{ name: 'Rent',          amount: 700,    type: 'bill', card: 'WS Debit' }],
  '5-22': [{ name: 'Pay · Stream A+B', amount: 3551.64, type: 'income' },
           { name: 'Car Loan',      amount: 199.03, type: 'loan', card: 'TD Debit' }],
  // …see dashboard-tabs.jsx for the full table
};
```

For the period view, also include events on the **next pay day** (Jun 5) and on Jun 1, 2, 4 so the second half of the period has content.

### Behavior

- Clicking a cell sets `selectedKey` and updates the selected-day panel.
- Clicking either toggle button switches the calendar's cell set, weekday header, KPI scope, and header title.
- The pay day (`5-22`) and the day before next pay (`6-4`) get the success-green border and `PAY`/`END` chips when in period view.

---

## Screen 2 — Spending tab

**File:** `dashboard-tabs.jsx`, function `TabSpending`

### What's new

Only the "All purchases" card header changes — everything above (header, KPI row, donut, daily-spend chart) stays put.

```
┌─ All purchases ─────────────────────────────────────────────────┐
│  13 of 18                       [🔍 Search purchases…]  Sort ⌄  │
│                                                                  │
│  [All 18] [Food 5] [Shopping 3] [Subs 2] …    ← filter chips    │
│                                                                  │
│  WHEN  PURCHASE         CATEGORY   CARD      AMOUNT             │
│  …rows…                                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Search input

Pill-shaped, sits to the **left of** the existing Sort dropdown.

| Property | Value |
|---|---|
| Background | `t.card` |
| Border | `1px solid t.border` (focused/has-value → `1px solid t.accent`) |
| Border radius | `999px` |
| Padding | `6px 10px 6px 30px` (extra left padding leaves room for the icon) |
| Min width | `220px` |
| Font size | `12.5px` |
| Placeholder | `"Search purchases…"` |

**Icon:** 13×13 magnifier (lucide-style `circle + path` SVG), absolutely positioned at `left: 10px`, vertically centered. Stroke color flips from `t.muted` → `t.accent` when the input has a value.

**Clear button:** when `query` is non-empty, show a small `×` button on the right side of the input. Clicking it resets `query` to `""`. No icon — plain `×` glyph, `color: t.muted`, `fontSize: 14`.

### Filter logic

```js
const filtered = recent.filter((r) => {
  if (filter !== 'all' && r.cat !== filter) return false;
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    const catLabel = catMeta[r.cat]?.label.toLowerCase() || '';
    if (!r.name.toLowerCase().includes(q) &&
        !catLabel.includes(q) &&
        !r.card.toLowerCase().includes(q)) return false;
  }
  return true;
});
```

Search and category-chip filter compose (AND).

### Empty state

When `sorted.length === 0`:

```
┌─────────────────────────────────────────────────────────┐
│   No purchases match "tim" in Food. Clear filters       │
└─────────────────────────────────────────────────────────┘
```

Rendered as a single full-width `<tr>` with `colSpan="5"`:
- 32px vertical padding, centered, `color: t.subtle`, `fontSize: 13`
- The query and category names are bolded (`color: t.text`)
- "Clear filters" is a button that resets both `query` and `filter` — styled as a borderless link, `color: t.accent`, weight 600

### Header count

The `{filtered.length} of {recent.length}` label updates live as the user types.

---

## Interactions & behavior summary

| Trigger | Effect |
|---|---|
| Click `Month` / `Pay period` toggle | Re-render calendar with new cell set, weekday header, KPI scope, title |
| Click a calendar cell | Set `selectedKey`; selected-day panel re-renders |
| Type in Spending search | Live filter the table (no debounce — set is tiny) |
| Click `×` in search | Clear `query` |
| Click `Clear filters` in empty state | Clear both `query` and `filter` |
| Click filter chip in Spending | Set `filter` to that category id |

No animations beyond the existing `transition: 'all 0.1s'` on calendar cells and `transition: 'border-color 0.15s'` on the search input.

---

## State management

### Schedule
```ts
const [selectedKey, setSelectedKey] = useState('5-25'); // "M-D"
const [view,        setView]        = useState<'month' | 'period'>('month');
```

### Spending
```ts
const [filter, setFilter] = useState<'all' | CategoryId>('all');
const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date');
const [query,  setQuery]  = useState('');
```

No async data, no network. Both screens pull from `window.BUDGET` (the mock dataset in `data.jsx`) — in the real codebase, wire them to whatever stores transactions and scheduled events.

---

## Design tokens

Pulled from `dashboard-modern.jsx`. Use the codebase's equivalent semantic tokens; the hex values below are the source-of-truth in the prototype's **light** theme.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `bg` | `#f3f4f7` | `#0d0d12` | App background |
| `card` | `#ffffff` | `#16161e` | Card surfaces |
| `cardAlt` | `#f9fafc` | `#1a1a24` | "Today" cell highlight, slight contrast surfaces |
| `border` | `#ebecef` | `#23232f` | Card + input borders |
| `text` | `#16171f` | `#f0f0f5` | Body text |
| `muted` | `#6c7280` | `#8b8b95` | Secondary text, labels |
| `subtle` | `#a0a4ad` | `#5a5a65` | Tertiary text, empty-state copy |
| `accent` | `#5b3df5` | (same) | Brand action color (default — tweakable) |
| `accentSoft` | `accent + '12'` | `accent + '24'` | Soft accent backgrounds |
| `success` | `#16a34a` | `#4ade80` | Income, PAY markers |
| `danger` | `#dc2626` | `#ff6b6b` | Bills, overspend |
| `warn` | `#d97706` | `#fbbf24` | Loans |
| `track` | `#eef0f3` | `#1f1f2a` | Progress bar / chart tracks |

### Typography
- Sans: **Inter** (400, 500, 600, 700, 800)
- Mono: **JetBrains Mono** (400, 500, 600, 700) — used for dates, amounts, badges
- Serif (optional alt): **Source Serif 4**

### Spacing & radius
- Card padding: `22px`
- Card radius: `16px` ("elevated"), border `1px solid t.border`
- Pill / chip radius: `999px`
- Input radius: `999px` (search) or `6–10px` (other inputs)
- Grid gap between cards: `ctx.gap` (defaults to `18px` comfortable / `12px` compact)

### Shadows
- Elevated card: `0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)`
- Flat / bordered card: none

---

## Assets

No bitmap assets. The only iconography in these two features:

- **Search magnifier** — inline SVG, 24×24 viewBox, `circle cx=11 cy=11 r=8` + `path m21 21-4.3-4.3`, `stroke-width=2.5`, `stroke-linecap=round`, `stroke-linejoin=round`. Stroke color flips on focus.
- **Calendar cell color bar** — pure CSS (`background` + `border-radius: 999`).
- **`×` clear button** — Unicode glyph.

Substitute the codebase's own icon set (Lucide, SF Symbols, Material Icons, etc.) if it has one.

---

## Prompt for Claude Code

Paste this into Claude Code after dropping this folder into your repo:

> I'm adding two features to the budgeting app: a **Pay-period view** on the Schedule tab, and a **search input** on the Spending tab's purchases table. The full spec is in `design_handoff_schedule_spending/README.md`; the source-of-truth prototype is `design_handoff_schedule_spending/dashboard-tabs.jsx` (the `TabSchedule` and `TabSpending` functions).
>
> Steps:
> 1. Read `README.md` end-to-end.
> 2. Open `dashboard-tabs.jsx` and study `TabSchedule` + `TabSpending` — these are the screens I want to land in the real codebase.
> 3. Identify the existing components in this project that map to: a calendar grid, KPI tile, segmented toggle, chip filter, input field with leading icon, and table empty-state row. Reuse them; don't introduce parallel implementations.
> 4. Implement the Schedule changes:
>    - Add a `view: 'month' | 'period'` state.
>    - Build the pay-period 14-day grid (THU-anchored week labels, PAY/END markers on the bookends).
>    - Render event names inline in calendar cells in **both** views, with the truncation and "+N more" rules from the README.
>    - Re-scope the KPI income/bills tallies to the active view.
>    - Switch the header title between `"May 2026"` and `"Period 9 · May 22 – Jun 4"`.
> 5. Implement the Spending changes:
>    - Add a `query` state and a pill-shaped search input with leading magnifier and trailing clear `×`.
>    - Filter the table on name + category label + card.
>    - Add the empty-state row with the "Clear filters" link.
>    - Keep the existing sort + category chip filter — they compose (AND) with search.
> 6. Use the codebase's design tokens; only fall back to the hex values in the README if no equivalent exists.
> 7. Hook both screens to the real transaction + scheduled-events stores (currently mocked from `window.BUDGET`).
> 8. Match motion: `transition: all 0.1s` on calendar cells, `transition: border-color 0.15s` on the search input. Nothing fancier.
>
> Don't ship the HTML prototype as-is — recreate it in the host stack. When unsure about a token or component to reuse, ask before guessing.

---

## Open questions for the developer

1. **Period boundaries** — the prototype hard-codes Period 9 = May 22 → Jun 4. In production, derive this from the user's actual pay schedule (income stream → next/prev pay dates).
2. **Cross-month events** — the mock only crosses one month boundary. Confirm with backend the event store can return events filtered by a date range, not month.
3. **Search scope** — currently searches name + category label + card. Decide whether to also search merchant aliases, notes, or amount strings.
4. **Search persistence** — should `query` persist across tab switches? Prototype resets it on unmount.
5. **Keyboard shortcuts** — should `/` focus the search input?
