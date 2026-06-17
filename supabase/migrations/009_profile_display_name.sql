-- ─────────────────────────────────────────────────────────────────────────────
-- Migration:  009_profile_display_name.sql
-- Project:    A Penny For Our Thoughts
-- Created:    June 2026 (feat/user-display-name — v2.45.0)
-- Summary:    Adds display_name to the profiles table so the user's name
--             survives sign-out and powers the dashboard greeting
--             ("Welcome back, {display_name}").
--
--             Stored as a non-null text column defaulting to '' (empty =
--             "no name set", greeting falls back to a bare "Welcome back").
--             No RLS change needed — profiles already has a per-user policy.
--
--             The fetch_user_data RPC serialises the profile row with
--             `to_jsonb(p)` (see 006_fetch_user_data_rpc.sql), so the new
--             column is included automatically — no RPC recreation required
--             (same pattern as 008_income_stream_order.sql).
-- ─────────────────────────────────────────────────────────────────────────────

alter table profiles
  add column if not exists display_name text not null default '';

-- Notify PostgREST to pick up the new column immediately
notify pgrst, 'reload schema';
