/**
 * Module:   tests/css/bottomNav.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  November 2026 (BUG-043)
 * Summary:  Guards the bottom nav's horizontal breathing room on notched,
 *           round-cornered phones.
 *
 *           BUG-043: `.bottom-nav` spanned left:0 → right:0 with no horizontal
 *           padding and no left/right safe-area inset, so on an iPhone 17 the
 *           first and last tabs sat under the rounded display corners. At the
 *           same time the six 9px uppercase captions had to share a 393px
 *           viewport — "DASHBOARD" measured 61px inside a 60.9px slot and
 *           clipped. Measured in a real 393x852 viewport: slack went from
 *           -0.1px on the tightest tab to +8.2px, and no tab touches the
 *           display edge.
 *
 *           jsdom does not resolve the cascade across scoped SFC styles, so
 *           these assert the RULE's shape, as mobileForms.spec.ts does.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import BottomNav from '@/components/ui/BottomNav.vue';
import { vPress } from '@/directives/vPress';

const mountNav = () => mount(BottomNav, { global: { directives: { press: vPress } } });

const root = resolve(__dirname, '../..');
const read = (rel: string): string => readFileSync(resolve(root, rel), 'utf8');

const sfc = read('src/components/ui/BottomNav.vue');
const appVue = read('src/App.vue');

/** The scoped <style> block, so markup strings cannot satisfy a CSS assertion. */
const styles = sfc.slice(sfc.indexOf('<style scoped>'));

describe('bottom nav horizontal insets (BUG-043)', () => {
  it('pads the bar away from the display edge on both sides', () => {
    // max() keeps an 8px gutter in portrait, where the inset resolves to 0,
    // and defers to the real inset (~44px) in landscape.
    expect(styles).toMatch(
      /padding-left:\s*max\(\s*8px\s*,\s*env\(safe-area-inset-left[^)]*\)\s*\)/,
    );
    expect(styles).toMatch(
      /padding-right:\s*max\(\s*8px\s*,\s*env\(safe-area-inset-right[^)]*\)\s*\)/,
    );
  });

  it('keeps the bottom safe-area inset it already had', () => {
    expect(styles).toMatch(/padding-bottom:\s*env\(safe-area-inset-bottom[^)]*\)/);
  });

  it('lets a tab shrink below its content width', () => {
    // Without min-width: 0 a flex child refuses to shrink past its content,
    // which is what pushed a long caption past its slot.
    expect(styles).toMatch(/\.bottom-nav__btn\s*\{[^}]*min-width:\s*0/s);
  });

  it('keeps captions on one line', () => {
    expect(styles).toMatch(/\.bottom-nav__label\s*\{[^}]*white-space:\s*nowrap/s);
  });

  it('reclaims gutter and tracking on narrow phones', () => {
    // At 320px each slot is ~53px and "SCHEDULE" overflowed by 1.3px even with
    // the 8px gutter. Reclaimed from padding and letter-spacing, not font-size:
    // 9px is already the floor for a legible uppercase caption.
    const narrow = styles.slice(styles.indexOf('@media (max-width: 360px)'));
    expect(narrow).toMatch(/padding-left:\s*max\(\s*4px\s*,\s*env\(safe-area-inset-left/);
    expect(narrow).toMatch(/padding-right:\s*max\(\s*4px\s*,\s*env\(safe-area-inset-right/);
    expect(narrow).toMatch(/letter-spacing:\s*0\s*;/);
  });

  it('reserves page bottom padding that clears the 58px bar', () => {
    // If the bar grows and this reserve does not, the last card slides under it.
    const mobileBlock = appVue.slice(appVue.indexOf('@media (max-width: 768px)'));
    expect(mobileBlock).toMatch(
      /padding:\s*1\.25rem\s+1rem\s+calc\(60px\s*\+\s*env\(safe-area-inset-bottom/,
    );
  });
});

describe('bottom nav captions (BUG-043)', () => {
  beforeEach(() => { setActivePinia(createPinia()); });

  it('renders the short caption but keeps the full accessible name', () => {
    const w = mountNav();
    const dashboard = w.findAll('.bottom-nav__btn')
      .find(b => b.attributes('aria-label') === 'Dashboard');

    expect(dashboard).toBeDefined();
    expect(dashboard!.find('.bottom-nav__label').text()).toBe('Home');
  });

  it('keeps every other tab on its full name', () => {
    const w = mountNav();
    const captions = w.findAll('.bottom-nav__btn').map(b => ({
      aria: b.attributes('aria-label'),
      text: b.find('.bottom-nav__label').text(),
    }));

    for (const c of captions) {
      if (c.aria === 'Dashboard') continue;
      if (c.aria === 'More sections') { expect(c.text).toBe('More'); continue; }
      expect(c.text).toBe(c.aria);
    }
  });

  it('caps every visible caption at 8 characters', () => {
    // The empirical ceiling for a 9px uppercase caption in a ~60px slot at
    // 393px. "Dashboard" (9) was the one offender.
    const w = mountNav();
    for (const btn of w.findAll('.bottom-nav__btn')) {
      expect(btn.find('.bottom-nav__label').text().length).toBeLessThanOrEqual(8);
    }
  });
});
