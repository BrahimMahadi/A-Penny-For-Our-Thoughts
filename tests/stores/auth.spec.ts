/**
 * Module:   tests/stores/auth.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 25 — Supabase Auth)
 * Summary:  Unit tests for src/stores/auth.ts.
 *
 *           Strategy:
 *             - Mock the Supabase client (auth methods only).
 *             - Mock isSupabaseConfigured() to control the configured/
 *               unconfigured code paths.
 *             - Mock useBudgetStore so we can verify initStore /
 *               resetStore calls without importing the full budget store.
 *             - All Supabase calls are synchronous mocks — no network.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// ─── Mocks ─────────────────────────────────────────────────────────

const {
  mockOnAuthStateChange,
  mockSignInWithOtp,
  mockSignInWithOAuth,
  mockSignOut,
  mockInitStore,
  mockResetStore,
} = vi.hoisted(() => ({
  mockOnAuthStateChange: vi.fn(),
  mockSignInWithOtp:     vi.fn().mockResolvedValue({ error: null }),
  mockSignInWithOAuth:   vi.fn().mockResolvedValue({ error: null }),
  mockSignOut:           vi.fn().mockResolvedValue({ error: null }),
  mockInitStore:         vi.fn().mockResolvedValue(undefined),
  mockResetStore:        vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      signInWithOtp:     mockSignInWithOtp,
      signInWithOAuth:   mockSignInWithOAuth,
      signOut:           mockSignOut,
    },
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('@/stores/budget', () => ({
  useBudgetStore: vi.fn().mockReturnValue({
    initStore:  mockInitStore,
    resetStore: mockResetStore,
  }),
}));

import { useAuthStore } from '@/stores/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

// ─── Helpers ───────────────────────────────────────────────────────

/** Simulate onAuthStateChange firing with a given event and session. */
function fireAuthChange(
  session: { user: { id: string; email: string } } | null,
  event = 'SIGNED_IN',
): void {
  const callback = mockOnAuthStateChange.mock.calls[0]?.[0];
  if (callback) callback(event, session);
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
  });

  // ── init() ─────────────────────────────────────────────────────

  describe('init()', () => {
    it('registers onAuthStateChange when Supabase is configured', async () => {
      const auth = useAuthStore();
      await auth.init();
      expect(mockOnAuthStateChange).toHaveBeenCalledOnce();
    });

    it('sets user and calls initStore when session exists', async () => {
      const auth = useAuthStore();
      await auth.init();

      fireAuthChange({ user: { id: 'uid-1', email: 'user@example.com' } });
      await Promise.resolve(); // flush microtasks

      expect(auth.user?.email).toBe('user@example.com');
      expect(mockInitStore).toHaveBeenCalledWith('uid-1');
    });

    it('sets loading to false after auth state resolves', async () => {
      const auth = useAuthStore();
      expect(auth.loading).toBe(true);

      await auth.init();
      fireAuthChange(null);
      await Promise.resolve();

      expect(auth.loading).toBe(false);
    });

    it('sets user to null and calls resetStore on SIGNED_OUT', async () => {
      const auth = useAuthStore();
      await auth.init();

      // Supabase fires SIGNED_OUT (not SIGNED_IN with null) when the user
      // explicitly signs out. resetStore should only be triggered in this case
      // to avoid inadvertently clearing local data on a simple page load with
      // no active session.
      fireAuthChange(null, 'SIGNED_OUT');
      await Promise.resolve();

      expect(auth.user).toBeNull();
      expect(mockResetStore).toHaveBeenCalledOnce();
    });

    it('skips Supabase and calls initStore with empty userId when not configured', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
      const auth = useAuthStore();
      await auth.init();

      expect(mockOnAuthStateChange).not.toHaveBeenCalled();
      expect(mockInitStore).toHaveBeenCalledWith('');
      expect(auth.loading).toBe(false);
    });
  });

  // ── signInWithMagicLink() ───────────────────────────────────────

  describe('signInWithMagicLink()', () => {
    it('calls signInWithOtp with the email and a redirectTo', async () => {
      const auth = useAuthStore();
      await auth.signInWithMagicLink('hello@example.com');

      expect(mockSignInWithOtp).toHaveBeenCalledOnce();
      const args = mockSignInWithOtp.mock.calls[0][0];
      expect(args.email).toBe('hello@example.com');
      expect(args.options?.emailRedirectTo).toContain('localhost');
    });

    it('sets magicLinkSent to true on success', async () => {
      const auth = useAuthStore();
      await auth.signInWithMagicLink('hello@example.com');
      expect(auth.magicLinkSent).toBe(true);
    });

    it('sets error and leaves magicLinkSent false when Supabase returns an error', async () => {
      mockSignInWithOtp.mockResolvedValueOnce({ error: { message: 'Rate limited' } });
      const auth = useAuthStore();
      await auth.signInWithMagicLink('bad@example.com');

      expect(auth.error).toBe('Rate limited');
      expect(auth.magicLinkSent).toBe(false);
    });
  });

  // ── signInWithGoogle() ──────────────────────────────────────────

  describe('signInWithGoogle()', () => {
    it('calls signInWithOAuth with provider google and a redirectTo', async () => {
      const auth = useAuthStore();
      await auth.signInWithGoogle();

      expect(mockSignInWithOAuth).toHaveBeenCalledOnce();
      const args = mockSignInWithOAuth.mock.calls[0][0];
      expect(args.provider).toBe('google');
      expect(args.options?.redirectTo).toContain('localhost');
    });

    it('sets error when OAuth returns an error', async () => {
      mockSignInWithOAuth.mockResolvedValueOnce({ error: { message: 'OAuth failed' } });
      const auth = useAuthStore();
      await auth.signInWithGoogle();
      expect(auth.error).toBe('OAuth failed');
    });
  });

  // ── signOut() ───────────────────────────────────────────────────

  describe('signOut()', () => {
    it('calls supabase.auth.signOut', async () => {
      const auth = useAuthStore();
      await auth.signOut();
      expect(mockSignOut).toHaveBeenCalledOnce();
    });
  });

  // ── clearError() ────────────────────────────────────────────────

  describe('clearError()', () => {
    it('clears error and magicLinkSent', async () => {
      const auth = useAuthStore();
      auth.error = 'some error';
      auth.magicLinkSent = true;
      auth.clearError();
      expect(auth.error).toBeNull();
      expect(auth.magicLinkSent).toBe(false);
    });
  });

  // ── getters ─────────────────────────────────────────────────────

  describe('getters', () => {
    it('isAuthenticated is false when user is null', () => {
      const auth = useAuthStore();
      expect(auth.isAuthenticated).toBe(false);
    });

    it('userInitial is first letter of email, uppercased', () => {
      const auth = useAuthStore();
      auth.user = { id: 'x', email: 'brahim@example.com' } as never;
      expect(auth.userInitial).toBe('B');
    });

    it('userEmail returns the user email', () => {
      const auth = useAuthStore();
      auth.user = { id: 'x', email: 'brahim@example.com' } as never;
      expect(auth.userEmail).toBe('brahim@example.com');
    });

    it('userInitial is "?" when user is null', () => {
      const auth = useAuthStore();
      expect(auth.userInitial).toBe('?');
    });
  });
});
