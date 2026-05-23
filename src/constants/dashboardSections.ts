/**
 * Module:   constants/dashboardSections.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 13)
 * Summary:  Authoritative registry of all dashboard sections.
 *           Used by SectionPicker (nav jump-to) and DashboardPage
 *           (id attrs, collapsible wiring). Both consumers derive
 *           their config from this single list so they always stay
 *           in sync.
 */

export interface DashboardSection {
  /** Slug used as the HTML element id: `section-${id}` */
  id: string;
  icon: string;
  label: string;
  /** Display group heading in the section picker */
  group: string;
  /** Whether the card is collapsible by default (heavy sections) */
  collapsible?: boolean;
}

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  // ── Income & Budget ──────────────────────────────────────────────
  {
    id: 'spending-trend',
    icon: '📊',
    label: '6-Month Spending Trend',
    group: 'Income & Budget',
  },
  {
    id: 'income-streams',
    icon: '💰',
    label: 'Income Streams',
    group: 'Income & Budget',
  },
  {
    id: 'budget-allocation',
    icon: '📐',
    label: 'Budget Allocation',
    group: 'Income & Budget',
  },

  // ── Spending ─────────────────────────────────────────────────────
  {
    id: 'wants-tracker',
    icon: '🛍️',
    label: 'Wants Tracker',
    group: 'Spending',
  },
  {
    id: 'budget-vs-actual',
    icon: '📉',
    label: 'Budget vs. Actual',
    group: 'Spending',
  },
  {
    id: 'expense-cards',
    icon: '💳',
    label: 'Expense Cards',
    group: 'Spending',
  },
  {
    id: 'subscriptions',
    icon: '🔄',
    label: 'Subscriptions',
    group: 'Spending',
  },

  // ── Debt & Credit ─────────────────────────────────────────────────
  {
    id: 'loans',
    icon: '🏛️',
    label: 'Loans',
    group: 'Debt & Credit',
  },
  {
    id: 'credit-cards',
    icon: '💳',
    label: 'Credit Cards',
    group: 'Debt & Credit',
  },

  // ── Savings & Goals ───────────────────────────────────────────────
  {
    id: 'savings-accounts',
    icon: '🏦',
    label: 'Savings Accounts',
    group: 'Savings & Goals',
  },
  {
    id: 'savings-goals',
    icon: '🎯',
    label: 'Savings Goals',
    group: 'Savings & Goals',
  },
  {
    id: 'goals-timeline',
    icon: '📌',
    label: 'Goals Timeline',
    group: 'Savings & Goals',
    collapsible: true,
  },

  // ── Wealth & History ──────────────────────────────────────────────
  {
    id: 'net-worth',
    icon: '📈',
    label: 'Net Worth',
    group: 'Wealth & History',
    collapsible: true,
  },
  {
    id: 'spending-analytics',
    icon: '🔍',
    label: 'Spending Analytics',
    group: 'Wealth & History',
    collapsible: true,
  },
  {
    id: 'wishlist',
    icon: '⭐',
    label: 'Wishlist',
    group: 'Wealth & History',
    collapsible: true,
  },
];

/** Unique ordered group names for the section picker */
export const SECTION_GROUPS: string[] = [
  ...new Set(DASHBOARD_SECTIONS.map(s => s.group)),
];
