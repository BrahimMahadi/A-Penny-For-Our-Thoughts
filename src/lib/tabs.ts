/**
 * Module:   src/lib/tabs.ts
 * Project:  A Penny For Our Thoughts
 * Created:  September 2026 (BUG-039)
 * Summary:  Single source of truth for tab order and which tabs are primary.
 *
 *           BUG-039: this existed in two places that drifted apart. `App.vue`
 *           held a 7-entry TAB_ORDER used for swipe navigation, while
 *           `BottomNav.vue` (MOBILE-4) independently split the same tabs into
 *           5 primary slots plus a Docs/Settings overflow sheet. Swiping past
 *           Insights therefore landed on Docs — a tab with no button in the
 *           visible nav — so the gesture and the nav disagreed about what the
 *           app's tabs even were.
 *
 *           Both now import from here. Adding or reordering a tab is one edit.
 *
 *           v2.47.2: swipe navigation was removed, taking `swipeTarget()` with
 *           it. This module stays because the drift it prevents is real —
 *           `App.vue` reads TAB_ORDER for the page-transition direction and
 *           BottomNav reads the primary/overflow split for its slots, and those
 *           two must agree about what the tabs are.
 */

import type { TabId } from '@/types/state';

/**
 * Canonical left-to-right order of every tab.
 * Drives the directional slide transition between pages.
 */
export const TAB_ORDER: TabId[] = [
  'dashboard',
  'schedule',
  'spending',
  'goals',
  'insights',
  'docs',
  'settings',
];

/** Tabs that live behind the bottom nav's "More" button rather than in a slot. */
export const OVERFLOW_TAB_IDS: TabId[] = ['docs', 'settings'];

/**
 * The five tabs with their own bottom-nav slot, in nav order.
 *
 * Derived from TAB_ORDER rather than listed again, so a new tab appears in the
 * nav automatically unless it is explicitly put in the overflow set.
 */
export const PRIMARY_TAB_ORDER: TabId[] = TAB_ORDER.filter(
  (id) => !OVERFLOW_TAB_IDS.includes(id),
);

/** True when `id` lives in the overflow sheet rather than a nav slot. */
export function isOverflowTab(id: TabId): boolean {
  return OVERFLOW_TAB_IDS.includes(id);
}
