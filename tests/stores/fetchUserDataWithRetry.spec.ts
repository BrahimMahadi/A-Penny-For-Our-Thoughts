/**
 * Module:   tests/stores/fetchUserDataWithRetry.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint RS-30 — Supabase fetch reliability)
 * Summary:  Unit tests for the RS-30 retry helper that wraps
 *           `fetchAllUserData` with one automatic retry on timeout.
 *
 *           The helper lives in src/stores/budget.ts and is exported
 *           solely so this spec can exercise the retry decision matrix
 *           without mounting Pinia or the supabase client.
 *
 *           Test strategy: mock `fetchAllUserData` directly at the module
 *           level so each "call" to the underlying fetch is controllable
 *           in isolation. Using fake timers to fast-forward through the
 *           backoff would mean orchestrating dozens of supabase mocks per
 *           attempt — mocking the top-level fetch is much cleaner.
 *
 *           Decision matrix covered:
 *             first try success                      → no retry, returns data
 *             first try null (new user)              → no retry, returns null
 *             first try timeout, retry success       → returns data
 *             first try timeout, retry timeout       → throws (caller handles)
 *             first try non-timeout error            → throws immediately
 *             first try non-timeout error variants   → no retry path
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock fetchAllUserData at the @/lib/db module level ────────────
// vi.hoisted lets the spy be referenced from the vi.mock factory.
const { mockFetchAllUserData } = vi.hoisted(() => ({
  mockFetchAllUserData: vi.fn(),
}));

vi.mock('@/lib/db', async () => {
  // Spread the real module so the budget store still gets `db`, `upsertProfile`,
  // `deleteAllUserData`, etc. — only `fetchAllUserData` is intercepted.
  const real = await vi.importActual<typeof import('@/lib/db')>('@/lib/db');
  return {
    ...real,
    fetchAllUserData: mockFetchAllUserData,
  };
});

// Also need a benign supabase mock so the module load doesn't blow up.
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  DEV_USER_ID: 'test-user-uuid',
  isSupabaseConfigured: () => true,
}));

// Import AFTER mocks are registered
import { fetchUserDataWithRetry, withTimeout } from '@/stores/budget';
import type { BudgetState } from '@/types/state';

// ─── Helpers ──────────────────────────────────────────────────────

/** Build the timeout-error shape that `withTimeout` produces. */
function timeoutError(ms = 50): Error {
  return new Error(`[penny] DB fetch timed out after ${ms} ms`);
}

/** Build a hanging promise that never resolves — used to trip `withTimeout`. */
function neverResolves<T>(): Promise<T> {
  return new Promise<T>(() => { /* intentional */ });
}

/** Fixture: a non-null BudgetState slice good enough for the retry tests. */
const happyData: Partial<BudgetState> = {
  allocation: { needs: 50, wants: 30, savings: 20 },
};

beforeEach(() => {
  mockFetchAllUserData.mockReset();
});

