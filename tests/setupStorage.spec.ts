/**
 * Module:   tests/setupStorage.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  September 2026 (BUG-037)
 * Summary:  Guards the Web Storage shim in tests/setupStorage.ts.
 *
 *           254 tests across 8 spec files broke silently when Node 26's inert
 *           global `localStorage` accessor shadowed jsdom's. These assertions
 *           fail loudly at the source instead, so a future Node or Vitest bump
 *           that reintroduces the problem is diagnosed in one file rather than
 *           read as 254 unrelated app regressions.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

describe('Web Storage test shim (BUG-037)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publishes a usable localStorage global', () => {
    expect(localStorage).toBeDefined();
    localStorage.setItem('penny_shim_probe', 'value');
    expect(localStorage.getItem('penny_shim_probe')).toBe('value');
    expect(localStorage.length).toBe(1);
    expect(localStorage.key(0)).toBe('penny_shim_probe');
  });

  it('publishes a usable sessionStorage global', () => {
    expect(sessionStorage).toBeDefined();
    sessionStorage.setItem('penny_shim_probe', 'value');
    expect(sessionStorage.getItem('penny_shim_probe')).toBe('value');
  });

  it('keeps localStorage and sessionStorage as separate stores', () => {
    localStorage.setItem('shared_key', 'local');
    sessionStorage.setItem('shared_key', 'session');
    expect(localStorage.getItem('shared_key')).toBe('local');
    expect(sessionStorage.getItem('shared_key')).toBe('session');
  });

  it('keeps the published instances in the same realm as the Storage global', () => {
    // If these diverge, `vi.spyOn(Storage.prototype, ...)` stops intercepting
    // and the quota-handling specs in stores/budget.spec.ts pass vacuously.
    expect(localStorage).toBeInstanceOf(Storage);
    expect(Object.getPrototypeOf(localStorage)).toBe(Storage.prototype);
    expect(Object.getPrototypeOf(sessionStorage)).toBe(Storage.prototype);
  });

  it('lets Storage.prototype spies intercept calls on localStorage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => localStorage.setItem('k', 'v')).toThrow('QuotaExceededError');
    expect(setItem).toHaveBeenCalledWith('k', 'v');
  });

  it('clears cleanly between tests', () => {
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
