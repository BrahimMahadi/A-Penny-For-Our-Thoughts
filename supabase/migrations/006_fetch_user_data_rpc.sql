-- ═══════════════════════════════════════════════════════════════════════════
-- Migration:  006_fetch_user_data_rpc.sql
-- Project:    A Penny For Our Thoughts
-- Created:    May 2026 (Sprint RS-31 — Supabase fetch reliability, Level 2)
-- Summary:    Single-shot user-data loader: one PostgREST RPC call replaces
--             the 18 parallel `from(table).select('*')` calls in
--             fetchAllUserData. Closes the PgBouncer pool-pressure window
--             that surfaced on the Supabase free tier as `57014` timeouts.
--
--             Returns a jsonb object with one key per table. The profile
--             key is a single object (null when no row); every other key is
--             a jsonb array (never null — empty tables come back as `[]`).
--             `purchases` and `spending_history_periods` preserve the
--             `order by date desc nulls last` ordering the old code used.
--
-- Security:   `security invoker` means RLS still applies to every subquery
--             — the function runs as the caller, not the function owner.
--             Combined with the explicit `auth.uid() = uid` check at the
--             top, the function is structurally incapable of leaking
--             another user's rows even if a future caller mistypes the
--             `uid` argument.
--
-- To apply:   run this script in the Supabase SQL editor
--             (Dashboard → SQL Editor → New query → paste → Run).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function fetch_user_data(uid uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  -- Defensive auth check. RLS would already block cross-user reads, but
  -- this surfaces the mismatch as a clear `42501` instead of an opaque
  -- empty result. Belt-and-braces: if someone ever drops or weakens an
  -- RLS policy, this still refuses.
  if auth.uid() is null or auth.uid() <> uid then
    raise exception 'fetch_user_data: caller must match uid' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'profile', (
      select to_jsonb(p) from profiles p where p.id = uid
    ),

    'incomeStreams', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from income_streams t where t.user_id = uid
    ),

    'expenseCards', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from expense_cards t where t.user_id = uid
    ),

    'expenseItems', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from expense_items t where t.user_id = uid
    ),

    -- Ordering preserved: matches the .order('date', { ascending: false })
    -- call the old TypeScript code used. `nulls last` keeps dateless rows
    -- at the bottom rather than the top (PG's default with DESC).
    'purchases', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.date desc nulls last), '[]'::jsonb)
      from purchases t where t.user_id = uid
    ),

    'spendingHistoryPeriods', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.date desc nulls last), '[]'::jsonb)
      from spending_history_periods t where t.user_id = uid
    ),

    'spendingHistoryItems', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from spending_history_items t where t.user_id = uid
    ),

    'loans', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from loans t where t.user_id = uid
    ),

    'creditCards', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from credit_cards t where t.user_id = uid
    ),

    'subscriptions', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from subscriptions t where t.user_id = uid
    ),

    'wishlistItems', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from wishlist_items t where t.user_id = uid
    ),

    'savingsAccounts', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from savings_accounts t where t.user_id = uid
    ),

    'goals', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from goals t where t.user_id = uid
    ),

    'assets', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from assets t where t.user_id = uid
    ),

    'netWorthSnapshots', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from net_worth_snapshots t where t.user_id = uid
    ),

    'rules', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from rules t where t.user_id = uid
    ),

    'budgetAlerts', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from budget_alerts t where t.user_id = uid
    ),

    'spendingCategories', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from spending_categories t where t.user_id = uid
    )
  );
end;
$$;

-- Authenticated role only. anon callers (signed-out) cannot reach this
-- function at all — RLS on the underlying tables would refuse anyway, but
-- removing the grant prevents the round-trip in the first place.
revoke all on function fetch_user_data(uuid) from public;
grant execute on function fetch_user_data(uuid) to authenticated;

-- Tell PostgREST to refresh its schema cache so the new function is
-- callable via REST immediately. Without this, the first call after the
-- migration runs returns `PGRST202: Could not find the function`.
notify pgrst, 'reload schema';