afterEach(() => {
  // Drain any scheduled fake timers BEFORE switching back to real ones —
  // a stray `setTimeout` from `withTimeout` would otherwise fire after the
  // test ends and surface as an "unhandled rejection" warning.
  vi.clearAllTimers();
  vi.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────
//  withTimeout (pure helper)
// ─────────────────────────────────────────────────────────────────
describe('withTimeout', () => {
  it('resolves when the promise settles before the deadline', async () => {
    const p = Promise.resolve('ok');
    await expect(withTimeout(p, 1_000)).resolves.toBe('ok');
  });

  it('rejects with a timeout error when the promise stalls past the deadline', async () => {
    vi.useFakeTimers();
    const racing = withTimeout(neverResolves<string>(), 50);
    // Attach the catch synchronously BEFORE advancing timers — otherwise
    // the setTimeout-driven rejection can fire before the .rejects matcher
    // is installed, producing an "unhandled rejection" cleanup warning.
    const settled = racing.catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(51);
    const err = await settled;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/timed out after 50 ms/);
  });

  it('preserves the original error when the promise rejects before the deadline', async () => {
    const p = Promise.reject(new Error('original failure'));
    await expect(withTimeout(p, 1_000)).rejects.toThrow('original failure');
  });
});

// ─────────────────────────────────────────────────────────────────
//  fetchUserDataWithRetry — first-try success
// ─────────────────────────────────────────────────────────────────
describe('fetchUserDataWithRetry — first-try success', () => {
  it('returns data without retrying when the first call succeeds', async () => {
    mockFetchAllUserData.mockResolvedValueOnce(happyData);

    const result = await fetchUserDataWithRetry('uid');
    expect(result).toEqual(happyData);
    expect(mockFetchAllUserData).toHaveBeenCalledTimes(1);
  });

  it('returns null without retrying when no profile row exists (first-run user)', async () => {
    mockFetchAllUserData.mockResolvedValueOnce(null);

    const result = await fetchUserDataWithRetry('uid');
    expect(result).toBeNull();
    expect(mockFetchAllUserData).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────
//  fetchUserDataWithRetry — timeout path
// ─────────────────────────────────────────────────────────────────
describe('fetchUserDataWithRetry — timeout path', () => {
  it('retries once after a timeout, succeeds on the retry', async () => {
    vi.useFakeTimers();

    // First call: hangs forever (the timeout fires)
    // Second call: returns happy data
    mockFetchAllUserData
      .mockReturnValueOnce(neverResolves())
      .mockResolvedValueOnce(happyData);

    const promise = fetchUserDataWithRetry('uid', { timeoutMs: 50, retryDelayMs: 100 });

    await vi.advanceTimersByTimeAsync(60);    // trip first timeout
    await vi.advanceTimersByTimeAsync(100);   // pass through the backoff
    await vi.runAllTimersAsync();             // let the retry settle

    const result = await promise;
    expect(result).toEqual(happyData);
    expect(mockFetchAllUserData).toHaveBeenCalledTimes(2);
  });

  it('throws when both attempts time out', async () => {
    vi.useFakeTimers();

    mockFetchAllUserData
      .mockReturnValueOnce(neverResolves())
      .mockReturnValueOnce(neverResolves());

    const promise = fetchUserDataWithRetry('uid', { timeoutMs: 50, retryDelayMs: 100 });
    // Attach the catch synchronously so timer advances don't trigger
    // an "unhandled rejection" warning before the test's await reaches it.
    const settled = promise.catch((e) => e);

    await vi.advanceTimersByTimeAsync(60);    // first timeout
    await vi.advanceTimersByTimeAsync(100);   // backoff
    await vi.advanceTimersByTimeAsync(60);    // second timeout
    await vi.runAllTimersAsync();

    const err = await settled;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/timed out/);
    expect(mockFetchAllUserData).toHaveBeenCalledTimes(2);
  });

  it('waits the configured retryDelayMs between attempts', async () => {
    vi.useFakeTimers();

    mockFetchAllUserData
      .mockReturnValueOnce(neverResolves())
      .mockResolvedValueOnce(happyData);

    const promise = fetchUserDataWithRetry('uid', { timeoutMs: 50, retryDelayMs: 500 });

    // After the first timeout fires, the retry should NOT have been invoked
    // until the configured delay elapses.
    await vi.advanceTimersByTimeAsync(60);
    expect(mockFetchAllUserData).toHaveBeenCalledTimes(1);

    // Advance halfway through the backoff — still only one call.
    await vi.advanceTimersByTimeAsync(200);
    expect(mockFetchAllUserData).toHaveBeenCalledTimes(1);

    // Now finish the backoff — the retry fires.
    await vi.advanceTimersByTimeAsync(310);
    await vi.runAllTimersAsync();
    expect(mockFetchAllUserData).toHaveBeenCalledTimes(2);

    await promise;
  });
});

// ─────────────────────────────────────────────────────────────────
//  fetchUserDataWithRetry — non-timeout errors do NOT trigger retry
// ─────────────────────────────────────────────────────────────────
describe('fetchUserDataWithRetry — non-timeout errors', () => {
  it('throws immediately on a generic error, no retry', async () => {
    mockFetchAllUserData.mockRejectedValueOnce(new Error('simulated RLS violation'));

    await expect(fetchUserDataWithRetry('uid')).rejects.toThrow('simulated RLS violation');
    expect(mockFetchAllUserData).toHaveBeenCalledTimes(1);
  });

  it('throws immediately when the underlying fetch throws synchronously, no retry', async () => {
    mockFetchAllUserData.mockImplementationOnce(() => {
      throw new Error('synthetic top-level throw');
    });

    await expect(fetchUserDataWithRetry('uid')).rejects.toThrow('synthetic top-level throw');
    expect(mockFetchAllUserData).toHaveBeenCalledTimes(1);
  });

  it('non-timeout error message must not contain the timeout marker (regression guard)', async () => {
    // If we accidentally changed `isTimeoutError` to a loose substring match
    // (e.g. just `.includes('timed')`), this generic message would falsely
    // trigger a retry. Guard against that drift.
    mockFetchAllUserData.mockRejectedValueOnce(new Error('Some other thing happened'));

    await expect(fetchUserDataWithRetry('uid')).rejects.toThrow('Some other thing happened');
    expect(mockFetchAllUserData).toHaveBeenCalledTimes(1);
  });

  it('exact timeout-marker prefix triggers retry; close-but-not-quite does not', async () => {
    vi.useFakeTimers();

    // First call: a real timeout error → should retry
    mockFetchAllUserData.mockRejectedValueOnce(timeoutError(50));
    mockFetchAllUserData.mockResolvedValueOnce(happyData);

    const promise = fetchUserDataWithRetry('uid', { timeoutMs: 50, retryDelayMs: 10 });
    await vi.advanceTimersByTimeAsync(20);
    await vi.runAllTimersAsync();
    expect(await promise).toEqual(happyData);
    expect(mockFetchAllUserData).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────────
//  fetchUserDataWithRetry — options
// ─────────────────────────────────────────────────────────────────
describe('fetchUserDataWithRetry — options', () => {
  it('respects a custom timeoutMs (smaller than default)', async () => {
    vi.useFakeTimers();
    mockFetchAllUserData.mockReturnValue(neverResolves());

    const promise = fetchUserDataWithRetry('uid', { timeoutMs: 25, retryDelayMs: 10 });
    const settled = promise.catch((e) => e);

    await vi.advanceTimersByTimeAsync(30);
    await vi.advanceTimersByTimeAsync(20);
    await vi.advanceTimersByTimeAsync(30);
    await vi.runAllTimersAsync();

    const err = await settled;
    expect((err as Error).message).toMatch(/timed out after 25 ms/);
  });
});
