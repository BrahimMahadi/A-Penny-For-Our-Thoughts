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
     *   - Registers onAuthStateChange which fires immediately with the
     *     current session (INITIAL_SESSION event), so no separate
     *     getSession() call is required.
     *   - On SIGNED_IN  → sets user, triggers budgetStore.initStore(userId)
     *   - On SIGNED_OUT → clears user, triggers budgetStore.resetStore()
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

      // onAuthStateChange always fires synchronously on subscription with
      // the INITIAL_SESSION event, making it the single source of truth
      // for both the initial state and all subsequent transitions.
      supabase.auth.onAuthStateChange(async (_event, session) => {
        const budgetStore = useBudgetStore();

        if (session?.user) {
          this.user = session.user;
          await budgetStore.initStore(session.user.id);
        } else {
          this.user = null;
          budgetStore.resetStore();
        }

        // Always clear the loading state after the first event fires
        this.loading = false;
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
     * Sign the current user out. Supabase clears the session; the
     * onAuthStateChange handler resets the budget store.
     */
    async signOut(): Promise<void> {
      const { error } = await supabase.auth.signOut();
      if (error) console.warn('[penny] Sign-out error:', error.message);
      // onAuthStateChange → SIGNED_OUT handles user/budget store reset
    },

    clearError(): void {
      this.error = null;
      this.magicLinkSent = false;
    },
  },
});
