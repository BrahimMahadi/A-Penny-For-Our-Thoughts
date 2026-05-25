/**
 * Module:   stores/auth.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 25 — Supabase Auth)
 * Summary:  Pinia store for authentication state.
 *
 *           Responsibilities:
 *             - Track the current Supabase user (User | null)
 *             - Manage the loading state during initial session resolution
 *             - Expose sign-in (magic link, Google OAuth) and sign-out actions
 *             - Bridge to useBudgetStore: triggers initStore on sign-in,
 *               resetStore on sign-out
 *
 *           When Supabase is not configured (no env vars), the store
 *           immediately resolves as "not loading, no user" and the app
 *           falls through to the localStorage-only path in budget.ts.
 */

import { defineStore } from 'pinia';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useBudgetStore } from '@/stores/budget';
import type { User } from '@supabase/supabase-js';

/**
 * Module-level session tracker.
 *
 * onAuthStateChange fires for INITIAL_SESSION, SIGNED_IN, and potentially
 * other events in quick succession when the Supabase client reconciles a
 * cached session at startup.  Each would trigger a full DB sync (18 parallel
 * queries).  Tracking the last user-ID we synced for means initStore is
 * called **at most once per user per page load**, no matter how many events
 * the library emits.
 *
 * Reset to null on SIGNED_OUT so the next sign-in always triggers a fresh sync.
 */
let _syncedForUserId: string | null = null;

