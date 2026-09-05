/**
 * Module:   tests/css/mobileForms.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  September 2026 (BUG-041)
 * Summary:  Guards the iOS auto-zoom floor for form controls.
 *
 *           jsdom does not resolve the cascade across scoped SFC styles, so
 *           these assert the RULE's existence and shape rather than computed
 *           font sizes. The computed values were verified in a real browser at
 *           375px: every field in Add Purchase and Log Income measured 16px
 *           after the fix, and 0 sub-16px controls remained across all five
 *           tabs (they were 14.4px and 13.6px before).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const responsive = readFileSync(resolve(root, 'src/css/responsive.css'), 'utf8');

/** The safety-net block appended at the end of responsive.css. */
const floorBlock = responsive.slice(responsive.indexOf('BUG-041'));

describe('iOS auto-zoom floor (BUG-041)', () => {
  it('declares a 16px floor for text-entry controls on mobile', () => {
    expect(floorBlock).toContain('font-size: 16px !important');
  });

  it('applies the floor at the mobile breakpoint', () => {
    expect(floorBlock).toMatch(/@media\s*\(max-width:\s*768px\)/);
  });

  it('covers select and textarea, not just input', () => {
    // A select under 16px zooms exactly like a text input; the Add Purchase
    // category and card pickers were both offenders.
    expect(floorBlock).toMatch(/\bselect\b/);
    expect(floorBlock).toMatch(/\btextarea\b/);
  });

  it('exempts controls that do not trigger zoom', () => {
    // Checkboxes/radios/ranges must keep their own sizing — forcing 16px on
    // them would break the 18px box sizing set elsewhere.
    for (const t of ['checkbox', 'radio', 'range']) {
      expect(floorBlock).toContain(`:not([type="${t}"])`);
    }
  });

  it('keeps !important — scoped component classes outrank a bare selector', () => {
    // Every control is styled by a scoped class (.mf-input, .form-input,
    // .oti-form__input, …) compiling to .cls[data-v-hash] (0,2,0), which beats
    // a bare `input` (0,0,1). Without !important the floor silently loses.
    expect(floorBlock).toContain('!important');
  });
});

describe('swipe navigation removal (v2.47.2)', () => {
  const app = readFileSync(resolve(root, 'src/App.vue'), 'utf8');

  it('App.vue no longer wires a swipe gesture', () => {
    // Match code, not prose: App.vue keeps a comment naming the deleted
    // composable to explain why the feature is gone, and that comment is
    // worth keeping.
    expect(app).not.toMatch(/import\s*\{[^}]*useGsapObserver/);
    expect(app).not.toMatch(/useGsapObserver\s*\(/);
    expect(app).not.toMatch(/onSwipeLeft\s*:/);
  });

  it('the observer composable is gone, not merely unused', () => {
    // Leaving it in place invites it being re-wired without the conflict
    // analysis that led to removing it.
    expect(() => readFileSync(resolve(root, 'src/composables/useGsapObserver.ts')))
      .toThrow();
  });
});
