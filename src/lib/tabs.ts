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
 * This — not `TAB_ORDER` — is what swipe navigation cycles through. Swiping is
 * a shortcut for the visible nav, so it must not reach a destination the user
 * cannot see a button for.
 */
export const PRIMARY_TAB_ORDER: TabId[] = TAB_ORDER.filter(
  (id) => !OVERFLOW_TAB_IDS.includes(id),
);

/** True when `id` lives in the overflow sheet rather than a nav slot. */
export function isOverflowTab(id: TabId): boolean {
  return OVERFLOW_TAB_IDS.includes(id);
}

/**
 * The tab reached by swiping from `current` in `direction`, or `null` when the
 * gesture would run off either end (swiping right on the first tab, left on the
 * last). Returning `null` rather than clamping lets the caller do nothing at
 * all, so the user gets no misleading movement.
 *
 * A tab that is not in the primary set (the user is on Docs or Settings, having
 * arrived via the More sheet) also yields `null`: there is no sensible swipe
 * neighbour, and silently jumping into the primary list would be surprising.
 */
export function swipeTarget(current: TabId, direction: 'next' | 'prev'): TabId | null {
  const idx = PRIMARY_TAB_ORDER.indexOf(current);
  if (idx === -1) return null;

  const targetIdx = direction === 'next' ? idx + 1 : idx - 1;
  if (targetIdx < 0 || targetIdx >= PRIMARY_TAB_ORDER.length) return null;

  return PRIMARY_TAB_ORDER[targetIdx];
}