export const useAuthStore = defineStore('auth', {

  // ─── State ────────────────────────────────────────────────────

  state: () => ({
    /** Currently authenticated Supabase user. Null when signed out. */
    user:          null as User | null,

    /**
     * True while the initial session check is in flight.
     * The app renders a loading spinner until this is false.
     */
    loading:       true,

    /** Last sign-in error message (null when none). */
    error:         null as string | null,

    /**
     * Set to true after a magic-link email is dispatched successfully.
     * Causes the LoginPage to show the "check your inbox" confirmation.
     */
    magicLinkSent: false,
  }),

  // ─── Getters ──────────────────────────────────────────────────

  getters: {
    isAuthenticated: (state): boolean => !!state.user,

    /** User's email address, or null when signed out. */
    userEmail: (state): string | null => state.user?.email ?? null,

    /** First letter of email (upper-cased) for the avatar chip. */
    userInitial: (state): string =>
      state.user?.email?.charAt(0).toUpperCase() ?? '?',
  },

  // ─── Actions ──────────────────────────────────────────────────

  actions: {

    /**
     * Bootstrap auth. Must be called once on app startup (main.ts).
     *
     * When Supabase is configured:
     *   - Registers onAuthStateChange which fires (usually immediately) with
     *     the current session (INITIAL_SESSION event).
     *   - On SIGNED_IN  → sets user, triggers budgetStore.initStore(userId)
     *   - On SIGNED_OUT → clears user, triggers budgetStore.resetStore()
     *   - A 10-second safety timer forces loading=false if Supabase never
     *     responds (e.g. network is down or the token-refresh request hangs).
     *
     * When Supabase is NOT configured (no env vars):
     *   - Budget store is initialised from localStorage immediately.
     *   - loading is set to false; user stays null.
     *   - App.vue skips the auth gate in this case.
     */
    async init(): Promise<void> {
      if (!isSupabaseConfigured()) {
        // No Supabase — load from localStorage directly
        useBudgetStore().initStore('');
        this.loading = false;
        return;
      }

      // Safety net: Supabase's onAuthStateChange fires *after* it finishes
      // resolving / refreshing the stored session.  If that network request
      // hangs (server unreachable, cold-start timeout, flaky Wi-Fi) the
      // callback never runs and auth.loading stays true forever, showing a
      // permanent loading spinner.
      //
      // This timer gives Supabase 10 seconds.  If loading is still true at
      // that point we fall back to localStorage so the app is usable.
      // When Supabase eventually responds the callback will still fire,
      // update auth.user, and re-hydrate data from the cloud.
      const safetyTimer = setTimeout(() => {
        if (!this.loading) return; // resolved normally — nothing to do
        console.warn(
          '[penny] Auth init timed out after 10 s — ' +
          'falling back to localStorage. Supabase may be unreachable.',
        );
        useBudgetStore().loadFromStorage();
        this.loading = false;
      }, 10_000);

      supabase.auth.onAuthStateChange(async (event, session) => {
        clearTimeout(safetyTimer); // session resolved in time — cancel fallback
        const budgetStore = useBudgetStore();

        // Resolve auth state immediately so the loading spinner clears and
        // the app shell (or login page) renders without waiting for the
        // Supabase DB fetch (which can take several seconds on a cold start).
        if (session?.user) {
          this.user = session.user;
        } else {
          this.user = null;
        }
        this.loading = false;

        // Sync budget data at most once per user per page-load session.
        //
        // onAuthStateChange fires for EVERY auth lifecycle event:
        //   INITIAL_SESSION  — page load (restored session or null)
        //   SIGNED_IN        — after OTP/OAuth exchange
        //   TOKEN_REFRESHED  — silent token rotation (every ~1 h, or at startup
        //                      when the stored token is close to expiry)
        //   USER_UPDATED     — profile metadata changes
        //   SIGNED_OUT       — explicit sign-out
        //
        // A user with both magic-link and Google OAuth linked to the same email
        // can trigger INITIAL_SESSION + SIGNED_IN + TOKEN_REFRESHED all within
        // a few seconds of each other on page load.  Each would fire 18 parallel
        // Supabase queries, overwhelming the free-tier PgBouncer pool (60 conns)
        // and causing the Supabase JS client's internal request queue to back up,
        // which made our 5-second auth probe time out.
        //
        // Fix: _syncedForUserId records which user ID we last called initStore
        // for.  Any subsequent event for the same user is a no-op — auth.user
        // and auth.loading are already correct, and the data is already synced.

        if (session?.user && _syncedForUserId !== session.user.id) {
          _syncedForUserId = session.user.id;
          await budgetStore.initStore(session.user.id);
        } else if (session?.user) {
          // Same user, already synced — nothing to do.
          console.info('[penny] onAuthStateChange: already synced for this user — skipping');
        } else if (event === 'SIGNED_OUT') {
          _syncedForUserId = null;
          budgetStore.resetStore();
        }
      });
    },

    /**
     * Send a one-time magic-link email. The Supabase client handles
     * the token exchange automatically when the user returns to the app.
     */
    async signInWithMagicLink(email: string): Promise<void> {
      this.error         = null;
      this.magicLinkSent = false;

      // redirectTo must match an allowed URL in Supabase → Auth → URL Configuration
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        this.error = error.message;
      } else {
        this.magicLinkSent = true;
      }
    },

    /**
     * Initiate Google OAuth. The browser is redirected to Google, then
     * back to redirectTo where Supabase exchanges the code via PKCE.
     */
    async signInWithGoogle(): Promise<void> {
      this.error = null;

      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options:  { redirectTo },
      });

      if (error) this.error = error.message;
    },

    /**
     * Sign the current user out.
     *
     * Optimistic: local state is cleared immediately so the UI transitions
     * to the login screen without any network delay.  The Supabase session
     * revocation is fired non-blocking — if it fails we log it but the user
     * is already "signed out" locally.
     *
     * Clearing _syncedForUserId + calling budgetStore.resetStore() (which
     * sets _userId = '') before the network call also suppresses the
     * "cloud sync failed" toast that would otherwise appear when the
     * in-flight initStore fetch is rejected because the session was revoked.
     */
    signOut(): void {
      // 1. Clear local auth state immediately
      this.user  = null;
      this.error = null;
      _syncedForUserId = null;

      // 2. Clear budget state immediately (also sets _userId = '')
      useBudgetStore().resetStore();

      // 3. Revoke the Supabase session in the background
      supabase.auth.signOut().catch((err: Error) =>
        console.warn('[penny] Sign-out error:', err.message),
      );
    },

    clearError(): void {
      this.error = null;
      this.magicLinkSent = false;
    },
  },
});
