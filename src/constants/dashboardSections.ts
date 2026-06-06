/**
 * Module:   constants/dashboardSections.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 13)
 * Updated:  May 2026 (Sprint 18) — added `title` for dynamic card rendering
 *           May 2026 (Sprint 25) — split into DASHBOARD_SECTIONS + ADVANCED_SECTIONS;
 *                                  (ADVANCED_SECTIONS renamed → INSIGHTS_SECTIONS
 *                                  in RS-27 along with the Advanced→Insights tab rename)
 *                                  removed budget-allocation (→ Settings) and
 *                                  goals-timeline (deleted)
 *           May 2026 (RS-11)    — removed income-streams (→ Settings), wants-tracker
 *                                  (→ RS-12 as purchases-this-period), savings-goals
 *                                  (→ Goals tab); renamed expense-cards → "Recurring
 *                                  Spend" and loans → "Loan Payoff" to match new UI.
 *                                  Dashboard is now a fixed-grid layout (7 sections).
 *           May 2026 (RS-12)    — added purchases-this-period (donut + category widget)
 *                                  and money-flow (12-month income/spend chart) to the
 *                                  new charts row between KPI and widget rows (9 sections).
 *           May 2026 (RS-22)    — DASHBOARD_SECTIONS reordered to match the actual
 *                                  visual order on DashboardPage (chequing-balance first,
 *                                  wishlist last). SectionPicker now reads this list
 *                                  directly so the picker mirrors what users see.
 * Summary:  Authoritative registry of all section cards across the Dashboard
 *           and Advanced tabs. Both consumers (SectionPicker, page hosts)
 *           derive their config from these lists so they always stay in sync.
 */

export interface DashboardSection {
  /** Slug used as the HTML element id: `section-${id}` */
  id: string;
  icon: string;
  /** Short display label used in SectionPicker */
  label: string;
  /** Full card title rendered in the BaseCard header */
  title: string;
  /** Display group heading in the section picker */
  group: string;
}

// ─── Dashboard tab sections ──────────────────────────────────────────────────
// Fixed-grid layout (RS-11/RS-12). Order below mirrors the actual DOM order on
// DashboardPage.vue so the SectionPicker shows sections in the same order users
// scan them top-to-bottom on the page:
//   Row 1 (KPI):    [Hero KPI cards] · Chequing Balance
//   Row 2 (charts): Purchases This Period · Money Flow
//   Row 3 (widget): Recurring Spend · Loan Payoff · Savings Accounts
//   Row 4 (full):   Subscriptions
//   Row 5 (full):   Credit Cards
//   Row 6 (full):   Wishlist

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  // ── Row 1: KPI row ───────────────────────────────────────────────
  {
    id: 'chequing-balance',
    icon: '🏦',
    label: 'Chequing Balance',
    title: 'Chequing Balance',
    group: 'Account Tracking',
  },

  // ── Row 2: charts row ────────────────────────────────────────────
  {
    id: 'purchases-this-period',
    icon: '🛍️',
    label: 'Purchases This Period',
    title: 'Purchases This Period',
    group: 'Spending',
  },
  {
    id: 'money-flow',
    icon: '📊',
    label: 'Money Flow',
    title: 'Money Flow (12 months)',
    group: 'Spending',
  },

  // ── Row 3: widget row ────────────────────────────────────────────
  {
    id: 'expense-cards',
    icon: '💳',
    label: 'Recurring Spend',
    title: 'Recurring Spend',
    group: 'Spending',
  },
  {
    id: 'loans',
    icon: '🏛️',
    label: 'Loan Payoff',
    title: 'Loan Payoff',
    group: 'Debt & Credit',
  },
  {
    id: 'savings-accounts',
    icon: '🏦',
    label: 'Savings Accounts',
    title: 'Savings Accounts',
    group: 'Savings',
  },

  // ── Row 4: full-width ────────────────────────────────────────────
  {
    id: 'subscriptions',
    icon: '🔄',
    label: 'Subscriptions',
    title: 'Subscriptions',
    group: 'Spending',
  },

  // ── Row 5: full-width ────────────────────────────────────────────
  {
    id: 'credit-cards',
    icon: '💳',
    label: 'Credit Cards',
    title: 'Credit Cards',
    group: 'Debt & Credit',
  },

  // ── Row 6: full-width ────────────────────────────────────────────
  {
    id: 'wishlist',
    icon: '⭐',
    label: 'Wishlist',
    title: 'Wishlist',
    group: 'Wealth & History',
  },
];

// ─── Insights tab sections (formerly "Advanced" — renamed RS-27) ─────────────

export const INSIGHTS_SECTIONS: DashboardSection[] = [
  {
    id: 'spending-trend',
    icon: '📊',
    label: '6-Month Spending Trend',
    title: '6-Month Spending Trend',
    group: 'Analytics',
  },
  {
    id: 'spending-analytics',
    icon: '🔍',
    label: 'Spending Analytics',
    title: 'Spending Analytics',
    group: 'Analytics',
  },
  {
    id: 'budget-vs-actual',
    icon: '📉',
    label: 'Budget vs. Actual',
    title: 'Budget vs. Actual',
    group: 'Analytics',
  },
  {
    id: 'net-worth',
    icon: '📈',
    label: 'Net Worth',
    title: 'Net Worth',
    group: 'Analytics',
  },
];

// ─── Combined lookup map (both tabs) ────────────────────────────────────────

/** Lookup map: section id → full DashboardSection record (covers both tabs) */
export const SECTION_MAP: Record<string, DashboardSection> = Object.fromEntries(
  [...DASHBOARD_SECTIONS, ...INSIGHTS_SECTIONS].map(s => [s.id, s]),
);

/** Default section order for the Dashboard tab (fixed-grid layout, RS-11+) */
export const DEFAULT_SECTION_ORDER: string[] = DASHBOARD_SECTIONS.map(s => s.id);

/** Default section order for the Insights tab (renamed from Advanced in RS-27) */
export const DEFAULT_INSIGHTS_ORDER: string[] = INSIGHTS_SECTIONS.map(s => s.id);
