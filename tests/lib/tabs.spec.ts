/**
 * Module:   tests/lib/tabs.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  September 2026 (BUG-039)
 * Summary:  Guards the single source of truth for tab order.
 *
 *           BUG-039: App.vue's swipe TAB_ORDER (7 tabs) and BottomNav's
 *           5-primary/2-overflow split were declared independently and drifted.
 *           Swiping from Insights landed on Docs — a tab with no nav button —
 *           so the nav showed no active tab and the gesture felt broken.
 *           These assertions fail if the two ever diverge again.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  TAB_ORDER,
  PRIMARY_TAB_ORDER,
  OVERFLOW_TAB_IDS,
  isOverflowTab,
  swipeTarget,
} from '@/lib/tabs';

const root = resolve(__dirname, '../..');
const read = (rel: string): string => readFileSync(resolve(root, rel), 'utf8');

describe('tab order (BUG-039)', () => {
  it('splits every tab into exactly one of primary or overflow', () => {
    expect([...PRIMARY_TAB_ORDER, ...OVERFLOW_TAB_IDS].sort()).toEqual([...TAB_ORDER].sort());
    expect(PRIMARY_TAB_ORDER.filter((id) => OVERFLOW_TAB_IDS.includes(id))).toEqual([]);
  });

  it('keeps five primary tabs — the bottom nav has five slots plus More', () => {
    expect(PRIMARY_TAB_ORDER).toHaveLength(5);
    expect(OVERFLOW_TAB_IDS).toEqual(['docs', 'settings']);
  });

  it('preserves canonical order within the primary subset', () => {
    expect(PRIMARY_TAB_ORDER).toEqual(['dashboard', 'schedule', 'spending', 'goals', 'insights']);
  });

  it('identifies overflow tabs', () => {
    expect(isOverflowTab('docs')).toBe(true);
    expect(isOverflowTab('dashboard')).toBe(false);
  });
});

describe('swipeTarget', () => {
  it('moves forward and backward through the primary tabs', () => {
    expect(swipeTarget('dashboard', 'next')).toBe('schedule');
    expect(swipeTarget('spending', 'next')).toBe('goals');
    expect(swipeTarget('goals', 'prev')).toBe('spending');
  });

  // The actual reported bug: this used to return 'docs'.
  it('returns null at the end of the primary list instead of reaching Docs', () => {
    expect(swipeTarget('insights', 'next')).toBeNull();
  });

  it('returns null before the first tab', () => {
    expect(swipeTarget('dashboard', 'prev')).toBeNull();
  });

  it('returns null from an overflow tab, which has no swipe neighbour', () => {
    // Reached via the More sheet; silently jumping into the primary list would
    // be surprising, so the gesture does nothing.
    expect(swipeTarget('docs', 'next')).toBeNull();
    expect(swipeTarget('settings', 'prev')).toBeNull();
  });

  it('never yields a tab without a nav slot, from any starting point', () => {
    for (const from of TAB_ORDER) {
      for (const dir of ['next', 'prev'] as const) {
        const to = swipeTarget(from, dir);
        if (to !== null) expect(OVERFLOW_TAB_IDS).not.toContain(to);
      }
    }
  });
});

describe('no second declaration of tab order', () => {
  it('App.vue imports the shared order rather than declaring its own', () => {
    const app = read('src/App.vue');
    expect(app).toContain("from '@/lib/tabs'");
    // The inline literal that drifted from BottomNav.
    expect(app).not.toMatch(/const TAB_ORDER\s*:\s*TabId\[\]\s*=\s*\[/);
  });

  it('BottomNav imports the shared overflow list rather than declaring its own', () => {
    const nav = read('src/components/ui/BottomNav.vue');
    expect(nav).toContain('OVERFLOW_TAB_IDS');
    expect(nav).not.toMatch(/const OVERFLOW_IDS\s*:\s*TabId\[\]\s*=\s*\['docs'/);
  });
});
