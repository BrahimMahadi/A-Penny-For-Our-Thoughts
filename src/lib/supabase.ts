/**
 * Module:   lib/supabase.ts
 * Project:  A Penny For Our Thoughts
 * Created:  May 2026 (Sprint 23 — Supabase DB Integration)
 * Summary:  Typed Supabase client singleton.
 *
 *           Sprint 23 (DB only, no auth):
 *             - Uses the service-role key so RLS is bypassed during dev.
 *             - DEV_USER_ID is a fixed UUID from .env.local that is written
 *               to every row's `user_id` column so the schema is correct
 *               from day one.
 *
 *           Sprint 24 (auth):
 *             - Replace VITE_SUPABASE_SERVICE_KEY → VITE_SUPABASE_ANON_KEY.
 *             - Remove DEV_USER_ID; derive user_id from auth.uid() instead.
 *             - Enable RLS policies in Supabase dashboard.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// ─── Env vars ──────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * Sprint 23 dev: service key bypasses RLS.
 * Sprint 24: swap to VITE_SUPABASE_ANON_KEY.
 */
const SUPABASE_KEY = (
  import.meta.env.VITE_SUPABASE_SERVICE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY
) as string;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn(
    '[penny] Supabase env vars missing. ' +
    'Copy .env.example → .env.local and fill in your project credentials. ' +
    'The app will fall back to localStorage until they are set.',
  );
}

// ─── Client ────────────────────────────────────────────────────────

/**
 * Typed Supabase client. Import this wherever you need DB access.
 * Never create a second instance — always use this singleton.
 */
export const supabase = createClient<Database>(
  SUPABASE_URL  ?? 'https://placeholder.supabase.co',
  SUPABASE_KEY  ?? 'placeholder',
  {
    auth: {
      // Sprint 23: no session persistence needed (no real auth yet)
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

// ─── Dev user ID ───────────────────────────────────────────────────

/**
 * Fixed UUID used as `user_id` for every row during Sprint 23 dev.
 * Will be replaced by `(await supabase.auth.getUser()).data.user?.id`
 * once Sprint 24 auth is wired up.
 */
export const DEV_USER_ID: string =
  import.meta.env.VITE_DEV_USER_ID ?? '00000000-0000-0000-0000-000000000000';

// ─── Helpers ───────────────────────────────────────────────────────

/** True when Supabase credentials are present and the client is usable. */
export function isSupabaseConfigured(): boolean {
  return (
    !!import.meta.env.VITE_SUPABASE_URL &&
    !!(import.meta.env.VITE_SUPABASE_SERVICE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY)
  );
}
