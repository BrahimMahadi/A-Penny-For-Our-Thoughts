# Project Architecture

## Overview

"A Penny For Our Thoughts" is a **client-side only** financial dashboard with no backend. All data persists in browser localStorage.

```
User Interface (dashboard.html)
        ↓
Application Logic (app.js)
        ↓
State Management (state object in localStorage)
        ↓
Browser Storage (localStorage: penny_state_v2)
```

---

## File Structure

### Current (Pre-Phase 3)
```
/A Penny For Our Thoughts/
├── dashboard.html          (1,089 lines)
│   ├── Header (title, date, controls)
│   ├── Navigation (Dashboard / Edit tabs)
│   ├── Dashboard view (all financial sections)
│   ├── Edit view (budget percentages, card balances, savings)
│   └── Modal overlay (CRUD forms)
│
├── app.js                  (1,829 lines)
│   ├── State initialization & migrations
│   ├── CRUD functions (add, edit, delete operations)
│   ├── Render functions (update DOM from state)
│   ├── Calculations (budget variance, net worth, etc.)
│   ├── Event handlers (clicks, form submissions)
│   ├── Utility functions (ID generation, formatting)
│   └── Chart.js management (4 chart instances)
│
├── styles.css              (1,157 lines)
│   ├── CSS variables (colors, fonts, spacing)
│   ├── Layout & responsive grid
│   ├── Component styles (cards, buttons, forms)
│   ├── Theme styles (dark/light modes)
│   ├── Animations & transitions
│   └── Media queries (responsive breakpoints)
│
├── docs/                   (Documentation)
│   ├── README.md          (This folder's guide)
│   ├── ROADMAP.md         (Development roadmap)
│   ├── ARCHITECTURE.md    (This file)
│   └── PHASE_TRACKING.md  (Progress tracking)
│
└── [Other markdown files]
    ├── CLAUDE.md          (AI assistant guidelines)
    ├── Coding_Principles.md (Development standards)
    ├── Penny_Project_Guide.md (Feature guide)
    └── A Penny For Our Thoughts.md (Budget reference)
```

### Post-Phase 3 (Proposed Modular Structure)
```
/A Penny For Our Thoughts/
├── dashboard.html
├── styles.css
│
├── src/
│   ├── app.js              (Entry point, initialization)
│   ├── state.js            (State object, migrations, schema)
│   ├── render.js           (All DOM render functions)
│   ├── charts.js           (Chart.js instance management)
│   ├── analytics.js        (Calculations: variance, net worth, trends)
│   ├── ui.js               (Modal, form, UI helpers)
│   └── utils.js            (Formatting, validation, ID generation)
│
├── docs/
│   ├── README.md
│   ├── ROADMAP.md
│   ├── ARCHITECTURE.md
│   ├── PHASE_TRACKING.md
│   ├── USER_GUIDE.md       (User-facing feature docs)
│   └── API.md              (State schema & function reference)
│
├── tests/
│   ├── state.test.js
│   ├── analytics.test.js
│   └── utils.test.js
│
└── [Other files as above]
```

---

## State Management

### State Object Schema
Located in `localStorage` under key `penny_state_v2`:

```javascript
state = {
  // Financial Data
  savingsAvailable: number,          // Available savings to allocate
  allocation: {
    needs: number,                   // % for needs (0-100)
    wants: number,                   // % for wants (0-100)
    savings: number                  // % for savings (0-100)
  },
  budgetDisplayMode: {
    needs: 'monthly' | 'biweekly',
    wants: 'monthly' | 'biweekly',
    savings: 'monthly' | 'biweekly'
  },

  // Income
  incomeStreams: [
    { id: string, name: string, amount: number, biweekly: boolean },
    ...
  ],

  // Expenses
  expenseCards: [
    {
      id: string,
      label: string,
      items: [
        { id: string, name: string, amount: number, biweekly: boolean },
        ...
      ]
    },
    ...
  ],

  // Wants Tracking (Bi-weekly Envelope)
  purchases: [
    { id: string, name: string, amount: number },
    ...
  ],
  spendingHistory: [
    {
      id: string,
      date: string (ISO date),
      label: string (period label),
      total: number,
      items: [{ name: string, amount: number }, ...]
    },
    ...
  ],

  // Debts & Credit
  loans: [
    { id: string, name: string, remaining: number, original: number },
    ...
  ],
  creditCards: [
    { id: string, name: string, balance: number, limit: number },
    ...
  ],

  // Savings & Goals
  savingsAccounts: [
    { id: string, name: string, allocated: number },
    ...
  ],

  // Subscriptions & Wishlist
  subscriptions: [
    { id: string, name: string, date: string (renewal date) },
    ...
  ],
  wishlist: [
    { id: string, icon: string (emoji), name: string, url?: string },
    ...
  ]
}
```

### State Persistence
- **Key**: `penny_state_v2` (v2 schema with automatic migration from v1)
- **Update Flow**: Modify state → `saveToStorage()` → `render*()`
- **Migration**: Automatic on load; old v1 format converted to v2

---

## Core Functions

### Render Functions (Update DOM)
| Function | Purpose |
|----------|---------|
| `renderDashboard()` | Render entire dashboard view |
| `renderIncomeSection()` | Income streams & total |
| `renderBudgetBar()` | Budget allocation visualization |
| `renderWantsTracker()` | Wants envelope tracking & chart |
| `renderExpenseCards()` | Dynamic payment cards |
| `renderLoans()` | Loan tracking with progress bars |
| `renderCreditCards()` | Credit card utilization |
| `renderSavings()` | Savings allocation & accounts |
| `renderSubscriptions()` | Subscription list with renewal dates |
| `renderWishlist()` | Wishlist items |

