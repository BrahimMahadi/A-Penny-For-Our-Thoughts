/**
 * Tests for src/utils/jsonBackup.ts
 * Covers: exportStateToJSON, parseJSONToState, triggerJSONDownload
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportStateToJSON,
  parseJSONToState,
  triggerJSONDownload,
  JSON_SCHEMA_VERSION,
} from '@/utils/jsonBackup';
import type { BudgetState } from '@/types/state';

// ─── Minimal valid state ──────────────────────────────────────────
function makeMinimalState(overrides: Partial<BudgetState> = {}): BudgetState {
  return {
    allocation: { needs: 50, wants: 30, savings: 20 },
    budgetDisplayMode: { needs: 'monthly', wants: 'monthly', savings: 'monthly' },
    incomeStreams: [],
    oneTimeIncomes: [],
    expenseCards: [],
    purchases: [],
    spendingHistory: [],
    loans: [],
    creditCards: [],
    subscriptions: [],
    wishlist: [],
    savingsAccounts: [],
    goals: [],
    assets: [],
    netWorthHistory: [],
    payStart: null,
    lastArchivedPeriodStart: null,
    rules: [],
    budgetAlerts: [],
    spendingCategories: [],
    fundsRemaining: 0,
    fundsRemainingUpdated: '',
    hasOnboarded: true,
    dismissedVersion: null,
    ...overrides,
  };
}

describe('exportStateToJSON', () => {
  it('produces valid JSON', () => {
    const state = makeMinimalState();
    const json = exportStateToJSON(state);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes schemaVersion and exportedAt', () => {
    const state = makeMinimalState();
    const parsed = JSON.parse(exportStateToJSON(state));
    expect(parsed.schemaVersion).toBe(JSON_SCHEMA_VERSION);
    expect(typeof parsed.exportedAt).toBe('string');
  });

  it('embeds the full state', () => {
    const state = makeMinimalState({ fundsRemaining: 999 });
    const parsed = JSON.parse(exportStateToJSON(state));
    expect(parsed.state.fundsRemaining).toBe(999);
  });

  it('pretty-prints with 2-space indent', () => {
    const state = makeMinimalState();
    const json = exportStateToJSON(state);
    expect(json).toContain('\n  ');
  });
});

describe('parseJSONToState', () => {
  it('returns the embedded state for a valid backup', () => {
    const state = makeMinimalState({ fundsRemaining: 42 });
    const json = exportStateToJSON(state);
    const restored = parseJSONToState(json);
    expect(restored.fundsRemaining).toBe(42);
  });

  it('throws on non-JSON input', () => {
    expect(() => parseJSONToState('not json')).toThrow('not valid JSON');
  });

  it('throws on missing schemaVersion', () => {
    const bad = JSON.stringify({ exportedAt: '2026', state: {} });
    expect(() => parseJSONToState(bad)).toThrow('missing schemaVersion');
  });

  it('throws on wrong schemaVersion', () => {
    const bad = JSON.stringify({ schemaVersion: 99, exportedAt: '2026', state: {} });
    expect(() => parseJSONToState(bad)).toThrow('Unsupported backup version');
  });

  it('throws when state field is absent', () => {
    const bad = JSON.stringify({ schemaVersion: JSON_SCHEMA_VERSION, exportedAt: '2026' });
    expect(() => parseJSONToState(bad)).toThrow('missing state object');
  });

  it('throws on non-object JSON', () => {
    expect(() => parseJSONToState('"just a string"')).toThrow('not an object');
  });

  it('round-trips allocation data correctly', () => {
    const state = makeMinimalState({ allocation: { needs: 60, wants: 25, savings: 15 } });
    const restored = parseJSONToState(exportStateToJSON(state));
    expect(restored.allocation).toEqual({ needs: 60, wants: 25, savings: 15 });
  });
});

describe('triggerJSONDownload', () => {
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // jsdom doesn't implement URL.createObjectURL / revokeObjectURL — stub them
    if (!URL.createObjectURL) {
      URL.createObjectURL = () => 'blob:mock';
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = () => undefined;
    }

    clickSpy = vi.fn();
    // Prevent real DOM manipulation; no assertions needed on this spy
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.body);
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLAnchorElement);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls click on the anchor element', () => {
    triggerJSONDownload('{}');
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('uses the provided filename', () => {
    const anchor = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    triggerJSONDownload('{}', 'my-backup.json');
    expect(anchor.download).toBe('my-backup.json');
  });

  it('defaults to penny-backup-YYYY-MM-DD.json', () => {
    const anchor = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    triggerJSONDownload('{}');
    expect(anchor.download).toMatch(/^penny-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
