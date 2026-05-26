/**
 * Module:   lib/supabase.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 24 — Supabase DB Integration)
 * Modified: May 2026 — Sprint 25 (Auth): anon key, session persistence on,
 *           DEV_USER_ID removed (user_id now comes from auth.uid()).
 *           May 2026 — fix/dev-auth-bypass: VITE_DISABLE_AUTH escape hatch.
 * Summary:  Typed Supabase client singleton.
 *
 *           The anon key is safe to expose in client-side code — Supabase's
 *           Row Level Security policies (enabled in Sprint 25 migration 002)
 *           ensure each user can only access their own rows.
 *
 *           Local dev bypass: set VITE_DISABLE_AUTH=true in
 *           .env.development.local to skip the auth gate entirely and
 *           go straight to the localStorage-backed app shell.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// ─── Env vars ──────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn(
    '[penny] Supabase env vars missing. ' +
    'Copy .env.example → .env.local and fill in your project credentials. ' +
    'The app will fall back to localStorage until they are set.',
  );
} else {
  // Log enough to verify the correct project is wired up without
  // exposing the full anon key (first 20 chars of URL is sufficient).
  console.info(
    `[penny] Supabase configured → ${SUPABASE_URL.slice(0, 40)}…`,
  );
}

// ─── Client ────────────────────────────────────────────────────────

/**
 * Typed Supabase client. Import this wherever you need DB access.
 * Never create a second instance — always use this singleton.
 */
export const supabase = createClient<Database>(
  SUPABASE_URL ?? 'https://placeholder.supabase.co',
  SUPABASE_KEY ?? 'placeholder',
  {
    auth: {
      // Session is stored in localStorage so the user stays signed in
      // across page refreshes and browser restarts.
      persistSession:   true,
      autoRefreshToken: true,
    },
  },
);

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * True when Supabase credentials are present and the client is usable.
 *
 * Returns `false` (bypassing the auth gate) when VITE_DISABLE_AUTH=true
 * is set — intended only for local development / testing. The app then
 * falls back to pure localStorage mode with no login required.
 */
export function isSupabaseConfigured(): boolean {
  // Local dev escape hatch — never set this in production.
  if (import.meta.env.VITE_DISABLE_AUTH === 'true') return false;

  return (
    !!import.meta.env.VITE_SUPABASE_URL &&
    !!import.meta.env.VITE_SUPABASE_ANON_KEY
  );
}
