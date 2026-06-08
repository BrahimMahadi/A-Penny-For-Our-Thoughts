-- ─────────────────────────────────────────────────────────────────────────────
-- Migration:  008_income_stream_order.sql
-- Project:    A Penny For Our Thoughts
-- Created:    June 2026 (feat/gsap-draggable-reorder — v2.41.0)
-- Summary:    Adds income_stream_order to the profiles table so the user's
--             drag-to-reorder preference for income streams survives sign-out.
--
--             Stored as a JSONB array of income-stream IDs in display order.
--             An empty array means "use insertion order" (the default).
--             No RLS change needed — profiles already has a per-user policy.
--
--             The fetch_user_data RPC uses `to_jsonb(p)` for the profile row,
--             so the new column is included automatically — no RPC recreation
--             required.
-- ─────────────────────────────────────────────────────────────────────────────

alter table profiles
  add column if not exists income_stream_order jsonb not null default '[]'::jsonb;

-- Notify PostgREST to pick up the new column immediately
notify pgrst, 'reload schema';
