/**
 * Module:   constants/dashboardSections.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 13)
 * Updated:  May 2026 (Sprint 18) — added `title` for dynamic card rendering
 *           May 2026 (Sprint 25) — split into DASHBOARD_SECTIONS + ADVANCED_SECTIONS;
 *                                  removed budget-allocation (→ Settings) and
 *                                  goals-timeline (deleted)
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

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  // ── Income & Budget ──────────────────────────────────────────────
  {
    id: 'income-streams',
    icon: '💰',
    label: 'Income Streams',
    title: 'Income Streams',
    group: 'Income & Budget',
  },

  // ── Spending ─────────────────────────────────────────────────────
  {
    id: 'wants-tracker',
    icon: '🛍️',
    label: 'Wants Tracker',
    title: 'Wants Tracker',
    group: 'Spending',
  },
  {
    id: 'expense-cards',
    icon: '💳',
    label: 'Expense Cards',
    title: 'Expense Cards',
    group: 'Spending',
  },
  {
    id: 'subscriptions',
    icon: '🔄',
    label: 'Subscriptions',
    title: 'Subscriptions',
    group: 'Spending',
  },

  // ── Debt & Credit ─────────────────────────────────────────────────
  {
    id: 'loans',
    icon: '🏛️',
    label: 'Loans',
    title: 'Loans',
    group: 'Debt & Credit',
  },
  {
    id: 'credit-cards',
    icon: '💳',
    label: 'Credit Cards',
    title: 'Credit Cards',
    group: 'Debt & Credit',
  },

  // ── Savings & Goals ───────────────────────────────────────────────
  {
    id: 'savings-accounts',
    icon: '🏦',
    label: 'Savings Accounts',
    title: 'Savings Accounts',
    group: 'Savings & Goals',
  },
  {
    id: 'savings-goals',
    icon: '🎯',
    label: 'Savings Goals',
    title: 'Savings Goals',
    group: 'Savings & Goals',
  },

  // ── Account Tracking ─────────────────────────────────────────────
  {
    id: 'chequing-balance',
    icon: '🏦',
    label: 'Chequing Balance',
    title: 'Chequing Balance',
    group: 'Account Tracking',
  },

  // ── Wealth & History ──────────────────────────────────────────────
  {
    id: 'wishlist',
    icon: '⭐',
    label: 'Wishlist',
    title: 'Wishlist',
    group: 'Wealth & History',
  },
];

// ─── Advanced tab sections ───────────────────────────────────────────────────

export const ADVANCED_SECTIONS: DashboardSection[] = [
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
  [...DASHBOARD_SECTIONS, ...ADVANCED_SECTIONS].map(s => [s.id, s]),
);

/** Default section order for the Dashboard tab */
export const DEFAULT_SECTION_ORDER: string[] = DASHBOARD_SECTIONS.map(s => s.id);

/** Default section order for the Advanced tab */
export const DEFAULT_ADVANCED_ORDER: string[] = ADVANCED_SECTIONS.map(s => s.id);

/** Unique ordered group names for the dashboard section picker */
export const SECTION_GROUPS: string[] = [
  ...new Set(DASHBOARD_SECTIONS.map(s => s.group)),
];
