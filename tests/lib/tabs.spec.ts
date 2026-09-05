/**
 * Module:   tests/lib/tabs.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  September 2026 (BUG-039)
 * Summary:  Guards the single source of truth for tab order.
 *
 *           BUG-039: App.vue and BottomNav each declared the tab list and
 *           drifted after MOBILE-4's 5+More split. Swipe navigation has since
 *           been removed (v2.47.2), but the drift risk has not gone with it:
 *           App.vue still reads TAB_ORDER for the page-transition direction and
 *           BottomNav still reads the primary/overflow split for its slots.
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

  it('never lists an overflow tab among the primary ones', () => {
    for (const id of PRIMARY_TAB_ORDER) expect(isOverflowTab(id)).toBe(false);
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