### CRUD Functions (Data Modification)
| Operation | Function |
|-----------|----------|
| Add Income | `addIncomeStream(name, amount, biweekly)` |
| Edit Income | `editIncomeStream(id, name, amount, biweekly)` |
| Delete Income | `deleteIncomeStream(id)` |
| Add Purchase | `addPurchase(name, amount)` |
| Delete Purchase | `deletePurchase(id)` |
| Reset Period | `resetWantsPeriod()` |
| Add Expense Card | `addExpenseCard(label)` |
| Edit Expense Card | `editExpenseCard(id, label)` |
| ... (and similar for loans, credit cards, savings, etc.) |

### Calculation Functions
| Function | Returns |
|----------|---------|
| `calculateMonthlyIncome()` | Total monthly income |
| `calculateBudgetAmounts()` | Allocated $ amounts for each category |
| `calculateWantsRemaining()` | Current period remaining budget |
| `calculateTotalExpenses()` | Sum of all fixed expenses |
| `calculateCreditUtilization()` | Total credit card utilization % |

### Utility Functions
| Function | Purpose |
|----------|---------|
| `genId()` | Generate stable unique IDs |
| `saveToStorage()` | Persist state to localStorage |
| `loadFromStorage()` | Load state from localStorage |
| `formatCurrency(num)` | Format numbers as currency |
| `formatDate(date)` | Format date for display |
| `migrateStateIfNeeded()` | Upgrade old state schemas |

---

## Data Flow

### User Action → State Update → DOM Render
```
1. User clicks "Add Income"
   ↓
2. Modal opens (editModal content filled)
   ↓
3. User submits form
   ↓
4. Form validation (if valid)
   ↓
5. State updated: state.incomeStreams.push(newStream)
   ↓
6. saveToStorage() — persist to localStorage
   ↓
7. renderIncomeSection() — update DOM
   ↓
8. renderBudgetBar() — recalculate budget allocation
   ↓
9. Modal closes, user sees new income in list
```

### Example: Editing Budget Allocation
```
1. User changes "Needs %" from 50 to 55
   ↓
2. Input validation (must sum to 100)
   ↓
3. state.allocation.needs = 55
4. state.allocation.wants = 30  // Adjusted proportionally
   ↓
5. saveToStorage()
   ↓
6. renderBudgetBar() — visualize new split
7. renderIncomeSection() — show new allocation amounts
   ↓
8. User sees updated allocation
```

---

## Key Design Patterns

### 1. Idempotent Render Functions
- Safe to call multiple times
- Don't add duplicates or accumulate
- Clear all, rebuild from state

### 2. Single State Object
- All data in one `state` object
- No scattered globals
- Easier to debug and persist

### 3. Modal Pattern
- Single reusable `#modal-overlay` element
- Helper function `openModal(title, fields, saveCallback)`
- Consistent CRUD UX

### 4. localStorage Management
- Automatic save after every state mutation
- Automatic schema migrations
- Error handling for corrupted data

### 5. Chart.js Management
- 4 active chart instances (wants donut, CC bar, analytics line, analytics bar)
- Destroy old chart before creating new one
- Clean up on DOM element removal

---

## Responsive Design

### Breakpoints
| Width | Device | Layout |
|-------|--------|--------|
| 1024px+ | Desktop | Full multi-column, 2-3 cols per row |
| 768px | Tablet | 2 columns, adjusted spacing |
| 540px | Mobile | Single column, stacked |
| 380px | Small Mobile | Extra compact, full width |

### Mobile Optimizations
- 44px minimum touch target size
- Full-width inputs and buttons on phones
- Stack all elements vertically
- Simplified forms (fewer fields per screen)

---

## Browser Support

- **Modern browsers**: Chrome, Firefox, Safari, Edge
- **Features used**: ES2023, localStorage, CSS Grid, CSS Variables, Chart.js
- **No build step**: Vanilla HTML/CSS/JS, works directly in browser
- **CDN**: Chart.js from Cloudflare

---

## Performance Considerations

### Current
- No issues with typical dataset (2-3 years of transactions)
- localStorage limits: ~5-10MB per domain (more than enough)
- Chart.js instances: 4 active, good performance

### Future (Phase 3)
- Lazy-load charts (only when section visible)
- Reuse Chart.js instances instead of destroy/recreate
- Batch DOM updates where possible
- Test with 5+ years of historical data

---

## Testing Strategy (Phase 3)

### Unit Tests
- `state.test.js` — State schema, migrations, CRUD functions
- `analytics.test.js` — Calculations (variance, net worth, trends)
- `utils.test.js` — Formatting, validation, ID generation

### Integration Tests
- Full CRUD workflows (add → edit → delete)
- localStorage persistence and recovery
- Theme toggle persistence
- CSV import/export round-trip

### Manual Testing
- Mobile devices (real iOS & Android)
- Different browsers
- Dark/light theme switching
- Large datasets (5+ years)

---

## Git & Versioning

### Branching
- `main` — Production-ready, always deployable
- `phase-0/ui-design` — Phase 0 work
- `phase-1/analytics` — Phase 1 work
- etc.

### Tagging
- `v0.1.0` — Phase 0 complete
- `v1.0.0` — Phase 1 complete
- etc.

---

## Future Considerations

### Phase 3 Refactor
When code grows, modularize into `src/` folder with clear separation:
- **state.js** — Data layer
- **render.js** — View layer
- **analytics.js** — Business logic
- **ui.js** — Component layer

### Potential Enhancements
- Bank API integration (Plaid, etc.)
- Multi-user support (separate users per localStorage key)
- Mobile app wrapper (Capacitor/Electron)
- Backend sync (optional)

---

**Last Updated**: May 12, 2026
**Current Phase**: Phase 0 (Design & Visual Polish)
