-- Migration:  005_optional_fields_refresh.sql
-- Project:    A Penny For Our Thoughts
-- Created:    May 2026
-- Sprint:     RS-29 — DB column refresh
-- Fixes:      Three sprints (RS-23, RS-24, RS-28) added optional fields to
--             the TypeScript type layer but skipped the corresponding
--             Supabase migrations, defaulting to "localStorage only" with
--             a documented multi-device limitation. This migration adds
--             the four accumulated columns so the data is finally first
--             class — multi-device sync works for these fields starting now.
--
-- Adds:
--   profiles.last_archived_period_start         TEXT   (RS-23)
--   spending_history_periods.budgets             JSONB  (RS-24)
--   spending_history_periods.spent               JSONB  (RS-24)
--   wishlist_items.target_month                  TEXT   (RS-28)
--
-- Rationale for JSONB on budgets / spent:
--   • Matches the TypeScript shape one-to-one ({ needs, wants, savings }
--     and { needs, wants }) with no flatten/unflatten in the adapter
--   • The data is never queried by value (only round-tripped to render
--     the per-period rollup row), so we don't need column-level indexes
--     or arithmetic constraints — the only thing we lose by not using
--     numeric columns is queryability we don't actually use
--
-- Rationale for TEXT on date fields (last_archived_period_start, target_month):
--   • Matches the convention already established by profiles.pay_start
--     and goals.target_date, both of which are TEXT for the same reason:
--     the format is sometimes 'YYYY-MM-DD' and sometimes 'YYYY-MM', and
--     PostgreSQL's DATE type would force a specific shape
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS is idempotent.

alter table profiles
  add column if not exists last_archived_period_start text;

alter table spending_history_periods
  add column if not exists budgets jsonb,
  add column if not exists spent   jsonb;

alter table wishlist_items
  add column if not exists target_month text;

-- Refresh Supabase's PostgREST schema cache so the new columns are
-- immediately visible without a manual restart. (Matches the pattern
-- established by 004_wishlist_price_saved.sql.)
notify pgrst, 'reload schema';
