/**
 * Sprint 0 sanity test — confirms the test infrastructure is wired.
 * Real test suites land in Sprint 1 (stores, utils, composables).
 */

import { describe, it, expect } from 'vitest';

describe('test infrastructure', () => {
  it('vitest runs', () => {
    expect(1 + 1).toBe(2);
  });

  it('jsdom is available (window exists)', () => {
    expect(typeof window).toBe('object');
  });
});
